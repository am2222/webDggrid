cmake_minimum_required(VERSION 3.20)
project(webdggrid CXX C)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ── Build options ─────────────────────────────────────────────────────────
option(STANDALONE_WASM "Build as standalone WASM (no JS glue, for Python)" OFF)

# ── DGGRID v8 paths ───────────────────────────────────────────────────────
set(DGGRID_DIR "${CMAKE_SOURCE_DIR}/submodules/DGGRID")

set(DGLIB_INC  "${DGGRID_DIR}/src/lib/dglib/include")
set(DGLIB_LIB  "${DGGRID_DIR}/src/lib/dglib/lib")
set(PROJ4_INC  "${DGGRID_DIR}/src/lib/proj4lib/include")
set(PROJ4_LIB  "${DGGRID_DIR}/src/lib/proj4lib/lib")
# shapefil.h lives at shapelib/include/shapelib/shapefil.h.
# dglib headers use  #include <shapefil.h>       → needs .../include/shapelib
# shapelib .c files use #include "shapelib/shapefil.h" → needs .../include
set(SHAPE_INC  "${DGGRID_DIR}/src/lib/shapelib/include/shapelib"
               "${DGGRID_DIR}/src/lib/shapelib/include")
set(SHAPE_LIB  "${DGGRID_DIR}/src/lib/shapelib/lib")

# ── Source files ──────────────────────────────────────────────────────────
file(GLOB DGLIB_SOURCES  "${DGLIB_LIB}/*.cpp")
file(GLOB PROJ4_SOURCES  "${PROJ4_LIB}/*.cpp")
file(GLOB SHAPE_SOURCES  "${SHAPE_LIB}/*.c")

set(WRAPPER_SOURCES
    "${CMAKE_SOURCE_DIR}/src-cpp/dggrid_transform.cpp"
    "${CMAKE_SOURCE_DIR}/src-cpp/webdggrid.cpp"
)

# ── Target ────────────────────────────────────────────────────────────────
add_executable(libdggrid
    ${DGLIB_SOURCES}
    ${PROJ4_SOURCES}
    ${SHAPE_SOURCES}
    ${WRAPPER_SOURCES}
)

target_include_directories(libdggrid PRIVATE
    "${DGLIB_INC}"
    "${PROJ4_INC}"
    "${SHAPE_INC}"
    "${CMAKE_SOURCE_DIR}/src-cpp"
)

# ── Emscripten-specific configuration ─────────────────────────────────────
if(EMSCRIPTEN)
    # Produce libdggrid.js + libdggrid.wasm (no HTML wrapper)
    set_target_properties(libdggrid PROPERTIES SUFFIX ".js")

    set(EM_LINK_FLAGS
        "-lembind"
        "-sEXPORT_NAME=libdggrid"
        "-sEXPORTED_FUNCTIONS=_main"
        "-sEXPORTED_RUNTIME_METHODS=ccall,cwrap"
        "-sASSERTIONS=0"
        "-sINVOKE_RUN=0"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sWASM=1"
        "-sENVIRONMENT=webview"
        "-sFILESYSTEM=0"
        "-sMINIMAL_RUNTIME=0"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sIGNORE_CLOSURE_COMPILER_ERRORS=0"
        "-sWASM_BIGINT=1"
        "-sBINARYEN_ASYNC_COMPILATION=1"
        "-sDYNAMIC_EXECUTION=0"
    )

    if(STANDALONE_WASM)
        list(APPEND EM_LINK_FLAGS "-sSTANDALONE_WASM=1")
    endif()

    target_link_options(libdggrid PRIVATE ${EM_LINK_FLAGS})

    # Optimisation — Release: -O3, Debug: -O1 with source maps
    target_compile_options(libdggrid PRIVATE
        "$<$<CONFIG:Release>:-O3>"
        "$<$<CONFIG:Debug>:-O1;-gsource-map>"
    )
    target_link_options(libdggrid PRIVATE
        "$<$<CONFIG:Debug>:-gsource-map;--source-map-base ./>"
    )
endif()
