import ThreeView, { Color } from '@navaramap/three';
import { DefaultPlugin } from '@navaramap/three-default-plugin';
// the repo's built library (run `yarn build` at the repo root first)
import { Webdggrid, dggsPreset } from '../../dist/webdggrid.js';

const $ = (id) => document.getElementById(id);
const status = (s) => { $('status').textContent = s; };

// ── webdggrid ──────────────────────────────────────────────────────────────
const dggs = await Webdggrid.load();

// How a cell ring relates to the poles:
// - 'contains': its longitudes, unwrapped edge by edge, sweep a full turn
//   instead of returning to where they started, so the ring winds around a pole
// - 'edge':     an edge joins two points 180° of longitude apart, so its great
//   circle runs straight over the pole (the pole is on the cell boundary)
function poleRelation(ring) {
  let sweep = 0, overPole = false;
  for (let i = 1; i < ring.length; i++) {
    let d = ring[i][0] - ring[i - 1][0];
    if (Math.abs(Math.abs(d) - 180) < 1e-6) overPole = true;
    if (d > 180) d -= 360; else if (d < -180) d += 360;
    sweep += d;
  }
  if (overPole) return 'edge';
  return Math.abs(sweep) > 180 ? 'contains' : null;
}

function buildCells({ preset, res, unwrap, densification }) {
  dggs.setDggs(dggsPreset(preset), res);
  const n = dggs.nCells(res);
  if (n > 20000) throw new Error(`${n} cells at res ${res} — pick a lower resolution`);
  const ids = Array.from({ length: n }, (_, i) => BigInt(i + 1));
  const rings = dggs.sequenceNumToGrid(ids, res, { unwrap, densification });
  const normal = [], polar = [];
  rings.forEach((ring, i) => {
    const pole = poleRelation(ring);
    const isPolar = pole !== null;
    const f = {
      type: 'Feature',
      // Navara serialises properties, so keep them JSON-safe (no BigInt)
      properties: { id: ids[i].toString(), pole: pole ?? 'none', vertices: ring.length - 1 },
      geometry: { type: 'Polygon', coordinates: [ring] },
    };
    (isPolar ? polar : normal).push(f);
  });
  return { n, normal, polar };
}

// ── Navara ─────────────────────────────────────────────────────────────────
const view = new ThreeView({ container: $('map') });
view.addPlugin(new DefaultPlugin());
await view.init();

// vector polygons not draped on the ground are lit; give them flat light
view.addLight({ ambient: { intensity: 1 } });

const osm = view.addSource({
  type: 'raster-tile',
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  maxZoom: 19,
});
view.addLayer({ type: 'raster', source: osm });
view.attribution?.add([{
  attribution: '© OpenStreetMap contributors',
  attributionUrl: 'https://www.openstreetmap.org/copyright',
}]);

const color = (hex) => new Color().setStyle(hex);
let current = []; // [{ layer, source }]

function clearCells() {
  for (const { layer, source } of current) { layer.delete(); source.delete(); }
  current = [];
}

function addCells(features, fill, outline, mode) {
  if (!features.length) return;
  const draped = mode === 'draped';
  const source = view.addSource({
    type: 'geojson',
    data: { type: 'FeatureCollection', features },
  });
  const layer = view.addLayer({
    type: 'vector',
    source,
    polygon: {
      color: color(fill),
      transparent: true,
      opacity: 0.45,
      clampToGround: draped,
      tiled: draped,
      // outlines only exist on the 3D path
      outlineShow: !draped,
      outlineColor: color(outline),
      outlineWidth: 1.5,
      // lift the 3D polygons a little so the basemap never pokes through
      height: draped ? undefined : 2000,
    },
    // draped polygons get no outline, so draw the rings as lines instead
    polyline: draped ? {
      geometryTypes: ['polygon'],
      color: color(outline),
      width: 1.5,
      clampToGround: true,
    } : undefined,
  });
  current.push({ layer, source });
}

function render() {
  const opts = {
    preset: $('preset').value,
    res: Number($('res').value),
    unwrap: $('unwrap').checked,
    densification: Number($('dens').value),
  };
  const mode = $('mode').value;
  const t0 = performance.now();
  try {
    const { n, normal, polar } = buildCells(opts);
    clearCells();
    if (!$('polarOnly').checked) addCells(normal, '#3b82f6', '#93c5fd', mode);
    addCells(polar, '#f59e0b', '#fde68a', mode);
    const onEdge = polar.filter((f) => f.properties.pole === 'edge').length;
    status(`${opts.preset} res ${opts.res}: ${n} cells; polar: ${polar.length - onEdge} contain a pole, ` +
      `${onEdge} with an edge over a pole\n` +
      `path: ${mode}, unwrap: ${opts.unwrap}, densify: ${opts.densification}\n` +
      `built in ${(performance.now() - t0).toFixed(0)} ms`);
  } catch (e) {
    status(`error: ${e.message}`);
    console.error(e);
  }
}

view.on('featureClick', (info) => {
  const p = info?.properties;
  const why = { contains: ' (contains a pole)', edge: ' (an edge runs over a pole)' }[p?.pole] ?? '';
  $('picked').textContent = p ? `cell ${p.id}${why}, ${p.vertices} vertices` : '';
});

const flyPole = (lat) => view.flyTo({ lng: 0, lat, height: 9_000_000, heading: 0, pitch: -90, roll: 0 }, { duration: 1500 });
$('north').onclick = () => flyPole(90);
$('south').onclick = () => flyPole(-90);
$('world').onclick = () => view.flyTo({ lng: 10, lat: 30, height: 20_000_000, heading: 0, pitch: -90, roll: 0 }, { duration: 1500 });

for (const id of ['preset', 'res', 'mode', 'unwrap', 'dens', 'polarOnly']) $(id).onchange = render;

view.setCamera({ lng: 0, lat: 70, height: 14_000_000, heading: 0, pitch: -90, roll: 0 });
render();

// handy in the console
Object.assign(window, { view, dggs });
