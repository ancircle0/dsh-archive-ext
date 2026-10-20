# dsh-archive-ext

DeepSeek Harness（DSH）Web UI 的独立扩展插件。

> 本项目与第三方插件 `@duke-dsh-plugins/dsh-archive-manager` 无关，不修改也不依赖它；两者可以同时安装。

## 功能

1. **会话菜单：打开工作区文件夹 / 打开会话文件夹**
   - 位于每个会话行 “…” 菜单（官方 `sidebar.workspaces.session.menu.item`），两个条目：
     - 「打开工作区文件夹」：打开该会话所属工作区目录；
     - 「打开会话文件夹」：打开该会话日志所在的目录（`~/.dsh/sessions/.../session-<id>/`）。
   - 不使用 DOM 注入；工作区行 “…” 菜单在 DSH 中没有官方插槽，因此不再向其中添加入口。
   - Windows 使用 `explorer.exe`；macOS 使用 `open`；Linux 使用 `xdg-open`。

2. **归档管理（设置页 section）**
   - 入口位于「设置 → 归档管理」，与第三方插件市场的设置 section 同级；开关就在该 section 顶部，不在「插件管理 → 插件详情」里。
   - 设置页导航的「归档管理」图标与侧栏归档图标一致（DSH 无官方图标 API；异常时自动回退默认齿轮）。
   - 设置页内提供「在侧栏显示归档管理」开关；该开关优先使用 DSH 自带的 `Switch` 组件，与内置插件列表的开关同款主题色与形状。开启后，侧栏全局入口（内置插件入口旁边）出现「归档管理」行，点击在主界面打开归档管理页面。
   - 已归档会话按工作区分组、按更新时间倒序。
   - 支持按标题 / 项目名 / 路径搜索。
   - **取消归档**：会话回到侧栏对应工作区。
   - **永久删除**：删除会话日志目录并移除归档记录，并尝试释放内存中的 live 会话；需要二次确认。
   - 运行中的智能体会被拒绝；日志已不存在的无效归档记录单独分组，可清理。

> **永久删除现在一次完成**：确认后会删除日志、**立即移除归档记录**，并尝试把仍驻留在内存中的会话也释放掉。正常情况下归档页和工作区/侧栏中的会话行都会立刻消失，不需要重启后再删第二次。只有内存释放失败（较老的 DSH 或异常状态）时，会话行才可能保留到重启，插件会显示提示。

## 兼容性

- 目标 DSH：`0.1.7` 及以上（当前验证运行时 `0.2.1-rc.2`）。
- 平台：Windows 优先；macOS / Linux 的打开目录命令同样实现。

## 安装

```bash
# 本地开发：link 到 profile
dsh plugin --profile desktop add /path/to/dsh-archive-ext
```

重启 DeepSeek Harness 后生效（Host 服务、Typert manifest 与 client bundle 都在启动时加载）。

> 桌面版 profile 由 Electron 应用管理；`dsh plugin` 安装后请完全退出并重新启动应用，不要仅刷新页面。安装后可用 profile 的 `package.json` 中 `dsh.profile.bundles` 是否包含本包做只读检查。

卸载：

```bash
dsh plugin --profile desktop remove @ancircle-dsh-plugins/dsh-archive-ext
```

## 入口位置说明

会话行 “…” 菜单是官方 `sidebar.workspaces.session.menu.item` 列表，插件在其中注册两个条目：「打开工作区文件夹」（会话所属工作区）与「打开会话文件夹」（会话日志目录）。两者都通过 Host Remote 打开，不依赖菜单 DOM。

工作区（文件夹）行 “…” 菜单在 DSH 0.2.1 中由 ui-workspace 硬编码为「重命名 / 删除工作区」，没有官方插件插槽；为了避免升级后 DOM 结构变化导致失效，本插件**不再注入**该菜单，工作区目录入口改由会话菜单提供。

归档管理使用官方 **`settings.section`** 注册到设置页；设置页内的「在侧栏显示归档管理」开关通过官方 `sidebar.panellist` + `main` + `layout.selectPanel` 将它固定到侧栏全局入口（位置参考插件市场）。关闭开关时注销该入口。

设置 section 没有官方图标 API。插件会在设置对话框挂载后，只标记自己的那一行导航并换用与侧栏相同的归档图标（与插件市场、`dsh-better-sidebar` 等插件相同的窄范围做法）；该增强全程捕获异常，任何失败都会清理标记/样式并回退到 DSH 默认齿轮图标，不会影响 DSH 运行。

## 开发与验证

```bash
npm install --ignore-scripts
npm run check
npm test           # core + nav-icon
npm run verify     # test/verify-*.mjs
```

- `npm test` 覆盖路径解析、工作区/会话目录解析、会话日志目录解析、会话目录删除、归档恢复、ghost 检测、Explorer 启动逻辑与设置页图标增强。
- `npm run verify` 运行 `test/verify-typert-manifest.mjs` 与 `test/verify-client-apply.mjs`，检查 Typert Host/Client 契约一致性与 client bundle 装配。
- `PLAN.md` 是本项目的单一事实来源；需求变更先更新计划，再改代码与测试。

## 已知限制

- 无浏览器 DOM / 截图自动化验证；界面需在真实 DSH Web UI 中验收。
- 设置 section 没有官方图标 API，导航图标使用「标记自己导航行 + CSS mask」的增强；DSH 若改动设置对话框结构，图标会自动回退为默认齿轮（其余功能不受影响）。
- 工作区行 “…” 菜单没有官方插槽，本插件不再注入；工作区目录入口通过会话行 “…” 菜单的「打开工作区文件夹」提供。
- 「打开会话文件夹」依赖会话日志已持久化；新建/尚未生成日志的会话会提示「会话日志尚未生成或已被删除」。
- 永久删除不可恢复；插件在 UI 中要求二次确认。
- DSH 升级若更改 slot / Typert 契约，本插件可能需要同步适配。
