import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { TYPERT } from "./typert.host.js";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const patch = readFileSync(new URL("./cordis.patch.yml", import.meta.url), "utf8");
const serviceSource = readFileSync(new URL("./lib/service.js", import.meta.url), "utf8");

assert.equal(TYPERT.package, "@ancircle-dsh-plugins/dsh-archive-ext");
assert.equal(TYPERT.package, packageJson.name);
assert.equal(TYPERT.face, "host");
assert.equal(TYPERT.invocations.length, 4);

const hostMethods = new Set();
for (const invocation of TYPERT.invocations) {
  hostMethods.add(invocation.method);
  assert.equal(invocation.service, "archiveExt");
  assert.equal(invocation.namespace, "archiveExt");
  assert.ok(invocation.id.startsWith("dsh-archive-ext#archiveExt/"), invocation.id);
  assert.equal(invocation.invocation.kind, "direct");
  for (const parameter of invocation.parameters) {
    assert.equal(parameter.codec.mode, "strict");
    assert.equal(typeof parameter.codec.schema.parse, "function");
    assert.equal(typeof parameter.codec.create, "function");
    assert.equal(parameter.codec.create(), parameter.codec.schema);
  }
  assert.equal(invocation.result.mode, "strict");
  assert.equal(typeof invocation.result.schema.parse, "function");
  assert.equal(typeof invocation.result.create, "function");
  assert.equal(invocation.result.create(), invocation.result.schema);
}
assert.deepEqual([...hostMethods].sort(), ["delete", "open", "restore", "state"]);

const serviceModel = TYPERT.model.services[0];
assert.equal(serviceModel.key, "archiveExt");
assert.equal(serviceModel.exportName, "ArchiveExtService");
assert.deepEqual(
  serviceModel.members.map((member) => member.name).sort(),
  ["delete", "open", "restore", "state"],
);

// Sample wire payloads parse through the declared codecs.
const byMethod = new Map(TYPERT.invocations.map((invocation) => [invocation.method, invocation]));
assert.deepEqual(
  byMethod.get("restore").parameters[0].codec.create().parse({ sessionId: "s1" }),
  { sessionId: "s1" },
);
assert.deepEqual(
  byMethod.get("restore").result.schema.parse({ ok: true, value: { restored: true } }),
  { ok: true, value: { restored: true } },
);
assert.deepEqual(
  byMethod.get("delete").result.schema.parse({ ok: true, value: { fileRemoved: true, live: true, liveDetached: true } }),
  { ok: true, value: { fileRemoved: true, live: true, liveDetached: true } },
);
assert.deepEqual(
  byMethod.get("state").result.schema.parse({ ok: true, value: { ghostIds: ["a"] } }),
  { ok: true, value: { ghostIds: ["a"] } },
);
assert.deepEqual(
  byMethod.get("open").result.schema.parse({ ok: true, value: { path: "C:\\ws" } }),
  { ok: true, value: { path: "C:\\ws" } },
);
assert.deepEqual(
  byMethod.get("delete").result.schema.parse({ ok: false, error: { code: "delete-failed", message: "x" } }),
  { ok: false, error: { code: "delete-failed", message: "x" } },
);

for (const method of ["restore", "delete", "state", "open"]) {
  assert.ok(
    serviceSource.includes(`markRemoteMethod(this, "${method}", "${method}")`),
    `service must mark ${method} as Remote`,
  );
}
assert.ok(serviceSource.includes('super(ctx, "archiveExt")'));
assert.ok(serviceSource.includes('"workspaceRegistry"'));
assert.ok(serviceSource.includes('"sessionPersistence"'));

assert.ok(patch.includes("- id: archive-ext"));
assert.ok(patch.includes("@ancircle-dsh-plugins/dsh-archive-ext"));

// Load the client bundle far enough to inspect its Remote contribution.
const clientSource = readFileSync(new URL("./client.js", import.meta.url), "utf8");
let captured;
const sandbox = {
  window: {
    __ModuleLoader__: {
      load(module) {
        captured = module;
      },
    },
  },
  document: {
    createElement: () => ({ textContent: "", remove() {} }),
    head: { appendChild() {} },
    documentElement: { lang: "zh-CN" },
    addEventListener() {},
    removeEventListener() {},
  },
  navigator: { language: "zh-CN" },
  console,
  setTimeout,
  clearTimeout,
};
vm.createContext(sandbox);
vm.runInContext(clientSource, sandbox);
assert.ok(captured, "client bundle must register through the ModuleLoader");
assert.equal(captured.id, "@ancircle-dsh-plugins/dsh-archive-ext");

const clientModule = captured.factory((id) => {
  if (id === "react") {
    return { Fragment: Symbol("Fragment"), createElement: () => ({}) };
  }
  if (id === "@deepseek-ai/dsh-client-ui-primitives") return {};
  throw new Error("unexpected require: " + id);
});
const clientRemote = clientModule.CLIENT_REMOTE;
assert.ok(clientRemote, "client must export CLIENT_REMOTE");
assert.equal(clientRemote.package, "dsh-archive-ext");
assert.equal(clientRemote.descriptors.length, 4);
assert.deepEqual(
  [...clientRemote.descriptors.map((descriptor) => descriptor.method)].sort(),
  ["delete", "open", "restore", "state"],
);

const hostById = new Map(TYPERT.invocations.map((invocation) => [invocation.id, invocation]));
for (const descriptor of clientRemote.descriptors) {
  const host = hostById.get(descriptor.id);
  assert.ok(host, `host must declare ${descriptor.id}`);
  assert.equal(descriptor.service, host.service);
  assert.equal(descriptor.namespace, host.namespace);
  assert.equal(descriptor.method, host.method);
  assert.equal(descriptor.invocation.kind, "direct");
  assert.equal(descriptor.result.mode, "strict");
  assert.equal(typeof descriptor.result.create, "function");
  assert.equal(typeof descriptor.result.schema.parse, "function");
}

console.log("verify-typert-manifest: ok");
