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

#include <cstdint>
#include <memory>
#include <string>
#include <vector>

using namespace emscripten;

EMSCRIPTEN_KEEPALIVE
int main()
{
  auto p = dggrid::construct("ISEA", 3, "HEXAGON", 4, 0.0, 58.28252559, 11.25);
  double cells = static_cast<double>(dggrid::getRes(p)[4].cells);
  printf("hello, world!\n");
  return static_cast<int>(cells);
}

double nCells(double pole_lon_deg,
              double pole_lat_deg,
              double azimuth_deg,
              unsigned int aperture,
              int res,
              std::string topology,
              std::string projection)
{
  auto p = dggrid::construct(projection, aperture, topology, res,
                              azimuth_deg, pole_lat_deg, pole_lon_deg);
  return static_cast<double>(dggrid::getRes(p)[static_cast<std::size_t>(res)].cells);
}

double cellAreaKM(double pole_lon_deg,
                  double pole_lat_deg,
                  double azimuth_deg,
                  unsigned int aperture,
                  int res,
                  std::string topology,
                  std::string projection)
{
  auto p = dggrid::construct(projection, aperture, topology, res,
                              azimuth_deg, pole_lat_deg, pole_lon_deg);
  return dggrid::getRes(p)[static_cast<std::size_t>(res)].area_km;
}

double cellDistKM(double pole_lon_deg,
                  double pole_lat_deg,
                  double azimuth_deg,
                  unsigned int aperture,
                  int res,
                  std::string topology,
                  std::string projection)
{
  auto p = dggrid::construct(projection, aperture, topology, res,
                              azimuth_deg, pole_lat_deg, pole_lon_deg);
  return dggrid::getRes(p)[static_cast<std::size_t>(res)].spacing_km;
}

double gridStatCLS(std::string projection, std::string topology,
                   int aperture, int res)
{
  auto p = dggrid::construct(projection, static_cast<unsigned int>(aperture),
                              topology, res, 0.0, 58.28252559, 11.25);
  return dggrid::getRes(p)[static_cast<std::size_t>(res)].cls_km;
}

// ---------------------------------------------------------------------------
// cellVertices — build a closed geographic polygon ring for one cell.
// Uses DGGRID v8 DgIDGGBase::setVertices + DgCell geo conversion.
// Returns [lon0,lat0, lon1,lat1, ..., lon0,lat0].
// ---------------------------------------------------------------------------
static std::vector<double> cellVertices(
    const DgIDGGBase   &dgg,
    const DgBoundedIDGG &bndRF,
    uint64_t sn)
{
    // seqnum → Q2DICoord → DgLocation in Q2DI (dgg) frame
    DgQ2DICoord q2di = bndRF.addFromSeqNum(
        static_cast<unsigned long long int>(sn));
    std::unique_ptr<DgLocation> loc(dgg.makeLocation(q2di));

    // Polygon in Q2DI frame
    DgPolygon verts(dgg);
    dgg.setVertices(*loc, verts, 0);

    // DgCell constructor converts both node and polygon to the given RF.
    // Passing geoRF converts Q2DI vertices into geographic coordinates.
    const std::string label = std::to_string(sn);
    DgCell cell(dgg.geoRF(), label, *loc, new DgPolygon(verts));

    const DgPolygon  &reg   = cell.region();
    const DgGeoSphRF &geoRF = dgg.geoRF();
    const int n = reg.size();

    std::vector<double> result;
    result.reserve(static_cast<std::size_t>((n + 1) * 2));
    for (int i = 0; i < n + 1; i++) {
        const DgGeoCoord *c = geoRF.getAddress(reg[i % n]);
        result.push_back(static_cast<double>(c->lonDegs()));
        result.push_back(static_cast<double>(c->latDegs()));
    }
    return result;
}

val SeqNumGrid(
  const double pole_lon_deg,
  const double pole_lat_deg,
  const double azimuth_deg,
  const unsigned int aperture,
  const int res,
  const std::string topology,
  const std::string projection,
  val seqnum
){
  auto p = dggrid::construct(projection, aperture, topology, res,
                              azimuth_deg, pole_lat_deg, pole_lon_deg);
  const std::vector<uint64_t> seqnumVector =
      convertJSArrayToNumberVector<uint64_t>(seqnum);

  // Build a temporary IDGGS to access DgIDGGBase and DgBoundedIDGG.
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

  const DgIDGGBase   &dgg   = idggs->idggBase(res);
  const DgBoundedIDGG &bndRF = dgg.bndRF();

  std::vector<double> counts;
  std::vector<double> x;
  std::vector<double> y;

  for (const auto sn : seqnumVector) {
    auto verts = cellVertices(dgg, bndRF, sn);
    // verts is [lon0,lat0, lon1,lat1, ..., lon0,lat0]
    const unsigned int vertexes =
        static_cast<unsigned int>(verts.size() / 2);
    counts.push_back(static_cast<double>(vertexes));
    for (std::size_t i = 0; i < verts.size(); i += 2) {
      x.push_back(verts[i]);
      y.push_back(verts[i + 1]);
    }
  }

  // Result format: [count0, count1, ..., x0_v0, x0_v1, ..., y0_v0, y0_v1, ...]
  std::vector<double> result;
  result.insert(result.end(), counts.begin(), counts.end());
  result.insert(result.end(), x.begin(), x.end());
  result.insert(result.end(), y.begin(), y.end());
  return val::array(result);
}

val DgGEO_to_SEQNUM(
    double pole_lon_deg,
    double pole_lat_deg,
    double azimuth_deg,
    unsigned int aperture,
    int res,
    std::string topology,
    std::string projection,
    val coordinates_x_deg,
    val coordinates_y_deg)
{
  auto p = dggrid::construct(projection, aperture, topology, res,
                              azimuth_deg, pole_lat_deg, pole_lon_deg);
  const std::vector<double> xVec =
      convertJSArrayToNumberVector<double>(coordinates_x_deg);
  const std::vector<double> yVec =
      convertJSArrayToNumberVector<double>(coordinates_y_deg);

  std::vector<uint64_t> seqnum(xVec.size());
  for (unsigned int i = 0; i < xVec.size(); i++)
    seqnum[i] = dggrid::geoToSeqNum(p, xVec[i], yVec[i]);
  return val::array(seqnum);
}

val SEQNUM_to_GEO(
    double pole_lon_deg,
    double pole_lat_deg,
    double azimuth_deg,
    unsigned int aperture,
    int res,
    std::string topology,
    std::string projection,
    val seqnum)
{
  auto p = dggrid::construct(projection, aperture, topology, res,
                              azimuth_deg, pole_lat_deg, pole_lon_deg);
  const std::vector<uint64_t> seqnumVec =
      convertJSArrayToNumberVector<uint64_t>(seqnum);
  const unsigned int inputSize = static_cast<unsigned int>(seqnumVec.size());

  std::vector<double> lon(inputSize), lat(inputSize);
  for (unsigned int i = 0; i < inputSize; i++) {
    auto g  = dggrid::seqNumToGeo(p, seqnumVec[i]);
    lon[i] = g.lon_deg;
    lat[i] = g.lat_deg;
  }
  lon.insert(lon.end(), lat.begin(), lat.end());
  return val::array(lon);
}

val GEO_to_GEO(
    double pole_lon_deg,
    double pole_lat_deg,
    double azimuth_deg,
    unsigned int aperture,
    int res,
    std::string topology,
    std::string projection,
    val coordinates_x_deg,
    val coordinates_y_deg)
{
  auto p = dggrid::construct(projection, aperture, topology, res,
                              azimuth_deg, pole_lat_deg, pole_lon_deg);
  const std::vector<double> xVec =
      convertJSArrayToNumberVector<double>(coordinates_x_deg);
  const std::vector<double> yVec =
      convertJSArrayToNumberVector<double>(coordinates_y_deg);
  const unsigned int inputSize = static_cast<unsigned int>(xVec.size());

  std::vector<double> xOut(inputSize), yOut(inputSize);
  for (unsigned int i = 0; i < inputSize; i++) {
    auto g   = dggrid::geoToGeo(p, xVec[i], yVec[i]);
    xOut[i] = g.lon_deg;
    yOut[i] = g.lat_deg;
  }
  xOut.insert(xOut.end(), yOut.begin(), yOut.end());
  return val::array(xOut);
}

val test(val coordinates_x_deg, val coordinates_y_deg)
{
  emscripten::val a = std::move(coordinates_x_deg);

  const std::vector<double> xVec = convertJSArrayToNumberVector<double>(a);
  const std::vector<double> yVec =
      convertJSArrayToNumberVector<double>(coordinates_y_deg);

  std::vector<double> newVector;
  newVector.reserve(xVec.size() + yVec.size());
  newVector.insert(newVector.end(), xVec.begin(), xVec.end());
  newVector.insert(newVector.end(), yVec.begin(), yVec.end());
  return val::array(newVector);
}

std::string getExceptionMessage(intptr_t exceptionPtr)
{
  return std::string(reinterpret_cast<std::exception*>(exceptionPtr)->what());
}

EMSCRIPTEN_BINDINGS(my_module)
{
  register_vector<std::vector<int>>("IntegerVectorVector");
  register_vector<long double>("LongDoubleVector");
  register_vector<std::vector<long double>>("LongDoubleVectorVector");
  register_vector<std::vector<double>>("DoubleVectorVector");
  register_vector<uint64_t>("BigIntegerVector");
  register_vector<int>("IntVector");
  register_vector<double>("DoubleVector");
  emscripten::function("getExceptionMessage", &getExceptionMessage);
  emscripten::function("DgGEO_to_SEQNUM", &DgGEO_to_SEQNUM);
  emscripten::function("SEQNUM_to_GEO", &SEQNUM_to_GEO);
  emscripten::function("GEO_to_GEO", &GEO_to_GEO);
  emscripten::function("SeqNumGrid", &SeqNumGrid);
  emscripten::function("nCells", &nCells);
  emscripten::function("cellAreaKM", &cellAreaKM);
  emscripten::function("cellDistKM", &cellDistKM);
  emscripten::function("gridStatCLS", &gridStatCLS);
  emscripten::function("test", &test);
}
