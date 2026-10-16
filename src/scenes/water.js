import * as THREE from 'three';

// Água horizontal em XZ, opaca e sem passes/texturas adicionais. O ambiente é
// analítico: não reflete barcos, paredes ou outros objetos da cena.
// Opções extras (também editáveis via uniforms): waveStrength=1, rippleStrength=.55,
// speed=1, roughness=.24, reflectionStrength=1, variation=.65. Intensidades >= 0;
// roughness, reflectionStrength e variation ficam no intervalo [0, 1].
// uScale controla o tamanho do padrão, não a inclinação das ondas.
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
    uRiver: { value: opts.river ? 1 : 0 },
    uWaveStrength: { value: opts.waveStrength ?? 1.0 },
    uRippleStrength: { value: opts.rippleStrength ?? 0.55 },
    uSpeed: { value: opts.speed ?? 1.0 },
    uRoughness: { value: opts.roughness ?? 0.24 },
    uReflectionStrength: { value: opts.reflectionStrength ?? 1.0 },
    uVariation: { value: opts.variation ?? 0.65 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    transparent: false,
    // O plano do rio cobre quilômetros: mediump quantiza posições/fases no móvel.
    precision: 'highp',
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uFogNear, uFogFar, uGlitter, uScale, uRiver;
      uniform float uWaveStrength, uRippleStrength, uSpeed, uRoughness;
      uniform float uReflectionStrength, uVariation;
      uniform vec3 uSunDir, uSunColor, uDeep, uShallow, uSkyTop, uSkyHorizon, uFogColor;
      uniform vec2 uFlow;
      varying vec3 vWorld;

      // Filtra cada direção pela fase coberta pelo pixel, antes de formar a normal.
      // A energia não resolvida alarga o brilho, em vez de virar pontos piscando.
      void addWave(vec2 p, vec2 dx, vec2 dy, vec2 k, float phase,
                   float amplitude, float warp, vec2 warpGradient,
                   inout vec2 slope, inout float variance) {
        vec2 gradient = k + warpGradient;
        float footprint = abs(dot(gradient, dx)) + abs(dot(gradient, dy));
        float keep = 1.0 - smoothstep(0.6, 2.4, footprint);
        vec2 waveSlope = amplitude * gradient;
        slope += waveSlope * cos(dot(k, p) + warp + phase) * keep;
        float withinPixel = min(footprint * footprint / 12.0, 0.5);
        variance += dot(waveSlope, waveSlope) *
          (0.5 * (1.0 - keep * keep) + keep * keep * withinPixel);
      }

      void main() {
        float river = clamp(uRiver, 0.0, 1.0);
        float t = uTime * max(uSpeed, 0.0) * mix(0.35, 0.65, river);
        vec2 p = vWorld.xz * uScale + uFlow * t;
        vec2 dx = dFdx(p), dy = dFdy(p);
        float variation = clamp(uVariation, 0.0, 1.0);
        vec2 macroPhase = vec2(dot(p, vec2(0.071, 0.043)),
                              dot(p, vec2(-0.037, 0.089))) + vec2(t * 0.025, -t * 0.019);
        vec2 macroSin = sin(macroPhase), macroCos = cos(macroPhase);
        float warp = dot(macroSin, vec2(0.85, 0.55)) * variation;
        vec2 warpGradient = (vec2(0.071, 0.043) * macroCos.x * 0.85 +
                             vec2(-0.037, 0.089) * macroCos.y * 0.55) * variation;
        float waterPatch = 0.5 + dot(macroSin, vec2(0.25));
        float strength = max(uWaveStrength, 0.0) * mix(0.42, 1.0, river);
        strength *= mix(1.0, 0.72 + 0.40 * waterPatch, variation);
        float ripple = max(uRippleStrength, 0.0);
        vec2 slope = vec2(0.0);
        float variance = 0.0;
        // Quatro escalas independentes; sem a rotação/frequência geométrica repetitiva.
        addWave(p, dx, dy, vec2(0.23, 0.43), -t * 0.19, 0.10 * strength,
                warp, warpGradient, slope, variance);
        addWave(p, dx, dy, vec2(-0.71, 0.37), t * 0.13 + 2.1, 0.045 * strength,
                -warp * 0.7, -warpGradient * 0.7, slope, variance);
        addWave(p, dx, dy, vec2(1.67, 0.81), -t * 0.31 + 4.3, 0.022 * strength * ripple,
                warp * 1.2, warpGradient * 1.2, slope, variance);
        addWave(p, dx, dy, vec2(-3.10, 2.40), t * 0.23 + 1.4, 0.008 * strength * ripple,
                -warp, -warpGradient, slope, variance);
        vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));
        vec3 toEye = cameraPosition - vWorld;
        float dist = length(toEye);
        vec3 V = toEye / max(dist, 0.0001);

        vec3 R = reflect(-V, N);
        float h = clamp(R.y, 0.0, 1.0);
        vec3 skyMid = mix(uSkyHorizon, uSkyTop, 0.65);
        vec3 sky = mix(uSkyHorizon, skyMid, smoothstep(0.0, 0.22, h));
        sky = mix(sky, uSkyTop, smoothstep(0.18, 0.85, h));
        // Abaixo do horizonte: tom difuso de margem, não uma imagem dos objetos.
        vec3 ground = mix(uDeep, uSkyHorizon, 0.18);
        sky = mix(ground, sky, smoothstep(-0.10, 0.04, R.y));
        // Poço: ambiente escuro e abertura difusa acima, sem céu aberto no horizonte.
        vec3 room = mix(uSkyHorizon * 0.32, uSkyTop, smoothstep(0.45, 0.95, h));
        vec3 environment = mix(room, sky, river);

        // Fresnel de um dielétrico ar/água (F0 ~ 2%), sem brilho metálico uniforme.
        float grazing = 1.0 - clamp(dot(N, V), 0.0, 1.0);
        float grazing2 = grazing * grazing;
        float fres = 0.0204 + 0.9796 * grazing2 * grazing2 * grazing;
        float reflection = fres * clamp(uReflectionStrength, 0.0, 1.0);
        float sediment = (waterPatch - 0.5) * 0.28 * variation;
        vec3 body = mix(uDeep, uShallow, clamp(0.32 + sediment, 0.0, 1.0));
        // Escurecimento artístico das margens existentes; não depende da normal.
        float bankCurve = sin(vWorld.z * .013) * 6.0 + sin(vWorld.z * .039) * 2.4;
        float bankDistance = min(abs(vWorld.x + 62.0 - bankCurve), abs(vWorld.x - 58.0 - bankCurve));
        float bankShade = (1.0 - smoothstep(0.0, 11.0, bankDistance)) * river;
        body = mix(body, uDeep * 0.55, bankShade * 0.6);
        vec3 col = mix(body, environment, reflection);

        // Lobo solar analítico largo, filtrado também pelo ângulo de visão do pixel.
        // Só derivamos V: derivar N filtrada criaria derivadas de ordem superior.
        vec3 viewDx = dFdx(V), viewDy = dFdy(V);
        float viewVariance = (dot(viewDx, viewDx) + dot(viewDy, viewDy)) / 12.0;
        float roughness = clamp(uRoughness, 0.0, 1.0);
        float baseWidth = 0.003 + roughness * roughness * 0.12;
        float width = baseWidth + 2.0 * variance + viewVariance;
        float sunAngle = max(1.0 - dot(R, uSunDir), 0.0);
        // Reduz o pico ao alargar o lobo, preservando aproximadamente sua energia.
        float spec = exp(-sunAngle / width) * (baseWidth / width);
        float haloWidth = baseWidth * 5.0 + 2.0 * variance + viewVariance;
        float halo = exp(-sunAngle / haloWidth) * (baseWidth * 5.0 / haloWidth);
        float sunVisible = smoothstep(-0.02, 0.06, uSunDir.y);
        col += uSunColor * (spec * 4.0 + halo * 0.35) * reflection *
               max(uGlitter, 0.0) * sunVisible;

        float f = smoothstep(uFogNear, max(uFogFar, uFogNear + 0.001), dist);
        col = mix(col, uFogColor, f);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  return mat;
}
