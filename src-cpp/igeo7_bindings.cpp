// ---------------------------------------------------------------------------
// Emscripten bindings for the IGEO7/Z7 hexagonal hierarchical index.
//
// Wraps the upstream Z7 C++ core library (from allixender/igeo7_duckdb) so
// every `igeo7_*` scalar function exposed by the DuckDB extension is callable
// from JavaScript. These are stateless bit-level operations on a packed
// uint64_t — no DGGS configuration is required.
//
// Bit layout (MSB → LSB):
//   [63:60]  base cell  (4 bits, 0-11)
//   [59:57]  digit  1   (3 bits, 0-6; 7 = padding/unused slot)
//   [56:54]  digit  2
//   ...
//   [ 2: 0]  digit 20   (3 bits)
// ---------------------------------------------------------------------------

#include <emscripten/bind.h>

#include "z7/library.h"
#include "auth/authalic.hpp"

#include <array>
#include <cstdint>
#include <limits>
#include <string>

using namespace emscripten;

// Shared, stateless Z7 configuration.
static const Z7::Z7Configuration DEFAULT_CONFIG{};

// ---------------------------------------------------------------------------
// igeo7_get_resolution(UBIGINT) → INTEGER
// ---------------------------------------------------------------------------
static int32_t igeo7_get_resolution(uint64_t raw) {
    Z7::Z7Index idx(raw);
    return idx.resolution();
}

// ---------------------------------------------------------------------------
// igeo7_get_base_cell(UBIGINT) → UTINYINT
// ---------------------------------------------------------------------------
static int igeo7_get_base_cell(uint64_t raw) {
    Z7::Z7Index idx(raw);
    return static_cast<int>(idx.hierarchy.base);
}

// ---------------------------------------------------------------------------
// igeo7_get_digit(UBIGINT, INTEGER) → UTINYINT
// Returns 7 for out-of-range positions (matches DuckDB extension).
// ---------------------------------------------------------------------------
static int igeo7_get_digit(uint64_t raw, int32_t pos) {
    if (pos < 1 || pos > 20) return 7;
    Z7::Z7Index idx(raw);
    return static_cast<int>(*idx[static_cast<uint64_t>(pos)]);
}

// ---------------------------------------------------------------------------
// igeo7_parent(UBIGINT) → UBIGINT   — go one level up
// ---------------------------------------------------------------------------
static uint64_t igeo7_parent(uint64_t raw) {
    Z7::Z7Index idx(raw);
    int res = idx.resolution();
    int target = res > 0 ? res - 1 : 0;
    Z7::Z7Index parent;
    parent.hierarchy.base = idx.hierarchy.base;
    for (int i = 1; i <= target; i++) {
        parent[i] = *idx[i];
    }
    for (int i = target + 1; i <= 20; i++) {
        parent[i] = 7;
    }
    return parent.index;
}

// ---------------------------------------------------------------------------
// igeo7_parent_at(UBIGINT, INTEGER) → UBIGINT   — ancestor at a given resolution
// Clamps `resolution` to [0, 20].
// ---------------------------------------------------------------------------
static uint64_t igeo7_parent_at(uint64_t raw, int32_t resolution) {
    if (resolution < 0) resolution = 0;
    if (resolution > 20) resolution = 20;
    Z7::Z7Index idx(raw);
    Z7::Z7Index parent;
    parent.hierarchy.base = idx.hierarchy.base;
    for (int i = 1; i <= resolution; i++) {
        parent[i] = *idx[i];
    }
    for (int i = resolution + 1; i <= 20; i++) {
        parent[i] = 7;
    }
    return parent.index;
}

// ---------------------------------------------------------------------------
// igeo7_to_string(UBIGINT) → VARCHAR      — compact form (stops before first 7)
// ---------------------------------------------------------------------------
static std::string igeo7_to_string(uint64_t raw) {
    Z7::Z7Index idx(raw);
    return idx.str();
}

// ---------------------------------------------------------------------------
// igeo7_from_string(VARCHAR) → UBIGINT
// ---------------------------------------------------------------------------
static uint64_t igeo7_from_string(const std::string& s) {
    Z7::Z7Index idx(s);
    return idx.index;
}

// ---------------------------------------------------------------------------
// igeo7_get_neighbours(UBIGINT) → UBIGINT[6]
// Invalid neighbours (e.g., pentagon exclusion) are UINT64_MAX.
// ---------------------------------------------------------------------------
static val igeo7_get_neighbours(uint64_t raw) {
    Z7::Z7Index idx(raw);
    auto neighbours = Z7::neighbors(idx, DEFAULT_CONFIG);
    std::vector<uint64_t> out(6);
    for (int i = 0; i < 6; i++) out[i] = neighbours[i].index;
    return val::array(out);
}

// ---------------------------------------------------------------------------
// igeo7_get_neighbour(UBIGINT, INTEGER) → UBIGINT
// `direction` must be 1-6; otherwise returns UINT64_MAX.
// ---------------------------------------------------------------------------
static uint64_t igeo7_get_neighbour(uint64_t raw, int32_t direction) {
    if (direction < 1 || direction > 6) {
        return std::numeric_limits<uint64_t>::max();
    }
    Z7::Z7Index idx(raw);
    auto neighbours = Z7::neighbors(idx, DEFAULT_CONFIG);
    return neighbours[static_cast<size_t>(direction - 1)].index;
}

// ---------------------------------------------------------------------------
// igeo7_first_non_zero(UBIGINT) → INTEGER
// ---------------------------------------------------------------------------
static int32_t igeo7_first_non_zero(uint64_t raw) {
    Z7::Z7Index idx(raw);
    return static_cast<int32_t>(Z7::first_non_zero(idx));
}

// ---------------------------------------------------------------------------
// igeo7_is_valid(UBIGINT) → BOOLEAN
// ---------------------------------------------------------------------------
static bool igeo7_is_valid(uint64_t raw) {
    return raw != std::numeric_limits<uint64_t>::max();
}

// ---------------------------------------------------------------------------
// igeo7_encode(base, d1..d20) → UBIGINT
//
// Pack a base cell (0-11) and exactly 20 three-bit digit slots (0-7) into
// the canonical 64-bit Z7 index. Field values are masked internally so
// callers do not need to range-check.
// ---------------------------------------------------------------------------
static uint64_t igeo7_encode(
    int base,
    int d1, int d2, int d3, int d4, int d5,
    int d6, int d7, int d8, int d9, int d10,
    int d11, int d12, int d13, int d14, int d15,
    int d16, int d17, int d18, int d19, int d20)
{
    static constexpr int shifts[20] = {
        57, 54, 51, 48, 45, 42, 39, 36, 33, 30,
        27, 24, 21, 18, 15, 12,  9,  6,  3,  0
    };
    const int digits[20] = {
        d1, d2, d3, d4, d5, d6, d7, d8, d9, d10,
        d11, d12, d13, d14, d15, d16, d17, d18, d19, d20
    };
    uint64_t packed = static_cast<uint64_t>(base & 0x0F) << 60;
    for (int k = 0; k < 20; k++) {
        packed |= static_cast<uint64_t>(digits[k] & 0x07) << shifts[k];
    }
    return packed;
}

// ---------------------------------------------------------------------------
// igeo7_geo_to_authalic(double) → double  — geodetic latitude → authalic
// igeo7_authalic_to_geo(double) → double  — authalic latitude → geodetic
// (DuckDB extension exposes a GEOMETRY-walking variant; in WASM we bind the
//  scalar core and let JS callers walk GeoJSON.)
// ---------------------------------------------------------------------------
static double igeo7_geo_to_authalic(double phi_deg) {
    return auth::geodetic_to_authalic(phi_deg);
}

static double igeo7_authalic_to_geo(double xi_deg) {
    return auth::authalic_to_geodetic(xi_deg);
}

// ---------------------------------------------------------------------------
// Bindings
// ---------------------------------------------------------------------------
EMSCRIPTEN_BINDINGS(igeo7_module) {
    emscripten::function("igeo7_get_resolution", &igeo7_get_resolution);
    emscripten::function("igeo7_get_base_cell",  &igeo7_get_base_cell);
    emscripten::function("igeo7_get_digit",      &igeo7_get_digit);
    emscripten::function("igeo7_parent",         &igeo7_parent);
    emscripten::function("igeo7_parent_at",      &igeo7_parent_at);
    emscripten::function("igeo7_to_string",      &igeo7_to_string);
    emscripten::function("igeo7_from_string",    &igeo7_from_string);
    emscripten::function("igeo7_get_neighbours", &igeo7_get_neighbours);
    emscripten::function("igeo7_get_neighbour",  &igeo7_get_neighbour);
    emscripten::function("igeo7_first_non_zero", &igeo7_first_non_zero);
    emscripten::function("igeo7_is_valid",       &igeo7_is_valid);
    emscripten::function("igeo7_encode",         &igeo7_encode);
    emscripten::function("igeo7_geo_to_authalic", &igeo7_geo_to_authalic);
    emscripten::function("igeo7_authalic_to_geo", &igeo7_authalic_to_geo);
}
