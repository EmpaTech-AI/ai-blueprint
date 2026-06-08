'use client';

import { useEffect, useRef } from 'react';

/* ─── GLSL sources ─────────────────────────────────────────────────────────── */

const VERT = `#version 300 es
precision highp float;
in vec4 position;
void main() { gl_Position = position; }`;

/*
 * Elevator Visual — Matthias Hurrle (@atzedent)
 * Original: https://codepen.io/atzedent/
 *
 * Worley-based noise with animated cells, FBM domain warp via a slowly-
 * rotating matrix, normal-map lighting, tanh tone-mapping, vignette, and a
 * 3-second fade-in from black.  Dark navy → teal palette.
 *
 * `wheel` uniform is passed as (0, 0) — scroll interaction is unused here.
 */
const FRAG = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec2 wheel;
#define FC gl_FragCoord.xy
#define R  resolution
#define T  (time + wheel.y / 1e3)
#define N  normalize
#define S  smoothstep
#define MN min(R.x, R.y)

float rnd(vec2 p) {
  p  = fract(p * vec2(12.9898, 78.233));
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float noise(vec2 p, float t) {
  vec2 i = floor(p), f = fract(p);
  float d = .25;
  for (float y = -2.; y <= 2.; y++) {
    for (float x = -2.; x <= 2.; x++) {
      vec2 n = vec2(x, y);
      float r = rnd(i + n);
      p = vec2(r, fract(r + x * y));
      p = .5 + .5 * sin(t + 6.3 * p);
      d = min(d, length(n + p - f));
    }
  }
  return d;
}

float fbm(vec2 p, float tt) {
  float t = .0, a = .5;
  mat2 m = mat2(cos(T * .01 - vec4(0, 11, 33, 0)));
  for (int i = 0; i < 2; i++) {
    t += a * noise(p, tt);
    p *= 2. * m;
    a /= 2.;
  }
  return t;
}

vec3 render(vec2 uv) {
  float t = T * .2;
  vec2 q = vec2(noise(uv * 10. + t, t), noise(uv - t, t * 1.5)) * .1;
  float h = fbm(uv * 6. - q, t);
  vec3 n = N(-vec3(
    fbm((vec2(.015, 0.)) * 10. + q, t) - h,
    fbm((uv + vec2(0., .015)) * 1.5 + q, t) - h,
    -.06 - .02 * sin(sin(T))
  ));
  vec3 l = N(vec3(.1, .5, 1.));
  float d = clamp(dot(n, l), .0, 1.);
  float spe = pow(d, 8.);
  vec3 col = vec3(.05, .1, .2) * S(.7, .2, h);
  col = mix(col, vec3(.1, .7, .8), S(.7, .5, h));
  col += spe * 1.5;
  col *= S(-.5, 1.5, d);
  col = tanh(col);
  return col;
}

void main() {
  vec2 uv  = FC / MN;
  vec3 col = mix(vec3(0.), render(uv * .5 + sin(uv * vec2(10., 30.)) * 3e-3), min(T * .3, 1.));
  /* vignette */
  vec2 c = FC / R;
  c *= 1. - c.yx;
  float vig = pow(c.x * c.y * 25., .125);
  col *= vig;
  O = vec4(col, 1.);
}`;

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function compileShader(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('[ShaderBackground] compile error:', gl.getShaderInfoLog(s));
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

    /* Cap DPR at 1 — the shader is Worley-based (expensive) so stay at native
       resolution max to keep 60 fps on integrated GPUs.                        */
    const dpr = Math.min(window.devicePixelRatio ?? 1, 1);

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      powerPreference: 'default',
    });
    if (!gl) return;

    const program = buildProgram(gl);
    gl.useProgram(program);

    /* Full-screen quad */
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime  = gl.getUniformLocation(program, 'time');
    const uRes   = gl.getUniformLocation(program, 'resolution');
    const uWheel = gl.getUniformLocation(program, 'wheel');

    /* ── Resize ─────────────────────────────────────────────────────────── */
    function resize() {
      canvas!.width  = window.innerWidth  * dpr;
      canvas!.height = window.innerHeight * dpr;
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
    }
    resize();
    window.addEventListener('resize', resize);

    /* ── Render loop ─────────────────────────────────────────────────────── */
    let rafId = 0;
    const startTime = performance.now();

    function loop(now: number) {
      const t = (now - startTime) * 1e-3;
      gl!.uniform1f(uTime,  t);
      gl!.uniform2f(uRes,   canvas!.width, canvas!.height);
      gl!.uniform2f(uWheel, 0, 0); /* no scroll interaction — wheel offset stays 0 */
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);

    /* ── Cleanup ─────────────────────────────────────────────────────────── */
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
        zIndex: 0,
      }}
    />
  );
}
