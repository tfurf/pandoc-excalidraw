import {
  computeBbox,
  applyPadding,
  selectElements,
  ExcalidrawElement,
} from '../select';

function el(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  extra: Partial<ExcalidrawElement> = {},
): ExcalidrawElement {
  return {
    id,
    type: 'rectangle',
    x, y,
    width: w,
    height: h,
    frameId: null,
    boundElements: null,
    startBinding: null,
    endBinding: null,
    ...extra,
  };
}

const elements: ExcalidrawElement[] = [
  { ...el('frame1', 0, 0, 400, 300), type: 'frame' },
  el('rect1', 50, 80, 100, 60, {
    frameId: 'frame1',
    boundElements: [{ id: 'arrow1', type: 'arrow' }],
  }),
  el('rect2', 250, 80, 100, 60, {
    frameId: 'frame1',
    boundElements: [{ id: 'arrow1', type: 'arrow' }],
  }),
  {
    ...el('arrow1', 150, 110, 100, 0),
    type: 'arrow',
    frameId: 'frame1',
    startBinding: { elementId: 'rect1', focus: 0, gap: 1 },
    endBinding: { elementId: 'rect2', focus: 0, gap: 1 },
  },
  el('outside1', 600, 600, 100, 60),
];

describe('computeBbox', () => {
  it('returns zero bbox for empty array', () => {
    expect(computeBbox([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('computes bbox of a single element', () => {
    expect(computeBbox([el('a', 10, 20, 100, 50)])).toEqual({
      x: 10, y: 20, width: 100, height: 50,
    });
  });

  it('computes bbox spanning multiple elements', () => {
    const bbox = computeBbox([
      el('a', 0, 0, 100, 100),
      el('b', 50, 80, 200, 50),
    ]);
    expect(bbox).toEqual({ x: 0, y: 0, width: 250, height: 130 });
  });
});

describe('applyPadding', () => {
  it('expands bbox by pad on all sides', () => {
    expect(applyPadding({ x: 10, y: 20, width: 100, height: 50 }, 5)).toEqual({
      x: 5, y: 15, width: 110, height: 60,
    });
  });
});

describe('selectElements', () => {
  describe('no options', () => {
    it('returns the same array reference when no selector given', () => {
      expect(selectElements(elements, {})).toBe(elements);
    });
  });

  describe('ids', () => {
    it('includes the requested element', () => {
      const result = selectElements(elements, { ids: ['rect1'] });
      expect(result.map(e => e.id)).toContain('rect1');
    });

    it('pulls in bound arrows', () => {
      const result = selectElements(elements, { ids: ['rect1'] });
      expect(result.map(e => e.id)).toContain('arrow1');
    });

    it('pulls in arrow endpoint shapes when arrow is selected', () => {
      const result = selectElements(elements, { ids: ['arrow1'] });
      const ids = result.map(e => e.id);
      expect(ids).toContain('rect1');
      expect(ids).toContain('rect2');
    });

    it('does not include unrelated elements', () => {
      const result = selectElements(elements, { ids: ['rect1'] });
      expect(result.map(e => e.id)).not.toContain('outside1');
    });

    it('preserves original document order', () => {
      const result = selectElements(elements, { ids: ['rect2', 'rect1'] });
      const ids = result.map(e => e.id);
      expect(ids.indexOf('rect1')).toBeLessThan(ids.indexOf('rect2'));
    });
  });

  describe('frameId', () => {
    it('returns elements inside the frame', () => {
      const result = selectElements(elements, { frameId: 'frame1' });
      const ids = result.map(e => e.id);
      expect(ids).toContain('rect1');
      expect(ids).toContain('rect2');
      expect(ids).toContain('arrow1');
    });

    it('does not include the frame element itself', () => {
      const result = selectElements(elements, { frameId: 'frame1' });
      expect(result.map(e => e.id)).not.toContain('frame1');
    });

    it('does not include elements outside the frame', () => {
      const result = selectElements(elements, { frameId: 'frame1' });
      expect(result.map(e => e.id)).not.toContain('outside1');
    });

    it('returns empty array for non-existent frame id', () => {
      expect(selectElements(elements, { frameId: 'no-such-frame' })).toEqual([]);
    });
  });

  describe('area', () => {
    it('returns elements intersecting the area', () => {
      const result = selectElements(elements, { area: { x: 0, y: 0, width: 200, height: 200 } });
      expect(result.map(e => e.id)).toContain('rect1');
    });

    it('excludes elements fully outside the area', () => {
      const result = selectElements(elements, { area: { x: 700, y: 700, width: 10, height: 10 } });
      expect(result).toHaveLength(0);
    });

    it('includes element that partially overlaps the area', () => {
      // rect1 is at x:50,y:80 w:100,h:60 — partially inside x:0,y:0,w:100,h:100
      const result = selectElements(elements, { area: { x: 0, y: 0, width: 100, height: 100 } });
      expect(result.map(e => e.id)).toContain('rect1');
    });
  });

  describe('priority', () => {
    it('ids takes precedence over frameId', () => {
      const result = selectElements(elements, { ids: ['outside1'], frameId: 'frame1' });
      expect(result.map(e => e.id)).toEqual(['outside1']);
    });

    it('frameId takes precedence over area', () => {
      const result = selectElements(elements, {
        frameId: 'frame1',
        area: { x: 700, y: 700, width: 10, height: 10 },
      });
      expect(result.map(e => e.id)).toContain('rect1');
    });
  });
});
