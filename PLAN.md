# PLAN — `@ancircle-dsh-plugins/dsh-archive-ext`（v1.13）

> 本文件是本项目的**单一事实来源**。需求、范围、接口、边界、测试与验收以本文件为准。
> 后续任何新增需求或修改，先更新本文件（含下方「变更记录」），再修改代码与测试。

## 变更记录

| 版本 | 日期 | 变更 | 影响 |
|---|---|---|---|
| v1.0 | 2026-10-19 | 初始计划：会话菜单打开资源管理器、归档管理页 | 建立架构、文件与验收基线 |
| v1.1 | 2026-10-19 | 包名改为 `@ancircle-dsh-plugins/dsh-archive-ext`；明确第三方插件边界；加入计划同步机制 | 同步修改 bundle id、patch、TYPERT、client id、测试与文档；新增 `PLAN.md` |
| v1.2 | 2026-10-19 | 测试执行方式改为 `node test/core.test.mjs`；工作区成员但无 session summary 的归档记录归入「无效的归档记录」 | 避免沙箱下 `node --test test/` 的子进程限制；让残留记录可被清理 |
| v1.3 | 2026-10-19 | desktop profile 由 Electron 独占，CLI `--dump-config` 不可用；安装验证改为检查 profile `package.json` 的 `dsh.profile.bundles`、依赖项与 `node_modules` 链接 | 记录实际可行的安装验证方式 |
| v1.4 | 2026-10-19 | 删除时若 `sessionPersistence.locate()` 抛错，返回 `locate-unavailable` 并保留归档记录，绝不误判为“日志已不存在” | 防止定位失败时误清归档记录或留下未删日志 |
| v1.5 | 2026-10-19 | 修复“永久删除后侧栏仍显示”：live 会话保留归档条目属预期，但客户端此前静默关闭弹窗；现改为保持弹窗并明确提示“重启后清除”，同时归档集合移除改用注册表 `unarchiveSession()` 串行写入 | 让 live ghost 行为可见、可理解；非 live 删除走官方写入口，确保侧栏刷新 |
| v1.6 | 2026-10-19 | 永久删除改为**始终移除归档记录**（包括 live 会话），不再保留幽灵归档条目、不再要求重启后二次删除；客户端成功后关闭弹窗并显示持久提示“普通会话列表可能在重启前仍显示该 live 会话” | 一次确认即从归档页移除；重启后不再产生“失效会话”残留 |
| v1.7 | 2026-10-19 | live 会话删除后，除移除归档记录外，还从内存 Session store 释放该会话（`session/disposed` → Session Controller `api-session/removed`），让工作区/侧栏会话行也立即消失；删除结果增加 `liveDetached`，释放失败时回退为“重启后消失”提示 | 解决“归档页消失了、工作区还显示且变成未归档”的问题 |
| v1.8 | 2026-10-19 | 真机验收通过：重启 DSH 后，归档管理页删除立即消失，工作区/侧栏会话行同步消失，永久删除无需二次操作 | 功能验收完成；后续改动继续按本计划同步 |
| v1.9 | 2026-10-19 | 将归档管理从侧栏底部按钮/模态框迁移到**设置页 section**；增加「在侧栏显示归档管理」开关，通过官方 `sidebar.panellist` + `main` + `layout.selectPanel` 将它固定到侧栏全局入口（参考 dshmarket 的做法）；移除 footer 归档入口，footer 只保留 toast | 入口位置与插件市场一致；设置可控制侧栏固定；使用 DSH 公开 slot/layout API，不做 DOM 注入 |
| v1.10 | 2026-10-19 | 修复设置页开关不可见：off 状态误用浅色主题下为透明的 `--dsw-alias-border-inverted`；改用 `label-tertiary` 轨道 + 边框/阴影，并增加「已开启/已关闭」状态文案 | 开关可见可点；明确开关位于「设置 → 归档管理」，不在插件详情页 |
| v1.11 | 2026-10-19 | 开关优先使用 DSH ui-primitives 的 `Switch`（宿主插件列表同款，完全使用宿主主题/形状/状态色）；仅在宿主没有该导出时回退到自带开关 | 与内置插件开关无缝一致；随 DSH 升级自动继承样式 |
| v1.12 | 2026-10-19 | 调研桌面「重启」菜单：Electron 主进程应用菜单没有暴露给插件的扩展 API；页面 `location.reload()` 只重载 renderer，不保证新的插件代码生效；原生菜单项只能改 app.asar，更新会被覆盖。未实施，待选择替代方案 | 记录不可行性与 reload 语义，避免误导用户 |
| v1.13 | 2026-10-19 | 用户决定暂不实现桌面重启入口；保留 v1.12 调研结论，等 DSH 上游提供桌面菜单/`app.relaunch` 插件 API 后再接入 | 不做 app.asar 补丁，不增加误导性的 reload 按钮；当前手动退出重开 |

## 目标

在当前工作区从零创建一个独立 DSH 插件：

1. 在**会话行 “…” 菜单**增加「在资源管理器中打开 / Open in Explorer」，打开该会话所属的工作区目录。
2. 在**设置页**增加「归档管理」section，按工作区分组列出已归档会话，支持搜索、取消归档、永久删除；永久删除有二次确认。
3. 设置页内提供「在侧栏显示归档管理」开关；开启后通过官方侧栏全局面板 API 固定一个可点击入口，位置参考第三方插件市场的侧栏入口。

已安装的 `@duke-dsh-plugins/dsh-archive-manager` 是第三方插件，不属于本项目；本插件独立创建，不修改、不依赖、不冒充它。

## 成功标准

- 插件以标准 bundle 安装进 `desktop` profile；DSH 重启后两个入口都出现且可用。
- 第三方插件保持不变，两者互不依赖、可共存。
- 永久删除只删除目标会话的日志目录与归档记录；运行中的智能体会被拒绝；删除失败有可读错误。
- 静态检查、单元测试、client apply 冒烟测试、Typert 清单自检全部通过。
- 安装后 profile 配置中出现 `archive-ext` 行，且不出现该 bundle 的 `skipping profile bundle` 诊断。
- `PLAN.md` 存在，内容与已批准计划一致，并包含变更记录。

## 已确认的决定

- 新建独立插件，包名 `@ancircle-dsh-plugins/dsh-archive-ext`，版本 `0.1.0`，私有包。
- 「在资源管理器中打开」放在 `sidebar.workspaces.session.menu.item`。DSH 0.2.1 的工作区行 “…” 菜单是硬编码的“重命名/删除工作区”，没有公开插槽；不采用 DOM 注入。
- 归档管理入口从 footer 迁移到**设置页 section**：注册 `settings.section`（id `archive-ext`，order 50，label「归档管理」）。DSH 没有设置 section 图标 API，导航使用系统默认齿轮图标。
- 可选侧栏固定入口使用官方 `sidebar.panellist`（列表行）+ `main`（keyed 面板内容）+ `layout.selectPanel(id)`；开关状态保存在浏览器 `localStorage`，开启后侧栏出现归档管理行，点击在主界面渲染归档管理面板，关闭时若当前面板是归档管理则 `selectPanel(null)`。
- 设置页开关优先使用 DSH ui-primitives 的 `Switch`（宿主插件列表同款，props：`checked/onChange/label/disabled/title`），完全继承宿主的主题色、形状与状态色；仅在宿主未导出 `Switch` 时回退到本插件自带开关（可见 token + 状态文案）。不再自绘宿主开关的配色。
- footer 只保留一个不可见的 toast 注册（用于“打开资源管理器失败”等全局提示），不再提供归档管理入口。
- 目标运行时 DSH 0.1.7+（当前安装为 0.2.1-rc.2），优先验证 Windows；打开目录的命令同时覆盖 macOS/Linux。
- 安装后不自行重启 DSH（会终止当前会话），由用户重启并验收。

## 计划同步规则

1. 先改计划：在 `PLAN.md` 更新受影响的章节并在变更记录追加一行。
2. 再改代码：实现严格按更新后的计划执行；设计偏离必须先回写计划。
3. 同步测试与验收：新增行为必须同时新增/更新自动化测试与人工验收项。
4. 变更分级：
   - 小改动（文案、样式、交互细节、错误提示）：更新计划后直接实现。
   - 中改动（新增菜单项、页面操作、Host 方法参数、错误码、安装方式）：更新计划，实现前明确告知差异。
   - 架构/接口级改动（包名、Remote 命名空间、slot 选择、存储模型、依赖策略）：更新计划后重新走计划评审。
5. 每次交付列出「本次相对计划的变更」，确认计划、代码、测试、验收四项一致。

## 文件结构

```
dsh-archive-ext/
├── PLAN.md
├── package.json
├── cordis.patch.yml
├── index.js                 # Host 入口（re-export service）
├── lib/service.js           # ArchiveExtService（TypertRemoteService）
├── lib/core.js              # 纯逻辑：restore/delete/state/open + 可注入依赖
├── typert.host.js           # Typert Host manifest
├── client.js                # Client bundle（UI + Remote 调用）
├── locale/en.json           # 插件元数据（英文）
├── locale/zh.json           # 插件元数据（中文）
├── icon.svg
├── test/core.test.mjs
├── verify-client-apply.mjs
├── verify-typert-manifest.mjs
├── README.md
├── LICENSE
└── .gitignore
```

## 包与元数据

### package.json

- `name: "@ancircle-dsh-plugins/dsh-archive-ext"`，`version: "0.1.0"`，`private: true`，`type: "module"`。
- `main: "index.js"`。
- `exports`：`.`、`./client`、`./typert`、`./cordis.patch.yml`、`./package.json`、`./locale/*.json`、`./icon`。
- `files`：`index.js`、`client.js`、`typert.host.js`、`cordis.patch.yml`、`lib/*.js`、`locale/*.json`、`icon.svg`、`PLAN.md`、`README.md`、`LICENSE`。
- `dsh`：
  ```json
  { "bundle": { "patch": "./cordis.patch.yml" }, "client": { "platform": "web" } }
  ```
- `peerDependencies`：
  - `@deepseek-ai/cordis: "^4.0.1"`
  - `@deepseek-ai/dsh-storage-domain: "^0.1.7-rc.0 || ^0.2.0-rc.1 || ^0.2.1-rc.0"`
  - `@deepseek-ai/dsh-typert-protocol: "^0.1.7-rc.0 || ^0.2.0-rc.1 || ^0.2.1-rc.0"`
- `dependencies`：`zod: "^4.4.3"`。
- `scripts`：`check`、`test`、`verify`。

### cordis.patch.yml

```yaml
- insert:
    - id: archive-ext
      name: '@ancircle-dsh-plugins/dsh-archive-ext'
```

### locale / icon

- `locale/zh.json`、`locale/en.json` 提供 `meta.title`、`meta.description`。
- `icon.svg` 为原始归档盒图形，≤256 KiB，通过 `./icon` 导出。

## Host 半

### lib/core.js（纯逻辑，不导入 `@deepseek-ai/*`）

- `readArchived(services)`：优先 `storageDomain.get("workspace").global.get().archivedSessionIds`，回退 `workspaceRegistry.archivedSessionIds`。
- `writeArchived(services, next)`：读取完整 workspace state，`workspaceRegistry.setState({ ...state, archivedSessionIds: next })`。
- `findHeader(services, sessionId)`：先 `sessionQuery.listSessions()`，再 `sessionPersistence.list()`。
- `pickWorkspacePath(workspaces, sessionId)`：查找 `sessionIds` 包含目标会话的工作区，返回其 `path`。
- `resolveSessionDirectory(services, sessionId)`：工作区路径优先；否则 live session 的 `header.cwd`；再否则持久化 header 的 `cwd`；最后校验目录存在。
- `deletionTarget(locatedPath)`：兼容 0.1.x（目录）与 0.2.x（日志文件）；文件取 `dirname`，已不存在时按扩展名判断。
- `restoreArchivedSession({ sessionId, services })`：校验、检查归档成员、写回、返回结果或 `not-archived` / `write-failed`。
- `deleteArchivedSession({ sessionId, services, fs })`：
  - 必须存在于归档集合；运行中 agent 拒绝；
  - 定位日志目录，`rm(recursive, force, maxRetries:3)` 并验证；
  - 移除归档记录（无论 live 与否；清理失败返回 `archive-cleanup-failed`）；
  - live：移除归档记录后，尝试释放内存 Session store 条目（`session/disposed`），返回 `{ fileRemoved, live: true, liveDetached }`；释放失败时客户端提示普通列表可能在重启前仍显示。
- `ghostSessionIds({ services, existsSync })`：live session 且日志目录不存在 → ghost。
- `buildOpenCommand(platform, path)`：win32 → `explorer.exe`；darwin → `open`；其他桌面 → `xdg-open`。
- `openInExplorer({ sessionId, services, platform, execFile })`：Host 侧解析路径并校验；`execFile` 启动，Windows 退出码 1 视为成功；失败返回 `path-missing` / `path-not-directory` / `launch-failed`。

### lib/service.js

- `ArchiveExtService extends TypertRemoteService`。
- `static inject = ["workspaceRegistry", "storageDomain", "sessionPersistence", "sessionQuery", "sessions", "agents"]`。
- `constructor(ctx) { super(ctx, "archiveExt"); }`。
- `[Service.init]()` 手动标记四个 Remote 方法：`restore`、`delete`、`state`、`open`。
- 方法委托 `lib/core.js`。

### index.js

- re-export `ArchiveExtService` 与 default。

### typert.host.js

- `package: "@ancircle-dsh-plugins/dsh-archive-ext"`，`face: "host"`。
- 四条 invocation：
  - `dsh-archive-ext#archiveExt/restore`
  - `dsh-archive-ext#archiveExt/delete`
  - `dsh-archive-ext#archiveExt/state`
  - `dsh-archive-ext#archiveExt/open`
- 每个 strict codec 同时带 `schema`（zod 实例）与 `create`（memoized 工厂）。
- `model.services[0]`：`key: "archiveExt"`、`exportName: "ArchiveExtService"`，成员与 types 声明。

## Client 半

### 基本约束

- `window.__ModuleLoader__.load({ id: "@ancircle-dsh-plugins/dsh-archive-ext", factory })`。
- `exports.inject = ["slots", "remote"]`。
- `exports.CLIENT_REMOTE` 导出给测试；`package: "dsh-archive-ext"`。
- `apply(ctx)`：`await ctx.remote.$mount(CLIENT_REMOTE)`，`ctx.get("remote.archiveExt")`。
- 注入样式标签（前缀 `ae-`），`ctx.effect` 清理。
- 仅使用 `--dsw-alias-*`、`--dsw-shadow-*`、`--dsw-radius-*` 主题 token。
- 可选 `ctx.get("locale")`：`register("archiveExt", { zh, en })` + `bind`；缺失时使用内置回退字典。

### 共享状态

### 共享状态

- `ghostIds`、`notice`，通过 `useSyncExternalStore` 订阅；notice 自动 4 秒消失。
- 删除确认状态改为每个归档管理 surface 的局部 state，避免设置页与侧栏面板同时挂载时出现两个确认框。

### 会话行菜单项

- 注册 `sidebar.workspaces.session.menu.item`，`id: "archive-ext.open-in-explorer"`，`order: 430`。
- 使用 `useMenuOpenState` 关闭菜单后调用 `remote.open({ sessionId })`。
- 有 `ui.MenuItemButton` 时使用原生菜单行 + 文件夹图标；否则 `button role="menuitem"`。
- 失败写入 notice。
- 不做 DOM 注入、不读取其他插件 DOM。

### 设置页 section

- `ctx.slots.inject('settings.section', ...)` + `ctx.slots.register({ name: 'settings.section', id: 'archive-ext', order: 50, label: () => t('settings.nav'), locale: NS, inject })`。
- 内容复用 `ArchiveManagerSurface`（`surface: 'settings'`）：顶部「在侧栏显示归档管理」开关 + 计数 + 搜索 + 分组列表 + 二次删除确认。
- 开关状态从 `localStorage` 读取，切换时即时注册/注销侧栏入口；`sidebar.panellist` 不存在时开关禁用并提示当前 DSH 不支持。
- 设置 section 的图标使用系统默认齿轮；不复制 dshmarket 的 DOM 换图标 hack。

### 可选侧栏固定入口

- 开启时注册：
  - `main` keyed 插槽，key/id 为 `archive-ext`，渲染 `ArchiveManagerSurface`（`surface: 'panel'`）。
  - `sidebar.panellist` 列表行，id `archive-ext`，order 2（插件市场 order 1 之后），label「归档管理」，图标为归档图标。
- 关闭时注销两个注册；若 `layout.panelInfo.getSnapshot().activePanelId === 'archive-ext'`，先 `layout.selectPanel(null)`。
- 使用 `ctx.get('layout')`/可选 inject；layout 缺失时侧栏入口仍可注册，但关闭时不强制切面板。

### 归档管理 surface

- 数据：`useWorkspaces(s => s.items)`、`archivedSessionIds`、`useSessions(s => s.byId)`、`s.ids`。
- 分组：按工作区；未分组单独一组；无 session summary 的记录进入「无效的归档记录」。
- 搜索：标题、工作区名、`cwd`；搜索时全部展开。
- 行：归档图标、标题、相对时间、`cwd` tooltip；hover/focus 显示「取消归档」「永久删除」。
- 取消归档：`remote.restore({ sessionId })`，失败显示本地化错误。
- 永久删除：打开确认对话框，确认后 `remote.delete({ sessionId })`；成功即从归档页移除并关闭弹窗；live 会话会尝试从内存释放，`liveDetached=true` 时工作区行也立即消失，失败时显示「重启前可能仍显示」；失败留在对话框内。
- 对话框：`role="dialog" aria-modal="true"`，Esc/遮罩/关闭按钮取消，busy 时禁用重复提交。
- 设置页与侧栏面板共用同一套 surface 组件，仅外层容器与头部不同；空状态、ghost 提示、相对时间保持一致。

## Host Remote 接口

| 方法 | 请求 | 成功结果 |
|---|---|---|
| `restore` | `{ sessionId }` | `{ restored: true }` |
| `delete` | `{ sessionId }` | `{ fileRemoved: boolean, live: boolean, liveDetached: boolean }` |
| `state` | 无 | `{ ghostIds: string[] }` |
| `open` | `{ sessionId }` | `{ path: string }` |

失败统一为 `{ ok: false, error: { code, message? } }`。

### 错误码

`invalid-session`、`not-archived`、`agent-running`、`locate-unavailable`、`delete-failed`、`archive-cleanup-failed`、`write-failed`、`path-missing`、`path-not-directory`、`launch-failed`、`state-failed`。

## 测试与验证

### 自动化

1. `node --check index.js client.js typert.host.js lib/core.js`
2. `node test/core.test.mjs`（直接运行，避免沙箱下的子进程限制）：
   - deletionTarget、pickWorkspacePath、resolveSessionDirectory；
   - restore、delete（运行中/非 live/live/无 header/失败）；
   - ghost 检测；
   - open 命令与退出码处理。
3. `node verify-client-apply.mjs`：假 ModuleLoader/React/ctx，断言 `$mount`、四条 descriptors、两个 slot 注册、locale 注册、disposer。
4. `node verify-typert-manifest.mjs`：Host/Client 四条 invocation 对齐、codec 双字段、service key/exportName、patch 包名一致。
5. 计划同步检查：`PLAN.md` 存在、版本与变更记录完整；交付时列出相对计划的差异。

### 安装验证（需批准）

```powershell
npm install --ignore-scripts
dsh plugin --profile desktop add E:\playground\dsh-archive-ext
```

- 安装后只读检查 profile `package.json`、`dsh.profile.bundles`、`node_modules` 链接（desktop profile 由 Electron 独占，CLI `--dump-config` 会拒绝执行）。
- 不自动重启 DSH。

### 人工验收（重启后）

1. 会话行 “…” 菜单出现「在资源管理器中打开」，打开正确工作区目录。
2. 设置页导航出现「归档管理」section；侧栏底部不再有归档管理按钮。
3. 设置页中归档管理按工作区分组、倒序、搜索、折叠正常。
4. 打开「在侧栏显示归档管理」开关后，侧栏全局入口出现「归档管理」行；点击在主界面打开归档管理面板。
5. 关闭开关后侧栏行消失；若当前正打开归档管理面板，主界面回到普通会话。
6. 取消归档后会话回到侧栏，页面中消失。
7. 永久删除先二次确认；取消不删除；确认后日志与归档记录消失。
8. 运行中会话删除被拒绝。
9. live 会话删除后归档页与工作区列表立即移除；重启后无失效归档残留。
10. 空状态与无效归档记录清理正常。
11. 明暗主题正常，无 slot 崩溃；设置页 section 图标为系统默认齿轮（无官方图标 API）。
12. 第三方 `@duke-dsh-plugins/dsh-archive-manager` 不受影响。
13. `PLAN.md` 与实际行为一致。

## 边界与失败模式

- 没有归档 / 全为 ghost：空状态与提示。
- 无效归档记录：单独分组，仅允许删除。
- 运行中 agent：拒绝，不删文件。
- live 但 idle：删除日志并**立即移除归档记录**，再从内存 Session store 释放该会话；成功时工作区/侧栏行也立即消失。若释放失败，仅保留“重启前可能仍显示”的提示，归档记录仍已移除。
- 0.1.x / 0.2.x 日志定位差异：删除整个会话目录。
- Windows 文件锁：`maxRetries: 3`；仍失败则返回错误，不谎报成功。
- Windows Explorer 退出码 1：视为成功。
- 路径含空格/Unicode：`execFile` 直接传 argv。
- 重复点击：busy 禁用按钮。
- locale 缺失：回退字典。
- peer 闸门：版本范围覆盖 0.1.7/0.2.0/0.2.1-rc。
- 面板层级：设置页内容由 settings shell 渲染；侧栏面板由 layout `main` 渲染；删除确认使用 fixed overlay，不依赖 footer 层级。
- 与第三方插件并存：不同 Remote 命名空间与 slot id，不修改其文件。
- 计划漂移：未写入 `PLAN.md` 的行为视为未批准范围。

## 假设与限制

- 工作区行菜单在 DSH 0.2.1 没有插件插槽，因此入口位于会话行菜单。
- 设置 section 没有官方图标 API（dshmarket 通过 DOM 换图标）；本插件使用系统默认齿轮，不做 DOM hack。
- 侧栏固定开关保存在浏览器 `localStorage`（key `dsh-archive-ext.sidebar`），跨重启保留；不跨浏览器同步。
- 归档管理使用设置页 section；可选的侧栏入口使用 layout `main` 面板，不再是独立固定模态框。
- 包名属于用户自有 scope；改 scope 需同步修改所有标识并更新本文件。
- 当前环境无法进行浏览器 DOM/截图验证；可见 UI 由用户重启后验收。
- 安装到 `desktop` profile 需要一次工作区外写入批准；不自动重启 DSH。

## 已暂缓：桌面应用「重启」入口（v1.12 调研，v1.13 决定不做）

- 目标：在桌面应用菜单「应用 → 退出」上方增加「重启」，用于快速加载插件代码。
- 事实：
  - Windows 的应用子菜单由 Electron 主进程 `lib/main.js` 的 `applicationItems()` 生成，原生弹窗通过 `DESKTOP_IPC.windowsMenu` 打开；插件侧没有菜单扩展 API。
  - 主进程已有 `app.relaunch()` 的重启实现，但只用于 Unpackaged 开发模式菜单与崩溃恢复对话框；没有暴露给 Host/Client 插件的 IPC 或服务。
  - Host 插件运行在独立的 Node 子进程，无法访问 Electron `Menu`/`app`；父子控制协议只支持 `update-tasks`、`quit-inspection`、`shutdown`。
  - Renderer 的 `window.dshDesktop` 只暴露 browser/deviceInfo/keyboard/shortcuts/updates，没有 restart。
- 结论：**不做 app.asar 补丁**（DSH 更新会覆盖，且不属于插件机制）。原生「重启」需要 DSH 上游提供桌面菜单/重启 API。
- 页面 `location.reload()` 的实际效果：
  - 会重载 renderer 页面，重建客户端 UI 状态；不会重启 Host 进程。
  - Host 侧插件代码、Typert/bundle 组合、新安装插件不会生效。
  - 客户端 bundle 是否更新取决于 Host 的 client-module graph/revision 与缓存；没有 HMR/recomposition 时不能保证加载到新的 `client.js`。
  - 因此不能把「重新加载页面」宣传成「重启插件」。
- 用户决定（v1.13）：当前 DSH 没有桌面菜单/重启扩展 API，暂不实现；不修改 app.asar，不增加可能误导的「重新加载界面」按钮。以后上游提供 API 时再按本文件调研结论接入。

## 验收标准

- [x] 工作区包含完整可安装的 bundle。
- [x] `PLAN.md` 存在且与批准计划一致，包含变更记录。
- [x] `npm run check`、`npm test`、`npm run verify` 全部通过。
- [x] 安装后 profile 配置包含该 bundle，无兼容性跳过诊断。
- [x] 用户重启后：会话菜单项正常。
- [ ] 设置页出现「归档管理」section，归档管理操作正常。
- [ ] 设置页开关优先使用 DSH 原生 `Switch`，明暗主题下与内置插件列表开关的主题色/形状/状态色一致。
- [ ] 「在侧栏显示归档管理」开关可注册/注销侧栏全局面板入口，并在关闭时离开已打开的面板。
- [x] 运行中拒绝、live 删除一次完成（归档页与工作区列表均消失）、无效记录清理均正常。
- [x] 未修改第三方插件；该插件已由用户自行删除，因此未在本机做共存实测。
- [x] 后续需求变更先更新 `PLAN.md` 再实现。
