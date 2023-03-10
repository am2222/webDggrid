#include "emscripten.h"
#include "dglib.h"


EMSCRIPTEN_KEEPALIVE
int main(){
  dglib::GridThing gt(0,0,0,3,4,"HEXAGON","ISEA");
  gt.nCells(3);
  printf("hello, world!\n");
  return 0;
}

EMSCRIPTEN_KEEPALIVE
void DgGEO_to_SEQNUM(long double pole_lon_deg, long double pole_lat_deg, long double azimuth_deg, unsigned int aperture, int res, std::string topology, std::string projection, const std::vector<long double> &lon_deg, const std::vector<long double> &lat_deg, std::vector<uint64_t> &seqnum){
  dglib::Transformer dgt(pole_lon_deg,pole_lat_deg,azimuth_deg,aperture,res,topology,projection);

  for(unsigned int i=0;i<lon_deg.size();i++){
    auto in = dgt.inGEO(lon_deg.at(i),lat_deg.at(i));
    dgt.outSEQNUM(in, seqnum.at(i));
  }
}