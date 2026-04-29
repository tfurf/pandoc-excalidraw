import path from 'path';
import fs from 'fs';

// Mock render module before filter is imported
jest.mock('../render', () => ({
  exportSvg: jest.fn().mockResolvedValue('<svg/>'),
  exportPng: jest.fn().mockResolvedValue(Buffer.from([0, 1, 2])),
}));

// Allow readFileSync to work (fixture files exist on disk), only stub writeFileSync
jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  writeFileSync: jest.fn(),
}));

import { processImage } from '../filter';

const FIXTURES = path.join(__dirname, 'fixtures');
const SIMPLE = path.join(FIXTURES, 'simple.excalidraw');
const MULTI = path.join(FIXTURES, 'multi.excalidraw');

function imageNode(url: string, kvpairs: [string, string][] = []) {
  return {
    t: 'Image' as const,
    c: [['', [], kvpairs], [], [url, 'title']] as [
      [string, string[], [string, string][]],
      unknown[],
      [string, string],
    ],
  };
}

const mockWriteFileSync = fs.writeFileSync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  const r = jest.requireMock('../render') as { exportSvg: jest.Mock; exportPng: jest.Mock };
  r.exportSvg.mockResolvedValue('<svg/>');
  r.exportPng.mockResolvedValue(Buffer.from([0, 1, 2]));
});

describe('processImage', () => {
  it('returns non-.excalidraw image node unchanged', async () => {
    const node = imageNode('photo.png');
    const result = await processImage(node, 'html5');
    expect(result).toBe(node);
  });

  it('calls exportSvg for html5 format', async () => {
    await processImage(imageNode(SIMPLE), 'html5');
    const { exportSvg, exportPng } = jest.requireMock('../render') as { exportSvg: jest.Mock; exportPng: jest.Mock };
    expect(exportSvg).toHaveBeenCalledTimes(1);
    expect(exportPng).not.toHaveBeenCalled();
  });

  it('writes .svg file for html5 format', async () => {
    await processImage(imageNode(SIMPLE), 'html5');
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/\.svg$/),
      '<svg/>',
    );
  });

  it('writes .svg file for html formats with extensions', async () => {
    await processImage(imageNode(SIMPLE), 'html+smart');
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/\.svg$/),
      '<svg/>',
    );
  });

  it('calls exportPng for pdf format', async () => {
    await processImage(imageNode(SIMPLE), 'pdf');
    const { exportPng, exportSvg } = jest.requireMock('../render') as { exportSvg: jest.Mock; exportPng: jest.Mock };
    expect(exportPng).toHaveBeenCalledTimes(1);
    expect(exportSvg).not.toHaveBeenCalled();
  });

  it('writes .png file for pdf format', async () => {
    await processImage(imageNode(SIMPLE), 'pdf');
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/\.png$/),
      expect.any(Buffer),
    );
  });

  it('returns updated Image node with .svg URL for html5', async () => {
    const result = await processImage(imageNode(SIMPLE), 'html5');
    expect(result.t).toBe('Image');
    expect(result.c[2][0]).toMatch(/\.svg$/);
  });

  it('includes frame fingerprint in output filename', async () => {
    await processImage(imageNode(MULTI, [['ex-frame', 'frame1']]), 'html5');
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/--frame-frame1\.svg$/),
      '<svg/>',
    );
  });

  it('includes ids fingerprint in output filename', async () => {
    await processImage(imageNode(SIMPLE, [['ex-ids', 'rect1']]), 'html5');
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/--ids-rect1\.svg$/),
      '<svg/>',
    );
  });

  it('sorts ids in fingerprint for deterministic filenames', async () => {
    await processImage(imageNode(SIMPLE, [['ex-ids', 'z,a,m']]), 'html5');
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/--ids-a-m-z\.svg$/),
      '<svg/>',
    );
  });

  it('strips ex-* attributes from returned node', async () => {
    const result = await processImage(
      imageNode(SIMPLE, [['ex-frame', 'frame1'], ['width', '100']]),
      'html5',
    );
    const kvpairs = result.c[0][2];
    expect(kvpairs.some(([k]) => k.startsWith('ex-'))).toBe(false);
    expect(kvpairs.some(([k]) => k === 'width')).toBe(true);
  });

  it('passes scale to exportPng', async () => {
    await processImage(imageNode(SIMPLE, [['ex-scale', '2']]), 'pdf');
    const { exportPng } = jest.requireMock('../render') as { exportPng: jest.Mock };
    expect(exportPng).toHaveBeenCalledWith(expect.anything(), 2);
  });

  it('passes only frame-selected elements to render', async () => {
    await processImage(imageNode(MULTI, [['ex-frame', 'frame1']]), 'html5');
    const { exportSvg } = jest.requireMock('../render') as { exportSvg: jest.Mock };
    const [data] = exportSvg.mock.calls[0] as [{ elements: { id: string }[] }];
    const ids = data.elements.map(e => e.id);
    expect(ids).toContain('rect1');
    expect(ids).toContain('rect2');
    expect(ids).toContain('arrow1');
    expect(ids).not.toContain('frame1');
    expect(ids).not.toContain('outside1');
  });

  it('throws for invalid ex-area value', async () => {
    await expect(
      processImage(imageNode(SIMPLE, [['ex-area', 'notvalid']]), 'html5'),
    ).rejects.toThrow('Invalid ex-area');
  });

  it('uses full canvas when no selector is given', async () => {
    await processImage(imageNode(SIMPLE), 'html5');
    const { exportSvg } = jest.requireMock('../render') as { exportSvg: jest.Mock };
    const [data] = exportSvg.mock.calls[0] as [{ elements: { id: string }[] }];
    expect(data.elements.map(e => e.id)).toContain('rect1');
  });
});
