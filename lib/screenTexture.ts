"use client";

import { CanvasTexture, SRGBColorSpace } from "three";

/**
 * Animated screen textures — draws fake AARON security UI onto canvases
 * that are mapped onto the GLB monitor meshes. Cheap: redrawn ~6fps.
 */

const TERMINAL_LINES = [
  "aaron@core:~$ ./monitor --network",
  "[OK] firewall ruleset loaded (247 rules)",
  "[OK] IDS engine online — 0 alerts",
  "TRACE 10.0.4.18 → gateway ... 12ms",
  "[SCAN] ports 1-1024 ... clean",
  "AUTH verified: operator DHWANIT",
  "[OK] VPN tunnel established (AES-256)",
  "SYS integrity check ......... PASS",
  "[WARN] honeypot ping from 185.220.x.x",
  "COUNTER deployed — threat logged",
  "aaron@core:~$ tail -f /var/log/secure",
  "[OK] backup snapshot 04:00 UTC",
  "DNS resolve chain verified",
  "[OK] TLS certificates valid (92d)",
  "packet capture: 4.2k pps nominal",
];

export interface ScreenPainter {
  texture: CanvasTexture;
  /** Advance the animation; call at a throttled rate. */
  tick: () => void;
  dispose: () => void;
}

/** Portrait side-monitor: live system status panel with bars and gauges. */
export function createStatusPainter(accent: string, warm: string): ScreenPainter | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;

  let t = 0;

  const draw = () => {
    ctx.fillStyle = "#04060a";
    ctx.fillRect(0, 0, 512, 1024);

    ctx.fillStyle = "#0c1118";
    ctx.fillRect(0, 0, 512, 60);
    ctx.fillStyle = accent;
    ctx.font = "bold 24px monospace";
    ctx.fillText("SYSTEM STATUS", 24, 40);

    // Animated resource bars
    const bars = ["CPU", "MEM", "NET", "GPU", "I/O"];
    bars.forEach((label, i) => {
      const y = 120 + i * 90;
      const level = 0.25 + 0.55 * Math.abs(Math.sin(t * 0.7 + i * 1.7));
      ctx.fillStyle = "#9fe8f0";
      ctx.font = "20px monospace";
      ctx.fillText(label, 24, y - 12);
      ctx.fillStyle = "#101820";
      ctx.fillRect(24, y, 464, 22);
      ctx.fillStyle = level > 0.7 ? warm : accent;
      ctx.fillRect(24, y, 464 * level, 22);
      ctx.fillStyle = "#9fe8f0";
      ctx.fillText(`${Math.round(level * 100)}%`, 420, y - 12);
    });

    // Threat gauge
    ctx.strokeStyle = accent;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(256, 720, 110, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * (0.3 + 0.1 * Math.sin(t)));
    ctx.stroke();
    ctx.strokeStyle = "#101820";
    ctx.beginPath();
    ctx.arc(256, 720, 110, Math.PI * 0.75 + Math.PI * 1.5 * (0.3 + 0.1 * Math.sin(t)), Math.PI * 2.25);
    ctx.stroke();
    ctx.fillStyle = "#2bd576";
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SECURE", 256, 726);
    ctx.textAlign = "left";

    ctx.fillStyle = "#9fe8f0";
    ctx.font = "18px monospace";
    ctx.fillText(`UPTIME ${Math.floor(240 + t)}h`, 24, 920);
    ctx.fillText("THREATS BLOCKED: 1,204", 24, 950);
    ctx.fillStyle = accent;
    ctx.fillText("AARON // WATCHDOG ACTIVE", 24, 990);

    texture.needsUpdate = true;
  };

  draw();

  return {
    texture,
    tick: () => {
      t += 0.35;
      draw();
    },
    dispose: () => texture.dispose(),
  };
}

export function createTerminalPainter(accent: string, warm: string): ScreenPainter | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;

  let offset = Math.floor(Math.random() * TERMINAL_LINES.length);
  let blink = false;

  const draw = () => {
    ctx.fillStyle = "#04060a";
    ctx.fillRect(0, 0, 1024, 512);

    // Header bar
    ctx.fillStyle = "#0c1118";
    ctx.fillRect(0, 0, 1024, 54);
    ctx.fillStyle = accent;
    ctx.font = "bold 26px monospace";
    ctx.fillText("AARON // SECURITY OPERATIONS", 28, 36);
    ctx.fillStyle = "#2bd576";
    ctx.beginPath();
    ctx.arc(985, 27, 8, 0, Math.PI * 2);
    ctx.fill();

    // Terminal body
    ctx.font = "22px monospace";
    for (let i = 0; i < 16; i++) {
      const line = TERMINAL_LINES[(offset + i) % TERMINAL_LINES.length];
      ctx.fillStyle = line.includes("WARN")
        ? warm
        : line.startsWith("aaron@")
          ? accent
          : "#9fe8f0";
      ctx.globalAlpha = 0.45 + (i / 16) * 0.55;
      ctx.fillText(line, 28, 92 + i * 26);
    }
    ctx.globalAlpha = 1;

    // Cursor
    if (blink) {
      ctx.fillStyle = accent;
      ctx.fillRect(28, 488, 14, 4);
    }

    // Scanline tint
    ctx.fillStyle = "rgba(0,240,255,0.03)";
    for (let y = 0; y < 512; y += 4) ctx.fillRect(0, y, 1024, 1);

    texture.needsUpdate = true;
  };

  draw();

  return {
    texture,
    tick: () => {
      offset = (offset + 1) % TERMINAL_LINES.length;
      blink = !blink;
      draw();
    },
    dispose: () => texture.dispose(),
  };
}
