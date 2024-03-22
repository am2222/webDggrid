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

double gridStatCLS(std::string projection, std::string topology, int aperture, int res)
{
  dglib::GridThing gt(0, 0, 0, aperture, res, topology, projection);
  return gt.cls(res);
}

// Rcpp::List GlobalGrid(
//   const double pole_lon_deg,
//   const double pole_lat_deg,
//   const double azimuth_deg,
//   const unsigned int aperture,
//   const int res,
//   const std::string topology,
//   const std::string projection
// ){
//   dglib::GlobalGridGenerator ggg(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   std::vector<double> x;
//   std::vector<double> y;
//   std::vector<double> seqnum;

//   while(ggg.good()){
//     std::vector<long double> tempx, tempy;
//     const auto sn = ggg(tempx,tempy);
//     x.insert(x.end(),tempx.begin(),tempx.end());
//     y.insert(y.end(),tempy.begin(),tempy.end());
//     for(unsigned int i=0;i<tempx.size();i++)
//       seqnum.push_back(sn);
//   }

//   return Rcpp::List::create(
//     Rcpp::Named("x")      = Rcpp::wrap(x),
//     Rcpp::Named("y")      = Rcpp::wrap(y),
//     Rcpp::Named("seqnum") = Rcpp::wrap(seqnum)
//   );
// }

// Rcpp::List SeqNumGrid(
//   const double pole_lon_deg,
//   const double pole_lat_deg,
//   const double azimuth_deg,
//   const unsigned int aperture,
//   const int res,
//   const std::string topology,
//   const std::string projection,
//   val seqnums
// ){
//   const std::vector<uint64_t> &cseqnums = convertJSArrayToNumberVector<uint64_t>(seqnums);

//   dglib::SeqNumGridGenerator sngg(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection, cseqnums);

//   std::vector<double> x;
//   std::vector<double> y;
//   std::vector<double> seqnum;

//   while(sngg.good()){
//     std::vector<long double> tempx, tempy;
//     const auto sn = sngg(tempx,tempy);
//     x.insert(x.end(),tempx.begin(),tempx.end());
//     y.insert(y.end(),tempy.begin(),tempy.end());
//     for(unsigned int i=0;i<tempx.size();i++)
//       seqnum.push_back(sn);
//   }

//   return Rcpp::List::create(
//     Rcpp::Named("x")      = Rcpp::wrap(x),
//     Rcpp::Named("y")      = Rcpp::wrap(y),
//     Rcpp::Named("seqnum") = Rcpp::wrap(seqnum)
//   );
// }

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
  dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

  const std::vector<uint64_t> &seqnumVector = convertJSArrayToNumberVector<uint64_t>(seqnum);
  const unsigned int  inputSize= seqnumVector.size();

  std::vector<long double> xVectorDouble(inputSize);
  std::vector<long double> yVectorDouble(inputSize);
  for (unsigned int i = 0; i < inputSize; i++)
  {
    auto in = dgt.inSEQNUM(seqnumVector.at(i));
    dgt.outGEO(in, xVectorDouble.at(i), yVectorDouble.at(i));
  }
  xVectorDouble.insert(std::end(xVectorDouble), std::begin(yVectorDouble), std::end(yVectorDouble));
  std::vector<double> converted_values;

  std::transform(xVectorDouble.begin(), xVectorDouble.end(), std::back_inserter(converted_values), [](const double value)
  { 
      return static_cast<double>(value); 
  });

  return val::array(converted_values);
}


val GEO_to_GEO( double pole_lon_deg,
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

  const unsigned int  inputSize= xVectorDouble.size();

  std::vector<long double> xOutVectorDouble(inputSize);
  std::vector<long double> yOutVectorDouble(inputSize);
  for (unsigned int i = 0; i < xVectorDouble.size(); i++)
  {
    auto in = dgt.inGEO(xVectorDouble.at(i), yVectorDouble.at(i));
    dgt.outGEO(in, xOutVectorDouble.at(i), yOutVectorDouble.at(i));
  }

  xOutVectorDouble.insert(std::end(xOutVectorDouble), std::begin(yOutVectorDouble), std::end(yOutVectorDouble));
  std::vector<double> converted_values;

  std::transform(xOutVectorDouble.begin(), xOutVectorDouble.end(), std::back_inserter(converted_values), [](const double value)
  { 
      return static_cast<double>(value); 
  });

  return val::array(converted_values);
}

// void GEO_to_PROJTRI(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_lon_deg, Rcpp::NumericVector in_lat_deg, Rcpp::NumericVector out_tnum, Rcpp::NumericVector out_tx, Rcpp::NumericVector out_ty){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const long double tin_lon_deg = in_lon_deg[i];
//     const long double tin_lat_deg = in_lat_deg[i];
//     uint64_t tout_tnum = out_tnum[i];
//     long double tout_tx = out_tx[i];
//     long double tout_ty = out_ty[i];
//     auto in = dgt.inGEO(tin_lon_deg, tin_lat_deg);
//     dgt.outPROJTRI(in, tout_tnum, tout_tx, tout_ty);
//     out_tnum[i] = tout_tnum;
//     out_tx[i] = tout_tx;
//     out_ty[i] = tout_ty;
//   }
// }

// void GEO_to_Q2DD(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_lon_deg, Rcpp::NumericVector in_lat_deg, Rcpp::NumericVector out_quad, Rcpp::NumericVector out_qx, Rcpp::NumericVector out_qy){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const long double tin_lon_deg = in_lon_deg[i];
//     const long double tin_lat_deg = in_lat_deg[i];
//     uint64_t tout_quad = out_quad[i];
//     long double tout_qx = out_qx[i];
//     long double tout_qy = out_qy[i];
//     auto in = dgt.inGEO(tin_lon_deg, tin_lat_deg);
//     dgt.outQ2DD(in, tout_quad, tout_qx, tout_qy);
//     out_quad[i] = tout_quad;
//     out_qx[i] = tout_qx;
//     out_qy[i] = tout_qy;
//   }
// }

// void GEO_to_Q2DI(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_lon_deg, Rcpp::NumericVector in_lat_deg, Rcpp::NumericVector out_quad, Rcpp::NumericVector out_i, Rcpp::NumericVector out_j){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const long double tin_lon_deg = in_lon_deg[i];
//     const long double tin_lat_deg = in_lat_deg[i];
//     uint64_t tout_quad = out_quad[i];
//     long double tout_i = out_i[i];
//     long double tout_j = out_j[i];
//     auto in = dgt.inGEO(tin_lon_deg, tin_lat_deg);
//     dgt.outQ2DI(in, tout_quad, tout_i, tout_j);
//     out_quad[i] = tout_quad;
//     out_i[i] = tout_i;
//     out_j[i] = tout_j;
//   }
// }

// void GEO_to_SEQNUM(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_lon_deg, Rcpp::NumericVector in_lat_deg, Rcpp::NumericVector out_seqnum){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const long double tin_lon_deg = in_lon_deg[i];
//     const long double tin_lat_deg = in_lat_deg[i];
//     uint64_t tout_seqnum = out_seqnum[i];
//     auto in = dgt.inGEO(tin_lon_deg, tin_lat_deg);
//     dgt.outSEQNUM(in, tout_seqnum);
//     out_seqnum[i] = tout_seqnum;
//   }
// }

// void GEO_to_PLANE(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_lon_deg, Rcpp::NumericVector in_lat_deg, Rcpp::NumericVector out_px, Rcpp::NumericVector out_py){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const long double tin_lon_deg = in_lon_deg[i];
//     const long double tin_lat_deg = in_lat_deg[i];
//     long double tout_px = out_px[i];
//     long double tout_py = out_py[i];
//     auto in = dgt.inGEO(tin_lon_deg, tin_lat_deg);
//     dgt.outPLANE(in, tout_px, tout_py);
//     out_px[i] = tout_px;
//     out_py[i] = tout_py;
//   }
// }

// void PROJTRI_to_GEO(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_tnum, Rcpp::NumericVector in_tx, Rcpp::NumericVector in_ty, Rcpp::NumericVector out_lon_deg, Rcpp::NumericVector out_lat_deg){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_tnum = in_tnum[i];
//     const long double tin_tx = in_tx[i];
//     const long double tin_ty = in_ty[i];
//     long double tout_lon_deg = out_lon_deg[i];
//     long double tout_lat_deg = out_lat_deg[i];
//     auto in = dgt.inPROJTRI(tin_tnum, tin_tx, tin_ty);
//     dgt.outGEO(in, tout_lon_deg, tout_lat_deg);
//     out_lon_deg[i] = tout_lon_deg;
//     out_lat_deg[i] = tout_lat_deg;
//   }
// }

// void PROJTRI_to_PROJTRI(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_tnum, Rcpp::NumericVector in_tx, Rcpp::NumericVector in_ty, Rcpp::NumericVector out_tnum, Rcpp::NumericVector out_tx, Rcpp::NumericVector out_ty){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_tnum = in_tnum[i];
//     const long double tin_tx = in_tx[i];
//     const long double tin_ty = in_ty[i];
//     uint64_t tout_tnum = out_tnum[i];
//     long double tout_tx = out_tx[i];
//     long double tout_ty = out_ty[i];
//     auto in = dgt.inPROJTRI(tin_tnum, tin_tx, tin_ty);
//     dgt.outPROJTRI(in, tout_tnum, tout_tx, tout_ty);
//     out_tnum[i] = tout_tnum;
//     out_tx[i] = tout_tx;
//     out_ty[i] = tout_ty;
//   }
// }

// void PROJTRI_to_Q2DD(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_tnum, Rcpp::NumericVector in_tx, Rcpp::NumericVector in_ty, Rcpp::NumericVector out_quad, Rcpp::NumericVector out_qx, Rcpp::NumericVector out_qy){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_tnum = in_tnum[i];
//     const long double tin_tx = in_tx[i];
//     const long double tin_ty = in_ty[i];
//     uint64_t tout_quad = out_quad[i];
//     long double tout_qx = out_qx[i];
//     long double tout_qy = out_qy[i];
//     auto in = dgt.inPROJTRI(tin_tnum, tin_tx, tin_ty);
//     dgt.outQ2DD(in, tout_quad, tout_qx, tout_qy);
//     out_quad[i] = tout_quad;
//     out_qx[i] = tout_qx;
//     out_qy[i] = tout_qy;
//   }
// }

// void PROJTRI_to_Q2DI(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_tnum, Rcpp::NumericVector in_tx, Rcpp::NumericVector in_ty, Rcpp::NumericVector out_quad, Rcpp::NumericVector out_i, Rcpp::NumericVector out_j){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_tnum = in_tnum[i];
//     const long double tin_tx = in_tx[i];
//     const long double tin_ty = in_ty[i];
//     uint64_t tout_quad = out_quad[i];
//     long double tout_i = out_i[i];
//     long double tout_j = out_j[i];
//     auto in = dgt.inPROJTRI(tin_tnum, tin_tx, tin_ty);
//     dgt.outQ2DI(in, tout_quad, tout_i, tout_j);
//     out_quad[i] = tout_quad;
//     out_i[i] = tout_i;
//     out_j[i] = tout_j;
//   }
// }

// void PROJTRI_to_SEQNUM(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_tnum, Rcpp::NumericVector in_tx, Rcpp::NumericVector in_ty, Rcpp::NumericVector out_seqnum){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_tnum = in_tnum[i];
//     const long double tin_tx = in_tx[i];
//     const long double tin_ty = in_ty[i];
//     uint64_t tout_seqnum = out_seqnum[i];
//     auto in = dgt.inPROJTRI(tin_tnum, tin_tx, tin_ty);
//     dgt.outSEQNUM(in, tout_seqnum);
//     out_seqnum[i] = tout_seqnum;
//   }
// }

// void PROJTRI_to_PLANE(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_tnum, Rcpp::NumericVector in_tx, Rcpp::NumericVector in_ty, Rcpp::NumericVector out_px, Rcpp::NumericVector out_py){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_tnum = in_tnum[i];
//     const long double tin_tx = in_tx[i];
//     const long double tin_ty = in_ty[i];
//     long double tout_px = out_px[i];
//     long double tout_py = out_py[i];
//     auto in = dgt.inPROJTRI(tin_tnum, tin_tx, tin_ty);
//     dgt.outPLANE(in, tout_px, tout_py);
//     out_px[i] = tout_px;
//     out_py[i] = tout_py;
//   }
// }

// void Q2DD_to_GEO(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_quad, Rcpp::NumericVector in_qx, Rcpp::NumericVector in_qy, Rcpp::NumericVector out_lon_deg, Rcpp::NumericVector out_lat_deg){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_quad = in_quad[i];
//     const long double tin_qx = in_qx[i];
//     const long double tin_qy = in_qy[i];
//     long double tout_lon_deg = out_lon_deg[i];
//     long double tout_lat_deg = out_lat_deg[i];
//     auto in = dgt.inQ2DD(tin_quad, tin_qx, tin_qy);
//     dgt.outGEO(in, tout_lon_deg, tout_lat_deg);
//     out_lon_deg[i] = tout_lon_deg;
//     out_lat_deg[i] = tout_lat_deg;
//   }
// }

// void Q2DD_to_PROJTRI(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_quad, Rcpp::NumericVector in_qx, Rcpp::NumericVector in_qy, Rcpp::NumericVector out_tnum, Rcpp::NumericVector out_tx, Rcpp::NumericVector out_ty){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_quad = in_quad[i];
//     const long double tin_qx = in_qx[i];
//     const long double tin_qy = in_qy[i];
//     uint64_t tout_tnum = out_tnum[i];
//     long double tout_tx = out_tx[i];
//     long double tout_ty = out_ty[i];
//     auto in = dgt.inQ2DD(tin_quad, tin_qx, tin_qy);
//     dgt.outPROJTRI(in, tout_tnum, tout_tx, tout_ty);
//     out_tnum[i] = tout_tnum;
//     out_tx[i] = tout_tx;
//     out_ty[i] = tout_ty;
//   }
// }

// void Q2DD_to_Q2DD(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_quad, Rcpp::NumericVector in_qx, Rcpp::NumericVector in_qy, Rcpp::NumericVector out_quad, Rcpp::NumericVector out_qx, Rcpp::NumericVector out_qy){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_quad = in_quad[i];
//     const long double tin_qx = in_qx[i];
//     const long double tin_qy = in_qy[i];
//     uint64_t tout_quad = out_quad[i];
//     long double tout_qx = out_qx[i];
//     long double tout_qy = out_qy[i];
//     auto in = dgt.inQ2DD(tin_quad, tin_qx, tin_qy);
//     dgt.outQ2DD(in, tout_quad, tout_qx, tout_qy);
//     out_quad[i] = tout_quad;
//     out_qx[i] = tout_qx;
//     out_qy[i] = tout_qy;
//   }
// }

// void Q2DD_to_Q2DI(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_quad, Rcpp::NumericVector in_qx, Rcpp::NumericVector in_qy, Rcpp::NumericVector out_quad, Rcpp::NumericVector out_i, Rcpp::NumericVector out_j){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_quad = in_quad[i];
//     const long double tin_qx = in_qx[i];
//     const long double tin_qy = in_qy[i];
//     uint64_t tout_quad = out_quad[i];
//     long double tout_i = out_i[i];
//     long double tout_j = out_j[i];
//     auto in = dgt.inQ2DD(tin_quad, tin_qx, tin_qy);
//     dgt.outQ2DI(in, tout_quad, tout_i, tout_j);
//     out_quad[i] = tout_quad;
//     out_i[i] = tout_i;
//     out_j[i] = tout_j;
//   }
// }

// void Q2DD_to_SEQNUM(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_quad, Rcpp::NumericVector in_qx, Rcpp::NumericVector in_qy, Rcpp::NumericVector out_seqnum){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_quad = in_quad[i];
//     const long double tin_qx = in_qx[i];
//     const long double tin_qy = in_qy[i];
//     uint64_t tout_seqnum = out_seqnum[i];
//     auto in = dgt.inQ2DD(tin_quad, tin_qx, tin_qy);
//     dgt.outSEQNUM(in, tout_seqnum);
//     out_seqnum[i] = tout_seqnum;
//   }
// }

// void Q2DD_to_PLANE(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_quad, Rcpp::NumericVector in_qx, Rcpp::NumericVector in_qy, Rcpp::NumericVector out_px, Rcpp::NumericVector out_py){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_quad = in_quad[i];
//     const long double tin_qx = in_qx[i];
//     const long double tin_qy = in_qy[i];
//     long double tout_px = out_px[i];
//     long double tout_py = out_py[i];
//     auto in = dgt.inQ2DD(tin_quad, tin_qx, tin_qy);
//     dgt.outPLANE(in, tout_px, tout_py);
//     out_px[i] = tout_px;
//     out_py[i] = tout_py;
//   }
// }

// void Q2DI_to_GEO(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_quad, Rcpp::NumericVector in_i, Rcpp::NumericVector in_j, Rcpp::NumericVector out_lon_deg, Rcpp::NumericVector out_lat_deg){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_quad = in_quad[i];
//     const long double tin_i = in_i[i];
//     const long double tin_j = in_j[i];
//     long double tout_lon_deg = out_lon_deg[i];
//     long double tout_lat_deg = out_lat_deg[i];
//     auto in = dgt.inQ2DI(tin_quad, tin_i, tin_j);
//     dgt.outGEO(in, tout_lon_deg, tout_lat_deg);
//     out_lon_deg[i] = tout_lon_deg;
//     out_lat_deg[i] = tout_lat_deg;
//   }
// }

// void Q2DI_to_PROJTRI(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_quad, Rcpp::NumericVector in_i, Rcpp::NumericVector in_j, Rcpp::NumericVector out_tnum, Rcpp::NumericVector out_tx, Rcpp::NumericVector out_ty){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_quad = in_quad[i];
//     const long double tin_i = in_i[i];
//     const long double tin_j = in_j[i];
//     uint64_t tout_tnum = out_tnum[i];
//     long double tout_tx = out_tx[i];
//     long double tout_ty = out_ty[i];
//     auto in = dgt.inQ2DI(tin_quad, tin_i, tin_j);
//     dgt.outPROJTRI(in, tout_tnum, tout_tx, tout_ty);
//     out_tnum[i] = tout_tnum;
//     out_tx[i] = tout_tx;
//     out_ty[i] = tout_ty;
//   }
// }

// void Q2DI_to_Q2DD(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_quad, Rcpp::NumericVector in_i, Rcpp::NumericVector in_j, Rcpp::NumericVector out_quad, Rcpp::NumericVector out_qx, Rcpp::NumericVector out_qy){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_quad = in_quad[i];
//     const long double tin_i = in_i[i];
//     const long double tin_j = in_j[i];
//     uint64_t tout_quad = out_quad[i];
//     long double tout_qx = out_qx[i];
//     long double tout_qy = out_qy[i];
//     auto in = dgt.inQ2DI(tin_quad, tin_i, tin_j);
//     dgt.outQ2DD(in, tout_quad, tout_qx, tout_qy);
//     out_quad[i] = tout_quad;
//     out_qx[i] = tout_qx;
//     out_qy[i] = tout_qy;
//   }
// }

// void Q2DI_to_Q2DI(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_quad, Rcpp::NumericVector in_i, Rcpp::NumericVector in_j, Rcpp::NumericVector out_quad, Rcpp::NumericVector out_i, Rcpp::NumericVector out_j){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_quad = in_quad[i];
//     const long double tin_i = in_i[i];
//     const long double tin_j = in_j[i];
//     uint64_t tout_quad = out_quad[i];
//     long double tout_i = out_i[i];
//     long double tout_j = out_j[i];
//     auto in = dgt.inQ2DI(tin_quad, tin_i, tin_j);
//     dgt.outQ2DI(in, tout_quad, tout_i, tout_j);
//     out_quad[i] = tout_quad;
//     out_i[i] = tout_i;
//     out_j[i] = tout_j;
//   }
// }

// void Q2DI_to_SEQNUM(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_quad, Rcpp::NumericVector in_i, Rcpp::NumericVector in_j, Rcpp::NumericVector out_seqnum){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_quad = in_quad[i];
//     const long double tin_i = in_i[i];
//     const long double tin_j = in_j[i];
//     uint64_t tout_seqnum = out_seqnum[i];
//     auto in = dgt.inQ2DI(tin_quad, tin_i, tin_j);
//     dgt.outSEQNUM(in, tout_seqnum);
//     out_seqnum[i] = tout_seqnum;
//   }
// }

// void Q2DI_to_PLANE(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_quad, Rcpp::NumericVector in_i, Rcpp::NumericVector in_j, Rcpp::NumericVector out_px, Rcpp::NumericVector out_py){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_quad = in_quad[i];
//     const long double tin_i = in_i[i];
//     const long double tin_j = in_j[i];
//     long double tout_px = out_px[i];
//     long double tout_py = out_py[i];
//     auto in = dgt.inQ2DI(tin_quad, tin_i, tin_j);
//     dgt.outPLANE(in, tout_px, tout_py);
//     out_px[i] = tout_px;
//     out_py[i] = tout_py;
//   }
// }


// void SEQNUM_to_PROJTRI(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_seqnum, Rcpp::NumericVector out_tnum, Rcpp::NumericVector out_tx, Rcpp::NumericVector out_ty){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_seqnum = in_seqnum[i];
//     uint64_t tout_tnum = out_tnum[i];
//     long double tout_tx = out_tx[i];
//     long double tout_ty = out_ty[i];
//     auto in = dgt.inSEQNUM(tin_seqnum);
//     dgt.outPROJTRI(in, tout_tnum, tout_tx, tout_ty);
//     out_tnum[i] = tout_tnum;
//     out_tx[i] = tout_tx;
//     out_ty[i] = tout_ty;
//   }
// }

// void SEQNUM_to_Q2DD(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_seqnum, Rcpp::NumericVector out_quad, Rcpp::NumericVector out_qx, Rcpp::NumericVector out_qy){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_seqnum = in_seqnum[i];
//     uint64_t tout_quad = out_quad[i];
//     long double tout_qx = out_qx[i];
//     long double tout_qy = out_qy[i];
//     auto in = dgt.inSEQNUM(tin_seqnum);
//     dgt.outQ2DD(in, tout_quad, tout_qx, tout_qy);
//     out_quad[i] = tout_quad;
//     out_qx[i] = tout_qx;
//     out_qy[i] = tout_qy;
//   }
// }

// void SEQNUM_to_Q2DI(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_seqnum, Rcpp::NumericVector out_quad, Rcpp::NumericVector out_i, Rcpp::NumericVector out_j){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_seqnum = in_seqnum[i];
//     uint64_t tout_quad = out_quad[i];
//     long double tout_i = out_i[i];
//     long double tout_j = out_j[i];
//     auto in = dgt.inSEQNUM(tin_seqnum);
//     dgt.outQ2DI(in, tout_quad, tout_i, tout_j);
//     out_quad[i] = tout_quad;
//     out_i[i] = tout_i;
//     out_j[i] = tout_j;
//   }
// }

// void SEQNUM_to_SEQNUM(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_seqnum, Rcpp::NumericVector out_seqnum){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_seqnum = in_seqnum[i];
//     uint64_t tout_seqnum = out_seqnum[i];
//     auto in = dgt.inSEQNUM(tin_seqnum);
//     dgt.outSEQNUM(in, tout_seqnum);
//     out_seqnum[i] = tout_seqnum;
//   }
// }

// void SEQNUM_to_PLANE(const long double pole_lon_deg, const long double pole_lat_deg, const long double azimuth_deg, const unsigned int aperture, const int res, const std::string topology, const std::string projection, unsigned int N, Rcpp::NumericVector in_seqnum, Rcpp::NumericVector out_px, Rcpp::NumericVector out_py){
//   dglib::Transformer dgt(pole_lon_deg, pole_lat_deg, azimuth_deg, aperture, res, topology, projection);

//   for(unsigned int i=0;i<N;i++){
//     const uint64_t tin_seqnum = in_seqnum[i];
//     long double tout_px = out_px[i];
//     long double tout_py = out_py[i];
//     auto in = dgt.inSEQNUM(tin_seqnum);
//     dgt.outPLANE(in, tout_px, tout_py);
//     out_px[i] = tout_px;
//     out_py[i] = tout_py;
//   }
// }

// template <typename T>
// void Append(const std::vector<T> &a, const std::vector<T> &b)
// {
//   a.reserve(a.size() + b.size());
//   a.insert(a.end(), b.begin(), b.end());
// }

template <typename T, typename... Args>
void appendVector(vector<T> &v1, vector<T> &v2, Args... args)
{
  v1.insert(v1.end(), v2.begin(), v2.end());
  appendVector(v1, args...);
}

val test(val coordinates_x_deg, val coordinates_y_deg)
{
  emscripten::val a = std::move(coordinates_x_deg);
  emscripten::val b = std::move(coordinates_y_deg);

  const std::vector<double> &xVectorDouble = convertJSArrayToNumberVector<double>(a);
  const std::vector<double> &yVectorDouble = convertJSArrayToNumberVector<double>(coordinates_y_deg);

  std::vector<double> newVector;
  newVector.reserve(xVectorDouble.size() + yVectorDouble.size());
  newVector.insert(newVector.begin(), xVectorDouble.begin(), xVectorDouble.end());
  newVector.insert(xVectorDouble.end(), yVectorDouble.begin(), yVectorDouble.end());
  return val::array(newVector);
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
  emscripten::function("SEQNUM_to_GEO", &SEQNUM_to_GEO);
  emscripten::function("GEO_to_GEO", &GEO_to_GEO);
  emscripten::function("nCells", &nCells);
  emscripten::function("cellAreaKM", &cellAreaKM);
  emscripten::function("cellDistKM", &cellDistKM);
  emscripten::function("gridStatCLS", &gridStatCLS);
  emscripten::function("test", &test);
  // emscripten::function("test2", &test2);
}