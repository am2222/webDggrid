// Implementation notes for hierarchical address types
//
// This document outlines the implementation of VERTEX2DD, ZORDER, Z3, and Z7
// address types for the webDggrid WASM library.
//
// COMPATIBILITY:
// - VERTEX2DD: All grid types
// - ZORDER: Aperture 3 and 4 hexagon grids only (NOT aperture 7)
// - Z3: Aperture 3 hexagon grids only
// - Z7: Aperture 7 hexagon grids only
//
// The DgIDGGBase class provides accessor methods for these RFs:
// - vertexRF() -> const DgVertex2DDRF&
// - zorderRF() -> const DgZOrderRF* (nullable)
// - z3RF() -> const DgZ3RF* (nullable)
// - z7RF() -> const DgZ7RF* (nullable)
//
// These RFs are initialized automatically by DGGRID based on aperture/topology.
// They may be null if not applicable for the current configuration.

// IMPLEMENTATION PLAN:
// 1. Add RF pointers to Transformer struct
// 2. Initialize RFs in buildTransformer() from DgIDGGBase accessors
// 3. Add inX/outX methods to Transformer for each type
// 4. Implement public API: seqNumToX and xToSeqNum for each type
// 5. Add WASM bindings
// 6. Add TypeScript wrappers
// 7. Add tests

// ERROR HANDLING:
// When a hierarchical RF is null (incompatible aperture), throw descriptive error

