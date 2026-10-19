import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildOpenCommand,
  deletionTarget,
  deleteArchivedSession,
  ghostSessionIds,
  openInExplorer,
  pickWorkspacePath,
  restoreArchivedSession,
  resolveSessionDirectory,
} from "../lib/core.js";

async function makeTemp() {
  return mkdtemp(join(tmpdir(), "dsh-archive-ext-"));
}

async function dropTemp(directory) {
  await rm(directory, { recursive: true, force: true });
}

function makeServices({
  archived = [],
  workspaces = [],
  sessions = new Map(),
  agents = new Map(),
  headers = [],
  locate = () => undefined,
} = {}) {
  const state = { archivedSessionIds: [...archived] };
  const setStateCalls = [];
  const unarchiveCalls = [];
  const services = {
    storageDomain: {
      get: (name) =>
        name === "workspace"
          ? {
              global: {
                get: () => state,
              },
            }
          : undefined,
    },
    workspaceRegistry: {
      archivedSessionIds: state.archivedSessionIds,
      list: () => workspaces,
      setState: async (next) => {
        setStateCalls.push(next);
        state.archivedSessionIds = [...next.archivedSessionIds];
        services.workspaceRegistry.archivedSessionIds = state.archivedSessionIds;
      },
      unarchiveSession: async (sessionId) => {
        unarchiveCalls.push(sessionId);
        state.archivedSessionIds = state.archivedSessionIds.filter((id) => id !== sessionId);
        services.workspaceRegistry.archivedSessionIds = state.archivedSessionIds;
      },
    },
    sessionQuery: {
      listSessions: async () => headers.map((header) => ({ header })),
    },
    sessionPersistence: {
      list: async () => headers,
      locate,
    },
    sessions: {
      get: (id) => sessions.get(id),
    },
    agents: {
      get: (id) => agents.get(id),
    },
  };
  return { services, state, setStateCalls, unarchiveCalls };
}

test("deletionTarget handles directory, file and missing paths", async () => {
  const directory = await makeTemp();
  try {
    const logFile = join(directory, "session.v4.jsonl.zstd");
    await writeFile(logFile, "log");
    assert.equal(deletionTarget(directory), directory);
    assert.equal(deletionTarget(logFile), directory);
    assert.equal(deletionTarget(join(directory, "missing.v4.log")), directory);
    assert.equal(deletionTarget(join(directory, "missing-directory")), join(directory, "missing-directory"));
  } finally {
    await dropTemp(directory);
  }
});

test("pickWorkspacePath finds the workspace owning a session", () => {
  const workspaces = [
    { workspaceId: "w1", path: "C:\\one", sessionIds: ["a", "b"] },
    { workspaceId: "w2", path: "C:\\two", sessionIds: ["c"] },
  ];
  assert.equal(pickWorkspacePath(workspaces, "b"), "C:\\one");
  assert.equal(pickWorkspacePath(workspaces, "c"), "C:\\two");
  assert.equal(pickWorkspacePath(workspaces, "z"), undefined);
  assert.equal(pickWorkspacePath(undefined, "b"), undefined);
});

test("resolveSessionDirectory prefers workspace path and falls back to cwd", async () => {
  const directory = await makeTemp();
  try {
    const fromWorkspace = makeServices({
      workspaces: [{ workspaceId: "w1", path: directory, sessionIds: ["s1"] }],
    });
    const first = await resolveSessionDirectory(fromWorkspace.services, "s1");
    assert.equal(first.ok, true);
    assert.equal(first.path, directory);

    const fromLive = makeServices({
      sessions: new Map([["s2", { header: { cwd: directory } }]]),
    });
    const second = await resolveSessionDirectory(fromLive.services, "s2");
    assert.equal(second.ok, true);
    assert.equal(second.path, directory);

    const missing = makeServices();
    const third = await resolveSessionDirectory(missing.services, "s3");
    assert.equal(third.ok, false);
    assert.equal(third.error.code, "path-missing");

    const file = join(directory, "not-a-directory");
    await writeFile(file, "x");
    const notDirectory = makeServices({
      workspaces: [{ workspaceId: "w1", path: file, sessionIds: ["s4"] }],
    });
    const fourth = await resolveSessionDirectory(notDirectory.services, "s4");
    assert.equal(fourth.ok, false);
    assert.equal(fourth.error.code, "path-not-directory");
  } finally {
    await dropTemp(directory);
  }
});

test("restoreArchivedSession removes the archive entry", async () => {
  const { services, state } = makeServices({ archived: ["a", "b"] });
  const result = await restoreArchivedSession({ sessionId: "a", services });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { restored: true });
  assert.deepEqual(state.archivedSessionIds, ["b"]);

  const notArchived = await restoreArchivedSession({ sessionId: "z", services });
  assert.equal(notArchived.ok, false);
  assert.equal(notArchived.error.code, "not-archived");

  const broken = makeServices({ archived: ["a"] });
  broken.services.workspaceRegistry.unarchiveSession = async () => {
    throw new Error("disk full");
  };
  const failed = await restoreArchivedSession({ sessionId: "a", services: broken.services });
  assert.equal(failed.ok, false);
  assert.equal(failed.error.code, "write-failed");

  const legacy = makeServices({ archived: ["a", "b"] });
  delete legacy.services.workspaceRegistry.unarchiveSession;
  const fallback = await restoreArchivedSession({ sessionId: "a", services: legacy.services });
  assert.equal(fallback.ok, true);
  assert.deepEqual(legacy.state.archivedSessionIds, ["b"]);
});

test("deleteArchivedSession removes the whole session directory", async () => {
  const directory = await makeTemp();
  const sessionDirectory = join(directory, "session-1");
  await mkdir(sessionDirectory, { recursive: true });
  const logFile = join(sessionDirectory, "session.v4.jsonl.zstd");
  await writeFile(logFile, "log");
  try {
    const { services, state } = makeServices({
      archived: ["s1"],
      headers: [{ id: "s1", cwd: directory }],
      locate: () => ({ path: logFile }),
    });
    const result = await deleteArchivedSession({ sessionId: "s1", services });
    assert.equal(result.ok, true);
    assert.deepEqual(result.value, { fileRemoved: true, live: false, liveDetached: false });
    assert.equal(existsSync(sessionDirectory), false);
    assert.deepEqual(state.archivedSessionIds, []);
  } finally {
    await dropTemp(directory);
  }
});

test("deleteArchivedSession refuses a running agent", async () => {
  const directory = await makeTemp();
  const sessionDirectory = join(directory, "session-1");
  await mkdir(sessionDirectory, { recursive: true });
  const logFile = join(sessionDirectory, "session.v4.jsonl.zstd");
  await writeFile(logFile, "log");
  try {
    const { services, state } = makeServices({
      archived: ["s1"],
      headers: [{ id: "s1", cwd: directory }],
      agents: new Map([["s1", { status: "running" }]]),
      locate: () => ({ path: logFile }),
    });
    const result = await deleteArchivedSession({ sessionId: "s1", services });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "agent-running");
    assert.equal(existsSync(sessionDirectory), true);
    assert.deepEqual(state.archivedSessionIds, ["s1"]);
  } finally {
    await dropTemp(directory);
  }
});

test("deleteArchivedSession removes the entry for a live-but-idle session", async () => {
  const directory = await makeTemp();
  const sessionDirectory = join(directory, "session-1");
  await mkdir(sessionDirectory, { recursive: true });
  const logFile = join(sessionDirectory, "session.v4.jsonl.zstd");
  await writeFile(logFile, "log");
  try {
    const { services, state } = makeServices({
      archived: ["s1"],
      headers: [{ id: "s1", cwd: directory }],
      sessions: new Map([["s1", { header: { id: "s1", cwd: directory } }]]),
      locate: () => ({ path: logFile }),
    });
    let detached = false;
    services.sessions.store = new Map([["s1", { detach: () => { detached = true; } }]]);
    const result = await deleteArchivedSession({ sessionId: "s1", services });
    assert.equal(result.ok, true);
    assert.deepEqual(result.value, { fileRemoved: true, live: true, liveDetached: true });
    assert.equal(detached, true);
    assert.equal(existsSync(sessionDirectory), false);
    assert.deepEqual(state.archivedSessionIds, []);
  } finally {
    await dropTemp(directory);
  }
});

test("deleteArchivedSession reports archive cleanup failure after removing the log", async () => {
  const directory = await makeTemp();
  const sessionDirectory = join(directory, "session-1");
  await mkdir(sessionDirectory, { recursive: true });
  const logFile = join(sessionDirectory, "session.v4.jsonl.zstd");
  await writeFile(logFile, "log");
  try {
    const { services, state } = makeServices({
      archived: ["s1"],
      headers: [{ id: "s1", cwd: directory }],
      locate: () => ({ path: logFile }),
    });
    services.workspaceRegistry.unarchiveSession = async () => {
      throw new Error("state write failed");
    };
    const result = await deleteArchivedSession({ sessionId: "s1", services });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "archive-cleanup-failed");
    assert.deepEqual(state.archivedSessionIds, ["s1"]);
  } finally {
    await dropTemp(directory);
  }
});

test("deleteArchivedSession cleans up an orphan archive record", async () => {
  const { services, state } = makeServices({ archived: ["missing"] });
  const result = await deleteArchivedSession({ sessionId: "missing", services });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { fileRemoved: false, live: false, liveDetached: false });
  assert.deepEqual(state.archivedSessionIds, []);
});

test("deleteArchivedSession keeps the entry when locating the log throws", async () => {
  const directory = await makeTemp();
  const sessionDirectory = join(directory, "session-1");
  await mkdir(sessionDirectory, { recursive: true });
  await writeFile(join(sessionDirectory, "session.v4.jsonl.zstd"), "log");
  try {
    const { services, state } = makeServices({
      archived: ["s1"],
      headers: [{ id: "s1", cwd: directory }],
      locate: () => {
        throw new Error("locator unavailable");
      },
    });
    const result = await deleteArchivedSession({ sessionId: "s1", services });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "locate-unavailable");
    assert.equal(existsSync(sessionDirectory), true);
    assert.deepEqual(state.archivedSessionIds, ["s1"]);
  } finally {
    await dropTemp(directory);
  }
});

test("deleteArchivedSession reports removal failures and keeps the entry", async () => {
  const directory = await makeTemp();
  const sessionDirectory = join(directory, "session-1");
  await mkdir(sessionDirectory, { recursive: true });
  const logFile = join(sessionDirectory, "session.v4.jsonl.zstd");
  await writeFile(logFile, "log");
  try {
    const { services, state } = makeServices({
      archived: ["s1"],
      headers: [{ id: "s1", cwd: directory }],
      locate: () => ({ path: logFile }),
    });
    const result = await deleteArchivedSession({
      sessionId: "s1",
      services,
      fs: { rm: async () => { throw new Error("file is locked"); } },
    });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "delete-failed");
    assert.deepEqual(state.archivedSessionIds, ["s1"]);
  } finally {
    await dropTemp(directory);
  }
});

test("ghostSessionIds reports live sessions whose logs are gone", async () => {
  const directory = await makeTemp();
  try {
    const missingLog = join(directory, "gone", "session.v4.jsonl.zstd");
    const { services } = makeServices({
      archived: ["g1", "g2"],
      sessions: new Map([["g1", { header: { id: "g1" } }]]),
      headers: [{ id: "g1" }],
      locate: () => ({ path: missingLog }),
    });
    const ghosts = await ghostSessionIds({ services });
    assert.deepEqual(ghosts, ["g1"]);
  } finally {
    await dropTemp(directory);
  }
});

test("buildOpenCommand covers Windows, macOS and Linux", () => {
  assert.deepEqual(buildOpenCommand("win32", "C:\\ws"), { file: "explorer.exe", args: ["C:\\ws"] });
  assert.deepEqual(buildOpenCommand("darwin", "/tmp/ws"), { file: "open", args: ["/tmp/ws"] });
  assert.deepEqual(buildOpenCommand("linux", "/tmp/ws"), { file: "xdg-open", args: ["/tmp/ws"] });
  assert.equal(buildOpenCommand("plan9", "/tmp/ws"), null);
});

test("openInExplorer launches the platform command and classifies failures", async () => {
  const directory = await makeTemp();
  try {
    const { services } = makeServices({
      workspaces: [{ workspaceId: "w1", path: directory, sessionIds: ["s1"] }],
    });
    const calls = [];
    const success = await openInExplorer({
      sessionId: "s1",
      services,
      platform: "win32",
      execFile: (file, args, options, callback) => {
        calls.push({ file, args, options });
        callback(null);
      },
    });
    assert.equal(success.ok, true);
    assert.equal(success.value.path, directory);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].file, "explorer.exe");
    assert.deepEqual(calls[0].args, [directory]);

    const delegated = await openInExplorer({
      sessionId: "s1",
      services,
      platform: "win32",
      execFile: (_file, _args, _options, callback) => callback({ code: 1 }),
    });
    assert.equal(delegated.ok, true);

    const missingBinary = await openInExplorer({
      sessionId: "s1",
      services,
      platform: "linux",
      execFile: (_file, _args, _options, callback) => callback({ code: "ENOENT" }),
    });
    assert.equal(missingBinary.ok, false);
    assert.equal(missingBinary.error.code, "launch-failed");

    const missingPath = await openInExplorer({
      sessionId: "unknown",
      services,
      platform: "win32",
      execFile: (_file, _args, _options, callback) => callback(null),
    });
    assert.equal(missingPath.ok, false);
    assert.equal(missingPath.error.code, "path-missing");
  } finally {
    await dropTemp(directory);
  }
});
