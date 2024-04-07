import { expect, test, describe } from 'vitest';

import { Webdggrid } from '../../lib-esm/webdggrid';

//https://github.com/GoogleChromeLabs/jsbi/issues/30
// eslint-disable-next-line @typescript-eslint/no-redeclare
interface BigInt {
  /** Convert to BigInt to string form in JSON.stringify */
  toJSON: () => string;
}
BigInt.prototype.toJSON = function () {
  return this.toString();
};

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

describe('test sequenceNumToGrid function', async () => {
  const dggs = await Webdggrid.load();
  test('should return a set of cells for 4 dggids', () => {
    const coords = dggs.sequenceNumToGrid([1n, 2n, 6n, 10n]);
    expect(coords.length).toBe(4);
    expect(coords[0][1].length).toBe(2);
    expect(coords[3][2][0]).toBe(-66.68514068908306);
  });

  test('should return a set of cells for 4 dggids as geojson', () => {
    const featureCollection = dggs.sequenceNumToGridFeatureCollection([1n, 2n, 3n, 10n]);
    expect(featureCollection.features.length).toBe(4);
    expect(featureCollection.features[0].geometry.coordinates[0][1].length).toBe(2);
    expect(featureCollection.features[3].geometry.coordinates[0][2][0]).toBe(-66.68514068908306);
  });

  test('should return a set of cells for 9 dggids as geojson', () => {
    const featureCollection = dggs.sequenceNumToGridFeatureCollection([1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 10n]);
    expect(featureCollection.features[0].geometry.coordinates[0][1].length).toBe(2);
    // let string=JSON.stringify(featureCollection);
    // debugger
  });
});
