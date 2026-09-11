// 独立于仓库运行时的结构检查；通过不代表来源可访问或图形已渲染。
export const editableConfigKeys = new Set([
  'mappingSpec', 'modelSpec', 'marker', 'color', 'stackType', 'syncAxisDomain', 'theme',
  'templateVersion', 'dataTransposed', 'transposed', 'dataGroupSpec', 'markStyle',
  'markZIndexRange', 'barLink', 'trendLine', 'partitionArea'
]);
const elementTypes = new Set([
  'chart', 'table', 'text', 'rect', 'oval', 'diamond', 'callout', 'image', 'svg',
  'straightLine', 'elbowLine', 'curveLine', 'chartConnectorLine'
]);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const array = value => value == null ? [] : Array.isArray(value) ? value : [value];
const ordinaryStackTemplates = new Set(['bar', 'area', 'mekko']);

// 只拒绝模板源码可以确定的组合；导入/未知来源及模型覆盖仍需实际运行时判断。
function validateLayerShareContent(options, at) {
  if (!ordinaryStackTemplates.has(options.chartType) || options.data?.type !== 'standard' ||
      options.spec !== undefined || options.sourceType !== undefined) return [];
  const config = object(options.config) ? options.config : {};
  const effective = key => config[key] !== undefined ? config[key] : options[key];
  if (array(effective('modelSpec')).some(model => object(model?.spec) &&
      Object.prototype.hasOwnProperty.call(model.spec, 'percent'))) return [];
  const markerPath = config.marker !== undefined ? `${at}.options.config.marker` : `${at}.options.marker`;
  return array(effective('marker')?.markLine).flatMap((marker, index) => {
    if (marker?.name !== 'hierarchy-diff-line') return [];
    const shares = array(marker.label).flatMap(label => array(label?.formatConfig?.content))
      .filter(content => content === 'layerShareDiff' || content === 'layerShareGrowthRate');
    return shares.length ? [
      `${markerPath}.markLine[${index}]: ${shares.join('/')} requires comparable percent stacks; ` +
      `${options.chartType} is an ordinary stack template. Use ${options.chartType}Percent for a percent chart, ` +
      'or layerValueDiff/layerGrowthRate for raw-value changes.'
    ] : [];
  });
}

const connectorPositions = new Set([
  'top-left', 'top-right', 'bottom-left', 'bottom-right', 'point',
  'outer-start', 'outer-end', 'inner-start', 'inner-end'
]);

function validateConnectorTarget(options, at, elements) {
  const failures = [];
  const target = options.target;
  if ('data' in options || 'points' in options) failures.push(`${at}: target must not coexist with data/points`);
  if (!object(target)) return [...failures, `${at}.target: must contain from/to endpoints`];
  for (const side of ['from', 'to']) {
    const endpoint = target[side];
    const path = `${at}.target.${side}`;
    if (!object(endpoint)) {
      failures.push(`${path}: endpoint must be an object`);
      continue;
    }
    if (!(text(endpoint.chartId) || typeof endpoint.chartId === 'number' && Number.isFinite(endpoint.chartId))) {
      failures.push(`${path}.chartId: requires a non-empty string or finite number`);
    } else if (!elements.some(element => element?.type === 'chart' && element.id === endpoint.chartId)) {
      failures.push(`${path}.chartId: must reference a chart in this canvas`);
    }
    if (!object(endpoint.selector) || !Object.keys(endpoint.selector).length ||
        !Object.values(endpoint.selector).every(value => value === null || typeof value === 'string' ||
          typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value))) {
      failures.push(`${path}.selector: requires non-empty business fields with scalar values`);
    }
    if (endpoint.measure !== undefined && !text(endpoint.measure)) failures.push(`${path}.measure: must be a non-empty field name`);
    const position = endpoint.position;
    if (!connectorPositions.has(position) && !(object(position) && Object.keys(position).length === 1 &&
        Number.isInteger(position.vertex) && position.vertex >= 0)) {
      failures.push(`${path}.position: unsupported semantic anchor`);
    }
  }
  if (options.lineType !== undefined && !['line', 'hv', 'vh'].includes(options.lineType)) {
    failures.push(`${at}.lineType: must be line/hv/vh`);
  }
  if (options.style !== undefined && !object(options.style)) failures.push(`${at}.style: must be an object`);
  if (options.zIndex !== undefined && !Number.isFinite(options.zIndex)) failures.push(`${at}.zIndex: must be finite`);
  return failures;
}

export function validateCommonOption(commonOption, location = 'commonOption') {
  const failures = [];
  if (!Array.isArray(commonOption?.elements) || !commonOption.elements.length) {
    return [`${location}: commonOption.elements must be non-empty`];
  }
  const ids = new Set();
  const source = commonOption.source;
  if (source?.showSource === true) {
    const sourceName = typeof source.sourceName === 'string' ? source.sourceName : source.sourceName?.zh ?? source.sourceName?.en;
    const pageUrl = typeof source.pageUrl === 'string' ? source.pageUrl : source.pageUrl?.zh ?? source.pageUrl?.en;
    if (!text(sourceName) || !text(pageUrl)) failures.push(`${location}.source: visible source requires non-empty sourceName and pageUrl`);
  }
  commonOption.elements.forEach((element, index) => {
    const at = `${location}.elements[${index}]`;
    if (!object(element)) {
      failures.push(`${at}: element must be an object`);
      return;
    }
    if (!elementTypes.has(element.type)) failures.push(`${at}: unsupported element type ${element.type}`);
    if (element.id != null && ids.has(element.id)) failures.push(`${at}: duplicate element id ${element.id}`);
    if (element.id != null) ids.add(element.id);
    const position = element.position;
    if (position !== undefined) {
      if (!object(position) || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(position[key])) || position.width <= 0 || position.height <= 0) {
        failures.push(`${at}: invalid position`);
      }
    } else if (commonOption.elements.length > 1 && !(element.type === 'chartConnectorLine' && object(element.options) && 'target' in element.options)) {
      failures.push(`${at}: multiple elements require explicit positions`);
    }
    if ('rect' in element || 'attribute' in element) failures.push(`${at}: commonOption element must not use rect/attribute`);
    if (['chartType', 'data', 'config'].some(key => key in element)) failures.push(`${at}: chartType/data/config must be nested in options`);
    const options = element.options;
    if (!object(options)) {
      failures.push(`${at}: options must be an object`);
      return;
    }
    if (element.type === 'chart') {
      const modes = [options.spec !== undefined, options.chartType !== undefined || options.data !== undefined, options.sourceType !== undefined];
      if (modes.filter(Boolean).length !== 1) {
        failures.push(`${at}: choose exactly one chart input: spec, chartType+data, or sourceType`);
      } else if (modes[0]) {
        if (!object(options.spec)) failures.push(`${at}: spec must be an object`);
      } else if (modes[1]) {
        if (!text(options.chartType) || !object(options.data)) failures.push(`${at}: built-in chart requires options.chartType and options.data`);
        if (options.chartType === 'vseedDsl') failures.push(`${at}: vseedDsl requires sourceType and vseedDsl`);
      } else if (options.sourceType === 'aeolus') {
        if (!text(options.sourceInfo?.url)) failures.push(`${at}: aeolus requires sourceInfo.url`);
      } else if (options.sourceType === 'vseedDsl') {
        if (!object(options.vseedDsl)) failures.push(`${at}: vseedDsl requires a DSL object`);
      } else {
        failures.push(`${at}: unsupported sourceType ${options.sourceType}`);
      }
    }
    if (element.type === 'chartConnectorLine' && 'target' in options) {
      failures.push(...validateConnectorTarget(options, `${at}.options`, commonOption.elements));
    }
    const config = options.config;
    if (config !== undefined) {
      if (!object(config)) failures.push(`${at}.options.config: must be an object`);
      else Object.keys(config).forEach(key => {
        if (!editableConfigKeys.has(key)) failures.push(`${at}.options.config: unsupported key ${key}`);
      });
    }
    if (element.type === 'chart') failures.push(...validateLayerShareContent(options, at));
  });
  return failures;
}
