export interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  frameId?: string | null;
  boundElements?: Array<{ id: string; type: string }> | null;
  startBinding?: { elementId: string; focus: number; gap: number } | null;
  endBinding?: { elementId: string; focus: number; gap: number } | null;
  [key: string]: unknown;
}

export interface ExcalidrawData {
  type: string;
  version: number;
  elements: ExcalidrawElement[];
  appState: Record<string, unknown>;
  files?: Record<string, unknown>;
}

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectOptions {
  ids?: string[];
  frameId?: string;
  area?: BBox;
}

export function computeBbox(elements: ExcalidrawElement[]): BBox {
  if (elements.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function applyPadding(bbox: BBox, pad: number): BBox {
  return {
    x: bbox.x - pad,
    y: bbox.y - pad,
    width: bbox.width + pad * 2,
    height: bbox.height + pad * 2,
  };
}

export function selectElements(
  elements: ExcalidrawElement[],
  options: SelectOptions,
): ExcalidrawElement[] {
  if (options.ids && options.ids.length > 0) {
    return selectByIds(elements, options.ids);
  }
  if (options.frameId) {
    return selectByFrame(elements, options.frameId);
  }
  if (options.area) {
    return selectByArea(elements, options.area);
  }
  return elements;
}

function selectByIds(
  elements: ExcalidrawElement[],
  ids: string[],
): ExcalidrawElement[] {
  const idSet = new Set(ids);
  const resultIds = new Set<string>(ids);

  // Pull in bound elements (e.g. arrows attached to a selected shape)
  for (const el of elements) {
    if (!idSet.has(el.id)) continue;
    if (el.boundElements) {
      for (const bound of el.boundElements) {
        resultIds.add(bound.id);
      }
    }
  }

  // For arrows now in the result set, include their endpoint shapes
  for (const el of elements) {
    if (!resultIds.has(el.id)) continue;
    if (el.startBinding?.elementId) resultIds.add(el.startBinding.elementId);
    if (el.endBinding?.elementId) resultIds.add(el.endBinding.elementId);
  }

  return elements.filter(el => resultIds.has(el.id));
}

function selectByFrame(
  elements: ExcalidrawElement[],
  frameId: string,
): ExcalidrawElement[] {
  const frame = elements.find(el => el.id === frameId && el.type === 'frame');
  if (!frame) return [];
  return elements.filter(el => el.frameId === frameId);
}

function selectByArea(
  elements: ExcalidrawElement[],
  area: BBox,
): ExcalidrawElement[] {
  const areaRight = area.x + area.width;
  const areaBottom = area.y + area.height;
  return elements.filter(el => {
    const elRight = el.x + el.width;
    const elBottom = el.y + el.height;
    return el.x < areaRight && elRight > area.x && el.y < areaBottom && elBottom > area.y;
  });
}
