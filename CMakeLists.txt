cmake_minimum_required (VERSION 3.9)

project(dggridR
  LANGUAGES C CXX
)

add_executable(dggridR
src/adjlon.cpp
src/DgAddressBase.cpp
src/DgApSeq.cpp
src/DgBase.cpp
src/DgBoundedHexC2RF2D.cpp
src/DgBoundedHexC3C2RF2D.cpp
src/DgBoundedHexC3RF2D.cpp
src/DgBoundedIDGG.cpp
src/DgBoundedIDGGS.cpp
src/DgBoundedRF2D.cpp
src/DgBoundedRFBase0.cpp
src/DgBoundedRFS2D.cpp
src/DgCell.cpp
src/DgColor.cpp
src/DgConverterBase.cpp
src/DgDiscRFS2D.cpp
src/DgDistanceBase.cpp
src/DgDmdD4Grid2D.cpp
src/DgDmdD4Grid2DS.cpp
src/DgDmdD8Grid2D.cpp
src/DgDmdD8Grid2DS.cpp
src/DgDmdIDGG.cpp
src/DgDVec2D.cpp
src/DgDVec3D.cpp
src/DgEllipsoidRF.cpp
src/DgGeoSphRF.cpp
src/DgGridTopo.cpp
src/DgHexC1Grid2D.cpp
src/DgHexC2Grid2D.cpp
src/DgHexC3Grid2D.cpp
src/DgHexGrid2DS.cpp
src/DgHexIDGG.cpp
src/DgHexIDGGS.cpp
src/DgIcosaMap.cpp
src/DgIDGGBase.cpp
src/DgIDGG.cpp
src/DgIDGGS3H.cpp
src/DgIDGGS43H.cpp
src/DgIDGGS4D.cpp
src/DgIDGGS4H.cpp
src/DgIDGGS4T.cpp
src/DgIDGGSBase.cpp
src/DgIDGGS.cpp
src/DgIDGGutil.cpp
src/DgInAIGenFile.cpp
src/DgInGDALFile.cpp
src/DgInLocTextFile.cpp
src/DgInputStream.cpp
src/DgInShapefileAtt.cpp
src/DgInShapefile.cpp
src/DgIVec2D.cpp
src/DgIVec3D.cpp
src/dglib.cpp
src/DgLocation.cpp
src/DgLocBase.cpp
src/DgLocList.cpp
src/DgLocVector.cpp
src/DgOutAIGenFile.cpp
src/DgOutChildrenFile.cpp
src/DgOutGdalFile.cpp
src/DgOutGeoJSONFile.cpp
src/DgOutKMLfile.cpp
src/DgOutLocFile.cpp
src/DgOutLocTextFile.cpp
src/DgOutNeighborsFile.cpp
src/DgOutPRCellsFile.cpp
src/DgOutPRPtsFile.cpp
src/DgOutPtsText.cpp
src/DgOutputStream.cpp
src/DgOutRandPtsText.cpp
src/DgOutShapefile.cpp
src/DgParamList.cpp
src/DgPolygon.cpp
src/DgProjFuller.cpp
src/DgProjGnomonicRF.cpp
src/DgProjISEA.cpp
src/DgProjTriRF.cpp
src/DgRandom.cpp
src/DgRFBase.cpp
src/DgRFNetwork.cpp
src/DgSeriesConverter.cpp
src/DgSqrD4Grid2D.cpp
src/DgSqrD4Grid2DS.cpp
src/DgSqrD8Grid2D.cpp
src/DgSqrD8Grid2DS.cpp
src/DgSuperfund.cpp
src/DgTriGrid2D.cpp
src/DgTriGrid2DS.cpp
src/DgTriIDGG.cpp
src/DgUtil.cpp
src/pj_auth.cpp
src/pj_mlfn.cpp
src/pj_msfn.cpp
src/pj_phi2.cpp
src/pj_qsfn.cpp
src/pj_tsfn.cpp
src/dbfopen.c
src/safileio.c
src/sbnsearch.c
src/shpopen.c
src/shptree.c
src/util.cpp
src/test.cpp
)


set(CMAKE_BUILD_TYPE Release)
set(BUILD_TYPE "library")

project(dummy-cpp-library VERSION 0.0.1 DESCRIPTION "Dummy C++ library demo that compiles to WebAssembly")
set(CMAKE_CXX_FLAGS_DEBUG "-DLIB_LOG -DDEBUG")




# set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_LINKER_FLAGS_DEBUG} -fno-omit-frame-pointer -fsanitize=address")
target_compile_options(dggridR PRIVATE -Werror -Wall -Wextra -pedantic -Wno-cast-function-type -Wno-unused-parameter $<$<COMPILE_LANGUAGE:CXX>:-Wno-deprecated-copy> -Wstringop-truncation) # -fsanitize=address)
target_include_directories(dggridR)
target_link_directories(dggridR )
target_link_libraries(dggridR)

message(STATUS "Compiling WASM module...")

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_FLAGS "-Wall -Wextra")
set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -g")
set(CMAKE_CXX_FLAGS_RELEASE "-O3")
add_definitions(-DTEST)

set(EXECUTABLE_NAME ${PROJECT_NAME})
set(EXECUTABLE_SOURCE src/wasm.cpp)

add_executable(${EXECUTABLE_NAME} ${EXECUTABLE_SOURCE})
target_include_directories(${EXECUTABLE_NAME} PRIVATE .)
set_target_properties(${EXECUTABLE_NAME} PROPERTIES LINK_FLAGS "-sENVIRONMENT=web -s SINGLE_FILE=1 -s MODULARIZE -s 'EXPORT_NAME=DummyCppLibrary' --bind")

# https://www.ninkovic.dev/blog/2022/an-improved-guide-for-compiling-wasm-with-emscripten-and-embind