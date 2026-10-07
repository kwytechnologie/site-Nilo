import * as THREE from 'three';
import { createWaterMaterial } from './water.js';
import { stoneWall, stoneSmall, columnTexture, domeTexture, latticeTexture, rng } from './textures.js';

/*
  O nilômetro de Roda (861), reconstruído a partir da prancha 23 da "Description de l'Égypte"
  (1809) e das fontes em docs/pesquisa-nilometro.md. Proporções aproximadas.

  - Poço quadrado em cima (~5,9 m de lado) e circular embaixo (~4,7 m de diâmetro).
  - Escada de ~96 cm colada às paredes, degraus de ~24 cm: dois lances retos no trecho quadrado
    e uma espiral no trecho circular, até a água.
  - Coluna octogonal de mármore: pedestal de 1,20 m e fuste de 8,646 m = 16 côvados de 54,05 cm.
    Capitel coríntio e viga de madeira leste-oeste por cima.
  - Nichos de arco ogival à meia altura e túneis que traziam a água do rio (parede leste).
  - Painéis e faixas em azul-lápis com letras claras. O texto é em português: as inscrições
    originais são versículos do Alcorão e não são reproduzidas.
  - Pavilhão com galeria em volta do poço, quatro pilares, tambor de madeira de 12 lados com
    janelas de treliça e cúpula em tenda, pintada em dourado, azul-acinzentado e azul-noite.

  Unidade: 1 = 1 metro. O topo do poço (piso da galeria) é y = 0.
*/
export const NILO_DIM = {
  W: 5.9,
  stairW: 0.96,
  rise: 0.24,
  stepsPerFlight: 13,
  squareFlights: 2,
  roundR: 2.35,
  floorY: -11.4,
  helixSteps: 21,
  helixWalk: 11,      // a câmera desce até este degrau da espiral, acima da água
  cubit: 0.5405,
  cubits: 16,
  pedestal: 1.2,
  waterY: -9.3,
  roomHalf: 4.4,
  roomH: 5.2,
};

const D = NILO_DIM;
const a = D.W / 2 - D.stairW / 2;
const corners = [new THREE.Vector2(a, a), new THREE.Vector2(-a, a), new THREE.Vector2(-a, -a), new THREE.Vector2(a, -a)];
const flightDrop = D.rise * D.stepsPerFlight;
const squareDepth = flightDrop * D.squareFlights;   // altura do trecho quadrado
const cubit0Y = D.floorY + D.pedestal;               // pé do fuste = côvado zero
const colH = D.cubits * D.cubit;
const rc = D.roundR - D.stairW / 2;                   // raio do caminho da espiral
const helixStart = (5 * Math.PI) / 4;                 // canto noroeste
const dTheta = 0.165;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

function pointedArch(w, hSpring, hTop) {
  const s = new THREE.Path();
  s.moveTo(-w / 2, 0);
  s.lineTo(-w / 2, hSpring);
  s.quadraticCurveTo(-w / 2 + w * 0.04, hSpring + (hTop - hSpring) * 0.75, 0, hTop);
  s.quadraticCurveTo(w / 2 - w * 0.04, hSpring + (hTop - hSpring) * 0.75, w / 2, hSpring);
  s.lineTo(w / 2, 0);
  s.lineTo(-w / 2, 0);
  return s;
}
function squareShape(r) {
  const s = new THREE.Shape();
  s.moveTo(-r, -r); s.lineTo(r, -r); s.lineTo(r, r); s.lineTo(-r, r); s.lineTo(-r, -r);
  return s;
}

export function createNilometer({ quality }) {
  const rand = rng(861);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07141a');
  scene.fog = new THREE.FogExp2('#0a1a20', quality.mobile ? 0.05 : 0.04);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 200);
  const pxm = quality.mobile ? 90 : 140;

  // ── Materiais ────────────────────────────────────────────────────────────
  const wallH = squareDepth + 0.3;
  const wallTex = (seed, panel) => {
    const t = stoneWall({ width: D.W, height: wallH, pxm, seed, panel, waterFrom: 3 });
    // a face interna é vista pelo avesso do UV da extrusão: u invertido para o texto não sair espelhado
    t.repeat.set(-1 / D.W, 1 / wallH);
    t.offset.set(0.5, 1);
    return t;
  };
  const wallMat = (tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, bumpMap: tex, bumpScale: 2.2 });
  const stepTex = stoneSmall({ seed: 9 });
  stepTex.repeat.set(1.6, 1.6);
  const stepMat = new THREE.MeshStandardMaterial({ map: stepTex, color: '#b7a387', roughness: 1, bumpMap: stepTex, bumpScale: 2.2 });
  const marble = new THREE.MeshStandardMaterial({ color: '#ebe5d8', roughness: 0.45 });
  const wood = new THREE.MeshStandardMaterial({ color: '#4d392a', roughness: 0.8 });

  // ── Trecho quadrado: quatro paredes ──────────────────────────────────────
  // A escada desce pelas paredes sul e oeste; norte e leste têm painel e nicho (e o túnel, a leste).
  const nicheW = 2.4, nicheBottom = -6.0, nicheSpring = -4.6, nicheTop = -3.4;
  const walls = [
    { rot: 0, niche: true, panel: { text: 'MEDIR PARA NÃO FALTAR', y: 1.0, h: 1.3 }, seed: 7 },        // norte (-z)
    { rot: Math.PI / 2, niche: false, panel: null, seed: 19 },                                           // oeste (-x)
    { rot: Math.PI, niche: false, panel: null, seed: 23 },                                               // sul (+z)
    { rot: -Math.PI / 2, niche: true, panel: { text: 'QUEM MEDE NÃO FICA SEM', y: 1.0, h: 1.3 }, seed: 29 }, // leste (+x)
  ];
  for (const w of walls) {
    const shape = new THREE.Shape();
    shape.moveTo(-D.W / 2, -wallH); shape.lineTo(D.W / 2, -wallH); shape.lineTo(D.W / 2, 0); shape.lineTo(-D.W / 2, 0); shape.lineTo(-D.W / 2, -wallH);
    if (w.niche) {
      const pts = pointedArch(nicheW, nicheSpring - nicheBottom, nicheTop - nicheBottom).getPoints(24).map((p) => new THREE.Vector2(p.x, p.y + nicheBottom));
      shape.holes.push(new THREE.Path().setFromPoints(pts));
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false, curveSegments: 24 });
    geo.translate(0, 0, D.W / 2);
    geo.rotateY(Math.PI + w.rot);
    const mesh = new THREE.Mesh(geo, wallMat(wallTex(w.seed, w.panel)));
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (!w.niche) continue;
    const place = (obj, x, y, z) => {
      obj.position.set(x, y, z).applyAxisAngle(Y_AXIS, Math.PI + w.rot);
      obj.rotation.y = Math.PI + w.rot;
      scene.add(obj);
      return obj;
    };
    const back = new THREE.Mesh(new THREE.BoxGeometry(nicheW + 0.02, nicheTop - nicheBottom + 0.02, 0.55), new THREE.MeshStandardMaterial({ color: '#7c6a56', roughness: 1, side: THREE.BackSide }));
    back.receiveShadow = true;
    place(back, 0, (nicheTop + nicheBottom) / 2, D.W / 2 + 0.27);
    for (const sx of [-1, 1]) {
      place(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, nicheSpring - nicheBottom, 8), marble), sx * (nicheW / 2 - 0.03), (nicheSpring + nicheBottom) / 2, D.W / 2 - 0.04);
      place(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.22), marble), sx * (nicheW / 2 - 0.03), nicheSpring + 0.07, D.W / 2 - 0.04);
    }
    // moldura em ziguezague nas aduelas do arco (primeiros arcos ogivais do Egito)
    const arc = pointedArch(nicheW + 0.24, nicheSpring - nicheBottom, nicheTop - nicheBottom + 0.16).getSpacedPoints(60).filter((p) => p.y > nicheSpring - nicheBottom - 0.01);
    const zz = arc.map((p, i) => new THREE.Vector3(p.x, p.y + nicheBottom + (i % 2 ? 0.07 : 0), 0));
    place(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(zz, false, 'catmullrom', 0), 120, 0.035, 4), marble), 0, 0, D.W / 2 - 0.02);
    if (w.rot === -Math.PI / 2) {
      // boca do túnel a 8,5 côvados do pé da coluna, dentro do nicho leste
      const mouth = place(new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.95), new THREE.MeshBasicMaterial({ color: '#030608' })), 0, cubit0Y + 8.5 * D.cubit + 0.47, D.W / 2 + 0.53);
      mouth.rotation.y += Math.PI;
    }
  }

  // ── Trecho circular, abaixo do quadrado ──────────────────────────────────
  const ledgeShape = squareShape(D.W / 2);
  ledgeShape.holes.push(new THREE.Path().absarc(0, 0, D.roundR, 0, Math.PI * 2, true));
  const ledgeGeo = new THREE.ExtrudeGeometry(ledgeShape, { depth: 0.35, bevelEnabled: false, curveSegments: 48 });
  ledgeGeo.rotateX(-Math.PI / 2);
  ledgeGeo.translate(0, -squareDepth - 0.35, 0);
  const ledge = new THREE.Mesh(ledgeGeo, stepMat);
  ledge.receiveShadow = true;
  scene.add(ledge);
  const roundH = -squareDepth - D.floorY;
  const roundTex = stoneWall({ width: 7.4, height: roundH, pxm: pxm * 0.8, seed: 31, band: false, waterFrom: (-squareDepth - D.waterY) / roundH - 0.08, tone: [150, 138, 120] });
  roundTex.repeat.set(2, 1);
  const round = new THREE.Mesh(new THREE.CylinderGeometry(D.roundR, D.roundR, roundH, 64, 1, true), new THREE.MeshStandardMaterial({ map: roundTex, roughness: 0.95, side: THREE.BackSide, bumpMap: roundTex, bumpScale: 2 }));
  round.position.y = -squareDepth - roundH / 2;
  round.receiveShadow = true;
  scene.add(round);
  // túnel mais baixo da parede leste, a 3 côvados do pé da coluna
  const lowMouth = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pointedArch(0.8, 0.6, 0.95).getPoints(16))), new THREE.MeshBasicMaterial({ color: '#030608' }));
  lowMouth.position.set(D.roundR - 0.02, cubit0Y + 3 * D.cubit, 0.3);
  lowMouth.rotation.y = -Math.PI / 2;
  scene.add(lowMouth);

  // ── Escada: dois lances retos e a espiral ─────────────────────────────────
  const run = (2 * a - D.stairW) / D.stepsPerFlight;
  const flightShape = new THREE.Shape();
  flightShape.moveTo(0, 0);
  for (let i = 0; i < D.stepsPerFlight; i++) {
    flightShape.lineTo(i * run, -(i + 1) * D.rise);
    flightShape.lineTo((i + 1) * run, -(i + 1) * D.rise);
  }
  const T = 0.5;
  flightShape.lineTo(D.stepsPerFlight * run, -flightDrop - T);
  flightShape.lineTo(0, -T);
  flightShape.lineTo(0, 0);
  const flightGeo = new THREE.ExtrudeGeometry(flightShape, { depth: D.stairW, bevelEnabled: false });
  flightGeo.translate(0, 0, -D.stairW / 2);
  const landingGeo = new THREE.BoxGeometry(D.stairW, T, D.stairW);
  const path = [];
  let y = 0;
  for (let k = 0; k < D.squareFlights; k++) {
    const c0 = corners[k], c1 = corners[k + 1];
    const d = new THREE.Vector2().subVectors(c1, c0).normalize();
    const landing = new THREE.Mesh(landingGeo, stepMat);
    landing.position.set(c0.x, y - T / 2, c0.y);
    landing.castShadow = landing.receiveShadow = true;
    scene.add(landing);
    const X = new THREE.Vector3(d.x, 0, d.y), Z = new THREE.Vector3().crossVectors(X, Y_AXIS);
    const start = new THREE.Vector3(c0.x + d.x * D.stairW / 2, y, c0.y + d.y * D.stairW / 2);
    const flight = new THREE.Mesh(flightGeo, stepMat);
    flight.applyMatrix4(new THREE.Matrix4().makeBasis(X, Y_AXIS, Z).setPosition(start));
    flight.castShadow = flight.receiveShadow = true;
    scene.add(flight);
    path.push(new THREE.Vector3(c0.x, y, c0.y));
    for (let s = 1; s <= 3; s++) {
      const u = s / 4;
      path.push(new THREE.Vector3(
        THREE.MathUtils.lerp(start.x, c1.x - d.x * D.stairW / 2, u), y - flightDrop * u,
        THREE.MathUtils.lerp(start.z, c1.y - d.y * D.stairW / 2, u)));
    }
    y -= flightDrop;
  }
  const nw = corners[D.squareFlights];
  const nwLanding = new THREE.Mesh(landingGeo, stepMat);
  nwLanding.position.set(nw.x, y - T / 2, nw.y);
  scene.add(nwLanding);
  path.push(new THREE.Vector3(nw.x, y, nw.y));
  // espiral colada à parede redonda
  const stepGeo = new THREE.BoxGeometry(D.stairW, D.rise + 0.45, rc * dTheta * 1.35);
  const helix = new THREE.InstancedMesh(stepGeo, stepMat, D.helixSteps);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), pv = new THREE.Vector3();
  for (let i = 0; i < D.helixSteps; i++) {
    const th = helixStart + i * dTheta;
    const top = y - (i + 1) * D.rise;
    pv.set(Math.cos(th) * rc, top - (D.rise + 0.45) / 2, Math.sin(th) * rc);
    q.setFromAxisAngle(Y_AXIS, -th);
    m.compose(pv, q, sc);
    helix.setMatrixAt(i, m);
    if (i < D.helixWalk && i % 2 === 0) path.push(new THREE.Vector3(Math.cos(th) * rc, top, Math.sin(th) * rc));
  }
  helix.castShadow = helix.receiveShadow = true;
  scene.add(helix);
  const lastTh = helixStart + D.helixWalk * dTheta;
  path.push(new THREE.Vector3(Math.cos(lastTh) * rc, y - (D.helixWalk + 1) * D.rise, Math.sin(lastTh) * rc));
  const stairCurve = new THREE.CatmullRomCurve3(path, false, 'centripetal', 0.5);

  // ── Coluna, pedestal, capitel coríntio e viga ─────────────────────────────
  const colTex = columnTexture({ cubits: D.cubits, pxPerCubit: quality.mobile ? 96 : 128 });
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.29, colH, 8, 1), new THREE.MeshStandardMaterial({ map: colTex, roughness: 0.42 }));
  column.position.y = cubit0Y + colH / 2;
  column.rotation.y = Math.PI / 8;
  column.castShadow = true;
  scene.add(column);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, D.pedestal, 8), marble);
  pedestal.position.y = D.floorY + D.pedestal / 2;
  scene.add(pedestal);
  const prof = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    prof.push(new THREE.Vector2(0.27 + Math.pow(t, 1.7) * 0.3, t * 0.75));
  }
  const capGeo = new THREE.LatheGeometry(prof, 40);
  const cp = capGeo.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i), z = cp.getZ(i), yy = cp.getY(i);
    const ang = Math.atan2(z, x);
    // duas fileiras de folhas de acanto
    const row = yy < 0.38 ? Math.cos(ang * 8) : Math.cos(ang * 8 + Math.PI / 8);
    const lobe = 1 + Math.max(0, row) * 0.16 * Math.sin(((yy % 0.38) / 0.38) * Math.PI);
    cp.setX(i, x * lobe); cp.setZ(i, z * lobe);
  }
  capGeo.computeVertexNormals();
  const capital = new THREE.Mesh(capGeo, marble);
  capital.position.y = cubit0Y + colH;
  capital.castShadow = true;
  scene.add(capital);
  const abacus = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.18, 1.25), marble);
  abacus.position.y = cubit0Y + colH + 0.84;
  scene.add(abacus);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(D.W + 1, 0.4, 0.44), wood);
  beam.position.y = cubit0Y + colH + 1.13;
  beam.castShadow = true;
  scene.add(beam);

  // ── Água ────────────────────────────────────────────────────────────────
  const waterMat = createWaterMaterial({
    sunDir: new THREE.Vector3(0.1, 1, 0.08), deep: '#061a1e', shallow: '#0f3a3c',
    skyTop: '#b88a55', skyHorizon: '#0a2428', sunColor: '#ffd8a0', fogColor: '#0a1a20', fogNear: 4, fogFar: 40,
    glitter: 0.3, scale: 2.4, flow: new THREE.Vector2(0.05, 0.12),
  });
  const water = new THREE.Mesh(new THREE.CircleGeometry(D.roundR, 48), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = D.waterY;
  scene.add(water);

  // ── Pavilhão ─────────────────────────────────────────────────────────────
  const R = D.roomHalf, H = D.roomH;
  const floorShape = squareShape(R);
  floorShape.holes.push(new THREE.Path().setFromPoints(squareShape(D.W / 2).getPoints()));
  const floorGeo = new THREE.ExtrudeGeometry(floorShape, { depth: 0.4, bevelEnabled: false });
  floorGeo.rotateX(-Math.PI / 2);
  floorGeo.translate(0, -0.4, 0);
  const floorTex = stoneSmall({ seed: 33 });
  floorTex.repeat.set(0.4, 0.4);
  const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ map: floorTex, color: '#cbb592', roughness: 0.9 }));
  floor.receiveShadow = true;
  scene.add(floor);
  const roomTex = stoneWall({ width: R * 2, height: H, pxm: pxm * 0.6, seed: 41, band: true, waterFrom: 3, tone: [189, 158, 115] });
  roomTex.repeat.set(-1 / (R * 2), 1 / H);
  roomTex.offset.set(0.5, 0);
  const roomMat = new THREE.MeshStandardMaterial({ map: roomTex, roughness: 0.92, bumpMap: roomTex, bumpScale: 1.2 });
  const glowMat = new THREE.MeshBasicMaterial({ color: '#ffd9a6', fog: false });
  for (let k = 0; k < 4; k++) {
    const wallShape = new THREE.Shape();
    wallShape.moveTo(-R, 0); wallShape.lineTo(R, 0); wallShape.lineTo(R, H); wallShape.lineTo(-R, H); wallShape.lineTo(-R, 0);
    // a parede sul (k = 0) tem a porta; as outras, uma janela ogival
    const holePts = k === 0 ? pointedArch(2.0, 2.4, 3.4).getPoints(16) : pointedArch(1.3, 1.4, 2.2).getPoints(16).map((p) => new THREE.Vector2(p.x, p.y + 2.0));
    wallShape.holes.push(new THREE.Path(holePts));
    const geo = new THREE.ExtrudeGeometry(wallShape, { depth: 0.7, bevelEnabled: false });
    geo.translate(0, 0, R);
    geo.rotateY(Math.PI);
    const mesh = new THREE.Mesh(geo, roomMat);
    mesh.rotation.y = (Math.PI / 2) * k + Math.PI;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (k !== 0) {
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.4), glowMat);
      glow.position.set(0, 2.0 + 1.1, -(R + 0.8)).applyAxisAngle(Y_AXIS, (Math.PI / 2) * k + Math.PI);
      glow.rotation.y = (Math.PI / 2) * k + Math.PI;
      scene.add(glow);
    }
  }
  // quatro pilares nos cantos do poço sustentam o tambor
  for (const [x, z] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.55, H, 0.55), roomMat);
    pil.position.set(x * (D.W / 2 + 0.45), H / 2, z * (D.W / 2 + 0.45));
    pil.castShadow = true;
    scene.add(pil);
  }
  const ceilShape = squareShape(R);
  ceilShape.holes.push(new THREE.Path().absarc(0, 0, 3.5, 0, Math.PI * 2, true));
  const ceilGeo = new THREE.ExtrudeGeometry(ceilShape, { depth: 0.3, bevelEnabled: false, curveSegments: 12 });
  ceilGeo.rotateX(-Math.PI / 2);
  ceilGeo.translate(0, H, 0);
  scene.add(new THREE.Mesh(ceilGeo, wood));
  // tambor de 12 lados com janelas de treliça (muxarabi)
  const drumH = 1.7;
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, drumH, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#5a4230', roughness: 0.85, side: THREE.BackSide }));
  drum.position.y = H + 0.3 + drumH / 2;
  scene.add(drum);
  const latticeMat = new THREE.MeshBasicMaterial({ map: latticeTexture(), fog: false });
  for (let k = 0; k < 12; k++) {
    const th = (k + 0.5) * (Math.PI * 2 / 12);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.0), latticeMat);
    const rr = 3.5 * Math.cos(Math.PI / 12) - 0.02;
    win.position.set(Math.sin(th) * rr, H + 0.3 + drumH / 2, Math.cos(th) * rr);
    win.lookAt(0, win.position.y, 0);
    scene.add(win);
  }
  const domeTex = domeTexture();
  domeTex.repeat.set(2, 1);
  const dome = new THREE.Mesh(new THREE.ConeGeometry(3.5, 6.2, 12, 6, true), new THREE.MeshStandardMaterial({ map: domeTex, roughness: 0.75, side: THREE.BackSide }));
  dome.position.y = H + 0.3 + drumH + 3.1;
  scene.add(dome);

  // Lanternas (fanous) com luz quente, ao longo da descida.
  const lanternMat = new THREE.MeshStandardMaterial({ color: '#3a2a18', emissive: '#ffb04a', emissiveIntensity: 2.2, roughness: 0.6 });
  const capMat = new THREE.MeshStandardMaterial({ color: '#8a6a2a', metalness: 0.6, roughness: 0.4 });
  const lanternSpots = [
    new THREE.Vector3(-a * 1.16, -flightDrop + 1.9, a * 1.16),
    new THREE.Vector3(-a * 1.16, -squareDepth + 1.9, -a * 1.16),
    new THREE.Vector3(Math.cos(helixStart + 1.4) * 2.15, -squareDepth - 0.9, Math.sin(helixStart + 1.4) * 2.15),
    new THREE.Vector3(Math.cos(helixStart + 2.6) * 2.15, -squareDepth - 2.0, Math.sin(helixStart + 2.6) * 2.15),
  ].slice(0, quality.mobile ? 3 : 4);
  const lanternLights = [];
  for (const p of lanternSpots) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.34, 6), lanternMat));
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.17, 6), capMat);
    cap.position.y = 0.25;
    g.add(cap);
    g.position.copy(p);
    scene.add(g);
    const light = new THREE.PointLight('#ffae5c', 7, 7, 1.6);
    light.position.copy(p);
    scene.add(light);
    lanternLights.push(light);
  }

  // ── Luz ─────────────────────────────────────────────────────────────────
  scene.add(new THREE.HemisphereLight('#f3dcc0', '#0d2a2c', 0.4));
  scene.add(new THREE.AmbientLight('#2a4a52', 0.35));
  const domeLight = new THREE.PointLight('#ffd9a8', quality.mobile ? 50 : 70, 12, 1.4);
  domeLight.position.set(0, H + 3, 0);
  scene.add(domeLight);
  const top = new THREE.SpotLight('#ffe7cc', quality.mobile ? 800 : 1100, 40, 0.6, 0.7, 1.6);
  top.position.set(0, H + 6, 0);
  top.target.position.set(0, -11, 0);
  scene.add(top, top.target);
  // raio de sol entrando pela janela oeste
  const shaft = new THREE.SpotLight('#ffd29a', quality.mobile ? 450 : 700, 40, 0.17, 0.45, 1.3);
  shaft.position.set(-R - 1.5, 4.4, 0.2);
  shaft.target.position.set(2.0, -5.6, 0.6);
  if (quality.shadows) {
    for (const l of [shaft, top]) {
      l.castShadow = true;
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.bias = -0.0007;
    }
  }
  scene.add(shaft, shaft.target);
  const beamLen = shaft.position.distanceTo(shaft.target.position);
  const rayGeo = new THREE.CylinderGeometry(0.25, 1.6, beamLen, 24, 1, true);
  rayGeo.translate(0, -beamLen / 2, 0);
  const rayMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color('#ffc58a') }, uLen: { value: beamLen } },
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ vY = -position.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uLen; varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ float t = vY / uLen; float edge = pow(abs(dot(vN, vV)), 1.6); float a = (1.0 - t) * edge * 0.15 * smoothstep(0.0, 0.08, t);
      gl_FragColor = vec4(uColor * a, a); }`,
  });
  const ray = new THREE.Mesh(rayGeo, rayMat);
  ray.position.copy(shaft.position);
  ray.lookAt(shaft.target.position);
  ray.rotateX(-Math.PI / 2);
  scene.add(ray);

  // Poeira suspensa na luz (pontos redondos e de tamanho limitado).
  const dustN = quality.mobile ? 220 : 520;
  const dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dustPos[i * 3] = (rand() - 0.5) * (D.W - 0.4);
    dustPos[i * 3 + 1] = -rand() * 9 + 2;
    dustPos[i * 3 + 2] = (rand() - 0.5) * (D.W - 0.4);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color('#ffdcb0') }, uScale: { value: 420 } },
    vertexShader: `uniform float uScale; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float d = -mv.z;
        gl_PointSize = clamp(0.03 * uScale / d, 1.0, 4.5); vA = smoothstep(0.6, 2.5, d) * (1.0 - smoothstep(9.0, 16.0, d));
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; varying float vA;
      void main(){ float r = length(gl_PointCoord - 0.5); float a = (1.0 - smoothstep(0.2, 0.5, r)) * vA * 0.6;
        gl_FragColor = vec4(uColor * a, a); }`,
  }));
  scene.add(dust);

  // ── Câmera ──────────────────────────────────────────────────────────────
  const eye = 1.62;
  const doorPos = new THREE.Vector3(0.4, eye, R - 0.9);
  const startStair = path[0].clone().add(new THREE.Vector3(0, eye, 0));
  const pos = new THREE.Vector3(), look = new THREE.Vector3(), ahead = new THREE.Vector3(), colPt = new THREE.Vector3();
  const waterLook = new THREE.Vector3(0.4, D.waterY, 0.2);
  const INTRO = 0.07, WALK = 0.13, END = 0.9;

  function update({ p, time, pointer, reduced }) {
    const t = reduced ? 0 : time;
    waterMat.uniforms.uTime.value = t * 0.4;
    if (!reduced) dust.rotation.y = t * 0.01;

    if (p < INTRO) {
      // Entrando pela porta: os olhos acostumam com o escuro olhando a cúpula, depois descem para o poço.
      const e = THREE.MathUtils.smootherstep(p / INTRO, 0, 1);
      pos.copy(doorPos);
      look.set(0, THREE.MathUtils.lerp(H + 5, -3, e), THREE.MathUtils.lerp(-1.2, 0, e));
    } else if (p < WALK) {
      const e = THREE.MathUtils.smootherstep((p - INTRO) / (WALK - INTRO), 0, 1);
      pos.lerpVectors(doorPos, startStair, e);
      look.set(0, -3 - e * 0.5, 0);
    } else {
      const u = THREE.MathUtils.clamp((p - WALK) / (END - WALK), 0, 1);
      stairCurve.getPointAt(u, pos);
      pos.y += eye;
      stairCurve.getPointAt(Math.min(u + 0.05, 1), ahead);
      ahead.y += eye - 0.4;
      colPt.set(0, pos.y - 1.0, 0);
      look.lerpVectors(colPt, ahead, 0.3);
      if (p > END) look.lerp(waterLook, THREE.MathUtils.smootherstep((p - END) / (1 - END), 0, 1));
    }
    if (!reduced) pos.y += Math.sin(t * 1.3) * 0.012;
    camera.position.copy(pos);
    camera.lookAt(look);
    if (!reduced) {
      camera.rotation.y += -pointer.x * 0.04;
      camera.rotation.x += pointer.y * 0.025;
    }
    for (let i = 0; i < lanternLights.length; i++) {
      lanternLights[i].intensity = 7 * (0.92 + Math.sin(t * 7 + i * 2) * 0.05 + Math.sin(t * 13 + i) * 0.03);
    }
    // Leitura da coluna: o côvado na altura para onde se olha.
    const lookY = p < WALK ? cubit0Y + colH : camera.position.y - 1.0;
    const covado = THREE.MathUtils.clamp((lookY - cubit0Y) / D.cubit, 0, D.cubits);
    return { covado };
  }

  function resize(w, h) {
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 74 : 62;
    camera.updateProjectionMatrix();
  }

  return { scene, camera, update, resize };
}
