---
layout: home

hero:
  name: "WebDggrid"
  text: "DGGRID in the Browser"
  tagline: A WebAssembly wrapper for the DGGRID C++ library — generate and query Discrete Global Grid Systems (DGGS) directly in the browser or Node.js.
  actions:
    - theme: brand
      text: Getting Started
      link: /getting-started
    - theme: alt
      text: API Reference
      link: /api/
    - theme: alt
      text: Live Demo
      link: /example.html

features:
  - title: WebAssembly Powered
    details: The full DGGRID C++ library compiled to WASM — no server required. Runs in any modern browser or Node.js environment.
  - title: Multiple Grid Topologies
    details: Supports HEXAGON, TRIANGLE, SQUARE, and DIAMOND topologies with ISEA and FULLER projections at any resolution.
  - title: GeoJSON Ready
    details: Convert coordinates to DGGS cell IDs and back, or export entire grid regions directly as GeoJSON FeatureCollections for use with mapping libraries.
---
