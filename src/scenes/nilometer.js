import * as THREE from 'three';
import { createWaterMaterial } from './water.js';
import { loadModel } from './assets.js';
import { rng } from './textures.js';

// As mesmas dimensões de art/build_nilo.py. Reconstituição artística, aproximada.
export const NILO_DIM = {
  W: 5.9, stairW: 0.96, rise: 0.24, stepsPerFlight: 13, squareFlights: 2,
  roundR: 2.35, floorY: -11.4, helixSteps: 21, helixWalk: 11,
  cubit: 0.5405, cubits: 16, pedestal: 1.2, waterY: -9.3, roomHalf: 4.4, roomH: 5.2,
};
const D = NILO_DIM;
const a = D.W / 2 - D.stairW / 2, flightDrop = D.rise * D.stepsPerFlight;
const cubit0Y = D.floorY + D.pedestal, colH = D.cubits * D.cubit;
const rc = D.roundR - D.stairW / 2, helixStart = 5 * Math.PI / 4, dTheta = .165;

function stairPath() {
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

export async function createNilometer({ quality }) {
  const model=await loadModel('nilometer');
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#132027');
  scene.fog=new THREE.FogExp2('#182b2c',.014);
  const camera=new THREE.PerspectiveCamera(62,1,.05,65);
  model.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=o.receiveShadow=true;
    o.material.shadowSide=THREE.BackSide;
    if(o.material.map)o.material.map.anisotropy=quality.mobile?2:4;
    if(o.material.normalMap)o.material.normalScale.setScalar(.65);
  });
  scene.add(model);

  // Uma sombra estática, luz difusa azulada e luz refletida da água.
  scene.add(new THREE.HemisphereLight('#d1e1e2','#3f4b37',1.35));
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
  const doorPos=new THREE.Vector3(.4,eye,D.roomHalf-.9);
  const startStair=path[0].clone().add(new THREE.Vector3(0,eye,0));
  const pos=new THREE.Vector3(),look=new THREE.Vector3(),ahead=new THREE.Vector3(),colPt=new THREE.Vector3();
  const waterLook=new THREE.Vector3(.4,D.waterY,.2);
  const INTRO=.07,WALK=.13,END=.9;

  function update({p,time,pointer,reduced}) {
    const t=reduced?0:time;
    waterMat.uniforms.uTime.value=t*.4;dust.rotation.y=t*.008;
    if(p<INTRO) {
      const e=THREE.MathUtils.smootherstep(p/INTRO,0,1);
      pos.copy(doorPos);look.set(0,THREE.MathUtils.lerp(D.roomH+5,-3,e),THREE.MathUtils.lerp(-1.2,0,e));
    } else if(p<WALK) {
      const e=THREE.MathUtils.smootherstep((p-INTRO)/(WALK-INTRO),0,1);
      pos.lerpVectors(doorPos,startStair,e);look.set(0,-3-e*.5,0);
    } else {
      const u=THREE.MathUtils.clamp((p-WALK)/(END-WALK),0,1);
      curve.getPointAt(u,pos);pos.y+=eye;
      curve.getPointAt(Math.min(u+.05,1),ahead);ahead.y+=eye-.4;
      colPt.set(0,pos.y-1,0);look.lerpVectors(colPt,ahead,.3);
      if(p>END)look.lerp(waterLook,THREE.MathUtils.smootherstep((p-END)/(1-END),0,1));
    }
    camera.position.copy(pos);camera.lookAt(look);
    if(!reduced) {camera.rotation.y-=pointer.x*.025;camera.rotation.x+=pointer.y*.015;}
    const lookY=p<WALK?cubit0Y+colH:camera.position.y-1;
    return {covado:THREE.MathUtils.clamp((lookY-cubit0Y)/D.cubit,0,D.cubits)};
  }
  function resize(w,h){camera.aspect=w/h;camera.fov=w/h<.8?74:62;camera.updateProjectionMatrix();}
  return {scene,camera,update,resize};
}
