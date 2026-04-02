// dggrid_transform.cpp
//
// All coordinate transforms and grid utilities implemented against the
// DGGRID v8 dglib API, verified against the actual v8 header files:
//
//   DgIDGGBase.h   — the Q2DI frame + all RF accessors
//   DgBoundedIDGG.h — SEQNUM linearisation
//   DgIDGGS.h / DgHexIDGGS.h — IDGGS factory
//   DgProjTriRF.h / DgIDGGutil.h — intermediate frame types
//   DgEllipsoidRF.h — DgGeoCoord (latDegs / lonDegs)
//   appex.cpp      — official v8 usage example
//
// ── Reference frame chain ──────────────────────────────────────────────────
//
//   DgGeoSphRF         (GEO, radians — accessed via geoRF)
//       ↕  gnomonic projection
//   DgProjTriRF        (PROJTRI — accessed via dgg.projTriRF())
//       ↕  tri→quad mapping
//   DgQ2DDRF           (Q2DD   — accessed via dgg.q2ddRF())
//       ↕  quantise
//   DgIDGGBase itself  (Q2DI   — DgIDGGBase IS DgDiscRF<DgQ2DICoord,...>)
//       ↕  linearise via DgBoundedIDGG
//   DgBoundedIDGG      (SEQNUM — accessed via dgg.bndRF())
//
//   DgPlaneTriRF       (PLANE  — accessed via dgg.planeRF())
//
// ── Key v8 corrections from v6/dggridR assumptions ────────────────────────
//
//  ❌ assumed                │ ✅ actual v8 API
//  ──────────────────────────┼──────────────────────────────────────────────
//  q2DIRF() accessor         │ DgIDGGBase IS the Q2DI RF (no accessor needed)
//  q2DDRF() (uppercase DD)   │ q2ddRF() (lowercase)
//  dgg.getAddressAsSeqNum()  │ dgg.bndRF().seqNumAddress(q2diCoord)
//  dgg.setAddressFromSeqNum()│ dgg.bndRF().addFromSeqNum(seqnum) → DgQ2DICoord
//  DgGeoCoord(lon, lat)      │ DgGeoCoord(lon, lat, false)  [false = degrees]
//  DgGeoSphDegRF::makeRF(net,│ DgGeoSphDegRF::makeRF(geoRF, name) [no net arg]
//    geoRF, name)            │
//  idggs[res]                │ idggs->idggBase(res) or idggs->idgg(res)
//  geoRF.getPoint(loc, coord)│ geoRF.getAddress(*loc)  → const DgGeoCoord*
//  dynamic_cast<DgIDGG&>(dgg)│ DgIDGGBase already has all accessors needed

#include "dggrid_transform.hpp"

// ── dglib v8 headers ──────────────────────────────────────────────────────
#include <dglib/DgRFNetwork.h>
#include <dglib/DgGeoSphRF.h>       // DgGeoSphRF, DgGeoSphDegRF
#include <dglib/DgEllipsoidRF.h>    // DgGeoCoord (.latDegs / .lonDegs)
#include <dglib/DgIDGGSBase.h>      // DgIDGGSBase
#include <dglib/DgIDGGS.h>          // DgIDGGS::makeRF  (generic factory)
#include <dglib/DgHexIDGGS.h>       // DgHexIDGGS::makeRF
#include <dglib/DgIDGGBase.h>       // DgIDGGBase (the Q2DI RF + all accessors)
#include <dglib/DgBoundedIDGG.h>    // DgBoundedIDGG (SEQNUM)
#include <dglib/DgProjTriRF.h>      // DgProjTriRF, DgProjTriCoord, DgPlaneTriRF
#include <dglib/DgIDGGutil.h>       // DgQ2DDCoord, DgQ2DDRF, DgPlaneTriRF
#include <dglib/DgGridTopo.h>       // Hexagon, Triangle, Diamond, D4, D6
#include <dglib/DgLocation.h>       // DgLocation
#include <dglib/DgIVec2D.h>         // DgIVec2D (.i(), .j())
#include <dglib/DgDVec2D.h>         // DgDVec2D (.x(), .y())
#include <dglib/DgConstants.h>      // M_PIl, M_ZERO

#include <cmath>
#include <memory>
#include <mutex>
#include <sstream>
#include <stdexcept>
#include <unordered_map>

namespace dggrid {

using namespace dgg::topo;   // Hexagon, Triangle, Diamond, D4, D6, ...

// ===========================================================================
// DgLocation RAII wrapper
// ===========================================================================

// makeLocation() returns a raw DgLocation* that must be deleted.
// Wrap it immediately to avoid leaks.
using LocPtr = std::unique_ptr<DgLocation>;

// ===========================================================================
// Transformer
// ===========================================================================
// Owns one fully constructed DgRFNetwork for a (projection, aperture,
// topology, res) combination.  All RF pointers are non-owning views into
// the network (the network deletes them).

struct Transformer {

    std::unique_ptr<DgRFNetwork> net;

    // Reference frames — raw non-owning pointers into net
    const DgGeoSphRF   *geoRF   = nullptr;  // GEO (radians)
    const DgIDGGSBase  *idggs   = nullptr;  // multi-resolution system
    const DgIDGGBase   *dgg     = nullptr;  // single resolution (IS the Q2DI RF)

    // Intermediate frames — obtained from dgg accessors after build
    const DgProjTriRF  *projTriRF = nullptr; // dgg.projTriRF()
    const DgQ2DDRF     *q2ddRF   = nullptr;  // dgg.q2ddRF()
    const DgPlaneTriRF *planeRF  = nullptr;  // dgg.planeRF()
    const DgBoundedIDGG *bndRF   = nullptr;  // dgg.bndRF()  (SEQNUM)

    // ── inX: create a DgLocation in the named source frame ──────────────

    LocPtr inGEO(double lon_deg, double lat_deg) const {
        // DgGeoCoord(lon, lat, false) — third arg false = values are in degrees
        DgGeoCoord geo(static_cast<long double>(lon_deg),
                       static_cast<long double>(lat_deg), false);
        return LocPtr(geoRF->makeLocation(geo));
    }

    LocPtr inPROJTRI(uint64_t tnum, double x, double y) const {
        DgProjTriCoord pt(static_cast<int>(tnum),
                          DgDVec2D(static_cast<long double>(x),
                                   static_cast<long double>(y)));
        return LocPtr(projTriRF->makeLocation(pt));
    }

    LocPtr inQ2DD(uint64_t quad, double x, double y) const {
        DgQ2DDCoord pt(static_cast<int>(quad),
                       DgDVec2D(static_cast<long double>(x),
                                static_cast<long double>(y)));
        return LocPtr(q2ddRF->makeLocation(pt));
    }

    LocPtr inQ2DI(uint64_t quad, int64_t i, int64_t j) const {
        // DgIDGGBase IS the Q2DI RF — makeLocation directly on dgg
        DgQ2DICoord pt(static_cast<int>(quad),
                       DgIVec2D(static_cast<long long int>(i),
                                static_cast<long long int>(j)));
        return LocPtr(dgg->makeLocation(pt));
    }

    LocPtr inSEQNUM(uint64_t seqnum) const {
        // bndRF maps seqnum → DgQ2DICoord, then we make a location in dgg
        DgQ2DICoord q2di = bndRF->addFromSeqNum(
                               static_cast<unsigned long long int>(seqnum));
        return LocPtr(dgg->makeLocation(q2di));
    }

    // ── outX: convert loc to target frame and extract typed address ───────

    void outGEO(LocPtr &loc, double &out_lon, double &out_lat) const {
        geoRF->convert(loc.get());
        const DgGeoCoord *c = geoRF->getAddress(*loc);
        out_lon = static_cast<double>(c->lonDegs());
        out_lat = static_cast<double>(c->latDegs());
    }

    void outPROJTRI(LocPtr &loc,
                    uint64_t &out_tnum, double &out_x, double &out_y) const {
        projTriRF->convert(loc.get());
        const DgProjTriCoord *c = projTriRF->getAddress(*loc);
        out_tnum = static_cast<uint64_t>(c->triNum());
        out_x    = static_cast<double>(c->coord().x());
        out_y    = static_cast<double>(c->coord().y());
    }

    void outQ2DD(LocPtr &loc,
                 uint64_t &out_quad, double &out_x, double &out_y) const {
        q2ddRF->convert(loc.get());
        const DgQ2DDCoord *c = q2ddRF->getAddress(*loc);
        out_quad = static_cast<uint64_t>(c->quadNum());
        out_x    = static_cast<double>(c->coord().x());
        out_y    = static_cast<double>(c->coord().y());
    }

    void outQ2DI(LocPtr &loc,
                 uint64_t &out_quad, int64_t &out_i, int64_t &out_j) const {
        // dgg IS the Q2DI RF — convert into it, then getAddress
        dgg->convert(loc.get());
        const DgQ2DICoord *c = dgg->getAddress(*loc);
        out_quad = static_cast<uint64_t>(c->quadNum());
        out_i    = static_cast<int64_t>(c->coord().i());
        out_j    = static_cast<int64_t>(c->coord().j());
    }

    void outSEQNUM(LocPtr &loc, uint64_t &out_seqnum) const {
        // convert to Q2DI frame (dgg), extract Q2DICoord, then linearise
        dgg->convert(loc.get());
        const DgQ2DICoord *c = dgg->getAddress(*loc);
        out_seqnum = static_cast<uint64_t>(
            bndRF->seqNumAddress(*c));
    }

    void outPLANE(LocPtr &loc, double &out_x, double &out_y) const {
        // DgPlaneTriRF extends DgContCartRF — addresses are DgDVec2D
        planeRF->convert(loc.get());
        const DgDVec2D *c = planeRF->getAddress(*loc);
        out_x = static_cast<double>(c->x());
        out_y = static_cast<double>(c->y());
    }
};

// ===========================================================================
// Transformer cache
// ===========================================================================

struct CacheKey {
    std::string  projection;
    unsigned int aperture;
    std::string  topology;
    int          res;
    double       azimuth_deg;
    double       pole_lat_deg;
    double       pole_lon_deg;

    bool operator==(const CacheKey &o) const noexcept {
        return projection   == o.projection   &&
               aperture     == o.aperture     &&
               topology     == o.topology     &&
               res          == o.res          &&
               azimuth_deg  == o.azimuth_deg  &&
               pole_lat_deg == o.pole_lat_deg &&
               pole_lon_deg == o.pole_lon_deg;
    }
};

struct CacheKeyHash {
    std::size_t operator()(const CacheKey &k) const noexcept {
        return std::hash<std::string>()(k.projection)
             ^ (std::hash<unsigned int>()(k.aperture)  << 4)
             ^ (std::hash<std::string>()(k.topology)   << 8)
             ^ (std::hash<int>()(k.res)                << 16);
    }
};

static std::mutex                                                    s_mutex;
static std::unordered_map<CacheKey,
                          std::shared_ptr<Transformer>,
                          CacheKeyHash>                               s_cache;

// ---------------------------------------------------------------------------
// buildTransformer — construct a fully wired Transformer from a DggsParams.
// ---------------------------------------------------------------------------
static std::shared_ptr<Transformer> buildTransformer(const DggsParams &p) {

    if (p.res < 0 || p.res > 30)
        throw std::invalid_argument("res must be 0–30, got " +
                                    std::to_string(p.res));

    auto t   = std::make_shared<Transformer>();
    t->net   = std::make_unique<DgRFNetwork>();
    auto &net = *t->net;

    // ── Geographic RF (radians) ────────────────────────────────────────────
    // DgGeoSphRF::makeRF returns raw ptr; net owns it.
    t->geoRF = DgGeoSphRF::makeRF(net, "GEO");

    // ── Icosahedron orientation ────────────────────────────────────────────
    // DgGeoCoord(lon, lat, false) — false = values already in degrees
    const DgGeoCoord vert0(
        static_cast<long double>(p.pole_lon_deg),
        static_cast<long double>(p.pole_lat_deg),
        false);     // isRadians = false

    const long double azDegs = static_cast<long double>(p.azimuth_deg);

    // nRes: build one level above the requested resolution so every
    // resolution from 0 to p.res is valid.
    const int nRes = p.res + 1;

    // ── Build IDGGS ────────────────────────────────────────────────────────
    // Topology enum from DgGridTopo.h (namespace dgg::topo, pulled in above)
    DgGridTopology topo;
    DgGridMetric   metric;
    if      (p.topology == "HEXAGON")  { topo = Hexagon;  metric = D6; }
    else if (p.topology == "TRIANGLE") { topo = Triangle; metric = D4; }
    else if (p.topology == "DIAMOND")  { topo = Diamond;  metric = D4; }
    else throw std::invalid_argument(
        "Unknown topology '" + p.topology + "'. Use HEXAGON, TRIANGLE, or DIAMOND.");

    // DgIDGGS::makeRF is the single generic factory that handles all
    // topology/aperture/projection combinations.
    // Signature (from DgIDGGS.h):
    //   makeRF(network, backFrame, vert0, azDegs, aperture, nRes,
    //          gridTopo, gridMetric, name, projType, ...)
    const DgIDGGSBase *idggs = DgIDGGS::makeRF(
        net,
        *t->geoRF,
        vert0,
        azDegs,
        p.aperture,
        nRes,
        topo,
        metric,
        "IDGGS",
        p.projection
    );

    if (!idggs)
        throw std::runtime_error(
            "DgIDGGS::makeRF returned null for " +
            p.projection + "/" + p.topology +
            " aperture=" + std::to_string(p.aperture));

    t->idggs = idggs;

    // ── Get the DgIDGGBase for the specific resolution ─────────────────────
    // DgIDGGSBase::idggBase(res) returns const DgIDGGBase&
    const DgIDGGBase &dgg = idggs->idggBase(p.res);
    t->dgg = &dgg;

    // ── Resolve intermediate frames from DgIDGGBase accessors ─────────────
    // All confirmed from DgIDGGBase.h:
    //   const DgProjTriRF&   projTriRF (void) const { return *projTriRF_; }
    //   const DgQ2DDRF&      q2ddRF    (void) const { return *q2ddRF_; }
    //   const DgPlaneTriRF&  planeRF   (void) const { return *planeRF_; }
    //   const DgBoundedIDGG& bndRF     (void) const { return *bndRF_; }
    t->projTriRF = &dgg.projTriRF();
    t->q2ddRF   = &dgg.q2ddRF();
    t->planeRF  = &dgg.planeRF();
    t->bndRF    = &dgg.bndRF();

    return t;
}

// ---------------------------------------------------------------------------
// getTransformer — returns a cached Transformer; builds on first call.
// ---------------------------------------------------------------------------
static std::shared_ptr<Transformer> getTransformer(const DggsParams &p) {
    CacheKey key{p.projection, p.aperture, p.topology, p.res,
                 p.azimuth_deg, p.pole_lat_deg, p.pole_lon_deg};
    {
        std::lock_guard<std::mutex> lk(s_mutex);
        auto it = s_cache.find(key);
        if (it != s_cache.end()) return it->second;
    }
    auto t = buildTransformer(p);   // expensive — outside the lock
    std::lock_guard<std::mutex> lk(s_mutex);
    auto [it, _] = s_cache.emplace(key, std::move(t));
    return it->second;
}

// ===========================================================================
// Utility functions
// ===========================================================================

DggsParams construct(
        const std::string& projection,
        unsigned int       aperture,
        const std::string& topology,
        int                res,
        double             azimuth_deg,
        double             pole_lat_deg,
        double             pole_lon_deg)
{
    if (res < 0 || res > 30)
        throw std::invalid_argument("res must be 0–30");
    return DggsParams{projection, aperture, topology, res,
                      azimuth_deg, pole_lat_deg, pole_lon_deg};
}

DggsParams setRes(const DggsParams &p, int res) { return p.withRes(res); }

std::vector<ResInfo> getRes(const DggsParams &p) {
    // Build an IDGGS that covers all resolutions 0–30, then read gridStats()
    // off each individual DgIDGGBase.
    DggsParams full = p;
    full.res = 30;
    auto t   = getTransformer(full);

    std::vector<ResInfo> rows;
    rows.reserve(31);
    for (int r = 0; r <= 30; ++r) {
        const DgIDGGBase &dgg_r = t->idggs->idggBase(r);
        // DgGridStats (from DgIDGGutil.h):
        //   nCells()      → unsigned long long int
        //   cellAreaKM()  → long double
        //   cellDistKM()  → long double
        //   cls()         → long double
        const DgGridStats &gs = dgg_r.gridStats();
        rows.push_back(ResInfo{
            r,
            static_cast<uint64_t>(gs.nCells()),
            static_cast<double>(gs.cellAreaKM()),
            static_cast<double>(gs.cellDistKM()),
            static_cast<double>(gs.cls())
        });
    }
    return rows;
}

uint64_t maxCell(const DggsParams &p, int res) {
    int target = (res == -1) ? p.res : res;
    if (target < 0 || target > 30)
        throw std::invalid_argument("res out of range 0–30");
    return getRes(p)[static_cast<std::size_t>(target)].cells;
}

std::string info(const DggsParams &p) {
    auto rows = getRes(p);
    auto &row = rows[static_cast<std::size_t>(p.res)];
    std::ostringstream os;
    os << "DGGS: " << p.projection
       << "  aperture=" << p.aperture
       << "  topology=" << p.topology
       << "  res=" << p.res << "\n"
       << "  cells:      " << row.cells      << "\n"
       << "  area_km²:   " << row.area_km    << "\n"
       << "  spacing_km: " << row.spacing_km << "\n"
       << "  cls_km:     " << row.cls_km     << "\n";
    return os.str();
}

// ===========================================================================
// FROM GEO
// ===========================================================================

GeoCoord geoToGeo(const DggsParams &p, double lon_deg, double lat_deg) {
    auto t = getTransformer(p);
    auto loc = t->inGEO(lon_deg, lat_deg);
    GeoCoord r{};
    t->outGEO(loc, r.lon_deg, r.lat_deg);
    return r;
}

PlaneCoord geoToPlane(const DggsParams &p, double lon_deg, double lat_deg) {
    auto t = getTransformer(p);
    auto loc = t->inGEO(lon_deg, lat_deg);
    PlaneCoord r{};
    t->outPLANE(loc, r.x, r.y);
    return r;
}

ProjTriCoord geoToProjTri(const DggsParams &p, double lon_deg, double lat_deg) {
    auto t = getTransformer(p);
    auto loc = t->inGEO(lon_deg, lat_deg);
    ProjTriCoord r{};
    t->outPROJTRI(loc, r.tnum, r.x, r.y);
    return r;
}

Q2DDCoord geoToQ2DD(const DggsParams &p, double lon_deg, double lat_deg) {
    auto t = getTransformer(p);
    auto loc = t->inGEO(lon_deg, lat_deg);
    Q2DDCoord r{};
    t->outQ2DD(loc, r.quad, r.x, r.y);
    return r;
}

Q2DICoord geoToQ2DI(const DggsParams &p, double lon_deg, double lat_deg) {
    auto t = getTransformer(p);
    auto loc = t->inGEO(lon_deg, lat_deg);
    Q2DICoord r{};
    t->outQ2DI(loc, r.quad, r.i, r.j);
    return r;
}

SeqNum geoToSeqNum(const DggsParams &p, double lon_deg, double lat_deg) {
    auto t = getTransformer(p);
    auto loc = t->inGEO(lon_deg, lat_deg);
    SeqNum r = 0;
    t->outSEQNUM(loc, r);
    return r;
}

// ===========================================================================
// FROM PROJTRI
// ===========================================================================

GeoCoord projTriToGeo(const DggsParams &p, uint64_t tnum, double x, double y) {
    auto t = getTransformer(p);
    auto loc = t->inPROJTRI(tnum, x, y);
    GeoCoord r{};
    t->outGEO(loc, r.lon_deg, r.lat_deg);
    return r;
}

PlaneCoord projTriToPlane(const DggsParams &p, uint64_t tnum, double x, double y) {
    auto t = getTransformer(p);
    auto loc = t->inPROJTRI(tnum, x, y);
    PlaneCoord r{};
    t->outPLANE(loc, r.x, r.y);
    return r;
}

ProjTriCoord projTriToProjTri(const DggsParams &p, uint64_t tnum, double x, double y) {
    auto t = getTransformer(p);
    auto loc = t->inPROJTRI(tnum, x, y);
    ProjTriCoord r{};
    t->outPROJTRI(loc, r.tnum, r.x, r.y);
    return r;
}

Q2DDCoord projTriToQ2DD(const DggsParams &p, uint64_t tnum, double x, double y) {
    auto t = getTransformer(p);
    auto loc = t->inPROJTRI(tnum, x, y);
    Q2DDCoord r{};
    t->outQ2DD(loc, r.quad, r.x, r.y);
    return r;
}

Q2DICoord projTriToQ2DI(const DggsParams &p, uint64_t tnum, double x, double y) {
    auto t = getTransformer(p);
    auto loc = t->inPROJTRI(tnum, x, y);
    Q2DICoord r{};
    t->outQ2DI(loc, r.quad, r.i, r.j);
    return r;
}

SeqNum projTriToSeqNum(const DggsParams &p, uint64_t tnum, double x, double y) {
    auto t = getTransformer(p);
    auto loc = t->inPROJTRI(tnum, x, y);
    SeqNum r = 0;
    t->outSEQNUM(loc, r);
    return r;
}

// ===========================================================================
// FROM Q2DD
// ===========================================================================

GeoCoord q2DDToGeo(const DggsParams &p, uint64_t quad, double x, double y) {
    auto t = getTransformer(p);
    auto loc = t->inQ2DD(quad, x, y);
    GeoCoord r{};
    t->outGEO(loc, r.lon_deg, r.lat_deg);
    return r;
}

PlaneCoord q2DDToPlane(const DggsParams &p, uint64_t quad, double x, double y) {
    auto t = getTransformer(p);
    auto loc = t->inQ2DD(quad, x, y);
    PlaneCoord r{};
    t->outPLANE(loc, r.x, r.y);
    return r;
}

ProjTriCoord q2DDToProjTri(const DggsParams &p, uint64_t quad, double x, double y) {
    auto t = getTransformer(p);
    auto loc = t->inQ2DD(quad, x, y);
    ProjTriCoord r{};
    t->outPROJTRI(loc, r.tnum, r.x, r.y);
    return r;
}

Q2DDCoord q2DDToQ2DD(const DggsParams &p, uint64_t quad, double x, double y) {
    auto t = getTransformer(p);
    auto loc = t->inQ2DD(quad, x, y);
    Q2DDCoord r{};
    t->outQ2DD(loc, r.quad, r.x, r.y);
    return r;
}

Q2DICoord q2DDToQ2DI(const DggsParams &p, uint64_t quad, double x, double y) {
    auto t = getTransformer(p);
    auto loc = t->inQ2DD(quad, x, y);
    Q2DICoord r{};
    t->outQ2DI(loc, r.quad, r.i, r.j);
    return r;
}

SeqNum q2DDToSeqNum(const DggsParams &p, uint64_t quad, double x, double y) {
    auto t = getTransformer(p);
    auto loc = t->inQ2DD(quad, x, y);
    SeqNum r = 0;
    t->outSEQNUM(loc, r);
    return r;
}

// ===========================================================================
// FROM Q2DI
// ===========================================================================

GeoCoord q2DIToGeo(const DggsParams &p, uint64_t quad, int64_t i, int64_t j) {
    auto t = getTransformer(p);
    auto loc = t->inQ2DI(quad, i, j);
    GeoCoord r{};
    t->outGEO(loc, r.lon_deg, r.lat_deg);
    return r;
}

PlaneCoord q2DIToPlane(const DggsParams &p, uint64_t quad, int64_t i, int64_t j) {
    auto t = getTransformer(p);
    auto loc = t->inQ2DI(quad, i, j);
    PlaneCoord r{};
    t->outPLANE(loc, r.x, r.y);
    return r;
}

ProjTriCoord q2DIToProjTri(const DggsParams &p, uint64_t quad, int64_t i, int64_t j) {
    auto t = getTransformer(p);
    auto loc = t->inQ2DI(quad, i, j);
    ProjTriCoord r{};
    t->outPROJTRI(loc, r.tnum, r.x, r.y);
    return r;
}

Q2DDCoord q2DIToQ2DD(const DggsParams &p, uint64_t quad, int64_t i, int64_t j) {
    auto t = getTransformer(p);
    auto loc = t->inQ2DI(quad, i, j);
    Q2DDCoord r{};
    t->outQ2DD(loc, r.quad, r.x, r.y);
    return r;
}

Q2DICoord q2DIToQ2DI(const DggsParams &p, uint64_t quad, int64_t i, int64_t j) {
    auto t = getTransformer(p);
    auto loc = t->inQ2DI(quad, i, j);
    Q2DICoord r{};
    t->outQ2DI(loc, r.quad, r.i, r.j);
    return r;
}

SeqNum q2DIToSeqNum(const DggsParams &p, uint64_t quad, int64_t i, int64_t j) {
    auto t = getTransformer(p);
    auto loc = t->inQ2DI(quad, i, j);
    SeqNum r = 0;
    t->outSEQNUM(loc, r);
    return r;
}

// ===========================================================================
// FROM SEQNUM
// ===========================================================================

GeoCoord seqNumToGeo(const DggsParams &p, SeqNum seqnum) {
    auto t = getTransformer(p);
    auto loc = t->inSEQNUM(seqnum);
    GeoCoord r{};
    t->outGEO(loc, r.lon_deg, r.lat_deg);
    return r;
}

PlaneCoord seqNumToPlane(const DggsParams &p, SeqNum seqnum) {
    auto t = getTransformer(p);
    auto loc = t->inSEQNUM(seqnum);
    PlaneCoord r{};
    t->outPLANE(loc, r.x, r.y);
    return r;
}

ProjTriCoord seqNumToProjTri(const DggsParams &p, SeqNum seqnum) {
    auto t = getTransformer(p);
    auto loc = t->inSEQNUM(seqnum);
    ProjTriCoord r{};
    t->outPROJTRI(loc, r.tnum, r.x, r.y);
    return r;
}

Q2DDCoord seqNumToQ2DD(const DggsParams &p, SeqNum seqnum) {
    auto t = getTransformer(p);
    auto loc = t->inSEQNUM(seqnum);
    Q2DDCoord r{};
    t->outQ2DD(loc, r.quad, r.x, r.y);
    return r;
}

Q2DICoord seqNumToQ2DI(const DggsParams &p, SeqNum seqnum) {
    auto t = getTransformer(p);
    auto loc = t->inSEQNUM(seqnum);
    Q2DICoord r{};
    t->outQ2DI(loc, r.quad, r.i, r.j);
    return r;
}

SeqNum seqNumToSeqNum(const DggsParams &p, SeqNum seqnum) {
    // Round-trip: validates and normalises the seqnum.
    // For valid inputs the output equals the input.
    auto t = getTransformer(p);
    auto loc = t->inSEQNUM(seqnum);
    SeqNum r = 0;
    t->outSEQNUM(loc, r);
    return r;
}

} // namespace dggrid
