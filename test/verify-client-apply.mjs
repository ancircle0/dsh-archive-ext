import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../client.js", import.meta.url), "utf8");
let captured;
const createdElements = [];
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
    createElement() {
      const element = {
        textContent: "",
        attributes: {},
        removed: false,
        setAttribute(name, value) {
          this.attributes[name] = String(value);
        },
        remove() {
          this.removed = true;
        },
      };
      createdElements.push(element);
      return element;
    },
    head: {
      children: [],
      appendChild(element) {
        this.children.push(element);
      },
    },
    body: {},
    documentElement: { lang: "zh-CN" },
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
  },
  MutationObserver: class {
    observe() {}
    disconnect() {}
  },
  navigator: { language: "zh-CN" },
  console,
  setTimeout,
  clearTimeout,
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

assert.ok(captured, "client bundle must register via window.__ModuleLoader__.load");
assert.equal(captured.id, "@ancircle0/dsh-archive-ext");

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
        bind(namespace) {
          const workspaceLabels = { rename: "重命名", "delete.workspace": "删除工作区" };
          return (key) => (namespace === "workspace" && workspaceLabels[key]) || key;
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
assert.equal(mounted.descriptors.length, 5);
assert.deepEqual([...mounted.descriptors.map((entry) => entry.method)].sort(), [
  "delete",
  "open",
  "openSessionStorage",
  "restore",
  "state",
]);

// apply wires the best-effort settings nav glyph (style kept even when no row
// is mounted yet; the MutationObserver claims the row when the dialog opens).
const navIconStyle = createdElements.find(
  (element) => element.attributes["data-plugin-css"] === "archive-ext/settings-nav-icon",
);
assert.ok(navIconStyle, "apply must install the settings nav icon stylesheet");
assert.match(navIconStyle.textContent, /mask-image/);
assert.ok(sandbox.document.head.children.includes(navIconStyle));

// The old workspace-row menu DOM enhancement was removed; only the official
// session-menu slot entries remain.
assert.equal(module.CLIENT_WORKSPACE_MENU, undefined);

assert.deepEqual(injections.map((entry) => entry.key).sort(), [
  "settings.section",
  "sidebar.footer.action",
  "sidebar.panellist",
  "sidebar.workspaces.session.menu.item",
]);
for (const injection of injections) {
  const result = injection.callback();
  if (result && typeof result.next === "function") {
    for (const _disposer of result) {
      /* generators yield the individual registrations */
    }
  }
}

// Settings section, session menu entries and the hidden toast are always registered.
const settings = registrations.find((entry) => entry.options.name === "settings.section");
const workspaceFolderEntry = registrations.find(
  (entry) => entry.options.id === "archive-ext.open-workspace-folder",
);
const sessionMenuEntry = registrations.find(
  (entry) => entry.options.id === "archive-ext.open-session-folder",
);
const toast = registrations.find((entry) => entry.options.id === "archive-ext.toast");
assert.ok(settings, "settings.section registration");
assert.equal(settings.options.id, "archive-ext");
assert.equal(settings.options.order, 50);
assert.equal(typeof settings.component, "function");
assert.ok(workspaceFolderEntry, "open-workspace-folder registration");
assert.equal(workspaceFolderEntry.options.name, "sidebar.workspaces.session.menu.item");
assert.equal(workspaceFolderEntry.options.order, 430);
assert.equal(typeof workspaceFolderEntry.component, "function");
assert.ok(sessionMenuEntry, "open-session-folder registration");
assert.equal(sessionMenuEntry.options.name, "sidebar.workspaces.session.menu.item");
assert.equal(sessionMenuEntry.options.order, 440);
assert.equal(typeof sessionMenuEntry.component, "function");
assert.ok(toast, "toast registration");
assert.equal(toast.options.name, "sidebar.footer.action");
assert.equal(registrations.some((entry) => entry.options.id === "archive-ext.page"), false);

const workspaceFolderInjected = workspaceFolderEntry.options.inject();
assert.equal(typeof workspaceFolderInjected.t, "function");
assert.equal(typeof workspaceFolderInjected.openWorkspaceFolder, "function");
const sessionMenuInjected = sessionMenuEntry.options.inject();
assert.equal(typeof sessionMenuInjected.t, "function");
assert.equal(typeof sessionMenuInjected.openSessionFolder, "function");

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

// One page, two seats: the settings section and the sidebar entry mount the very
// same page component with the same props and differ only in the container mark.
const settingsTree = settings.component({});
const panelTree = main.component({});
assert.equal(
  settingsTree.args[0],
  panelTree.args[0],
  "both seats must render the same archive page component",
);
assert.equal(settingsTree.args[1].surface, "settings");
assert.equal(panelTree.args[1].surface, "panel");
// The "show in sidebar" switch is part of that one page, so it must not be
// gated on which seat renders it.
assert.match(source, /const toggleRow = h\(/, "the sidebar switch must render in every seat");

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
assert.equal(navIconStyle.removed, true, "nav icon stylesheet must be removed with the plugin");
console.log("verify-client-apply: ok");
