import React, { useEffect, useRef } from "react";
import { colors } from "../lib/styles";

type Node3D = {
  x: number;
  y: number;
  z: number;
  speed: number;
  phase: number;
};

const NODE_COUNT = 92;
const DEPTH = 560;
const BASE_RADIUS = 180;

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

    const setSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = () => {
      frame += 0.012;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const cx = width / 2;
      const cy = height / 2;
      const projected: Array<{ x: number; y: number; alpha: number; size: number }> = [];

      const gradient = ctx.createRadialGradient(cx, cy, 120, cx, cy, Math.max(width, height) * 0.75);
      gradient.addColorStop(0, "#141b2e");
      gradient.addColorStop(0.45, colors.bg);
      gradient.addColorStop(1, "#08090d");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      for (const node of nodes) {
        const angle = frame * node.speed + node.phase;
        const sinA = Math.sin(angle);
        const cosA = Math.cos(angle);
        const rx = node.x * cosA - node.z * sinA;
        const rz = node.x * sinA + node.z * cosA;
        const pulse = 1 + Math.sin(frame * 3 + node.phase) * 0.06;
        const depth = (rz + DEPTH) / (DEPTH * 2);
        const perspective = 360 / (360 + rz * 0.6);
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
          const dist = Math.hypot(dx, dy);
          if (dist > 115) continue;

          const alpha = ((1 - dist / 115) * (projected[i].alpha + projected[j].alpha)) / 2;
          ctx.strokeStyle = `rgba(99, 102, 241, ${Math.min(0.28, alpha * 0.55)})`;
          ctx.beginPath();
          ctx.moveTo(projected[i].x, projected[i].y);
          ctx.lineTo(projected[j].x, projected[j].y);
          ctx.stroke();
        }
      }

      for (const p of projected) {
        ctx.fillStyle = `rgba(129, 140, 248, ${Math.min(0.95, p.alpha)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(render);
    };

    setSize();
    render();
    window.addEventListener("resize", setSize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", setSize);
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
