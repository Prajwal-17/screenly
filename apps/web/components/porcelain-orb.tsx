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
    let low = 0;
    let high = 0;
    let wobble = 0;
    let velocity = 0;
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
        "uWobble",
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
        ["uPaper", "--orb-paper", "ffffff"],
        ["uFern", "--orb-body", "656e78"],
        ["uMint", "--orb-highlight", "c9cfd5"],
        ["uClay", "--orb-reflection", "7b838c"],
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
          !readSignal().inactive &&
          (level > 0 || Math.abs(wobble) > 0),
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
      // Paint at up to 60 Hz during speech, including on high-refresh displays.
      // Throttle resting state checks; voice sampling can wake the next frame.
      const active = !signal.inactive && !reduced.matches;
      const atRest = level === 0 && wobble === 0 && low === 0 && high === 0;
      const interval =
        atRest && (!active || signal.level === 0) ? 50 : 1000 / 60 - 1;
      if (now - lastFrame < interval) return;
      const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
      lastFrame = now;
      const target = active
        ? Math.pow(Math.min(1, Math.max(0, signal.level)), 0.72)
        : 0;
      level +=
        (target - level) * (1 - Math.exp(-dt / (target > level ? 0.04 : 0.12)));
      if (level < 0.001) level = 0;
      const bandBlend = 1 - Math.exp(-dt / 0.09);
      low += ((target > 0 ? signal.low : 0) - low) * bandBlend;
      high += ((target > 0 ? signal.high : 0) - high) * bandBlend;
      if (low < 0.001) low = 0;
      if (high < 0.001) high = 0;
      // Substeps keep this lightly damped spring stable on slower displays.
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const step = dt / steps;
      for (let i = 0; i < steps; i++) {
        velocity += ((level - wobble) * 190 - velocity * 19) * step;
        wobble += velocity * step;
      }
      if (
        level === 0 &&
        Math.abs(wobble) < 0.001 &&
        Math.abs(velocity) < 0.005
      ) {
        wobble = 0;
        velocity = 0;
      }
      if (reduced.matches) {
        level = low = high = wobble = velocity = 0;
      }
      // Material advection is powered by the voice, never by an idle loop.
      elapsed += dt * level * 2.4;
      const moving = active && (level > 0 || wobble !== 0);
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
        wobble.toFixed(3),
        elapsed.toFixed(3),
        candidate.toFixed(3),
        inactive.toFixed(3),
        low.toFixed(3),
        high.toFixed(3),
        signal.candidate,
        signal.inactive,
        reduced.matches,
        moving,
      ].join();
      if (next === signature) return;
      signature = next;
      const surfaceState = [
        level.toFixed(3),
        wobble.toFixed(3),
        elapsed.toFixed(3),
        signal.candidate,
        signal.inactive,
        moving,
      ].join();
      if (surfaceState !== surfaceSignature) {
        surfaceSignature = surfaceState;
        // The CSS fallback shares the same envelope and clock as the shader.
        // Avoid touching styles on the WebGL path: all its motion stays on GPU.
        if (wrapper.dataset.renderer === "fallback") {
          const stretch = Math.sin(elapsed * 1.7) * wobble;
          wrapper.style.setProperty(
            "--orb-scale-x",
            String(1 + wobble * 0.035 + stretch * 0.025),
          );
          wrapper.style.setProperty(
            "--orb-scale-y",
            String(1 + wobble * 0.035 - stretch * 0.025),
          );
          wrapper.style.setProperty(
            "--orb-round-a",
            `${50 + Math.sin(elapsed * 1.3) * wobble * 7}%`,
          );
          wrapper.style.setProperty(
            "--orb-round-b",
            `${50 + Math.cos(elapsed * 1.6) * wobble * 6}%`,
          );
          wrapper.style.setProperty(
            "--orb-current-x",
            `${Math.sin(elapsed * 0.7) * 12}%`,
          );
          wrapper.style.setProperty(
            "--orb-current-y",
            `${Math.sin(elapsed * 0.9) * 9}%`,
          );
          wrapper.style.setProperty(
            "--orb-current-turn",
            `${Math.sin(elapsed * 0.6) * 24}deg`,
          );
        }
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
        uWobble: wobble,
        uTime: elapsed,
        uLow: low,
        uHigh: high,
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
