#include "emscripten.h"
#include "dggrid_transform.hpp"
#include <emscripten/bind.h>

#include <cstdint>
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

  std::vector<double> x;
  std::vector<double> y;
  std::vector<double> vertexArray;

  for (const auto sn : seqnumVector) {
    // verts is a closed ring: [lon0,lat0, lon1,lat1, ..., lon0,lat0]
    auto verts = dggrid::seqNumToVertices(p, sn);
    const unsigned int vertexes =
        static_cast<unsigned int>(verts.size() / 2);
    seqnum.call<void>("push", vertexes);
    for (std::size_t i = 0; i < verts.size(); i += 2) {
      x.push_back(verts[i]);
      y.push_back(verts[i + 1]);
    }
  }

  vertexArray.insert(std::end(vertexArray), std::begin(x), std::end(x));
  vertexArray.insert(std::end(vertexArray), std::begin(y), std::end(y));
  return val::array(vertexArray);
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
