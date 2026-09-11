# 内置模板定义：专用图表

## `pie`

- 用途：单个时间切片、少量互斥类别的整体构成。
- 数据：一个分类字段和一个非负数值字段；`category`, `value`。多 value 时只取映射的首个字段。
- 编辑：图例、内/外标签、引导线、内外半径、起止角度、扇区样式、分组/单扇区样式、tooltip。
- 限制：无坐标轴；不支持 seriesLabel/totalLabel/barLink；类别多、值接近或有负值时不使用。
- 示例：`{"category":"渠道","value":"收入"}`。
- MBB：通常不超过 5–6 类；关键扇区主色，其余灰阶；份额直接标注，必要时合并“其他”。

## `rose`

- 用途：极坐标下通过半径比较类别，强调高低差异而非精确份额。
- 数据：`category` + `value`；可有多 value 系列。
- 编辑：极坐标轴、图例、内外标签、扇区半径/角度、stackType、颜色、tooltip。
- 限制：角度与面积会放大感知差异；精确比较优先 bar。无 seriesLabel/totalLabel/barLink。
- 示例：`{"category":"能力项","value":["当前","目标"]}`。
- MBB：只在极坐标结构本身服务结论时用；保持起始角、排序和标签可读。

## `radar`

- 用途：多个同量纲或已标准化维度的画像比较。
- 数据：`category` 指标名，`value` 一个或多个系列；各维度量纲应可比较或先标准化。
- 编辑：雷达轴、网格、图例、线/点/面积、常规标签、颜色、tooltip；stackType 可能由本地模板开放。
- 限制：维度过多、量纲不一致或需要精确读数时不用；不支持 seriesLabel/totalLabel/barLink。
- 示例：`{"category":"能力项","value":["团队A","团队B"]}`。
- MBB：5–8 轴内；轴顺序固定；只高亮一个重点对象，基准使用弱色或轮廓。

## `funnel`

- 用途：有明确顺序的阶段规模与阶段转化。
- 数据：`category` 阶段、`value` 数值；仅使用映射的首个 value。
- 编辑：方向、形状、对齐、尺寸、颜色、常规 label、`outerLabel`；转化漏斗才支持 `transformLabel`；图例和 tooltip。
- 限制：无坐标轴；阶段必须有业务顺序。普通类别排序比较不要用 funnel。
- 示例：`{"category":"阶段","value":"人数"}`。
- MBB：标每阶段值和关键转化率；标题指出最大流失环节；阶段数控制在可扫描范围。

## `gauge`

- 用途：已有仪表盘 spec、VSeed 或风神来源的单指标目标状态。
- 当前边界：本地 `GaugeTemp.getSpec()` 返回空对象、`checkDataEnable()` 恒真，不能仅凭 standard `{value}` 保证生成可用图表。
- 编辑：实际能力取决于已加载 spec，可编辑 gauge track/progress、标签和颜色；无坐标轴、常规图例和普通类型切换。
- 推荐输入：明确的 VChart/VSeed gauge spec、风神 gauge，或经真实运行时保存的 browserData fixture。
- 不适用：需要比较多个对象、展示趋势或精确分布。
- MBB：只显示一个决策指标、目标和差距；目标不明确时改 bullet/bar/数字卡。

## `wordCloud`

- 用途：文本关键词的频次/权重概览。
- 数据：`keyword` 和 `frequency`；未映射时默认第 1/2 列。
- 编辑：词字号范围、旋转、颜色、mask shape、单词样式、tooltip；不支持常规 label、legend 和普通类型切换。
- 限制：不能用于精确排名或细微差异；频次应非负。
- 示例：`{"keyword":"关键词","frequency":"提及次数"}`。
- MBB：咨询报告通常优先排序条形图；若保留词云，只突出少数关键词并附 Top N 表。

## `sankey`

- 用途：来源到去向的流量、迁移或价值链。
- 数据：至少三列；`source`, `target`, `value`。支持单段和多层流向转换。
- 编辑：方向、节点宽度/对齐、节点与边样式、label、图例、tooltip、单节点/边样式。
- 限制：无坐标轴；source/target 关系必须有效，value 应非负；环路或节点过多会失去可读性。
- 示例：`{"source":"来源","target":"去向","value":"流量"}`。
- MBB：只保留关键路径，弱化小流量；颜色优先绑定来源或业务分组；标出最大流失/转移。

## `mekko`

- 用途：分类宽度代表规模、高度代表另一指标或构成的双变量比较。
- 数据：`x` 分类，`y` 一个或多个值，`bandWidth` 宽度指标；未映射时会识别名为 `带宽`/`bandwidth` 的列或使用约定列。
- 编辑：轴、图例、常规 label、seriesLabel、totalLabel、Mekko category label、`mekkoLine`、完整差异 marker、颜色。
- 限制：不支持 growth line；宽度必须非负且有业务意义；同时读面积、宽度和高度认知负担高。
- 示例：`{"x":"市场","y":["份额A","份额B"],"bandWidth":"市场规模"}`。
- MBB：标题解释宽度和高度各代表什么；只突出关键市场；必要时加脚注明积不可直接当第三指标。

## `mekkoPercent`

- 用途：宽度表示规模，高度固定 100% 显示构成。
- 数据：`x`, `y[]`, `bandWidth`；y 应为可求份额的非负值。
- 编辑：seriesLabel、totalLabel、Mekko label、百分比 formatter、完整差异 marker；不使用 growth line，通常不强调 `mekkoLine`。
- 限制：不能直接比较绝对 y；类别或系列过多时不可读。
- 示例：`{"x":"市场","y":["品牌A","品牌B","其他"],"bandWidth":"市场规模"}`。
- MBB：固定构成顺序，主品牌 focus，其他 context；标关键市场份额与市场规模。

## `heatmap`

- 用途：两个离散维度交叉下的数值强弱矩阵。
- 数据：`x`, `y`, `value`。长表三列最清晰；模板也可从宽表重建矩阵。
- 编辑：x/y band 轴、色阶/值域、cell/label、图例、tooltip、单 cell 样式。
- 限制：缺失组合不能静默填 0；value 必须可比较；色阶需说明方向和单位。
- 示例：`{"x":"星期","y":"小时","value":"订单量"}`。
- MBB：使用顺序色表达量级、发散色只用于有明确中点的偏差；标最强/最弱区域，不给每格堆文字。
