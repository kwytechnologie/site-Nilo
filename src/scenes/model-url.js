import vegetation from '../../public/models/vegetation.glb?url';
import nilometer from '../../public/models/nilometer.glb?url';
import guardians from '../../public/models/guardians.glb?url';

// O Vite gera nomes por conteúdo; o deploy mantém versões antigas em /assets/.
const urls = { vegetation, nilometer, guardians };
export const modelUrl = name => urls[name];
