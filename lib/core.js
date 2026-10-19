/**
 * dsh-archive-ext — Host-side core logic.
 *
 * Pure, dependency-injected helpers shared by the Typert service. Nothing here
 * imports a `@deepseek-ai/*` package, so the whole module is unit-testable with
 * ordinary Node.
 */

import { existsSync, statSync } from "node:fs";
import { rm } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute } from "node:path";
import { execFile as nodeExecFile } from "node:child_process";

/** @typedef {{ ok: true, value: unknown } | { ok: false, error: { code: string, message?: string } }} Result */

/**
 * Build a business failure result.
 * @param {string} code - stable machine-readable code.
 * @param {string} [message] - optional diagnostic text; the client localizes codes.
 * @returns {{ ok: false, error: { code: string, message?: string } }}
 */
function fail(code, message) {
  return message === undefined
    ? { ok: false, error: { code } }
    : { ok: false, error: { code, message } };
}

/**
 * Extract a readable message from an unknown thrown value.
 * @param {unknown} error - thrown value.
 * @returns {string}
 */
function reason(error) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return String(error);
}

/**
 * Read the authoritative archive set.
 * @param {object} services - Host services injected into the plugin.
 * @returns {string[]}
 */
export function readArchived(services) {
  const { storageDomain, workspaceRegistry } = services || {};
  if (storageDomain) {
    try {
      const domain = storageDomain.get?.("workspace");
      const state = domain?.global?.get?.();
      if (state && Array.isArray(state.archivedSessionIds)) {
        return state.archivedSessionIds.map(String);
      }
    } catch {
      /* fall through to the registry getter */
    }
  }
  try {
    if (Array.isArray(workspaceRegistry?.archivedSessionIds)) {
      return workspaceRegistry.archivedSessionIds.map(String);
    }
  } catch {
    /* ignore */
  }
  return [];
}

/**
 * Persist a new archive set through the registry's own state writer.
 * @param {object} services - Host services.
 * @param {string[]} next - complete next archive set.
 * @returns {Promise<void>}
 */
export async function writeArchived(services, next) {
  const { storageDomain, workspaceRegistry } = services || {};
  const domain = storageDomain?.get?.("workspace");
  if (!domain) throw new Error("workspace domain unavailable");
  const state = domain.global?.get?.();
  if (!state || typeof state !== "object") throw new Error("workspace state unavailable");
  if (!workspaceRegistry || typeof workspaceRegistry.setState !== "function") {
    throw new Error("workspace registry state writer unavailable");
  }
  await workspaceRegistry.setState({ ...state, archivedSessionIds: next });
}

/**
 * Find a session header, preferring the live session query and falling back to
 * persisted headers.
 * @param {object} services - Host services.
 * @param {string} sessionId - target session id.
 * @returns {Promise<object | undefined>}
 */
export async function findHeader(services, sessionId) {
  const { sessionQuery, sessionPersistence } = services || {};
  if (sessionQuery && typeof sessionQuery.listSessions === "function") {
    try {
      const records = await sessionQuery.listSessions();
      if (Array.isArray(records)) {
        for (const record of records) {
          const header = record && record.header ? record.header : record;
          if (header && String(header.id) === sessionId) return header;
        }
      }
    } catch {
      /* fall through */
    }
  }
  if (sessionPersistence && typeof sessionPersistence.list === "function") {
    try {
      const headers = await sessionPersistence.list();
      if (Array.isArray(headers)) {
        return headers.find((header) => header && String(header.id) === sessionId);
      }
    } catch {
      /* fall through */
    }
  }
  return undefined;
}

/**
 * Pick the registered workspace path that owns a session.
 * @param {Array<object>} workspaces - Workspace rows.
 * @param {string} sessionId - target session id.
 * @returns {string | undefined}
 */
export function pickWorkspacePath(workspaces, sessionId) {
  for (const workspace of workspaces || []) {
    if (!workspace) continue;
    const raw = workspace.sessionIds;
    const ids = Array.isArray(raw) ? raw : raw && typeof raw[Symbol.iterator] === "function" ? Array.from(raw) : [];
    if (ids.some((id) => String(id) === sessionId)) {
      return typeof workspace.path === "string" && workspace.path.length > 0 ? workspace.path : undefined;
    }
  }
  return undefined;
}

/**
 * Resolve the directory shown by "Open in Explorer" for one session.
 * Workspace path first, then the live session header cwd, then persisted cwd.
 * @param {object} services - Host services.
 * @param {string} sessionId - target session id.
 * @param {{ statSync?: typeof statSync }} [deps] - test seams.
 * @returns {Promise<{ ok: true, path: string } | { ok: false, error: { code: string, message?: string } }>}
 */
export async function resolveSessionDirectory(services, sessionId, deps = {}) {
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return fail("invalid-session");
  }
  const stat = deps.statSync || statSync;
  let path;
  try {
    path = pickWorkspacePath(services?.workspaceRegistry?.list?.() || [], sessionId);
  } catch {
    path = undefined;
  }
  if (!path) {
    try {
      const session = services?.sessions?.get?.(sessionId);
      path = session?.header?.cwd || session?.cwd || undefined;
    } catch {
      path = undefined;
    }
  }
  if (!path) {
    try {
      const header = await findHeader(services, sessionId);
      path = header?.cwd || undefined;
    } catch {
      path = undefined;
    }
  }
  if (typeof path !== "string" || path.length === 0) {
    return fail("path-missing", "no workspace directory is known for this session");
  }
  if (!isAbsolute(path)) {
    return fail("path-missing", `workspace directory is not absolute: ${path}`);
  }
  let statResult;
  try {
    statResult = stat(path);
  } catch (error) {
    return fail("path-missing", `workspace directory is unavailable: ${reason(error)}`);
  }
  if (!statResult.isDirectory()) {
    return fail("path-not-directory", `workspace path is not a directory: ${path}`);
  }
  return { ok: true, path };
}

/**
 * Resolve the directory that owns a located session artifact.
 *
 * DSH < 0.2.0: `locate(header).path` is the session directory.
 * DSH >= 0.2.0: it is one log file (for example `session.v4.jsonl.zstd`) inside
 * that directory. Removing only the file can leave older generations behind, so
 * deletion always targets the whole owning directory.
 *
 * @param {string} locatedPath - `sessionPersistence.locate(header).path`.
 * @param {{ statSync?: typeof statSync }} [deps] - test seams.
 * @returns {string}
 */
export function deletionTarget(locatedPath, deps = {}) {
  const stat = deps.statSync || statSync;
  const target = String(locatedPath);
  try {
    if (stat(target).isDirectory()) return target;
    if (stat(target).isFile()) return dirname(target);
  } catch {
    /* artifact already gone — infer the owning directory from the path shape */
  }
  return extname(basename(target)) === "" ? target : dirname(target);
}

/**
 * Remove one session from the archive set.
 *
 * Prefer the registry's own serialized `unarchiveSession()` writer: it goes
 * through the registry operation queue and emits the same domain change the
 * built-in sidebar listens to. Fall back to a whole-state write for older
 * builds that only expose `setState()`.
 *
 * @param {object} services - Host services.
 * @param {string} sessionId - session to remove from the archive set.
 * @returns {Promise<void>}
 */
export async function removeArchivedSession(services, sessionId) {
  const registry = services?.workspaceRegistry;
  if (registry && typeof registry.unarchiveSession === "function") {
    await registry.unarchiveSession(sessionId);
    return;
  }
  const current = readArchived(services);
  if (!current.includes(sessionId)) return;
  await writeArchived(services, current.filter((id) => id !== sessionId));
}

/**
 * Remove one session from the archive set.
 * @param {{ sessionId: string, services: object }} input - target and services.
 * @returns {Promise<Result>}
 */
export async function restoreArchivedSession({ sessionId, services }) {
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return fail("invalid-session");
  }
  const ids = readArchived(services);
  if (!ids.includes(sessionId)) {
    return fail("not-archived", "session is not in the archive set");
  }
  try {
    await removeArchivedSession(services, sessionId);
    return { ok: true, value: { restored: true } };
  } catch (error) {
    return fail("write-failed", reason(error));
  }
}

/**
 * Permanently delete one archived session's log directory and archive entry.
 * @param {{ sessionId: string, services: object, fs?: object }} input - target, services and test seams.
 * @returns {Promise<Result>}
 */
export async function deleteArchivedSession({ sessionId, services, fs = {} }) {
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return fail("invalid-session");
  }
  const ids = readArchived(services);
  if (!ids.includes(sessionId)) {
    return fail("not-archived", "session is not in the archive set");
  }

  let agent;
  try {
    agent = services?.agents?.get?.(sessionId);
  } catch {
    agent = undefined;
  }
  if (agent && agent.status === "running") {
    return fail("agent-running", "the session agent is still running");
  }

  const rmDir = fs.rm || rm;
  const exists = fs.existsSync || existsSync;
  const stat = fs.statSync || statSync;

  const header = await findHeader(services, sessionId);
  const persistence = services?.sessionPersistence;
  if (header && (!persistence || typeof persistence.locate !== "function")) {
    return fail(
      "locate-unavailable",
      "this DSH build cannot locate session logs; the archive entry was kept",
    );
  }

  let location;
  if (header) {
    try {
      location = persistence.locate(header);
    } catch (error) {
      // A throwing locator means the build cannot tell us where the log lives.
      // Never clear the archive entry (or claim deletion) in that case.
      return fail("locate-unavailable", `sessionPersistence.locate failed: ${reason(error)}`);
    }
  }

  let removed = false;
  let failure;
  if (location && location.path) {
    const target = deletionTarget(location.path, { statSync: stat });
    try {
      await rmDir(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      removed = !exists(target);
      if (!removed) failure = "path still exists after removal";
    } catch (error) {
      failure = reason(error);
    }
  } else {
    // No located artifact: the log is already gone.
    removed = true;
  }
  if (!removed) {
    return fail("delete-failed", failure || "could not remove the session directory");
  }

  let live = false;
  try {
    live = services?.sessions?.get?.(sessionId) !== undefined;
  } catch {
    live = false;
  }

  // The archive entry is removed even when the session is still live in
  // memory. Leaving it behind is what forced the old two-step delete: the
  // record stayed in the archive page until a restart. The live session may
  // still appear as a normal session row until it is disposed by a restart;
  // the client warns about that, but the archive record is gone immediately.
  const current = readArchived(services);
  if (current.includes(sessionId)) {
    try {
      await removeArchivedSession(services, sessionId);
    } catch (error) {
      return fail("archive-cleanup-failed", reason(error));
    }
  }

  // If the session is still live, also release it from the in-memory Session
  // store. `session/disposed` is the Session Controller's removal signal, so
  // the built-in workspace list drops the row without waiting for a restart.
  // This is best-effort: a failure keeps the archive deletion valid and the
  // client reports that the live row may remain until restart.
  let liveDetached = false;
  if (live) {
    try {
      const store = services?.sessions?.store;
      const entry = store && typeof store.get === "function" ? store.get(sessionId) : undefined;
      if (entry && typeof entry.detach === "function") {
        entry.detach();
        liveDetached = true;
      }
    } catch {
      liveDetached = false;
    }
  }

  return {
    ok: true,
    value: {
      fileRemoved: Boolean(location && location.path),
      live,
      liveDetached,
    },
  };
}

/**
 * Report archived sessions that are still live in memory while their logs are gone.
 * @param {{ services: object, existsSync?: typeof existsSync }} input - services and test seams.
 * @returns {Promise<string[]>}
 */
export async function ghostSessionIds({ services, existsSync: exists = existsSync }) {
  const ids = readArchived(services);
  const sessions = services?.sessions;
  const persistence = services?.sessionPersistence;
  if (!sessions || !persistence || typeof persistence.locate !== "function") return [];
  const ghosts = [];
  for (const id of ids) {
    try {
      const session = sessions.get(id);
      if (session === undefined) continue;
      const location = persistence.locate(session.header);
      if (location && location.path && !exists(deletionTarget(location.path))) ghosts.push(id);
    } catch {
      /* skip this entry */
    }
  }
  return ghosts;
}

/**
 * Build the platform command that opens a directory in the system file manager.
 * @param {string} platform - `process.platform`.
 * @param {string} path - existing absolute directory.
 * @returns {{ file: string, args: string[] } | null}
 */
export function buildOpenCommand(platform, path) {
  if (platform === "win32") return { file: "explorer.exe", args: [path] };
  if (platform === "darwin") return { file: "open", args: [path] };
  if (["linux", "freebsd", "openbsd", "netbsd", "sunos", "aix"].includes(platform)) {
    return { file: "xdg-open", args: [path] };
  }
  return null;
}

/**
 * Run one native command without a shell and classify its failure.
 * @param {Function} execFile - `node:child_process.execFile` or a test double.
 * @param {string} file - executable.
 * @param {string[]} args - argv.
 * @param {string} platform - `process.platform`.
 * @returns {Promise<void>}
 */
function runExecFile(execFile, file, args, platform) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      if (!error) return resolve();
      const exitCode = error.code ?? error.exitCode;
      // Explorer delegates to the shell window and exits 1; that is a success.
      if (platform === "win32" && exitCode === 1) return resolve();
      reject(error);
    };
    try {
      const pending = execFile(file, args, { timeout: 5000, windowsHide: false }, finish);
      if (pending && typeof pending.then === "function") {
        pending.then(() => finish(), (error) => finish(error));
      }
    } catch (error) {
      finish(error);
    }
  });
}

/**
 * Open one session's workspace directory in the system file manager.
 * @param {{ sessionId: string, services: object, platform?: string, execFile?: Function }} input - target and seams.
 * @returns {Promise<Result>}
 */
export async function openInExplorer({
  sessionId,
  services,
  platform = process.platform,
  execFile = nodeExecFile,
}) {
  const resolved = await resolveSessionDirectory(services, sessionId);
  if (!resolved.ok) return resolved;
  const command = buildOpenCommand(platform, resolved.path);
  if (!command) return fail("launch-failed", `unsupported platform: ${platform}`);
  try {
    await runExecFile(execFile, command.file, command.args, platform);
    return { ok: true, value: { path: resolved.path } };
  } catch (error) {
    return fail("launch-failed", reason(error));
  }
}
