import * as THREE from 'three';

// Água em shader: ondas por soma de senoides (sem textura), reflexo do céu por Fresnel e o
// rastro de brilho do sol. Serve ao rio e ao fundo do nilômetro, só mudando as cores.
export function createWaterMaterial(opts = {}) {
  const u = {
    uTime: { value: 0 },
    uSunDir: { value: (opts.sunDir ?? new THREE.Vector3(-0.4, 0.12, -1)).clone().normalize() },
    uSunColor: { value: new THREE.Color(opts.sunColor ?? '#ffcf8a') },
    uDeep: { value: new THREE.Color(opts.deep ?? '#123d42') },
    uShallow: { value: new THREE.Color(opts.shallow ?? '#2c6b66') },
    uSkyTop: { value: new THREE.Color(opts.skyTop ?? '#2a4a8a') },
    uSkyHorizon: { value: new THREE.Color(opts.skyHorizon ?? '#f0a868') },
    uFogColor: { value: new THREE.Color(opts.fogColor ?? '#d99a63') },
    uFogNear: { value: opts.fogNear ?? 80 },
    uFogFar: { value: opts.fogFar ?? 900 },
    uGlitter: { value: opts.glitter ?? 1.0 },
    uScale: { value: opts.scale ?? 1.0 },
    uFlow: { value: opts.flow ?? new THREE.Vector2(0.0, 0.6) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    transparent: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uFogNear, uFogFar, uGlitter, uScale;
      uniform vec3 uSunDir, uSunColor, uDeep, uShallow, uSkyTop, uSkyHorizon, uFogColor;
      uniform vec2 uFlow;
      varying vec3 vWorld;

      // Derivada de uma soma de ondas direcionais = normal da superfície.
      vec3 waveNormal(vec2 p, float t) {
        vec2 g = vec2(0.0);
        float amp = 0.075, freq = 0.19;
        vec2 dir = normalize(vec2(0.3, 1.0));
        for (int i = 0; i < 7; i++) {
          float ph = dot(dir, p) * freq + t * (0.9 + float(i) * 0.37);
          g += dir * cos(ph) * amp * freq;
          // gira a direção e encolhe a onda a cada camada
          dir = mat2(0.8, -0.6, 0.6, 0.8) * dir;
          amp *= 0.62; freq *= 1.85;
        }
        return normalize(vec3(-g.x, 1.0, -g.y));
      }

      void main() {
        vec2 p = vWorld.xz * uScale + uFlow * uTime;
        vec3 N = waveNormal(p, uTime);
        vec3 V = normalize(cameraPosition - vWorld);
        float dist = length(cameraPosition - vWorld);
        // Ao longe a água fica lisa (evita serrilhado).
        N = normalize(mix(N, vec3(0.0, 1.0, 0.0), smoothstep(60.0, 600.0, dist)));

        vec3 R = reflect(-V, N);
        float h = clamp(R.y, 0.0, 1.0);
        vec3 sky = mix(uSkyHorizon, uSkyTop, pow(h, 0.55));
        // halo do sol no reflexo
        float sunAmt = max(dot(R, uSunDir), 0.0);
        sky = sky * 0.62 + uSunColor * pow(sunAmt, 220.0) * 0.35;

        float fres = 0.03 + 0.72 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 body = mix(uDeep, uShallow, clamp(0.5 + N.x * 2.5, 0.0, 1.0));
        vec3 col = mix(body, sky, fres);

        // rastro de brilho: muitas facetas pequenas refletindo o sol
        float spec = pow(sunAmt, 1400.0) * 9.0 + pow(sunAmt, 400.0) * 0.5;
        col += uSunColor * spec * uGlitter;

        float f = smoothstep(uFogNear, uFogFar, dist);
        col = mix(col, uFogColor, f);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  return mat;
}
