"use client";

import { useEffect, useRef } from "react";

// A few independent "ticker" lines drifting left-to-right, each a random walk
// smoothed with a sine wobble so they read as organic chart motion rather than noise.
const LINES = [
  { color: "rgba(61, 220, 132, 0.28)", width: 1.6, speed: 0.55, amp: 26, baseY: 0.32, volatility: 0.9 },
  { color: "rgba(61, 220, 132, 0.14)", width: 1.2, speed: 0.35, amp: 34, baseY: 0.58, volatility: 1.2 },
  { color: "rgba(148, 197, 255, 0.16)", width: 1.2, speed: 0.42, amp: 30, baseY: 0.74, volatility: 1.0 },
  { color: "rgba(255, 255, 255, 0.07)", width: 1, speed: 0.28, amp: 20, baseY: 0.46, volatility: 0.7 },
];

const POINT_SPACING = 14;

export default function AnimatedGraphBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let width = 0;
    let height = 0;
    let dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    const series = LINES.map((line) => ({ ...line, values: [], seed: Math.random() * 1000 }));

    function resize() {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const pointCount = Math.ceil(width / POINT_SPACING) + 4;
      series.forEach((s) => {
        s.values = new Array(pointCount).fill(0).map((_, i) =>
          Math.sin(i * 0.25 + s.seed) * s.amp * 0.4
        );
      });
    }

    function step(t) {
      ctx.clearRect(0, 0, width, height);

      series.forEach((s) => {
        // Drift a new value in from the right every so often, random-walked off the last one.
        const last = s.values[s.values.length - 1] || 0;
        const wobble = Math.sin(t * 0.0002 * s.speed + s.seed) * s.amp * 0.5;
        const drift = (Math.random() - 0.5) * s.volatility * 10;
        let next = last * 0.9 + wobble * 0.15 + drift * 0.15;
        next = Math.max(-s.amp, Math.min(s.amp, next));

        if (t % (40 / s.speed) < 16) {
          s.values.push(next);
          s.values.shift();
        }

        ctx.beginPath();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.lineJoin = "round";
        s.values.forEach((v, i) => {
          const x = i * POINT_SPACING;
          const y = height * s.baseY + v;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Soft pulsing head dot at the leading edge.
        const headX = (s.values.length - 1) * POINT_SPACING;
        const headY = height * s.baseY + s.values[s.values.length - 1];
        const pulse = 2.2 + Math.sin(t * 0.004 + s.seed) * 1.1;
        ctx.beginPath();
        ctx.fillStyle = s.color;
        ctx.arc(headX, headY, pulse, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(step);
    }

    resize();
    raf = requestAnimationFrame(step);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.9 }}
      aria-hidden="true"
    />
  );
}
