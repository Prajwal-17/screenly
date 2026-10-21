"use client";

import { useEffect, useRef } from "react";
import { fragmentSource, vertexSource } from "@/lib/porcelain-shader";
import styles from "./live-interview.module.css";

export type VoiceSignal = {
  level: number;
  low: number;
  high: number;
  candidate: boolean;
  inactive: boolean;
};

export function PorcelainOrb({
  readSignal,
}: {
  readSignal: () => VoiceSignal;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const surface = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const wrapper = surface.current;
    if (!element || !wrapper) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let frame = 0;
    let visible = true;
    let level = 0;
    let candidate = 0;
    let inactive = 0;
    let elapsed = 0;
    let lastFrame = 0;
    let signature = "";
    let surfaceSignature = "";
    let size = 0;
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    const fallback = () => {
      wrapper.dataset.renderer = "fallback";
    };
    const loseContext = (event: Event) => {
      event.preventDefault();
      fallback();
    };

    try {
      gl = element.getContext("webgl", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
        powerPreference: "low-power",
      });
      if (!gl) throw new Error("WebGL unavailable");
      const compile = (type: number, source: string) => {
        const shader = gl!.createShader(type);
        if (!shader) throw new Error("Shader unavailable");
        gl!.shaderSource(shader, source);
        gl!.compileShader(shader);
        if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
          gl!.deleteShader(shader);
          throw new Error("Shader could not compile");
        }
        return shader;
      };
      const vertex = compile(gl.VERTEX_SHADER, vertexSource);
      const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
      program = gl.createProgram();
      if (!program) throw new Error("Program unavailable");
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.bindAttribLocation(program, 0, "aPosition");
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error("Program could not link");
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      for (const name of [
        "uResolution",
        "uTime",
        "uEnergy",
        "uLow",
        "uHigh",
        "uCandidate",
        "uInactive",
        "uReduced",
        "uPaper",
        "uFern",
        "uMint",
        "uClay",
      ])
        uniforms[name] = gl.getUniformLocation(program, name);
      // Material colors come from the same palette as the surrounding UI.
      const tokens = getComputedStyle(wrapper);
      for (const [name, token, fallbackColor] of [
        ["uPaper", "--background", "f4f3ee"],
        ["uFern", "--primary", "1f6b45"],
        ["uMint", "--accent-active", "a8dcc0"],
        ["uClay", "--candidate", "b8451a"],
      ] as const) {
        const value = tokens.getPropertyValue(token).trim().replace("#", "");
        const hex = /^[a-f\d]{6}$/i.test(value) ? value : fallbackColor;
        gl.uniform3f(
          uniforms[name]!,
          parseInt(hex.slice(0, 2), 16) / 255,
          parseInt(hex.slice(2, 4), 16) / 255,
          parseInt(hex.slice(4, 6), 16) / 255,
        );
      }
      gl.clearColor(0, 0, 0, 0);
      wrapper.dataset.renderer = "webgl";
    } catch {
      fallback();
    }

    const updateMotion = () => {
      wrapper.dataset.moving = String(
        visible &&
          !document.hidden &&
          !reduced.matches &&
          !readSignal().inactive,
      );
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      updateMotion();
      lastFrame = 0;
    });
    observer.observe(wrapper);
    // The shader only paints a centered sphere. Keep a square drawing surface
    // and receive its size on resize instead of forcing layout every frame.
    const resize = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const diameter = Math.min(
        entry.contentRect.width,
        entry.contentRect.height,
      );
      size = Math.round(diameter * Math.min(devicePixelRatio || 1, 1.75));
      element.style.width = `${diameter}px`;
      element.style.height = `${diameter}px`;
    });
    resize.observe(wrapper);
    element.addEventListener("webglcontextlost", loseContext);
    document.addEventListener("visibilitychange", updateMotion);
    reduced.addEventListener("change", updateMotion);
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible || document.hidden) {
        lastFrame = 0;
        return;
      }
      const signal = readSignal();
      // Idle material moves at 18 fps; speech gets 30 fps. Keep all work on a
      // bounded square, and freeze its clock rather than jumping after a pause.
      const moving = !signal.inactive && !reduced.matches;
      const interval = moving && signal.level > 0.02 ? 1000 / 30 : 1000 / 18;
      if (now - lastFrame < interval) return;
      const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
      lastFrame = now;
      if (moving) elapsed += dt;
      const target =
        signal.inactive || reduced.matches
          ? 0
          : Math.min(1, Math.max(0, signal.level));
      level +=
        (target - level) *
        (1 - Math.exp(-dt / (target > level ? 0.055 : 0.16)));
      if (level < 0.001) level = 0;
      const blend = 1 - Math.exp(-dt / 0.3);
      candidate += ((signal.candidate ? 1 : 0) - candidate) * blend;
      inactive += ((signal.inactive ? 1 : 0) - inactive) * blend;
      if (Math.abs(candidate - Number(signal.candidate)) < 0.001)
        candidate = Number(signal.candidate);
      if (Math.abs(inactive - Number(signal.inactive)) < 0.001)
        inactive = Number(signal.inactive);
      const w = size,
        h = size;
      if (!size) return;
      const next = [
        w,
        h,
        level.toFixed(3),
        elapsed.toFixed(3),
        candidate.toFixed(3),
        inactive.toFixed(3),
        signal.low.toFixed(2),
        signal.high.toFixed(2),
        signal.candidate,
        signal.inactive,
        reduced.matches,
      ].join();
      if (next === signature) return;
      signature = next;
      const surfaceState = [
        level.toFixed(3),
        signal.candidate,
        signal.inactive,
        moving,
      ].join();
      if (surfaceState !== surfaceSignature) {
        surfaceSignature = surfaceState;
        wrapper.style.setProperty("--orb-energy", String(level));
        wrapper.dataset.candidate = String(signal.candidate);
        wrapper.dataset.inactive = String(signal.inactive);
        wrapper.dataset.moving = String(moving);
      }
      if (
        !gl ||
        !program ||
        gl.isContextLost() ||
        wrapper.dataset.renderer !== "webgl"
      )
        return;
      if (element.width !== w || element.height !== h) {
        element.width = w;
        element.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.useProgram(program);
      gl.uniform2f(uniforms.uResolution!, w, h);
      const values = {
        uEnergy: level,
        uTime: elapsed,
        uLow: signal.low,
        uHigh: signal.high,
        uCandidate: candidate,
        uInactive: inactive,
        uReduced: reduced.matches ? 1 : 0,
      };
      for (const [name, value] of Object.entries(values))
        gl.uniform1f(uniforms[name]!, value);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", updateMotion);
      reduced.removeEventListener("change", updateMotion);
      element.removeEventListener("webglcontextlost", loseContext);
      if (gl && buffer) gl.deleteBuffer(buffer);
      if (gl && program) gl.deleteProgram(program);
    };
  }, [readSignal]);

  return (
    <div
      ref={surface}
      className={styles.orb}
      data-renderer="fallback"
      aria-hidden="true"
    >
      <div className={styles.fallback} />
      <canvas ref={canvas} />
    </div>
  );
}
