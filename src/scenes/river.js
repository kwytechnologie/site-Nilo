import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createWaterMaterial } from './water.js';
import { rng } from './textures.js';
import { loadModel } from './assets.js';

/*
  O rio. Descemos o Nilo rumo ao norte, ao fim da tarde, até a ponta sul da ilha de Roda,
  onde fica o nilômetro. Olhando para o norte, o oeste fica à esquerda: é de lá que vem o sol
  poente e é lá que ficam as pirâmides de Gizé. À direita, a margem leste, onde ficavam Fustat
  e a mesquita de Ibn Tulun, com o minarete em espiral (879), contemporâneo do nilômetro (861).
  Unidade: 1 = 1 metro.
*/

const SUN_DIR = new THREE.Vector3(-0.62, 0.12, -0.78).normalize();
const COLORS = {
  zenith: '#24435b',
  mid: '#92a6b3',
  horizon: '#e5ba83',
  sun: '#ffd49a',
  fog: '#bdad88',
  land: '#696645',
  silhouette: '#26301f',
  papyrusHead: '#7b8a3e',
  brick: '#a8805a',
  stone: '#c4a072',
};

export const DOOR = new THREE.Vector3(8, 1.7, -583);

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
      float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
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

export async function createRiver({ quality }) {
  const [vegetation, pavilion] = await Promise.all([loadModel('vegetation'), loadModel('pavilion')]);
  const rand = rng(1861);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(COLORS.fog, 70, 1300);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.3, 6000);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), skyMaterial());
  sky.frustumCulled = false;
  scene.add(sky);

  scene.add(new THREE.HemisphereLight('#c8e1ef', '#4f5134', 1.55));
  const sun = new THREE.DirectionalLight('#ffe0ac', 2.4);
  sun.position.copy(SUN_DIR).multiplyScalar(500);
  scene.add(sun);

  // Água
  const waterMat = createWaterMaterial({
    sunDir: SUN_DIR, deep: '#173e3b', shallow: '#527266', skyTop: COLORS.mid, skyHorizon: COLORS.horizon,
    sunColor: COLORS.sun, fogColor: COLORS.fog, fogNear: 70, fogFar: 1300, scale: 1.0, river: true,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 1, 1), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.z = -800;
  scene.add(water);

  // Margens: oeste (esquerda) e leste (direita). A ilha de Roda divide o rio no fim.
  const landMat = new THREE.MeshLambertMaterial({ color: COLORS.land });
  const WEST = -62, EAST = 58;
  const bankEdge = (z, side) => (side < 0 ? WEST : EAST) + Math.sin(z * .013) * 6 + Math.sin(z * .039) * 2.4;
  // Perfil inclinado com lodo molhado e areia seca; pequenas curvas quebram as margens retas.
  for (const [x, s] of [[WEST, -1], [EAST, 1]]) {
    const geo = new THREE.PlaneGeometry(1600, 2400, 5, 120);
    const positions=geo.attributes.position, colors=[];
    const tones=['#273d32','#4d5940','#807650','#98865d','#b49a71','#bca57d'].map(c=>new THREE.Color(c));
    for(let i=0;i<positions.count;i++) {
      const col=i%6, z=positions.getY(i)-900;
      const offsets=[-5,0,5,18,120,1600], heights=[-.6,.12,.75,1.5,2.1,4];
      positions.setXYZ(i,bankEdge(z,s)+s*offsets[col],heights[col]+(col>1?Math.sin(z*.1)*.16:0),z);
      const c=tones[col];colors.push(c.r,c.g,c.b);
    }
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
    scene.add(new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide})));
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

  // Modelos do Blender reutilizados em lotes espaciais; cada lote pode ser descartado
  // pelo frustum sem enviar todas as plantas do percurso à GPU.
  const vegMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const wind = { value: 0 };
  vegMat.onBeforeCompile = shader => {
    shader.uniforms.uWind = wind;
    shader.vertexShader = 'uniform float uWind;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvec4 wp=vec4(position,1.0);\n#ifdef USE_INSTANCING\nwp=instanceMatrix*wp;\n#endif\nfloat flex=pow(clamp(position.y/12.,0.,1.),2.); transformed.x+=sin(uWind*.65+wp.x*.17+wp.z*.07)*flex*.22;');
  };
  const palmGeos = ['PalmA','PalmB'].map(name => vegetation.getObjectByName(name).geometry);
  const papyrusGeo = vegetation.getObjectByName('Papyrus').geometry;
  const groups=6, groupLength=135;
  function plantBatches(geometries, total, reeds) {
    for(let chunk=0;chunk<groups;chunk++) for(let variant=0;variant<geometries.length;variant++) {
      const count=Math.ceil(total/groups/geometries.length);
      const batch=new THREE.InstancedMesh(geometries[variant],vegMat,count);
      for(let i=0;i<count;i++) {
        const side=rand()<.5?-1:1,z=95-chunk*groupLength-rand()*groupLength;
        const edge=bankEdge(z,side);
        const offset=reeds?-.8+rand()*3.5:8+rand()*30;
        p.set(edge+side*offset,reeds?.08:1.0,z);
        const scale=reeds?.75+rand()*.6:.8+rand()*.4;
        s.set(scale,scale*(.9+rand()*.18),scale);
        q.setFromEuler(new THREE.Euler(0,rand()*Math.PI*2,0));
        m.compose(p,q,s);batch.setMatrixAt(i,m);
      }
      batch.computeBoundingSphere();scene.add(batch);
    }
  }
  plantBatches([papyrusGeo],quality.mobile?210:510,true);
  plantBatches(palmGeos,quality.mobile?60:132,false);

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
  const islandGeometry = new THREE.BufferGeometry(), islandVertices=[], islandColors=[], islandIndices=[];
  const islandTones=['#72704c','#78704b','#666442','#3d4d37'].map(c=>new THREE.Color(c));
  for(let ring=0;ring<4;ring++) for(let i=0;i<64;i++) {
    const theta=i/64*Math.PI*2;
    const radius=[0,.72,.97,1.05][ring]*(1+Math.sin(theta*7)*.012+Math.sin(theta*13)*.008);
    islandVertices.push(Math.cos(theta)*34*radius,[1.2,1.05,.2,-.65][ring],Math.sin(theta)*140*radius);
    const c=islandTones[ring];islandColors.push(c.r,c.g,c.b);
    if(ring<3){const a=ring*64+i,b=ring*64+(i+1)%64;islandIndices.push(a,b,a+64,b,b+64,a+64);}
  }
  islandGeometry.setAttribute('position',new THREE.Float32BufferAttribute(islandVertices,3));
  islandGeometry.setAttribute('color',new THREE.Float32BufferAttribute(islandColors,3));
  islandGeometry.setIndex(islandIndices);islandGeometry.computeVertexNormals();
  const island = new THREE.Mesh(islandGeometry,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
  island.position.set(DOOR.x, 0, DOOR.z - 120);
  scene.add(island);
  const kiosk = pavilion;
  kiosk.scale.setScalar(1.35);
  kiosk.position.set(DOOR.x, 0.6, DOOR.z - 5 * 1.35);
  // luz quente na porta, para o olhar achar o nilômetro
  const doorLight = new THREE.PointLight('#ffc98a', 55, 30, 1.6);
  doorLight.position.set(DOOR.x, 3, DOOR.z + 4);
  scene.add(doorLight);
  scene.add(kiosk);
  // cais de pedra na frente da porta
  const quay = new THREE.Mesh(new THREE.BoxGeometry(14, 0.8, 8), new THREE.MeshLambertMaterial({ color: '#b48e62' }));
  quay.position.set(DOOR.x, 0.6, DOOR.z + 3);
  scene.add(quay);
  const islandReeds=new THREE.InstancedMesh(papyrusGeo,vegMat,quality.mobile?35:70);
  for(let i=0;i<islandReeds.count;i++) {
    const th=rand()*Math.PI*2;
    p.set(DOOR.x+Math.cos(th)*32,.15,DOOR.z-120+Math.sin(th)*133);
    const sc=.65+rand()*.4;s.setScalar(sc);q.setFromAxisAngle(new THREE.Vector3(0,1,0),rand()*6.28);
    islandReeds.setMatrixAt(i,m.compose(p,q,s));
  }
  islandReeds.computeBoundingSphere();scene.add(islandReeds);
  for (const dx of [-11, 13, -15, 18]) {
    const geo = palmGeos[Math.abs(dx) % palmGeos.length];
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
    wind.value = t;
    sky.position.copy(camera.position);

    let travel = Math.min(p / portaStart, 1);
    const approach = THREE.MathUtils.clamp((p - portaStart) / (1 - portaStart), 0, 1);
    travel = THREE.MathUtils.smoothstep(travel, 0, 1) * 0.15 + travel * 0.85;

    const z = THREE.MathUtils.lerp(34, travelEnd.z, travel);
    const sway = Math.sin(travel * 9.0) * 7 + Math.sin(travel * 3.1) * 5;
    const bob = Math.sin(t * 0.9) * 0.035;
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
      b.position.z = u.z + Math.sin(t * .025 + u.phase) * 5;
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
