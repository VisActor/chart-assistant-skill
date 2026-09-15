# `modelSpec` 完整写入契约

`modelSpec` 是图表内部 VChart model 的持久化增量，不是任意配置袋。已有原生身份可直接复用；没有身份时，受支持的 series/axes/legends 可使用 [业务 target 输入](element-editing.md#0-语义-target只补现有-dsl-的定位)，实例编译后仍保存原结构。

## 1. 组件身份：`id`、`specKey`、`specIndex`

```ts
interface ModelIdentity {
  /** VChart model 的 userId；不是 DOM ID、element ID 或业务字段名。 */
  id: string | number;
  /** 组件在 VChart spec 中的集合键。 */
  specKey: "axes" | "title" | "legends" | "region" | "series" |
           "tooltip" | "crosshair" | "player" | "dataZoom" | "scrollBar" | string;
  /** 该 specKey 对应规范化数组中的零基索引。 */
  specIndex: number;
}
interface IModelSpec extends ModelIdentity {
  /** 对目标组件做深合并的编辑增量。 */
  spec: Record<string, unknown>;
}
```

确定规则：

1. `id` 取目标运行时 model 的 `userId`，通常来自模板/VChart spec 的组件 `id`。
2. `specKey` 取运行时 model 的 `specKey`。例如坐标轴不是 `axis` 而是 `axes`。
3. `specIndex` 取运行时 `getSpecIndex()`，即组件在同一 `specKey` 集合中的零基位置。它不是数据列索引、图例项索引或系列字段序号。
4. 有 `id` 时，默认匹配逻辑严格比较 `id`；ID 不同不会自动按索引命中。只有调用方显式使用“忽略 ID”兼容模式，才回退到 `specKey + specIndex`。
5. `id` 与 `specKey/specIndex` 必须指向同一组件。布局数据使用同一身份；错配可能导致样式不生效或布局关联到另一组件。

常见模板 ID 不是自然语言名称。当前内置模板的确定性公共 ID 包括：`chart_title`、`legend-discrete`、`legend-color`、`region-0`、`axis-left`、`axis-right`、`axis-bottom`、`axis-top`、`axis-angle`、`axis-radius`、`crosshair-0`。纵向直角坐标模板默认 axes 顺序为 `axis-left/specIndex:0`、`axis-bottom/specIndex:1`；横向模板仍是 `axis-left/specIndex:0`、`axis-bottom/specIndex:1`，但两轴的 band/linear 角色互换。不要写 `title`、`x_axis`、`y_axis`、`legend`、`series` 之类猜测 ID。

需要显示轴或轴标题时，父轴的 `spec.visible:true` 与 `title.visible:true` 分别设置；子项可见不会覆盖父轴隐藏。当前横条模板默认隐藏 `axis-bottom` 值轴：需要数值/占比轴时，在 `axis-bottom/specIndex:1` 上显式写 `visible:true`，再配置标题和刻度；左侧仍为分类轴。已有图只改标签格式或局部样式时，保留用户原轴可见性。

series ID 由模板数据对象生成，通用形式为 `series-${runtimeDataId}`，不是业务字段名。对“一个维度列 + 一个指标列”的最小 standard bar，当前标准数据转换会生成唯一 `runtimeDataId = "0"`，因此可验证为 `id:"series-0", specKey:"series", specIndex:0`。只要存在多个维度、多个指标、mapping 重排、双轴、瀑布、风神或导入 spec，就不得外推这个结果，必须物化/readback。

LLM 写入策略：

- 编辑已有 `browserData`：原样保留已有 identity，只改 `spec`。
- 从可信导出 fixture 派生：复用 fixture 的 identity，若改变组件数量/顺序则重新物化。
- 从零创建内置图表：优先输出 `commonOption`，让模板生成真实 model 和 layout；物化后再读取 `browserData` 做二次编辑。
- 已知完整 VChart spec：可使用其中显式组件 `id`，`specIndex` 仍按规范化后的实际数组顺序确定。
- 无法确定真实 `id`：不要猜；受支持路径生成 `{specKey,target,spec}`，不同时写 id/specIndex；不支持的来源或组件明确说明需读取身份。`${specKey}-${specIndex}` 只可作为受控转换器的兼容回退，不是通用生成规则。

## 2. 公共 JSON-safe 子类型

```ts
type TextStyle = {
  fill?: string; stroke?: string; lineWidth?: number;
  background?: string; boundsPadding?: number;
  fontFamily?: string; fontSize?: number; fontWeight?: string;
  fontStyle?: string; direction?: "horizontal"|"vertical";
  textAlign?: "auto"|"start"|"middle"|"center"|"end"|"left"|"right";
  textBaseline?: "auto"|"top"|"middle"|"bottom"|"alphabetic"|"ideographic";
  angle?: number; dx?: number; dy?: number; underline?: number;
};
type LineStyle = { visible?:boolean;stroke?:string;lineWidth?:number;strokeOpacity?:number;lineDash?:number[] };
type MarkTextureType = "circle"|"diamond"|"rect"|"vertical-line"|"horizontal-line"|"bias-lr"|"bias-rl"|"grid";
type FillStyle = LineStyle & {
  fill?:string;fillOpacity?:number;cornerRadius?:number;
  texture?:MarkTextureType|null;textureColor?:string|null;
  textureSize?:number|null;texturePadding?:number|null;
};
type SymbolStyle = FillStyle & {
  symbolType?:"circle"|"square"|"diamond"|"triangle"|"rect"|"star"|"cardioid";size?:number;
};
type FormatConfig<T extends string = string> = {
  prefix?:string;postfix?:string;
  unit?:"none"|"auto"|"CN_K"|"CN_W"|"CN_BW"|"CN_QW"|"CN_Y"|"K"|"M"|"B";
  fixed?:number|"auto";content?:T|T[];contentWrap?:boolean;separator?:boolean;
  dataType?:"digit"|"percent"|"permil";dateFormat?:string;
  contentFormat?:Record<string,{prefix?:string;postfix?:string;unit?:string;fixed?:number|"auto";
    dataType?:string;separator?:boolean}>;
};
```

上述样式对应源码 `elements/types/style.ts` 的 TextStyle、UnFillMarkStyle、FillMarkStyle、SymbolMarkStyle；不把源码的扩展索引签名作为任意属性生成入口。文本 `background` 是背景色，`boundsPadding` 是扩充文本包围盒的数值内边距，`underline` 用 1/0 开关。纹理写入实际填充图元的 `style`（例如 `series.spec.bar.style.texture`），不是 series 根字段；关闭时编辑器会写入四个纹理字段的 `null`，尺寸/间距无有效值时也可能为 `null`。省略表示不覆盖，不能把 `null` 泛化到 fill 等其他公共样式字段；分区面有独立类型，见 [markers.md](markers.md#6-scatter-趋势线与分区)。

额外 VChart 样式键只有在目标宿主已验证时才透传。不要输出函数；保存态 formatter/formatMethod 函数由运行时生成，OpenAPI JSON record 无法安全表达。

## 3. AxisModelSpec

```ts
type AxisModelSpec = ModelIdentity & { specKey:"axes"; spec:{
  orient?:"left"|"top"|"right"|"bottom"|"radius"|"angle";
  type:"linear"|"ordinal"|"band"|"point"|"time"|"log"|"symlog";
  base?:number;linearToBand?:boolean;
  label?:{visible?:boolean;style?:TextStyle;_originStyle?:TextStyle;space?:number;
    containerAlign?:"left"|"right"|"center"|"top"|"bottom"|"middle";flush?:boolean;inside?:boolean;
    autoHide?:boolean;autoRotate?:boolean;autoRotateAngle?:number[];overlapStrategy?:"autoHide"|"autoRotate";
    sampling?:boolean;formatConfig?:FormatConfig;
    styleMap?:Record<string,{visible?:boolean;text?:unknown;style?:TextStyle}|false>};
  title?:{visible?:boolean;position?:"start"|"middle"|"end";space?:number;autoRotate?:boolean;
    angle?:number;text?:string|string[];style?:TextStyle};
  domainLine?:{visible?:boolean;onZero?:boolean;style?:LineStyle};
  tick?:{visible?:boolean;tickCount?:number;inside?:boolean;tickSize?:number;alignWithLabel?:boolean;style?:LineStyle};
  grid?:{visible?:boolean;style?:LineStyle;alignWithLabel?:boolean;smooth?:boolean;
    styleMap?:Record<string,{visible?:boolean;style?:LineStyle}|false>};
  min?:number;max?:number;sampling?:boolean;inverse?:boolean;
  breaks?:{gap?:number|string;scopeType?:"count"|"length";range:[number,number];
    breakSymbol?:{visible?:boolean;style?:LineStyle&{size?:number}}}[];
  showAllGroupLayers?:boolean;trimPadding?:boolean;zero?:boolean;
}};
```

`type` 是当前类型定义中的必填项。修改已有轴时应深合并而非重建。`base` 仅用于 log；`min/max/breaks` 仅用于数值轴；新建柱/条图默认 `zero:true`。

### x 轴多层分组标签

新建图表或整体优化时，x 轴存在多层分组，默认只展示最外层分组标签。在实际 x 轴对应的 `modelSpec[].spec` 中显式设置 `showAllGroupLayers:false`；不能只省略该字段，因为多维模板可能默认设为 `true`。内置纵向直角坐标模板通常对应 `axis-bottom/specIndex:1`，已有图或导入图按实际轴身份修改。

只调整标签显示，保留数据、全部分组字段和 `mappingSpec`，不通过删维度、合并类别或改变图型来隐藏内层标签，也不以 `label.visible:false` 关闭整条轴的标签。用户明确要求展示全部层级时才设 `showAllGroupLayers:true`；局部编辑保留用户原有的层级显示设置。

`title.position/angle/autoRotate` 都是布局覆盖，不是展示轴标题的必填字段。首次创建内置模板时，如果用户只要求显示左轴标题，必须只写 `title.visible/text/style`，省略这些布局字段，让模板和 VChart 决定默认位置。用户明确要求轴标题位于开始、中间或末端时，才生成对应的 `position`。

```json
{"title":{"visible":true,"text":"销售额"}}
```

## 4. Title、Legend、Region、Tooltip、Crosshair

```ts
type RichTitleItem = TextStyle & {text:string;lineHeight?:number|string};
type TitleModelSpec = ModelIdentity & {specKey:"title";spec:{visible?:boolean;
  textType?:"rich";text?:string|RichTitleItem[];subtext?:string;
  textStyle?:TextStyle&{align?:"left"|"right"|"center"};subtextStyle?:TextStyle;
  _initialize_?:boolean;_auto_offset_y?:boolean;offsetY?:number}};
type LegendModelSpec = ModelIdentity & {specKey:"legends";spec:{
  type?:"color"|"size"|"discrete";visible?:boolean;forceLayout?:"none"|"vertical"|"horizontal";
  orient?:"top"|"bottom"|"left"|"right";position?:"start"|"middle"|"end";padding?:number|number[];
  autoPage?:boolean;maxRow?:number;maxCol?:number;
  item?:{
    label?:{style?:TextStyle};background?:{visible?:boolean;style?:{fill?:string;fillOpacity?:number}};
    spaceRow?:number;spaceCol?:number;spaceColumn?:number;boundsPadding?:number;
    shape?:{visible?:boolean;space?:number;style?:{visible?:boolean;symbolType?:string;size?:number;
      fill?:string;fillOpacity?:number}};
    styleMap?:Record<string,{label?:{text?:string|string[];style?:TextStyle};
      shape?:{style?:{visible?:boolean;symbolType?:string;size?:number;fill?:string;fillOpacity?:number}}}|false>;
  };
  title?:{visible?:boolean;text?:string|string[];textStyle?:TextStyle;
    align?:"start"|"middle"|"end"|"left"|"right"|"center"};
  zIndex?:number;reversed?:boolean;inverse?:boolean;
  background?:{visible?:boolean;padding?:number;style?:{fill?:string;fillOpacity?:number;stroke?:string;
    strokeOpacity?:number;lineWidth?:number;cornerRadius?:number}};
  handlerText?:{visible?:boolean;style?:TextStyle};shapeFollowPoint?:boolean}};
type RegionModelSpec = ModelIdentity & {specKey:"region";spec:{stackInverse?:boolean;style?:FillStyle;clip?:boolean}};
type TooltipModelSpec = ModelIdentity & {specKey:"tooltip";spec:{visible?:boolean;mark?:Record<string,unknown>;
  dimension?:Record<string,unknown>;style?:Record<string,unknown>;enterable?:boolean;showDelay?:number;hideDelay?:number}};
type CrosshairModelSpec = ModelIdentity & {specKey:"crosshair";spec:{visible?:boolean;xField?:Record<string,unknown>;
  yField?:Record<string,unknown>;categoryField?:Record<string,unknown>;valueField?:Record<string,unknown>}};
```

Legend 的复合对象随离散/连续图例不同，只写已知意图所需字段。`padding` 的数组顺序为 `[top,right,bottom,left]`，控制图例组件与相邻布局区域的留白；`item.spaceRow/spaceCol` 只控制图例项彼此间距。新建图表需要离散图例时默认使用底部居中图例：`orient:"bottom"`、`position:"middle"`、`padding:[16,0,0,0]`；用户明确指定位置或编辑已有布局时不套用该默认值；左对齐的显式要求仍使用 `position:"start"`。不要用猜测的坐标模拟间距。Crosshair 只修改实际模板生成的方向字段。Tooltip 内容若需要函数格式化，应让运行时生成。

### 普通标题最小配置

下面仅展示旧配置兼容及用户明确要求普通字符串标题时的合法层级，不是新建图表的默认设计示例。所有新图（无论是否说 MBB）默认使用下节 rich 标题和显式字体层级；将 `modelSpec` 合并进 `commonOption.elements[].options.config`，保留已有映射与其他组件配置：

```json
{
  "modelSpec": [
    {
      "id": "chart_title",
      "specKey": "title",
      "specIndex": 0,
      "spec": {
        "visible": true,
        "text": "各年份地区指标构成"
      }
    }
  ]
}
```

错误反例：`options.config = {"title":{"visible":true,"text":"各年份地区指标构成"},"label":{"visible":true}}`。`config.title/config.label` 不在 commonOption 加载白名单中，会被忽略；增加 `visible` 或 `_initialize_` 无法修复错误层级。保存态历史 root-level 兼容字段也不代表 commonOption 的 config 接受同名字段。

普通数值标签应放在对应 series 的 model entry 的 `spec.label` 中，复用实际 `id/specIndex`；多维度、多指标图先物化/readback，不能从标题的固定 ID 推导出固定 series ID。模板默认显示了标签，也不证明 `config.label` 生效。

### MBB 富文本标题

所有新建图表默认使用下面的 rich title 结构，配色可由模型从内置候选池选择，不影响标题规范；不要写 `subtext`。主标题22px、600字重、28px行高；次级说明12px、18px行高；左对齐并继承原生fontFamily。用户指定的主标题原文必须保留，次级说明仅在需要补充时间、范围、指标或单位时填写；已有表达充分时省略次级片段及换行，不编造业务单位。下面展示含必要次级说明时的结构：

```json
{
  "id":"chart_title","specKey":"title","specIndex":0,
  "spec":{
    "visible":true,"textType":"rich",
    "text":[
      {"text":"Q4 销售额达 2,905，较 Q1 增长 196%","fontSize":22,"fontWeight":"600","fill":"#0F172A","lineHeight":28},
      {"text":"\n6 家店铺合计｜季度口径","fontSize":12,"fill":"#64748B","lineHeight":18}
    ],
    "textStyle":{"align":"left"}
  }
}
```

换行符属于 rich `text[]`。`align` 位于 `textStyle`，不是 title spec 根级。当前标题 rich item 没有可点击 URL 字段；不要发明 `href/url/onClick`。

`_initialize_` 是内部模板占位状态。新生成普通或富文本标题只需 `visible:true` 和非空 `text`，省略该字段时运行时会自动派生为 `false`，无需生成 Unicode 转义键。仅有样式、空白文本或未显式开启 `visible:true` 时，不会自动关闭占位状态。已有配置显式传入的值仍被保留：`true` 表示占位标题，浏览态不展示；编辑已有标题时若要将占位内容变成真实标题，应删除旧 `true` 并提供上述字段，或显式改为 `false`。

### 默认字体与轴标题配置

有值轴的新图显式设置轴 `title.visible:true` 和可解释的 `text`；省略新增title.style文字样式覆盖，字体字号继承图表助手主题。单指标使用指标名，多指标同口径可写“数值”，百分比写“占比”；只有已知单位才附加单位。scatter 连续两轴分别解释指标；无轴图型不增加轴。保留模板位置，省略title.position/angle/autoRotate。

轴标题与刻度不重复显示同一单位：标题已带单位时，仅覆盖该轴刻度的单位前后缀，普通标签和 Tooltip 继续使用列格式；字段写法、缩放单位和旧宿主边界见 [轴标题与刻度的单位去重](data-and-formatting.md#轴标题与刻度的单位去重)。

轴标题、刻度 `axes.spec.label`、离散图例项 `legends.spec.item.label`、普通数据标签 `series.spec.label` 或共同 `dataGroupSpec.EDITOR_ALL_DATA_GROUP.label` 默认都省略新增 `fontSize/fontFamily` 等文字样式覆盖，继承图表助手主题，不写固定12px或其他替代字号，也不生成空style。保留必要的visible、内容和formatConfig；用户明确字号时才在对应style设置。深合并已有配置，不因字体继承删除用户样式或强制开启所有标签，不生成猜测series ID；普通label.position/offset不变。

rich主标题及有必要时的次级说明使用本页22/12信息层级；其余组件采用主题字体继承。必须同时核对rich标题、轴标题内容、布局和继承边界，不能只写theme名字后假定完整默认规范已经完成。已有图表编辑及用户明确样式优先，不能为改一处文案重排全图。

### 4.1 `player`、`dataZoom`、`scrollBar`

这三个也是运行时 `ChartComponentKeys`，会获得 component `id/specKey/specIndex` 并进入 `allModelSpec/modelSpec` 保存链路。但当前图表助手没有为它们声明稳定的结构化编辑类型：

- 编辑已有图表时，原样保留其 JSON-safe `spec` 和真实 identity。
- 用户明确要求修改且已有当前组件 spec 时，只对已验证的原生字段做最小深合并。
- 从内置模板零创建时，不主动添加；不能因为 VChart 支持某字段就宣称图表助手编辑面板支持。
- 跨类型转换会把 `dataZoom/scrollBar/player` 视为可能有损的源语义；目标模板没有等价能力时必须警告或拒绝，不静默丢弃。

`indicator`、`brush`、`media` 等未进入公共结构化组件集合；原始 VChartSpec 中可被渲染不等于可写入图表助手 `modelSpec`。

## 5. SeriesModelSpec

```ts
type SeriesModelSpec = ModelIdentity & {specKey:"series";spec:{
  label?:ChartLabel&{overlap?:boolean;smartInvert?:boolean|{interactInvertType:"background"}};
  outsideLabel?:ChartLabel;insiderLabel?:ChartLabel;
  seriesLabel?:{visible?:boolean;position?:"start"|"end"|"both-ends";label?:{
    style?:TextStyle;formatConfig?:FormatConfig<"series"|"CAGR"|"percentage">;space?:boolean;
    styleMap?:Record<string,SeriesLabelItem>}};
  totalLabel?:ChartLabel&{visible?:boolean;
    formatConfig?:FormatConfig<"dimension"|"value"|"percentage"|"incrementalRate">;
    styleMap?:Record<string,LabelItem|false>};
  transformLabel?:ChartLabel;mekkoLabel?:ChartLabel;mekkoLine?:Record<string,unknown>;
  zIndex?:number;type?:"area"|"bar"|"line";_editor_axis_orient?:"left"|"right";
}&SeriesStyle};
```

Label 的完整 discriminated union、position 和 format content 见 [labels.md](labels.md)。`seriesLabel.label.styleMap` 的稳定保存键与图形 ID 不等价，统一按 [Series label 身份规则](labels.md#3-series-label) 复用实际拾取/readback 的 key，不要求 LLM 生成内部身份；totalLabel 优先使用数据 key；一般开关不要猜这些键。

## 6. SeriesStyle 全量字段索引

| 家族 | 可写字段 |
| --- | --- |
| bar | `barWidth`, `barMinHeight`, `barBackground{visible,style}`, `bar{style}`, `barGapInGroup` |
| line | `invalidType`, `line{visible,style.curveType}`, `point{visible,style}` |
| area/radar | line 全部字段 + `area{visible,style.curveType}` |
| waterfall | `bar{style}`, `stackType:'stack'|'group'`, `firstToTotal`, `addLastTotal`, `calculationMode`, `groupBySign` |
| pie | `pie.style{centerOffset,padAngle}`, `innerRadius`, `outerRadius`, `minAngle`, `startAngle`, `endAngle` |
| rose | `rose.style`, `innerRadius`, `outerRadius`, `startAngle`, `endAngle` |
| wordCloud | `word{style,padding}`（style 含 `underline`）, `maskShape`, `wordMask`, `fontSizeRange`, `rotateAngles`, `wordCloudShapeConfig{fillingTimes,fillingRotateAngles}` |
| scatter | `point.style`, `_editor_spec_size`, `size`, `sizeMapping:'area'|'diameter'|'radius'` |
| funnel | `funnel.style`, `transform.style`, `isTransform`, `funnelOrient`, `funnelAlign`, `shape`, `isCone`, `maxSize`, `minSize`, `outerLabel` |
| sankey | `node.style`, `link.style`, `mode`, `direction`, `nodeAlign`, `nodeWidth`, `nodeLayerAdjust` |
| heatmap | `cell.style`, `valueFieldDomain{min,max}` |
| treemap | `splitType`, `gapWidth`, `nodePadding`, `maxDepth`, `minVisibleArea`, `minChildrenVisibleArea`, `drill`, `roam`, `nonLeaf`, `leaf`, `label`, `nonLeafLabel` |
| sunburst | `innerRadius`, `outerRadius`, `startAngle`, `endAngle`, `gap`, `drill`, `sunburst`, `nonLeaf`, `leaf`, `label`, `labelAutoVisible.enable` |
| circlePacking | `layoutPadding`, `drill`, `circlePacking`, `nonLeaf`, `leaf`, `label` |
| mekko | bar 全部字段 + `mekkoLabel`, `mekkoLine{id,visible,style}` |

## 7. 合并与校验

- identity 不变，`spec` 深合并；同一组件最多一项，禁止用局部新数组覆盖整个 `modelSpec`。
- `id` 存在但不匹配时应报错，不静默改用相同 index。
- 更新 series 前同时检查模板能力、实际 series 类型和数据层级。
- `_editor_*`/`_origin*` 字段编辑已有状态时保留；从零只生成这里明确列出的 `_editor_axis_orient`、`_editor_spec_size`。
- JSON record 内禁止函数、`undefined`、循环引用和凭证。
