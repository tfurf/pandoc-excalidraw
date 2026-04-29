let domReady = false;

function setGlobal(name: string, value: unknown): void {
  const g = globalThis as Record<string, unknown>;
  const desc = Object.getOwnPropertyDescriptor(globalThis, name);

  if (!desc || desc.writable) {
    g[name] = value;
    return;
  }

  if (desc.configurable) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  }
}

function setupDom(): void {
  if (domReady) return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { JSDOM } = require('jsdom') as typeof import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    pretendToBeVisual: true,
  });
  const win = dom.window;
  setGlobal('window', win);
  setGlobal('document', win.document);
  setGlobal('navigator', win.navigator);
  setGlobal('HTMLElement', win.HTMLElement);
  setGlobal('SVGElement', win.SVGElement);
  setGlobal('Element', win.Element);
  setGlobal('Blob', (win as unknown as Record<string, unknown>)['Blob']);
  setGlobal('devicePixelRatio', 1);
  setGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(cb, 0));
  setGlobal('cancelAnimationFrame', clearTimeout);
  domReady = true;
}

export async function exportSvg(data: object): Promise<string> {
  setupDom();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { exportToSvg } = require('@excalidraw/utils');
  const svg = await exportToSvg(data as Parameters<typeof exportToSvg>[0]);
  return (svg as SVGSVGElement).outerHTML;
}

export async function exportPng(data: object, scale = 1): Promise<Buffer> {
  const svgStr = await exportSvg(data);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resvg } = require('@resvg/resvg-js');
  const resvg = new Resvg(svgStr, { fitTo: { mode: 'zoom', value: scale } });
  return Buffer.from(resvg.render().asPng());
}
