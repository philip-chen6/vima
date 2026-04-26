"use client";

/**
 * HeroShader — multi-pass GLSL3 background for the vima hero.
 *
 * 3 passes:
 *   1) Buffer A (main render)  — hex-tiled chromatic shader with CRT interference
 *   2) Buffer B (bloom down)   — separable blur, downsampled
 *   3) Image    (composite)    — separable blur up + main composite + vignette
 *
 * Implementation notes:
 *   - Uses Three.js `RawShaderMaterial` with `THREE.GLSL3` so all the GLSL ES 3.0
 *     features in the source (uint, uvec4, texelFetch, texture(sampler, uv), ...)
 *     compile cleanly. WebGL2 required (Next 16 + modern browsers = fine).
 *   - HalfFloat render targets so bloom HDR doesn't clip.
 *   - iChannel0 noise texture is a 1024×1024 RGBA8 random buffer, generated on mount.
 *   - The render loop is paused when the canvas is off-screen (IntersectionObserver)
 *     OR when the tab is hidden (visibilitychange), so we don't burn GPU cycles
 *     for nothing.
 *   - DPR is clamped to 1 (matches `kScreenDownsample 1` in the shader). HiDPI would
 *     melt mid-range GPUs given 5×5 AA + 2-iter ripple loops per pixel.
 *
 * Performance dials inside the shader (Buffer A):
 *   - kAntiAlias = 5  → 25 samples per pixel (heavy but matches Shadertoy)
 *   - kMaxIterations = 2
 *   - kTurns = 7, kNumRipples = 5
 *   Lower these via the BUFFER_A string if you need more headroom.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

const PROGRAMMATIC_SCROLL_START = "vima-programmatic-scroll:start";
const PROGRAMMATIC_SCROLL_END = "vima-programmatic-scroll:end";

// ─── Shared GLSL utilities (used by all 3 passes) ─────────────────────────
// RawShaderMaterial does NOT auto-inject precision; GLSL ES 3.0 requires it.
const COMMON = /* glsl */ `
precision highp float;
precision highp int;
precision highp sampler2D;

#define kScreenDownsample 1

vec2 gResolution;
vec2 gFragCoord;
float gTime;
uvec4 rngSeed;
float gDxyDuv;

void SetGlobals(vec2 fragCoord, vec2 resolution, float time) {
  gFragCoord = fragCoord;
  gResolution = resolution;
  gTime = time;
  gDxyDuv = 1.0 / gResolution.x;
}

#define kPi      3.14159265359
#define kTwoPi   (2.0 * kPi)
#define kHalfPi  (0.5 * kPi)
#define kRoot2   1.41421356237
#define kFltMax  3.402823466e+38
#define kIntMax  0x7fffffff
#define kOne     vec3(1.0)
#define kZero    vec3(0.0)
#define kPink    vec3(1.0, 0.0, 0.2)

float cubrt(float a)         { return sign(a) * pow(abs(a), 1.0 / 3.0); }
float toRad(float deg)       { return kTwoPi * deg / 360.0; }
float sqr(float a)           { return a * a; }
vec3  sqr(vec3 a)            { return a * a; }
float cub(float a)           { return a * a * a; }
float mod2(float a, float b) { return mod(mod(a, b) + b, b); }
float length2(vec2 v)        { return dot(v, v); }
float length2(vec3 v)        { return dot(v, v); }
float luminance(vec3 v)      { return v.x * 0.17691 + v.y * 0.8124 + v.z * 0.01063; }
float sin01(float a)         { return 0.5 * sin(a) + 0.5; }
float cos01(float a)         { return 0.5 * cos(a) + 0.5; }
float saturate(float a)      { return clamp(a, 0.0, 1.0); }
vec3  saturate(vec3 a)       { return clamp(a, 0.0, 1.0); }
float saw01(float a)         { return abs(fract(a) * 2.0 - 1.0); }
float cwiseMax(vec3 v)       { return (v.x > v.y) ? ((v.x > v.z) ? v.x : v.z) : ((v.y > v.z) ? v.y : v.z); }
float cwiseMax(vec2 v)       { return (v.x > v.y) ? v.x : v.y; }
float cwiseMin(vec3 v)       { return (v.x < v.y) ? ((v.x < v.z) ? v.x : v.z) : ((v.y < v.z) ? v.y : v.z); }
float cwiseMin(vec2 v)       { return (v.x < v.y) ? v.x : v.y; }

// ── 2D primitives + transforms ────────────────────────────────────────────
mat3 WorldToViewMatrix(float rot, vec2 trans, float sca) {
  return mat3(vec3(cos(rot) / sca,  sin(rot) / sca, trans.x),
              vec3(-sin(rot) / sca, cos(rot) / sca, trans.y),
              vec3(1.0));
}

vec2 TransformScreenToWorld(vec2 p) {
  return (p - vec2(gResolution.xy) * 0.5) / float(gResolution.y);
}

vec3 Cartesian2DToBarycentric(vec2 p) {
  return vec3(p, 0.0) * mat3(vec3(0.0,  1.0 / 0.8660254037844387, 0.0),
                             vec3(1.0,  0.5773502691896257,       0.0),
                             vec3(-1.0, 0.5773502691896257,       0.0));
}

vec2 Cartesian2DToHexagonalTiling(in vec2 uv, out vec3 bary, out ivec2 ij) {
  #define kHexRatio vec2(1.5, 0.8660254037844387)
  vec2 uvClip = mod(uv + kHexRatio, 2.0 * kHexRatio) - kHexRatio;
  ij = ivec2((uv + kHexRatio) / (2.0 * kHexRatio)) * 2;
  if (uv.x + kHexRatio.x <= 0.0) ij.x -= 2;
  if (uv.y + kHexRatio.y <= 0.0) ij.y -= 2;
  bary = Cartesian2DToBarycentric(uvClip);
  if (bary.x > 0.0) {
    if (bary.z > 1.0)      { bary += vec3(-1.0,  1.0, -2.0); ij += ivec2(-1,  1); }
    else if (bary.y > 1.0) { bary += vec3(-1.0, -2.0,  1.0); ij += ivec2( 1,  1); }
  } else {
    if (bary.y < -1.0)     { bary += vec3( 1.0,  2.0, -1.0); ij += ivec2(-1, -1); }
    else if (bary.z < -1.0){ bary += vec3( 1.0, -1.0,  2.0); ij += ivec2( 1, -1); }
  }
  return vec2(bary.y * 0.5773502691896257 - bary.z * 0.5773502691896257, bary.x);
}

float SmoothStep(float a, float b, float x) { return mix(a, b, x * x * (3.0 - 2.0 * x)); }
float SmoothStep(float x)                   { return mix(0.0, 1.0, x * x * (3.0 - 2.0 * x)); }

float PaddedSmoothStep(float x, float a, float b) {
  return SmoothStep(saturate(x * (a + b + 1.0) - a));
}
float PaddedSmoothStep(float x, float a) { return PaddedSmoothStep(x, a, a); }

float Impulse(float x, float axis, float stdDev) {
  return exp(-sqr((x - axis) / stdDev));
}

float KickDrop(float t, vec2 p0, vec2 p1, vec2 p2, vec2 p3) {
  if (t < p1.x)      return mix(p0.y, p1.y, max(0.0, exp(-sqr((t - p1.x)*2.145966026289347/(p1.x-p0.x))) - 0.01) / 0.99);
  else if (t < p2.x) return mix(p1.y, p2.y, (t - p1.x) / (p2.x - p1.x));
  else               return mix(p3.y, p2.y, max(0.0, exp(-sqr((t - p2.x)*2.145966026289347/(p3.x-p2.x))) - 0.01) / 0.99);
}
float KickDrop(float t, vec2 p0, vec2 p1, vec2 p2) { return KickDrop(t, p0, p1, p1, p2); }

// ── PRNG / hash ───────────────────────────────────────────────────────────
uvec4 PCGAdvance() {
  rngSeed = rngSeed * 1664525u + 1013904223u;
  rngSeed.x += rngSeed.y * rngSeed.w;
  rngSeed.y += rngSeed.z * rngSeed.x;
  rngSeed.z += rngSeed.x * rngSeed.y;
  rngSeed.w += rngSeed.y * rngSeed.z;
  rngSeed ^= rngSeed >> 16u;
  rngSeed.x += rngSeed.y * rngSeed.w;
  rngSeed.y += rngSeed.z * rngSeed.x;
  rngSeed.z += rngSeed.x * rngSeed.y;
  rngSeed.w += rngSeed.y * rngSeed.z;
  return rngSeed;
}

vec4 Rand(sampler2D s) {
  return texelFetch(s, (ivec2(gFragCoord) + ivec2(PCGAdvance() >> 16)) % 1024, 0);
}
vec4 Rand() { return vec4(PCGAdvance()) / float(0xffffffffu); }

void PCGInitialise(uint seed) {
  rngSeed = uvec4(20219u, 7243u, 12547u, 28573u) * seed;
}

uint RadicalInverse(uint i) {
  i = ((i & 0xffffu) << 16u) | (i >> 16u);
  i = ((i & 0x00ff00ffu) << 8u)  | ((i & 0xff00ff00u) >> 8u);
  i = ((i & 0x0f0f0f0fu) << 4u)  | ((i & 0xf0f0f0f0u) >> 4u);
  i = ((i & 0x33333333u) << 2u)  | ((i & 0xccccccccu) >> 2u);
  i = ((i & 0x55555555u) << 1u)  | ((i & 0xaaaaaaaau) >> 1u);
  return i;
}
float HaltonBase2(uint i) { return float(RadicalInverse(i)) / float(0xffffffffu); }

const mat4 kOrderedDither = mat4(vec4(0.0, 8.0, 2.0, 10.), vec4(12., 4., 14., 6.), vec4(3., 11., 1., 9.), vec4(15., 7., 13., 5.));
float OrderedDither(ivec2 p) {
  return (kOrderedDither[p.x & 3][p.y & 3] + 1.0) / 17.0;
}

#define kFNVPrime  0x01000193u
#define kFNVOffset 0x811c9dc5u

uint HashCombine(uint a, uint b) {
  return (((a << (31u - (b & 31u))) | (a >> (b & 31u)))) ^
         ((b << (a & 31u)) | (b >> (31u - (a & 31u))));
}
uint HashOf(uint i) {
  uint h = (kFNVOffset ^ (i & 0xffu)) * kFNVPrime;
  h = (h ^ ((i >> 8u)  & 0xffu)) * kFNVPrime;
  h = (h ^ ((i >> 16u) & 0xffu)) * kFNVPrime;
  h = (h ^ ((i >> 24u) & 0xffu)) * kFNVPrime;
  return h;
}
uint HashOf(uint a, uint b)                   { return HashCombine(HashOf(a), HashOf(b)); }
uint HashOf(uint a, uint b, uint c)           { return HashCombine(HashCombine(HashOf(a), HashOf(b)), HashOf(c)); }
uint HashOf(uint a, uint b, uint c, uint d)   { return HashCombine(HashCombine(HashOf(a), HashOf(b)), HashCombine(HashOf(c), HashOf(d))); }
float HashToFloat(uint i) { return float(i) / float(0xffffffffu); }

// ── Color ─────────────────────────────────────────────────────────────────
vec3 Hue(float phi) {
  float phiC = 6.0 * phi;
  int i = int(phiC);
  vec3 c0 = vec3(((i + 4) / 3) & 1, ((i + 2) / 3) & 1, ((i + 0) / 3) & 1);
  vec3 c1 = vec3(((i + 5) / 3) & 1, ((i + 3) / 3) & 1, ((i + 1) / 3) & 1);
  return mix(c0, c1, phiC - float(i));
}
vec3 HSVToRGB(vec3 hsv) { return mix(vec3(0.0), mix(vec3(1.0), Hue(hsv.x), hsv.y), hsv.z); }
vec3 RGBToHSV(vec3 rgb) {
  vec3 hsv;
  hsv.z = cwiseMax(rgb);
  float chroma = hsv.z - cwiseMin(rgb);
  hsv.y = (hsv.z < 1e-10) ? 0.0 : (chroma / hsv.z);
  if (chroma < 1e-10)        hsv.x = 0.0;
  else if (hsv.z == rgb.x)   hsv.x = (1.0 / 6.0) * (rgb.y - rgb.z) / chroma;
  else if (hsv.z == rgb.y)   hsv.x = (1.0 / 6.0) * (2.0 + (rgb.z - rgb.x) / chroma);
  else                       hsv.x = (1.0 / 6.0) * (4.0 + (rgb.x - rgb.y) / chroma);
  hsv.x = fract(hsv.x + 1.0);
  return hsv;
}
vec3 Overlay(vec3 a, vec3 b) {
  return vec3((a.x < 0.5) ? (2.0 * a.x * b.x) : (1.0 - 2.0 * (1.0 - a.x) * (1.0 - b.x)),
              (a.y < 0.5) ? (2.0 * a.y * b.y) : (1.0 - 2.0 * (1.0 - a.y) * (1.0 - b.y)),
              (a.z < 0.5) ? (2.0 * a.z * b.z) : (1.0 - 2.0 * (1.0 - a.z) * (1.0 - b.z)));
}

float CIEXYZGauss(float lambda, float alpha, float mu, float sigma1, float sigma2) {
  return alpha * exp(sqr(lambda - mu) / (-2.0 * sqr(lambda < mu ? sigma1 : sigma2)));
}
vec3 SampleSpectrum(float delta) {
  float lambda = mix(3800.0, 7000.0, delta);
  #define kRNorm (7000.0 - 3800.0) / 1143.07
  #define kGNorm (7000.0 - 3800.0) / 1068.7
  #define kBNorm (7000.0 - 3800.0) / 1068.25
  vec3 xyz;
  xyz.x = (CIEXYZGauss(lambda, 1.056, 5998.0, 379.0, 310.0) +
           CIEXYZGauss(lambda, 0.362, 4420.0, 160.0, 267.0) +
           CIEXYZGauss(lambda, 0.065, 5011.0, 204.0, 262.0)) * kRNorm;
  xyz.y = (CIEXYZGauss(lambda, 0.821, 5688.0, 469.0, 405.0) +
           CIEXYZGauss(lambda, 0.286, 5309.0, 163.0, 311.0)) * kGNorm;
  xyz.z = (CIEXYZGauss(lambda, 1.217, 4370.0, 118.0, 360.0) +
           CIEXYZGauss(lambda, 0.681, 4590.0, 260.0, 138.0)) * kBNorm;
  vec3 rgb;
  rgb.r = ( 2.04159 * xyz.x - 0.5650  * xyz.y - 0.34473 * xyz.z) / (2.0 * 0.565);
  rgb.g = (-0.96924 * xyz.x + 1.87596 * xyz.y + 0.04155 * xyz.z) / (2.0 * 0.472);
  rgb.b = ( 0.01344 * xyz.x - 0.11863 * xyz.y + 1.01517 * xyz.z) / (2.0 * 0.452);
  return rgb;
}

// ── Bloom kernels ─────────────────────────────────────────────────────────
#define kApplyBloom        true
#define kBloomTint         vec3(1.0)
#define kBloomRadius       vec2(0.02 / float(kScreenDownsample))
#define kBloomKernelShape  vec3(1.5, 1.0, 0.7)
#define kBloomDownsample   3
#define kDebugBloom        false
#define kBloomBurnout      vec3(0.2)

void Gaussian(in int k, in int radius, in vec3 rgbK, in vec3 kernelShape, inout vec3 sigmaL, inout vec3 sigmaWeights) {
  float d = float(abs(k)) / float(radius);
  vec3 weight = pow(max(vec3(0.), (exp(-sqr(vec3(d) * 4.0)) - 0.0183156) / 0.981684), kernelShape);
  sigmaL += rgbK * weight;
  sigmaWeights += weight;
}
#define BlurKernel Gaussian

vec3 SeparableBlurDown(ivec2 xy, ivec2 res, sampler2D s) {
  if (xy.y == 0 || xy.x >= res.x / kBloomDownsample || xy.y >= res.y / kBloomDownsample) return kZero;
  int radius = int(0.5 + float(min(res.x, res.y)) * kBloomRadius.x / float(kBloomDownsample));
  vec3 sigmaL = kZero, sigmaWeights = kZero;
  for (int k = -radius; k <= radius; ++k) {
    ivec2 ij = (xy + ivec2(k, 0)) * kBloomDownsample;
    vec3 texel = texelFetch(s, ij, 0).xyz;
    texel = max(kZero, texel - vec3(kBloomBurnout));
    BlurKernel(k, radius, texel, kBloomKernelShape, sigmaL, sigmaWeights);
  }
  return sigmaL / max(kOne, sigmaWeights);
}

vec3 SeparableBlurUp(ivec2 xyFrag, ivec2 res, sampler2D s) {
  int radius = int(0.5 + float(min(res.x, res.y)) * kBloomRadius.y / float(kBloomDownsample));
  vec3 sigmaL = kZero, sigmaWeights = kZero;
  for (int k = -radius; k <= radius; ++k) {
    vec2 uv = (vec2(xyFrag + ivec2(0, k * kBloomDownsample)) - 0.5) / vec2(res);
    vec3 texel = texture(s, uv / float(kBloomDownsample), 0.0).xyz;
    BlurKernel(k, radius, texel, kBloomKernelShape, sigmaL, sigmaWeights);
  }
  return sigmaL / max(kOne, sigmaWeights);
}

float Vignette(in vec2 fragCoord) {
  #define kVignetteStrength 0.7   // was 0.5 — stronger pull to center
  #define kVignetteScale    0.55
  #define kVignetteExponent 2.6
  vec2 uv = fragCoord / gResolution.xy;
  uv.x = (uv.x - 0.5) * (gResolution.x / gResolution.y) + 0.5;
  float x = 2.0 * (uv.x - 0.5);
  float y = 2.0 * (uv.y - 0.5);
  float dist = sqrt(x*x + y*y) / kRoot2;
  return mix(1.0, max(0.0, 1.0 - pow(dist * kVignetteScale, kVignetteExponent)), kVignetteStrength);
}
`;

// ─── Buffer A: main hex-tiled chromatic shader ────────────────────────────
const BUFFER_A = /* glsl */ `
uniform sampler2D iChannel0;
uniform vec3  iResolution;
uniform float iTime;
uniform int   iFrame;

out vec4 outColor;

#define iChannelNoise iChannel0

#define kCaptureTimeDelay 0.0
#define kCaptureTimeSpeed 1.0

vec3 Render(vec2 uvScreen, int idx, int maxSamples, bool isDisplaced, float jpegDamage, out float blend) {
  #define kMBlurGain (isDisplaced ? 100. : 10.0)
  #define kZoomOrder 2
  #define kEndPause  0.0
  #define kSpeed     0.05

  vec4 xi = Rand(iChannelNoise);
  uint hash = HashOf(uint(98796523), uint(gFragCoord.x), uint(gFragCoord.y));
  xi.y = (float(idx) + HaltonBase2(uint(idx) + hash)) / float(maxSamples);
  xi.x = xi.y;

  float time = 1. * max(0.0, iTime - kCaptureTimeDelay);
  time = (time * kCaptureTimeSpeed + xi.y * kMBlurGain / 60.0) * kSpeed;

  float phase = fract(time);
  int interval = int(time) & 1;
  interval <<= 1;
  float morph;
  float warpedTime;
  #define kIntervalPartition 0.85

  if (phase < kIntervalPartition) {
    float y = (interval == 0) ? uvScreen.y : (iResolution.y - uvScreen.y);
    warpedTime = (phase / kIntervalPartition) - 0.2 * sqrt(y / iResolution.y) - 0.1;
    phase = fract(warpedTime);
    morph = 1.0 - PaddedSmoothStep(sin01(kTwoPi * phase), 0., 0.4);
    blend = float(interval / 2) * 0.5;
    if (interval == 2) warpedTime *= 0.5;
  } else {
    time -= 0.8 * kSpeed * xi.y * kMBlurGain / 60.0;
    warpedTime = time;
    phase = (fract(time) - kIntervalPartition) / (1.0 - kIntervalPartition);
    morph = 1.0;
    blend = (KickDrop(phase, vec2(0.0, 0.0), vec2(0.2, -0.1), vec2(0.3, -0.1), vec2(0.7, 1.0)) + float(interval / 2)) * 0.5;
    interval++;
  }

  float beta = abs(2.0 * max(0.0, blend) - 1.0);

  #define kMaxIterations 2
  #define kTurns         7
  #define kNumRipples    5
  #define kRippleDelay   (float(kNumRipples) / float(kTurns))
  #define kThickness     mix(0.5, 0.4, morph)
  #define kExponent      mix(0.05, 0.55, morph)

  float expMorph = pow(morph, 0.3);
  #define kZoom  0.35
  #define kScale mix(2.6, 1.1, expMorph)

  mat3 M = WorldToViewMatrix(blend * kTwoPi, vec2(0.0), kZoom);
  vec2 uvView = TransformScreenToWorld(uvScreen);
  int invert = 0;

  // Chromatic aberration
  uvView /= 1.0 + 0.05 * length(uvView) * xi.z;
  uvView = (vec3(uvView, 1.0) * M).xy;

  vec3 baryDiscard;
  ivec2 ijDiscard;
  Cartesian2DToHexagonalTiling(uvView / 1.4, baryDiscard, ijDiscard);

  vec2 uvViewWarp = uvView;
  uvViewWarp.y *= mix(1.0, 0.1, sqr(1.0 - morph) * xi.y * saturate(sqr(0.5 * (1.0 + uvView.y))));

  float theta = toRad(30.0) * beta;
  mat2 r = mat2(vec2(cos(theta), -sin(theta)), vec2(sin(theta), cos(theta)));
  uvViewWarp = r * uvViewWarp;

  for (int iterIdx = 0; iterIdx < kMaxIterations; ++iterIdx) {
    vec3 bary;
    ivec2 ij;
    Cartesian2DToHexagonalTiling(uvViewWarp, bary, ij);
    if (!isDisplaced && ij != ivec2(0)) break;

    int subdiv = 1 + int(exp(-sqr(10. * mix(-1., 1., phase))) * 100.);

    float thetaH = kTwoPi * (floor(cos01(kTwoPi * phase) * 12.) / 6.);
    Cartesian2DToHexagonalTiling(uvViewWarp * (0.1 + float(subdiv)) - kHexRatio.y * vec2(sin(thetaH), cos(thetaH)) * floor(0.5 + sin01(kTwoPi * phase) * 2.) / 2., bary, ij);

    uint hexHash = HashOf(uint(phase * 6.), uint(subdiv), uint(ij.x), uint(ij.y));
    if (hexHash % 2u == 0u) {
      float alpha = PaddedSmoothStep(sin01(phase * 20.0), 0.2, 0.75);
      float dist = mix(cwiseMax(abs(bary)), length(uvView) * 2.5, 1.0 - alpha);
      float hashSum = bary[hexHash % 3u] + bary[(hexHash + 1u) % 3u];
      if (dist > 1.0 - 0.02 * float(subdiv)) invert = invert ^ 1;
      else if (fract(20. / float(subdiv) * hashSum) < 0.5) invert = invert ^ 1;
      if (iterIdx == 0) break;
    }

    float sigmaR = 0.0, sigmaWeight = 0.0;
    for (int j = 0; j < kTurns; ++j) {
      float delta = float(j) / float(kTurns);
      float thetaJ = kTwoPi * delta;
      for (int i = 0; i < kNumRipples; ++i) {
        float l = length(uvViewWarp - vec2(cos(thetaJ), sin(thetaJ))) * 0.5;
        float weight = log2(1.0 / (l + 1e-10));
        sigmaR += fract(l - pow(fract((float(j) + float(i) / kRippleDelay) / float(kTurns) + warpedTime), kExponent)) * weight;
        sigmaWeight += weight;
      }
    }
    invert = invert ^ int((sigmaR / sigmaWeight) > kThickness);

    thetaH = kTwoPi * (floor(cos01(kTwoPi * -phase) * 5. * 6.) / 6.);
    uvViewWarp = r * (uvViewWarp + vec2(cos(thetaH), sin(thetaH)) * 0.5);
    uvViewWarp *= kScale;
  }

  vec3 sigma = vec3(float(invert != 0));
  // Chromatic aberration mix dialed back: was sqr(beta), now sqr(beta) * 0.4 — less rainbow at transitions.
  return mix(1.0 - sigma, sigma * mix(kOne, SampleSpectrum(xi.x), sqr(beta) * 0.4), beta);
}

bool Interfere(inout vec2 xy, inout vec3 tint, in vec2 res) {
  // CRT interference (static, vert-displace, horiz-displace) all disabled.
  // The original Shadertoy is a "broken video" homage. As an ambient backdrop
  // behind a hero, the random glitches read as page-broken. Flip these to true
  // if you want the corruption back.
  #define kStatic              false
  #define kStaticFrequency     0.1
  #define kStaticLowMagnitude  0.01
  #define kStaticHighMagnitude 0.02
  #define kVDisplace            false
  #define kVDisplaceFrequency   0.07
  #define kHDisplace            false
  #define kHDisplaceFrequency   0.25
  #define kHDisplaceVMagnitude  0.1
  #define kHDisplaceHMagnitude  0.5

  float frameHash = HashToFloat(HashOf(uint(iFrame / int(10.0 / kCaptureTimeSpeed))));
  bool isDisplaced = false;

  if (kStatic) {
    float interP = 0.01, displacement = res.x * kStaticLowMagnitude;
    if (frameHash < kStaticFrequency) {
      interP = 0.5;
      displacement = kStaticHighMagnitude * res.x;
      tint = vec3(0.5);
    }
    PCGInitialise(HashOf(uint(xy.y / 2.), uint(iFrame / int(60.0 / (24.0 * kCaptureTimeSpeed)))));
    vec4 xi = Rand();
    if (xi.x < interP) {
      float mag = mix(-1.0, 1.0, xi.y);
      xy.x -= displacement * sign(mag) * sqr(abs(mag));
    }
  }

  if (kVDisplace && frameHash > 1.0 - kVDisplaceFrequency) {
    float dispX = HashToFloat(HashOf(8783u, uint(iFrame / int(10.0 / kCaptureTimeSpeed))));
    float dispY = HashToFloat(HashOf(364719u, uint(iFrame / int(12.0 / kCaptureTimeSpeed))));
    if (xy.y < dispX * res.y) {
      xy.y -= mix(-1.0, 1.0, dispY) * res.y * 0.2;
      isDisplaced = true;
      tint = vec3(3.);
    }
  } else if (kHDisplace && frameHash > 1.0 - kHDisplaceFrequency - kVDisplaceFrequency) {
    float dispX = HashToFloat(HashOf(147251u, uint(iFrame / int(9.0 / kCaptureTimeSpeed))));
    float dispY = HashToFloat(HashOf(287512u, uint(iFrame / int(11.0 / kCaptureTimeSpeed))));
    float dispZ = HashToFloat(HashOf(8756123u, uint(iFrame / int(7.0 / kCaptureTimeSpeed))));
    if (xy.y > dispX * res.y && xy.y < (dispX + mix(0.0, kHDisplaceVMagnitude, dispZ)) * res.y) {
      xy.x -= mix(-1.0, 1.0, dispY) * res.x * kHDisplaceHMagnitude;
      isDisplaced = true;
      tint = vec3(3.);
    }
  }
  return isDisplaced;
}

void main() {
  vec2 xy = gl_FragCoord.xy;
  SetGlobals(xy, iResolution.xy, iTime);

  if (xy.x > iResolution.x / float(kScreenDownsample) || xy.y > iResolution.y / float(kScreenDownsample)) {
    outColor = vec4(0.);
    return;
  }
  xy *= float(kScreenDownsample);

  vec3 tint;
  vec2 xyInterfere = xy;
  bool isDisplaced = Interfere(xyInterfere, tint, iResolution.xy);

  ivec2 xyDither = ivec2(xy) / int(HashOf(uint(iTime + sin(iTime) * 1.5), uint(xyInterfere.x / 128.), uint(xyInterfere.y / 128.)) & 127u);
  float jpegDamage = OrderedDither(xyDither);

  #define kAntiAlias 3
  vec3 rgb = vec3(0.0);
  float blend = 0.0;
  for (int i = 0, idx = 0; i < kAntiAlias; ++i) {
    for (int j = 0; j < kAntiAlias; ++j, ++idx) {
      vec2 xyAA = xyInterfere + vec2(float(i) / float(kAntiAlias), float(j) / float(kAntiAlias));
      rgb += Render(xyAA, idx, kAntiAlias * kAntiAlias, isDisplaced, jpegDamage, blend);
    }
  }
  rgb /= float(kAntiAlias * kAntiAlias);
  rgb = mix(rgb, Overlay(rgb, vec3(.15, 0.29, 0.39)), blend);

  if (isDisplaced) {
    #define kColourQuantisation 5
    rgb *= float(kColourQuantisation);
    if (fract(rgb.x) > jpegDamage) rgb.x += 1.0;
    if (fract(rgb.y) > jpegDamage) rgb.y += 1.0;
    if (fract(rgb.z) > jpegDamage) rgb.z += 1.0;
    rgb = floor(rgb) / float(kColourQuantisation);
  }

  vec3 hsv = RGBToHSV(rgb);
  hsv.x += -sin((hsv.x + 0.05) * kTwoPi) * 0.07;
  hsv.y *= 0.50;   // desaturate from full to half — was 1.0, kills the neon feel
  rgb = HSVToRGB(hsv);

  outColor = vec4(rgb, 1.0);
}
`;

// ─── Buffer B: bloom downsample ───────────────────────────────────────────
const BUFFER_B = /* glsl */ `
uniform sampler2D iChannel0;     // Buffer A output
uniform vec3  iResolution;
uniform float iTime;
uniform int   iFrame;

out vec4 outColor;

void main() {
  vec2 xyScreen = gl_FragCoord.xy;
  SetGlobals(xyScreen, iResolution.xy, iTime);
  outColor = vec4(0.);
  if (kApplyBloom) {
    outColor = vec4(SeparableBlurDown(ivec2(xyScreen), ivec2(iResolution.xy), iChannel0), 1.);
  }
}
`;

// ─── Image: composite (bloom up + main + grade + vignette) ────────────────
const IMAGE = /* glsl */ `
uniform sampler2D iChannel0;     // Buffer B (bloom)
uniform sampler2D iChannel1;     // Buffer A (main)
uniform vec3  iResolution;
uniform float iTime;
uniform int   iFrame;

out vec4 outColor;

void main() {
  vec2 xy = gl_FragCoord.xy;
  SetGlobals(xy, iResolution.xy, iTime);
  PCGInitialise(HashOf(uint(iFrame)));

  vec3 rgb = kZero;
  if (kApplyBloom) rgb = SeparableBlurUp(ivec2(xy), ivec2(iResolution.xy), iChannel0);

  rgb += texelFetch(iChannel1, ivec2(xy) / kScreenDownsample, 0).xyz * 0.45;  // was 0.6 — slightly less main contribution
  rgb = saturate(rgb);
  rgb = pow(rgb, vec3(0.8));
  // Compressed brightness range — was mix(kOne * 0.1, kOne * 0.9, rgb).
  // 0.04..0.45 keeps the shader as background, not foreground.
  rgb = mix(kOne * 0.04, kOne * 0.45, rgb);
  rgb *= Vignette(xy);
  rgb = saturate(rgb);

  outColor = vec4(rgb, 1.0);
}
`;

const VERT = /* glsl */ `
precision highp float;
in vec3 position;
void main() { gl_Position = vec4(position, 1.0); }
`;

// ─── Component ────────────────────────────────────────────────────────────
type Props = {
  className?: string;
  style?: React.CSSProperties;
  /** Multiplier on iTime delivered to the shader. 1 = real time. */
  speed?: number;
};

export default function HeroShader({ className, style, speed = 1 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    // ── WebGL2 availability check ────────────────────────────────────────
    // Required for GLSL3 + halfFloat render targets + uint / texelFetch.
    // Headless / sandboxed browsers (SwiftShader) and a few mobile contexts
    // can fail this; we no-op rather than crash the page.
    const probe = document.createElement("canvas");
    const gl2 = probe.getContext("webgl2");
    if (!gl2) {
      console.warn("[HeroShader] WebGL2 unavailable; skipping shader render.");
      return;
    }

    // ── Renderer ─────────────────────────────────────────────────────────
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch (err) {
      console.warn("[HeroShader] Renderer init failed; skipping.", err);
      return;
    }
    renderer.setPixelRatio(1);
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    // ── Noise texture for iChannel0 in Buffer A ──────────────────────────
    const NOISE_SIZE = 1024;
    const noiseData = new Uint8Array(NOISE_SIZE * NOISE_SIZE * 4);
    for (let i = 0; i < noiseData.length; i++) noiseData[i] = (Math.random() * 256) | 0;
    const noiseTex = new THREE.DataTexture(noiseData, NOISE_SIZE, NOISE_SIZE, THREE.RGBAFormat);
    noiseTex.wrapS = THREE.RepeatWrapping;
    noiseTex.wrapT = THREE.RepeatWrapping;
    noiseTex.minFilter = THREE.NearestFilter;
    noiseTex.magFilter = THREE.NearestFilter;
    noiseTex.needsUpdate = true;

    // ── Render targets (halfFloat for HDR bloom) ─────────────────────────
    const rtOpts: THREE.RenderTargetOptions = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    };
    let rtMain = new THREE.WebGLRenderTarget(width, height, rtOpts);
    let rtBloom = new THREE.WebGLRenderTarget(width, height, rtOpts);

    // ── Scene + ortho camera + full-screen quad ──────────────────────────
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);

    const makeMaterial = (frag: string, uniforms: Record<string, THREE.IUniform>) =>
      new THREE.RawShaderMaterial({
        vertexShader: VERT,
        fragmentShader: COMMON + frag,
        uniforms,
        glslVersion: THREE.GLSL3,
        depthTest: false,
        depthWrite: false,
      });

    const matA = makeMaterial(BUFFER_A, {
      iChannel0:   { value: noiseTex },
      iResolution: { value: new THREE.Vector3(width, height, 1) },
      iTime:       { value: 0 },
      iFrame:      { value: 0 },
    });
    const matB = makeMaterial(BUFFER_B, {
      iChannel0:   { value: rtMain.texture },
      iResolution: { value: new THREE.Vector3(width, height, 1) },
      iTime:       { value: 0 },
      iFrame:      { value: 0 },
    });
    const matImage = makeMaterial(IMAGE, {
      iChannel0:   { value: rtBloom.texture },
      iChannel1:   { value: rtMain.texture },
      iResolution: { value: new THREE.Vector3(width, height, 1) },
      iTime:       { value: 0 },
      iFrame:      { value: 0 },
    });

    const sceneA = new THREE.Scene();      sceneA.add(new THREE.Mesh(geometry, matA));
    const sceneB = new THREE.Scene();      sceneB.add(new THREE.Mesh(geometry, matB));
    const sceneImage = new THREE.Scene();  sceneImage.add(new THREE.Mesh(geometry, matImage));

    // ── Resize handling ──────────────────────────────────────────────────
    let resizeRaf = 0;
    const resize = () => {
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      if (newW === width && newH === height) return;
      width = newW;
      height = newH;
      renderer.setSize(width, height);

      const newRtMain = new THREE.WebGLRenderTarget(width, height, rtOpts);
      const newRtBloom = new THREE.WebGLRenderTarget(width, height, rtOpts);
      rtMain.dispose();
      rtBloom.dispose();
      rtMain = newRtMain;
      rtBloom = newRtBloom;

      matB.uniforms.iChannel0.value = rtMain.texture;
      matImage.uniforms.iChannel0.value = rtBloom.texture;
      matImage.uniforms.iChannel1.value = rtMain.texture;

      const res = new THREE.Vector3(width, height, 1);
      matA.uniforms.iResolution.value = res;
      matB.uniforms.iResolution.value = res;
      matImage.uniforms.iResolution.value = res;
    };
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(resize);
    };
    window.addEventListener("resize", onResize);

    // ── Visibility gating: pause off-screen, tab-hidden, and nav jumps ───
    let isVisible = true;
    let isDocVisible = !document.hidden;
    let isProgrammaticScroll = document.documentElement.getAttribute("data-programmatic-scroll") === "true";
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) isVisible = e.isIntersecting;
      },
      { threshold: 0 },
    );
    io.observe(container);

    const onVisibilityChange = () => {
      isDocVisible = !document.hidden;
    };
    const onProgrammaticScrollStart = () => {
      isProgrammaticScroll = true;
    };
    const onProgrammaticScrollEnd = () => {
      isProgrammaticScroll = false;
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener(PROGRAMMATIC_SCROLL_START, onProgrammaticScrollStart);
    window.addEventListener(PROGRAMMATIC_SCROLL_END, onProgrammaticScrollEnd);

    // ── Render loop ──────────────────────────────────────────────────────
    let frame = 0;
    let raf = 0;
    const startMs = performance.now();
    const tick = (nowMs: number) => {
      raf = requestAnimationFrame(tick);
      if (!isVisible || !isDocVisible || isProgrammaticScroll) return;

      const t = ((nowMs - startMs) / 1000) * speed;

      matA.uniforms.iTime.value = t;
      matA.uniforms.iFrame.value = frame;
      matB.uniforms.iTime.value = t;
      matB.uniforms.iFrame.value = frame;
      matImage.uniforms.iTime.value = t;
      matImage.uniforms.iFrame.value = frame;

      // Pass 1: main → rtMain
      renderer.setRenderTarget(rtMain);
      renderer.render(sceneA, camera);

      // Pass 2: bloom downsample → rtBloom
      renderer.setRenderTarget(rtBloom);
      renderer.render(sceneB, camera);

      // Pass 3: composite → screen
      renderer.setRenderTarget(null);
      renderer.render(sceneImage, camera);

      frame++;
    };
    raf = requestAnimationFrame(tick);

    // ── Cleanup ──────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeRaf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener(PROGRAMMATIC_SCROLL_START, onProgrammaticScrollStart);
      window.removeEventListener(PROGRAMMATIC_SCROLL_END, onProgrammaticScrollEnd);
      io.disconnect();

      rtMain.dispose();
      rtBloom.dispose();
      noiseTex.dispose();
      geometry.dispose();
      matA.dispose();
      matB.dispose();
      matImage.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [speed]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        ...style,
      }}
      aria-hidden
    />
  );
}
