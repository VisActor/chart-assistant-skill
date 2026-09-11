# Chart Assistant Skill

将图表助手安装到自己的 AI Agent，使用自然语言生成、编辑和校验图表助手 DSL；具备飞书工具和授权时，还可将图表卡片交付到飞书文档。

## 安装

在终端运行（需要 Node.js/npm）：

```bash
npx skills add VisActor/chart-assistant-skill --skill chart-assistant
```

按提示选择目标 Agent 和安装范围。此命令通过 [Skills CLI](https://github.com/vercel-labs/skills) 安装，不需要分别下载各平台的包。

安装前查看仓库中的 Skill：

```bash
npx skills add VisActor/chart-assistant-skill --list
```

## 使用示例

安装后，在 Agent 中描述数据和需求，例如：

> 使用图表助手，将以下数据生成季度营收柱状图，输出图表助手配置：Q1 120、Q2 150、Q3 135、Q4 180，单位万元。

> 使用图表助手，将这份数据生成图表卡片并插入我指定的飞书文档。

## 能力与接入条件

- **生成和校验配置**：Skill 提供图表助手 DSL、模板、样式、标注、数据来源与同步规则，以及完整示例。
- **写入飞书文档**：Agent 需要具备对应的飞书文档工具及授权，目标环境需要安装并启用图表助手应用；具体步骤见 [飞书图表卡片接入](references/feishu-doc-card.md)。
- **渲染和交互**：由图表助手产品运行时提供。本仓库不包含独立图表渲染器；安装 Skill 不会自动配置飞书连接或授予权限。
- **能力不足时**：Agent 可以交付配置或请求计划；实际写入成功需通过回读确认。

## 仓库内容

- [SKILL.md](SKILL.md)：Agent 入口与执行规则。
- `references/`：按需读取的协议和能力说明。
- `examples/`：图表配置与交付示例。
- `scripts/common-option-validation.mjs`：配置校验模块。
- `agents/openai.yaml`：Agent 展示元数据。

本仓库只包含独立 Skill 的交付文件，不包含编辑器源码、开发评测集或开发环境依赖。
