import { WebDggrid } from "../../src/index";


describe("test add function", () => {
    const dggs = new WebDggrid()
  it("should return 15 for add(10,5)", () => {
    const seqNumbers =dggs.geoToSeqnum([[0,0]],0)
    expect(seqNumbers).toBe(15);
  });
});
