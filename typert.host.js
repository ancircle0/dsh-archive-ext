/**
 * dsh-archive-ext — Typert Host manifest.
 *
 * Hand-written TYPERT manifest consumed by DSH's typert-loader from the
 * package's `./typert` export. It describes the `archiveExt` Remote service so
 * the browser Client can call `ctx.remote.archiveExt.{restore,delete,state,open,openSessionStorage}`.
 *
 * Strict codecs carry BOTH `schema` (DSH < 0.1.7 reads the zod instance) and
 * `create` (DSH >= 0.1.7 requires a factory). Each version's validator only
 * inspects its own field, so the extra field is ignored everywhere.
 */

import { z } from "zod";

/**
 * Memoize one zod schema behind a `create()`-style factory.
 * @param {() => object} build - constructs the zod schema once.
 * @returns {() => object} the factory.
 */
function lazy(build) {
  let value;
  return () => (value ??= build());
}

const sessionIdSchema = lazy(() => z.string());

const errorSchema = lazy(() =>
  z
    .object({
      code: z.string().readonly(),
      message: z.string().readonly().optional(),
    })
    .readonly(),
);

const sessionRequestSchema = lazy(() =>
  z
    .object({
      sessionId: sessionIdSchema(),
    })
    .readonly(),
);

const restoreResultSchema = lazy(() =>
  z.union([
    z
      .object({
        ok: z.literal(true).readonly(),
        value: z
          .object({
            restored: z.literal(true).readonly(),
          })
          .readonly(),
      })
      .readonly(),
    z
      .object({
        ok: z.literal(false).readonly(),
        error: errorSchema(),
      })
      .readonly(),
  ]),
);

const deleteResultSchema = lazy(() =>
  z.union([
    z
      .object({
        ok: z.literal(true).readonly(),
        value: z
          .object({
            fileRemoved: z.boolean().readonly(),
            live: z.boolean().readonly(),
            liveDetached: z.boolean().readonly(),
          })
          .readonly(),
      })
      .readonly(),
    z
      .object({
        ok: z.literal(false).readonly(),
        error: errorSchema(),
      })
      .readonly(),
  ]),
);

const stateResultSchema = lazy(() =>
  z.union([
    z
      .object({
        ok: z.literal(true).readonly(),
        value: z
          .object({
            ghostIds: z.array(sessionIdSchema()).readonly(),
          })
          .readonly(),
      })
      .readonly(),
    z
      .object({
        ok: z.literal(false).readonly(),
        error: errorSchema(),
      })
      .readonly(),
  ]),
);

const openResultSchema = lazy(() =>
  z.union([
    z
      .object({
        ok: z.literal(true).readonly(),
        value: z
          .object({
            path: z.string().readonly(),
          })
          .readonly(),
      })
      .readonly(),
    z
      .object({
        ok: z.literal(false).readonly(),
        error: errorSchema(),
      })
      .readonly(),
  ]),
);

/**
 * Build a strict codec that satisfies both DSH codec generations.
 * @param {string} typeSymbol - wire type symbol.
 * @param {() => object} factory - memoized schema factory.
 * @returns {object}
 */
function strictCodec(typeSymbol, factory) {
  return {
    mode: "strict",
    typeSymbol,
    schema: factory(),
    create: factory,
  };
}

export const TYPERT = {
  package: "@ancircle-dsh-plugins/dsh-archive-ext",
  face: "host",
  schemas: [],
  invocations: [
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
          codec: strictCodec("dsh-archive-ext#ArchiveExtRestoreRequest", sessionRequestSchema),
        },
      ],
      result: strictCodec("dsh-archive-ext#ArchiveExtRestoreResult", restoreResultSchema),
      sourceLocation: { file: "index.js", line: 1, column: 1 },
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
          codec: strictCodec("dsh-archive-ext#ArchiveExtDeleteRequest", sessionRequestSchema),
        },
      ],
      result: strictCodec("dsh-archive-ext#ArchiveExtDeleteResult", deleteResultSchema),
      sourceLocation: { file: "index.js", line: 1, column: 1 },
    },
    {
      id: "dsh-archive-ext#archiveExt/state",
      service: "archiveExt",
      namespace: "archiveExt",
      method: "state",
      invocation: { kind: "direct" },
      parameters: [],
      result: strictCodec("dsh-archive-ext#ArchiveExtStateResult", stateResultSchema),
      sourceLocation: { file: "index.js", line: 1, column: 1 },
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
          codec: strictCodec("dsh-archive-ext#ArchiveExtOpenRequest", sessionRequestSchema),
        },
      ],
      result: strictCodec("dsh-archive-ext#ArchiveExtOpenResult", openResultSchema),
      sourceLocation: { file: "index.js", line: 1, column: 1 },
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
          codec: strictCodec("dsh-archive-ext#ArchiveExtOpenSessionStorageRequest", sessionRequestSchema),
        },
      ],
      result: strictCodec("dsh-archive-ext#ArchiveExtOpenSessionStorageResult", openResultSchema),
      sourceLocation: { file: "index.js", line: 1, column: 1 },
    },
  ],
  model: {
    services: [
      {
        description:
          "Archive extension service: open a session's workspace or log directory in the file manager, and restore or permanently delete archived sessions.",
        summary: "Archive extension service.",
        tags: [],
        jsDoc:
          "/**\n * Archive extension service: open a workspace directory and manage archived sessions.\n */",
        key: "archiveExt",
        exportName: "ArchiveExtService",
        members: [
          {
            kind: "method",
            name: "restore",
            signature:
              "@Remote('restore') async restore(request: ArchiveExtRestoreRequest): Promise<ArchiveExtRestoreResult>",
            summary: "Remove one session from the archive set so it returns to its workspace.",
            jsDoc:
              "/**\n * Remove one session from the archive set so it returns to its workspace.\n * @param request - target session id.\n * @returns success or a business failure.\n */",
          },
          {
            kind: "method",
            name: "delete",
            signature:
              "@Remote('delete') async delete(request: ArchiveExtDeleteRequest): Promise<ArchiveExtDeleteResult>",
            summary:
              "Permanently delete one archived session's log directory and clear its archive entry.",
            jsDoc:
              "/**\n * Permanently delete one archived session's log directory and clear its archive\n * entry. Refuses sessions whose agent is running; live-but-idle sessions keep\n * their entry (ghost) until restart.\n * @param request - target session id.\n * @returns success or a business failure.\n */",
          },
          {
            kind: "method",
            name: "state",
            signature: "@Remote('state') async state(): Promise<ArchiveExtStateResult>",
            summary: "Report archived sessions that are live in memory but whose logs are gone.",
            jsDoc:
              "/**\n * Report archived sessions that are still live in memory while their log files\n * no longer exist (ghost records the client hides).\n * @returns the ghost session ids.\n */",
          },
          {
            kind: "method",
            name: "open",
            signature:
              "@Remote('open') async open(request: ArchiveExtOpenRequest): Promise<ArchiveExtOpenResult>",
            summary: "Open one session's workspace directory in the system file manager.",
            jsDoc:
              "/**\n * Open one session's workspace directory in the system file manager.\n * @param request - target session id.\n * @returns the opened path or a business failure.\n */",
          },
          {
            kind: "method",
            name: "openSessionStorage",
            signature:
              "@Remote('openSessionStorage') async openSessionStorage(request: ArchiveExtOpenSessionStorageRequest): Promise<ArchiveExtOpenSessionStorageResult>",
            summary: "Open the directory that stores one session's logs in the system file manager.",
            jsDoc:
              "/**\n * Open the directory that stores one session's logs in the system file\n * manager.\n * @param request - target session id.\n * @returns the opened path or a business failure.\n */",
          },
        ],
        types: [
          {
            name: "ArchiveExtRestoreRequest",
            declaration: "export interface ArchiveExtRestoreRequest {\n    readonly sessionId: SessionId;\n}",
          },
          {
            name: "ArchiveExtRestoreResult",
            declaration:
              "export type ArchiveExtRestoreResult = { ok: true; value: { restored: true } } | { ok: false; error: { code: string; message?: string } };",
          },
          {
            name: "ArchiveExtDeleteRequest",
            declaration: "export interface ArchiveExtDeleteRequest {\n    readonly sessionId: SessionId;\n}",
          },
          {
            name: "ArchiveExtDeleteResult",
            declaration:
              "export type ArchiveExtDeleteResult = { ok: true; value: { fileRemoved: boolean; live: boolean; liveDetached: boolean } } | { ok: false; error: { code: string; message?: string } };",
          },
          {
            name: "ArchiveExtStateResult",
            declaration:
              "export type ArchiveExtStateResult = { ok: true; value: { ghostIds: readonly SessionId[] } } | { ok: false; error: { code: string; message?: string } };",
          },
          {
            name: "ArchiveExtOpenRequest",
            declaration:
              "export interface ArchiveExtOpenRequest {\n    readonly sessionId: SessionId;\n}",
          },
          {
            name: "ArchiveExtOpenResult",
            declaration:
              "export type ArchiveExtOpenResult = { ok: true; value: { path: string } } | { ok: false; error: { code: string; message?: string } };",
          },
          {
            name: "ArchiveExtOpenSessionStorageRequest",
            declaration:
              "export interface ArchiveExtOpenSessionStorageRequest {\n    readonly sessionId: SessionId;\n}",
          },
          {
            name: "ArchiveExtOpenSessionStorageResult",
            declaration:
              "export type ArchiveExtOpenSessionStorageResult = { ok: true; value: { path: string } } | { ok: false; error: { code: string; message?: string } };",
          },
          {
            name: "SessionId",
            declaration: "export type SessionId = Branded<'SessionId'>;",
          },
        ],
      },
    ],
    events: [],
    objects: [],
  },
};
