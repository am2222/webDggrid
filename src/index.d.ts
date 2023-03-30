export declare enum Topology {
    "HEXAGON" = "HEXAGON"
}
export declare enum Projection {
    "ISEA" = "ISEA"
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
export declare class WebDggrid {
    private dggs;
    private resolution;
    constructor({ poleCoordinates, azimuth, topology, projection, aperture, resolution, }?: IDGGSProps);
    main(): any;
    geoToSeqnum(coordinates: Number[][], resolution?: Number): Number[];
    getResolution(): Number;
    setResolution(resolution: Number): void;
}
export default WebDggrid;
