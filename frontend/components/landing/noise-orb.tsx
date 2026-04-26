"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface NoiseOrbProps {
  size?: number;
}

type ShaderRef = {
  uniforms: {
    time?: { value: number };
  };
};

type ShaderMaterialUserData = {
  shader?: ShaderRef;
};

const NoiseOrb = ({ size = 280 }: NoiseOrbProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const [dimensions, setDimensions] = useState({ width: `${size}px`, height: `${size}px` });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth < 640 ? "200px" : `${size}px`,
        height: window.innerWidth < 640 ? "200px" : `${size}px`,
      });
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [size]);

  useEffect(() => {
    if (!mountRef.current) {
      return;
    }

    mountRef.current.innerHTML = "";

    const isMobile = window.innerWidth < 640;
    const currentMount = mountRef.current;
    const testCanvas = document.createElement("canvas");
    const hasWebGL = Boolean(testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl"));

    if (!hasWebGL) {
      setFallback(true);
      return;
    }

    class Molecule extends THREE.Object3D {
      radius = isMobile ? 0.5 : 0.65;
      detail = 40;
      particleSizeMin = 0.01;
      particleSizeMax = 0.08;
      geometry!: THREE.IcosahedronGeometry;
      material!: THREE.PointsMaterial;
      mesh!: THREE.Points;

      constructor() {
        super();
        this.build();
      }

      build() {
        this.geometry = new THREE.IcosahedronGeometry(1, this.detail);
        this.material = new THREE.PointsMaterial({
          map: this.dot(),
          blending: THREE.NormalBlending,
          color: 0xffffff,
          opacity: 0.8,
          transparent: true,
          depthTest: false,
        });
        this.setupShader(this.material);
        this.mesh = new THREE.Points(this.geometry, this.material);
        this.add(this.mesh);
      }

      dot(size = 32) {
        const sizeH = size * 0.5;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return new THREE.CanvasTexture(canvas);

        const gradient = ctx.createRadialGradient(sizeH, sizeH, 0, sizeH, sizeH, sizeH);
        gradient.addColorStop(0, "#f7ecef");
        gradient.addColorStop(0.42, "#f2a7b8");
        gradient.addColorStop(0.72, "#A64D79");
        gradient.addColorStop(1, "#6A1E55");

        const circle = new Path2D();
        circle.arc(sizeH, sizeH, sizeH, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill(circle);

        return new THREE.CanvasTexture(canvas);
      }

      setupShader(material: THREE.PointsMaterial) {
        material.onBeforeCompile = (shader) => {
          shader.uniforms.time = { value: 0 };
          shader.uniforms.radius = { value: this.radius };
          shader.uniforms.particleSizeMin = { value: this.particleSizeMin };
          shader.uniforms.particleSizeMax = { value: this.particleSizeMax };

          const noiseShader = `
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x*34.0)+10.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
          `;

          shader.vertexShader = `
            uniform float particleSizeMax;
            uniform float particleSizeMin;
            uniform float radius;
            uniform float time;
            ${noiseShader}
            ${shader.vertexShader}
          `;

          shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            `
          vec3 p = position;
          float n = snoise(vec3(p.x*.6 + time*0.2, p.y*0.4 + time*0.3, p.z*.2 + time*0.2));
          p += n * 0.4;
          float l = radius / length(p);
          p *= l;
          float s = mix(particleSizeMin, particleSizeMax, n);
          vec3 transformed = vec3(p.x, p.y, p.z);
        `,
          );

          shader.vertexShader = shader.vertexShader.replace("gl_PointSize = size;", "gl_PointSize = s;");

          (material.userData as ShaderMaterialUserData).shader = shader;
        };
      }

      animate(time: number) {
        this.mesh.rotation.set(0, time * 0.2, 0);
        const shader = (this.material.userData as ShaderMaterialUserData).shader;
        if (shader?.uniforms.time) {
          shader.uniforms.time.value = time;
        }
      }
    }

    let animationFrameId: number;

    class World {
      scene!: THREE.Scene;
      camera!: THREE.PerspectiveCamera;
      renderer!: THREE.WebGLRenderer;
      molecule!: Molecule;

      constructor() {
        this.build();
        this.handleResize();
        window.addEventListener("resize", this.handleResize);
        this.animate = this.animate.bind(this);
        this.animate();
      }

      handleResize = () => {
        const width = currentMount.clientWidth;
        const height = currentMount.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
      };

      build() {
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(
          75,
          currentMount.clientWidth / currentMount.clientHeight,
          0.1,
          1000,
        );
        this.camera.position.z = 2;

        this.renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x000000, 0);

        currentMount.appendChild(this.renderer.domElement);

        this.molecule = new Molecule();
        this.scene.add(this.molecule);
      }

      animate() {
        animationFrameId = requestAnimationFrame(this.animate);
        const time = performance.now() * 0.001;
        this.molecule.animate(time);
        this.renderer.render(this.scene, this.camera);
      }
    }

    let world: World | undefined;

    try {
      world = new World();
    } catch {
      setFallback(true);
      return;
    }

    return () => {
      if (!world) return;
      window.removeEventListener("resize", world.handleResize);
      cancelAnimationFrame(animationFrameId);
      if (world.renderer.domElement.parentNode === currentMount) {
        currentMount.removeChild(world.renderer.domElement);
      }
      world.molecule.geometry.dispose();
      world.molecule.material.map?.dispose();
      world.molecule.material.dispose();
      world.renderer.dispose();
    };
  }, [size]);

  if (fallback) {
    return (
      <div
        ref={mountRef}
        style={{
          position: "relative",
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: "999px",
          background:
            "radial-gradient(circle at 48% 42%, rgba(247,236,239,0.9) 0 2px, transparent 3px), radial-gradient(circle, rgba(242,167,184,0.52) 0%, rgba(166,77,121,0.34) 38%, rgba(106,30,85,0.06) 66%, transparent 72%)",
          filter: "blur(0.2px)",
          boxShadow: "0 0 32px rgba(242,167,184,0.14)",
        }}
      />
    );
  }

  return (
    <div
      ref={mountRef}
      style={{
        width: dimensions.width,
        height: dimensions.height,
      }}
    />
  );
};

export default NoiseOrb;
