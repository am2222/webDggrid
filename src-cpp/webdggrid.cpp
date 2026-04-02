#include "emscripten.h"
#include "dggrid_transform.hpp"
#include <emscripten/bind.h>

// DGGRID v8 headers needed for cell polygon generation (SeqNumGrid)
#include <dglib/DgIDGGBase.h>
#include <dglib/DgBoundedIDGG.h>
#include <dglib/DgIDGGS.h>
#include <dglib/DgGeoSphRF.h>
#include <dglib/DgEllipsoidRF.h>
#include <dglib/DgRFNetwork.h>
#include <dglib/DgIDGGutil.h>
#include <dglib/DgGridTopo.h>
#include <dglib/DgPolygon.h>
#include <dglib/DgCell.h>
#include <dglib/DgLocation.h>

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

using namespace emscripten;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

static dggrid::DggsParams makeParams(
    double             pole_lon_deg,
    double             pole_lat_deg,
    double             azimuth_deg,
    unsigned int       aperture,
    int                res,
    const std::string &topology,
    const std::string &projection)
{
    return dggrid::construct(projection, aperture, topology, res,
                              azimuth_deg, pole_lat_deg, pole_lon_deg);
}

// ---------------------------------------------------------------------------

EMSCRIPTEN_KEEPALIVE
int main()
{
    auto p = makeParams(11.25, 58.28252559, 0.0, 3, 4, "HEXAGON", "ISEA");
    double cells = static_cast<double>(dggrid::getRes(p)[4].cells);
    printf("hello, world!\n");
    return static_cast<int>(cells);
}

// ===========================================================================
// Grid statistics
// ===========================================================================

double nCells(double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
              unsigned int aperture, int res,
              std::string topology, std::string projection)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    return static_cast<double>(dggrid::getRes(p)[static_cast<std::size_t>(res)].cells);
}

double cellAreaKM(double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
                  unsigned int aperture, int res,
                  std::string topology, std::string projection)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    return dggrid::getRes(p)[static_cast<std::size_t>(res)].area_km;
}

double cellDistKM(double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
                  unsigned int aperture, int res,
                  std::string topology, std::string projection)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    return dggrid::getRes(p)[static_cast<std::size_t>(res)].spacing_km;
}

double gridStatCLS(double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
                   unsigned int aperture, int res,
                   std::string topology, std::string projection)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    return dggrid::getRes(p)[static_cast<std::size_t>(res)].cls_km;
}

// Returns [res, cells, area_km, spacing_km, cls_km] for a single resolution.
val getResInfo(double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
               unsigned int aperture, int res,
               std::string topology, std::string projection)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto row = dggrid::getRes(p)[static_cast<std::size_t>(res)];
    std::vector<double> out = {
        static_cast<double>(row.res),
        static_cast<double>(row.cells),
        row.area_km,
        row.spacing_km,
        row.cls_km
    };
    return val::array(out);
}

// ===========================================================================
// SeqNumGrid — cell polygon rings for a list of sequence numbers.
// Result: [count0..countN, x_coords..., y_coords...]
// ===========================================================================

static std::vector<double> cellVertices(
    const DgIDGGBase    &dgg,
    const DgBoundedIDGG &bndRF,
    uint64_t sn)
{
    DgQ2DICoord q2di = bndRF.addFromSeqNum(
        static_cast<unsigned long long int>(sn));
    std::unique_ptr<DgLocation> loc(dgg.makeLocation(q2di));

    DgPolygon verts(dgg);
    dgg.setVertices(*loc, verts, 0);

    const std::string label = std::to_string(sn);
    DgCell cell(dgg.geoRF(), label, *loc, new DgPolygon(verts));

    const DgPolygon  &reg   = cell.region();
    const DgGeoSphRF &geoRF = dgg.geoRF();
    const int n = reg.size();

    // Collect raw vertices
    std::vector<std::pair<double,double>> pts;
    pts.reserve(static_cast<std::size_t>(n));
    for (int i = 0; i < n; i++) {
        const DgGeoCoord *c = geoRF.getAddress(reg[i]);
        pts.push_back({ static_cast<double>(c->lonDegs()),
                        static_cast<double>(c->latDegs()) });
    }

    // Detect antimeridian crossing: if the longitude span exceeds 180° the
    // cell straddles ±180°.  Temporarily shift negative longitudes by +360°
    // so the centroid and sort are computed in a contiguous range, then
    // shift back so the output stays within standard [-180, 180] GeoJSON.
    bool antimeridian = false;
    {
        double min_lon = pts[0].first, max_lon = pts[0].first;
        for (auto &p : pts) {
            min_lon = std::min(min_lon, p.first);
            max_lon = std::max(max_lon, p.first);
        }
        if (max_lon - min_lon > 180.0) {
            antimeridian = true;
            for (auto &p : pts)
                if (p.first < 0.0) p.first += 360.0;
        }
    }

    // Compute centroid
    double cx = 0.0, cy = 0.0;
    for (auto &p : pts) { cx += p.first; cy += p.second; }
    cx /= n; cy /= n;

    // Sort counter-clockwise by angle from centroid so the ring is always valid
    std::sort(pts.begin(), pts.end(),
        [cx, cy](const std::pair<double,double> &a,
                 const std::pair<double,double> &b) {
            return std::atan2(a.second - cy, a.first - cx) <
                   std::atan2(b.second - cy, b.first - cx);
        });

    // Restore standard [-180, 180] range if we shifted for the sort
    if (antimeridian) {
        for (auto &p : pts)
            if (p.first > 180.0) p.first -= 360.0;
    }

    // Build interleaved result and close the ring
    std::vector<double> result;
    result.reserve(static_cast<std::size_t>((n + 1) * 2));
    for (int i = 0; i < n; i++) {
        result.push_back(pts[i].first);
        result.push_back(pts[i].second);
    }
    result.push_back(pts[0].first);
    result.push_back(pts[0].second);
    return result;
}

val SeqNumGrid(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val seqnum)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const std::vector<uint64_t> seqnumVector =
        convertJSArrayToNumberVector<uint64_t>(seqnum);

    DgRFNetwork net;
    const DgGeoSphRF *geoRF = DgGeoSphRF::makeRF(net, "GEO");
    const DgGeoCoord vert0(
        static_cast<long double>(pole_lon_deg),
        static_cast<long double>(pole_lat_deg), false);

    using namespace dgg::topo;
    DgGridTopology topo;
    DgGridMetric   metric;
    if      (topology == "HEXAGON")  { topo = Hexagon;  metric = D6; }
    else if (topology == "TRIANGLE") { topo = Triangle; metric = D4; }
    else                             { topo = Diamond;  metric = D4; }

    const DgIDGGSBase *idggs = DgIDGGS::makeRF(
        net, *geoRF, vert0,
        static_cast<long double>(azimuth_deg),
        aperture, res + 1, topo, metric, "IDGGS", projection);

    const DgIDGGBase    &dgg   = idggs->idggBase(res);
    const DgBoundedIDGG &bndRF = dgg.bndRF();

    std::vector<double> counts;
    std::vector<double> x;
    std::vector<double> y;

    for (const auto sn : seqnumVector) {
        auto verts = cellVertices(dgg, bndRF, sn);
        const unsigned int vertexes =
            static_cast<unsigned int>(verts.size() / 2);
        counts.push_back(static_cast<double>(vertexes));
        for (std::size_t i = 0; i < verts.size(); i += 2) {
            x.push_back(verts[i]);
            y.push_back(verts[i + 1]);
        }
    }

    // Format: [count0..countN, x_all..., y_all...]
    std::vector<double> result;
    result.insert(result.end(), counts.begin(), counts.end());
    result.insert(result.end(), x.begin(), x.end());
    result.insert(result.end(), y.begin(), y.end());
    return val::array(result);
}

// ===========================================================================
// Batch transform helpers — shared output builders
// ===========================================================================

// [lon..., lat...]
static val geoArray(const std::vector<dggrid::GeoCoord> &v) {
    std::vector<double> out;
    out.reserve(v.size() * 2);
    for (auto &c : v) out.push_back(c.lon_deg);
    for (auto &c : v) out.push_back(c.lat_deg);
    return val::array(out);
}

// [x..., y...]
static val planeArray(const std::vector<dggrid::PlaneCoord> &v) {
    std::vector<double> out;
    out.reserve(v.size() * 2);
    for (auto &c : v) out.push_back(c.x);
    for (auto &c : v) out.push_back(c.y);
    return val::array(out);
}

// [tnum..., x..., y...]
static val projTriArray(const std::vector<dggrid::ProjTriCoord> &v) {
    std::vector<double> out;
    out.reserve(v.size() * 3);
    for (auto &c : v) out.push_back(static_cast<double>(c.tnum));
    for (auto &c : v) out.push_back(c.x);
    for (auto &c : v) out.push_back(c.y);
    return val::array(out);
}

// [quad..., x..., y...]
static val q2ddArray(const std::vector<dggrid::Q2DDCoord> &v) {
    std::vector<double> out;
    out.reserve(v.size() * 3);
    for (auto &c : v) out.push_back(static_cast<double>(c.quad));
    for (auto &c : v) out.push_back(c.x);
    for (auto &c : v) out.push_back(c.y);
    return val::array(out);
}

// [quad..., i..., j...]
static val q2diArray(const std::vector<dggrid::Q2DICoord> &v) {
    std::vector<double> out;
    out.reserve(v.size() * 3);
    for (auto &c : v) out.push_back(static_cast<double>(c.quad));
    for (auto &c : v) out.push_back(static_cast<double>(c.i));
    for (auto &c : v) out.push_back(static_cast<double>(c.j));
    return val::array(out);
}

// [seqnum...] as BigInt array
static val seqNumArray(const std::vector<dggrid::SeqNum> &v) {
    return val::array(v);
}

// ===========================================================================
// FROM GEO — batch (arrays of lon, lat)
// All return formats described above.
// ===========================================================================

val GEO_to_GEO(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val xs, val ys)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto xv = convertJSArrayToNumberVector<double>(xs);
    const auto yv = convertJSArrayToNumberVector<double>(ys);
    std::vector<dggrid::GeoCoord> out(xv.size());
    for (std::size_t i = 0; i < xv.size(); i++)
        out[i] = dggrid::geoToGeo(p, xv[i], yv[i]);
    return geoArray(out);
}

val GEO_to_PLANE(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val xs, val ys)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto xv = convertJSArrayToNumberVector<double>(xs);
    const auto yv = convertJSArrayToNumberVector<double>(ys);
    std::vector<dggrid::PlaneCoord> out(xv.size());
    for (std::size_t i = 0; i < xv.size(); i++)
        out[i] = dggrid::geoToPlane(p, xv[i], yv[i]);
    return planeArray(out);
}

val GEO_to_PROJTRI(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val xs, val ys)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto xv = convertJSArrayToNumberVector<double>(xs);
    const auto yv = convertJSArrayToNumberVector<double>(ys);
    std::vector<dggrid::ProjTriCoord> out(xv.size());
    for (std::size_t i = 0; i < xv.size(); i++)
        out[i] = dggrid::geoToProjTri(p, xv[i], yv[i]);
    return projTriArray(out);
}

val GEO_to_Q2DD(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val xs, val ys)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto xv = convertJSArrayToNumberVector<double>(xs);
    const auto yv = convertJSArrayToNumberVector<double>(ys);
    std::vector<dggrid::Q2DDCoord> out(xv.size());
    for (std::size_t i = 0; i < xv.size(); i++)
        out[i] = dggrid::geoToQ2DD(p, xv[i], yv[i]);
    return q2ddArray(out);
}

val GEO_to_Q2DI(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val xs, val ys)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto xv = convertJSArrayToNumberVector<double>(xs);
    const auto yv = convertJSArrayToNumberVector<double>(ys);
    std::vector<dggrid::Q2DICoord> out(xv.size());
    for (std::size_t i = 0; i < xv.size(); i++)
        out[i] = dggrid::geoToQ2DI(p, xv[i], yv[i]);
    return q2diArray(out);
}

val GEO_to_SEQNUM(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val xs, val ys)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto xv = convertJSArrayToNumberVector<double>(xs);
    const auto yv = convertJSArrayToNumberVector<double>(ys);
    std::vector<dggrid::SeqNum> out(xv.size());
    for (std::size_t i = 0; i < xv.size(); i++)
        out[i] = dggrid::geoToSeqNum(p, xv[i], yv[i]);
    return seqNumArray(out);
}

// Alias kept for backward compatibility
val DgGEO_to_SEQNUM(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val xs, val ys)
{
    return GEO_to_SEQNUM(pole_lon_deg, pole_lat_deg, azimuth_deg,
                          aperture, res, topology, projection, xs, ys);
}

// ===========================================================================
// FROM SEQNUM — batch (BigInt array)
// ===========================================================================

val SEQNUM_to_GEO(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val seqnums)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto sv = convertJSArrayToNumberVector<uint64_t>(seqnums);
    std::vector<dggrid::GeoCoord> out(sv.size());
    for (std::size_t i = 0; i < sv.size(); i++)
        out[i] = dggrid::seqNumToGeo(p, sv[i]);
    return geoArray(out);
}

val SEQNUM_to_PLANE(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val seqnums)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto sv = convertJSArrayToNumberVector<uint64_t>(seqnums);
    std::vector<dggrid::PlaneCoord> out(sv.size());
    for (std::size_t i = 0; i < sv.size(); i++)
        out[i] = dggrid::seqNumToPlane(p, sv[i]);
    return planeArray(out);
}

val SEQNUM_to_PROJTRI(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val seqnums)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto sv = convertJSArrayToNumberVector<uint64_t>(seqnums);
    std::vector<dggrid::ProjTriCoord> out(sv.size());
    for (std::size_t i = 0; i < sv.size(); i++)
        out[i] = dggrid::seqNumToProjTri(p, sv[i]);
    return projTriArray(out);
}

val SEQNUM_to_Q2DD(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val seqnums)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto sv = convertJSArrayToNumberVector<uint64_t>(seqnums);
    std::vector<dggrid::Q2DDCoord> out(sv.size());
    for (std::size_t i = 0; i < sv.size(); i++)
        out[i] = dggrid::seqNumToQ2DD(p, sv[i]);
    return q2ddArray(out);
}

val SEQNUM_to_Q2DI(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val seqnums)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto sv = convertJSArrayToNumberVector<uint64_t>(seqnums);
    std::vector<dggrid::Q2DICoord> out(sv.size());
    for (std::size_t i = 0; i < sv.size(); i++)
        out[i] = dggrid::seqNumToQ2DI(p, sv[i]);
    return q2diArray(out);
}

val SEQNUM_to_SEQNUM(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val seqnums)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto sv = convertJSArrayToNumberVector<uint64_t>(seqnums);
    std::vector<dggrid::SeqNum> out(sv.size());
    for (std::size_t i = 0; i < sv.size(); i++)
        out[i] = dggrid::seqNumToSeqNum(p, sv[i]);
    return seqNumArray(out);
}

// ===========================================================================
// FROM PROJTRI — batch (arrays of tnum, x, y; all as double/number)
// ===========================================================================

val PROJTRI_to_GEO(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val tnums, val xs, val ys)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto tv = convertJSArrayToNumberVector<double>(tnums);
    const auto xv = convertJSArrayToNumberVector<double>(xs);
    const auto yv = convertJSArrayToNumberVector<double>(ys);
    std::vector<dggrid::GeoCoord> out(tv.size());
    for (std::size_t i = 0; i < tv.size(); i++)
        out[i] = dggrid::projTriToGeo(p, static_cast<uint64_t>(tv[i]), xv[i], yv[i]);
    return geoArray(out);
}

val PROJTRI_to_PLANE(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val tnums, val xs, val ys)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto tv = convertJSArrayToNumberVector<double>(tnums);
    const auto xv = convertJSArrayToNumberVector<double>(xs);
    const auto yv = convertJSArrayToNumberVector<double>(ys);
    std::vector<dggrid::PlaneCoord> out(tv.size());
    for (std::size_t i = 0; i < tv.size(); i++)
        out[i] = dggrid::projTriToPlane(p, static_cast<uint64_t>(tv[i]), xv[i], yv[i]);
    return planeArray(out);
}

val PROJTRI_to_PROJTRI(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val tnums, val xs, val ys)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto tv = convertJSArrayToNumberVector<double>(tnums);
    const auto xv = convertJSArrayToNumberVector<double>(xs);
    const auto yv = convertJSArrayToNumberVector<double>(ys);
    std::vector<dggrid::ProjTriCoord> out(tv.size());
    for (std::size_t i = 0; i < tv.size(); i++)
        out[i] = dggrid::projTriToProjTri(p, static_cast<uint64_t>(tv[i]), xv[i], yv[i]);
    return projTriArray(out);
}

val PROJTRI_to_Q2DD(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val tnums, val xs, val ys)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto tv = convertJSArrayToNumberVector<double>(tnums);
    const auto xv = convertJSArrayToNumberVector<double>(xs);
    const auto yv = convertJSArrayToNumberVector<double>(ys);
    std::vector<dggrid::Q2DDCoord> out(tv.size());
    for (std::size_t i = 0; i < tv.size(); i++)
        out[i] = dggrid::projTriToQ2DD(p, static_cast<uint64_t>(tv[i]), xv[i], yv[i]);
    return q2ddArray(out);
}

val PROJTRI_to_Q2DI(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val tnums, val xs, val ys)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto tv = convertJSArrayToNumberVector<double>(tnums);
    const auto xv = convertJSArrayToNumberVector<double>(xs);
    const auto yv = convertJSArrayToNumberVector<double>(ys);
    std::vector<dggrid::Q2DICoord> out(tv.size());
    for (std::size_t i = 0; i < tv.size(); i++)
        out[i] = dggrid::projTriToQ2DI(p, static_cast<uint64_t>(tv[i]), xv[i], yv[i]);
    return q2diArray(out);
}

val PROJTRI_to_SEQNUM(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val tnums, val xs, val ys)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto tv = convertJSArrayToNumberVector<double>(tnums);
    const auto xv = convertJSArrayToNumberVector<double>(xs);
    const auto yv = convertJSArrayToNumberVector<double>(ys);
    std::vector<dggrid::SeqNum> out(tv.size());
    for (std::size_t i = 0; i < tv.size(); i++)
        out[i] = dggrid::projTriToSeqNum(p, static_cast<uint64_t>(tv[i]), xv[i], yv[i]);
    return seqNumArray(out);
}

// ===========================================================================
// FROM Q2DD — batch (arrays of quad, x, y; all as double/number)
// ===========================================================================

val Q2DD_to_GEO(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val quads, val xs, val ys)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto qv = convertJSArrayToNumberVector<double>(quads);
    const auto xv = convertJSArrayToNumberVector<double>(xs);
    const auto yv = convertJSArrayToNumberVector<double>(ys);
    std::vector<dggrid::GeoCoord> out(qv.size());
    for (std::size_t i = 0; i < qv.size(); i++)
        out[i] = dggrid::q2DDToGeo(p, static_cast<uint64_t>(qv[i]), xv[i], yv[i]);
    return geoArray(out);
}

val Q2DD_to_PLANE(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val quads, val xs, val ys)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto qv = convertJSArrayToNumberVector<double>(quads);
    const auto xv = convertJSArrayToNumberVector<double>(xs);
    const auto yv = convertJSArrayToNumberVector<double>(ys);
    std::vector<dggrid::PlaneCoord> out(qv.size());
    for (std::size_t i = 0; i < qv.size(); i++)
        out[i] = dggrid::q2DDToPlane(p, static_cast<uint64_t>(qv[i]), xv[i], yv[i]);
    return planeArray(out);
}

val Q2DD_to_PROJTRI(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val quads, val xs, val ys)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto qv = convertJSArrayToNumberVector<double>(quads);
    const auto xv = convertJSArrayToNumberVector<double>(xs);
    const auto yv = convertJSArrayToNumberVector<double>(ys);
    std::vector<dggrid::ProjTriCoord> out(qv.size());
    for (std::size_t i = 0; i < qv.size(); i++)
        out[i] = dggrid::q2DDToProjTri(p, static_cast<uint64_t>(qv[i]), xv[i], yv[i]);
    return projTriArray(out);
}

val Q2DD_to_Q2DD(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val quads, val xs, val ys)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto qv = convertJSArrayToNumberVector<double>(quads);
    const auto xv = convertJSArrayToNumberVector<double>(xs);
    const auto yv = convertJSArrayToNumberVector<double>(ys);
    std::vector<dggrid::Q2DDCoord> out(qv.size());
    for (std::size_t i = 0; i < qv.size(); i++)
        out[i] = dggrid::q2DDToQ2DD(p, static_cast<uint64_t>(qv[i]), xv[i], yv[i]);
    return q2ddArray(out);
}

val Q2DD_to_Q2DI(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val quads, val xs, val ys)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto qv = convertJSArrayToNumberVector<double>(quads);
    const auto xv = convertJSArrayToNumberVector<double>(xs);
    const auto yv = convertJSArrayToNumberVector<double>(ys);
    std::vector<dggrid::Q2DICoord> out(qv.size());
    for (std::size_t i = 0; i < qv.size(); i++)
        out[i] = dggrid::q2DDToQ2DI(p, static_cast<uint64_t>(qv[i]), xv[i], yv[i]);
    return q2diArray(out);
}

val Q2DD_to_SEQNUM(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val quads, val xs, val ys)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto qv = convertJSArrayToNumberVector<double>(quads);
    const auto xv = convertJSArrayToNumberVector<double>(xs);
    const auto yv = convertJSArrayToNumberVector<double>(ys);
    std::vector<dggrid::SeqNum> out(qv.size());
    for (std::size_t i = 0; i < qv.size(); i++)
        out[i] = dggrid::q2DDToSeqNum(p, static_cast<uint64_t>(qv[i]), xv[i], yv[i]);
    return seqNumArray(out);
}

// ===========================================================================
// FROM Q2DI — batch (arrays of quad, i, j; all as double/number)
// i and j are doubles here — they fit without precision loss up to res ~20.
// ===========================================================================

val Q2DI_to_GEO(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val quads, val is, val js)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto qv = convertJSArrayToNumberVector<double>(quads);
    const auto iv = convertJSArrayToNumberVector<double>(is);
    const auto jv = convertJSArrayToNumberVector<double>(js);
    std::vector<dggrid::GeoCoord> out(qv.size());
    for (std::size_t i = 0; i < qv.size(); i++)
        out[i] = dggrid::q2DIToGeo(p, static_cast<uint64_t>(qv[i]),
                                    static_cast<int64_t>(iv[i]),
                                    static_cast<int64_t>(jv[i]));
    return geoArray(out);
}

val Q2DI_to_PLANE(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val quads, val is, val js)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto qv = convertJSArrayToNumberVector<double>(quads);
    const auto iv = convertJSArrayToNumberVector<double>(is);
    const auto jv = convertJSArrayToNumberVector<double>(js);
    std::vector<dggrid::PlaneCoord> out(qv.size());
    for (std::size_t i = 0; i < qv.size(); i++)
        out[i] = dggrid::q2DIToPlane(p, static_cast<uint64_t>(qv[i]),
                                      static_cast<int64_t>(iv[i]),
                                      static_cast<int64_t>(jv[i]));
    return planeArray(out);
}

val Q2DI_to_PROJTRI(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val quads, val is, val js)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto qv = convertJSArrayToNumberVector<double>(quads);
    const auto iv = convertJSArrayToNumberVector<double>(is);
    const auto jv = convertJSArrayToNumberVector<double>(js);
    std::vector<dggrid::ProjTriCoord> out(qv.size());
    for (std::size_t i = 0; i < qv.size(); i++)
        out[i] = dggrid::q2DIToProjTri(p, static_cast<uint64_t>(qv[i]),
                                        static_cast<int64_t>(iv[i]),
                                        static_cast<int64_t>(jv[i]));
    return projTriArray(out);
}

val Q2DI_to_Q2DD(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val quads, val is, val js)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto qv = convertJSArrayToNumberVector<double>(quads);
    const auto iv = convertJSArrayToNumberVector<double>(is);
    const auto jv = convertJSArrayToNumberVector<double>(js);
    std::vector<dggrid::Q2DDCoord> out(qv.size());
    for (std::size_t i = 0; i < qv.size(); i++)
        out[i] = dggrid::q2DIToQ2DD(p, static_cast<uint64_t>(qv[i]),
                                     static_cast<int64_t>(iv[i]),
                                     static_cast<int64_t>(jv[i]));
    return q2ddArray(out);
}

val Q2DI_to_Q2DI(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val quads, val is, val js)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto qv = convertJSArrayToNumberVector<double>(quads);
    const auto iv = convertJSArrayToNumberVector<double>(is);
    const auto jv = convertJSArrayToNumberVector<double>(js);
    std::vector<dggrid::Q2DICoord> out(qv.size());
    for (std::size_t i = 0; i < qv.size(); i++)
        out[i] = dggrid::q2DIToQ2DI(p, static_cast<uint64_t>(qv[i]),
                                     static_cast<int64_t>(iv[i]),
                                     static_cast<int64_t>(jv[i]));
    return q2diArray(out);
}

val Q2DI_to_SEQNUM(
    double pole_lon_deg, double pole_lat_deg, double azimuth_deg,
    unsigned int aperture, int res,
    std::string topology, std::string projection,
    val quads, val is, val js)
{
    auto p = makeParams(pole_lon_deg, pole_lat_deg, azimuth_deg,
                        aperture, res, topology, projection);
    const auto qv = convertJSArrayToNumberVector<double>(quads);
    const auto iv = convertJSArrayToNumberVector<double>(is);
    const auto jv = convertJSArrayToNumberVector<double>(js);
    std::vector<dggrid::SeqNum> out(qv.size());
    for (std::size_t i = 0; i < qv.size(); i++)
        out[i] = dggrid::q2DIToSeqNum(p, static_cast<uint64_t>(qv[i]),
                                       static_cast<int64_t>(iv[i]),
                                       static_cast<int64_t>(jv[i]));
    return seqNumArray(out);
}

// ===========================================================================
// Utilities
// ===========================================================================

std::string getExceptionMessage(intptr_t exceptionPtr)
{
    return std::string(reinterpret_cast<std::exception*>(exceptionPtr)->what());
}

val test(val coordinates_x_deg, val coordinates_y_deg)
{
    emscripten::val a = std::move(coordinates_x_deg);
    const std::vector<double> xVec = convertJSArrayToNumberVector<double>(a);
    const std::vector<double> yVec = convertJSArrayToNumberVector<double>(coordinates_y_deg);
    std::vector<double> newVector;
    newVector.reserve(xVec.size() + yVec.size());
    newVector.insert(newVector.end(), xVec.begin(), xVec.end());
    newVector.insert(newVector.end(), yVec.begin(), yVec.end());
    return val::array(newVector);
}

// ===========================================================================
// Emscripten bindings
// ===========================================================================

EMSCRIPTEN_BINDINGS(my_module)
{
    register_vector<std::vector<int>>("IntegerVectorVector");
    register_vector<long double>("LongDoubleVector");
    register_vector<std::vector<long double>>("LongDoubleVectorVector");
    register_vector<std::vector<double>>("DoubleVectorVector");
    register_vector<uint64_t>("BigIntegerVector");
    register_vector<int>("IntVector");
    register_vector<double>("DoubleVector");

    // Utilities
    emscripten::function("getExceptionMessage", &getExceptionMessage);
    emscripten::function("test",                &test);

    // Grid statistics
    emscripten::function("nCells",       &nCells);
    emscripten::function("cellAreaKM",   &cellAreaKM);
    emscripten::function("cellDistKM",   &cellDistKM);
    emscripten::function("gridStatCLS",  &gridStatCLS);
    emscripten::function("getResInfo",   &getResInfo);

    // Cell polygon grid
    emscripten::function("SeqNumGrid",   &SeqNumGrid);

    // FROM GEO
    emscripten::function("GEO_to_GEO",     &GEO_to_GEO);
    emscripten::function("GEO_to_PLANE",   &GEO_to_PLANE);
    emscripten::function("GEO_to_PROJTRI", &GEO_to_PROJTRI);
    emscripten::function("GEO_to_Q2DD",    &GEO_to_Q2DD);
    emscripten::function("GEO_to_Q2DI",    &GEO_to_Q2DI);
    emscripten::function("GEO_to_SEQNUM",  &GEO_to_SEQNUM);
    emscripten::function("DgGEO_to_SEQNUM",&DgGEO_to_SEQNUM); // backward compat

    // FROM SEQNUM
    emscripten::function("SEQNUM_to_GEO",    &SEQNUM_to_GEO);
    emscripten::function("SEQNUM_to_PLANE",  &SEQNUM_to_PLANE);
    emscripten::function("SEQNUM_to_PROJTRI",&SEQNUM_to_PROJTRI);
    emscripten::function("SEQNUM_to_Q2DD",   &SEQNUM_to_Q2DD);
    emscripten::function("SEQNUM_to_Q2DI",   &SEQNUM_to_Q2DI);
    emscripten::function("SEQNUM_to_SEQNUM", &SEQNUM_to_SEQNUM);

    // FROM PROJTRI
    emscripten::function("PROJTRI_to_GEO",    &PROJTRI_to_GEO);
    emscripten::function("PROJTRI_to_PLANE",  &PROJTRI_to_PLANE);
    emscripten::function("PROJTRI_to_PROJTRI",&PROJTRI_to_PROJTRI);
    emscripten::function("PROJTRI_to_Q2DD",   &PROJTRI_to_Q2DD);
    emscripten::function("PROJTRI_to_Q2DI",   &PROJTRI_to_Q2DI);
    emscripten::function("PROJTRI_to_SEQNUM", &PROJTRI_to_SEQNUM);

    // FROM Q2DD
    emscripten::function("Q2DD_to_GEO",    &Q2DD_to_GEO);
    emscripten::function("Q2DD_to_PLANE",  &Q2DD_to_PLANE);
    emscripten::function("Q2DD_to_PROJTRI",&Q2DD_to_PROJTRI);
    emscripten::function("Q2DD_to_Q2DD",   &Q2DD_to_Q2DD);
    emscripten::function("Q2DD_to_Q2DI",   &Q2DD_to_Q2DI);
    emscripten::function("Q2DD_to_SEQNUM", &Q2DD_to_SEQNUM);

    // FROM Q2DI
    emscripten::function("Q2DI_to_GEO",    &Q2DI_to_GEO);
    emscripten::function("Q2DI_to_PLANE",  &Q2DI_to_PLANE);
    emscripten::function("Q2DI_to_PROJTRI",&Q2DI_to_PROJTRI);
    emscripten::function("Q2DI_to_Q2DD",   &Q2DI_to_Q2DD);
    emscripten::function("Q2DI_to_Q2DI",   &Q2DI_to_Q2DI);
    emscripten::function("Q2DI_to_SEQNUM", &Q2DI_to_SEQNUM);
}
