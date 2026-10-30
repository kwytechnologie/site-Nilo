import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const pending = new Map();
// Mudar junto do contrato/arquivos GLB: uma página já visitada pode ter modelos
// antigos no cache HTTP mesmo após receber o JavaScript novo do GitHub Pages.
const MODEL_REVISION = 'roda-20261030-fixes';

// Arquivos exportados do Blender com WebP + Meshopt, servidos pelo próprio site.
export function loadModel(name) {
  if (!pending.has(name)) {
    const task = loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb?v=${MODEL_REVISION}`)
      .then(({ scene }) => scene)
      .catch(error => { pending.delete(name); throw error; });
    pending.set(name, task);
  }
  return pending.get(name);
}
