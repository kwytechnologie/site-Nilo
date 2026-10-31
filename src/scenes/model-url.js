// Mudar junto dos GLBs para invalidar também o cache de quem já visitou o site.
const MODEL_REVISION = 'roda-20261031-materials';
export const modelUrl = name => `${import.meta.env.BASE_URL}models/${name}.glb?v=${MODEL_REVISION}`;
