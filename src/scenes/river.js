import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createWaterMaterial } from './water.js';
import { rng, stoneSmall } from './textures.js';

/*
  O rio. Descemos o Nilo rumo ao norte, ao fim da tarde, até a ponta sul da ilha de Roda,
  onde fica o nilômetro. Olhando para o norte, o oeste fica à esquerda: é de lá que vem o sol
  poente e é lá que ficam as pirâmides de Gizé. À direita, a margem leste, onde ficavam Fustat
  e a mesquita de Ibn Tulun, com o minarete em espiral (879), contemporâneo do nilômetro (861).
  Unidade: 1 = 1 metro.
*/

const SUN_DIR = new THREE.Vector3(-0.62, 0.075, -0.78).normalize();
const COLORS = {
  zenith: '#1a2b58',
  mid: '#56608c',
  horizon: '#f0a35f',
  sun: '#ffd49a',
  fog: '#c98d68',
  land: '#33402a',
  silhouette: '#26301f',
  papyrusHead: '#7b8a3e',
  brick: '#a8805a',
  stone: '#c4a072',
};

export const DOOR = new THREE.Vector3(8, 1.7, -583);

function bend(geo, k) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setX(i, p.getX(i) + k * y * y);
  }
  geo.computeVertexNormals();
  return geo;
}
function paint(geo, color) {
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}
// Garante os mesmos atributos antes de juntar geometrias.
function clean(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}

function papyrusClump(rand) {
  const parts = [];
  const stems = 6 + Math.floor(rand() * 4);
  for (let i = 0; i < stems; i++) {
    const h = 2.2 + rand() * 1.6;
    const stem = new THREE.CylinderGeometry(0.025, 0.05, h, 4, 3);
    stem.translate(0, h / 2, 0);
    bend(stem, (rand() - 0.5) * 0.06);
    const head = new THREE.ConeGeometry(0.42 + rand() * 0.2, 0.55, 7, 1, true);
    head.rotateX(Math.PI);
    head.translate(0, h + 0.15, 0);
    const g1 = paint(clean(stem), COLORS.silhouette);
    const g2 = paint(clean(head), COLORS.papyrusHead);
    const tilt = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler((rand() - 0.5) * 0.35, 0, (rand() - 0.5) * 0.35));
    const off = new THREE.Matrix4().makeTranslation((rand() - 0.5) * 0.9, 0, (rand() - 0.5) * 0.9);
    const m = off.multiply(tilt);
    g1.applyMatrix4(m); g2.applyMatrix4(m);
    parts.push(g1, g2);
  }
  return mergeGeometries(parts);
}

function palm(rand) {
  const parts = [];
  const h = 9 + rand() * 6;
  const lean = (rand() - 0.5) * 0.025;
  const trunk = new THREE.CylinderGeometry(0.16, 0.26, h, 6, 6);
  trunk.translate(0, h / 2, 0);
  bend(trunk, lean);
  parts.push(paint(clean(trunk), '#3b3022'));
  const topX = lean * h * h;
  const fronds = 11 + Math.floor(rand() * 4);
  for (let i = 0; i < fronds; i++) {
    const len = 3.6 + rand() * 1.4;
    const f = new THREE.PlaneGeometry(len, 0.7, 6, 1);
    f.translate(len / 2, 0, 0);
    const p = f.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k);
      p.setY(k, p.getY(k) * (1 - x / len) * 1.2 - 0.18 * x * x * (0.6 + rand() * 0.1));
    }
    f.rotateX(Math.PI / 2 * (0.75 + rand() * 0.2));
    f.rotateZ(0.35 + rand() * 0.35);
    f.rotateY((i / fronds) * Math.PI * 2 + rand() * 0.3);
    f.translate(topX, h, 0);
    parts.push(paint(clean(f), COLORS.silhouette));
  }
  return mergeGeometries(parts);
}

function felucca() {
  const group = new THREE.Group();
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-3.2, 0.5);
  hullShape.quadraticCurveTo(-2.6, -0.45, 0, -0.5);
  hullShape.quadraticCurveTo(2.8, -0.45, 3.6, 0.7);
  hullShape.lineTo(-3.2, 0.5);
  const hull = new THREE.ExtrudeGeometry(hullShape, { depth: 1.5, bevelEnabled: false });
  hull.translate(0, 0.25, -0.75);
  group.add(new THREE.Mesh(hull, new THREE.MeshLambertMaterial({ color: '#3a2a1c' })));
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 6, 5), new THREE.MeshLambertMaterial({ color: '#2a2018' }));
  mast.position.set(1.2, 3.4, 0);
  group.add(mast);
  // Vela latina: triângulo grande preso a uma verga inclinada.
  const sail = new THREE.BufferGeometry();
  sail.setAttribute('position', new THREE.Float32BufferAttribute([
    3.4, 1.2, 0,
    -3.0, 1.0, 0,
    -1.6, 10.5, 0,
  ], 3));
  sail.setAttribute('uv', new THREE.Float32BufferAttribute([1, 0, 0, 0, 0.2, 1], 2));
  sail.computeVertexNormals();
  const sailMat = new THREE.MeshLambertMaterial({
    color: '#efe3c8', emissive: '#e08a42', emissiveIntensity: 0.32, side: THREE.DoubleSide,
  });
  const sailMesh = new THREE.Mesh(sail, sailMat);
  sailMesh.position.z = 0.05;
  group.add(sailMesh);
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 10.2, 4), new THREE.MeshLambertMaterial({ color: '#2a2018' }));
  yard.position.set(0.9, 5.8, 0.1);
  yard.rotation.z = 0.68;
  group.add(yard);
  return group;
}

// Minarete em espiral, à maneira da mesquita de Ibn Tulun (879).
function spiralMinaret(mat) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(14, 22, 14), mat);
  base.position.y = 11;
  g.add(base);
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.5, 14, 12), mat);
  cyl.position.y = 29;
  g.add(cyl);
  // rampa externa em hélice
  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const a = (i / 80) * Math.PI * 4;
    pts.push(new THREE.Vector3(Math.cos(a) * 6.2, 22 + (i / 80) * 14, Math.sin(a) * 6.2));
  }
  const ramp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.9, 4), mat);
  g.add(ramp);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 6, 8), mat);
  top.position.y = 39;
  g.add(top);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  dome.position.y = 42;
  g.add(dome);
  return g;
}

function slenderMinaret(mat, h = 34) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.2, h, 8), mat);
  shaft.position.y = h / 2;
  g.add(shaft);
  const balcony = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.2, 1, 8), mat);
  balcony.position.y = h * 0.72;
  g.add(balcony);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.5, 5, 8), mat);
  cap.position.y = h + 2.5;
  g.add(cap);
  return g;
}

// O pavilhão do nilômetro na ponta da ilha de Roda: corpo de pedra e cúpula cônica.
function nilometerKiosk() {
  const g = new THREE.Group();
  const stone = new THREE.MeshLambertMaterial({ map: stoneSmall({ seed: 5 }), color: '#d6bb92' });
  stone.map.repeat.set(3, 2);
  const W = 10, H = 7;
  // corpo com a porta em arco ogival recortada
  const front = new THREE.Shape();
  front.moveTo(-W / 2, 0); front.lineTo(W / 2, 0); front.lineTo(W / 2, H); front.lineTo(-W / 2, H); front.lineTo(-W / 2, 0);
  const door = new THREE.Path();
  door.moveTo(-1.2, 0); door.lineTo(-1.2, 2.4);
  door.quadraticCurveTo(-1.15, 3.6, 0, 4.1);
  door.quadraticCurveTo(1.15, 3.6, 1.2, 2.4);
  door.lineTo(1.2, 0); door.lineTo(-1.2, 0);
  front.holes.push(door);
  const frontGeo = new THREE.ExtrudeGeometry(front, { depth: 0.9, bevelEnabled: false });
  const frontMesh = new THREE.Mesh(frontGeo, stone);
  frontMesh.position.set(0, 0, W / 2 - 0.9);
  g.add(frontMesh);
  for (const [x, z, ry] of [[-W / 2 + 0.45, 0, Math.PI / 2], [W / 2 - 0.45, 0, Math.PI / 2], [0, -W / 2 + 0.45, 0]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.9), stone);
    wall.position.set(x, H / 2, z);
    wall.rotation.y = ry;
    g.add(wall);
  }
  // interior escuro atrás da porta
  const dark = new THREE.Mesh(new THREE.BoxGeometry(W - 1.9, H - 0.2, W - 1.9), new THREE.MeshBasicMaterial({ color: '#06090b', side: THREE.BackSide }));
  dark.position.y = H / 2;
  g.add(dark);
  // cornija, tambor e cúpula cônica
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.6, W + 0.6), stone);
  cornice.position.y = H + 0.3;
  g.add(cornice);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 2.2, 12), new THREE.MeshLambertMaterial({ color: '#6a5240' }));
  drum.position.y = H + 1.7;
  g.add(drum);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.9, 7.6, 12), new THREE.MeshLambertMaterial({ color: '#6f6a62', flatShading: true }));
  cone.position.y = H + 2.8 + 3.8;
  g.add(cone);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshLambertMaterial({ color: '#d9a441', emissive: '#6b4a10' }));
  finial.position.y = H + 2.8 + 7.7;
  g.add(finial);
  return g;
}

function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uSun: { value: SUN_DIR },
      uZenith: { value: new THREE.Color(COLORS.zenith) },
      uMid: { value: new THREE.Color(COLORS.mid) },
      uHorizon: { value: new THREE.Color(COLORS.horizon) },
      uSunCol: { value: new THREE.Color(COLORS.sun) },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun, uZenith, uMid, uHorizon, uSunCol;
      uniform float uTime;
      varying vec3 vDir;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
      void main() {
        vec3 d = normalize(vDir);
        float h = max(d.y, 0.0);
        float sunDot = max(dot(d, uSun), 0.0);
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.18, h));
        col = mix(col, uZenith, smoothstep(0.12, 0.7, h));
        // o lado do sol é mais quente
        col = mix(col, uSunCol, pow(sunDot, 6.0) * 0.55 * (1.0 - smoothstep(0.0, 0.5, h)));
        // nuvens finas em faixas, acesas por baixo pelo sol
        vec2 cp = vec2(d.x / (d.y + 0.08), d.z / (d.y + 0.08)) * 0.9 + vec2(uTime * 0.004, 0.0);
        float c = smoothstep(0.52, 0.85, fbm(cp * vec2(0.35, 2.2)));
        float band = smoothstep(0.02, 0.1, h) * (1.0 - smoothstep(0.25, 0.5, h));
        vec3 cloudCol = mix(vec3(0.93, 0.55, 0.42), uSunCol, pow(sunDot, 3.0));
        col = mix(col, cloudCol, c * band * 0.65);
        // disco e halo
        col += uSunCol * pow(sunDot, 900.0) * 6.0;
        col += uSunCol * pow(sunDot, 60.0) * 0.45;
        // abaixo do horizonte: neblina quente
        if (d.y < 0.0) col = mix(uHorizon * 0.85, vec3(0.24, 0.2, 0.2), smoothstep(0.0, -0.3, d.y));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export function createRiver({ quality }) {
  const rand = rng(1861);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(COLORS.fog, 70, 1300);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.3, 6000);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), skyMaterial());
  sky.frustumCulled = false;
  scene.add(sky);

  scene.add(new THREE.HemisphereLight('#ffd7a8', '#2c3a2e', 1.15));
  const sun = new THREE.DirectionalLight('#ffb36b', 2.1);
  sun.position.copy(SUN_DIR).multiplyScalar(500);
  scene.add(sun);

  // Água
  const waterMat = createWaterMaterial({
    sunDir: SUN_DIR, deep: '#0f3a3e', shallow: '#2a6a63', skyTop: COLORS.mid, skyHorizon: COLORS.horizon,
    sunColor: COLORS.sun, fogColor: COLORS.fog, fogNear: 70, fogFar: 1300, scale: 1.0,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 1, 1), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.z = -800;
  scene.add(water);

  // Margens: oeste (esquerda) e leste (direita). A ilha de Roda divide o rio no fim.
  const landMat = new THREE.MeshLambertMaterial({ color: COLORS.land });
  const WEST = -62, EAST = 58;
  const west = new THREE.Mesh(new THREE.BoxGeometry(3000, 1, 4000), landMat);
  west.position.set(WEST - 1500, 0.2, -1200);
  const east = west.clone();
  east.position.set(EAST + 1500, 0.2, -1200);
  scene.add(west, east);
  const mudMat = new THREE.MeshLambertMaterial({ color: '#4d3f2c' });
  for (const [x, s] of [[WEST, -1], [EAST, 1]]) {
    const mud = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 4000), mudMat);
    mud.position.set(x - s * 2, 0.05, -1200);
    scene.add(mud);
  }

  // Planalto e pirâmides de Gizé ao longe, a oeste.
  const plateauMat = new THREE.MeshLambertMaterial({ color: '#b98a5c' });
  const plateau = new THREE.Mesh(new THREE.BoxGeometry(1400, 30, 900), plateauMat);
  plateau.position.set(-1500, 4, -1700);
  scene.add(plateau);
  const pyrMat = new THREE.MeshLambertMaterial({ color: '#d7a46c' });
  for (const [x, z, s] of [[-1250, -1600, 1.0], [-1420, -1780, 0.95], [-1560, -1930, 0.45]]) {
    const pyr = new THREE.Mesh(new THREE.ConeGeometry(160 * s, 146 * s, 4), pyrMat);
    pyr.position.set(x, 19 + 73 * s, z);
    pyr.rotation.y = Math.PI / 4;
    scene.add(pyr);
  }

  // Vilarejos de adobe nas duas margens, com fumaça de nada: só volume e luz.
  const houseGeo = new THREE.BoxGeometry(1, 1, 1);
  houseGeo.translate(0, 0.5, 0);
  const houses = new THREE.InstancedMesh(houseGeo, new THREE.MeshLambertMaterial({ color: COLORS.brick }), quality.houses);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const tint = new THREE.Color();
  for (let i = 0; i < quality.houses; i++) {
    const side = rand() < 0.45 ? -1 : 1;
    const cluster = Math.floor(rand() * 9);
    const z = 40 - cluster * 90 - rand() * 60;
    const x = side > 0 ? EAST + 30 + rand() * 260 : WEST - 40 - rand() * 220;
    p.set(x, 0.4, z);
    s.set(4 + rand() * 7, 3 + rand() * 6, 4 + rand() * 7);
    q.setFromEuler(new THREE.Euler(0, rand() * 0.3, 0));
    m.compose(p, q, s);
    houses.setMatrixAt(i, m);
    houses.setColorAt(i, tint.set(COLORS.brick).offsetHSL(0, (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.12));
  }
  scene.add(houses);

  // Margem leste ao longe: Fustat, minaretes e o minarete em espiral de Ibn Tulun.
  const farMat = new THREE.MeshLambertMaterial({ color: '#9c7a60' });
  const tulun = spiralMinaret(farMat);
  tulun.position.set(560, 0, -980);
  scene.add(tulun);
  for (const [x, z, h] of [[380, -720, 30], [470, -1150, 38], [720, -860, 26], [300, -1400, 34]]) {
    const mn = slenderMinaret(farMat, h);
    mn.position.set(x, 0, z);
    scene.add(mn);
  }
  const blocks = new THREE.InstancedMesh(houseGeo, farMat, 160);
  for (let i = 0; i < 160; i++) {
    p.set(EAST + 180 + rand() * 900, 0.4, -500 - rand() * 1200);
    s.set(10 + rand() * 25, 6 + rand() * 18, 10 + rand() * 25);
    q.identity();
    m.compose(p, q, s);
    blocks.setMatrixAt(i, m);
  }
  scene.add(blocks);

  // Papiro na beira d'água e tamareiras atrás.
  const vegMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const papyrusGeos = [papyrusClump(rand), papyrusClump(rand), papyrusClump(rand)];
  const perVariant = Math.ceil(quality.papyrus / papyrusGeos.length);
  for (const geo of papyrusGeos) {
    const inst = new THREE.InstancedMesh(geo, vegMat, perVariant);
    for (let i = 0; i < perVariant; i++) {
      const side = rand() < 0.5 ? -1 : 1;
      const edge = side < 0 ? WEST : EAST;
      const z = 80 - rand() * 760;
      // perto da ilha de Roda não há papiro na margem do caminho da câmera
      p.set(edge - side * (1.5 + rand() * 7), 0, z);
      const sc = 0.8 + rand() * 0.7;
      s.set(sc, sc * (0.85 + rand() * 0.4), sc);
      q.setFromEuler(new THREE.Euler(0, rand() * Math.PI * 2, 0));
      m.compose(p, q, s);
      inst.setMatrixAt(i, m);
    }
    scene.add(inst);
  }
  const palmGeos = [palm(rand), palm(rand), palm(rand)];
  const palmsPer = Math.ceil(quality.palms / palmGeos.length);
  for (const geo of palmGeos) {
    const inst = new THREE.InstancedMesh(geo, vegMat, palmsPer);
    for (let i = 0; i < palmsPer; i++) {
      const side = rand() < 0.5 ? -1 : 1;
      const edge = side < 0 ? WEST : EAST;
      // tamareiras em bosques
      const grove = Math.floor(rand() * 12);
      const z = 60 - grove * 62 - rand() * 40;
      p.set(edge + side * (8 + rand() * 70), 0.6, z);
      const sc = 0.85 + rand() * 0.35;
      s.set(sc, sc, sc);
      q.setFromEuler(new THREE.Euler(0, rand() * Math.PI * 2, 0));
      m.compose(p, q, s);
      inst.setMatrixAt(i, m);
    }
    scene.add(inst);
  }

  // Shaduf: a alavanca de tirar água do rio, na margem oeste.
  const woodMat = new THREE.MeshLambertMaterial({ color: '#2f261c' });
  for (const z of [-40, -230, -410]) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3, 0.25), woodMat);
    post.position.y = 1.5;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 7, 4), woodMat);
    pole.position.set(0.6, 3.1, 0);
    pole.rotation.z = -1.0;
    const weight = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 4), new THREE.MeshLambertMaterial({ color: '#4a3d2e' }));
    weight.position.set(-2.2, 1.2, 0);
    g.add(post, pole, weight);
    g.position.set(WEST + 3, 0.4, z);
    g.rotation.y = 0.4;
    scene.add(g);
  }

  // Feluccas
  const boats = [];
  const boatSpots = [[-24, -70], [18, -150], [-30, -240], [26, -320], [-14, -400], [30, -470], [-36, -540]];
  for (const [x, z] of boatSpots) {
    const b = felucca();
    b.position.set(x, 0, z);
    b.rotation.y = (rand() - 0.5) * 0.8 + (x < 0 ? 0.3 : -0.3);
    const sc = 0.9 + rand() * 0.3;
    b.scale.setScalar(sc);
    b.userData = { x, z, phase: rand() * 10, speed: 0.4 + rand() * 0.5 };
    scene.add(b);
    boats.push(b);
  }

  // Ilha de Roda e o pavilhão do nilômetro na ponta sul.
  const island = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.2, 40), landMat);
  island.scale.set(34, 1, 140);
  island.position.set(DOOR.x, 0.1, DOOR.z - 120);
  scene.add(island);
  const kiosk = nilometerKiosk();
  kiosk.scale.setScalar(1.35);
  kiosk.position.set(DOOR.x, 0.6, DOOR.z - 5 * 1.35);
  // luz quente na porta, para o olhar achar o nilômetro
  const doorLight = new THREE.PointLight('#ffc98a', 55, 30, 1.6);
  doorLight.position.set(DOOR.x, 3, DOOR.z + 4);
  scene.add(doorLight);
  scene.add(kiosk);
  // cais de pedra na frente da porta
  const quay = new THREE.Mesh(new THREE.BoxGeometry(14, 0.8, 8), new THREE.MeshLambertMaterial({ color: '#b48e62' }));
  quay.position.set(DOOR.x, 0.3, DOOR.z + 3);
  scene.add(quay);
  for (const dx of [-11, 13, -15, 18]) {
    const geo = palmGeos[Math.abs(dx) % 3];
    const tree = new THREE.Mesh(geo, vegMat);
    tree.position.set(DOOR.x + dx, 0.6, DOOR.z - 8 - Math.abs(dx));
    scene.add(tree);
  }

  // Aves do Nilo: garças e íbis cruzando o céu, vistas de frente (asas em "M").
  const birdMat = new THREE.MeshBasicMaterial({ color: '#1d1a1a', side: THREE.DoubleSide, fog: true });
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.06, 0, 0.75, 0.22, 0, 0.12, -0.1, 0, 0.75, 0.22, 0, 1.45, 0.02, 0, 0.5, 0.05, 0], 3));
  const birds = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    const l = new THREE.Mesh(wingGeo, birdMat);
    const r = new THREE.Mesh(wingGeo, birdMat);
    r.scale.x = -1;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 4), birdMat);
    body.scale.set(1, 0.8, 2.4);
    g.add(l, r, body);
    g.userData = { l, r, phase: rand() * 6, ox: (rand() - 0.5) * 30, oy: 22 + rand() * 12, oz: -60 - rand() * 30 };
    g.scale.setScalar(1.4);
    scene.add(g);
    birds.push(g);
  }

  // Caminho da câmera.
  const travelEnd = new THREE.Vector3(4, 3.2, -520);
  const look = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  function update({ p, portaStart, time, pointer, reduced }) {
    const t = reduced ? 0 : time;
    waterMat.uniforms.uTime.value = t * 0.55;
    sky.material.uniforms.uTime.value = t;
    sky.position.copy(camera.position);

    let travel = Math.min(p / portaStart, 1);
    const approach = THREE.MathUtils.clamp((p - portaStart) / (1 - portaStart), 0, 1);
    travel = THREE.MathUtils.smoothstep(travel, 0, 1) * 0.15 + travel * 0.85;

    const z = THREE.MathUtils.lerp(34, travelEnd.z, travel);
    const sway = Math.sin(travel * 9.0) * 7 + Math.sin(travel * 3.1) * 5;
    const bob = Math.sin(t * 0.9) * 0.12 + Math.sin(t * 1.7) * 0.05;
    camera.position.set(THREE.MathUtils.lerp(8 + sway * 0.6, travelEnd.x, Math.pow(travel, 4)), 3.2 + bob, z);
    // olhar: rio adiante, puxando um pouco para o pôr do sol no começo
    const yaw = THREE.MathUtils.lerp(0.32, 0.0, Math.min(travel * 2.2, 1)) + Math.cos(travel * 9.0) * 0.05;
    look.set(camera.position.x - Math.sin(yaw) * 50, 4.2, camera.position.z - Math.cos(yaw) * 50);

    if (approach > 0) {
      // Aproximação da porta do nilômetro: a câmera desliza até atravessar o arco.
      const e = THREE.MathUtils.smootherstep(approach, 0, 1);
      tmp.copy(camera.position).lerp(new THREE.Vector3(DOOR.x, 2.1, DOOR.z + 0.5), e);
      camera.position.copy(tmp);
      camera.position.y += bob * (1 - e);
      const doorLook = new THREE.Vector3(DOOR.x, 2.2, DOOR.z - 20);
      look.lerp(doorLook, Math.min(1, e * 1.6));
    }

    camera.lookAt(look);
    if (!reduced) {
      camera.rotation.y += -pointer.x * 0.035;
      camera.rotation.x += pointer.y * 0.02;
    }

    for (const b of boats) {
      const u = b.userData;
      b.position.z = u.z - (t * u.speed) % 60;
      b.position.y = Math.sin(t * 1.1 + u.phase) * 0.08;
      b.rotation.z = Math.sin(t * 0.8 + u.phase) * 0.025;
    }
    for (const g of birds) {
      const u = g.userData;
      const k = ((t * 6 + u.phase * 30) % 260) - 130;
      g.position.set(camera.position.x + k + u.ox, u.oy + Math.sin(t + u.phase) * 1.5, camera.position.z + u.oz);
      g.lookAt(camera.position);
      const flap = Math.sin(t * 6 + u.phase) * 0.5;
      u.l.rotation.z = flap; u.r.rotation.z = -flap;
    }
  }

  function resize(w, h) {
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 66 : 52;
    camera.updateProjectionMatrix();
  }

  return { scene, camera, update, resize };
}
