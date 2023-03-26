// @ts-ignore
import { default as _WDGGRID } from "../wasm_dist/webdggrid.js";

const Module = await _WDGGRID();

const is2dArray = (array: any) =>
  array.some((item: any) => Array.isArray(item));

const arrayToVector = (array: any) => {
  const is2d = is2dArray(array);
  if (is2d) {
    const dDVector = new Module.DoubleVectorVector();
    array.forEach((item: any) => {
      const dVector = new Module.DoubleVector();
      dVector.push_back(item[0]);
      dVector.push_back(item[1]);
      dDVector.push_back(dVector);
    });
    return dDVector;
  }
};
const vectorToArray = (vector: any) =>
  new Array(vector.size()).fill(0).map((_, id) => vector.get(id));

const wVectorToArray = (vector: any) => {
  if (vector.size() === 0) {
    return [];
  }

  const objectType = vector.$$.ptrType.name;

  switch (objectType) {
    case "BigIntegerVector*":
      return vectorToArray(vector);

    default:
      return [];
  }
};

export declare enum Topology {
  "HEXAGON" = "HEXAGON",
}

export declare enum Projection {
  "ISEA" = "ISEA",
}

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface IDGGS {
  poleCoordinates: Coordinate;
  azimuth: Number;
  aperture: 3 | 4 | 5 | 7;
  topology: Topology;
  projection: Projection;
}

export interface IDGGSProps extends IDGGS {
  resolution?: Number;
}

const defaultDGGS = {
  poleCoordinates: { lat: 0, lng: 0 },
  azimuth: 0,
  topology: Topology.HEXAGON,
  projection: Projection.ISEA,
  aperture: 7,
} as IDGGSProps;

export class WebDggrid {
  private dggs: IDGGS;
  private resolution: Number =1;

  constructor({
    poleCoordinates,
    azimuth,
    topology,
    projection,
    aperture,
    resolution,
  }: IDGGSProps = defaultDGGS) {
    this.dggs = {
      poleCoordinates,
      azimuth,
      topology,
      projection,
      aperture,
    };

    if (resolution) {
      this.resolution = resolution;
    }
  }

  geoToSeqnum(
    coordinates: Number[][],
    resolution: Number = this.resolution
  ): Number[] {
    const {
      poleCoordinates: { lat, lng },
      azimuth,
      topology,
      projection,
      aperture,
    } = this.dggs;

    const coordinatesObject = arrayToVector(coordinates);

    const c = Module.DgGEO_to_SEQNUM(
      lat,
      lng,
      azimuth,
      aperture,
      resolution,
      topology,
      projection,
      coordinatesObject
    );

    const resultArray = wVectorToArray(c) as Number[];
    return resultArray;
  }

  getResolution(): Number {
    return this.resolution;
  }

  setResolution(resolution: Number) {
    this.resolution = resolution;
  }
}

export default WebDggrid;
