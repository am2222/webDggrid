import { expect, test, describe, beforeAll } from 'vitest';
import { Webdggrid } from '../../lib-esm/webdggrid';

// ── Shared setup ─────────────────────────────────────────────────────────────
//
// All tests use ISEA4H resolution 1 with a (0,0) pole — the same grid as
// DEFAULT_DGGS. We call the WASM functions directly through _module so we can
// test each binding independently of the TypeScript wrapper.
//
// Array output formats:
//   GeoCoord    → [lon…, lat…]            (2 sections × n)
//   PlaneCoord  → [x…,   y…]              (2 sections × n)
//   ProjTri     → [tnum…, x…,   y…]       (3 sections × n)
//   Q2DD        → [quad…, x…,   y…]       (3 sections × n)
//   Q2DI        → [quad…, i…,   j…]       (3 sections × n)
//   SeqNum      → [sn…]                   BigInt array

type M = any;

// Standard DGGS parameters (pole_lon, pole_lat, az, aperture, res, topo, proj, is_aperture_seq, aperture_seq)
const P = [0, 0, 0, 4, 1, 'HEXAGON', 'ISEA', false, ''] as const;

let m: M;
beforeAll(async () => {
  const dggs = await Webdggrid.load();
  m = (dggs as any)._module;
});

// ── Stats ────────────────────────────────────────────────────────────────────

describe('cellAreaKM', () => {
  test('returns correct area for ISEA4H res 1', () => {
    expect(m.cellAreaKM(...P)).toBeCloseTo(12751640.543, 0);
  });
});

describe('cellDistKM', () => {
  test('returns correct spacing for ISEA4H res 1', () => {
    expect(m.cellDistKM(...P)).toBeCloseTo(3526.826, 0);
  });
});

describe('gridStatCLS', () => {
  test('returns correct CLS for ISEA4H res 1', () => {
    expect(m.gridStatCLS(...P)).toBeCloseTo(4046.359, 0);
  });
});

describe('getResInfo', () => {
  test('returns [res, cells, area, spacing, cls] for ISEA4H res 1', () => {
    const info = m.getResInfo(...P);
    expect(info[0]).toBe(1);           // res
    expect(info[1]).toBe(42);          // cells
    expect(info[2]).toBeCloseTo(12751640.543, 0); // area_km
    expect(info[3]).toBeCloseTo(3526.826, 0);      // spacing_km
    expect(info[4]).toBeCloseTo(4046.359, 0);      // cls_km
  });
});

// ── FROM GEO ─────────────────────────────────────────────────────────────────

describe('GEO_to_GEO', () => {
  test('snaps (0,0) to cell centroid', () => {
    const r = m.GEO_to_GEO(...P, [0], [0]);
    expect(r[0]).toBeCloseTo(0, 5);  // lon
    expect(r[1]).toBeCloseTo(0, 5);  // lat
  });

  test('batch: two inputs give two outputs [lon0,lon1, lat0,lat1]', () => {
    const r = m.GEO_to_GEO(...P, [0, 10], [0, 20]);
    expect(r.length).toBe(4);
  });
});

describe('GEO_to_PLANE', () => {
  test('converts (0,0) to correct plane coordinates', () => {
    const r = m.GEO_to_PLANE(...P, [0], [0]);
    expect(r[0]).toBeCloseTo(0.5, 5);                  // x
    expect(r[1]).toBeCloseTo(2.598076211344939, 5);    // y
  });

  test('batch: two inputs give two outputs [x0,x1, y0,y1]', () => {
    const r = m.GEO_to_PLANE(...P, [0, 10], [0, 20]);
    expect(r.length).toBe(4);
  });
});

describe('GEO_to_PROJTRI', () => {
  test('converts (0,0) to correct projected triangle coords', () => {
    const r = m.GEO_to_PROJTRI(...P, [0], [0]);
    expect(r[0]).toBe(0);                              // tnum
    expect(r[1]).toBeCloseTo(0.5, 5);                  // x
    expect(r[2]).toBeCloseTo(0.8660254037760619, 8);   // y
  });

  test('batch: two inputs give six outputs [tnum0,tnum1, x0,x1, y0,y1]', () => {
    const r = m.GEO_to_PROJTRI(...P, [0, 10], [0, 20]);
    expect(r.length).toBe(6);
  });
});

describe('GEO_to_Q2DD', () => {
  test('converts (0,0) to correct Q2DD coordinates', () => {
    const r = m.GEO_to_Q2DD(...P, [0], [0]);
    expect(r[0]).toBe(1);                              // quad
    expect(r[1]).toBeCloseTo(-0.5, 5);                 // x
    expect(r[2]).toBeCloseTo(0.8660254037802503, 8);   // y
  });

  test('batch: two inputs give six outputs', () => {
    const r = m.GEO_to_Q2DD(...P, [0, 10], [0, 20]);
    expect(r.length).toBe(6);
  });
});

describe('GEO_to_Q2DI', () => {
  test('converts (0,0) to correct Q2DI coordinates', () => {
    const r = m.GEO_to_Q2DI(...P, [0], [0]);
    expect(r[0]).toBe(0);  // quad
    expect(r[1]).toBe(0);  // i
    expect(r[2]).toBe(0);  // j
  });

  test('batch: two inputs give six outputs', () => {
    const r = m.GEO_to_Q2DI(...P, [0, 10], [0, 20]);
    expect(r.length).toBe(6);
  });
});

describe('GEO_to_SEQNUM', () => {
  test('converts (0,0) to seqnum 1', () => {
    const r = m.GEO_to_SEQNUM(...P, [0], [0]);
    expect(r[0]).toBe(1n);
  });

  test('batch: two inputs give two seqnums', () => {
    const r = m.GEO_to_SEQNUM(...P, [0, 10], [0, 20]);
    expect(r.length).toBe(2);
    expect(typeof r[0]).toBe('bigint');
  });
});

// ── FROM SEQNUM ───────────────────────────────────────────────────────────────

describe('SEQNUM_to_GEO', () => {
  test('converts seqnum 1 to centroid near (0,0)', () => {
    const r = m.SEQNUM_to_GEO(...P, [1n]);
    expect(r[0]).toBeCloseTo(0, 5);  // lon
    expect(r[1]).toBeCloseTo(0, 5);  // lat
  });

  test('batch: two seqnums give four values [lon0,lon1, lat0,lat1]', () => {
    const r = m.SEQNUM_to_GEO(...P, [1n, 2n]);
    expect(r.length).toBe(4);
  });
});

describe('SEQNUM_to_PLANE', () => {
  test('converts seqnum 1 to correct plane coords', () => {
    const r = m.SEQNUM_to_PLANE(...P, [1n]);
    expect(r[0]).toBeCloseTo(0.5, 5);
    expect(r[1]).toBeCloseTo(2.598076211353316, 8);
  });

  test('batch: two seqnums give four values', () => {
    const r = m.SEQNUM_to_PLANE(...P, [1n, 2n]);
    expect(r.length).toBe(4);
  });
});

describe('SEQNUM_to_PROJTRI', () => {
  test('converts seqnum 1 to correct projected triangle coords', () => {
    const r = m.SEQNUM_to_PROJTRI(...P, [1n]);
    expect(r[0]).toBe(0);                            // tnum
    expect(r[1]).toBeCloseTo(0.5, 5);                // x
    expect(r[2]).toBeCloseTo(0.8660254037844386, 8); // y
  });

  test('batch: two seqnums give six values', () => {
    const r = m.SEQNUM_to_PROJTRI(...P, [1n, 2n]);
    expect(r.length).toBe(6);
  });
});

describe('SEQNUM_to_Q2DD', () => {
  test('converts seqnum 1 to Q2DD origin', () => {
    const r = m.SEQNUM_to_Q2DD(...P, [1n]);
    expect(r[0]).toBe(0);  // quad
    expect(r[1]).toBe(0);  // x
    expect(r[2]).toBe(0);  // y
  });

  test('batch: two seqnums give six values', () => {
    const r = m.SEQNUM_to_Q2DD(...P, [1n, 2n]);
    expect(r.length).toBe(6);
  });
});

describe('SEQNUM_to_Q2DI', () => {
  test('converts seqnum 1 to Q2DI origin', () => {
    const r = m.SEQNUM_to_Q2DI(...P, [1n]);
    expect(r[0]).toBe(0);  // quad
    expect(r[1]).toBe(0);  // i
    expect(r[2]).toBe(0);  // j
  });

  test('batch: two seqnums give six values', () => {
    const r = m.SEQNUM_to_Q2DI(...P, [1n, 2n]);
    expect(r.length).toBe(6);
  });
});

describe('SEQNUM_to_SEQNUM', () => {
  test('round-trip: seqnum is unchanged', () => {
    const r = m.SEQNUM_to_SEQNUM(...P, [1n, 2n, 10n]);
    expect(r[0]).toBe(1n);
    expect(r[1]).toBe(2n);
    expect(r[2]).toBe(10n);
  });
});

// ── FROM PROJTRI ──────────────────────────────────────────────────────────────
// Input: the PROJTRI coords for (0,0) → tnum=0, x=0.5, y≈0.866

describe('PROJTRI_to_GEO', () => {
  test('round-trips back to (0,0)', () => {
    const r = m.PROJTRI_to_GEO(...P, [0], [0.5], [0.8660254037760619]);
    expect(r[0]).toBeCloseTo(0, 8);
    expect(r[1]).toBeCloseTo(0, 8);
  });

  test('batch: two inputs give four values', () => {
    const r = m.PROJTRI_to_GEO(...P, [0, 0], [0.5, 0.5], [0.866, 0.866]);
    expect(r.length).toBe(4);
  });
});

describe('PROJTRI_to_PLANE', () => {
  test('converts to plane coords', () => {
    const r = m.PROJTRI_to_PLANE(...P, [0], [0.5], [0.8660254037760619]);
    expect(r.length).toBe(2);
    expect(r[0]).toBeCloseTo(0.5, 5);
  });
});

describe('PROJTRI_to_Q2DI', () => {
  test('converts to Q2DI origin', () => {
    const r = m.PROJTRI_to_Q2DI(...P, [0], [0.5], [0.8660254037760619]);
    expect(r[0]).toBe(0);  // quad
    expect(r[1]).toBe(0);  // i
    expect(r[2]).toBe(0);  // j
  });
});

describe('PROJTRI_to_SEQNUM', () => {
  test('converts back to seqnum 1', () => {
    const r = m.PROJTRI_to_SEQNUM(...P, [0], [0.5], [0.8660254037760619]);
    expect(r[0]).toBe(1n);
  });
});

// ── FROM Q2DD ─────────────────────────────────────────────────────────────────
// Input: Q2DD coords for (0,0) → quad=1, x≈-0.5, y≈0.866

describe('Q2DD_to_GEO', () => {
  test('round-trips back to (0,0)', () => {
    const r = m.Q2DD_to_GEO(...P, [1], [-0.49999999999274547], [0.8660254037802503]);
    expect(r[0]).toBeCloseTo(0, 8);
    expect(r[1]).toBeCloseTo(0, 8);
  });

  test('batch: two inputs give four values', () => {
    const r = m.Q2DD_to_GEO(...P, [1, 1], [-0.5, -0.5], [0.866, 0.866]);
    expect(r.length).toBe(4);
  });
});

describe('Q2DD_to_Q2DI', () => {
  test('converts to Q2DI origin', () => {
    const r = m.Q2DD_to_Q2DI(...P, [1], [-0.49999999999274547], [0.8660254037802503]);
    expect(r[0]).toBe(0);  // quad
    expect(r[1]).toBe(0);  // i
    expect(r[2]).toBe(0);  // j
  });
});

describe('Q2DD_to_SEQNUM', () => {
  test('converts back to seqnum 1', () => {
    const r = m.Q2DD_to_SEQNUM(...P, [1], [-0.49999999999274547], [0.8660254037802503]);
    expect(r[0]).toBe(1n);
  });
});

describe('Q2DD_to_PROJTRI', () => {
  test('converts to PROJTRI coords', () => {
    const r = m.Q2DD_to_PROJTRI(...P, [1], [-0.49999999999274547], [0.8660254037802503]);
    expect(r.length).toBe(3);
  });
});

// ── FROM Q2DI ─────────────────────────────────────────────────────────────────
// Input: Q2DI coords for (0,0) → quad=0, i=0, j=0

describe('Q2DI_to_GEO', () => {
  test('converts Q2DI origin to centroid near (0,0)', () => {
    const r = m.Q2DI_to_GEO(...P, [0], [0], [0]);
    expect(r[0]).toBeCloseTo(0, 5);
    expect(r[1]).toBeCloseTo(0, 5);
  });

  test('batch: two inputs give four values', () => {
    const r = m.Q2DI_to_GEO(...P, [0, 0], [0, 0], [0, 0]);
    expect(r.length).toBe(4);
  });
});

describe('Q2DI_to_PLANE', () => {
  test('converts Q2DI origin to plane coords', () => {
    const r = m.Q2DI_to_PLANE(...P, [0], [0], [0]);
    expect(r.length).toBe(2);
    expect(r[0]).toBeCloseTo(0.5, 5);
  });
});

describe('Q2DI_to_Q2DD', () => {
  test('converts Q2DI origin to Q2DD', () => {
    const r = m.Q2DI_to_Q2DD(...P, [0], [0], [0]);
    expect(r.length).toBe(3);
  });
});

describe('Q2DI_to_PROJTRI', () => {
  test('converts Q2DI origin to PROJTRI', () => {
    const r = m.Q2DI_to_PROJTRI(...P, [0], [0], [0]);
    expect(r[0]).toBe(0);  // tnum
    expect(r[1]).toBeCloseTo(0.5, 5);
    expect(r[2]).toBeCloseTo(0.8660254037844386, 8);
  });
});

describe('Q2DI_to_SEQNUM', () => {
  test('converts Q2DI origin to seqnum 1', () => {
    const r = m.Q2DI_to_SEQNUM(...P, [0], [0], [0]);
    expect(r[0]).toBe(1n);
  });
});

describe('Q2DI_to_Q2DI', () => {
  test('round-trip: Q2DI is unchanged', () => {
    const r = m.Q2DI_to_Q2DI(...P, [0], [0], [0]);
    expect(r[0]).toBe(0);  // quad
    expect(r[1]).toBe(0);  // i
    expect(r[2]).toBe(0);  // j
  });
});

// ── Cross-frame round-trip ────────────────────────────────────────────────────

describe('cross-frame round-trips', () => {
  test('GEO → SEQNUM → Q2DI → GEO matches GEO_to_GEO snap', () => {
    const sn = m.GEO_to_SEQNUM(...P, [0], [0]);
    const q2di = m.SEQNUM_to_Q2DI(...P, sn);
    const geo = m.Q2DI_to_GEO(...P, [q2di[0]], [q2di[1]], [q2di[2]]);
    const snap = m.GEO_to_GEO(...P, [0], [0]);
    expect(geo[0]).toBeCloseTo(snap[0], 8);
    expect(geo[1]).toBeCloseTo(snap[1], 8);
  });

  test('GEO → PROJTRI → Q2DI → SEQNUM gives seqnum 1', () => {
    const pt = m.GEO_to_PROJTRI(...P, [0], [0]);
    const sn = m.PROJTRI_to_SEQNUM(...P, [pt[0]], [pt[1]], [pt[2]]);
    expect(sn[0]).toBe(1n);
  });

  test('GEO → Q2DD → SEQNUM gives seqnum 1', () => {
    const q2dd = m.GEO_to_Q2DD(...P, [0], [0]);
    const sn = m.Q2DD_to_SEQNUM(...P, [q2dd[0]], [q2dd[1]], [q2dd[2]]);
    expect(sn[0]).toBe(1n);
  });
});
