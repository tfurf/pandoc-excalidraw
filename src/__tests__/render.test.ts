// Mocks must be declared before imports so Jest can hoist them.

jest.mock('jsdom', () => ({
  JSDOM: jest.fn().mockImplementation(() => ({
    window: {
      document: { createElement: jest.fn() },
      navigator: {},
      HTMLElement: class {},
      SVGElement: class {},
      Element: class {},
      Blob: class {},
    },
  })),
}));

jest.mock('@excalidraw/utils', () => ({ exportToSvg: jest.fn() }), { virtual: true });

jest.mock('@resvg/resvg-js', () => ({ Resvg: jest.fn() }), { virtual: true });

import { exportSvg, exportPng } from '../render';

const SAMPLE_DATA = {
  type: 'excalidraw',
  version: 2,
  elements: [],
  appState: { viewBackgroundColor: '#ffffff' },
};

const SVG_STRING = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';

beforeEach(() => {
  const { exportToSvg } = jest.requireMock('@excalidraw/utils') as { exportToSvg: jest.Mock };
  exportToSvg.mockReturnValue({ outerHTML: SVG_STRING });

  const { Resvg } = jest.requireMock('@resvg/resvg-js') as { Resvg: jest.Mock };
  Resvg.mockImplementation(() => ({
    render: () => ({ asPng: () => new Uint8Array([137, 80, 78, 71]) }),
  }));
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('exportSvg', () => {
  it('returns outerHTML from exportToSvg', async () => {
    const result = await exportSvg(SAMPLE_DATA);
    expect(result).toBe(SVG_STRING);
  });

  it('passes data object to @excalidraw/utils exportToSvg', async () => {
    await exportSvg(SAMPLE_DATA);
    const { exportToSvg } = jest.requireMock('@excalidraw/utils') as { exportToSvg: jest.Mock };
    expect(exportToSvg).toHaveBeenCalledWith(SAMPLE_DATA);
  });
});

describe('exportPng', () => {
  it('returns a Buffer', async () => {
    const result = await exportPng(SAMPLE_DATA);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('passes SVG string and default scale 1 to Resvg', async () => {
    await exportPng(SAMPLE_DATA);
    const { Resvg } = jest.requireMock('@resvg/resvg-js') as { Resvg: jest.Mock };
    expect(Resvg).toHaveBeenCalledWith(SVG_STRING, { fitTo: { mode: 'zoom', value: 1 } });
  });

  it('forwards custom scale factor to Resvg', async () => {
    await exportPng(SAMPLE_DATA, 2);
    const { Resvg } = jest.requireMock('@resvg/resvg-js') as { Resvg: jest.Mock };
    expect(Resvg).toHaveBeenCalledWith(
      expect.any(String),
      { fitTo: { mode: 'zoom', value: 2 } },
    );
  });
});
