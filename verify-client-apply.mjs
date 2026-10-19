import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("./client.js", import.meta.url), "utf8");
let captured;
const styleElement = { textContent: "", remove() {} };
const storage = new Map();
const sandbox = {
  window: {
    __ModuleLoader__: {
      load(module) {
        captured = module;
      },
    },
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
    },
  },
  document: {
    createElement: () => styleElement,
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
vm.runInContext(source, sandbox);

assert.ok(captured, "client bundle must register via window.__ModuleLoader__.load");
assert.equal(captured.id, "@ancircle-dsh-plugins/dsh-archive-ext");

const React = {
  Fragment: Symbol("Fragment"),
  createElement: (...args) => ({ args }),
};
const primitives = {
  MenuItemButton: function MenuItemButton() {},
  Tooltip: function Tooltip() {},
  IconTrashOutlineRegular: function IconTrashOutlineRegular() {},
};
const requireFake = (id) => {
  if (id === "react") return React;
  if (id === "@deepseek-ai/dsh-client-ui-primitives") return primitives;
  throw new Error("unexpected require: " + id);
};

const module = captured.factory(requireFake);
assert.equal(typeof module.apply, "function");
assert.deepEqual([...module.inject], ["slots", "remote"]);

let mounted = null;
const cleanups = [];
const injections = [];
const registrations = [];
const disposed = [];
const localeRegistrations = [];
const remoteActions = {
  open: async (request) => ({ ok: true, value: { path: "C:\\workspace\\" + request.sessionId } }),
  restore: async () => ({ ok: true, value: { restored: true } }),
  delete: async () => ({ ok: true, value: { fileRemoved: true, live: false, liveDetached: false } }),
  state: async () => ({ ok: true, value: { ghostIds: [] } }),
};
const layout = {
  activePanelId: null,
  panelInfo: {
    getSnapshot: () => ({ activePanelId: layout.activePanelId }),
  },
  selectPanel(id) {
    layout.activePanelId = id;
  },
};
const ctx = {
  remote: {
    async $mount(contribution) {
      mounted = contribution;
    },
  },
  effect(fn) {
    const cleanup = fn();
    cleanups.push(cleanup);
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  },
  get(name) {
    if (name === "remote.archiveExt") return remoteActions;
    if (name === "layout") return layout;
    if (name === "locale") {
      return {
        register(namespace, dictionaries) {
          localeRegistrations.push({ namespace, dictionaries });
          return () => {};
        },
        bind() {
          return (key) => key;
        },
      };
    }
    if (name === "sessions") return { refresh() {} };
    return undefined;
  },
  slots: {
    inject(key, callback) {
      injections.push({ key, callback });
    },
    register(options, component) {
      const entry = { options, component, disposed: false };
      registrations.push(entry);
      return () => {
        entry.disposed = true;
        disposed.push(options.id || options.key || options.name);
      };
    },
  },
};

await module.apply(ctx);

assert.ok(mounted, "apply must mount the archiveExt Remote namespace");
assert.equal(mounted.package, "dsh-archive-ext");
assert.equal(mounted.descriptors.length, 4);
assert.deepEqual([...mounted.descriptors.map((entry) => entry.method)].sort(), [
  "delete",
  "open",
  "restore",
  "state",
]);

assert.deepEqual(injections.map((entry) => entry.key).sort(), [
  "settings.section",
  "sidebar.footer.action",
  "sidebar.panellist",
  "sidebar.workspaces.session.menu.item",
]);
for (const injection of injections) injection.callback();

// Settings section, session menu and the hidden toast are always registered.
const settings = registrations.find((entry) => entry.options.name === "settings.section");
const menu = registrations.find((entry) => entry.options.id === "archive-ext.open-in-explorer");
const toast = registrations.find((entry) => entry.options.id === "archive-ext.toast");
assert.ok(settings, "settings.section registration");
assert.equal(settings.options.id, "archive-ext");
assert.equal(settings.options.order, 50);
assert.equal(typeof settings.component, "function");
assert.ok(menu, "session menu registration");
assert.equal(menu.options.order, 430);
assert.ok(toast, "toast registration");
assert.equal(toast.options.name, "sidebar.footer.action");
assert.equal(registrations.some((entry) => entry.options.id === "archive-ext.page"), false);

const settingsInjected = settings.options.inject();
assert.equal(typeof settingsInjected.t, "function");
assert.equal(typeof settingsInjected.remote.open, "function");
assert.equal(typeof settingsInjected.setSidebarEnabled, "function");
assert.ok(settingsInjected.sidebarEnabledStore);
assert.ok(settingsInjected.sidebarSupportedStore);
assert.ok(settingsInjected.ghostStore);
assert.equal(settingsInjected.sidebarSupportedStore.get(), true);

assert.equal(localeRegistrations.length, 1);
assert.equal(localeRegistrations[0].namespace, "archiveExt");
assert.ok(localeRegistrations[0].dictionaries.zh["settings.pin"]);
assert.ok(localeRegistrations[0].dictionaries.en["settings.pin"]);

// Toggle the optional sidebar panel on: main + sidebar.panellist appear.
settingsInjected.setSidebarEnabled(true);
assert.equal(storage.get("dsh-archive-ext.sidebar"), "true");
assert.equal(settingsInjected.sidebarEnabledStore.get(), true);
const main = registrations.find((entry) => entry.options.name === "main");
const row = registrations.find(
  (entry) => entry.options.name === "sidebar.panellist" && entry.options.id === "archive-ext",
);
assert.ok(main, "sidebar main panel registration");
assert.equal(main.options.key, "archive-ext");
assert.ok(row, "sidebar panellist registration");
assert.equal(row.options.order, 2);
assert.equal(typeof row.component, "function");

// Toggle off while the panel is active: it is unregistered and selection is cleared.
layout.activePanelId = "archive-ext";
settingsInjected.setSidebarEnabled(false);
assert.equal(storage.get("dsh-archive-ext.sidebar"), "false");
assert.equal(layout.activePanelId, null);
assert.equal(main.disposed, true);
assert.equal(row.disposed, true);

for (const cleanup of cleanups) {
  if (typeof cleanup === "function") cleanup();
}
console.log("verify-client-apply: ok");
