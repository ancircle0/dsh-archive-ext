import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

/**
 * Loads the real client bundle in a vm sandbox (same technique as
 * verify-client-apply.mjs) and returns its exports. The settings-nav-icon
 * enhancement is DOM-only, so this file exercises it against a tiny fake DOM,
 * a fake MutationObserver and a fake ctx.effect.
 */
function loadBundle() {
  const source = readFileSync(new URL("../client.js", import.meta.url), "utf8");
  let captured;
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(module) {
          captured = module;
        },
      },
    },
    console,
    setTimeout,
    clearTimeout,
    queueMicrotask,
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  assert.ok(captured, "client bundle must register via window.__ModuleLoader__.load");
  const bundle = captured.factory((id) => {
    if (id === "react") {
      return { Fragment: Symbol("Fragment"), createElement: (...args) => ({ args }) };
    }
    throw new Error("unexpected require: " + id);
  });
  return { bundle, sandbox };
}

const { bundle, sandbox } = loadBundle();
const nav = bundle.CLIENT_NAV_ICON;
assert.ok(nav, "client bundle must export CLIENT_NAV_ICON for tests");
const MARKER = nav.NAV_ICON_MARKER;
const NAV_SELECTOR = nav.NAV_ICON_SELECTOR;

function createStyle() {
  return {
    tag: "",
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
}

function createRow(text) {
  return {
    textContent: text,
    attributes: new Map(),
    setAttribute(name) {
      this.attributes.set(name, "");
    },
    removeAttribute(name) {
      this.attributes.delete(name);
    },
    hasAttribute(name) {
      return this.attributes.has(name);
    },
  };
}

function createDom({ rows = [], failQuery = null } = {}) {
  const created = [];
  return {
    head: {
      children: [],
      appendChild(node) {
        this.children.push(node);
      },
    },
    body: {},
    rows,
    created,
    failQuery,
    createElement(tag) {
      const style = createStyle();
      style.tag = tag;
      created.push(style);
      return style;
    },
    querySelectorAll(selector) {
      if (typeof this.failQuery === "function") {
        const error = this.failQuery(selector);
        if (error) throw error;
      }
      if (selector === NAV_SELECTOR) return this.rows;
      if (selector === "[" + MARKER + "]") {
        return this.rows.filter((row) => row.hasAttribute(MARKER));
      }
      return [];
    },
  };
}

function installFakeObserver() {
  const state = { callback: null, instances: [] };
  class FakeMutationObserver {
    constructor(callback) {
      state.callback = callback;
      this.disconnected = false;
      this.observed = null;
      state.instances.push(this);
    }
    observe(target, options) {
      this.observed = { target, options };
    }
    disconnect() {
      this.disconnected = true;
    }
  }
  sandbox.MutationObserver = FakeMutationObserver;
  return state;
}

function createCtx() {
  const cleanups = [];
  return {
    cleanups,
    ctx: {
      effect(fn) {
        const cleanup = fn();
        cleanups.push(cleanup);
        return () => {};
      },
    },
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test("nav icon helpers: label matching, mask SVG and CSS", () => {
  assert.equal(nav.isOwnNavRow("归档管理", "归档管理"), true);
  assert.equal(nav.isOwnNavRow(" 归档管理 \n", " 归档管理 "), true);
  assert.equal(nav.isOwnNavRow("归档管理", ""), false);
  assert.equal(nav.isOwnNavRow("归档管理", undefined), false);
  assert.equal(nav.isOwnNavRow("归档管理", null), false);
  assert.equal(nav.isOwnNavRow(null, "归档管理"), false);
  assert.equal(nav.isOwnNavRow("通用", "归档管理"), false);

  const svg = nav.navIconMaskSvg();
  assert.match(svg, /viewBox="0 0 14 14"/);
  assert.match(svg, /stroke="#000"/);
  assert.ok(svg.includes("M2.5 5.5v5"));
  const url = nav.navIconMaskUrl(svg);
  assert.ok(url.startsWith("data:image/svg+xml,"));
  assert.equal(decodeURIComponent(url.slice("data:image/svg+xml,".length)), svg);

  const css = nav.navIconCss(url);
  assert.ok(css.includes("[" + MARKER + "] > svg"));
  assert.ok(css.includes('mask-image: url("' + url + '");'));
  assert.ok(css.includes(nav.NAV_ICON_SIZE + "px"));
});

test("settings nav icon marks only the archive row and cleans up", () => {
  const own = createRow("归档管理");
  const other = createRow("通用");
  const dom = createDom({ rows: [own, other] });
  sandbox.document = dom;
  const observer = installFakeObserver();
  const { ctx, cleanups } = createCtx();

  nav.installSettingsNavIcon(ctx, () => "归档管理");

  assert.equal(own.hasAttribute(MARKER), true);
  assert.equal(other.hasAttribute(MARKER), false);
  assert.equal(dom.created.length, 1);
  assert.equal(dom.created[0].tag, "style");
  assert.equal(dom.created[0].attributes["data-plugin"], "archive-ext");
  assert.equal(dom.created[0].attributes["data-plugin-css"], "archive-ext/settings-nav-icon");
  assert.ok(dom.created[0].textContent.includes("mask-image"));
  assert.equal(dom.head.children.length, 1);
  assert.ok(observer.instances[0].observed, "observer must watch the body");
  assert.equal(cleanups.length, 1);

  cleanups[0]();

  assert.equal(own.hasAttribute(MARKER), false);
  assert.equal(dom.created[0].removed, true);
  assert.equal(observer.instances[0].disconnected, true);
});

test("settings nav icon follows a locale change", async () => {
  const own = createRow("归档管理");
  const dom = createDom({ rows: [own] });
  sandbox.document = dom;
  const observer = installFakeObserver();
  const { ctx } = createCtx();
  let label = "归档管理";

  nav.installSettingsNavIcon(ctx, () => label);
  assert.equal(own.hasAttribute(MARKER), true);

  label = "Archive manager";
  own.textContent = "Archive manager";
  observer.callback();
  await settle();
  assert.equal(own.hasAttribute(MARKER), true);

  own.textContent = "通用";
  observer.callback();
  await settle();
  assert.equal(own.hasAttribute(MARKER), false);
});

test("settings nav icon falls back to the gear when the DOM lookup throws", () => {
  const own = createRow("归档管理");
  const dom = createDom({ rows: [own], failQuery: () => new Error("dom changed") });
  sandbox.document = dom;
  installFakeObserver();
  const { ctx, cleanups } = createCtx();

  assert.doesNotThrow(() => nav.installSettingsNavIcon(ctx, () => "归档管理"));

  assert.equal(dom.created.length, 1);
  assert.equal(dom.created[0].removed, true);
  assert.equal(own.hasAttribute(MARKER), false);
  assert.doesNotThrow(() => cleanups.forEach((fn) => typeof fn === "function" && fn()));
});

test("settings nav icon falls back when the label cannot be resolved", () => {
  const row = createRow("归档管理");
  const dom = createDom({ rows: [row] });
  sandbox.document = dom;
  installFakeObserver();
  const { ctx } = createCtx();

  assert.doesNotThrow(() =>
    nav.installSettingsNavIcon(ctx, () => {
      throw new Error("locale gone");
    }),
  );

  assert.equal(row.hasAttribute(MARKER), false);
  assert.equal(dom.created[0].removed, true);
});

test("settings nav icon survives a later observer failure by falling back", async () => {
  const own = createRow("归档管理");
  const dom = createDom({ rows: [own] });
  sandbox.document = dom;
  const observer = installFakeObserver();
  const { ctx } = createCtx();

  nav.installSettingsNavIcon(ctx, () => "归档管理");
  assert.equal(own.hasAttribute(MARKER), true);

  dom.failQuery = () => new Error("boom");
  assert.doesNotThrow(() => observer.callback());
  await settle();

  assert.equal(own.hasAttribute(MARKER), false);
  assert.equal(dom.created[0].removed, true);
  assert.equal(observer.instances[0].disconnected, true);
});

test("settings nav icon is inert without a usable document", () => {
  const { ctx } = createCtx();

  sandbox.document = undefined;
  assert.doesNotThrow(() => nav.installSettingsNavIcon(ctx, () => "归档管理"));

  sandbox.document = { head: { appendChild() {} }, querySelectorAll: () => [] };
  assert.doesNotThrow(() => nav.installSettingsNavIcon(ctx, () => "归档管理"));
});

test("settings nav icon keeps the gear when CSS masks are unsupported", () => {
  const row = createRow("归档管理");
  const dom = createDom({ rows: [row] });
  sandbox.document = dom;
  installFakeObserver();
  sandbox.CSS = { supports: () => false };
  const { ctx } = createCtx();

  assert.doesNotThrow(() => nav.installSettingsNavIcon(ctx, () => "归档管理"));

  assert.equal(dom.created.length, 0);
  assert.equal(row.hasAttribute(MARKER), false);
});
