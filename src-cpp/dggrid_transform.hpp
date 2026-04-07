// dggrid_transform.hpp
//
// Public API for dggrid coordinate transforms and grid utilities.
// Implemented against the DGGRID v8 dglib API.
//
#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace dggrid {

using SeqNum = uint64_t;

// ---------------------------------------------------------------------------
// DggsParams — fully describes a DGGS configuration.
// ---------------------------------------------------------------------------
struct DggsParams {
    std::string  projection   = "ISEA";
    unsigned int aperture     = 3;
    std::string  topology     = "HEXAGON";
    int          res          = 1;
    double       azimuth_deg  = 0.0;
    double       pole_lat_deg = 58.28252559;
    double       pole_lon_deg = 11.25;
    
    // Multi-aperture support: if is_aperture_sequence is true,
    // aperture_sequence defines the aperture for each resolution level.
    // Only valid for HEXAGON topology.
    bool         is_aperture_sequence = false;
    std::string  aperture_sequence    = "";  // e.g., "434747"

    DggsParams withRes(int r) const {
        DggsParams p = *this;
        p.res = r;
        return p;
    }
};

// ---------------------------------------------------------------------------
// Coordinate types
// ---------------------------------------------------------------------------
struct GeoCoord     { double lon_deg, lat_deg; };
struct PlaneCoord   { double x, y; };
struct ProjTriCoord { uint64_t tnum; double x, y; };
struct Q2DDCoord    { uint64_t quad; double x, y; };
struct Q2DICoord    { uint64_t quad; int64_t i, j; };

// ---------------------------------------------------------------------------
// Resolution information
// ---------------------------------------------------------------------------
struct ResInfo {
    int      res;
    uint64_t cells;
    double   area_km;
    double   spacing_km;
    double   cls_km;
};

// ---------------------------------------------------------------------------
// Construction / query
// ---------------------------------------------------------------------------
DggsParams            construct(const std::string& projection,
                                 unsigned int       aperture,
                                 const std::string& topology,
                                 int                res,
                                 double             azimuth_deg,
                                 double             pole_lat_deg,
                                 double             pole_lon_deg,
                                 bool               is_aperture_sequence = false,
                                 const std::string& aperture_sequence = "");

DggsParams            setRes(const DggsParams& p, int res);
std::vector<ResInfo>  getRes(const DggsParams& p);
ResInfo               getResAt(const DggsParams& p, int res);
uint64_t              maxCell(const DggsParams& p, int res = -1);
std::string           info(const DggsParams& p);

// ---------------------------------------------------------------------------
// FROM GEO
// ---------------------------------------------------------------------------
GeoCoord     geoToGeo    (const DggsParams& p, double lon_deg, double lat_deg);
PlaneCoord   geoToPlane  (const DggsParams& p, double lon_deg, double lat_deg);
ProjTriCoord geoToProjTri(const DggsParams& p, double lon_deg, double lat_deg);
Q2DDCoord    geoToQ2DD   (const DggsParams& p, double lon_deg, double lat_deg);
Q2DICoord    geoToQ2DI   (const DggsParams& p, double lon_deg, double lat_deg);
SeqNum       geoToSeqNum (const DggsParams& p, double lon_deg, double lat_deg);

// ---------------------------------------------------------------------------
// FROM PROJTRI
// ---------------------------------------------------------------------------
GeoCoord     projTriToGeo    (const DggsParams& p, uint64_t tnum, double x, double y);
PlaneCoord   projTriToPlane  (const DggsParams& p, uint64_t tnum, double x, double y);
ProjTriCoord projTriToProjTri(const DggsParams& p, uint64_t tnum, double x, double y);
Q2DDCoord    projTriToQ2DD   (const DggsParams& p, uint64_t tnum, double x, double y);
Q2DICoord    projTriToQ2DI   (const DggsParams& p, uint64_t tnum, double x, double y);
SeqNum       projTriToSeqNum (const DggsParams& p, uint64_t tnum, double x, double y);

// ---------------------------------------------------------------------------
// FROM Q2DD
// ---------------------------------------------------------------------------
GeoCoord     q2DDToGeo    (const DggsParams& p, uint64_t quad, double x, double y);
PlaneCoord   q2DDToPlane  (const DggsParams& p, uint64_t quad, double x, double y);
ProjTriCoord q2DDToProjTri(const DggsParams& p, uint64_t quad, double x, double y);
Q2DDCoord    q2DDToQ2DD   (const DggsParams& p, uint64_t quad, double x, double y);
Q2DICoord    q2DDToQ2DI   (const DggsParams& p, uint64_t quad, double x, double y);
SeqNum       q2DDToSeqNum (const DggsParams& p, uint64_t quad, double x, double y);

// ---------------------------------------------------------------------------
// FROM Q2DI
// ---------------------------------------------------------------------------
GeoCoord     q2DIToGeo    (const DggsParams& p, uint64_t quad, int64_t i, int64_t j);
PlaneCoord   q2DIToPlane  (const DggsParams& p, uint64_t quad, int64_t i, int64_t j);
ProjTriCoord q2DIToProjTri(const DggsParams& p, uint64_t quad, int64_t i, int64_t j);
Q2DDCoord    q2DIToQ2DD   (const DggsParams& p, uint64_t quad, int64_t i, int64_t j);
Q2DICoord    q2DIToQ2DI   (const DggsParams& p, uint64_t quad, int64_t i, int64_t j);
SeqNum       q2DIToSeqNum (const DggsParams& p, uint64_t quad, int64_t i, int64_t j);

// ---------------------------------------------------------------------------
// Cell polygon vertices (cached — reuses the same DgRFNetwork)
// ---------------------------------------------------------------------------
struct CellVerticesResult {
    std::vector<double> counts;   // vertex count per cell
    std::vector<double> x;        // all x (longitude) values
    std::vector<double> y;        // all y (latitude) values
};

CellVerticesResult seqNumsToVertices(const DggsParams& p,
                                      const std::vector<SeqNum>& seqnums);

// ---------------------------------------------------------------------------
// FROM SEQNUM
// ---------------------------------------------------------------------------
GeoCoord     seqNumToGeo    (const DggsParams& p, SeqNum seqnum);
PlaneCoord   seqNumToPlane  (const DggsParams& p, SeqNum seqnum);
ProjTriCoord seqNumToProjTri(const DggsParams& p, SeqNum seqnum);
Q2DDCoord    seqNumToQ2DD   (const DggsParams& p, SeqNum seqnum);
Q2DICoord    seqNumToQ2DI   (const DggsParams& p, SeqNum seqnum);
SeqNum       seqNumToSeqNum (const DggsParams& p, SeqNum seqnum);

// ---------------------------------------------------------------------------
// NEIGHBORS - Get topologically adjacent cells (share an edge)
// ---------------------------------------------------------------------------
std::vector<SeqNum> seqNumNeighbors (const DggsParams& p, SeqNum seqnum);
std::vector<SeqNum> seqNumsNeighbors (const DggsParams& p, 
                                       const std::vector<SeqNum>& seqnums);

// ---------------------------------------------------------------------------
// PARENT/CHILD - Hierarchical relationships between resolutions
// ---------------------------------------------------------------------------
// Get parent cell at the previous (coarser) resolution
SeqNum              seqNumParent (const DggsParams& p, SeqNum seqnum);
std::vector<SeqNum> seqNumsParents (const DggsParams& p, 
                                     const std::vector<SeqNum>& seqnums);

// Get all child cells at the next (finer) resolution
std::vector<SeqNum> seqNumChildren (const DggsParams& p, SeqNum seqnum);
std::vector<std::vector<SeqNum>> seqNumsChildren (const DggsParams& p,
                                                    const std::vector<SeqNum>& seqnums);

} // namespace dggrid
