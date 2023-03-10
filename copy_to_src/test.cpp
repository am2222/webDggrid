#include "emscripten.h"
#include "dglib.h"


EMSCRIPTEN_KEEPALIVE
int main(){
  dglib::GridThing gt(0,0,0,3,4,"HEXAGON","ISEA");
  gt.nCells(3);
  printf("hello, world!\n");
  return 0;
}