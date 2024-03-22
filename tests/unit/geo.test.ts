import { expect, test, describe } from 'vitest';

import { Webdggrid } from '../../lib-esm/webdggrid';

describe('test nCell function', async () => {
  const dggs = await Webdggrid.load();
  test('should return the correct cell counts for default dggs resolution 1', () => {
    const nCellsRes1 = dggs.nCells();
    expect(nCellsRes1).toBe(42);
  });
  test('should return the correct cell counts for default dggs resolution 3', () => {
    const nCellsRes1 = dggs.nCells(3);
    expect(nCellsRes1).toBe(642);
  });

});

describe('test geoToSequenceNum function', async () => {
  const dggs = await Webdggrid.load();
  test('should return a set of cells for 0,0 coordinate', () => {
    const seqNum = dggs.geoToSequenceNum([[0, 0]]);
    expect(seqNum[0]).toBe(1n);
  });

});

describe('test sequenceNumToGeo function', async () => {
  const dggs = await Webdggrid.load();
  test('should return a set of cells for 1n coordinate', () => {
    const coords = dggs.sequenceNumToGeo([1n]);
    expect(coords[0][0]).toBe(5.016335486835158);
    expect(coords[0][1]).toBe(4.241895663821446);
  });

});