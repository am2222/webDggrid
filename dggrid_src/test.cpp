#include "emscripten.h"
#include "dglib.h"
#include <emscripten/bind.h>

using namespace emscripten;

EMSCRIPTEN_KEEPALIVE
int main()
{
  dglib::GridThing gt(0, 0, 0, 3, 4, "HEXAGON", "ISEA");
  double cells = gt.nCells(3);
  printf("hello, world!\n");
  return cells;
}

double nCells(double pole_lon_deg,
              double pole_lat_deg,
              double azimuth_deg,
              unsigned int aperture,
              int res,
              std::string topology,
              std::string projection)
{
  dglib::GridThing gt(pole_lon_deg, pole_lat_deg, azimuth_deg, azimuth_deg, aperture, topology, projection);
  double cells = gt.nCells(res);
  return cells;
}

double cellAreaKM(double pole_lon_deg,
                  double pole_lat_deg,
                  double azimuth_deg,
                  unsigned int aperture,
                  int res,
                  std::string topology,
                  std::string projection)
{
  dglib::GridThing gt(pole_lon_deg, pole_lat_deg, azimuth_deg, azimuth_deg, aperture, topology, projection);
  double cells = gt.cellAreaKM(res);
  return cells;
}

double cellDistKM(double pole_lon_deg,
                  double pole_lat_deg,
                  double azimuth_deg,
                  unsigned int aperture,
                  int res,
                  std::string topology,
                  std::string projection)
{
  dglib::GridThing gt(pole_lon_deg, pole_lat_deg, azimuth_deg, azimuth_deg, aperture, topology, projection);
  double cells = gt.cellDistKM(res);
  return cells;
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
  dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

  const std::vector<double> &xVectorDouble = convertJSArrayToNumberVector<double>(coordinates_x_deg);
  const std::vector<double> &yVectorDouble = convertJSArrayToNumberVector<double>(coordinates_y_deg);

  std::vector<uint64_t> seqnum(xVectorDouble.size());
  for (unsigned int i = 0; i < xVectorDouble.size(); i++)
  {
    auto in = dgt.inGEO(xVectorDouble.at(i), yVectorDouble.at(i));
    dgt.outSEQNUM(in, seqnum.at(i));
  }
  return val::array(seqnum);
}

val test(val coordinates_x_deg, val coordinates_y_deg)
{

  const std::vector<double> &xVectorDouble = convertJSArrayToNumberVector<double>(coordinates_x_deg);
  const std::vector<double> &yVectorDouble = convertJSArrayToNumberVector<double>(coordinates_y_deg);

  std::vector<uint64_t> seqnum(xVectorDouble.size());
  for (unsigned int i = 0; i < xVectorDouble.size(); i++)
  {
    double pointX = xVectorDouble.at(i);
    double pointY = yVectorDouble.at(i);
    uint64_t in = 18446744073709551615ULL;
    seqnum.at(i) = in;
  }
  return val::array(seqnum);
}

val test2()
{

  std::vector<uint64_t> seqnum(500);
  for (unsigned int i = 0; i < 500; i++)
  {

    uint64_t in = 18446744073709551614ULL;
    seqnum.at(i) = in;
  }
  return val::array(seqnum);
}

std::string getExceptionMessage(intptr_t exceptionPtr)
{
  return std::string(reinterpret_cast<std::exception *>(exceptionPtr)->what());
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
  emscripten::function("nCells", &nCells);
  emscripten::function("cellAreaKM", &cellAreaKM);
  emscripten::function("cellDistKM", &cellDistKM);
  emscripten::function("test", &test);
  emscripten::function("test2", &test2);
}