# PLAN — `@ancircle0/dsh-archive-ext`（v1.25）

> 本文件是本项目的**单一事实来源**。需求、范围、接口、边界、测试与验收以本文件为准。
> 后续任何新增需求或修改，先更新本文件（含下方「变更记录」），再修改代码与测试。

## 变更记录

| 版本 | 日期 | 变更 | 影响 |
|---|---|---|---|
| v1.0 | 2026-10-19 | 初始计划：会话菜单打开资源管理器、归档管理页 | 建立架构、文件与验收基线 |
| v1.1 | 2026-10-19 | 包名确定为 `dsh-archive-ext`；明确第三方插件边界；加入计划同步机制 | 同步修改 bundle id、patch、TYPERT、client id、测试与文档；新增 `PLAN.md` |
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
| v1.14 | 2026-10-19 | 修复设置页「归档管理」导航图标与侧栏不一致：`settings.section` 只投影 `id`/`order`/`label`，没有图标字段。增强为：设置 dialog 挂载后只标记本插件自己的导航行，用 CSS mask 换成与侧栏相同的归档图标（插件市场同款做法）；所有 DOM/样式异常都被捕获并清理标记，回退到 DSH 默认齿轮 | 新增 `installSettingsNavIcon` 与 `test/nav-icon.test.mjs`；不改 DSH 代码、不触碰其他插件/其他 slot；增强失败只影响图标，不影响归档管理其余功能与 DSH 运行 |
| v1.15 | 2026-10-19 | 将「在资源管理器中打开」从会话行 “…” 菜单**移动**到工作区（文件夹行）“…” 菜单的「重命名」上方。DSH 没有工作区菜单插槽（`Rename/Delete workspace` 硬编码在 ui-workspace 的 `Menu` items 里），因此采用与设置图标同类的窄范围 DOM 增强：在 `[role="menu"]` 中出现「重命名 / 删除工作区」两项时，按本插件本地化 label 识别，向「重命名」前插入一行；Host `open` 请求扩展为 `{ sessionId? , workspaceId? }`，按 workspaceId 解析工作区路径。任何异常都捕获并撤销注入；增强不可用时保留原会话行菜单项作为回退（该方案已在 v1.18 移除） | 新增 `resolveWorkspaceDirectory`、`installWorkspaceMenuAction`、`test/workspace-menu.test.mjs`；`open` 请求/错误码（`invalid-workspace`、`workspace-missing`）扩展；不改宿主菜单其他项、不替换 React 子节点 |
| v1.16 | 2026-10-19 | 修复重启后工作区菜单项消失并回退到会话菜单：插件未声明 locale 依赖，`apply` 可能早于 locale 服务/宿主字典注册，旧实现把 `null` 捕获后永久读不到 `workspace` 标签，状态停在 `pending`。改为**懒解析 locale 服务**并短暂重试字典绑定；标签不可用时增加**结构兜底**（恰好两个 menuitem、第二项带宿主 danger class、菜单归属工作区行）；版本号升到 `0.1.1` 以避免按版本缓存 client bundle（该方案已在 v1.18 移除） | 正常重启后工作区菜单项出现并隐藏会话行回退项；只有增强失败/结构不匹配时才回退；新增 pending/结构兜底日志与测试 |
| v1.17 | 2026-10-19 | 工作区菜单识别从「文本/结构严格匹配」放宽为**归属优先**：只要一个不超过 4 项的 `[role="menu"]` 打开时归属到工作区行（activeElement / pointerdown / menuOpen），就视为工作区菜单；不再要求恰好两项、第二项 danger 或标签完全匹配。标签仅在可读时用于把新行插到「重命名」上方，否则插到第一项上方。多个候选菜单同时存在时一律不注入（该方案已在 v1.18 移除） | 避免 DSH 文案或菜单项变化导致入口消失；会话菜单（5+ 项）与无法确定归属的菜单仍不处理；版本号 `0.1.2` |
| v1.18 | 2026-10-19 | 放弃工作区行菜单的 DOM 注入（DSH 无官方插槽、升级易失效），全部改用官方 `sidebar.workspaces.session.menu.item`：会话 “…” 菜单提供两项——**打开工作区文件夹**（当前会话所属工作区目录，沿用 `open({sessionId})`）与**打开会话文件夹**（新增 Host `openSessionStorage({sessionId})`，定位会话日志目录）。移除 `open` 的 workspaceId 分支、工作区菜单注入/回退状态/相关错误码与测试；版本号 `0.1.3` | 入口 100% 基于官方 slot 与 Remote 契约，DSH 升级不再依赖菜单 DOM 结构；会话日志目录的定位复用 `findHeader` + `sessionPersistence.locate` + `deletionTarget` |
| v1.19 | 2026-10-20 | 工程整理：把根目录的 `verify-client-apply.mjs` / `verify-typert-manifest.mjs` 移动到 `test/`，更新脚本入口、相对路径与文档；`npm run verify` 语义不变（契约/apply 冒烟，独立于 `npm test` 的 node:test 单测） | 目录结构更清晰；验证脚本不被 npm 包发布；行为零变化 |
| v1.20 | 2026-10-20 | 死代码与文档清理：移除未使用的旧面板/底部入口 CSS（`ae-overlay`、`ae-panel`、`ae-panel-count`、`ae-body`、`ae-foot*`）与 `footer.label` 文案键；同步 locale `meta.description`、PLAN 历史条目标注、verify 脚本命名/注释；行为不变 | 更少无效样式与文案；文档只描述现有实现 |
| v1.21 | 2026-10-20 | 文档中移除对某个第三方归档插件的名称引用，改为通用的“其他第三方插件”表述；删除对应的共存验收项 | 项目文档不再依赖/指向特定第三方插件 |
| v1.22 | 2026-10-20 | 重构 README 为面向使用者的开源项目文档：简介、功能、兼容性、安装、使用、权限与数据、限制、开发、贡献、许可证；把入口位置、slot 选择、增强回退、验证细节等实现过程留在本文件 | README 不再承担实现记录；PLAN 作为实现与变更的唯一归档 |
| v1.23 | 2026-10-20 | 按当前代码同步 PLAN：新增「方案演进与未采用方案」，明确工作区行没有官方菜单插槽、DOM 注入方案（v1.15–v1.17）为何放弃，以及当前用官方会话菜单承载「打开工作区文件夹」的取舍；修正文档与代码的细节差异（check 命令、constructor、错误码、removeArchivedSession、测试覆盖、安装路径等） | 计划与实现原理一致；后续维护者能理解为什么入口在会话菜单而不是工作区菜单 |
| v1.24 | 2026-10-20 | 包名改为 `@ancircle0/dsh-archive-ext`，匹配已创建的 npm org；同步 package / patch / Typert / client loader / 测试 / README / LICENSE | 单包标识统一；旧名未发布，无迁移负担 |
| v1.25 | 2026-10-20 | 准备 npm 公开发布：移除 `private`，增加 `publishConfig.access=public` 与 repository/homepage/bugs/author/keywords；README 安装章节改为 npm 优先，保留本地目录安装 | 包可 `npm publish`；用户可直接按包名安装 |

## 目标

在当前工作区从零创建一个独立 DSH 插件：

1. 在**会话行 “…” 菜单**（官方 `sidebar.workspaces.session.menu.item`）增加两个入口：①「打开工作区文件夹」打开当前会话所属工作区目录；②「打开会话文件夹」打开该会话日志所在目录。菜单入口不使用 DOM 注入，也不依赖工作区行菜单结构；设置页图标增强是独立的可失败增强。
2. 在**设置页**增加「归档管理」section，按工作区分组列出已归档会话，支持搜索、取消归档、永久删除；永久删除有二次确认。
3. 设置页内提供「在侧栏显示归档管理」开关；开启后通过官方侧栏全局面板 API 固定一个可点击入口，位置参考第三方插件市场的侧栏入口。

本插件独立创建，不修改、不依赖、不冒充其他第三方插件。

## 成功标准

- 插件以标准 bundle 安装进 `desktop` profile；DSH 重启后会话 “…” 菜单的两个入口都出现且可用。
- 不修改、不依赖其他第三方插件。
- 永久删除只删除目标会话的日志目录与归档记录；运行中的智能体会被拒绝；删除失败有可读错误。
- 静态检查、单元测试、client apply 冒烟测试、Typert 清单自检全部通过。
- 安装后 profile 配置中出现 `archive-ext` 行，且不出现该 bundle 的 `skipping profile bundle` 诊断。
- `PLAN.md` 存在，内容与已批准计划一致，并包含变更记录。

## 已确认的决定

- 新建独立插件，包名 `@ancircle0/dsh-archive-ext`，版本 `0.1.3`，公开 npm 包（`publishConfig.access = "public"`）。
- **放弃工作区行菜单的 DOM 注入**（v1.15–v1.17 的 `installWorkspaceMenuAction` / 归属识别 / 回退状态全部移除）：DSH 没有工作区菜单 slot，注入随宿主 DOM 变化易失效。菜单入口全部改用官方 `sidebar.workspaces.session.menu.item`。
- 会话 “…” 菜单新增两个条目（均为官方 slot 条目，使用 `MenuItemButton`）：
  - `archive-ext.open-workspace-folder`，order 430，label「打开工作区文件夹」，图标文件夹；调用 `open({ sessionId })`，由 Host 解析该会话所属工作区目录（工作区路径优先，回退 live/persisted `cwd`）。
  - `archive-ext.open-session-folder`，order 440，label「打开会话文件夹」，图标归档；调用新增 `openSessionStorage({ sessionId })`，打开会话日志所在目录。
- Host `open` 请求恢复为仅 `{ sessionId }`；移除 workspaceId 分支、`resolveWorkspaceDirectory`、错误码 `invalid-workspace` / `workspace-missing`。
- 新增 Host Remote 方法 `openSessionStorage({ sessionId })`：`findHeader` → `sessionPersistence.locate(header)` → `deletionTarget(location.path)` 归一为会话目录 → 目录校验 → Explorer；错误码 `invalid-session`（空/非法 id）、`session-missing`（找不到 header）、`session-locate-unavailable`（构建无法定位日志）、`session-log-missing`（日志路径为空、目录不存在或不是目录）、`launch-failed`。日志不存在时只提示，不回退打开工作区目录。
- 两个会话菜单条目始终显示，不依赖工作区菜单增强状态；保留设置页 section、侧栏固定入口与设置图标增强。
- 归档管理入口从 footer 迁移到**设置页 section**：注册 `settings.section`（id `archive-ext`，order 50，label「归档管理」）。DSH 没有设置 section 图标 API；设置页导航图标通过**可失败、可回退的导航行增强**与侧栏保持一致：只标记本插件自己的那一行，用 CSS mask 绘制同一个归档图标，异常时清理并回退到 DSH 默认齿轮。
- 可选侧栏固定入口使用官方 `sidebar.panellist`（列表行）+ `main`（keyed 面板内容）+ `layout.selectPanel(id)`；开关状态保存在浏览器 `localStorage`，开启后侧栏出现归档管理行，点击在主界面渲染归档管理面板，关闭时若当前面板是归档管理则 `selectPanel(null)`。
- 设置页开关优先使用 DSH ui-primitives 的 `Switch`（宿主插件列表同款，props：`checked/onChange/label/disabled/title`），完全继承宿主的主题色、形状与状态色；仅在宿主未导出 `Switch` 时回退到本插件自带开关（可见 token + 状态文案）。不再自绘宿主开关的配色。
- footer 只保留一个不可见的 toast 注册（用于“打开资源管理器失败”等全局提示），不再提供归档管理入口。
- 目标运行时 DSH 0.1.7+（当前安装为 0.2.1-rc.2），优先验证 Windows；打开目录的命令同时覆盖 macOS/Linux。
- 安装后不自行重启 DSH（会终止当前会话），由用户重启并验收。

## 方案演进与未采用方案

### 1. 工作区行菜单：没有官方插槽（v1.15–v1.17 探索，v1.18 放弃）

- 更早的版本（v1.1–v1.14）：只在会话行 “…” 菜单提供一个「在资源管理器中打开」，打开该会话所属工作区；功能稳定，但位置离工作区较远，也没有单独的会话日志入口。
- 目标：把「在资源管理器中打开」放到工作区（文件夹）行 “…” 菜单的「重命名」上方，位置最自然。
- 事实：DSH 0.2.1 的 `ui-workspace` 把该菜单硬编码为「重命名 / 删除工作区」，没有面向工作区文件夹行 “…” 菜单的官方插槽。检查过的 `sidebar.workspaces.session.menu.item` 是**会话行**菜单，`sidebar.workspaces.session.row.action` 是会话行操作，`sidebar.workspaces.directoryFlow` 是目录流程，都不能替代工作区行 “…” 菜单。
- v1.15：采用窄范围 DOM 注入，按本地化 label 识别「重命名 / 删除工作区」，在「重命名」前插入一行；`open` 增加 `workspaceId` 分支。
- v1.16：重启后入口消失，根因是 locale 晚到，标签解析把 `null` 当永久结果；改为懒解析/短暂重试，并增加结构兜底；版本升到 `0.1.1`。
- v1.17：识别放宽为「归属优先」——1–4 项且打开时归属到工作区行即视为工作区菜单，不再要求固定文案/项数；版本升到 `0.1.2`。
- 放弃原因：
  1. 没有官方契约，`ui-workspace` 改 DOM、文案或菜单项就会失效；
  2. 菜单归属依赖 `activeElement` / `pointerdown` 等启发式，无法稳定证明“这是工作区行菜单”；
  3. 需要维护注入状态、回退状态，以及与官方会话项的互斥，复杂度和回归风险高；
  4. 升级后可能出现“注入项消失、回退项也没出现”的双故障。
- 结论：v1.18 删除 `installWorkspaceMenuAction`、归属识别、回退状态、`workspaceId` 分支、`resolveWorkspaceDirectory`、`invalid-workspace` / `workspace-missing` 及 `test/workspace-menu.test.mjs`。

### 2. 当前方案：官方会话菜单承载两个入口（v1.18–当前）

- 工作区行无法安全添加，但「打开工作区文件夹」仍是需要的功能，因此把两个动作都放到官方 `sidebar.workspaces.session.menu.item`：
  - `archive-ext.open-workspace-folder`（order 430，文件夹图标）→ `open({ sessionId })`；Host 先按工作区成员关系找路径，再回退 live/persisted `cwd`。这就是“在会话上打开工作区文件夹”的取舍：位置不如工作区行自然，但不依赖 DOM。
  - `archive-ext.open-session-folder`（order 440，归档图标）→ `openSessionStorage({ sessionId })`；定位会话日志目录。
- 稳定性来自官方 slot 的 owner props（`sessionId` / `displayTitle`）与 Typert Remote 契约，不依赖菜单 DOM；DSH 改菜单样式或文案不影响入口。
- 两个条目使用 `MenuItemButton`（缺失时回退 `button role="menuitem"`）；order 位于内置 `archive`(400) 与 `session-id`(450) 之间；不使用 `separatorBefore`，避免依赖宿主分组样式。
- 点击时先通过 `useMenuOpenState` 关闭菜单，再调用 Remote；失败写 notice，不静默。
- 日志目录缺失只提示 `session-log-missing`，不回退打开工作区目录，避免打开错误位置。
- 未来若 DSH 提供工作区文件夹行 “…” 菜单的官方插槽，应优先把「打开工作区文件夹」迁回工作区行；当前不保留注入代码或 feature flag，避免死代码和双入口状态。

调用链：

```text
会话菜单项
├─ 打开工作区文件夹 → remote.open({ sessionId })
│    → resolveSessionDirectory：workspace.sessionIds → path
│      否则 live session.header.cwd
│      否则持久化 header.cwd
│    → validateDirectory（绝对路径 / 存在 / 是目录）
│    → launchResolvedDirectory → explorer/open/xdg-open
└─ 打开会话文件夹 → remote.openSessionStorage({ sessionId })
     → findHeader → sessionPersistence.locate(header)
     → deletionTarget(location.path)（0.2.x 取日志文件父目录；0.1.x 已是目录）
     → stat 校验目录 → launchResolvedDirectory
```

### 3. 检查过但未采用的做法

- **保留工作区菜单注入 + 会话菜单回退**：两套入口/状态会产生重复菜单项和回退复杂度；v1.18 已删除。
- **用 `sidebar.workspaces.session.row.action` 承载**：它是会话行的常驻操作，不是工作区文件夹行 “…” 菜单；会把文件夹动作放到每个会话行，UX 不符。
- **用 `sidebar.workspaces.directoryFlow`**：用于目录创建/选择流程，不是工作区行菜单。
- **只保留单一「在资源管理器中打开」**：无法同时满足“打开工作区”和“打开会话日志”两个需求；当前拆成两个语义明确的条目。

### 4. 仍然保留的 DOM 增强

- 设置页导航图标：DSH `settings.section` 没有 icon 字段，只能标记本插件自己的导航行并注入 CSS mask；与菜单入口独立，全程异常捕获并回退默认齿轮。它不承担菜单/路由功能，失败只影响图标。

## 计划同步规则

1. 先改计划：在 `PLAN.md` 更新受影响的章节并在变更记录追加一行。
2. 再改代码：实现严格按更新后的计划执行；设计偏离必须先回写计划。
3. 同步测试与验收：新增行为必须同时新增/更新自动化测试与人工验收项。
4. 变更分级：
   - 小改动（文案、样式、交互细节、错误提示）：更新计划后直接实现。
   - 中改动（新增菜单项、页面操作、Host 方法参数、错误码、安装方式）：更新计划，实现前明确告知差异。
   - 架构/接口级改动（包名、Remote 命名空间、slot 选择、存储模型、依赖策略）：更新计划后重新走计划评审。
5. 每次交付列出「本次相对计划的变更」，确认计划、代码、测试、验收四项一致。

### 文档分工

- `README.md`：面向使用者，只写功能、兼容性、安装、使用、权限/数据、已知限制与开发命令；不写实现过程、设计权衡或历史变更。
- `PLAN.md`：面向维护者，承载设计决策、slot/Remote 契约、实现细节、失败模式、测试与验收、变更记录。

## 文件结构

```
dsh-archive-ext/
├── PLAN.md
├── package.json
├── package-lock.json
├── cordis.patch.yml
├── index.js                 # Host 入口（re-export service）
├── lib/service.js           # ArchiveExtService（TypertRemoteService）
├── lib/core.js              # 纯逻辑：restore/delete/state/open/openSessionStorage + 可注入依赖
├── typert.host.js           # Typert Host manifest
├── client.js                # Client bundle（UI + Remote 调用）
├── locale/en.json           # 插件元数据（英文）
├── locale/zh.json           # 插件元数据（中文）
├── icon.svg
├── test/core.test.mjs
├── test/nav-icon.test.mjs   # 设置页导航图标增强 + 异常回退
├── test/verify-client-apply.mjs    # client apply 冒烟/契约
├── test/verify-typert-manifest.mjs # Typert Host/Client 契约自检
├── README.md                # 面向使用者的介绍/安装/使用文档
├── LICENSE
└── .gitignore
```

## 包与元数据

### package.json

- `name: "@ancircle0/dsh-archive-ext"`，`version: "0.1.3"`，`type: "module"`；无 `private`，`publishConfig.access = "public"`。
- 发布元数据：`author`、`repository`、`homepage`、`bugs`、`keywords` 指向 `github.com/ancircle0/dsh-archive-ext`。
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

### 发布

- 版本号与 Git tag 对齐（当前 `0.1.3` / `v0.1.3`）；`npm publish --access public`，`publishConfig` 已声明 public。
- README 安装命令以 npm 包名为主，保留本地目录安装供开发。
- DSH 插件管理没有自动升级操作；升级需要卸载旧版本后再安装新版本。

### cordis.patch.yml

```yaml
- insert:
    - id: archive-ext
      name: '@ancircle0/dsh-archive-ext'
```

### locale / icon

- `locale/zh.json`、`locale/en.json` 提供 `meta.title`、`meta.description`。
- `icon.svg` 为原始归档盒图形，≤256 KiB，通过 `./icon` 导出。

## Host 半

### lib/core.js（纯逻辑，不导入 `@deepseek-ai/*`）

- `readArchived(services)`：优先 `storageDomain.get("workspace").global.get().archivedSessionIds`，回退 `workspaceRegistry.archivedSessionIds`。
- `writeArchived(services, next)`：读取完整 workspace state，`workspaceRegistry.setState({ ...state, archivedSessionIds: next })`。
- `removeArchivedSession(services, sessionId)`：优先 `workspaceRegistry.unarchiveSession(sessionId)`（走注册表串行写入口），旧构建回退为 `readArchived` + `writeArchived` 全量写。
- `findHeader(services, sessionId)`：先 `sessionQuery.listSessions()`，再 `sessionPersistence.list()`。
- `pickWorkspacePath(workspaces, sessionId)`：查找 `sessionIds` 包含目标会话的工作区，返回其 `path`。
- `resolveSessionDirectory(services, sessionId)`：工作区路径优先；否则 live session 的 `header.cwd`；再否则持久化 header 的 `cwd`；最后经 `validateDirectory` 校验绝对路径、存在且为目录；空/非法 id 返回 `invalid-session`，路径不可用返回 `path-missing`，非目录返回 `path-not-directory`。
- `validateDirectory(path, deps)`：供 `resolveSessionDirectory` 使用的绝对路径 + 存在 + 目录校验；会话日志目录在 `resolveSessionStorageDirectory` 内单独校验，以便把失败统一映射为 `session-log-missing`。
- `resolveSessionStorageDirectory(services, sessionId, deps)`：校验 sessionId → `findHeader`（找不到返回 `session-missing`）→ `sessionPersistence.locate(header)`（缺失/抛错返回 `session-locate-unavailable`）→ `deletionTarget(location.path)` 归一为会话日志目录 → 校验目录（路径为空、不存在或不是目录返回 `session-log-missing`）。
- `deletionTarget(locatedPath)`：兼容 0.1.x（目录）与 0.2.x（日志文件）；文件取 `dirname`，已不存在时按扩展名判断。
- `restoreArchivedSession({ sessionId, services })`：校验、检查归档成员、写回、返回结果或 `invalid-session` / `not-archived` / `write-failed`。
- `deleteArchivedSession({ sessionId, services, fs })`：
  - 必须存在于归档集合；运行中 agent 拒绝；
  - 定位日志目录，`rm(recursive, force, maxRetries:3)` 并验证；
  - 移除归档记录（无论 live 与否；清理失败返回 `archive-cleanup-failed`）；
  - live：移除归档记录后，尝试释放内存 Session store 条目（`session/disposed`），返回 `{ fileRemoved, live: true, liveDetached }`；释放失败时客户端提示普通列表可能在重启前仍显示；
  - header 缺失时视为日志已不存在：移除归档记录，返回成功但 `fileRemoved=false`；`locate` 抛错则保留归档记录并返回 `locate-unavailable`；
  - 返回 `invalid-session` / `not-archived` / `agent-running` / `locate-unavailable` / `delete-failed` / `archive-cleanup-failed`。
- `ghostSessionIds({ services, existsSync })`：live session 且日志目录不存在 → ghost。
- `buildOpenCommand(platform, path)`：win32 → `explorer.exe`；darwin → `open`；其他桌面 → `xdg-open`。
- `openInExplorer({ sessionId, services, platform, execFile })`：Host 侧解析会话所属工作区目录并校验；`execFile` 启动，Windows 退出码 1 视为成功；失败返回 `invalid-session` / `path-missing` / `path-not-directory` / `launch-failed`。
- `openSessionStorageInExplorer({ sessionId, services, platform, execFile })`：解析会话日志目录并通过同一 Explorer 启动逻辑打开；失败返回 `invalid-session` / `session-missing` / `session-locate-unavailable` / `session-log-missing` / `launch-failed`。

### lib/service.js

- `ArchiveExtService extends TypertRemoteService`。
- `static inject = ["workspaceRegistry", "storageDomain", "sessionPersistence", "sessionQuery", "sessions", "agents"]`。
- `constructor(ctx, config) { super(ctx, "archiveExt"); }`；`config` 当前未使用，仅保留 DSH 插件构造签名。
- `[Service.init]()` 手动标记五个 Remote 方法：`restore`、`delete`、`state`、`open`、`openSessionStorage`。
- 方法委托 `lib/core.js`。

### index.js

- re-export `ArchiveExtService` 与 default。

### typert.host.js

- `package: "@ancircle0/dsh-archive-ext"`，`face: "host"`。
- 五条 invocation：
  - `dsh-archive-ext#archiveExt/restore`
  - `dsh-archive-ext#archiveExt/delete`
  - `dsh-archive-ext#archiveExt/state`
  - `dsh-archive-ext#archiveExt/open`
  - `dsh-archive-ext#archiveExt/openSessionStorage`
- `open` 与 `openSessionStorage` 的请求均为 `{ sessionId }`；其余 `restore` / `delete` 同。
- 每个 strict codec 同时带 `schema`（zod 实例）与 `create`（memoized 工厂）。
- `model.services[0]`：`key: "archiveExt"`、`exportName: "ArchiveExtService"`，成员与 types 声明（新增 `ArchiveExtOpenSessionStorageRequest` / `ArchiveExtOpenSessionStorageResult`，移除 `WorkspaceId`）。

## Client 半

### 基本约束

- `window.__ModuleLoader__.load({ id: "@ancircle0/dsh-archive-ext", factory })`。
- `exports.inject = ["slots", "remote"]`。
- `exports.CLIENT_REMOTE` 导出给测试；`package: "dsh-archive-ext"`。
- `apply(ctx)`：`await ctx.remote.$mount(CLIENT_REMOTE)`，`ctx.get("remote.archiveExt")`。
- 注入样式标签（前缀 `ae-`），`ctx.effect` 清理。
- 仅使用 `--dsw-alias-*`、`--dsw-shadow-*`、`--dsw-radius-*` 主题 token。
- 可选 `ctx.get("locale")`：**懒解析** locale 服务（`getLocaleService()`），短暂重试 `register("archiveExt", { zh, en })` 与 `bind`；服务/字典晚于 apply 出现也能恢复；始终使用内置回退字典兜底。

### 共享状态

- `ghostIds`、`notice`，通过 `useSyncExternalStore` 订阅；notice 自动 4 秒消失。
- 删除确认状态改为每个归档管理 surface 的局部 state，避免设置页与侧栏面板同时挂载时出现两个确认框。

### 会话行菜单项（官方 slot，两个入口）

- 使用官方 `sidebar.workspaces.session.menu.item` 注册两个条目，均通过 `ui.MenuItemButton`（缺失时回退 `button role="menuitem"`），点击后先用 `useMenuOpenState` 关闭菜单：
  - `archive-ext.open-workspace-folder`，order 430，「打开工作区文件夹」：调用 `remote.open({ sessionId })`，打开该会话所属工作区目录；失败写 notice。
  - `archive-ext.open-session-folder`，order 440，「打开会话文件夹」：调用 `remote.openSessionStorage({ sessionId })`，打开该会话日志目录；失败写 notice。
- 两个条目始终显示，与设置页/侧栏状态无关；不再有工作区菜单 DOM 注入、归属判断或回退状态。
- 图标：工作区文件夹用文件夹图标，会话存储用归档图标。
- 不使用 `MenuItemButton` 的 `separatorBefore` 以免依赖宿主分组样式；order 保证位于内置 `archive`(400) 与 `session-id`(450) 之间。

### 设置页 section

- `ctx.slots.inject('settings.section', ...)` + `ctx.slots.register({ name: 'settings.section', id: 'archive-ext', order: 50, label: () => t('settings.nav'), locale: NS, inject })`。
- 内容复用 `ArchiveManagerSurface`（`surface: 'settings'`）：顶部「在侧栏显示归档管理」开关 + 计数 + 搜索 + 分组列表 + 二次删除确认。
- 开关状态从 `localStorage` 读取，切换时即时注册/注销侧栏入口；`sidebar.panellist` 不存在时开关禁用并提示当前 DSH 不支持。
- 设置 section 的导航图标按「可失败增强」处理：DSH `settings.section` 只投影 `id`/`order`/`label`，没有图标字段。插件在设置 dialog 挂载后，仅按本地化 label 标记自己的导航按钮，注入 `currentColor` + CSS mask 的归档图标（与侧栏 `IconArchive` 同一几何）；MutationObserver 负责 locale 切换后重新匹配。
  - 增强必须是 best-effort：`typeof document` / `body` / `head` / `querySelectorAll` / `MutationObserver` / `queueMicrotask` 逐项检测；`CSS.supports` 判断 mask-image 可用（不可用会退化成实心方块，因此直接回退齿轮）；`ctx.effect` 清理时移除标记与 `<style>`。
  - 任何异常（定位失败、样式注入失败、label 解析抛错、观察回调抛错）都不得冒泡：捕获后立即撤销标记与样式，保持 DSH 默认齿轮图标，插件其余功能不受影响。
  - 不修改 DSH 代码、不替换 React 子节点、不读取其他插件内容；只对本插件自己的导航行加数据属性。
  - 不利用 shell 内置的 `archived-sessions` id 图标映射（会占用/替换未来官方 section 的 id 单元格）。

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
| `openSessionStorage` | `{ sessionId }` | `{ path: string }` |

失败统一为 `{ ok: false, error: { code, message? } }`。

### 错误码

`invalid-session`、`session-missing`、`session-locate-unavailable`、`session-log-missing`、`not-archived`、`agent-running`、`locate-unavailable`、`delete-failed`、`archive-cleanup-failed`、`write-failed`、`path-missing`、`path-not-directory`、`launch-failed`、`state-failed`。

## 测试与验证

### 自动化

1. `node --check index.js && node --check client.js && node --check typert.host.js && node --check lib/core.js && node --check lib/service.js`
2. `node test/core.test.mjs`（直接运行，避免沙箱下的子进程限制）：
   - deletionTarget、pickWorkspacePath、resolveSessionDirectory、validateDirectory；
   - resolveSessionStorageDirectory（0.2.x 文件 / 0.1.x 目录 / invalid session / header 缺失 / 无 locate 函数 / locate 抛错 / 目录缺失）；
   - open / openSessionStorage 命令与 Windows 退出码 1；
   - restore、delete（运行中/非 live/live/无 header/失败）；
   - ghost 检测。
3. `node test/nav-icon.test.mjs`：用 vm 加载 client bundle，覆盖设置页导航图标增强：
   - label 精确匹配（空白/空 label/不匹配）；
   - mask SVG/URL/CSS 与标记属性；
   - 只标记本插件行，locale 变化后重新标记；
   - 清理 disposer 移除标记与 `<style>`；
   - `querySelectorAll`、label thunk、观察回调抛错时全部被捕获并回退，`apply`/cleanup 不抛；
   - 无 document/body、CSS mask 不受支持时保持默认齿轮。
4. `node test/verify-client-apply.mjs`：假 ModuleLoader/React/ctx，断言 `$mount`、五条 descriptors、两个 session menu 注册（id/order）、locale 注册、disposer、settings inject 的 remote，以及两个菜单 inject 提供的打开函数。
5. `node test/verify-typert-manifest.mjs`：Host/Client 五条 invocation 对齐、`open` / `openSessionStorage` 请求 schema、codec 双字段、service key/exportName、patch 包名一致。
6. 计划同步检查：`PLAN.md` 存在、版本与变更记录完整；交付时列出相对计划的差异。

### 安装验证（需批准）

```powershell
npm install --ignore-scripts
dsh plugin --profile desktop add E:\path\to\dsh-archive-ext
```

- 安装后只读检查 profile `package.json`、`dsh.profile.bundles`、`node_modules` 链接（desktop profile 由 Electron 独占，CLI `--dump-config` 会拒绝执行）。
- 不自动重启 DSH。

### 人工验收（重启后）

1. 会话行 “…” 菜单出现「打开工作区文件夹」，点击打开该会话所属工作区目录，菜单正常收起。
2. 会话行 “…” 菜单出现「打开会话文件夹」，点击打开该会话日志目录（不是工作区目录）。
3. 新建/未持久化会话点击会话文件夹项时给出「会话日志尚未生成或已被删除」提示，不误开其他目录。
4. 设置页导航出现「归档管理」section；侧栏底部不再有归档管理按钮。
5. 设置页中归档管理按工作区分组、倒序、搜索、折叠正常。
6. 打开「在侧栏显示归档管理」开关后，侧栏全局入口出现「归档管理」行；点击在主界面打开归档管理面板。
7. 关闭开关后侧栏行消失；若当前正打开归档管理面板，主界面回到普通会话。
8. 取消归档后会话回到侧栏，页面中消失。
9. 永久删除先二次确认；取消不删除；确认后日志与归档记录消失。
10. 运行中会话删除被拒绝。
11. live 会话删除后归档页与工作区列表立即移除；重启后无失效归档残留。
12. 空状态与无效归档记录清理正常。
13. 明暗主题正常，无 slot 崩溃；设置页导航「归档管理」图标与侧栏归档图标一致。
14. 若导航图标增强失败（模拟异常、或 DSH 改了导航结构），设置页回退为 DSH 默认齿轮图标，DSH 不报错、归档管理其余功能正常。
15. `PLAN.md` 与实际行为一致。

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
- locale 缺失/晚到：**懒解析**并短暂重试；仍不可用时使用内置回退字典，不把 `apply` 时的一次性结果当作永久结论。
- peer 闸门：版本范围覆盖 0.1.7/0.2.0/0.2.1-rc。
- 面板层级：设置页内容由 settings shell 渲染；侧栏面板由 layout `main` 渲染；删除确认使用 fixed overlay，不依赖 footer 层级。
- 设置页导航图标增强失败（DOM 结构变化、样式注入失败、label 解析异常、观察回调异常）：捕获并撤销标记/样式，显示 DSH 默认齿轮；不抛错、不重试风暴、不留下半改状态。
- 工作区路径已不存在或不是目录：`open` 返回 `path-missing` / `path-not-directory`，客户端 notice 提示，不启动资源管理器。
- 会话 header 找不到：`session-missing`；构建无法定位日志：`session-locate-unavailable`；日志目录不存在或在定位后被删除：`session-log-missing`；均只提示，不回退打开工作区。
- 与第三方插件并存：不同 Remote 命名空间与 slot id，不修改其文件。
- 计划漂移：未写入 `PLAN.md` 的行为视为未批准范围。

## 假设与限制

- 工作区行 “…” 菜单在 DSH 0.2.1 **没有**官方 slot（ui-workspace 硬编码 `Menu` items）；v1.18 起**不再注入**工作区菜单，避免随宿主 DOM 升级失效。所有入口使用官方 `sidebar.workspaces.session.menu.item`。
- 客户端插件激活顺序不保证：本插件未声明 locale 依赖，`ctx.get("locale")` 可能晚于 apply 出现；因此 locale 必须懒解析/重试，不能缓存 `null`。
- 会话日志目录由 `sessionPersistence.locate(header)` + `deletionTarget()` 推导：0.2.x 返回日志文件（取其目录），0.1.x 返回会话目录；两者都按目录校验。
- 刚创建、尚未持久化的会话可能没有日志目录：点击「打开会话文件夹」会得到 `session-log-missing` 提示，这是预期行为。
- 永久删除不可恢复；只在用户二次确认后执行，且只删除 `sessionPersistence.locate()` 解析出的会话日志目录。
- 插件本身不发起网络请求、不采集遥测；只通过 DSH 服务读写工作区/会话元数据与归档状态，并在用户操作时启动文件管理器或删除指定会话日志目录。
- 设置 section 没有官方图标 API；插件市场/`dsh-better-sidebar`/`dsh-skill-mcp-panel` 都用「标记自己导航行再换图标」的办法。本插件采用同样窄范围做法，并把整个增强包在异常捕获里：失败即回退 DSH 默认齿轮。上游若新增 `icon` 字段，应删除该 DOM 增强。
- 增强只观察 `document.body` 的 childList/characterData，只按本插件本地化 label 匹配 `[role="dialog"] nav button`，不读取/修改其他插件的节点内容。
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
- [ ] 会话 “…” 菜单出现「打开工作区文件夹」，点击打开该会话所属工作区目录。
- [ ] 会话 “…” 菜单出现「打开会话文件夹」，点击打开该会话日志目录；空白/已删日志给出可读提示。
- [ ] 设置页出现「归档管理」section，归档管理操作正常。
- [ ] 设置页导航「归档管理」图标与侧栏归档图标一致（明暗主题）；异常时自动回退 DSH 默认齿轮。
- [ ] 设置页开关优先使用 DSH 原生 `Switch`，明暗主题下与内置插件列表开关的主题色/形状/状态色一致。
- [ ] 「在侧栏显示归档管理」开关可注册/注销侧栏全局面板入口，并在关闭时离开已打开的面板。
- [x] 运行中拒绝、live 删除一次完成（归档页与工作区列表均消失）、无效记录清理均正常。
- [x] 未修改其他第三方插件；未在本机做共存实测。
- [x] 后续需求变更先更新 `PLAN.md` 再实现。
