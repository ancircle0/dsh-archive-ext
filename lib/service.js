/**
 * dsh-archive-ext — Host service.
 *
 * The DSH loader treats an exported service class as a plugin: it constructs it
 * with `(ctx, config)` and calls `[Service.init]()`. `TypertRemoteService`
 * publishes the `archiveExt` service and the Typert manifest exposes its
 * methods to the browser Client under the `archiveExt` Remote namespace.
 */

import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { Service } from "@deepseek-ai/cordis";
import {
  deleteArchivedSession,
  ghostSessionIds,
  openInExplorer,
  openSessionStorageInExplorer,
  restoreArchivedSession,
} from "./core.js";

/**
 * Mark one instance method as a Remote export without decorator syntax.
 * Node ESM does not accept the decorator proposal, so drive the same
 * `Remote(name)` decorator manually through a synthetic decorator context.
 * @param {object} instance - live service instance.
 * @param {string} method - public instance method name.
 * @param {string} [exportName] - wire export name; defaults to the method name.
 */
function markRemoteMethod(instance, method, exportName) {
  const decorator = Remote(method, undefined);
  const initializers = [];
  decorator(undefined, {
    kind: "method",
    name: method,
    static: false,
    private: false,
    addInitializer: (fn) => initializers.push(fn),
  });
  for (const fn of initializers) fn.call(instance);
}

/** @typedef {{ ok: true, value: unknown } | { ok: false, error: { code: string, message?: string } }} Result */

export class ArchiveExtService extends TypertRemoteService {
  static inject = [
    "workspaceRegistry",
    "storageDomain",
    "sessionPersistence",
    "sessionQuery",
    "sessions",
    "agents",
  ];

  /**
   * @param {object} ctx - Cordis context.
   * @param {object} config - plugin config (unused).
   */
  constructor(ctx, config) {
    super(ctx, "archiveExt");
  }

  /** Cordis class-plugin initializer: mark the Remote methods before publication. */
  [Service.init]() {
    markRemoteMethod(this, "restore", "restore");
    markRemoteMethod(this, "delete", "delete");
    markRemoteMethod(this, "state", "state");
    markRemoteMethod(this, "open", "open");
    markRemoteMethod(this, "openSessionStorage", "openSessionStorage");
  }

  /** Resolve the service bag consumed by the pure core helpers. */
  services() {
    return {
      workspaceRegistry: this.ctx.get("workspaceRegistry"),
      storageDomain: this.ctx.get("storageDomain"),
      sessionPersistence: this.ctx.get("sessionPersistence"),
      sessionQuery: this.ctx.get("sessionQuery"),
      sessions: this.ctx.get("sessions"),
      agents: this.ctx.get("agents"),
    };
  }

  /**
   * Remove one session from the archive set.
   * @param {{ sessionId?: string }} request - target session.
   * @returns {Promise<Result>}
   */
  async restore(request) {
    return restoreArchivedSession({
      sessionId: request?.sessionId,
      services: this.services(),
    });
  }

  /**
   * Permanently delete one archived session.
   * @param {{ sessionId?: string }} request - target session.
   * @returns {Promise<Result>}
   */
  async delete(request) {
    return deleteArchivedSession({
      sessionId: request?.sessionId,
      services: this.services(),
    });
  }

  /**
   * Report archived sessions that are live in memory but whose logs are gone.
   * @returns {Promise<Result>}
   */
  async state() {
    try {
      const ghostIds = await ghostSessionIds({ services: this.services() });
      return { ok: true, value: { ghostIds } };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: { code: "state-failed", message } };
    }
  }

  /**
   * Open one session's workspace directory in the system file manager.
   * @param {{ sessionId?: string }} request - target session.
   * @returns {Promise<Result>}
   */
  async open(request) {
    return openInExplorer({
      sessionId: request?.sessionId,
      services: this.services(),
    });
  }

  /**
   * Open the directory that stores one session's logs in the system file
   * manager.
   * @param {{ sessionId?: string }} request - target session.
   * @returns {Promise<Result>}
   */
  async openSessionStorage(request) {
    return openSessionStorageInExplorer({
      sessionId: request?.sessionId,
      services: this.services(),
    });
  }
}

export default ArchiveExtService;
