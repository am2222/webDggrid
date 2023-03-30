import { expect, test, describe } from "vitest";

import { WebDggrid } from "../../src/index";

describe("test add function", () => {
  const dggs = new WebDggrid();
  test("should return the correct cell counts for default dggs", () => {
    const cellsCount = dggs.nCells();
    expect(cellsCount).toBe(42);
  });
});
