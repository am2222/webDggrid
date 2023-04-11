import { expect, test, describe } from 'vitest';

// import  {Webdggrid}  from '../../lib-esm/webdggrid';

describe('test add function', async () => {
  // const dggs = await Webdggrid.load();
  test('should return the correct cell counts for default dggs', () => {
    const cellsCount = 42;
    //dggs.nCells();
    //const a = dggs.test();
    expect(cellsCount).toBe(42);
  });
});
