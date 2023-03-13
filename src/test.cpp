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

// extern "C"
// {
// a =1 ; b=2;c=3;d=4
// 0,0,0,3,10,'HEXAGON','ISEA'
// EMSCRIPTEN_KEEPALIVE
std::vector<uint64_t> DgGEO_to_SEQNUM(
    long double pole_lon_deg,
    long double pole_lat_deg,
    long double azimuth_deg,
    unsigned int aperture,
    int res)
{

  printf("Decimals: %d %s", pole_lon_deg);

  dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, "topology", "projection");
  std::string topology;
  std::string projection;
  std::vector<long double> lon_deg;
  std::vector<long double> lat_deg;
  std::vector<uint64_t> seqnum;
  for (unsigned int i = 0; i < lon_deg.size(); i++)
  {
    auto in = dgt.inGEO(lon_deg.at(i), lat_deg.at(i));
    dgt.outSEQNUM(in, seqnum.at(i));
  }
  return seqnum;
}
// }

std::string getExceptionMessage(intptr_t exceptionPtr)
{
  return std::string(reinterpret_cast<std::exception *>(exceptionPtr)->what());
}

EMSCRIPTEN_BINDINGS(my_module)
{
  register_vector<std::vector<int>>("IntegerVectorVector");
  register_vector<long double>("LongDoubleVector");
  register_vector<std::vector<long double>>("LongDoubleVectorVector");
  register_vector<uint64_t>("BigIntegerVector");
  emscripten::function("getExceptionMessage", &getExceptionMessage);
  emscripten::function("DgGEO_to_SEQNUM", &DgGEO_to_SEQNUM);
}