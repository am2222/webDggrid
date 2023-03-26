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

// EMSCRIPTEN_KEEPALIVE
// int start()
// {
//   dglib::GridThing gt(0, 0, 0, 3, 4, "HEXAGON", "ISEA");
//   double cells = gt.nCells(3);
//   printf("hello, world!\n");
//   return cells;
// }

// a=new Module.DoubleVectorVector()
// b= new Module.DoubleVector()
// b.push_back(0)
// b.push_back(0)
// a.push_back(b)
// Module.DgGEO_to_SEQNUM(0,0,0,3,10,'HEXAGON','ISEA',a)
std::vector<uint64_t> DgGEO_to_SEQNUM(
    double pole_lon_deg,
    double pole_lat_deg,
    double azimuth_deg,
    unsigned int aperture,
    int res,
    std::string topology,
    std::string projection,
    std::vector<std::vector<double>> coordinates_deg)
{

  dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

  std::vector<uint64_t> seqnum(coordinates_deg.size());
  for (unsigned int i = 0; i < coordinates_deg.size(); i++)
  {
    std::vector<double> point =coordinates_deg.at(i);
    printf("Decimals: %d \n", point.at(0));
    auto in = dgt.inGEO(point.at(0), point.at(1));
    dgt.outSEQNUM(in, seqnum.at(i));
  }
  return seqnum;
}

long double testuint(double pole_lon_deg)
{
  //  return 2^64;
  long double newvalue = static_cast<long double>(pole_lon_deg);
  return newvalue;
  //  std::transform(intVec.begin(), intVec.end(), doubleVec.begin(), [](int x) { return (double)x;});
}

std::vector<int> test2(std::vector<double> pole_lon_deg)
{
  //  return 2^64;
  // long double newvalue = static_cast<long double>(pole_lon_deg);
  std::vector<int> fl;

  std::transform(pole_lon_deg.begin(), pole_lon_deg.end(), std::back_inserter(fl), [](double x)
                 { return static_cast<int>(x); });
  return fl;
  //  std::transform(intVec.begin(), intVec.end(), doubleVec.begin(), [](int x) { return (double)x;});
}

std::vector<double> test3(double pole_lon_deg)
{
  std::vector<double> v(10, 1.5);
  return v;
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
  emscripten::function("testuint", &testuint);
  emscripten::function("test2", &test2);
  emscripten::function("test3", &test3);
  // emscripten::function("_start", &start);
  // emscripten::function("test4", &test4);
}