'use client';

import { useEffect, useRef } from 'react';

/* ─── GLSL sources ─────────────────────────────────────────────────────────── */

const VERT = `#version 300 es
precision highp float;
in vec4 position;
void main() { gl_Position = position; }`;

/* Elevator Visual — slow-rising void with indigo/cyan nebulae.
   Domain-warped FBM keeps it organic and non-repeating.
   Output is deliberately dark so the glass UI reads clearly on top. */
const FRAG = `#version 300 es
precision mediump float;

out vec4 O;
uniform float time;
uniform vec2  resolution;

float hash(vec2 p) {
  p  = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 18.545);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),            hash(i + vec2(1,0)), f.x),
    mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
    f.y);
}

float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * noise(p);
    p  = p * 2.17 + vec2(1.13, 0.97);
    a *= 0.5;
  }
  return s;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  float ar = resolution.x / resolution.y;

  /* World space — slightly zoomed out so patterns are large */
  vec2 p = (uv * 2.0 - 1.0) * vec2(ar, 1.0) * 1.6;

  float t = time * 0.07;

  /* Elevator upward drift */
  p.y += t * 0.5;

  /* Two-level domain warp */
  vec2 q = vec2(
    fbm(p                       + t * 0.18),
    fbm(p + vec2(5.2, 1.3)      + t * 0.12)
  );
  vec2 r = vec2(
    fbm(p + 2.8 * q + vec2(1.7, 9.2) + t * 0.09),
    fbm(p + 2.8 * q + vec2(8.3, 2.8) + t * 0.06)
  );
  float f = fbm(p + 2.6 * r + t * 0.04);

  /* ── Palette ─────────────────────────────────────────── */
  vec3 base   = vec3(0.039, 0.039, 0.059);   /* #0A0A0F  */
  vec3 indigo = vec3(0.388, 0.400, 0.945);   /* #6366F1  */
  vec3 cyan   = vec3(0.024, 0.714, 0.831);   /* #06B6D4  */
  vec3 violet = vec3(0.420, 0.200, 0.820);   /* deep purple accent */

  vec3 col = base;

  /* Animated FBM blobs */
  col += indigo * smoothstep(0.28, 0.72, f)         * 0.11;
  col += cyan   * smoothstep(0.50, 0.88, f)         * 0.07;
  col += violet * smoothstep(0.35, 0.72, q.y)       * 0.06;

  /* Static radial halos matching the original CSS gradient positions */
  float hlTopLeft  = 1.0 - length((uv - vec2(0.15, 0.85)) * vec2(0.9, 1.1));
  float hlBotRight = 1.0 - length((uv - vec2(0.85, 0.15)) * vec2(1.1, 0.9));
  col += indigo * clamp(hlTopLeft,  0.0, 1.0) * 0.07;
  col += cyan   * clamp(hlBotRight, 0.0, 1.0) * 0.05;

  /* Centre ambient pulse — very slow */
  float pulse = 0.5 + 0.5 * sin(time * 0.18);
  float hlCentre = 1.0 - length((uv - 0.5) * 1.8);
  col += indigo * clamp(hlCentre, 0.0, 1.0) * pulse * 0.035;

  /* Vignette — darken edges */
  float vig = 1.0 - length((uv - 0.5) * vec2(1.0, 1.25));
  vig = clamp(vig, 0.0, 1.0);
  vig = pow(vig, 1.6);
  col *= 0.55 + 0.45 * vig;

  /* Keep it dark — glass cards need contrast */
  col = clamp(col, base * 0.85, vec3(0.20, 0.21, 0.38));

  O = vec4(col, 1.0);
}`;

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function compileShader(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('[ShaderBackground]', gl.getShaderInfoLog(s));
  }
  return s;
}

function buildProgram(gl: WebGL2RenderingContext) {
  const vs      = compileShader(gl, gl.VERTEX_SHADER,   VERT);
  const fs      = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[ShaderBackground] link error:', gl.getProgramInfoLog(program));
  }
  return program;
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    /* Limit DPR to 1.5 — shader is compute-light but no need to over-sample */
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5);

    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!gl) return;

    /* ── Build program ─────────────────────────────────────────────────── */
    const program = buildProgram(gl);
    gl.useProgram(program);

    /* Full-screen quad */
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, 'time');
    const uRes  = gl.getUniformLocation(program, 'resolution');

    /* ── Resize ────────────────────────────────────────────────────────── */
    function resize() {
      canvas!.width  = window.innerWidth  * dpr;
      canvas!.height = window.innerHeight * dpr;
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
    }
    resize();
    window.addEventListener('resize', resize);

    /* ── Render loop ───────────────────────────────────────────────────── */
    let rafId = 0;
    const startTime = performance.now();

    function loop(now: number) {
      const t = (now - startTime) * 1e-3;
      gl!.uniform1f(uTime, t);
      gl!.uniform2f(uRes, canvas!.width, canvas!.height);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);

    /* ── Cleanup ───────────────────────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      gl.deleteProgram(program);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
        /* z-index 0: content wrapper at z-index 1 paints over this */
        zIndex: 0,
      }}
    />
  );
}
