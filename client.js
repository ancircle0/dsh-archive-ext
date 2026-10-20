/**
 * dsh-archive-ext — Client half (web bundle).
 *
 * Loaded by the DSH web shell through `window.__ModuleLoader__.load`. It
 * contributes:
 *   - two session-row "..." menu entries (`sidebar.workspaces.session.menu.item`):
 *     "Open workspace folder" opens the session's workspace directory, and
 *     "Open session folder" opens the session log directory;
 *   - an "Archive manager" settings section (`settings.section`) that lists
 *     archived sessions grouped by workspace, with search, unarchive and
 *     confirmed permanent delete;
 *   - an optional sidebar global-panel entry (`sidebar.panellist` + `main`)
 *     toggled from that settings section.
 *
 * Host communication goes through the `archiveExt` Remote namespace mounted by
 * this module and served by `lib/service.js`.
 */

window.__ModuleLoader__.load({
  id: "@ancircle0/dsh-archive-ext",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    const h = React.createElement;

    let ui = null;
    try {
      ui = require("@deepseek-ai/dsh-client-ui-primitives");
    } catch {
      ui = null;
    }
    // The host's own on/off control (the one its plugin list uses). Resolve it
    // defensively so an older host without the export still gets the fallback.
    const HostSwitch = (() => {
      let value;
      try {
        value = ui && ui.Switch;
      } catch {
        return null;
      }
      if (typeof value === "function") return value;
      if (value !== null && typeof value === "object" && "$$typeof" in value) return value;
      return null;
    })();

    const NS = "archiveExt";
    const SIDEBAR_PANEL_ID = "archive-ext";
    const SIDEBAR_STORAGE_KEY = "dsh-archive-ext.sidebar";

    const CSS = `
.ae-header{display:flex;align-items:center;gap:10px;padding:18px 14px 10px 24px;}
.ae-panel-title{font-weight:500;font-size:16px;line-height:24px;flex:1;color:var(--dsw-alias-label-primary,inherit);}
.ae-close{flex:none;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:none;border-radius:8px;background:transparent;cursor:pointer;color:var(--dsw-alias-label-secondary,inherit);padding:0;font-size:14px;line-height:1;}
.ae-close:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12));color:var(--dsw-alias-label-primary,inherit);}
.ae-close[disabled]{opacity:.5;cursor:default;}
.ae-search{padding:0 24px 12px;}
.ae-search input{box-sizing:border-box;width:100%;height:30px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.2));border-radius:10px;background:transparent;color:var(--dsw-alias-label-primary,inherit);font-size:13px;line-height:18px;outline:none;font-family:inherit;}
.ae-search input::placeholder{color:var(--dsw-alias-label-tertiary,inherit);}
.ae-search input:focus{border-color:var(--dsw-alias-brand-primary,#4a7dff);}
.ae-group{margin-top:2px;}
.ae-group+.ae-group{margin-top:4px;}
.ae-group-head{box-sizing:border-box;display:flex;align-items:center;gap:6px;height:34px;width:100%;padding:0 8px;border-radius:8px;border:none;background:transparent;color:inherit;font-family:inherit;font-size:inherit;text-align:left;cursor:pointer;}
.ae-group-head:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.08));}
.ae-chevron{flex:none;width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary,inherit);transition:transform .15s var(--ds-ease-in-out,ease);}
.ae-chevron.ae-open{transform:rotate(90deg);}
.ae-group-icon{flex:none;width:16px;height:20px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary,inherit);}
.ae-group-label{flex:1;min-width:0;font-size:14px;line-height:20px;color:var(--dsw-alias-label-primary,inherit);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ae-group-count{flex:none;font-size:12px;line-height:20px;color:var(--dsw-alias-label-tertiary,inherit);}
.ae-row{display:flex;align-items:center;gap:6px;min-height:32px;padding:0 8px 0 32px;border-radius:8px;color:var(--dsw-alias-label-primary,inherit);}
.ae-row:hover,.ae-row:focus-within{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.08));}
.ae-row-icon{flex:none;width:16px;height:20px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary,inherit);}
.ae-row-title{flex:1;min-width:0;font-size:14px;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ae-row-time{flex:none;font-size:12px;line-height:20px;color:var(--dsw-alias-label-tertiary,inherit);transition:opacity .1s ease;}
.ae-row-actions{flex:none;display:inline-flex;align-items:center;gap:2px;opacity:0;pointer-events:none;transition:opacity .1s ease;}
.ae-row:hover .ae-row-time,.ae-row:focus-within .ae-row-time{opacity:0;}
.ae-row:hover .ae-row-actions,.ae-row:focus-within .ae-row-actions{opacity:1;pointer-events:auto;}
@media (hover:none){.ae-row-actions{opacity:1;pointer-events:auto}.ae-row-time{display:none}}
.ae-btn{border:none;background:transparent;font-family:inherit;font-size:12px;line-height:18px;padding:4px 8px;border-radius:8px;cursor:pointer;white-space:nowrap;}
.ae-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12));}
.ae-btn-restore{color:var(--dsw-alias-brand-primary,#4a7dff);}
.ae-btn-danger{color:var(--dsw-alias-state-error-primary,#e5484d);}
.ae-btn-danger:hover{background:var(--dsw-alias-interactive-bg-hover-danger,rgba(229,72,77,.1));}
.ae-btn[disabled]{opacity:.5;cursor:default;}
.ae-orphan .ae-row-icon{color:var(--dsw-alias-state-warn-primary,#d99a06);}
.ae-orphan .ae-row-title{color:var(--dsw-alias-label-secondary,inherit);}
.ae-empty{color:var(--dsw-alias-label-tertiary,inherit);padding:40px 12px;font-size:13px;line-height:20px;text-align:center;}
.ae-ghost{color:var(--dsw-alias-label-secondary,inherit);padding:8px 24px;font-size:12px;line-height:18px;}
.ae-error{color:var(--dsw-alias-state-error-primary,#e5484d);padding:8px 24px;font-size:12px;line-height:18px;}
.ae-confirm-overlay{position:fixed;inset:0;z-index:1100;background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.4));display:flex;align-items:center;justify-content:center;padding:24px;}
.ae-confirm{position:relative;display:flex;flex-direction:column;width:440px;max-width:calc(100vw - 48px);border:1px solid var(--dsw-alias-border-inverted,rgba(128,128,128,.3));border-radius:24px;background:var(--dsw-alias-bg-layer-2,#fff);color:var(--dsw-alias-label-primary,inherit);box-shadow:var(--dsw-shadow-lv3,0 12px 40px rgba(0,0,0,.25));}
.ae-confirm-body{padding:4px 24px 16px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary,inherit);}
.ae-confirm-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:0 24px 20px;}
.ae-confirm-btn{border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.2));background:transparent;color:var(--dsw-alias-label-primary,inherit);font-family:inherit;font-size:13px;line-height:18px;padding:6px 14px;border-radius:10px;cursor:pointer;}
.ae-confirm-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12));}
.ae-confirm-danger{border-color:transparent;background:var(--dsw-alias-state-error-primary,#e5484d);color:var(--dsw-alias-bg-base,#fff);}
.ae-confirm-btn[disabled]{opacity:.5;cursor:default;}
.ae-surface{display:flex;flex-direction:column;min-height:0;color:var(--dsw-alias-label-primary,inherit);}
.ae-surface-head{display:flex;align-items:center;gap:10px;padding:0 0 12px;}
.ae-surface-title{font-weight:500;font-size:16px;line-height:24px;flex:1;color:var(--dsw-alias-label-primary,inherit);}
.ae-surface-count{font-size:12px;line-height:16px;color:var(--dsw-alias-label-tertiary,inherit);flex:none;}
.ae-surface-body{flex:1;min-height:0;overflow-y:auto;padding:4px 0 16px;overscroll-behavior:contain;}
.ae-settings{padding:0;}
.ae-settings .ae-surface-body{flex:none;overflow:visible;}
.ae-settings .ae-search{padding:0 0 12px;}
.ae-panel-surface{box-sizing:border-box;padding:24px;height:100%;}
.ae-panel-surface .ae-search{padding:0 0 12px;}
.ae-toggle-row{display:flex;align-items:center;gap:16px;padding:12px 0;margin-bottom:12px;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.2));}
.ae-toggle-text{flex:1;min-width:0;}
.ae-toggle-label{font-size:14px;line-height:20px;color:var(--dsw-alias-label-primary,inherit);}
.ae-toggle-desc{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,inherit);}
.ae-switch{position:relative;flex:none;box-sizing:border-box;width:36px;height:20px;padding:0;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:999px;background:var(--dsw-alias-label-tertiary,#8a8f98);cursor:pointer;transition:background .15s ease,border-color .15s ease;appearance:none;-webkit-appearance:none;}
.ae-switch.ae-on{background:var(--dsw-alias-brand-primary,#4a7dff);border-color:transparent;}
.ae-switch-knob{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-bg-base,#fff);box-shadow:0 1px 2px rgba(0,0,0,.28);transition:transform .15s ease;}
.ae-switch.ae-on .ae-switch-knob{transform:translateX(16px);}
.ae-switch[disabled]{opacity:.5;cursor:default;}
.ae-toggle-control{display:inline-flex;align-items:center;gap:8px;flex:none;}
.ae-toggle-state{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,inherit);min-width:2.5em;text-align:right;}
.ae-toast{position:fixed;right:24px;bottom:24px;z-index:1200;max-width:360px;padding:10px 14px;border-radius:10px;background:var(--dsw-alias-bg-layer-2,#fff);color:var(--dsw-alias-label-primary,inherit);border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.2));box-shadow:var(--dsw-shadow-lv3,0 12px 40px rgba(0,0,0,.25));font-size:13px;line-height:18px;}
.ae-menu-item{display:flex;align-items:center;gap:8px;width:100%;padding:5px 12px;border:none;background:transparent;color:inherit;font-family:inherit;font-size:13px;line-height:18px;text-align:left;cursor:pointer;border-radius:var(--dsw-radius-sm,6px);}
.ae-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12));}
`;

    // ---- locale dictionaries -------------------------------------------------
    const ZH = {
      "menu.openWorkspaceFolder": "打开工作区文件夹",
      "menu.openSessionFolder": "打开会话文件夹",
      "settings.nav": "归档管理",
      "settings.pin": "在侧栏显示归档管理",
      "settings.pinDesc": "开启后，在侧栏全局入口显示「归档管理」，点击即可打开。",
      "settings.pinUnsupported": "当前 DSH 版本不支持侧栏全局入口。",
      "settings.on": "已开启",
      "settings.off": "已关闭",
      "page.title": "归档管理",
      "page.count": "{count} 个归档",
      "page.search": "搜索归档会话…",
      "page.empty": "暂无归档会话",
      "page.ungrouped": "未分组",
      "page.orphanGroup": "无效的归档记录",
      "page.orphanTitle": "未知会话（日志已不存在）",
      "page.untitled": "未命名会话",
      "page.restore": "取消归档",
      "page.delete": "永久删除",
      "page.deleteTitle": "永久删除会话",
      "page.deleteDesc": "将永久删除「{title}」的会话日志文件并立即移除归档记录，此操作不可恢复。",
      "page.deleteOrphanDesc": "将移除「{title}」的失效归档记录。",
      "page.deleteConfirm": "永久删除",
      "page.deleting": "删除中…",
      "page.cancel": "取消",
      "page.close": "关闭",
      "page.restoring": "还原中…",
      "page.deletedLive": "日志已删除，归档记录已移除，内存中的会话也已释放。",
      "page.deletedLiveRemaining": "日志已删除，归档记录已移除；该会话仍驻留内存，普通会话列表可能在重启 DSH 前仍显示它，重启后会彻底消失。",
      "page.ghostNotice": "{count} 个已删除会话仍驻留内存，其侧栏条目会在重启 DSH 后清除。",
      "toast.openFailed": "无法打开资源管理器：{message}",
      "errors.invalid-session": "无效的会话",
      "errors.session-missing": "找不到该会话（可能已被删除）",
      "errors.session-locate-unavailable": "当前 DSH 版本无法定位会话日志",
      "errors.session-log-missing": "会话日志尚未生成或已被删除",
      "errors.not-archived": "该会话不在归档中",
      "errors.agent-running": "该会话的智能体正在运行中，请停止后再删除",
      "errors.locate-unavailable": "当前 DSH 版本无法定位会话日志，已保留归档记录",
      "errors.delete-failed": "删除会话文件失败：{message}",
      "errors.archive-cleanup-failed": "日志已删除，但归档记录清理失败，请重试",
      "errors.write-failed": "写入归档状态失败",
      "errors.path-missing": "工作区目录不存在",
      "errors.path-not-directory": "工作区路径不是文件夹",
      "errors.launch-failed": "无法启动资源管理器：{message}",
      "errors.state-failed": "读取归档状态失败",
      "errors.unknown": "操作失败：{message}",
    };

    const EN = {
      "menu.openWorkspaceFolder": "Open workspace folder",
      "menu.openSessionFolder": "Open session folder",
      "settings.nav": "Archive manager",
      "settings.pin": "Show archive manager in sidebar",
      "settings.pinDesc": "Adds an “Archive manager” entry to the sidebar’s global panel list; click it to open the page.",
      "settings.pinUnsupported": "This DSH version does not support sidebar global panels.",
      "settings.on": "On",
      "settings.off": "Off",
      "page.title": "Archive manager",
      "page.count": "{count} archived",
      "page.search": "Search archived sessions…",
      "page.empty": "No archived sessions yet",
      "page.ungrouped": "Ungrouped",
      "page.orphanGroup": "Invalid archive records",
      "page.orphanTitle": "Unknown session (log is gone)",
      "page.untitled": "Untitled session",
      "page.restore": "Unarchive",
      "page.delete": "Delete permanently",
      "page.deleteTitle": "Permanently delete session",
      "page.deleteDesc": "This permanently deletes the session log for “{title}” and removes its archive record immediately. This cannot be undone.",
      "page.deleteOrphanDesc": "This removes the stale archive record “{title}”.",
      "page.deleteConfirm": "Delete permanently",
      "page.deleting": "Deleting…",
      "page.cancel": "Cancel",
      "page.close": "Close",
      "page.restoring": "Restoring…",
      "page.deletedLive": "The log was deleted, the archive record was removed, and the in-memory session was released.",
      "page.deletedLiveRemaining": "The log was deleted and the archive record was removed. The session is still in DSH memory, so a normal session list may show it until DSH restarts; it disappears completely after that.",
      "page.ghostNotice": "{count} deleted session(s) are still in memory; their sidebar entries clear after a DSH restart.",
      "toast.openFailed": "Could not open File Explorer: {message}",
      "errors.invalid-session": "Invalid session",
      "errors.session-missing": "The session could not be found (it may have been deleted)",
      "errors.session-locate-unavailable": "This DSH build cannot locate session logs",
      "errors.session-log-missing": "The session logs have not been created yet or have been deleted",
      "errors.not-archived": "The session is not archived",
      "errors.agent-running": "The session agent is still running; stop it before deleting",
      "errors.locate-unavailable": "This DSH build cannot locate session logs; the archive entry was kept",
      "errors.delete-failed": "Could not delete the session files: {message}",
      "errors.archive-cleanup-failed": "The log was deleted, but the archive record could not be cleaned up; try again",
      "errors.write-failed": "Could not write the archive state",
      "errors.path-missing": "The workspace directory does not exist",
      "errors.path-not-directory": "The workspace path is not a directory",
      "errors.launch-failed": "Could not launch File Explorer: {message}",
      "errors.state-failed": "Could not read the archive state",
      "errors.unknown": "Operation failed: {message}",
    };

    const ERROR_CODES = new Set([
      "invalid-session",
      "session-missing",
      "session-locate-unavailable",
      "session-log-missing",
      "not-archived",
      "agent-running",
      "locate-unavailable",
      "delete-failed",
      "archive-cleanup-failed",
      "write-failed",
      "path-missing",
      "path-not-directory",
      "launch-failed",
      "state-failed",
    ]);

    function formatMessage(message, vars) {
      let text = String(message === undefined || message === null ? "" : message);
      if (vars) {
        for (const key of Object.keys(vars)) {
          text = text.split("{" + key + "}").join(String(vars[key]));
        }
      }
      return text;
    }

    function errorMessage(error, t) {
      const code = error && typeof error === "object" ? error.code : undefined;
      const detail = error && typeof error === "object" && error.message ? String(error.message) : "";
      if (code && ERROR_CODES.has(code)) return t("errors." + code, { message: detail });
      return t("errors.unknown", { message: detail || String(code || "") });
    }

    // ---- Client Remote contribution -----------------------------------------
    let passthroughValue;
    const passthroughSchema = () => (passthroughValue ??= { parse: (value) => value });
    const strictClientCodec = (typeSymbol) => ({
      mode: "strict",
      typeSymbol,
      schema: passthroughSchema(),
      create: passthroughSchema,
    });

    const CLIENT_REMOTE = {
      package: "dsh-archive-ext",
      descriptors: [
        {
          id: "dsh-archive-ext#archiveExt/restore",
          service: "archiveExt",
          namespace: "archiveExt",
          method: "restore",
          invocation: { kind: "direct" },
          parameters: [
            {
              name: "request",
              wire: "request",
              source: "json",
              codec: strictClientCodec("dsh-archive-ext#ArchiveExtRestoreRequest"),
            },
          ],
          result: strictClientCodec("dsh-archive-ext#ArchiveExtRestoreResult"),
        },
        {
          id: "dsh-archive-ext#archiveExt/delete",
          service: "archiveExt",
          namespace: "archiveExt",
          method: "delete",
          invocation: { kind: "direct" },
          parameters: [
            {
              name: "request",
              wire: "request",
              source: "json",
              codec: strictClientCodec("dsh-archive-ext#ArchiveExtDeleteRequest"),
            },
          ],
          result: strictClientCodec("dsh-archive-ext#ArchiveExtDeleteResult"),
        },
        {
          id: "dsh-archive-ext#archiveExt/state",
          service: "archiveExt",
          namespace: "archiveExt",
          method: "state",
          invocation: { kind: "direct" },
          parameters: [],
          result: strictClientCodec("dsh-archive-ext#ArchiveExtStateResult"),
        },
        {
          id: "dsh-archive-ext#archiveExt/open",
          service: "archiveExt",
          namespace: "archiveExt",
          method: "open",
          invocation: { kind: "direct" },
          parameters: [
            {
              name: "request",
              wire: "request",
              source: "json",
              codec: strictClientCodec("dsh-archive-ext#ArchiveExtOpenRequest"),
            },
          ],
          result: strictClientCodec("dsh-archive-ext#ArchiveExtOpenResult"),
        },
        {
          id: "dsh-archive-ext#archiveExt/openSessionStorage",
          service: "archiveExt",
          namespace: "archiveExt",
          method: "openSessionStorage",
          invocation: { kind: "direct" },
          parameters: [
            {
              name: "request",
              wire: "request",
              source: "json",
              codec: strictClientCodec("dsh-archive-ext#ArchiveExtOpenSessionStorageRequest"),
            },
          ],
          result: strictClientCodec("dsh-archive-ext#ArchiveExtOpenSessionStorageResult"),
        },
      ],
    };

    // ---- icons ---------------------------------------------------------------
    function IconArchive({ size = 16 }) {
      return h(
        "svg",
        {
          width: size,
          height: size,
          viewBox: "0 0 14 14",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 1.1,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": true,
        },
        h("rect", { x: 1.5, y: 2, width: 11, height: 3.5, rx: 0.8 }),
        h("path", { d: "M2.5 5.5v5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-5" }),
        h("path", { d: "M5.5 8h3" }),
      );
    }

    function IconFolderOpen({ size = 16 }) {
      return h(
        "svg",
        {
          width: size,
          height: size,
          viewBox: "0 0 16 16",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 1.3,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": true,
        },
        h("path", { d: "M1.5 4.5a1 1 0 0 1 1-1h3l1.5 2h6.5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7Z" }),
        h("path", { d: "M1.8 8.2h12.4" }),
      );
    }

    function IconChevron() {
      return h(
        "svg",
        {
          width: 14,
          height: 14,
          viewBox: "0 0 14 14",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 1.4,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": true,
        },
        h("path", { d: "m5 3.5 3.5 3.5L5 10.5" }),
      );
    }

    function IconWarning({ size = 16 }) {
      return h(
        "svg",
        {
          width: size,
          height: size,
          viewBox: "0 0 16 16",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 1.3,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": true,
        },
        h("path", { d: "M8 2.5 14.5 13.5h-13L8 2.5Z" }),
        h("path", { d: "M8 6.5v3" }),
        h("circle", { cx: 8, cy: 11.5, r: 0.4, fill: "currentColor" }),
      );
    }

    // ---- stores --------------------------------------------------------------
    function createStore(initial) {
      let value = initial;
      const listeners = new Set();
      return {
        get: () => value,
        set: (next) => {
          if (Object.is(value, next)) return;
          value = next;
          for (const listener of listeners) listener();
        },
        subscribe: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      };
    }

    function useStore(store) {
      return React.useSyncExternalStore(store.subscribe, store.get);
    }

    // ---- formatting / grouping ----------------------------------------------
    function formatRelative(ts) {
      const value = Number(ts);
      if (!Number.isFinite(value) || value <= 0) return "";
      const diff = Date.now() - value;
      const abs = Math.abs(diff);
      const lang =
        (typeof document !== "undefined" && document.documentElement && document.documentElement.lang) ||
        (typeof navigator !== "undefined" && navigator.language) ||
        "en";
      let rtf;
      try {
        rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
      } catch {
        rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
      }
      const minute = 60000;
      const hour = 60 * minute;
      const day = 24 * hour;
      if (abs < minute) return rtf.format(Math.round(-diff / 1000), "second");
      if (abs < hour) return rtf.format(Math.round(-diff / minute), "minute");
      if (abs < day) return rtf.format(Math.round(-diff / hour), "hour");
      if (abs < 30 * day) return rtf.format(Math.round(-diff / day), "day");
      try {
        return new Date(value).toLocaleDateString(lang, {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      } catch {
        return new Date(value).toISOString().slice(0, 10);
      }
    }

    function byUpdatedDesc(a, b) {
      const delta = (b.updatedAt || 0) - (a.updatedAt || 0);
      if (delta !== 0) return delta;
      return String(a.id).localeCompare(String(b.id));
    }

    function deriveGroups(byId, archivedIds, workspaces, query, labels) {
      const q = String(query || "").trim().toLowerCase();
      const archived = new Set(archivedIds);
      const resolved = new Set();
      const groups = [];
      const matches = (session, workspaceTitle) => {
        if (!q) return true;
        const title = String(session.displayTitle || session.title || "").toLowerCase();
        const cwd = String(session.cwd || "").toLowerCase();
        return (
          title.includes(q) ||
          cwd.includes(q) ||
          String(workspaceTitle || "").toLowerCase().includes(q)
        );
      };

      for (const workspace of workspaces || []) {
        if (!workspace) continue;
        const rawIds = Array.isArray(workspace.sessionIds)
          ? workspace.sessionIds
          : workspace.sessionIds && typeof workspace.sessionIds[Symbol.iterator] === "function"
            ? Array.from(workspace.sessionIds)
            : [];
        const members = [];
        for (const raw of rawIds) {
          const sessionId = String(raw);
          if (!archived.has(sessionId)) continue;
          const session = byId[sessionId];
          // A missing or blank summary is not displayable here; leave it
          // unresolved so the orphan bucket below can surface it for cleanup.
          if (!session || session.blank) continue;
          resolved.add(sessionId);
          if (!matches(session, workspace.title)) continue;
          members.push(session);
        }
        if (members.length === 0) continue;
        members.sort(byUpdatedDesc);
        groups.push({
          key: String(workspace.workspaceId || workspace.id || workspace.path || workspace.title),
          label: workspace.title || workspace.path || labels.untitled,
          sessions: members,
        });
      }

      const stray = [];
      for (const sessionId of archivedIds) {
        if (resolved.has(sessionId)) continue;
        const session = byId[sessionId];
        if (!session || session.blank) continue;
        resolved.add(sessionId);
        if (!matches(session, "")) continue;
        stray.push(session);
      }
      if (stray.length > 0) {
        stray.sort(byUpdatedDesc);
        groups.push({ key: "__ungrouped__", label: labels.ungrouped, sessions: stray });
      }

      const orphans = [];
      for (const sessionId of archivedIds) {
        if (resolved.has(sessionId)) continue;
        const session = byId[sessionId];
        if (session && !session.blank) continue;
        if (q && !String(sessionId).toLowerCase().includes(q)) continue;
        orphans.push({ id: sessionId, orphan: true, updatedAt: 0 });
      }
      if (orphans.length > 0) {
        groups.push({ key: "__orphan__", label: labels.orphanGroup, orphanGroup: true, sessions: orphans });
      }

      return { groups, total: archivedIds.length };
    }

    // ---- session-row menu items (official slot) ------------------------------
    function SessionMenuRow({ useMenuOpenState, icon, label, onSelect }) {
      const menuState = typeof useMenuOpenState === "function" ? useMenuOpenState() : null;
      const setMenuOpen = menuState ? menuState[1] : () => {};
      const select = () => {
        setMenuOpen(false);
        onSelect();
      };
      if (ui && ui.MenuItemButton) {
        return h(ui.MenuItemButton, { icon, onSelect: select }, label);
      }
      return h(
        "button",
        { type: "button", role: "menuitem", className: "ae-menu-item", onClick: select },
        icon,
        h("span", null, label),
      );
    }

    function OpenWorkspaceFolderMenuItem(props) {
      const { sessionId, t, openWorkspaceFolder } = props;
      return h(SessionMenuRow, {
        useMenuOpenState: props.useMenuOpenState,
        icon: h(IconFolderOpen, { size: 14 }),
        label: t("menu.openWorkspaceFolder"),
        onSelect: () => void openWorkspaceFolder(sessionId),
      });
    }

    function OpenSessionFolderMenuItem(props) {
      const { sessionId, t, openSessionFolder } = props;
      return h(SessionMenuRow, {
        useMenuOpenState: props.useMenuOpenState,
        icon: h(IconArchive, { size: 14 }),
        label: t("menu.openSessionFolder"),
        onSelect: () => void openSessionFolder(sessionId),
      });
    }

    // ---- archive manager surface --------------------------------------------
    function ArchiveManagerSurface(props) {
      const {
        surface = "panel",
        t,
        useWorkspaces,
        useSessions,
        remote,
        ghostStore,
        refreshGhosts,
        refreshSessions,
        sidebarEnabledStore,
        sidebarSupportedStore,
        setSidebarEnabled,
      } = props;
      const [query, setQuery] = React.useState("");
      const [collapsed, setCollapsed] = React.useState(() => new Set());
      const [busy, setBusy] = React.useState(null);
      const [error, setError] = React.useState(null);
      const [liveNotice, setLiveNotice] = React.useState(null);
      const [deleteTarget, setDeleteTarget] = React.useState(null);
      const ghostIds = useStore(ghostStore);
      const sidebarEnabled = useStore(sidebarEnabledStore);
      const sidebarSupported = useStore(sidebarSupportedStore);
      const archivedRaw = useWorkspaces ? useWorkspaces((state) => state.archivedSessionIds) : [];
      const byId = useSessions ? useSessions((state) => state.byId) : {};
      const workspaces = useWorkspaces ? useWorkspaces((state) => state.items) : [];
      const ghostSet = React.useMemo(() => new Set(ghostIds), [ghostIds]);
      const archivedIds = React.useMemo(
        () => (Array.isArray(archivedRaw) ? archivedRaw : []).filter((id) => !ghostSet.has(id)),
        [archivedRaw, ghostSet],
      );
      const labels = React.useMemo(
        () => ({
          ungrouped: t("page.ungrouped"),
          orphanGroup: t("page.orphanGroup"),
          untitled: t("page.untitled"),
        }),
        [t],
      );
      const derived = React.useMemo(
        () => deriveGroups(byId || {}, archivedIds, workspaces || [], query, labels),
        [byId, archivedIds, workspaces, query, labels],
      );

      React.useEffect(() => {
        void refreshGhosts();
      }, []);

      const toggleGroup = (key) => {
        setCollapsed((previous) => {
          const next = new Set(previous);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        });
      };

      const restore = async (sessionId) => {
        setBusy("restore:" + sessionId);
        setError(null);
        try {
          const result = await remote.restore({ sessionId });
          if (!result || !result.ok) {
            setError(errorMessage(result && result.error, t));
          }
        } catch (caught) {
          setError(errorMessage({ code: "unknown", message: String(caught && caught.message ? caught.message : caught) }, t));
        } finally {
          setBusy(null);
        }
      };

      const header = h(
        "div",
        { className: "ae-surface-head" },
        h("span", { className: "ae-surface-title" }, t("page.title")),
        h("span", { className: "ae-surface-count" }, t("page.count", { count: derived.total })),
      );

      const switchControl = HostSwitch
        ? h(HostSwitch, {
            checked: sidebarEnabled,
            onChange: (next) => setSidebarEnabled(typeof next === "boolean" ? next : !sidebarEnabled),
            label: t("settings.pin"),
            disabled: !sidebarSupported,
            title: sidebarSupported ? t("settings.pinDesc") : t("settings.pinUnsupported"),
          })
        : h(
            "span",
            { className: "ae-toggle-control" },
            h(
              "button",
              {
                type: "button",
                role: "switch",
                "aria-checked": sidebarEnabled,
                "aria-label": t("settings.pin"),
                className: "ae-switch" + (sidebarEnabled ? " ae-on" : ""),
                disabled: !sidebarSupported,
                onClick: () => setSidebarEnabled(!sidebarEnabled),
              },
              h("span", { className: "ae-switch-knob" }),
            ),
            h("span", { className: "ae-toggle-state" }, sidebarEnabled ? t("settings.on") : t("settings.off")),
          );

      const toggleRow =
        surface === "settings"
          ? h(
              "div",
              { className: "ae-toggle-row" },
              h(
                "div",
                { className: "ae-toggle-text" },
                h("div", { className: "ae-toggle-label" }, t("settings.pin")),
                h(
                  "div",
                  { className: "ae-toggle-desc" },
                  sidebarSupported ? t("settings.pinDesc") : t("settings.pinUnsupported"),
                ),
              ),
              switchControl,
            )
          : null;

      const search = h(
        "div",
        { className: "ae-search" },
        h("input", {
          type: "text",
          value: query,
          placeholder: t("page.search"),
          onChange: (event) => setQuery(event.target.value),
        }),
      );

      const searching = query.trim() !== "";
      const rows = derived.groups.map((group) => {
        const expanded = searching || !collapsed.has(group.key);
        return h(
          "div",
          { className: "ae-group", key: group.key },
          h(
            "button",
            {
              type: "button",
              className: "ae-group-head",
              onClick: () => toggleGroup(group.key),
              "aria-expanded": expanded,
            },
            h("span", { className: "ae-chevron" + (expanded ? " ae-open" : ""), "aria-hidden": true }, h(IconChevron)),
            h(
              "span",
              { className: "ae-group-icon", "aria-hidden": true },
              group.orphanGroup ? h(IconWarning) : h(IconArchive, { size: 16 }),
            ),
            h("span", { className: "ae-group-label" }, group.label),
            h("span", { className: "ae-group-count" }, t("page.count", { count: group.sessions.length })),
          ),
          expanded
            ? group.sessions.map((session) => {
                const orphan = session.orphan === true;
                const title = orphan
                  ? t("page.orphanTitle")
                  : session.displayTitle || session.title || t("page.untitled");
                const restoring = busy === "restore:" + session.id;
                const timeLabel = orphan ? String(session.id) : formatRelative(session.updatedAt);
                return h(
                  "div",
                  {
                    className: "ae-row" + (orphan ? " ae-orphan" : ""),
                    key: session.id,
                    title: orphan ? String(session.id) : session.cwd || undefined,
                  },
                  h("span", { className: "ae-row-icon", "aria-hidden": true }, orphan ? h(IconWarning) : h(IconArchive, { size: 16 })),
                  h("span", { className: "ae-row-title" }, title),
                  h("span", { className: "ae-row-time" }, timeLabel),
                  h(
                    "span",
                    { className: "ae-row-actions" },
                    orphan
                      ? null
                      : h(
                          "button",
                          {
                            type: "button",
                            className: "ae-btn ae-btn-restore",
                            disabled: busy !== null,
                            onClick: () => void restore(session.id),
                          },
                          restoring ? t("page.restoring") : t("page.restore"),
                        ),
                    h(
                      "button",
                      {
                        type: "button",
                        className: "ae-btn ae-btn-danger",
                        disabled: busy !== null,
                        onClick: () =>
                          setDeleteTarget({ sessionId: session.id, displayTitle: title, orphan }),
                      },
                      t("page.delete"),
                    ),
                  ),
                );
              })
            : null,
        );
      });

      const ghostNotice =
        ghostIds.length > 0
          ? h("div", { className: "ae-ghost" }, t("page.ghostNotice", { count: ghostIds.length }))
          : null;
      const liveNoticeBanner = liveNotice
        ? h(
            "div",
            { className: "ae-ghost" },
            t(liveNotice === "detached" ? "page.deletedLive" : "page.deletedLiveRemaining"),
          )
        : null;

      const content = h(
        "div",
        { className: "ae-surface " + (surface === "settings" ? "ae-settings" : "ae-panel-surface") },
        header,
        toggleRow,
        ghostNotice,
        liveNoticeBanner,
        error ? h("div", { className: "ae-error", role: "alert" }, error) : null,
        search,
        h(
          "div",
          { className: "ae-surface-body" },
          derived.total === 0
            ? h("div", { className: "ae-empty" }, t("page.empty"))
            : rows,
        ),
      );

      const dialog = deleteTarget
        ? h(DeleteConfirmDialog, {
            target: deleteTarget,
            t,
            remote,
            refreshGhosts,
            refreshSessions,
            onDeleted: (value) => {
              if (value && value.live) setLiveNotice(value.liveDetached ? "detached" : "remaining");
              else setLiveNotice(null);
            },
            onClose: () => setDeleteTarget(null),
          })
        : null;

      return h(React.Fragment, null, content, dialog);
    }

    function ArchiveSettingsSection(props) {
      return h(ArchiveManagerSurface, { ...props, surface: "settings" });
    }

    function ArchiveSidebarPanel(props) {
      return h(ArchiveManagerSurface, { ...props, surface: "panel" });
    }

    function DeleteConfirmDialog({ target, t, remote, refreshGhosts, refreshSessions, onDeleted, onClose }) {
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState(null);

      React.useEffect(() => {
        const onKeyDown = (event) => {
          if (event.key !== "Escape") return;
          event.stopPropagation();
          if (!busy) onClose();
        };
        document.addEventListener("keydown", onKeyDown, true);
        return () => document.removeEventListener("keydown", onKeyDown, true);
      }, [busy, onClose]);

      const close = () => {
        if (!busy) onClose();
      };

      const confirm = async () => {
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
          const result = await remote.delete({ sessionId: target.sessionId });
          if (result && result.ok) {
            refreshSessions();
            await refreshGhosts();
            onDeleted(result.value || {});
            onClose();
          } else {
            setError(errorMessage(result && result.error, t));
          }
        } catch (caught) {
          setError(errorMessage({ code: "unknown", message: String(caught && caught.message ? caught.message : caught) }, t));
        } finally {
          setBusy(false);
        }
      };

      const title = target.displayTitle || target.sessionId;
      return h(
        "div",
        { className: "ae-confirm-overlay", onClick: close },
        h(
          "div",
          {
            className: "ae-confirm",
            role: "alertdialog",
            "aria-modal": "true",
            "aria-label": t("page.deleteTitle"),
            onClick: (event) => event.stopPropagation(),
          },
          h(
            "div",
            { className: "ae-header" },
            h("span", { className: "ae-panel-title" }, t("page.deleteTitle")),
            h(
              "button",
              {
                type: "button",
                className: "ae-close",
                onClick: close,
                disabled: busy,
                title: t("page.close"),
                "aria-label": t("page.close"),
              },
              "✕",
            ),
          ),
          h(
            "div",
            { className: "ae-confirm-body" },
            target.orphan
              ? t("page.deleteOrphanDesc", { title })
              : t("page.deleteDesc", { title }),
          ),
          error ? h("div", { className: "ae-error", role: "alert" }, error) : null,
          h(
            "div",
            { className: "ae-confirm-actions" },
            h(
              "button",
              { type: "button", className: "ae-confirm-btn", disabled: busy, onClick: close },
              t("page.cancel"),
            ),
            h(
              "button",
              {
                type: "button",
                className: "ae-confirm-btn ae-confirm-danger",
                disabled: busy,
                onClick: () => void confirm(),
              },
              busy ? t("page.deleting") : t("page.deleteConfirm"),
            ),
          ),
        ),
      );
    }

    // ---- global toast (footer slot renders no button any more) ---------------
    function ArchiveToast(props) {
      const notice = useStore(props.noticeStore);
      return notice ? h("div", { className: "ae-toast", role: "status" }, notice.message) : null;
    }

    // ---- settings nav icon (best-effort DOM enhancement) ---------------------
    // `settings.section` only projects `id` / `order` / `label`; the settings
    // shell draws a gear for every section id it does not know. Until DSH grows
    // an `icon` option, claim our own nav row after the dialog mounts and draw
    // the same archive glyph the sidebar row uses (CSS mask + currentColor, so
    // light/dark themes match). This enhancement is strictly best-effort: on
    // any failure it removes the marker and stylesheet, leaving the shell's
    // gear in place. It must never throw into DSH.
    const NAV_ICON_SELECTOR = '[role="dialog"] nav button';
    const NAV_ICON_MARKER = "data-dsh-archive-ext-nav-icon";
    const NAV_ICON_SIZE = 16;

    /** Whether a nav row's visible text is this plugin's own section label. */
    function isOwnNavRow(rowText, wantedLabel) {
      const wanted = String(wantedLabel == null ? "" : wantedLabel).trim();
      if (wanted.length === 0) return false;
      return String(rowText == null ? "" : rowText).trim() === wanted;
    }

    /** The archive glyph (same geometry as `IconArchive`) as a mask SVG. */
    function navIconMaskSvg() {
      return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="none" stroke="#000" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="1.5" y="2" width="11" height="3.5" rx="0.8"/>' +
        '<path d="M2.5 5.5v5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-5"/>' +
        '<path d="M5.5 8h3"/>' +
        "</svg>"
      );
    }

    function navIconMaskUrl(svg) {
      return "data:image/svg+xml," + encodeURIComponent(svg === undefined ? navIconMaskSvg() : svg);
    }

    function navIconCss(maskUrl) {
      return [
        "[" + NAV_ICON_MARKER + "] > svg { display: none; }",
        "[" + NAV_ICON_MARKER + "]::before {",
        "  content: '';",
        "  flex: none;",
        "  width: " + NAV_ICON_SIZE + "px;",
        "  height: " + NAV_ICON_SIZE + "px;",
        "  background-color: currentColor;",
        '  -webkit-mask-image: url("' + maskUrl + '");',
        '  mask-image: url("' + maskUrl + '");',
        "  -webkit-mask-repeat: no-repeat;",
        "  mask-repeat: no-repeat;",
        "  -webkit-mask-position: center;",
        "  mask-position: center;",
        "  -webkit-mask-size: " + NAV_ICON_SIZE + "px " + NAV_ICON_SIZE + "px;",
        "  mask-size: " + NAV_ICON_SIZE + "px " + NAV_ICON_SIZE + "px;",
        "}",
      ].join("\n");
    }

    function navIconWarn(message, error) {
      try {
        if (typeof console !== "undefined" && console && typeof console.warn === "function") {
          console.warn(message, error);
        }
      } catch {
        /* logging must never break the fallback */
      }
    }

    /**
     * Whether this engine can paint the glyph as a CSS mask. If it cannot, the
     * `::before` box would show as a solid square, so the plugin keeps the
     * shell's gear instead of degrading visually.
     */
    function supportsMaskImage() {
      try {
        // Note: this bundle also has a local `CSS` stylesheet constant, so read
        // the browser API from globalThis rather than the bare identifier.
        const css = typeof globalThis === "undefined" ? undefined : globalThis.CSS;
        if (!css || typeof css.supports !== "function") return true;
        return (
          css.supports("mask-image", 'url("x")') ||
          css.supports("-webkit-mask-image", 'url("x")')
        );
      } catch {
        return false;
      }
    }

    /**
     * Install the settings-nav glyph, or permanently fall back to the shell's
     * gear when anything goes wrong. Never throws.
     */
    function installSettingsNavIcon(ctx, resolveLabel) {
      try {
        if (typeof document === "undefined" || document === null) return;
        if (typeof document.querySelectorAll !== "function") return;
        ctx.effect(() => {
          let styleTag = null;
          let observer = null;
          let disposed = false;
          let scheduled = false;
          const markedRows = new Set();
          /** Undo every DOM change; safe to call repeatedly and from cleanup. */
          const fallback = (reason) => {
            if (disposed) return;
            disposed = true;
            try {
              if (observer) observer.disconnect();
            } catch {
              /* observer already gone */
            }
            observer = null;
            for (const row of Array.from(markedRows)) {
              try {
                row.removeAttribute(NAV_ICON_MARKER);
              } catch {
                /* row may be gone */
              }
            }
            markedRows.clear();
            try {
              if (styleTag && typeof styleTag.remove === "function") styleTag.remove();
            } catch {
              /* style may be detached already */
            }
            styleTag = null;
            if (reason !== undefined) {
              navIconWarn(
                "[archive-ext] settings nav icon disabled; using the default settings icon",
                reason,
              );
            }
          };
          const sync = () => {
            if (disposed) return;
            try {
              const wanted = resolveLabel();
              const rows = document.querySelectorAll(NAV_ICON_SELECTOR);
              const seen = new Set();
              for (const row of Array.from(rows)) {
                seen.add(row);
                if (isOwnNavRow(row && row.textContent, wanted)) {
                  try {
                    row.setAttribute(NAV_ICON_MARKER, "");
                    markedRows.add(row);
                  } catch {
                    /* row may be gone */
                  }
                } else {
                  try {
                    row.removeAttribute(NAV_ICON_MARKER);
                  } catch {
                    /* row may be gone */
                  }
                  markedRows.delete(row);
                }
              }
              for (const row of Array.from(markedRows)) {
                if (seen.has(row)) continue;
                try {
                  row.removeAttribute(NAV_ICON_MARKER);
                } catch {
                  /* row may be gone */
                }
                markedRows.delete(row);
              }
            } catch (error) {
              fallback(error);
            }
          };
          const schedule = () => {
            if (scheduled || disposed) return;
            scheduled = true;
            const run = () => {
              scheduled = false;
              sync();
            };
            try {
              if (typeof queueMicrotask === "function") queueMicrotask(run);
              else run();
            } catch {
              run();
            }
          };
          try {
            if (!document.head || !document.body) return fallback;
            if (!supportsMaskImage()) return fallback;
            styleTag = document.createElement("style");
            styleTag.setAttribute("data-plugin", "archive-ext");
            styleTag.setAttribute("data-plugin-css", "archive-ext/settings-nav-icon");
            styleTag.textContent = navIconCss(navIconMaskUrl());
            document.head.appendChild(styleTag);
            if (typeof MutationObserver === "function") {
              observer = new MutationObserver(schedule);
              observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true,
              });
            }
            sync();
          } catch (error) {
            fallback(error);
          }
          return fallback;
        }, "archive-ext: settings nav icon");
      } catch (error) {
        navIconWarn(
          "[archive-ext] settings nav icon unavailable; using the default settings icon",
          error,
        );
      }
    }

    // ---- plugin apply --------------------------------------------------------
    async function apply(ctx) {
      await ctx.remote.$mount(CLIENT_REMOTE);
      const remote = ctx.get("remote.archiveExt");
      if (!remote) throw new Error("archiveExt Remote namespace is unavailable");

      const styleTag = document.createElement("style");
      styleTag.textContent = CSS;
      document.head.appendChild(styleTag);
      ctx.effect(() => () => styleTag.remove());

      let locale = null;
      try {
        locale = ctx.get("locale");
      } catch {
        locale = null;
      }
      // Locale activation order is not guaranteed: this plugin declares no
      // locale dependency, so the service (and the dictionaries of other
      // packages) may appear some time after our apply runs. Resolve it lazily
      // instead of capturing one possibly-undefined value.
      const getLocaleService = () => {
        try {
          if (locale) return locale;
          const current = ctx.get("locale");
          if (current) locale = current;
          return current || null;
        } catch {
          return null;
        }
      };
      let dictionariesRegistered = false;
      const ensureDictionaries = () => {
        if (dictionariesRegistered) return;
        const service = getLocaleService();
        if (!service || typeof service.register !== "function") return;
        try {
          ctx.effect(() => service.register(NS, { zh: ZH, en: EN }), "archive-ext: dictionaries");
          dictionariesRegistered = true;
        } catch {
          /* fall back to the built-in dictionaries below */
        }
      };
      let boundTranslate = null;
      const getBoundTranslate = () => {
        if (boundTranslate) return boundTranslate;
        const service = getLocaleService();
        if (!service || typeof service.bind !== "function") return null;
        try {
          const candidate = service.bind(NS);
          if (typeof candidate === "function") boundTranslate = candidate;
        } catch {
          boundTranslate = null;
        }
        return boundTranslate;
      };
      const t = (key, vars) => {
        let value;
        const bound = getBoundTranslate();
        if (bound) {
          try {
            value = bound(key, vars);
          } catch {
            value = undefined;
          }
        }
        if (value === undefined || value === key) value = ZH[key] === undefined ? key : ZH[key];
        return formatMessage(value, vars);
      };
      let localeRetryTimer;
      let localeRetryAttempts = 0;
      const retryLocale = () => {
        localeRetryTimer = undefined;
        ensureDictionaries();
        if (dictionariesRegistered && getBoundTranslate()) return;
        if (localeRetryAttempts >= 8) return;
        localeRetryAttempts += 1;
        try {
          localeRetryTimer = setTimeout(retryLocale, 250);
        } catch {
          /* timers unavailable: the built-in dictionary remains */
        }
      };
      ensureDictionaries();
      retryLocale();
      ctx.effect(() => () => {
        if (localeRetryTimer !== undefined) clearTimeout(localeRetryTimer);
        localeRetryTimer = undefined;
      }, "archive-ext: locale retry timer");

      const ghostStore = createStore([]);
      const noticeStore = createStore(null);
      let sidebarDesired = false;
      try {
        sidebarDesired = window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
      } catch {
        sidebarDesired = false;
      }
      const sidebarEnabledStore = createStore(sidebarDesired);
      const sidebarSupportedStore = createStore(false);
      let sidebarSlotReady = false;
      let sidebarDisposers = null;
      let noticeTimer;
      const showNotice = (message) => {
        noticeStore.set({ message: String(message) });
        if (noticeTimer !== undefined) clearTimeout(noticeTimer);
        noticeTimer = setTimeout(() => {
          noticeStore.set(null);
          noticeTimer = undefined;
        }, 4000);
      };
      ctx.effect(() => () => {
        if (noticeTimer !== undefined) clearTimeout(noticeTimer);
        noticeTimer = undefined;
      }, "archive-ext: notice timer");

      const refreshGhosts = async () => {
        try {
          const result = await remote.state();
          if (result && result.ok && Array.isArray(result.value && result.value.ghostIds)) {
            ghostStore.set(result.value.ghostIds);
          } else {
            ghostStore.set([]);
          }
        } catch {
          ghostStore.set([]);
        }
      };

      const refreshSessions = () => {
        try {
          const sessions = ctx.get("sessions");
          if (sessions && typeof sessions.refresh === "function") sessions.refresh();
        } catch {
          /* non-fatal */
        }
      };

      const runOpen = async (invoke, sessionId) => {
        try {
          const result = await invoke({ sessionId });
          if (!result || !result.ok) {
            showNotice(t("toast.openFailed", { message: errorMessage(result && result.error, t) }));
          }
        } catch (caught) {
          showNotice(
            t("toast.openFailed", {
              message: errorMessage(
                { code: "unknown", message: String(caught && caught.message ? caught.message : caught) },
                t,
              ),
            }),
          );
        }
      };
      const callRemoteOpen = (method, sessionId) => {
        const invoke = remote && typeof remote[method] === "function" ? remote[method].bind(remote) : null;
        if (!invoke) {
          showNotice(
            t("toast.openFailed", {
              message: errorMessage({ code: "unknown", message: `${method} is unavailable` }, t),
            }),
          );
          return;
        }
        void runOpen(invoke, sessionId);
      };
      const openWorkspaceFolder = (sessionId) => callRemoteOpen("open", sessionId);
      const openSessionFolder = (sessionId) => callRemoteOpen("openSessionStorage", sessionId);

      const getLayout = () => {
        try {
          return ctx.get("layout");
        } catch {
          return null;
        }
      };
      const surfaceInjected = () => ({
        t,
        remote,
        ghostStore,
        refreshGhosts,
        refreshSessions,
        sidebarEnabledStore,
        sidebarSupportedStore,
        setSidebarEnabled,
      });

      let setSidebarEnabled;
      const disposeSidebar = () => {
        const layout = getLayout();
        try {
          if (
            layout &&
            layout.panelInfo &&
            typeof layout.panelInfo.getSnapshot === "function" &&
            layout.panelInfo.getSnapshot().activePanelId === SIDEBAR_PANEL_ID
          ) {
            layout.selectPanel(null);
          }
        } catch {
          /* the panel may already be gone */
        }
        const stop = sidebarDisposers;
        sidebarDisposers = null;
        if (typeof stop === "function") stop();
      };

      const registerSidebar = () => {
        if (sidebarDisposers) return;
        let offPanel;
        let offRow;
        try {
          offPanel = ctx.slots.register(
            {
              name: "main",
              key: SIDEBAR_PANEL_ID,
              locale: NS,
              inject: surfaceInjected,
            },
            ArchiveSidebarPanel,
          );
          offRow = ctx.slots.register(
            {
              name: "sidebar.panellist",
              id: SIDEBAR_PANEL_ID,
              order: 2,
              label: () => t("settings.nav"),
              locale: NS,
            },
            (owner) => h(IconArchive, { size: (owner && owner.size) || 16 }),
          );
        } catch (error) {
          if (typeof offRow === "function") offRow();
          if (typeof offPanel === "function") offPanel();
          throw error;
        }
        sidebarDisposers = () => {
          if (typeof offRow === "function") offRow();
          if (typeof offPanel === "function") offPanel();
        };
      };

      const syncSidebar = () => {
        sidebarSupportedStore.set(sidebarSlotReady);
        sidebarEnabledStore.set(sidebarDesired);
        if (!sidebarSlotReady) return;
        try {
          if (sidebarDesired) registerSidebar();
          else disposeSidebar();
        } catch (error) {
          console.warn("[archive-ext] sidebar panel registration failed", error);
        }
      };

      setSidebarEnabled = (next) => {
        sidebarDesired = Boolean(next);
        try {
          window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarDesired ? "true" : "false");
        } catch {
          /* localStorage may be unavailable */
        }
        syncSidebar();
      };

      ctx.slots.inject("sidebar.workspaces.session.menu.item", function* () {
        yield ctx.slots.register(
          {
            name: "sidebar.workspaces.session.menu.item",
            id: "archive-ext.open-workspace-folder",
            order: 430,
            inject: () => ({ t, openWorkspaceFolder }),
          },
          OpenWorkspaceFolderMenuItem,
        );
        yield ctx.slots.register(
          {
            name: "sidebar.workspaces.session.menu.item",
            id: "archive-ext.open-session-folder",
            order: 440,
            inject: () => ({ t, openSessionFolder }),
          },
          OpenSessionFolderMenuItem,
        );
      });

      ctx.slots.inject("sidebar.panellist", () => {
        sidebarSlotReady = true;
        if (sidebarDisposers) {
          const stop = sidebarDisposers;
          sidebarDisposers = null;
          stop();
        }
        syncSidebar();
      });

      ctx.slots.inject("settings.section", () =>
        ctx.slots.register(
          {
            name: "settings.section",
            id: "archive-ext",
            order: 50,
            label: () => t("settings.nav"),
            locale: NS,
            inject: surfaceInjected,
          },
          ArchiveSettingsSection,
        ),
      );

      try {
        installSettingsNavIcon(ctx, () => t("settings.nav"));
      } catch (error) {
        navIconWarn(
          "[archive-ext] settings nav icon setup failed; using the default settings icon",
          error,
        );
      }

      ctx.slots.inject("sidebar.footer.action", () =>
        ctx.slots.register(
          {
            name: "sidebar.footer.action",
            id: "archive-ext.toast",
            order: 600,
            inject: () => ({ noticeStore }),
          },
          ArchiveToast,
        ),
      );
    }

    exports.apply = apply;
    exports.inject = ["slots", "remote"];
    exports.CLIENT_REMOTE = CLIENT_REMOTE;
    // Exposed for test/nav-icon.test.mjs: the enhancement is DOM-only and its
    // failure paths must stay reachable from a test harness.
    exports.CLIENT_NAV_ICON = {
      installSettingsNavIcon,
      isOwnNavRow,
      navIconCss,
      navIconMaskSvg,
      navIconMaskUrl,
      NAV_ICON_MARKER,
      NAV_ICON_SELECTOR,
      NAV_ICON_SIZE,
    };
    return module.exports;
  },
});
