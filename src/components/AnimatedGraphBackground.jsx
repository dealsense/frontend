"use client";

import { useEffect, useRef } from "react";

// Dense node/edge network — nodes drift slowly, edges fade in between nearby
// ones. Deliberately light/low-opacity so it reads as texture, not noise.
const NODE_COLOR = "rgba(61, 220, 132, 0.55)";
const EDGE_COLOR = "61, 220, 132";
const MAX_EDGE_DIST = 150;
const NODE_SPEED = 0.7;
const AREA_PER_NODE = 11000; // lower = denser

export default function AnimatedGraphBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let width = 0;
    let height = 0;
    let dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    let nodes = [];

    function makeNodes() {
      const count = Math.max(40, Math.floor((width * height) / AREA_PER_NODE));
      nodes = new Array(count).fill(0).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * NODE_SPEED,
        vy: (Math.random() - 0.5) * NODE_SPEED,
        r: 1.2 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    function resize() {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeNodes();
    }

    function step(t) {
      ctx.clearRect(0, 0, width, height);

      // Move + wrap nodes
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = width + 20;
        if (n.x > width + 20) n.x = -20;
        if (n.y < -20) n.y = height + 20;
        if (n.y > height + 20) n.y = -20;
      });

      // Edges — only check nearby nodes via a coarse grid bucket for perf
      const cell = MAX_EDGE_DIST;
      const buckets = new Map();
      nodes.forEach((n, i) => {
        const key = `${Math.floor(n.x / cell)}:${Math.floor(n.y / cell)}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(i);
      });

      ctx.lineWidth = 1;
      nodes.forEach((n, i) => {
        const cx = Math.floor(n.x / cell);
        const cy = Math.floor(n.y / cell);
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          for (let gy = cy - 1; gy <= cy + 1; gy++) {
            const neighbors = buckets.get(`${gx}:${gy}`);
            if (!neighbors) continue;
            neighbors.forEach((j) => {
              if (j <= i) return;
              const m = nodes[j];
              const dx = n.x - m.x;
              const dy = n.y - m.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < MAX_EDGE_DIST) {
                const opacity = (1 - dist / MAX_EDGE_DIST) * 0.35;
                ctx.strokeStyle = `rgba(${EDGE_COLOR}, ${opacity})`;
                ctx.beginPath();
                ctx.moveTo(n.x, n.y);
                ctx.lineTo(m.x, m.y);
                ctx.stroke();
              }
            });
          }
        }
      });

      // Nodes, with a gentle pulse
      nodes.forEach((n) => {
        const pulse = n.r + Math.sin(t * 0.0015 + n.phase) * 0.5;
        ctx.beginPath();
        ctx.fillStyle = NODE_COLOR;
        ctx.arc(n.x, n.y, Math.max(0.6, pulse), 0, Math.PI * 2);
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
      style={{ opacity: 0.85 }}
      aria-hidden="true"
    />
  );
}
