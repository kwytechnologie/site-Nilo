import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { modelUrl } from './model-url.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const pending = new Map();
let workersStarted=false;

// Arquivos exportados do Blender com WebP + Meshopt, servidos pelo próprio site.
export function loadModel(name) {
  if (!pending.has(name)) {
    if(name!=='vegetation' && !workersStarted && typeof Worker!=='undefined') {
      MeshoptDecoder.useWorkers(1);
      workersStarted=true;
    }
    const task = loader.loadAsync(modelUrl(name))
      .then(({ scene }) => scene)
      .catch(error => { pending.delete(name); throw error; });
    pending.set(name, task);
  }
  return pending.get(name);
}
