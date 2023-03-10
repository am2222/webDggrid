# wasm makefile for webDggrid

TARGET = ./webdggrid.js

SRC = src/test.cpp src/adjlon.cpp src/DgAddressBase.cpp src/DgApSeq.cpp src/DgBase.cpp src/DgBoundedHexC2RF2D.cpp src/DgBoundedHexC3C2RF2D.cpp src/DgBoundedHexC3RF2D.cpp src/DgBoundedIDGG.cpp src/DgBoundedIDGGS.cpp src/DgBoundedRF2D.cpp src/DgBoundedRFBase0.cpp src/DgBoundedRFS2D.cpp src/DgCell.cpp src/DgColor.cpp src/DgConverterBase.cpp src/DgDiscRFS2D.cpp src/DgDistanceBase.cpp src/DgDmdD4Grid2D.cpp src/DgDmdD4Grid2DS.cpp src/DgDmdD8Grid2D.cpp src/DgDmdD8Grid2DS.cpp src/DgDmdIDGG.cpp src/DgDVec2D.cpp src/DgDVec3D.cpp src/DgEllipsoidRF.cpp src/DgGeoSphRF.cpp src/DgGridTopo.cpp src/DgHexC1Grid2D.cpp src/DgHexC2Grid2D.cpp src/DgHexC3Grid2D.cpp src/DgHexGrid2DS.cpp src/DgHexIDGG.cpp src/DgHexIDGGS.cpp src/DgIcosaMap.cpp src/DgIDGGBase.cpp src/DgIDGG.cpp src/DgIDGGS3H.cpp src/DgIDGGS43H.cpp src/DgIDGGS4D.cpp src/DgIDGGS4H.cpp src/DgIDGGS4T.cpp src/DgIDGGSBase.cpp src/DgIDGGS.cpp src/DgIDGGutil.cpp src/DgInAIGenFile.cpp src/DgInGDALFile.cpp src/DgInLocTextFile.cpp src/DgInputStream.cpp src/DgInShapefileAtt.cpp src/DgInShapefile.cpp src/DgIVec2D.cpp src/DgIVec3D.cpp src/dglib.cpp src/DgLocation.cpp src/DgLocBase.cpp src/DgLocList.cpp src/DgLocVector.cpp src/DgOutAIGenFile.cpp src/DgOutChildrenFile.cpp src/DgOutGdalFile.cpp src/DgOutGeoJSONFile.cpp src/DgOutKMLfile.cpp src/DgOutLocFile.cpp src/DgOutLocTextFile.cpp src/DgOutNeighborsFile.cpp src/DgOutPRCellsFile.cpp src/DgOutPRPtsFile.cpp src/DgOutPtsText.cpp src/DgOutputStream.cpp src/DgOutRandPtsText.cpp src/DgOutShapefile.cpp src/DgParamList.cpp src/DgPolygon.cpp src/DgProjFuller.cpp src/DgProjGnomonicRF.cpp src/DgProjISEA.cpp src/DgProjTriRF.cpp src/DgRandom.cpp src/DgRFBase.cpp src/DgRFNetwork.cpp src/DgSeriesConverter.cpp src/DgSqrD4Grid2D.cpp src/DgSqrD4Grid2DS.cpp src/DgSqrD8Grid2D.cpp src/DgSqrD8Grid2DS.cpp src/DgSuperfund.cpp src/DgTriGrid2D.cpp src/DgTriGrid2DS.cpp src/DgTriIDGG.cpp src/DgUtil.cpp src/pj_auth.cpp src/pj_mlfn.cpp src/pj_msfn.cpp src/pj_phi2.cpp src/pj_qsfn.cpp src/pj_tsfn.cpp src/dbfopen.c src/safileio.c src/sbnsearch.c src/shpopen.c src/shptree.c src/util.cpp

CFLAGS = -Isrc 
LDFLAGS = 
JSFLAGS = -s ALLOW_MEMORY_GROWTH=1 -s WASM=1 -s BINARYEN_ASYNC_COMPILATION=0  -s "EXPORTED_RUNTIME_METHODS=['ccall', 'cwrap', 'setValue']" 

# DEBUGFLAGS = -g4 --source-map-base "http://localhost:8080/path/to/location/with/wasm/sourcemap/"

$(TARGET): $(OBJECTS)
	$(CC) $(CFLAGS) $(LDFLAGS) $(JSFLAGS) -o $@ $(SRC)
	# emmake complains about `.` characters in the `EXPORT_NAME`, so we add them manually...
	# sed -i 's/AudioWorkletGlobalScope_WAM_DX7/AudioWorkletGlobalScope\.WAM\.DX7/g' $(TARGET)
	# node encode-wasm.js dx7.wasm

dist:
	cp webdggrid.js ../dist/wasm/
	cp webdggrid.wasm.js ../dist/wasm/