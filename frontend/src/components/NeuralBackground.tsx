import React, { useEffect, useRef } from "react";
import { colors } from "../lib/styles";

type Node3D = {
  x: number;
  y: number;
  z: number;
  speed: number;
  phase: number;
};

const NODE_COUNT = 72;
const DEPTH = 560;
const BASE_RADIUS = 180;
const MAX_DEVICE_PIXEL_RATIO = 2;
const MAX_CONNECTION_DISTANCE = 115;
const MAX_CONNECTION_DISTANCE_SQ = MAX_CONNECTION_DISTANCE * MAX_CONNECTION_DISTANCE;
const PULSE_FREQUENCY = 3;
const PULSE_AMPLITUDE = 0.06;
const PERSPECTIVE_FOCAL_LENGTH = 360;
const PERSPECTIVE_DEPTH_SCALE = 0.6;
const GRADIENT_CENTER_COLOR = "#141b2e";
const GRADIENT_EDGE_COLOR = "#08090d";
const CONNECTION_COLOR_RGB = "99, 102, 241";
const NODE_COLOR_RGB = "129, 140, 248";

function createNodes(): Node3D[] {
  return Array.from({ length: NODE_COUNT }, (_, i) => {
    const lobe = i % 2 === 0 ? -1 : 1;
    const theta = Math.random() * Math.PI * 2;
    const r = (0.4 + Math.random() * 0.6) * BASE_RADIUS;
    const spread = 70 + Math.random() * 70;

    return {
      x: Math.cos(theta) * r + lobe * spread,
      y: (Math.random() - 0.5) * 210,
      z: (Math.random() - 0.5) * DEPTH,
      speed: 0.12 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
    };
  });
}

export function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nodes = createNodes();
    let frame = 0;
    let raf = 0;
    const motionMediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let shouldReduceMotion = motionMediaQuery.matches;
    let backgroundGradient: CanvasGradient | null = null;

    const setSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cx = width / 2;
      const cy = height / 2;
      backgroundGradient = ctx.createRadialGradient(
        cx,
        cy,
        120,
        cx,
        cy,
        Math.max(width, height) * 0.75
      );
      backgroundGradient.addColorStop(0, GRADIENT_CENTER_COLOR);
      backgroundGradient.addColorStop(0.45, colors.bg);
      backgroundGradient.addColorStop(1, GRADIENT_EDGE_COLOR);
    };

    const render = () => {
      frame += 0.012;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const cx = width / 2;
      const cy = height / 2;
      const projected: Array<{ x: number; y: number; alpha: number; size: number }> = [];

      ctx.fillStyle = backgroundGradient ?? colors.bg;
      ctx.fillRect(0, 0, width, height);

      for (const node of nodes) {
        const angle = frame * node.speed + node.phase;
        const sinA = Math.sin(angle);
        const cosA = Math.cos(angle);
        const rx = node.x * cosA - node.z * sinA;
        const rz = node.x * sinA + node.z * cosA;
        const pulse = 1 + Math.sin(frame * PULSE_FREQUENCY + node.phase) * PULSE_AMPLITUDE;
        const depth = (rz + DEPTH) / (DEPTH * 2);
        const perspective =
          PERSPECTIVE_FOCAL_LENGTH / (PERSPECTIVE_FOCAL_LENGTH + rz * PERSPECTIVE_DEPTH_SCALE);
        const x = cx + rx * perspective * pulse;
        const y = cy + node.y * perspective;
        const alpha = Math.max(0.12, 0.85 * depth);
        const size = 1 + depth * 2.2;

        projected.push({ x, y, alpha, size });
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].x - projected[j].x;
          const dy = projected[i].y - projected[j].y;
          const distSq = dx * dx + dy * dy;
          if (distSq > MAX_CONNECTION_DISTANCE_SQ) continue;

          const dist = Math.sqrt(distSq);
          const alpha =
            ((1 - dist / MAX_CONNECTION_DISTANCE) * (projected[i].alpha + projected[j].alpha)) / 2;
          ctx.strokeStyle = `rgba(${CONNECTION_COLOR_RGB}, ${Math.min(0.28, alpha * 0.55)})`;
          ctx.beginPath();
          ctx.moveTo(projected[i].x, projected[i].y);
          ctx.lineTo(projected[j].x, projected[j].y);
          ctx.stroke();
        }
      }

      for (const p of projected) {
        ctx.fillStyle = `rgba(${NODE_COLOR_RGB}, ${Math.min(0.95, p.alpha)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!shouldReduceMotion) {
        raf = requestAnimationFrame(render);
      } else {
        raf = 0;
      }
    };

    const handleResize = () => {
      setSize();
      if (shouldReduceMotion) {
        render();
      }
    };

    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      shouldReduceMotion = event.matches;
      cancelAnimationFrame(raf);
      raf = 0;
      render();
    };

    setSize();
    render();
    window.addEventListener("resize", handleResize);
    motionMediaQuery.addEventListener("change", handleMotionPreferenceChange);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      motionMediaQuery.removeEventListener("change", handleMotionPreferenceChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  );
}
