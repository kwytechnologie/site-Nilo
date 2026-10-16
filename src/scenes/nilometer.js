import * as THREE from 'three';
import { createWaterMaterial } from './water.js';
import { loadModel } from './assets.js';
import { rng } from './textures.js';

// Contrato GLB: edifício completo, galeria Y=0, fachada +Z, sem escala adicional.
export const NILO_DIM = {
  W: 5.9, stairW: 0.96, rise: 0.24, stepsPerFlight: 13, squareFlights: 2,
  roundR: 2.35, floorY: -11.4, helixSteps: 21, helixWalk: 11,
  cubit: 0.5405, cubits: 16, pedestal: 1.2, waterY: -9.3, roomHalf: 4.52, roomH: 5.2,
  domeApex: 9.8,
};
export const NILO_ENTRY = {
  position: new THREE.Vector3(0, 1.62, 3.8),
  look: new THREE.Vector3(0, 1.5, 0),
};
// Mesma curva contínua de proporção para as duas câmeras; sem degrau em aspect=.8.
export function sceneFov(aspect, interior = false) {
  const wide=THREE.MathUtils.smootherstep(aspect,.6,1.25);
  return THREE.MathUtils.lerp(interior?74:66,interior?62:52,wide);
}
const D = NILO_DIM;
const a = D.W / 2 - D.stairW / 2, flightDrop = D.rise * D.stepsPerFlight;
const cubit0Y = D.floorY + D.pedestal, colH = D.cubits * D.cubit;
const rc = D.roundR - D.stairW / 2, helixStart = 5 * Math.PI / 4, dTheta = .165;

export function stairPath() {
  const corners = [[a,a],[-a,a],[-a,-a]], path = [];
  let y=0;
  for(let k=0;k<2;k++) {
    const [x,z]=corners[k], [ex,ez]=corners[k+1];
    const dx=(ex-x)/(2*a), dz=(ez-z)/(2*a);
    path.push(new THREE.Vector3(x,y,z));
    for(let s=1;s<=3;s++) {
      const u=s/4;
      path.push(new THREE.Vector3(
        THREE.MathUtils.lerp(x+dx*.48,ex-dx*.48,u),y-flightDrop*u,
        THREE.MathUtils.lerp(z+dz*.48,ez-dz*.48,u)));
    }
    y-=flightDrop;
  }
  path.push(new THREE.Vector3(-a,y,-a));
  for(let i=0;i<D.helixWalk;i+=2) {
    const th=helixStart+i*dTheta;
    path.push(new THREE.Vector3(Math.cos(th)*rc,y-(i+1)*D.rise,Math.sin(th)*rc));
  }
  const last=helixStart+D.helixWalk*dTheta;
  path.push(new THREE.Vector3(Math.cos(last)*rc,y-(D.helixWalk+1)*D.rise,Math.sin(last)*rc));
  return { path, curve: new THREE.CatmullRomCurve3(path,false,'centripetal') };
}

// r186: smootherstep perto do fim pode produzir 1 + 2e-16; getPointAt então
// consulta além do cache de arclength e passa NaN a getPoint. Fecha os extremos
// explicitamente e limita também o parâmetro remapeado, sem capturar exceções.
export function sampleStairCurve(curve, u, target) {
  if(u<=1e-10)return curve.getPoint(0,target);
  if(u>=1-1e-10)return curve.getPoint(1,target);
  const t=THREE.MathUtils.clamp(curve.getUtoTmapping(u),0,1);
  return curve.getPoint(t,target);
}

export async function createNilometer({ quality }) {
  const [model, guardians] = await Promise.all([loadModel('nilometer'), loadModel('guardians')]);
  const scene=new THREE.Scene();
  scene.name = 'NilometerInterior';
  // A cena raiz do rio fornece fundo/fog; esta Scene é apenas um nó transformado.
  const camera=new THREE.PerspectiveCamera(62,1,.05,6000);
  scene.add(camera, model, guardians);
  function prepareMesh(o) {
    if(!o.isMesh)return;
    o.castShadow=o.receiveShadow=true;
    const materials=Array.isArray(o.material)?o.material:[o.material];
    for(const material of materials) {
      material.shadowSide=THREE.BackSide;
      if(material.map)material.map.anisotropy=quality.mobile?2:4;
      if(material.normalMap)material.normalScale.setScalar(.65);
    }
  }
  model.traverse(prepareMesh);
  guardians.traverse(prepareMesh);
  function required(parent, name) {
    const node=parent.getObjectByName(name);
    if(!node)throw new Error(`Contrato GLB incompleto: falta ${name}`);
    return node;
  }
  const doorLeft=required(model,'DoorLeft'), doorRight=required(model,'DoorRight');
  const guardLeft=required(guardians,'GuardLeft'), guardRight=required(guardians,'GuardRight');
  const spearLeft=required(guardLeft,'SpearLeft'), spearRight=required(guardRight,'SpearRight');
  // SpearLeft/Right giram no ombro com manga, braço, mão e lança; corpo separado.
  // Rest Z importado: -.25/+.25. Deltas +.95/-.95 chegam a +.70/-.70 absolutos.
  const entranceMotion={doorLeft:-1.4,doorRight:1.4,spearLeft:.95,spearRight:-.95};
  const rest={doorLeft:doorLeft.rotation.y,doorRight:doorRight.rotation.y,
    spearLeft:spearLeft.rotation.z,spearRight:spearRight.rotation.z};
  // A sombra do edifício é estática: peças móveis não deixam sombras congeladas.
  for(const part of [doorLeft,doorRight,guardians])part.traverse(o=>{if(o.isMesh)o.castShadow=false;});
  function setEntrance(approach) {
    // A abertura fica legível de perto e termina antes de cruzar cada obstáculo.
    const doors=THREE.MathUtils.smootherstep(approach,.65,.87);
    const spears=THREE.MathUtils.smootherstep(approach,.60,.82);
    doorLeft.rotation.y=rest.doorLeft+entranceMotion.doorLeft*doors;
    doorRight.rotation.y=rest.doorRight+entranceMotion.doorRight*doors;
    spearLeft.rotation.z=rest.spearLeft+entranceMotion.spearLeft*spears;
    spearRight.rotation.z=rest.spearRight+entranceMotion.spearRight*spears;
  }

  // Uma sombra estática, luz difusa azulada e luz refletida da água.
  const ambient=new THREE.HemisphereLight('#d1e1e2','#6d7568',.2);
  scene.add(ambient);
  const sun=new THREE.SpotLight('#ffdfb0',1250,40,.57,.72,1.8);
  sun.position.set(-1.5,6,1.3);sun.target.position.set(.7,-8,0);
  sun.castShadow=quality.shadows;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.bias=-.001;sun.shadow.normalBias=.07;
  sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;
  scene.add(sun,sun.target);
  const reflected=new THREE.PointLight('#7faeab',27,18,1.6);
  reflected.position.set(.2,-8.4,.5);scene.add(reflected);
  const lantern=new THREE.PointLight('#ffc079',15,12,1.6);
  lantern.position.set(-2.3,-2.1,.9);scene.add(lantern);
  // Luz rebatida alcança a face interna de PaintedDome (ápice Y=9.8).
  // Sem shadow map, inclusive no móvel; mantém a exposição global constante.
  const domeFill=new THREE.PointLight('#f5e4cf',12,5,2);
  domeFill.name='DomeFill';domeFill.position.set(0,6,0);domeFill.castShadow=false;
  scene.add(domeFill);
  function setInteriorLight(blend) {
    ambient.intensity=THREE.MathUtils.lerp(.2,1.35,blend);
    domeFill.intensity=THREE.MathUtils.lerp(12,24,blend);
  }

  const waterMat=createWaterMaterial({
    deep:'#102e2a',shallow:'#2f5146',skyTop:'#668283',skyHorizon:'#4d6559',
    sunColor:'#e8c89a',sunDir:new THREE.Vector3(-.25,1,.15),glitter:.25,
    fogColor:'#182b2c',fogNear:12,fogFar:35,scale:3,flow:new THREE.Vector2(.08,.06),
  });
  const water=new THREE.Mesh(new THREE.CircleGeometry(D.roundR-.02,48),waterMat);
  water.rotation.x=-Math.PI/2;water.position.y=D.waterY;scene.add(water);

  const rand=rng(861), count=quality.mobile?60:150, positions=new Float32Array(count*3);
  for(let i=0;i<count;i++) {
    positions[i*3]=(rand()-.5)*4.4;positions[i*3+1]=2-rand()*10;positions[i*3+2]=(rand()-.5)*4.4;
  }
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const dust=new THREE.Points(dustGeo,new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`varying float a;void main(){vec4 p=modelViewMatrix*vec4(position,1.);a=smoothstep(.7,3.,-p.z)*(1.-smoothstep(9.,14.,-p.z));gl_PointSize=clamp(12./max(.1,-p.z),1.,3.);gl_Position=projectionMatrix*p;}`,
    fragmentShader:`varying float a;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(vec3(.95,.8,.55),(1.-smoothstep(.05,.5,d))*a*.25);}`,
  }));scene.add(dust);

  const {path,curve}=stairPath(), eye=1.62;
  const doorPos=NILO_ENTRY.position;
  const startStair=path[0].clone().add(new THREE.Vector3(0,eye,0));
  // Avança além das folhas abertas antes de virar; segue a galeria sem cortar o poço.
  const pastDoors=new THREE.Vector3(0,eye,3.15);
  const galleryCorner=new THREE.Vector3(startStair.x,eye,pastDoors.z);
  const pos=new THREE.Vector3(),look=new THREE.Vector3(),ahead=new THREE.Vector3(),colPt=new THREE.Vector3();
  const worldLook=new THREE.Vector3();
  const ceilingLook=new THREE.Vector3(0,D.domeApex,0), columnLook=new THREE.Vector3(0,-3,0);
  const waterLook=new THREE.Vector3(.4,D.waterY,.2);
  const CEILING=.16,COLUMN=.30,CLEAR_DOORS=.36,CORNER=.46,WALK=.54,END=.94;
  const result={covado:0};
  function stairLook(u, target) {
    sampleStairCurve(curve,Math.min(u+.05,1),ahead);ahead.y+=eye-.4;
    colPt.set(0,pos.y-1,0);target.lerpVectors(colPt,ahead,.3);
  }
  pos.copy(startStair);
  const startLook=new THREE.Vector3();stairLook(0,startLook);

  function update({p,time,pointer,reduced,viewRatio=camera.aspect}) {
    const t=reduced?0:time;
    waterMat.uniforms.uTime.value=t*.4;dust.rotation.y=t*.008;
    if(p<CEILING) {
      pos.copy(doorPos);
      look.lerpVectors(NILO_ENTRY.look,ceilingLook,THREE.MathUtils.smootherstep(p,0,CEILING));
    } else if(p<COLUMN) {
      pos.copy(doorPos);
      look.lerpVectors(ceilingLook,columnLook,THREE.MathUtils.smootherstep(p,CEILING,COLUMN));
    } else if(p<CLEAR_DOORS) {
      pos.lerpVectors(doorPos,pastDoors,THREE.MathUtils.smootherstep(p,COLUMN,CLEAR_DOORS));
      look.copy(columnLook);
    } else if(p<CORNER) {
      pos.lerpVectors(pastDoors,galleryCorner,THREE.MathUtils.smootherstep(p,CLEAR_DOORS,CORNER));
      look.copy(columnLook);
    } else if(p<WALK) {
      const e=THREE.MathUtils.smootherstep(p,CORNER,WALK);
      pos.lerpVectors(galleryCorner,startStair,e);look.lerpVectors(columnLook,startLook,e);
    } else {
      const u=THREE.MathUtils.smootherstep(p,WALK,END);
      sampleStairCurve(curve,u,pos);pos.y+=eye;
      stairLook(u,look);
      if(p>END)look.lerp(waterLook,THREE.MathUtils.smootherstep((p-END)/(1-END),0,1));
    }
    camera.position.copy(pos);
    // Object3D.lookAt recebe coordenadas WORLD mesmo quando a câmera tem pai.
    worldLook.copy(look);scene.localToWorld(worldLook);camera.lookAt(worldLook);
    const pointerWeight=reduced?0:THREE.MathUtils.smootherstep(p,0,.08);
    camera.rotation.y-=pointer.x*.025*pointerWeight;camera.rotation.x+=pointer.y*.015*pointerWeight;
    const fov=sceneFov(viewRatio,true);
    if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
    const lookY=p<WALK?cubit0Y+colH:camera.position.y-1;
    result.covado=THREE.MathUtils.clamp((lookY-cubit0Y)/D.cubit,0,D.cubits);
    return result;
  }
  // O aspect acompanha o canvas; o FOV vem da proporção suavizada pelo stage.
  function resize(w,h){camera.aspect=w/h;camera.updateProjectionMatrix();}
  return {scene,camera,update,resize,setEntrance,setInteriorLight,entranceMotion,
    get doorAngles(){return {doorLeft:doorLeft.rotation.y,doorRight:doorRight.rotation.y,
      spearLeft:spearLeft.rotation.z,spearRight:spearRight.rotation.z};}};
}
