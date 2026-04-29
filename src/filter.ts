import fs from 'fs';
import path from 'path';
import { stdio } from 'pandoc-filter';
import { exportSvg, exportPng } from './render';
import { selectElements, computeBbox, applyPadding } from './select';
import type { ExcalidrawData, SelectOptions, BBox } from './select';

type Attr = [string, string[], [string, string][]];
type Target = [string, string];
export type ImageNode = { t: 'Image'; c: [Attr, unknown[], Target] };

const HTML_FORMATS = new Set([
  'html', 'html4', 'html5', 'revealjs', 'slideous', 'slidy', 's5', 'dzslides',
]);

function baseFormat(format: string): string {
  return format.trim().toLowerCase().split(/[+-]/, 1)[0];
}

function parseArea(value: string): BBox {
  const parts = value.split(',').map(s => parseFloat(s.trim()));
  if (parts.length !== 4 || parts.some(isNaN)) {
    throw new Error(`Invalid ex-area "${value}": expected "x,y,width,height"`);
  }
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}

function selectorFingerprint(options: SelectOptions): string {
  if (options.ids && options.ids.length > 0) {
    return `ids-${[...options.ids].sort().join('-')}`;
  }
  if (options.frameId) return `frame-${options.frameId}`;
  if (options.area) {
    const { x, y, width, height } = options.area;
    return `area-${x}-${y}-${width}-${height}`;
  }
  return 'full';
}

export async function processImage(
  node: ImageNode,
  format: string,
): Promise<ImageNode> {
  const [attr, caption, target] = node.c;
  const [url, title] = target;

  if (!url.endsWith('.excalidraw')) return node;

  const kvpairs = attr[2] ?? [];
  const kv = Object.fromEntries(kvpairs);

  const options: SelectOptions = {};
  if (kv['ex-ids']) options.ids = kv['ex-ids'].split(',').map((s: string) => s.trim());
  if (kv['ex-frame']) options.frameId = kv['ex-frame'];
  if (kv['ex-area']) options.area = parseArea(kv['ex-area']);

  const pad = kv['ex-pad'] ? parseFloat(kv['ex-pad']) : 0;
  const scale = kv['ex-scale'] ? parseFloat(kv['ex-scale']) : 1;

  const sourcePath = path.resolve(url);
  const raw = fs.readFileSync(sourcePath, 'utf8');
  const data: ExcalidrawData = JSON.parse(raw) as ExcalidrawData;

  let elements = selectElements(data.elements, options);

  if (pad > 0 && (options.ids ?? options.frameId ?? options.area)) {
    const bbox = computeBbox(elements);
    const paddedBbox = applyPadding(bbox, pad);
    data.appState = {
      ...data.appState,
      scrollX: -paddedBbox.x,
      scrollY: -paddedBbox.y,
    };
  }

  const exportData: ExcalidrawData = { ...data, elements };

  const fingerprint = selectorFingerprint(options);
  const base = sourcePath.replace(/\.excalidraw$/, '');
  const suffix = fingerprint === 'full' ? '' : `--${fingerprint}`;

  let outUrl: string;
  if (HTML_FORMATS.has(baseFormat(format))) {
    const outPath = `${base}${suffix}.svg`;
    const svg = await exportSvg(exportData);
    fs.writeFileSync(outPath, svg);
    outUrl = path.relative(process.cwd(), outPath);
  } else {
    const outPath = `${base}${suffix}.png`;
    const png = await exportPng(exportData, scale);
    fs.writeFileSync(outPath, png);
    outUrl = path.relative(process.cwd(), outPath);
  }

  const newKv = kvpairs.filter(([k]) => !k.startsWith('ex-'));
  const newAttr: Attr = [attr[0], attr[1], newKv];
  return { t: 'Image', c: [newAttr, caption, [outUrl, title]] };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function action(node: any, format: string): Promise<any> {
  if (node.t === 'Image') {
    return processImage(node as ImageNode, format);
  }
}

if (require.main === module) {
  stdio(action);
}
