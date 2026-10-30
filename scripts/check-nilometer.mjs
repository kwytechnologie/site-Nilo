// Checks the decoded shipping GLB: compression can collapse gaps absent in Blender.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Triangle, Vector3 } from 'three';

const file = await readFile(process.argv[2] || 'public/models/nilometer.glb');
const jsonSize = file.readUInt32LE(12);
const gltf = JSON.parse(file.subarray(20, 20 + jsonSize));
const binary = file.subarray(28 + jsonSize), buffers = new Map();
await MeshoptDecoder.ready;
function accessor(index) {
  const a = gltf.accessors[index], v = gltf.bufferViews[a.bufferView];
  if (!buffers.has(a.bufferView)) {
    const e = v.extensions?.EXT_meshopt_compression;
    const bytes = e ? new Uint8Array(e.count * e.byteStride) : binary.subarray(v.byteOffset, v.byteOffset + v.byteLength);
    if (e) MeshoptDecoder.decodeGltfBuffer(bytes, e.count, e.byteStride, binary.subarray(e.byteOffset, e.byteOffset + e.byteLength), e.mode, e.filter);
    buffers.set(a.bufferView, new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  }
  const view = buffers.get(a.bufferView), width = a.type === 'VEC3' ? 3 : 1;
  const size = a.componentType === 5123 ? 2 : 4;
  assert([5123, 5125, 5126].includes(a.componentType));
  const read = a.componentType === 5126 ? 'getFloat32' : size === 2 ? 'getUint16' : 'getUint32';
  return Array.from({ length: a.count }, (_, i) => Array.from({ length: width }, (_, k) =>
    view[read]((a.byteOffset || 0) + i * (v.byteStride || width * size) + k * size, true)));
}
function primitives(name) {
  const node = gltf.nodes.find(n => n.name === name);
  assert(node, `Missing ${name}`);
  return gltf.meshes[node.mesh].primitives;
}
const plaques = primitives('BrandInscriptions');
const frieze = plaques.find(p => gltf.materials[p.material].name.startsWith('Estuque vegetal'));
const backing = plaques.find(p => gltf.materials[p.material].name.startsWith('Azul mineral'));
assert(frieze && backing);
const ornament = accessor(frieze.attributes.POSITION), support = accessor(backing.attributes.POSITION);
for (const axis of [0, 2]) for (const sign of [-1, 1]) {
  const front = Math.max(...ornament.filter(p => p[axis] * sign > 4.3).map(p => p[axis] * sign));
  const base = Math.min(...support.filter(p => p[1] > 3.8 && p[axis] * sign > 4.3).map(p => p[axis] * sign));
  assert(Number.isFinite(front) && Number.isFinite(base) && base - front >= .005,
    `Frieze overlaps backing after compression: axis=${axis}, sign=${sign}, gap=${base - front}`);
}
const tops = [];
for (const p of primitives('NilometerV2')) {
  const vertices = accessor(p.attributes.POSITION).map(v => new Vector3(...v));
  const indices = accessor(p.indices).flat();
  for (let i = 0; i < indices.length; i += 3) {
    const t = new Triangle(...indices.slice(i, i + 3).map(k => vertices[k]));
    if ([t.a, t.b, t.c].every(v => Math.abs(v.y) < .001) && t.getNormal(new Vector3()).y > .99) tops.push(t);
  }
}
for (const x of [2.1, 2.47, 2.85]) for (const z of [2.1, 2.47, 2.85]) {
  assert(tops.some(t => t.containsPoint(new Vector3(x, 0, z))), `Missing landing at ${x}, ${z}`);
}
console.log('PASS: four friezes separated after Meshopt; nine landing samples covered, normals upward.');
