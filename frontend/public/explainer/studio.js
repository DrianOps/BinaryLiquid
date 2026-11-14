/**
 * BinaryLiquid Explainer Studio — 1920x1080 Vector/Canvas Engine
 * Supports live interactive playback (EN/ES), subtle ambient BGM,
 * exact narration cue synchronization, and deterministic frame rendering
 * for MP4 export (window.prepareRecording / window.renderAtTime).
 */

const W = 1920;
const H = 1080;

const LOGO_PATHS = {
  PUSD: './PUSD.png',
  USDT: './USDT.png',
  BCH: './BCH.png',
  ETH: './ETH.png',
  POL: './POL.png',
  SOL: './SOL.png',
  LTC: './LTC.png',
  WIZARD: './wizardconnect-logo.png',
  LOGO: './logo.png',
};

const SCENES = [
  {
    id: 1,
    durationEs: 43.63,
    durationEn: 44.62,
    audioEs: './audio/scene1_es.mp3',
    audioEn: './audio/scene1.mp3',
    titleEs: '1. La Fragmentación de Liquidez & BinaryLiquid',
    titleEn: '1. Liquidity Fragmentation & BinaryLiquid',
  },
  {
    id: 2,
    durationEs: 57.10,
    durationEn: 53.57,
    audioEs: './audio/scene2_es.mp3',
    audioEn: './audio/scene2.mp3',
    titleEs: '2. Pools P2SH-32 en BCH & Liquidación Cross-Chain',
    titleEn: '2. BCH P2SH-32 Pools & Cross-Chain Settlement',
  },
  {
    id: 3,
    durationEs: 36.60,
    durationEn: 35.02,
    audioEs: './audio/scene3_es.mp3',
    audioEn: './audio/scene3.mp3',
    titleEs: '3. Liquidez Comunitaria & Acumulación 0.20% LP',
    titleEn: '3. Community Liquidity & 0.20% LP Accrual',
  },
  {
    id: 4,
    durationEs: 33.00,
    durationEn: 31.73,
    audioEs: './audio/scene4_es.mp3',
    audioEn: './audio/scene4.mp3',
    titleEs: '4. Bóvedas UTXO Nativas vs Puentes Custodiales',
    titleEn: '4. Native UTXO Vaults vs Custodial Bridges',
  },
  {
    id: 5,
    durationEs: 33.10,
    durationEn: 32.21,
    audioEs: './audio/scene5_es.mp3',
    audioEn: './audio/scene5.mp3',
    titleEs: '5. Flujo de Swap en Vivo (Chipnet ➔ Amoy)',
    titleEn: '5. Live Swap Flow (Chipnet ➔ Amoy)',
  },
  {
    id: 6,
    durationEs: 38.71,
    durationEn: 38.57,
    audioEs: './audio/scene6_es.mp3',
    audioEn: './audio/scene6.mp3',
    titleEs: '6. Eficiencia de Costos, Comisiones 0.30% & Velocidad',
    titleEn: '6. Cost Efficiency, 0.30% Fee Split & Speed',
  },
  {
    id: 7,
    durationEs: 36.94,
    durationEn: 35.28,
    audioEs: './audio/scene7_es.mp3',
    audioEn: './audio/scene7.mp3',
    titleEs: '7. Ecosistema: Swap, Perps, Lending & UserLink SDK',
    titleEn: '7. Ecosystem: Swap, Perps, Lending & UserLink SDK',
  },
  {
    id: 8,
    durationEs: 38.66,
    durationEn: 37.39,
    audioEs: './audio/scene8_es.mp3',
    audioEn: './audio/scene8.mp3',
    titleEs: '8. Activo en Testnet • Visión Mainnet & Hackathon',
    titleEn: '8. Live on Testnet • Mainnet Vision & Hackathon',
  },
];

const CUES = {
  es: {
    s1: { introEnd: 3.81, islandStart: 14.93, phase2Start: 21.75, chainsStart: 30.99 },
    s2: { ammStart: 4.78, chainsStart: 13.65, phase2Start: 23.27, step1: 29.81, step2: 38.93, step3: 47.29 },
    s3: { deposit: 6.56, feeSplit: 17.04, poolAccrual: 21.88 },
    s4: { left: 10.85, right: 20.88 },
    s5: { wallet: 3.47, swapCard: 12.67, settle: 22.74 },
    s6: { legacy: 6.05, bch: 15.66, feeBreakdown: 25.46 },
    s7: { swap: 9.60, perps: 18.09, lending: 23.98 },
    s8: { tracks: 9.11, url: 24.89, closing: 33.36 },
  },
  en: {
    s1: { introEnd: 3.56, islandStart: 13.74, phase2Start: 21.46, chainsStart: 30.93 },
    s2: { ammStart: 4.83, chainsStart: 12.02, phase2Start: 23.57, step1: 29.63, step2: 37.62, step3: 44.52 },
    s3: { deposit: 6.30, feeSplit: 16.19, poolAccrual: 21.54 },
    s4: { left: 10.57, right: 18.93 },
    s5: { wallet: 3.07, swapCard: 11.86, settle: 22.04 },
    s6: { legacy: 6.57, bch: 15.22, feeBreakdown: 24.92 },
    s7: { swap: 7.81, perps: 16.71, lending: 23.16 },
    s8: { tracks: 8.99, url: 23.70, closing: 32.29 },
  },
};

const PAL = {
  bgDeep: '#050814',
  bgMid: '#0A1024',
  cardBg: 'rgba(13, 21, 44, 0.88)',
  cardActive: 'rgba(16, 28, 58, 0.96)',
  borderSubtle: 'rgba(148, 163, 184, 0.18)',
  bch: '#0AC18E',
  bchSoft: 'rgba(10, 193, 142, 0.16)',
  pusd: '#38BDF8',
  cyan: '#22D3EE',
  purple: '#A855F7',
  pol: '#8247E5',
  sol: '#14F195',
  ltc: '#345D9D',
  amber: '#F59E0B',
  red: '#EF4444',
  textMain: '#F8FAFC',
  textMuted: '#94A3B8',
  textDim: '#64748B',
};

// State
let currentLang = 'en';
let currentSceneIdx = 0;
let currentTime = 0;
let isPlaying = false;
let isRecording = false;
let rafId = null;
let lastFrameWallTime = 0;

// Audio
const voiceAudio = new Audio();
voiceAudio.preload = 'auto';
const bgmAudio = new Audio('./ambient_bgm.mp3');
bgmAudio.loop = true;
bgmAudio.volume = 0.065;
bgmAudio.preload = 'auto';

// Assets cache
const loadedImages = {};
const imageReadyPromises = Object.entries(LOGO_PATHS).map(([key, src]) => {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    img.onload = () => {
      loadedImages[key] = img;
      finish();
    };
    img.onerror = finish;
    img.src = src;
    setTimeout(finish, 2500);
  });
});

// Deterministic pseudo-random stars/particles
const PARTICLES = Array.from({ length: 65 }, (_, i) => {
  const s1 = Math.sin(i * 12.9898) * 43758.5453;
  const s2 = Math.sin(i * 78.233) * 43758.5453;
  const s3 = Math.sin(i * 45.164) * 43758.5453;
  return {
    x: s1 - Math.floor(s1),
    y: s2 - Math.floor(s2),
    r: 1 + (s3 - Math.floor(s3)) * 2.4,
    speed: 0.008 + ((i % 7) * 0.003),
    phase: i * 0.7,
    hue: i % 3 === 0 ? PAL.bch : i % 3 === 1 ? PAL.pusd : PAL.purple,
  };
});

// Math & Easing helpers
function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function easeOutCubic(x) {
  const t = clamp(x);
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(x) {
  const t = clamp(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function prog(t, start, dur = 0.7) {
  return easeOutCubic((t - start) / dur);
}

function pulse(t, speed = 2.2) {
  return 0.5 + 0.5 * Math.sin(t * speed);
}

// Drawing helpers
function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCard(ctx, x, y, w, h, {
  radius = 24,
  fill = PAL.cardBg,
  stroke = PAL.borderSubtle,
  lineWidth = 2,
  glow = null,
  glowBlur = 28,
  alpha = 1,
} = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = glowBlur;
  }
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.restore();
}

function drawPill(ctx, cx, cy, text, {
  bg = 'rgba(10, 193, 142, 0.14)',
  stroke = PAL.bch,
  color = PAL.bch,
  font = '700 20px "Space Grotesk", "Inter", sans-serif',
  padX = 24,
  height = 46,
  alpha = 1,
  glow = null,
} = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = font;
  const tw = ctx.measureText(text).width;
  const w = tw + padX * 2;
  const x = cx - w / 2;
  const y = cy - height / 2;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 18;
  }
  roundRectPath(ctx, x, y, w, height, height / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 1);
  ctx.restore();
  return w;
}

function drawPillLeft(ctx, leftX, cy, text, opts = {}) {
  const font = opts.font || '700 20px "Space Grotesk", "Inter", sans-serif';
  const padX = opts.padX !== undefined ? opts.padX : 24;
  ctx.save();
  ctx.font = font;
  const w = ctx.measureText(text).width + padX * 2;
  ctx.restore();
  return drawPill(ctx, leftX + w / 2, cy, text, opts);
}

function drawPillRight(ctx, rightX, cy, text, opts = {}) {
  const font = opts.font || '700 20px "Space Grotesk", "Inter", sans-serif';
  const padX = opts.padX !== undefined ? opts.padX : 24;
  ctx.save();
  ctx.font = font;
  const w = ctx.measureText(text).width + padX * 2;
  ctx.restore();
  return drawPill(ctx, rightX - w / 2, cy, text, opts);
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, {
  font = '500 24px "Inter", sans-serif',
  color = PAL.textMuted,
  align = 'left',
  maxLines = 4,
  alpha = 1,
} = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = words[i];
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const count = Math.min(lines.length, maxLines);
  for (let i = 0; i < count; i++) {
    let out = lines[i];
    if (i === count - 1 && lines.length > count) {
      while (ctx.measureText(`${out}...`).width > maxWidth && out.length > 4) {
        out = out.slice(0, -1);
      }
      out = `${out}...`;
    }
    ctx.fillText(out, x, y + i * lineHeight);
  }
  ctx.restore();
  return count * lineHeight;
}

function drawFitText(ctx, text, x, y, maxWidth, {
  size = 48,
  minSize = 24,
  weight = '700',
  family = '"Space Grotesk", "Inter", sans-serif',
  color = PAL.textMain,
  align = 'center',
  baseline = 'middle',
  alpha = 1,
} = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  let curSize = size;
  ctx.font = `${weight} ${curSize}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && curSize > minSize) {
    curSize -= 1;
    ctx.font = `${weight} ${curSize}px ${family}`;
  }
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawLogo(ctx, key, cx, cy, size, {
  glowColor = null,
  ringColor = null,
  alpha = 1,
  bg = '#0B1328',
} = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  const r = size / 2;
  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 24;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.shadowBlur = 0;

  const img = loadedImages[key];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, cx - r + 2, cy - r + 2, size - 4, size - 4);
    ctx.restore();
  } else {
    ctx.fillStyle = ringColor || PAL.bch;
    ctx.font = `700 ${Math.round(size * 0.34)}px "Space Grotesk", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(key.slice(0, 3), cx, cy + 1);
  }

  if (ringColor) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = ringColor;
    ctx.stroke();
  }
  ctx.restore();
}

function drawFlowLine(ctx, x1, y1, x2, y2, t, {
  color = PAL.bch,
  alpha = 1,
  broken = false,
  packets = 2,
  lineWidth = 3,
} = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  if (broken) {
    ctx.setLineDash([12, 12]);
  }
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = broken ? 'rgba(239, 68, 68, 0.55)' : color;
  ctx.stroke();
  ctx.setLineDash([]);

  if (!broken) {
    for (let i = 0; i < packets; i++) {
      const f = ((t * 0.55) + (i / packets)) % 1;
      const px = x1 + (x2 - x1) * f;
      const py = y1 + (y2 - y1) * f;
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(px, py, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  ctx.restore();
}

function drawBackground(ctx, t, accent = PAL.bch) {
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, PAL.bgDeep);
  grad.addColorStop(0.55, PAL.bgMid);
  grad.addColorStop(1, '#060A18');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle ambient radial glows
  const g1 = ctx.createRadialGradient(W * 0.22, H * 0.2, 10, W * 0.22, H * 0.2, 620);
  g1.addColorStop(0, 'rgba(10, 193, 142, 0.10)');
  g1.addColorStop(1, 'rgba(10, 193, 142, 0)');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W * 0.8, H * 0.78, 10, W * 0.8, H * 0.78, 680);
  g2.addColorStop(0, accent === PAL.purple ? 'rgba(168, 85, 247, 0.11)' : 'rgba(56, 189, 248, 0.09)');
  g2.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  // Subtle technical grid
  ctx.save();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.045)';
  ctx.lineWidth = 1;
  const step = 80;
  for (let x = 0; x <= W; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();

  // Floating particles
  ctx.save();
  for (let i = 0; i < PARTICLES.length; i++) {
    const p = PARTICLES[i];
    const px = ((p.x + t * p.speed * 0.35) % 1) * W;
    const py = ((p.y - t * p.speed + 10) % 1) * H;
    ctx.globalAlpha = 0.16 + 0.2 * pulse(t + p.phase, 1.4);
    ctx.fillStyle = p.hue;
    ctx.beginPath();
    ctx.arc(px, py, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTopBar(ctx, sceneNum, badgeText, lang) {
  ctx.save();
  drawLogo(ctx, 'LOGO', 78, 62, 48, { ringColor: PAL.bch, glowColor: 'rgba(10,193,142,0.4)' });
  ctx.fillStyle = PAL.textMain;
  ctx.font = '700 24px "Space Grotesk", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('BinaryLiquid', 116, 62);

  ctx.fillStyle = PAL.textDim;
  ctx.font = '600 18px "Inter", sans-serif';
  ctx.fillText(`•  0${sceneNum} / 08`, 278, 62);

  const langW = drawPillRight(ctx, W - 52, 62, lang.toUpperCase(), {
    bg: 'rgba(56, 189, 248, 0.12)',
    stroke: 'rgba(56, 189, 248, 0.45)',
    color: PAL.pusd,
    font: '700 16px "Space Grotesk", sans-serif',
    height: 38,
    padX: 16,
  });

  drawPillRight(ctx, W - 52 - langW - 14, 62, badgeText, {
    bg: 'rgba(10, 193, 142, 0.10)',
    stroke: 'rgba(10, 193, 142, 0.45)',
    color: PAL.bch,
    font: '700 16px "Space Grotesk", sans-serif',
    height: 38,
    padX: 20,
  });
  ctx.restore();
}

// =========================================================================
// SCENE 1: Liquidity Fragmentation & BinaryLiquid Hub
// =========================================================================
function renderScene1(ctx, t, lang, c) {
  drawBackground(ctx, t);
  const es = lang === 'es';
  drawTopBar(ctx, 1, es ? 'ACTIVO EN TESTNET' : 'LIVE ON TESTNET', lang);

  const isPhase2 = t >= c.phase2Start;

  if (!isPhase2) {
    const fadeOut = t > c.phase2Start - 0.7 ? clamp((c.phase2Start - t) / 0.7) : 1;
    ctx.save();
    ctx.globalAlpha = fadeOut;

    const titleA = prog(t, 0.15, 0.8);
    drawPill(ctx, W / 2, 142, es ? 'EL PROBLEMA ACTUAL EN DEFI' : 'THE DEFI LIQUIDITY BOTTLENECK', {
      bg: 'rgba(245, 158, 11, 0.14)',
      stroke: PAL.amber,
      color: PAL.amber,
      alpha: titleA,
    });
    drawFitText(
      ctx,
      es ? 'Liquidez Fragmentada en Redes Aisladas' : 'Liquidity Fragmented Across Siloed Chains',
      W / 2,
      214,
      1520,
      { size: 62, alpha: titleA }
    );
    drawFitText(
      ctx,
      es
        ? 'Mover valor entre Bitcoin Cash, EVM, Solana y Litecoin obliga a usar puentes custodiales o CEX'
        : 'Moving value between Bitcoin Cash, EVM, Solana, and Litecoin forces custodial bridges or CEX hops',
      W / 2,
      274,
      1480,
      { size: 28, weight: '500', color: PAL.textMuted, alpha: prog(t, 0.6, 0.8) }
    );

    // 4 Isolated Network Islands
    const islands = [
      {
        x: 150, y: 365, logo: 'BCH', name: 'Bitcoin Cash', net: 'Chipnet Testnet',
        tag: es ? 'UTXO Nativos' : 'Native UTXO', color: PAL.bch, delay: 1.2,
      },
      {
        x: 575, y: 365, logo: 'POL', name: 'Polygon', net: 'Amoy Testnet',
        tag: es ? 'Liquidez EVM' : 'EVM Silo', color: PAL.pol, delay: 2.0,
      },
      {
        x: 1000, y: 365, logo: 'SOL', name: 'Solana', net: 'Devnet',
        tag: es ? 'Pool Aislado' : 'Isolated Pool', color: PAL.sol, delay: 2.8,
      },
      {
        x: 1425, y: 365, logo: 'LTC', name: 'Litecoin', net: 'Testnet4',
        tag: es ? 'UTXO Separado' : 'Separate Chain', color: PAL.ltc, delay: 3.4,
      },
    ];

    const islandHighlight = t >= c.introEnd;
    const lockHighlight = t >= c.islandStart;

    for (let i = 0; i < islands.length; i++) {
      const n = islands[i];
      const a = prog(t, islandHighlight ? c.introEnd + i * 0.35 : n.delay, 0.7);
      const bob = Math.sin(t * 1.8 + i * 1.2) * 5;
      drawCard(ctx, n.x, n.y + bob, 345, 310, {
        stroke: lockHighlight ? 'rgba(239, 68, 68, 0.5)' : 'rgba(148, 163, 184, 0.25)',
        glow: lockHighlight ? 'rgba(239, 68, 68, 0.16)' : null,
        alpha: a,
      });
      drawLogo(ctx, n.logo, n.x + 172.5, n.y + 88 + bob, 92, {
        ringColor: n.color,
        glowColor: n.color,
        alpha: a,
      });
      drawFitText(ctx, n.name, n.x + 172.5, n.y + 175 + bob, 300, { size: 30, alpha: a });
      drawFitText(ctx, n.net, n.x + 172.5, n.y + 214 + bob, 300, {
        size: 20, weight: '600', color: n.color, alpha: a,
      });
      drawPill(ctx, n.x + 172.5, n.y + 266 + bob, n.tag, {
        bg: 'rgba(239, 68, 68, 0.12)',
        stroke: 'rgba(239, 68, 68, 0.45)',
        color: '#FCA5A5',
        font: '600 17px "Inter", sans-serif',
        height: 36,
        padX: 18,
        alpha: a,
      });

      if (i < islands.length - 1) {
        const bx1 = n.x + 345;
        const bx2 = islands[i + 1].x;
        const midX = (bx1 + bx2) / 2;
        drawFlowLine(ctx, bx1 + 8, 520, bx2 - 8, 520, t, { broken: true, alpha: a });
        if (islandHighlight) {
          drawPill(ctx, midX, 520, '✕', {
            bg: '#2A0F18',
            stroke: PAL.red,
            color: PAL.red,
            font: '700 20px "Space Grotesk", sans-serif',
            height: 38,
            padX: 14,
            alpha: prog(t, c.introEnd, 0.6),
          });
        }
      }
    }

    // Bottleneck callout synced to c.islandStart
    const botA = prog(t, c.islandStart, 0.7);
    drawCard(ctx, 290, 748, 1340, 148, {
      fill: 'rgba(42, 16, 28, 0.85)',
      stroke: 'rgba(239, 68, 68, 0.55)',
      glow: 'rgba(239, 68, 68, 0.22)',
      alpha: botA,
    });
    drawFitText(
      ctx,
      es
        ? '⚠ Activos Envueltos (Wrapped)  •  Retiros Lentos en CEX  •  Riesgo Custodial'
        : '⚠ Wrapped IOU Assets  •  Slow CEX Withdrawals  •  Custodial Honeypot Risk',
      W / 2,
      800,
      1240,
      { size: 30, color: '#FCA5A5', alpha: botA }
    );
    drawFitText(
      ctx,
      es
        ? 'La liquidez queda atrapada en cada red sin interoperabilidad nativa'
        : 'Capital remains trapped inside isolated ledgers without native settlement',
      W / 2,
      852,
      1240,
      { size: 22, weight: '500', color: PAL.textMuted, alpha: botA }
    );

    ctx.restore();
  } else {
    // Phase 2: BinaryLiquid Unified Hub
    const t2 = t - c.phase2Start;
    const pA = prog(t2, 0, 0.8);
    drawPill(ctx, W / 2, 136, es ? 'LA SOLUCIÓN BINARYLIQUID' : 'THE BINARYLIQUID PROTOCOL', {
      bg: PAL.bchSoft,
      stroke: PAL.bch,
      color: PAL.bch,
      alpha: pA,
    });
    drawFitText(
      ctx,
      es ? 'Liquidez Unificada Nativa Desde Bitcoin Cash' : 'Unified Cross-Chain Liquidity Powered by Bitcoin Cash',
      W / 2,
      206,
      1540,
      { size: 58, alpha: pA }
    );

    // Center Hub
    const hubX = W / 2;
    const hubY = 530;
    const chainPhase = t >= c.chainsStart;
    const chainAlpha = prog(t, c.chainsStart, 0.8);

    const nodes = [
      { cx: 340, cy: 380, logo: 'BCH', name: 'BCH Chipnet', sub: es ? 'Bóvedas P2SH-32 + CashTokens' : 'P2SH-32 Vaults + CashTokens', color: PAL.bch },
      { cx: 340, cy: 690, logo: 'POL', name: 'Polygon Amoy', sub: es ? 'Liquidación EVM Testnet' : 'EVM Testnet Settlement', color: PAL.pol },
      { cx: 1580, cy: 380, logo: 'SOL', name: 'Solana Devnet', sub: es ? 'Enrutamiento SPL Testnet' : 'SPL Devnet Routing', color: PAL.sol },
      { cx: 1580, cy: 690, logo: 'LTC', name: 'Litecoin Testnet4', sub: es ? 'Liquidación UTXO Testnet' : 'UTXO Testnet Settlement', color: PAL.ltc },
    ];

    for (let i = 0; i < nodes.length; i++) {
      const nd = nodes[i];
      drawFlowLine(ctx, hubX, hubY, nd.cx, nd.cy, t, {
        color: nd.color,
        alpha: 0.25 + 0.75 * chainAlpha,
        packets: 3,
      });
    }

    // Draw Central Hub Card
    drawCard(ctx, hubX - 245, hubY - 175, 490, 350, {
      radius: 32,
      fill: 'rgba(10, 22, 45, 0.96)',
      stroke: PAL.bch,
      lineWidth: 2.8,
      glow: 'rgba(10, 193, 142, 0.35)',
      glowBlur: 40,
      alpha: pA,
    });
    drawLogo(ctx, 'LOGO', hubX, hubY - 72, 118, { ringColor: PAL.bch, glowColor: PAL.bch, alpha: pA });
    drawFitText(ctx, 'BinaryLiquid Hub', hubX, hubY + 26, 420, { size: 36, alpha: pA });
    drawFitText(
      ctx,
      es ? 'Contratos CashScript P2SH-32 + PUSD' : 'P2SH-32 Covenants + CashToken PUSD',
      hubX,
      hubY + 72,
      430,
      { size: 21, weight: '600', color: PAL.pusd, alpha: pA }
    );
    drawPill(ctx, hubX, hubY + 124, es ? 'SIN CUSTODIA • MULTI-RED' : 'NON-CUSTODIAL • MULTI-CHAIN', {
      bg: PAL.bchSoft,
      stroke: PAL.bch,
      color: PAL.bch,
      font: '700 16px "Space Grotesk", sans-serif',
      height: 36,
      alpha: pA,
    });

    // Draw 4 Network Endpoint Cards
    for (let i = 0; i < nodes.length; i++) {
      const nd = nodes[i];
      const na = chainPhase ? prog(t, c.chainsStart + i * 0.25, 0.7) : pA * 0.55;
      drawCard(ctx, nd.cx - 210, nd.cy - 92, 420, 184, {
        fill: PAL.cardActive,
        stroke: chainPhase ? nd.color : PAL.borderSubtle,
        glow: chainPhase ? nd.color : null,
        glowBlur: 20,
        alpha: na,
      });
      drawLogo(ctx, nd.logo, nd.cx - 130, nd.cy, 78, { ringColor: nd.color, alpha: na });
      drawFitText(ctx, nd.name, nd.cx - 72, nd.cy - 20, 260, {
        size: 27, align: 'left', alpha: na,
      });
      drawFitText(ctx, nd.sub, nd.cx - 72, nd.cy + 20, 260, {
        size: 19, weight: '500', color: PAL.textMuted, align: 'left', alpha: na,
      });
    }

    // Active Testnet Footer Pill
    const footA = prog(t, c.chainsStart + 1.0, 0.8);
    drawCard(ctx, 360, 885, 1200, 92, {
      fill: 'rgba(13, 24, 50, 0.92)',
      stroke: 'rgba(56, 189, 248, 0.45)',
      alpha: footA,
    });
    drawFitText(
      ctx,
      es
        ? 'Desplegado en Vivo en Testnet: Chipnet • Polygon Amoy • Solana Devnet • LTC Testnet4  |  Arquitectura Lista para Mainnet'
        : 'Live Testnet Mesh: BCH Chipnet • Polygon Amoy • Solana Devnet • LTC Testnet4  |  Architected for Mainnet',
      W / 2,
      931,
      1140,
      { size: 22, weight: '600', color: PAL.pusd, alpha: footA }
    );
  }
}

// =========================================================================
// SCENE 2: BCH P2SH-32 Smart Vaults & 3-Step Settlement Pipeline
// =========================================================================
function renderScene2(ctx, t, lang, c) {
  drawBackground(ctx, t, PAL.pusd);
  const es = lang === 'es';
  drawTopBar(ctx, 2, es ? 'ARQUITECTURA DUAL' : 'DUAL-LAYER ARCHITECTURE', lang);

  const isPhase2 = t >= c.phase2Start;

  if (!isPhase2) {
    const fadeOut = t > c.phase2Start - 0.7 ? clamp((c.phase2Start - t) / 0.7) : 1;
    ctx.save();
    ctx.globalAlpha = fadeOut;

    const headA = prog(t, 0.1, 0.8);
    drawFitText(
      ctx,
      es ? 'Arquitectura Dual: Pools P2SH-32 + Malla Cross-Chain' : 'Dual-Layer Engine: BCH P2SH-32 Pools + Relayer Mesh',
      W / 2,
      165,
      1600,
      { size: 54, alpha: headA }
    );
    drawFitText(
      ctx,
      es
        ? 'Covenants deterministas en Bitcoin Cash sincronizados con relayers multi-red sin custodia'
        : 'Deterministic Bitcoin Cash UTXO covenants paired with non-custodial multi-chain settlement',
      W / 2,
      225,
      1500,
      { size: 26, weight: '500', color: PAL.textMuted, alpha: headA }
    );

    const ammActive = t >= c.ammStart;
    const chainsActive = t >= c.chainsStart;

    // Left Card: BCH P2SH-32 AMM
    const leftA = prog(t, 1.0, 0.8);
    drawCard(ctx, 130, 300, 790, 620, {
      fill: ammActive ? PAL.cardActive : PAL.cardBg,
      stroke: ammActive ? PAL.bch : PAL.borderSubtle,
      lineWidth: ammActive ? 3 : 2,
      glow: ammActive ? PAL.bch : null,
      glowBlur: 32,
      alpha: leftA,
    });
    drawPillLeft(ctx, 180, 368, es ? 'CAPA 1 • ON-CHAIN BCH' : 'LAYER 1 • ON-CHAIN BCH', {
      bg: PAL.bchSoft,
      stroke: PAL.bch,
      color: PAL.bch,
      alpha: leftA,
    });
    drawLogo(ctx, 'BCH', 775, 395, 88, { ringColor: PAL.bch, glowColor: PAL.bch, alpha: leftA });
    drawLogo(ctx, 'PUSD', 845, 395, 76, { ringColor: PAL.pusd, alpha: leftA });
    drawFitText(
      ctx,
      es ? 'Covenant AMM P2SH-32' : 'P2SH-32 AMM Covenant',
      180,
      442,
      580,
      { size: 40, align: 'left', alpha: leftA }
    );
    drawWrappedText(
      ctx,
      es
        ? 'Las reservas viven en direcciones de script UTXO auditables en Bitcoin Cash (Chipnet), aplicando reglas matemáticas x * y = k directamente en CashScript.'
        : 'Reserves are locked inside verifiable Bitcoin Cash P2SH-32 UTXO script covenants on Chipnet, enforcing x * y = k invariants in CashScript.',
      180,
      495,
      680,
      36,
      { font: '500 24px "Inter", sans-serif', color: PAL.textMuted, alpha: leftA }
    );

    const bulletsL = es
      ? [
          '✓ CashTokens nativos: BCH ⇄ PUSD en UTXO',
          '✓ Límites de tasa y seguridad en el script',
          '✓ Sin llaves maestras de administrador sobre tu saldo',
        ]
      : [
          '✓ Native CashTokens: BCH ⇄ PUSD inside UTXO',
          '✓ Script-enforced invariant & rate protections',
          '✓ Zero admin hot-key sweeping user deposits',
        ];
    bulletsL.forEach((b, idx) => {
      drawFitText(ctx, b, 180, 675 + idx * 56, 680, {
        size: 24, weight: '600', color: PAL.bch, align: 'left', alpha: leftA,
      });
    });

    // Bridge Link in middle
    drawFlowLine(ctx, 920, 610, 1000, 610, t, {
      color: PAL.pusd,
      alpha: prog(t, c.chainsStart, 0.6),
      packets: 2,
    });

    // Right Card: Live Multi-Chain Mesh
    const rightA = prog(t, 1.4, 0.8);
    drawCard(ctx, 1000, 300, 790, 620, {
      fill: chainsActive ? PAL.cardActive : PAL.cardBg,
      stroke: chainsActive ? PAL.pusd : PAL.borderSubtle,
      lineWidth: chainsActive ? 3 : 2,
      glow: chainsActive ? PAL.pusd : null,
      glowBlur: 32,
      alpha: rightA,
    });
    drawPillLeft(ctx, 1050, 368, es ? 'CAPA 2 • REDES CONECTADAS' : 'LAYER 2 • CONNECTED MESH', {
      bg: 'rgba(56, 189, 248, 0.14)',
      stroke: PAL.pusd,
      color: PAL.pusd,
      alpha: rightA,
    });
    drawFitText(
      ctx,
      es ? 'Liquidación Multi-Cadena' : 'Cross-Chain Testnet Mesh',
      1050,
      442,
      680,
      { size: 40, align: 'left', alpha: rightA }
    );
    drawFitText(
      ctx,
      'Polygon Amoy • Solana Devnet • Litecoin Testnet4',
      1050,
      494,
      690,
      { size: 24, weight: '700', color: PAL.pusd, align: 'left', alpha: rightA }
    );

    const netRows = [
      { logo: 'POL', name: 'Polygon Amoy (EVM)', pair: 'USDT / POL', c: PAL.pol },
      { logo: 'SOL', name: 'Solana Devnet (SPL)', pair: 'SOL / USDT', c: PAL.sol },
      { logo: 'LTC', name: 'Litecoin Testnet4 (UTXO)', pair: 'LTC / BCH', c: PAL.ltc },
    ];
    netRows.forEach((nr, idx) => {
      const ry = 558 + idx * 104;
      drawCard(ctx, 1050, ry, 690, 86, {
        radius: 18,
        fill: 'rgba(8, 14, 32, 0.9)',
        stroke: chainsActive ? nr.c : PAL.borderSubtle,
        alpha: rightA,
      });
      drawLogo(ctx, nr.logo, 1106, ry + 43, 56, { ringColor: nr.c, alpha: rightA });
      drawFitText(ctx, nr.name, 1154, ry + 32, 370, {
        size: 24, align: 'left', alpha: rightA,
      });
      drawFitText(ctx, nr.pair, 1712, ry + 43, 180, {
        size: 22, weight: '700', color: nr.c, align: 'right', alpha: rightA,
      });
      drawFitText(ctx, es ? 'Testnet Activo' : 'Testnet Live', 1154, ry + 62, 260, {
        size: 17, weight: '600', color: PAL.textMuted, align: 'left', alpha: rightA,
      });
    });

    ctx.restore();
  } else {
    // Phase 2: 3-Step Cross-Chain Execution Pipeline synced to step1, step2, step3
    const t2 = t - c.phase2Start;
    const pA = prog(t2, 0, 0.7);
    drawPill(ctx, W / 2, 140, es ? 'EJECUCIÓN PASO A PASO' : 'STEP-BY-STEP EXECUTION FLOW', {
      bg: 'rgba(56, 189, 248, 0.14)',
      stroke: PAL.pusd,
      color: PAL.pusd,
      alpha: pA,
    });
    drawFitText(
      ctx,
      es ? '¿Cómo Funciona un Swap Cross-Chain?' : 'How Cross-Chain Settlement Executes',
      W / 2,
      208,
      1540,
      { size: 54, alpha: pA }
    );

    const activeIdx =
      t >= c.step3 ? 2 :
      t >= c.step2 ? 1 :
      t >= c.step1 ? 0 : 0;

    const steps = [
      {
        num: '01',
        cue: c.step1,
        color: PAL.bch,
        logo: 'BCH',
        title: es ? 'Bloqueo en Bóveda P2SH-32' : 'Lock in P2SH-32 Vault',
        sub: es ? 'Firma vía Paytaca / WizardConnect' : 'Signed via Paytaca / WizardConnect',
        desc: es
          ? 'El usuario firma desde su propia billetera en BCH Chipnet y envía liquidez directamente al contrato CashScript.'
          : 'User signs from their self-custody wallet on BCH Chipnet, locking funds directly inside the CashScript covenant.',
      },
      {
        num: '02',
        cue: c.step2,
        color: PAL.amber,
        logo: 'LOGO',
        title: es ? 'Verificación Sentinel' : 'Sentinel Verification',
        sub: es ? 'Módulo Centinela No-Custodial' : 'Non-Custodial Watchman Module',
        desc: es
          ? 'El módulo Centinela valida la prueba de transacción, el destino declarado y los límites de riesgo sin tocar llaves.'
          : 'The Sentinel daemon inspects UTXO transaction proofs, slippage bounds, and rate limits without holding user keys.',
      },
      {
        num: '03',
        cue: c.step3,
        color: PAL.pusd,
        logo: 'POL',
        title: es ? 'Liquidación Multi-Red' : 'Target Chain Settlement',
        sub: es ? 'Amoy • Solana Devnet • LTC' : 'Amoy • Solana Devnet • LTC',
        desc: es
          ? 'El motor Relayer libera USDT, POL, SOL o LTC en la dirección final del usuario en cuestión de segundos.'
          : 'The Relayer Engine dispatches native USDT, POL, SOL, or LTC to the user destination wallet within seconds.',
      },
    ];

    for (let i = 0; i < steps.length; i++) {
      const st = steps[i];
      const sx = 120 + i * 590;
      const sy = 310;
      const sw = 500;
      const sh = 590;
      const active = i === activeIdx;
      const unlocked = t >= st.cue - 0.5;
      const cardA = unlocked ? 1 : 0.48;

      if (i < steps.length - 1) {
        drawFlowLine(ctx, sx + sw, sy + 280, sx + 590, sy + 280, t, {
          color: st.color,
          alpha: t >= steps[i + 1].cue - 0.4 ? 1 : 0.35,
          packets: 2,
        });
      }

      drawCard(ctx, sx, sy, sw, sh, {
        fill: active ? PAL.cardActive : PAL.cardBg,
        stroke: active ? st.color : PAL.borderSubtle,
        lineWidth: active ? 3.5 : 2,
        glow: active ? st.color : null,
        glowBlur: 34,
        alpha: cardA,
      });

      drawPill(ctx, sx + 96, sy + 56, `STEP ${st.num}`, {
        bg: active ? 'rgba(255,255,255,0.12)' : 'rgba(148,163,184,0.10)',
        stroke: st.color,
        color: st.color,
        alpha: cardA,
      });

      drawLogo(ctx, st.logo, sx + sw / 2, sy + 165, 108, {
        ringColor: st.color,
        glowColor: active ? st.color : null,
        alpha: cardA,
      });

      drawFitText(ctx, st.title, sx + sw / 2, sy + 265, 440, {
        size: 32, alpha: cardA,
      });
      drawFitText(ctx, st.sub, sx + sw / 2, sy + 308, 440, {
        size: 20, weight: '600', color: st.color, alpha: cardA,
      });

      drawWrappedText(ctx, st.desc, sx + 40, sy + 365, sw - 80, 36, {
        font: '500 23px "Inter", sans-serif',
        color: active ? PAL.textMain : PAL.textMuted,
        alpha: cardA,
      });

      if (active) {
        drawPill(ctx, sx + sw / 2, sy + sh - 46, es ? '● ACTIVO EN ESTE PASO' : '● ACTIVE STEP', {
          bg: 'rgba(10, 193, 142, 0.16)',
          stroke: st.color,
          color: st.color,
          font: '700 16px "Space Grotesk", sans-serif',
          height: 36,
        });
      }
    }
  }
}

// =========================================================================
// SCENE 3: Community Liquidity & 0.20% Pool Reserve Accrual
// =========================================================================
function renderScene3(ctx, t, lang, c) {
  drawBackground(ctx, t, PAL.bch);
  const es = lang === 'es';
  drawTopBar(ctx, 3, es ? 'LIQUIDEZ COMUNITARIA' : 'COMMUNITY LIQUIDITY', lang);

  const stage =
    t >= c.poolAccrual ? 2 :
    t >= c.feeSplit ? 1 : 0;

  drawFitText(
    ctx,
    es ? 'Proveedores de Liquidez (LPs) y Rendimiento Real 0.20%' : 'Community LPs & 0.20% Real Reserve Yield',
    W / 2,
    158,
    1620,
    { size: 54, alpha: prog(t, 0.1, 0.8) }
  );
  drawFitText(
    ctx,
    es
      ? 'Cada swap genera 0.30% de comisión total: 0.20% se acumula en las reservas del pool y 0.10% respalda al Centinela'
      : 'Every swap collects a 0.30% protocol fee: 0.20% accrues inside pool reserves for LPs and 0.10% sustains the Sentinel',
    W / 2,
    218,
    1600,
    { size: 25, weight: '500', color: PAL.textMuted, alpha: prog(t, 0.3, 0.8) }
  );

  // Stage 1 Card (Left): LP Deposit
  const s1Active = stage === 0;
  const s1A = t >= c.deposit - 0.5 ? 1 : prog(t, 0.8, 0.7);
  drawCard(ctx, 110, 295, 500, 620, {
    fill: s1Active ? PAL.cardActive : PAL.cardBg,
    stroke: s1Active ? PAL.bch : PAL.borderSubtle,
    lineWidth: s1Active ? 3 : 2,
    glow: s1Active ? PAL.bch : null,
    alpha: s1A,
  });
  drawPillLeft(ctx, 150, 355, es ? '1. DEPÓSITO LP' : '1. LP DEPOSIT', {
    bg: PAL.bchSoft, stroke: PAL.bch, color: PAL.bch, alpha: s1A,
  });
  drawLogo(ctx, 'BCH', 310, 465, 96, { ringColor: PAL.bch, alpha: s1A });
  drawLogo(ctx, 'PUSD', 410, 465, 96, { ringColor: PAL.pusd, alpha: s1A });
  drawFitText(ctx, es ? 'Aportar BCH + PUSD' : 'Supply BCH + PUSD', 360, 565, 440, {
    size: 32, alpha: s1A,
  });
  drawWrappedText(
    ctx,
    es
      ? 'El proveedor deposita liquidez en el pool P2SH-32 sin custodia y recibe tokens de participación LP.'
      : 'Liquidity providers deposit into the non-custodial P2SH-32 covenant pool and hold verifiable LP share tokens.',
    150,
    615,
    420,
    34,
    { font: '500 22px "Inter", sans-serif', color: PAL.textMuted, alpha: s1A }
  );
  drawCard(ctx, 150, 785, 420, 88, {
    radius: 16, fill: 'rgba(8, 15, 34, 0.9)', stroke: PAL.bch, alpha: s1A,
  });
  drawFitText(ctx, es ? 'Custodia: 100% En Contrato UTXO' : 'Custody: 100% On-Chain Covenant', 360, 829, 390, {
    size: 21, weight: '700', color: PAL.bch, alpha: s1A,
  });

  drawFlowLine(ctx, 610, 600, 690, 600, t, { color: PAL.bch, packets: 2, alpha: 0.9 });

  // Stage 2 Card (Middle): 0.30% Fee Split
  const s2Active = stage === 1;
  const s2A = t >= c.feeSplit - 0.5 ? 1 : 0.55;
  drawCard(ctx, 690, 295, 540, 620, {
    fill: s2Active ? PAL.cardActive : PAL.cardBg,
    stroke: s2Active ? PAL.pusd : PAL.borderSubtle,
    lineWidth: s2Active ? 3 : 2,
    glow: s2Active ? PAL.pusd : null,
    alpha: s2A,
  });
  drawPillLeft(ctx, 740, 355, es ? '2. COMISIÓN 0.30%' : '2. 0.30% FEE SPLIT', {
    bg: 'rgba(56, 189, 248, 0.14)', stroke: PAL.pusd, color: PAL.pusd, alpha: s2A,
  });
  drawFitText(ctx, '0.30%', 960, 448, 440, { size: 78, color: PAL.textMain, alpha: s2A });
  drawFitText(ctx, es ? 'Comisión Total por Swap' : 'Total Swap Fee', 960, 505, 440, {
    size: 23, weight: '600', color: PAL.textMuted, alpha: s2A,
  });

  // Visual proportional bar: 2/3 LP (0.20%), 1/3 Sentinel (0.10%)
  const barX = 740;
  const barY = 560;
  const barW = 440;
  ctx.save();
  ctx.globalAlpha = s2A;
  roundRectPath(ctx, barX, barY, barW * 0.666 - 4, 48, 12);
  ctx.fillStyle = PAL.bch;
  ctx.fill();
  roundRectPath(ctx, barX + barW * 0.666 + 4, barY, barW * 0.333 - 4, 48, 12);
  ctx.fillStyle = PAL.amber;
  ctx.fill();
  ctx.restore();

  drawFitText(ctx, '0.20% LPs', barX + barW * 0.33, barY + 24, 240, {
    size: 22, weight: '700', color: '#04120E', alpha: s2A,
  });
  drawFitText(ctx, '0.10%', barX + barW * 0.83, barY + 24, 130, {
    size: 20, weight: '700', color: '#1A1102', alpha: s2A,
  });

  drawCard(ctx, 740, 645, 440, 105, {
    radius: 16, fill: 'rgba(10, 193, 142, 0.10)', stroke: PAL.bch, alpha: s2A,
  });
  drawFitText(ctx, es ? '0.20% ➔ Reservas del Pool (LPs)' : '0.20% ➔ LP Pool Reserves', 960, 682, 400, {
    size: 23, weight: '700', color: PAL.bch, alpha: s2A,
  });
  drawFitText(ctx, es ? 'Aumenta el valor de cada token LP' : 'Increases underlying LP share value', 960, 718, 400, {
    size: 19, weight: '500', color: PAL.textMuted, alpha: s2A,
  });

  drawCard(ctx, 740, 770, 440, 105, {
    radius: 16, fill: 'rgba(245, 158, 11, 0.10)', stroke: PAL.amber, alpha: s2A,
  });
  drawFitText(ctx, es ? '0.10% ➔ Módulo Centinela y Reservas' : '0.10% ➔ Sentinel & Protocol Reserves', 960, 807, 410, {
    size: 21, weight: '700', color: PAL.amber, alpha: s2A,
  });
  drawFitText(ctx, es ? 'Opera monitoreo e infraestructura cross-chain' : 'Funds cross-chain monitoring & gas reserves', 960, 843, 410, {
    size: 18, weight: '500', color: PAL.textMuted, alpha: s2A,
  });

  drawFlowLine(ctx, 1230, 600, 1310, 600, t, { color: PAL.bch, packets: 2, alpha: s2A });

  // Stage 3 Card (Right): Pool Reserve Growth Curve (NEVER direct UTXO payout claim)
  const s3Active = stage === 2;
  const s3A = t >= c.poolAccrual - 0.5 ? 1 : 0.55;
  drawCard(ctx, 1310, 295, 500, 620, {
    fill: s3Active ? PAL.cardActive : PAL.cardBg,
    stroke: s3Active ? PAL.bch : PAL.borderSubtle,
    lineWidth: s3Active ? 3 : 2,
    glow: s3Active ? PAL.bch : null,
    alpha: s3A,
  });
  drawPillLeft(ctx, 1350, 355, es ? '3. ACUMULACIÓN EN POOL' : '3. POOL ACCRUAL', {
    bg: PAL.bchSoft, stroke: PAL.bch, color: PAL.bch, alpha: s3A,
  });
  drawFitText(
    ctx,
    es ? 'Crece en Reservas del Pool' : 'Accrues Inside Pool Reserves',
    1560,
    438,
    440,
    { size: 30, alpha: s3A }
  );

  // Curve Chart inside Card 3
  const gx = 1355;
  const gy = 485;
  const gw = 410;
  const gh = 220;
  drawCard(ctx, gx, gy, gw, gh, {
    radius: 16, fill: 'rgba(6, 12, 26, 0.92)', stroke: 'rgba(148,163,184,0.2)', alpha: s3A,
  });

  ctx.save();
  ctx.globalAlpha = s3A;
  ctx.beginPath();
  ctx.moveTo(gx + 24, gy + gh - 34);
  const sweep = s3Active ? clamp((t - c.poolAccrual) / 3.5, 0.35, 1) : 0.45;
  const pts = 28;
  for (let i = 1; i <= pts; i++) {
    const f = (i / pts) * sweep;
    const cxp = gx + 24 + f * (gw - 48);
    const cyp = gy + gh - 34 - Math.pow(f, 0.78) * (gh - 72);
    ctx.lineTo(cxp, cyp);
  }
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = PAL.bch;
  ctx.shadowColor = PAL.bch;
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.restore();

  drawFitText(
    ctx,
    es ? '+0.20% compuesto por cada intercambio' : '+0.20% compounded on every swap',
    1560,
    gy + 34,
    380,
    { size: 19, weight: '700', color: PAL.bch, alpha: s3A }
  );

  drawWrappedText(
    ctx,
    es
      ? 'El rendimiento permanece seguro dentro del contrato AMM y se reclama automáticamente al retirar tu posición LP.'
      : 'Earned fees compound securely inside the AMM contract and unlock directly when redeeming your LP tokens.',
    1350,
    735,
    420,
    33,
    { font: '500 22px "Inter", sans-serif', color: PAL.textMuted, alpha: s3A }
  );
}

// =========================================================================
// SCENE 4: Security Comparison — Custodial Bridges vs P2SH-32 Vaults
// =========================================================================
function renderScene4(ctx, t, lang, c) {
  drawBackground(ctx, t, PAL.bch);
  const es = lang === 'es';
  drawTopBar(ctx, 4, es ? 'SEGURIDAD CRIPTOGRÁFICA' : 'CRYPTOGRAPHIC SECURITY', lang);

  drawFitText(
    ctx,
    es ? 'Bóvedas UTXO Nativas vs Puentes Custodiales' : 'Native P2SH-32 UTXO Vaults vs Custodial Bridges',
    W / 2,
    162,
    1620,
    { size: 54, alpha: prog(t, 0.1, 0.8) }
  );
  drawFitText(
    ctx,
    es
      ? 'Por qué los contratos en Bitcoin Cash eliminan el punto único de fallo de los puentes tradicionales'
      : 'Why on-chain Bitcoin Cash covenants eliminate the single point of failure in legacy bridges',
    W / 2,
    220,
    1540,
    { size: 25, weight: '500', color: PAL.textMuted, alpha: prog(t, 0.4, 0.8) }
  );

  const leftActive = t >= c.left && t < c.right;
  const rightActive = t >= c.right;

  // Left: Custodial Bridges
  const lA = prog(t, 0.8, 0.8);
  drawCard(ctx, 130, 290, 780, 640, {
    fill: leftActive ? 'rgba(38, 15, 28, 0.94)' : 'rgba(24, 13, 24, 0.84)',
    stroke: leftActive ? PAL.red : 'rgba(239, 68, 68, 0.35)',
    lineWidth: leftActive ? 3.5 : 2,
    glow: leftActive ? 'rgba(239, 68, 68, 0.32)' : null,
    alpha: lA,
  });
  drawPillLeft(ctx, 180, 355, es ? 'MODELO ANTIGUO' : 'LEGACY BRIDGES', {
    bg: 'rgba(239, 68, 68, 0.15)', stroke: PAL.red, color: '#FCA5A5', alpha: lA,
  });
  drawFitText(ctx, es ? 'Puentes Multisig Custodiales' : 'Custodial Multisig Bridges', 180, 428, 680, {
    size: 38, color: '#FEE2E2', align: 'left', alpha: lA,
  });

  const legacyRows = es
    ? [
        { k: 'Custodia de Fondos', v: 'Comité centralizado / billetera caliente' },
        { k: 'Tokens Emitidos', v: 'IOUs envueltos sin respaldo nativo UTXO' },
        { k: 'Superficie de Ataque', v: 'Bóveda gigante expuesta ($2B+ robados)' },
        { k: 'Control de Código', v: 'Reglas opacas fuera de la cadena origen' },
      ]
    : [
        { k: 'Fund Custody', v: 'Centralized multisig / opaque hot wallet' },
        { k: 'Token Model', v: 'Synthetic wrapped IOUs with depeg risk' },
        { k: 'Attack Surface', v: 'Giant honeypot targets ($2B+ hacked)' },
        { k: 'Verification', v: 'Opaque off-chain committee assumptions' },
      ];
  legacyRows.forEach((row, idx) => {
    const ry = 490 + idx * 102;
    drawCard(ctx, 180, ry, 680, 84, {
      radius: 16, fill: 'rgba(18, 9, 18, 0.88)', stroke: 'rgba(239, 68, 68, 0.3)', alpha: lA,
    });
    drawFitText(ctx, `✕  ${row.k}`, 212, ry + 26, 620, {
      size: 22, weight: '700', color: '#FCA5A5', align: 'left', alpha: lA,
    });
    drawFitText(ctx, row.v, 245, ry + 58, 590, {
      size: 20, weight: '500', color: PAL.textMuted, align: 'left', alpha: lA,
    });
  });

  // Right: BinaryLiquid P2SH-32
  const rA = rightActive ? 1 : prog(t, 1.2, 0.8);
  drawCard(ctx, 1010, 290, 780, 640, {
    fill: rightActive ? PAL.cardActive : PAL.cardBg,
    stroke: rightActive ? PAL.bch : 'rgba(10, 193, 142, 0.45)',
    lineWidth: rightActive ? 3.5 : 2,
    glow: rightActive ? PAL.bch : null,
    glowBlur: 36,
    alpha: rA,
  });
  drawPillLeft(ctx, 1060, 355, es ? 'ARQUITECTURA BINARYLIQUID' : 'BINARYLIQUID P2SH-32', {
    bg: PAL.bchSoft, stroke: PAL.bch, color: PAL.bch, alpha: rA,
  });
  drawLogo(ctx, 'BCH', 1715, 365, 76, { ringColor: PAL.bch, alpha: rA });
  drawFitText(ctx, es ? 'Bóvedas UTXO Deterministas' : 'Deterministic UTXO Covenants', 1060, 428, 640, {
    size: 38, color: PAL.textMain, align: 'left', alpha: rA,
  });

  const bchRows = es
    ? [
        { k: 'Covenant P2SH-32', v: 'Reglas CashScript verificadas en bloque' },
        { k: 'Liquidez Nativa', v: 'BCH, CashTokens PUSD y rutas multi-red' },
        { k: 'Seguridad Centinela', v: 'Disyuntores y límites de volumen por hora' },
        { k: 'Auto-Custodia Real', v: 'Firmas locales con Paytaca / Cashonize' },
      ]
    : [
        { k: 'P2SH-32 Covenant', v: 'CashScript rules enforced in every UTXO' },
        { k: 'Native Liquidity', v: 'Real BCH, CashToken PUSD & target assets' },
        { k: 'Sentinel Guards', v: 'Rate-limit circuit breakers & replay checks' },
        { k: 'True Self-Custody', v: 'Local signing via Paytaca / Cashonize' },
      ];
  bchRows.forEach((row, idx) => {
    const ry = 490 + idx * 102;
    drawCard(ctx, 1060, ry, 680, 84, {
      radius: 16,
      fill: 'rgba(8, 22, 34, 0.92)',
      stroke: rightActive ? PAL.bch : 'rgba(10, 193, 142, 0.35)',
      alpha: rA,
    });
    drawFitText(ctx, `✓  ${row.k}`, 1092, ry + 26, 620, {
      size: 22, weight: '700', color: PAL.bch, align: 'left', alpha: rA,
    });
    drawFitText(ctx, row.v, 1125, ry + 58, 590, {
      size: 20, weight: '500', color: PAL.textMuted, align: 'left', alpha: rA,
    });
  });
}

// =========================================================================
// SCENE 5: Live Swap Flow UI (Chipnet -> Polygon Amoy, Settled in Seconds)
// =========================================================================
function renderScene5(ctx, t, lang, c) {
  drawBackground(ctx, t, PAL.pusd);
  const es = lang === 'es';
  drawTopBar(ctx, 5, es ? 'EXPERIENCIA DE SWAP EN VIVO' : 'LIVE SWAP WALKTHROUGH', lang);

  const step =
    t >= c.settle ? 2 :
    t >= c.swapCard ? 1 : 0;

  drawFitText(
    ctx,
    es ? 'Flujo de Intercambio en Vivo: BCH Chipnet ➔ Polygon Amoy' : 'Live Swap Walkthrough: BCH Chipnet ➔ Polygon Amoy',
    W / 2,
    158,
    1620,
    { size: 52, alpha: prog(t, 0.1, 0.8) }
  );

  // Panel 1 (Left): Wallet Connection
  const p1Active = step === 0;
  const p1A = t >= c.wallet - 0.4 ? 1 : prog(t, 0.4, 0.6);
  drawCard(ctx, 110, 260, 440, 680, {
    fill: p1Active ? PAL.cardActive : PAL.cardBg,
    stroke: p1Active ? PAL.bch : PAL.borderSubtle,
    lineWidth: p1Active ? 3 : 2,
    glow: p1Active ? PAL.bch : null,
    alpha: p1A,
  });
  drawPillLeft(ctx, 150, 322, es ? '1. CONECTAR BILLETERA' : '1. CONNECT WALLET', {
    bg: PAL.bchSoft, stroke: PAL.bch, color: PAL.bch, alpha: p1A,
  });
  drawLogo(ctx, 'WIZARD', 330, 440, 108, { ringColor: PAL.bch, glowColor: PAL.bch, alpha: p1A });
  drawFitText(ctx, 'Paytaca / WizardConnect', 330, 530, 390, { size: 28, alpha: p1A });
  drawFitText(ctx, 'WalletConnect v2 • BCH Chipnet', 330, 568, 390, {
    size: 19, weight: '600', color: PAL.bch, alpha: p1A,
  });
  drawCard(ctx, 150, 620, 360, 115, {
    radius: 16, fill: 'rgba(8, 14, 30, 0.9)', stroke: PAL.borderSubtle, alpha: p1A,
  });
  drawFitText(ctx, es ? 'Cuenta Conectada' : 'Connected Account', 175, 650, 310, {
    size: 17, weight: '600', color: PAL.textMuted, align: 'left', alpha: p1A,
  });
  drawFitText(ctx, 'bchtest:qr5z...sefgn', 175, 685, 310, {
    size: 21, weight: '700', color: PAL.textMain, align: 'left', alpha: p1A,
  });
  drawFitText(ctx, 'Balance: 14.80 BCH', 175, 715, 310, {
    size: 18, weight: '600', color: PAL.bch, align: 'left', alpha: p1A,
  });
  drawWrappedText(
    ctx,
    es
      ? 'Firma local sin entregar llaves privadas ni crear cuentas.'
      : 'Local wallet signing without exposing keys or KYC.',
    150,
    775,
    360,
    30,
    { font: '500 20px "Inter", sans-serif', color: PAL.textMuted, alpha: p1A }
  );

  drawFlowLine(ctx, 550, 600, 630, 600, t, { color: PAL.bch, packets: 2, alpha: p1A });

  // Panel 2 (Center): Swap Card
  const p2Active = step === 1;
  const p2A = t >= c.swapCard - 0.5 ? 1 : 0.55;
  drawCard(ctx, 630, 240, 660, 720, {
    fill: p2Active ? PAL.cardActive : PAL.cardBg,
    stroke: p2Active ? PAL.pusd : PAL.borderSubtle,
    lineWidth: p2Active ? 3.5 : 2,
    glow: p2Active ? PAL.pusd : null,
    alpha: p2A,
  });
  drawPillLeft(ctx, 675, 302, es ? '2. EJECUTAR SWAP' : '2. EXECUTE SWAP', {
    bg: 'rgba(56, 189, 248, 0.14)', stroke: PAL.pusd, color: PAL.pusd, alpha: p2A,
  });
  drawFitText(ctx, 'Chipnet ➔ Polygon Amoy', 1125, 302, 270, {
    size: 20, weight: '700', color: PAL.pusd, align: 'center', alpha: p2A,
  });

  // Sell box
  drawCard(ctx, 675, 355, 570, 140, {
    radius: 20, fill: 'rgba(8, 15, 32, 0.94)', stroke: 'rgba(10, 193, 142, 0.35)', alpha: p2A,
  });
  drawFitText(ctx, es ? 'Envías (BCH Chipnet)' : 'You Pay (BCH Chipnet)', 705, 388, 320, {
    size: 18, weight: '600', color: PAL.textMuted, align: 'left', alpha: p2A,
  });
  drawFitText(ctx, '2.5000 BCH', 705, 444, 300, {
    size: 40, align: 'left', alpha: p2A,
  });
  drawLogo(ctx, 'BCH', 1185, 425, 68, { ringColor: PAL.bch, alpha: p2A });

  // Arrow badge
  drawPill(ctx, 960, 520, '↓', {
    bg: '#0E1C36', stroke: PAL.pusd, color: PAL.pusd, height: 42, padX: 20, alpha: p2A,
  });

  // Receive box
  drawCard(ctx, 675, 545, 570, 140, {
    radius: 20, fill: 'rgba(8, 15, 32, 0.94)', stroke: 'rgba(130, 71, 229, 0.45)', alpha: p2A,
  });
  drawFitText(ctx, es ? 'Recibes (Polygon Amoy)' : 'You Receive (Polygon Amoy)', 705, 578, 360, {
    size: 18, weight: '600', color: PAL.textMuted, align: 'left', alpha: p2A,
  });
  drawFitText(ctx, '842.50 USDT', 705, 634, 320, {
    size: 40, color: PAL.bch, align: 'left', alpha: p2A,
  });
  drawLogo(ctx, 'USDT', 1185, 615, 68, { ringColor: PAL.bch, alpha: p2A });
  drawLogo(ctx, 'POL', 1125, 615, 52, { ringColor: PAL.pol, alpha: p2A });

  // Fee line
  drawFitText(
    ctx,
    es ? 'Comisión: 0.30% (0.20% LPs + 0.10% Centinela)' : 'Protocol Fee: 0.30% (0.20% LPs + 0.10% Sentinel)',
    960,
    726,
    550,
    { size: 20, weight: '600', color: PAL.textMuted, alpha: p2A }
  );

  // Swap CTA Button
  const confirmed = step === 2;
  drawCard(ctx, 675, 775, 570, 128, {
    radius: 20,
    fill: confirmed ? 'rgba(10, 193, 142, 0.22)' : 'rgba(56, 189, 248, 0.20)',
    stroke: confirmed ? PAL.bch : PAL.pusd,
    lineWidth: 2.5,
    glow: confirmed ? PAL.bch : PAL.pusd,
    alpha: p2A,
  });
  drawFitText(
    ctx,
    confirmed
      ? (es ? '✓ Intercambiar • Liquidado en Segundos' : '✓ Swapped • Settled in Seconds')
      : (es ? 'Firmar Swap Cross-Chain ➔' : 'Sign Cross-Chain Swap ➔'),
    960,
    839,
    530,
    { size: 28, weight: '700', color: PAL.textMain, alpha: p2A }
  );

  drawFlowLine(ctx, 1290, 600, 1370, 600, t, { color: PAL.bch, packets: 3, alpha: p2A });

  // Panel 3 (Right): Destination Settlement
  const p3Active = step === 2;
  const p3A = t >= c.settle - 0.5 ? 1 : 0.55;
  drawCard(ctx, 1370, 260, 440, 680, {
    fill: p3Active ? PAL.cardActive : PAL.cardBg,
    stroke: p3Active ? PAL.bch : PAL.borderSubtle,
    lineWidth: p3Active ? 3 : 2,
    glow: p3Active ? PAL.bch : null,
    alpha: p3A,
  });
  drawPillLeft(ctx, 1410, 322, es ? '3. LIQUIDACIÓN FINAL' : '3. SETTLED OUTPUT', {
    bg: PAL.bchSoft, stroke: PAL.bch, color: PAL.bch, alpha: p3A,
  });
  drawLogo(ctx, 'USDT', 1590, 440, 108, { ringColor: PAL.bch, glowColor: PAL.bch, alpha: p3A });
  drawFitText(ctx, es ? '+842.50 USDT Recibidos' : '+842.50 USDT Credited', 1590, 534, 390, {
    size: 30, color: PAL.bch, alpha: p3A,
  });
  drawFitText(ctx, 'Polygon Amoy Testnet', 1590, 574, 390, {
    size: 20, weight: '600', color: PAL.pol, alpha: p3A,
  });
  drawCard(ctx, 1410, 622, 360, 118, {
    radius: 16, fill: 'rgba(8, 22, 32, 0.92)', stroke: PAL.bch, alpha: p3A,
  });
  drawFitText(
    ctx,
    es ? '✓ Prueba UTXO Verificada' : '✓ UTXO Covenant Proof Verified',
    1590,
    662,
    330,
    { size: 20, weight: '700', color: PAL.bch, alpha: p3A }
  );
  drawFitText(
    ctx,
    es ? '⚡ Liquidado en Segundos' : '⚡ Settled in Seconds',
    1590,
    704,
    330,
    { size: 22, weight: '700', color: PAL.textMain, alpha: p3A }
  );
  drawWrappedText(
    ctx,
    es
      ? 'Fondos nativos entregados directo a tu billetera destino sin wrapping manual.'
      : 'Native liquidity delivered straight to your destination wallet without manual bridge claims.',
    1410,
    775,
    360,
    30,
    { font: '500 20px "Inter", sans-serif', color: PAL.textMuted, alpha: p3A }
  );
}

// =========================================================================
// SCENE 6: Cost Efficiency, 0.30% Split & Speed Comparison
// =========================================================================
function renderScene6(ctx, t, lang, c) {
  drawBackground(ctx, t, PAL.bch);
  const es = lang === 'es';
  drawTopBar(ctx, 6, es ? 'COSTOS Y VELOCIDAD' : 'COST & SPEED ECONOMICS', lang);

  drawFitText(
    ctx,
    es ? 'Eficiencia Radical en Costos y Liquidación en Segundos' : 'Radical Cost Efficiency & Settlement in Seconds',
    W / 2,
    155,
    1620,
    { size: 52, alpha: prog(t, 0.1, 0.8) }
  );

  const legacyActive = t >= c.legacy && t < c.bch;
  const bchActive = t >= c.bch && t < c.feeBreakdown;
  const feeActive = t >= c.feeBreakdown;

  // Left Bar Card: Legacy Gas
  const lA = prog(t, 0.6, 0.7);
  drawCard(ctx, 130, 235, 780, 420, {
    fill: legacyActive ? 'rgba(42, 16, 26, 0.95)' : 'rgba(26, 14, 24, 0.85)',
    stroke: legacyActive ? PAL.red : 'rgba(239, 68, 68, 0.38)',
    lineWidth: legacyActive ? 3.5 : 2,
    glow: legacyActive ? 'rgba(239, 68, 68, 0.3)' : null,
    alpha: lA,
  });
  drawPillLeft(ctx, 190, 292, es ? 'PUENTES EVM TRADICIONALES' : 'LEGACY HIGH-GAS BRIDGES', {
    bg: 'rgba(239, 68, 68, 0.14)', stroke: PAL.red, color: '#FCA5A5', alpha: lA,
  });
  drawFitText(ctx, '$15 – $50+ USD', 520, 382, 680, {
    size: 68, color: '#FCA5A5', alpha: lA,
  });
  drawFitText(
    ctx,
    es ? 'en picos de gas + demoras de 10 a 30 minutos' : 'during gas spikes + 10 to 30 minute bridge delays',
    520,
    444,
    680,
    { size: 24, weight: '600', color: PAL.textMuted, alpha: lA }
  );
  // Visual tall warning bar
  ctx.save();
  ctx.globalAlpha = lA;
  roundRectPath(ctx, 190, 505, 660, 44, 12);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
  ctx.fill();
  roundRectPath(ctx, 190, 505, 610, 44, 12);
  ctx.fillStyle = PAL.red;
  ctx.fill();
  ctx.restore();
  drawFitText(
    ctx,
    es ? 'Alto costo de ejecución + pasos manuales de reclamo' : 'Expensive L1 execution + slow manual bridge claims',
    520,
    592,
    680,
    { size: 22, weight: '500', color: PAL.textMuted, alpha: lA }
  );

  // Right Bar Card: BinaryLiquid on BCH
  const bA = bchActive || feeActive ? 1 : prog(t, 1.0, 0.7);
  drawCard(ctx, 1010, 235, 780, 420, {
    fill: bchActive ? PAL.cardActive : PAL.cardBg,
    stroke: bchActive ? PAL.bch : 'rgba(10, 193, 142, 0.45)',
    lineWidth: bchActive ? 3.5 : 2,
    glow: bchActive ? PAL.bch : null,
    alpha: bA,
  });
  drawPillLeft(ctx, 1070, 292, es ? 'BINARYLIQUID SOBRE BCH' : 'BINARYLIQUID ON BCH', {
    bg: PAL.bchSoft, stroke: PAL.bch, color: PAL.bch, alpha: bA,
  });
  drawFitText(ctx, '< 800 sats (< $0.01)', 1400, 382, 680, {
    size: 62, color: PAL.bch, alpha: bA,
  });
  drawFitText(
    ctx,
    es ? 'tarifa de red Bitcoin Cash • ⚡ Liquidación en Segundos' : 'Bitcoin Cash miner fee • ⚡ Settlement in Seconds',
    1400,
    444,
    690,
    { size: 24, weight: '700', color: PAL.pusd, alpha: bA }
  );
  ctx.save();
  ctx.globalAlpha = bA;
  roundRectPath(ctx, 1070, 505, 660, 44, 12);
  ctx.fillStyle = 'rgba(10, 193, 142, 0.14)';
  ctx.fill();
  roundRectPath(ctx, 1070, 505, 56, 44, 12);
  ctx.fillStyle = PAL.bch;
  ctx.fill();
  ctx.restore();
  drawFitText(
    ctx,
    es ? 'Fracción de centavo en red BCH + enrutamiento automático' : 'Sub-cent BCH block fees + automated cross-chain dispatch',
    1400,
    592,
    690,
    { size: 22, weight: '500', color: PAL.textMuted, alpha: bA }
  );

  // Bottom Highlight Banner synced to feeBreakdown
  const fA = feeActive ? 1 : prog(t, c.feeBreakdown - 1.5, 1.0);
  drawCard(ctx, 130, 700, 1660, 260, {
    fill: feeActive ? PAL.cardActive : PAL.cardBg,
    stroke: feeActive ? PAL.pusd : PAL.borderSubtle,
    lineWidth: feeActive ? 3.5 : 2,
    glow: feeActive ? PAL.pusd : null,
    alpha: Math.max(0.55, fA),
  });
  drawFitText(
    ctx,
    es
      ? 'Comisión Transparente del Protocolo: 0.30% Total'
      : 'Transparent Protocol Fee Architecture: 0.30% Total',
    W / 2,
    756,
    1540,
    { size: 34, alpha: Math.max(0.6, fA) }
  );

  // Stacked breakdown bar
  const sx = 230;
  const sy = 805;
  const sw = 1460;
  ctx.save();
  ctx.globalAlpha = Math.max(0.65, fA);
  roundRectPath(ctx, sx, sy, sw * 0.666 - 6, 58, 14);
  ctx.fillStyle = PAL.bch;
  ctx.fill();
  roundRectPath(ctx, sx + sw * 0.666 + 6, sy, sw * 0.333 - 6, 58, 14);
  ctx.fillStyle = PAL.amber;
  ctx.fill();
  ctx.restore();

  drawFitText(
    ctx,
    es ? '0.20% ➔ Reservas del Pool (Rendimiento LPs)' : '0.20% ➔ Pool Reserves (Compounded LP Yield)',
    sx + sw * 0.333,
    sy + 29,
    880,
    { size: 24, weight: '700', color: '#04120E', alpha: Math.max(0.7, fA) }
  );
  drawFitText(
    ctx,
    es ? '0.10% ➔ Centinela & Reservas' : '0.10% ➔ Sentinel & Reserves',
    sx + sw * 0.833,
    sy + 29,
    430,
    { size: 22, weight: '700', color: '#1A1102', alpha: Math.max(0.7, fA) }
  );
  drawFitText(
    ctx,
    es
      ? 'Modelo sustentable sin tarifas ocultas ni emisión inflacionaria'
      : 'Sustainable fee model with zero hidden spreads or inflationary token emissions',
    W / 2,
    910,
    1460,
    { size: 22, weight: '500', color: PAL.textMuted, alpha: Math.max(0.6, fA) }
  );
}

// =========================================================================
// SCENE 7: Ecosystem Suite (Swap, Perps, Lending, UserLink SDK)
// =========================================================================
function renderScene7(ctx, t, lang, c) {
  drawBackground(ctx, t, PAL.purple);
  const es = lang === 'es';
  drawTopBar(ctx, 7, es ? 'ECOSISTEMA INTEGRAL' : 'MODULAR ECOSYSTEM', lang);

  const stage =
    t >= c.lending + 4.5 ? 3 :
    t >= c.lending ? 2 :
    t >= c.perps ? 1 : 0;

  drawPill(ctx, W / 2, 134, es ? 'ACTIVO EN TESTNET • 4 MÓDULOS' : 'LIVE ON TESTNET • 4 CORE MODULES', {
    bg: PAL.bchSoft, stroke: PAL.bch, color: PAL.bch,
  });
  drawFitText(
    ctx,
    es ? 'Más Allá del Puente: Suite DeFi Nativa en BCH' : 'Beyond Bridging: Complete BCH Native DeFi Suite',
    W / 2,
    200,
    1620,
    { size: 52 }
  );
  drawFitText(
    ctx,
    'BCH Chipnet • Polygon Amoy • Solana Devnet • Litecoin Testnet4',
    W / 2,
    254,
    1500,
    { size: 23, weight: '600', color: PAL.pusd }
  );

  const modules = [
    {
      badge: es ? '01. SWAP MULTI-RED' : '01. CROSS-CHAIN SWAP',
      title: es ? 'AMM Cross-Chain' : 'Cross-Chain AMM',
      logo: 'BCH',
      color: PAL.bch,
      stat: es ? 'Chipnet / Amoy / Solana / LTC' : 'Chipnet / Amoy / Solana / LTC',
      desc: es
        ? 'Intercambios nativos entre UTXO, EVM y Solana respaldados por bóvedas P2SH-32 y comisiones 0.30%.'
        : 'Native swaps across UTXO, EVM, and Solana networks backed by P2SH-32 vaults and transparent 0.30% fees.',
    },
    {
      badge: es ? '02. PERPETUOS' : '02. PERPETUALS',
      title: es ? 'Trading de Perpetuos' : 'Decentralized Perps',
      logo: 'PUSD',
      color: PAL.pusd,
      stat: es ? 'Colateral BCH & ParyonUSD' : 'BCH & ParyonUSD Collateral',
      desc: es
        ? 'Posiciones largas y cortas apalancadas en Testnet usando colateral nativo de Bitcoin Cash y ParyonUSD.'
        : 'Long & short leveraged positions on Testnet powered by native Bitcoin Cash and ParyonUSD collateral.',
    },
    {
      badge: es ? '03. PRÉSTAMOS P2SH-32' : '03. P2SH-32 LENDING',
      title: es ? 'Préstamos P2SH-32' : 'P2SH-32 Lending',
      logo: 'USDT',
      color: PAL.purple,
      stat: es ? 'Bóvedas de Colateral Covenant' : 'Covenant Collateral Vaults',
      desc: es
        ? 'Mercados de préstamo y colateral programados en CashScript P2SH-32 sin intermediarios custodiales.'
        : 'Over-collateralized borrowing & supply markets enforced directly inside CashScript P2SH-32 covenants.',
    },
    {
      badge: es ? '04. IDENTIDAD & SDK' : '04. IDENTITY & SDK',
      title: 'UserLink @alias.bch',
      logo: 'LOGO',
      color: PAL.sol,
      stat: 'NIP-01 Kind 30078 • BIP-21',
      desc: es
        ? 'Identidad descentralizada en Nostr, cobros en 1 clic con Paytaca y SDK abierto para aplicaciones Web3.'
        : 'Decentralized @alias.bch identity on Nostr, 1-click Paytaca BIP-21 payments & developer UserLink SDK.',
    },
  ];

  for (let i = 0; i < modules.length; i++) {
    const m = modules[i];
    const x = 100 + i * 440;
    const y = 310;
    const w = 400;
    const h = 620;
    const active = i === stage;

    drawCard(ctx, x, y, w, h, {
      fill: active ? PAL.cardActive : PAL.cardBg,
      stroke: active ? m.color : PAL.borderSubtle,
      lineWidth: active ? 3.5 : 2,
      glow: active ? m.color : null,
      glowBlur: 32,
      alpha: i <= stage + 1 ? 1 : 0.72,
    });

    drawPill(ctx, x + w / 2, y + 54, m.badge, {
      bg: 'rgba(255,255,255,0.06)',
      stroke: m.color,
      color: m.color,
      font: '700 16px "Space Grotesk", sans-serif',
      height: 36,
      padX: 18,
    });

    drawLogo(ctx, m.logo, x + w / 2, y + 165, 108, {
      ringColor: m.color,
      glowColor: active ? m.color : null,
    });

    drawFitText(ctx, m.title, x + w / 2, y + 266, 350, { size: 31 });
    drawFitText(ctx, m.stat, x + w / 2, y + 312, 350, {
      size: 19, weight: '700', color: m.color,
    });

    drawWrappedText(ctx, m.desc, x + 32, y + 365, w - 64, 34, {
      font: '500 21px "Inter", sans-serif',
      color: active ? PAL.textMain : PAL.textMuted,
    });

    drawPill(
      ctx,
      x + w / 2,
      y + h - 46,
      active ? (es ? '● ACTIVO EN TESTNET' : '● LIVE ON TESTNET') : (es ? 'MÓDULO INTEGRADO' : 'INTEGRATED MODULE'),
      {
        bg: active ? 'rgba(10, 193, 142, 0.16)' : 'rgba(148,163,184,0.08)',
        stroke: active ? m.color : 'rgba(148,163,184,0.28)',
        color: active ? m.color : PAL.textMuted,
        font: '700 15px "Space Grotesk", sans-serif',
        height: 34,
      }
    );
  }
}

// =========================================================================
// SCENE 8: Hackathon Alignment, Testnet/Mainnet Vision & bliquid.xyz
// =========================================================================
function renderScene8(ctx, t, lang, c) {
  drawBackground(ctx, t, PAL.bch);
  const es = lang === 'es';
  drawTopBar(ctx, 8, 'BCH BLAZE HACKATHON 2026', lang);

  const trackActive = t >= c.tracks && t < c.url;
  const urlActive = t >= c.url;
  const closingGlow = t >= c.closing;

  const hA = prog(t, 0.1, 0.8);
  drawLogo(ctx, 'LOGO', W / 2, 134, 88, { ringColor: PAL.bch, glowColor: PAL.bch, alpha: hA });
  drawFitText(
    ctx,
    es ? 'BinaryLiquid — Activo en Testnet • Visión Mainnet' : 'BinaryLiquid — Live on Testnet • Architected for Mainnet',
    W / 2,
    220,
    1620,
    { size: 50, alpha: hA }
  );
  drawFitText(
    ctx,
    es
      ? '$750 PUSD Stablecoin Track (ParyonUSD)  •  $500 PUSD Identity Track (Paytaca)'
      : '$750 PUSD Stablecoin Track (ParyonUSD)  •  $500 PUSD Identity Track (Paytaca)',
    W / 2,
    274,
    1580,
    { size: 26, weight: '700', color: PAL.pusd, alpha: prog(t, 0.4, 0.8) }
  );

  // Track 1 Card: $750 PUSD ParyonUSD Stablecoin Track
  const trA = trackActive || urlActive ? 1 : prog(t, 1.2, 0.8);
  drawCard(ctx, 130, 330, 780, 355, {
    fill: trackActive ? PAL.cardActive : PAL.cardBg,
    stroke: trackActive ? PAL.pusd : PAL.borderSubtle,
    lineWidth: trackActive ? 3.5 : 2,
    glow: trackActive ? PAL.pusd : null,
    glowBlur: 34,
    alpha: trA,
  });
  drawPillLeft(ctx, 175, 392, '$750 PUSD • STABLECOIN TRACK', {
    bg: 'rgba(56, 189, 248, 0.14)', stroke: PAL.pusd, color: PAL.pusd, alpha: trA,
  });
  drawLogo(ctx, 'PUSD', 835, 405, 84, { ringColor: PAL.pusd, glowColor: PAL.pusd, alpha: trA });
  drawFitText(
    ctx,
    es ? 'Integración Stablecoin ParyonUSD' : 'ParyonUSD Stablecoin Integration',
    175,
    466,
    680,
    { size: 34, align: 'left', alpha: trA }
  );
  drawWrappedText(
    ctx,
    es
      ? 'Liquidez nativa en CashTokens PUSD, pares de intercambio cross-chain y colateral para perpetuos y préstamos P2SH-32 en Bitcoin Cash.'
      : 'Native CashToken PUSD liquidity pools, cross-chain stablecoin routing, and unified collateral for BCH Perps & Lending.',
    175,
    514,
    680,
    34,
    { font: '500 22px "Inter", sans-serif', color: PAL.textMuted, alpha: trA }
  );

  // Track 2 Card: $500 PUSD Paytaca Decentralized Identity Track
  drawCard(ctx, 1010, 330, 780, 355, {
    fill: trackActive ? PAL.cardActive : PAL.cardBg,
    stroke: trackActive ? PAL.bch : PAL.borderSubtle,
    lineWidth: trackActive ? 3.5 : 2,
    glow: trackActive ? PAL.bch : null,
    glowBlur: 34,
    alpha: trA,
  });
  drawPillLeft(ctx, 1055, 392, '$500 PUSD • IDENTITY TRACK', {
    bg: PAL.bchSoft, stroke: PAL.bch, color: PAL.bch, alpha: trA,
  });
  drawLogo(ctx, 'WIZARD', 1715, 405, 84, { ringColor: PAL.bch, glowColor: PAL.bch, alpha: trA });
  drawFitText(
    ctx,
    es ? 'Track Identidad Paytaca UserLink' : 'Paytaca UserLink Identity Track',
    1055,
    466,
    680,
    { size: 34, align: 'left', alpha: trA }
  );
  drawWrappedText(
    ctx,
    es
      ? 'Alias @usuario.bch sobre Nostr NIP-01 Kind 30078 y NIP-05, pagos en 1 clic vía BIP-21 y autenticación sin contraseña con UserLink SDK.'
      : '@user.bch decentralized handles via Nostr NIP-01 Kind 30078 & NIP-05, 1-click Paytaca BIP-21 payments & UserLink SDK.',
    1055,
    514,
    680,
    34,
    { font: '500 22px "Inter", sans-serif', color: PAL.textMuted, alpha: trA }
  );

  // Live URL Box synced to c.url & c.closing
  const urlA = urlActive ? 1 : 0.72;
  drawCard(ctx, 260, 735, 1400, 235, {
    fill: urlActive ? 'rgba(12, 26, 52, 0.98)' : PAL.cardBg,
    stroke: urlActive ? PAL.bch : PAL.borderSubtle,
    lineWidth: closingGlow ? 4 : urlActive ? 3.5 : 2,
    glow: urlActive ? PAL.bch : null,
    glowBlur: closingGlow ? 48 : 30,
    alpha: urlA,
  });
  drawFitText(
    ctx,
    es ? 'PRUÉBALO EN VIVO EN TESTNET HOY MISMO' : 'TRY THE LIVE TESTNET DEPLOYMENT TODAY',
    W / 2,
    784,
    1300,
    { size: 22, weight: '700', color: PAL.bch, alpha: urlA }
  );
  drawFitText(ctx, 'https://bliquid.xyz', W / 2, 848, 1200, {
    size: 62, color: PAL.textMain, alpha: urlA,
  });
  drawFitText(
    ctx,
    es
      ? 'BCH Chipnet • Polygon Amoy • Solana Devnet • Litecoin Testnet4  |  Listo para Mainnet'
      : 'BCH Chipnet • Polygon Amoy • Solana Devnet • Litecoin Testnet4  |  Architected for Mainnet',
    W / 2,
    920,
    1320,
    { size: 22, weight: '600', color: PAL.pusd, alpha: urlA }
  );
}

const RENDERERS = [
  renderScene1,
  renderScene2,
  renderScene3,
  renderScene4,
  renderScene5,
  renderScene6,
  renderScene7,
  renderScene8,
];

// =========================================================================
// Core Engine, UI Controls & Deterministic Frame API
// =========================================================================
function getSceneDuration(idx = currentSceneIdx, lang = currentLang) {
  const s = SCENES[idx] || SCENES[0];
  return lang === 'es' ? s.durationEs : s.durationEn;
}

function getSceneTitle(idx = currentSceneIdx, lang = currentLang) {
  const s = SCENES[idx] || SCENES[0];
  return lang === 'es' ? s.titleEs : s.titleEn;
}

function formatClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function renderFrame(tTime, sceneIdx = currentSceneIdx, lang = currentLang) {
  const canvas = document.getElementById('stage');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const langCues = CUES[lang] || CUES.en;
  const cueKey = `s${sceneIdx + 1}`;
  const renderer = RENDERERS[sceneIdx] || RENDERERS[0];
  ctx.clearRect(0, 0, W, H);
  renderer(ctx, tTime, lang, langCues[cueKey]);
}

function updateHUD() {
  const dur = getSceneDuration();
  const titleEl = document.getElementById('video-title');
  const timeEl = document.getElementById('time-display');
  const barEl = document.getElementById('progress-bar');
  const playEl = document.getElementById('btn-play');
  const enBtn = document.getElementById('btn-lang-en');
  const esBtn = document.getElementById('btn-lang-es');

  if (titleEl) titleEl.textContent = getSceneTitle();
  if (timeEl) timeEl.textContent = `${formatClock(currentTime)} / ${formatClock(dur)}`;
  if (barEl) barEl.style.width = `${clamp(currentTime / dur) * 100}%`;
  if (playEl) playEl.textContent = isPlaying ? '⏸' : '▶';
  if (enBtn) enBtn.classList.toggle('active', currentLang === 'en');
  if (esBtn) esBtn.classList.toggle('active', currentLang === 'es');

  const pills = document.querySelectorAll('#scene-pills .scene-pill');
  pills.forEach((p, idx) => {
    p.classList.toggle('active', idx === currentSceneIdx);
  });
}

function loadSceneAudio(idx = currentSceneIdx, lang = currentLang) {
  const s = SCENES[idx] || SCENES[0];
  const src = lang === 'es' ? s.audioEs : s.audioEn;
  voiceAudio.pause();
  voiceAudio.src = src;
  voiceAudio.load();
}

function stopPlayback({ keepTime = true } = {}) {
  isPlaying = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  voiceAudio.pause();
  bgmAudio.pause();
  if (!keepTime) currentTime = 0;
  updateHUD();
}

function loop(now) {
  if (!isPlaying || isRecording) return;
  const dur = getSceneDuration();

  if (!lastFrameWallTime) lastFrameWallTime = now;
  const dt = Math.min(0.1, (now - lastFrameWallTime) / 1000);
  lastFrameWallTime = now;

  // Prefer live audio currentTime when playing cleanly to eliminate drift
  if (!voiceAudio.paused && !voiceAudio.ended && voiceAudio.readyState >= 2) {
    currentTime = voiceAudio.currentTime;
  } else {
    currentTime += dt;
  }

  if (currentTime >= dur || voiceAudio.ended) {
    if (currentSceneIdx < SCENES.length - 1) {
      selectScene(currentSceneIdx + 1, { autoPlay: true });
      return;
    } else {
      currentTime = dur;
      renderFrame(currentTime);
      stopPlayback({ keepTime: true });
      return;
    }
  }

  renderFrame(currentTime);
  updateHUD();
  rafId = requestAnimationFrame(loop);
}

function startPlayback() {
  if (isRecording) return;
  isPlaying = true;
  lastFrameWallTime = performance.now();
  const dur = getSceneDuration();
  if (currentTime >= dur - 0.05) {
    currentTime = 0;
  }
  voiceAudio.currentTime = currentTime;
  voiceAudio.play().catch(() => {});
  bgmAudio.play().catch(() => {});
  updateHUD();
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

function togglePlay() {
  if (isPlaying) {
    stopPlayback({ keepTime: true });
  } else {
    startPlayback();
  }
}

function selectScene(idx, { autoPlay = isPlaying } = {}) {
  const safeIdx = Math.max(0, Math.min(SCENES.length - 1, idx));
  const wasPlaying = autoPlay;
  stopPlayback({ keepTime: false });
  currentSceneIdx = safeIdx;
  currentTime = 0;
  loadSceneAudio(safeIdx, currentLang);
  renderFrame(0);
  updateHUD();
  if (wasPlaying) {
    startPlayback();
  }
}

function setLanguage(lang) {
  const target = lang === 'es' ? 'es' : 'en';
  if (target === currentLang && voiceAudio.src) {
    updateHUD();
    renderFrame(currentTime);
    return;
  }
  const wasPlaying = isPlaying;
  stopPlayback({ keepTime: false });
  currentLang = target;
  currentTime = 0;
  loadSceneAudio(currentSceneIdx, currentLang);
  renderFrame(0);
  updateHUD();
  if (wasPlaying) {
    startPlayback();
  }
}

function seekToFraction(frac) {
  const dur = getSceneDuration();
  currentTime = clamp(frac) * dur;
  if (!isRecording && voiceAudio.readyState >= 1) {
    voiceAudio.currentTime = currentTime;
  }
  renderFrame(currentTime);
  updateHUD();
}

function buildScenePills() {
  const container = document.getElementById('scene-pills');
  if (!container) return;
  container.innerHTML = '';
  SCENES.forEach((sc, idx) => {
    const btn = document.createElement('button');
    btn.className = 'scene-pill';
    btn.textContent = `Scene ${sc.id}`;
    btn.title = getSceneTitle(idx, currentLang);
    btn.addEventListener('click', () => selectScene(idx));
    container.appendChild(btn);
  });
}

function initUI() {
  buildScenePills();
  loadSceneAudio(0, currentLang);
  renderFrame(0);
  updateHUD();

  const btnPlay = document.getElementById('btn-play');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnEn = document.getElementById('btn-lang-en');
  const btnEs = document.getElementById('btn-lang-es');
  const btnFs = document.getElementById('btn-fullscreen');
  const progBar = document.getElementById('progress-bar-container');
  const stageContainer = document.getElementById('stage-container');

  if (btnPlay) btnPlay.addEventListener('click', togglePlay);
  if (btnPrev) btnPrev.addEventListener('click', () => selectScene(currentSceneIdx - 1));
  if (btnNext) btnNext.addEventListener('click', () => selectScene(currentSceneIdx + 1));
  if (btnEn) btnEn.addEventListener('click', () => setLanguage('en'));
  if (btnEs) btnEs.addEventListener('click', () => setLanguage('es'));
  if (btnFs && stageContainer) {
    btnFs.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        stageContainer.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    });
  }
  if (progBar) {
    progBar.addEventListener('click', (e) => {
      const rect = progBar.getBoundingClientRect();
      if (rect.width > 0) {
        seekToFraction((e.clientX - rect.left) / rect.width);
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    } else if (e.code === 'ArrowRight') {
      selectScene(currentSceneIdx + 1);
    } else if (e.code === 'ArrowLeft') {
      selectScene(currentSceneIdx - 1);
    }
  });

  // Ensure initial logos render sharply once loaded
  imageReadyPromises.forEach((p) =>
    p.then(() => {
      if (!isPlaying) renderFrame(currentTime);
    })
  );
}

// =========================================================================
// Headless / Offline Rendering Hooks
// =========================================================================
window.SCENES = SCENES;
window.CUES = CUES;
window.setLanguage = setLanguage;

window.prepareRecording = async function prepareRecording(sceneIndex, lang = 'en') {
  isRecording = true;
  stopPlayback({ keepTime: false });
  currentLang = lang === 'es' ? 'es' : 'en';
  currentSceneIdx = Math.max(0, Math.min(SCENES.length - 1, Number(sceneIndex) || 0));
  currentTime = 0;
  await Promise.all(imageReadyPromises);
  renderFrame(0, currentSceneIdx, currentLang);
  updateHUD();
  return {
    sceneIndex: currentSceneIdx,
    lang: currentLang,
    duration: getSceneDuration(currentSceneIdx, currentLang),
    title: getSceneTitle(currentSceneIdx, currentLang),
  };
};

window.renderAtTime = function renderAtTime(tTime) {
  currentTime = Math.max(0, Number(tTime) || 0);
  renderFrame(currentTime, currentSceneIdx, currentLang);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUI);
} else {
  initUI();
}
