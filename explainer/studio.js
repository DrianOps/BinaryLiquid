/**
 * BinaryLiquid Animated Explainer Studio
 * 1080p High-Fidelity Vector Motion Graphics Renderer
 * Bilingual Engine: 🇪🇸 Español (es-MX-JorgeNeural) + 🇺🇸 English (en-US-ChristopherNeural)
 */

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const W = 1920;
const H = 1080;

let currentLang = 'en'; // default English

// Preload Official Protocol & Token Logos
const TOKEN_IMAGES = {};
const LOGO_PATHS = {
    'P': '/PUSD.png',
    'PUSD': '/PUSD.png',
    '₮': '/USDT.png',
    'USDT': '/USDT.png',
    'BCH': '/BCH.png',
    'bch': '/BCH.png',
    'Ξ': '/ETH.png',
    'ETH': '/ETH.png',
    'POL': '/POL.png',
    'WIZARD': '/wizardconnect-logo.png',
    'LOGO': '/logo.png'
};

Object.entries(LOGO_PATHS).forEach(([key, src]) => {
    const img = new Image();
    img.src = src;
    TOKEN_IMAGES[key] = img;
});

// Color Palette
const COLORS = {
    bg: '#080B11',
    cardBg: 'rgba(15, 23, 42, 0.75)',
    cardBorder: 'rgba(255, 255, 255, 0.1)',
    textMain: '#FFFFFF',
    textMuted: '#94A3B8',
    bchGreen: '#10B981',
    bchDarkGreen: '#047857',
    btcOrange: '#F7931A',
    pusdGold: '#F59E0B',
    usdtTeal: '#26A17B',
    dangerRed: '#EF4444',
    polygonPurple: '#8247E5',
    cyan: '#06B6D4'
};

// Scene Configurations & Durations
const SCENES = [
    {
        id: 1,
        titleEs: "La Crisis de Puentes y el Aislamiento de BCH",
        titleEn: "The Bridge Trap & Isolated Island",
        durationEs: 51.70,
        durationEn: 46.63,
        audioEs: "/audio/scene1_es.mp3",
        audioEn: "/audio/scene1.mp3"
    },
    {
        id: 2,
        titleEs: "CashTokens, Covenants y Creación Libre de Pools",
        titleEn: "CashTokens, Covenants & Permissionless Pools",
        durationEs: 93.86,
        durationEn: 77.52,
        audioEs: "/audio/scene2_es.mp3",
        audioEn: "/audio/scene2.mp3"
    },
    {
        id: 3,
        titleEs: "Proveedores de Liquidez y Comisión del 0.20%",
        titleEn: "Liquidity Providers & The 0.20% Yield Engine",
        durationEs: 32.93,
        durationEn: 36.91,
        audioEs: "/audio/scene3_es.mp3",
        audioEn: "/audio/scene3.mp3"
    },
    {
        id: 4,
        titleEs: "ParyonUSD (PUSD): Stablecoin Nativa",
        titleEn: "ParyonUSD (PUSD) Native Stablecoin",
        durationEs: 34.06,
        durationEn: 35.85,
        audioEs: "/audio/scene4_es.mp3",
        audioEn: "/audio/scene4.mp3"
    },
    {
        id: 5,
        titleEs: "WizardConnect en 1 Clic y 3s de Liquidación",
        titleEn: "WizardConnect in 1-Click & 3s Settlement",
        durationEs: 38.81,
        durationEn: 25.51,
        audioEs: "/audio/scene5_es.mp3",
        audioEn: "/audio/scene5.mp3"
    },
    {
        id: 6,
        titleEs: "Comisiones Microscópicas vs Monstruos de Gas",
        titleEn: "Sub-Cent Fees vs Gas Monsters",
        durationEs: 27.89,
        durationEn: 25.75,
        audioEs: "/audio/scene6_es.mp3",
        audioEn: "/audio/scene6.mp3"
    },
    {
        id: 7,
        titleEs: "Suite DeFi Completa (Futuros Perpetuos y Préstamos)",
        titleEn: "The Full DeFi Suite (Perps & Lending)",
        durationEs: 22.94,
        durationEn: 24.05,
        audioEs: "/audio/scene7_es.mp3",
        audioEn: "/audio/scene7.mp3"
    },
    {
        id: 8,
        titleEs: "Hackathon BCH BLAZE y Enlaces Oficiales",
        titleEn: "BCH BLAZE Hackathon & Official Links",
        durationEs: 22.90,
        durationEn: 31.87,
        audioEs: "/audio/scene8_es.mp3",
        audioEn: "/audio/scene8.mp3"
    }
];

let currentSceneIndex = 0;
let sceneTime = 0;
let isPlaying = false;
let currentAudio = null;
let animationFrameId = null;
let lastTimestamp = 0;

function t(es, en) {
    return currentLang === 'es' ? es : en;
}

// ==============================================================================
// DRAWING PRIMITIVES & VECTOR ILLUSTRATIONS
// ==============================================================================

function drawBackground(tTime) {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle moving perspective grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSpacing = 60;
    const offset = (tTime * 20) % gridSpacing;
    for (let x = 0; x <= W; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }
    for (let y = offset; y <= H; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }

    // Top Navigation Bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.fillRect(0, 0, W, 80);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, 80);
    ctx.lineTo(W, 80);
    ctx.stroke();

    // Protocol Logo & Brand
    const logoImg = TOKEN_IMAGES['LOGO'];
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
        ctx.drawImage(logoImg, 65, 20, 42, 42);
    } else {
        ctx.beginPath();
        ctx.arc(80, 40, 18, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.btcOrange;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(88, 40, 18, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.bchGreen;
        ctx.fill();
    }

    ctx.fillStyle = COLORS.textMain;
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('BinaryLiquid', 120, 48);
    const logoW = ctx.measureText('BinaryLiquid').width;

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 16px -apple-system, sans-serif';
    ctx.fillText(t('•  Protocolo Entre Cadenas Sin Custodia para Bitcoin Cash', '•  Zero-Custody Cross-Chain Protocol for Bitcoin Cash'), 120 + logoW + 20, 47);

    // Track Badges (Top Right)
    drawPill(1460, 24, 180, 32, 'BCH BLAZE 2026', COLORS.btcOrange);
    drawPill(1660, 24, 200, 32, t('PISTAS DORAHACKS', 'DORAHACKS TRACKS'), COLORS.bchGreen);
}

function drawPill(x, y, w, h, text, color) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = 'bold 12px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
    ctx.restore();
}

function drawCoin(x, y, radius, symbol, bgColor, glowColor, tTime = 0) {
    ctx.save();
    const floatY = y + Math.sin(tTime * 3) * 6;

    // 1. 3D Outer Bevel & Neon Glow
    ctx.shadowColor = glowColor || bgColor;
    ctx.shadowBlur = 28;

    const rimGrad = ctx.createRadialGradient(
        x - radius * 0.35, floatY - radius * 0.35, radius * 0.15,
        x, floatY, radius
    );
    rimGrad.addColorStop(0, '#FFFFFF');
    rimGrad.addColorStop(0.35, bgColor);
    rimGrad.addColorStop(1, '#020617');

    ctx.beginPath();
    ctx.arc(x, floatY, radius, 0, Math.PI * 2);
    ctx.fillStyle = rimGrad;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Polished rim highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = Math.max(2, radius * 0.06);
    ctx.stroke();

    // 2. Inner Coin Body
    const innerRadius = radius * 0.84;
    ctx.beginPath();
    ctx.arc(x, floatY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#080B11';
    ctx.fill();

    // 3. Draw Real Official Logo Image if available
    const img = TOKEN_IMAGES[symbol];
    if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, floatY, innerRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x - innerRadius, floatY - innerRadius, innerRadius * 2, innerRadius * 2);
        ctx.restore();
    } else {
        // Fallback Symbol
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${radius * 0.9}px -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, x, floatY + 2);
    }

    // 4. Glass Sheen / Specular Light Reflection
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, floatY, innerRadius, 0, Math.PI * 2);
    ctx.clip();

    const sheenGrad = ctx.createLinearGradient(
        x - radius, floatY - radius,
        x + radius, floatY + radius
    );
    sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    sheenGrad.addColorStop(0.25, 'rgba(255, 255, 255, 0.12)');
    sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.ellipse(
        x - radius * 0.15, floatY - radius * 0.25,
        innerRadius * 0.9, innerRadius * 0.45,
        -Math.PI / 4, 0, Math.PI * 2
    );
    ctx.fillStyle = sheenGrad;
    ctx.fill();
    ctx.restore();

    ctx.restore();
}

function drawTokenBadge(x, y, w, h, symbol, text, color, tTime = 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.fill();
    ctx.stroke();

    const coinR = (h - 12) / 2;
    drawCoin(x + coinR + 8, y + h / 2, coinR, symbol, color, color, tTime);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + coinR * 2 + 18, y + h / 2 + 1);
    ctx.restore();
}

function drawHacker(x, y, scale, tTime) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Hoodie & Body
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.moveTo(-40, 90);
    ctx.lineTo(40, 90);
    ctx.lineTo(30, 20);
    ctx.lineTo(-30, 20);
    ctx.closePath();
    ctx.fill();

    // Hood
    ctx.beginPath();
    ctx.arc(0, 0, 45, 0, Math.PI * 2);
    ctx.fillStyle = '#0F172A';
    ctx.fill();

    // Face shadow
    ctx.beginPath();
    ctx.arc(0, 5, 32, 0, Math.PI * 2);
    ctx.fillStyle = '#020617';
    ctx.fill();

    // Glowing hacker visor / eyes
    const blink = Math.sin(tTime * 8) > 0.95 ? 1 : 0;
    if (!blink) {
        ctx.fillStyle = COLORS.dangerRed;
        ctx.shadowColor = COLORS.dangerRed;
        ctx.shadowBlur = 15;
        ctx.fillRect(-18, 0, 36, 6);
    }

    // Crowbar in hand
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(35, 45);
    ctx.lineTo(65, 15);
    ctx.arc(65, 5, 10, Math.PI * 0.5, Math.PI * 1.5, true);
    ctx.stroke();

    // Money sack with $
    ctx.fillStyle = '#B45309';
    ctx.beginPath();
    ctx.arc(-45, 55, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FEF08A';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', -45, 57);

    ctx.restore();
}

function drawVault(x, y, w, h, fillPercent, color, label, tTime = 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 16);
    ctx.fill();
    ctx.stroke();

    // Glowing liquid inside
    const fillH = (h - 20) * fillPercent;
    const wave = Math.sin(tTime * 4) * 6;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.roundRect(x + 10, y + h - 10 - fillH + wave, w - 20, fillH - wave, [0, 0, 10, 10]);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Bubbles
    for (let i = 0; i < 4; i++) {
        const bx = x + 30 + ((i * 45 + tTime * 30) % (w - 60));
        const by = y + h - 20 - ((tTime * 40 + i * 50) % (fillH || 10));
        ctx.beginPath();
        ctx.arc(bx, by, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 0.5;
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Label on front
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + 45);

    ctx.restore();
}

function drawIsland(x, y, r, tTime) {
    ctx.save();
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x, y + 20, r + 20 + i * 25 + Math.sin(tTime * 3 + i) * 6, Math.PI * 0.1, Math.PI * 0.9);
        ctx.strokeStyle = `rgba(6, 182, 212, ${0.4 - i * 0.1})`;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#D97706';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(x, y - 15, r * 0.85, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#059669';
    ctx.fill();

    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x - 30, y - 15);
    ctx.quadraticCurveTo(x - 40, y - 80, x - 20, y - 130);
    ctx.stroke();

    ctx.fillStyle = '#10B981';
    for (let a = -0.8; a <= 0.8; a += 0.4) {
        ctx.beginPath();
        ctx.ellipse(x - 20 + Math.sin(a) * 40, y - 130 + Math.cos(a) * 20, 45, 12, a + Math.sin(tTime * 2) * 0.1, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 40, y - 20);
    ctx.lineTo(x + 40, y - 110);
    ctx.stroke();

    const waveFlag = Math.sin(tTime * 5) * 8;
    ctx.fillStyle = COLORS.bchGreen;
    ctx.beginPath();
    ctx.moveTo(x + 40, y - 110);
    ctx.quadraticCurveTo(x + 75, y - 110 + waveFlag, x + 110, y - 100);
    ctx.lineTo(x + 110, y - 65);
    ctx.quadraticCurveTo(x + 75, y - 75 + waveFlag, x + 40, y - 75);
    ctx.closePath();
    ctx.fill();

    const bchFlagImg = TOKEN_IMAGES['BCH'];
    if (bchFlagImg && bchFlagImg.complete && bchFlagImg.naturalWidth > 0) {
        ctx.drawImage(bchFlagImg, x + 60, y - 100 + waveFlag * 0.5, 32, 32);
    } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 15px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BCH', x + 75, y - 85);
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px -apple-system, sans-serif';
    ctx.fillText(t('ISLA BITCOIN CASH', 'BITCOIN CASH ISLAND'), x, y + 80);
    ctx.fillStyle = COLORS.dangerRed;
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.fillText(t('⚠️ AISLADA DE LA LIQUIDEZ EXTERNA', '⚠️ ISOLATED FROM EVM LIQUIDITY'), x, y + 108);

    ctx.restore();
}

function drawSubtitleCard(title, body, badgeText, badgeColor = COLORS.bchGreen) {
    ctx.save();
    const boxW = 1200;
    const boxH = 140;
    const boxX = (W - boxW) / 2;
    const boxY = H - 180;

    ctx.fillStyle = 'rgba(8, 11, 17, 0.92)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 16);
    ctx.fill();
    ctx.stroke();

    drawPill(boxX + 30, boxY + 20, 240, 28, badgeText, badgeColor);

    ctx.fillStyle = COLORS.textMain;
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, boxX + 290, boxY + 40);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 18px -apple-system, sans-serif';
    ctx.fillText(body, boxX + 30, boxY + 95);

    ctx.restore();
}

// ==============================================================================
// SCENE RENDERERS (BILINGUAL)
// ==============================================================================

function renderScene1(tTime) {
    drawBackground(tTime);

    if (tTime < 22) {
        ctx.fillStyle = COLORS.dangerRed;
        ctx.font = 'bold 44px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t('La Crisis de $3,000,000,000 en Puentes Cripto', 'The $3,000,000,000 Cross-Chain Bridge Crisis'), W / 2, 170);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '500 22px -apple-system, sans-serif';
        ctx.fillText(t('Custodios centralizados y hot wallets drenadas en minutos.', 'Centralized custodians and vulnerable hot wallets drained in minutes.'), W / 2, 215);

        drawVault(W / 2 - 200, 280, 400, 280, 0.2, COLORS.dangerRed, t('PUENTE CON HOT WALLET', 'HOT WALLET BRIDGE'), tTime);
        drawHacker(W / 2 + 350, 400, 1.4, tTime);

        for (let i = 0; i < 8; i++) {
            const progress = (tTime * 2 + i * 0.3) % 1;
            const cx = (W / 2) + progress * 400;
            const cy = 400 - Math.sin(progress * Math.PI) * 120;
            drawCoin(cx, cy, 18, '$', COLORS.dangerRed, COLORS.dangerRed, tTime);
        }

        const hacks = [
            { name: "Ronin Bridge", lost: "-$624M", desc: t("Llaves privadas vulneradas", "Compromised Keys") },
            { name: "Multichain", lost: "-$126M", desc: t("Custodia unilateral congelada", "CEO Custody Freeze") },
            { name: "Wormhole", lost: "-$510M", desc: t("Fallo en contrato sintético", "Contract Exploit") }
        ];
        hacks.forEach((h, i) => {
            const x = 200 + i * 520;
            ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
            ctx.strokeStyle = COLORS.dangerRed;
            ctx.beginPath();
            ctx.roundRect(x, 600, 480, 80, 12);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 22px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(h.name, x + 24, 645);
            ctx.fillStyle = COLORS.dangerRed;
            ctx.fillText(h.lost, x + 360, 645);
        });

        drawSubtitleCard(
            t("La Custodia Centralizada es una Trampa", "Centralized Custody is a Honeypot"),
            t("Cuando un puente controla las llaves privadas en servidores, es un blanco garantizado de hackeo.", "When bridges control private keys on servers, they are guaranteed targets for catastrophic exploits."),
            t("3 MIL MILLONES ROBADOS", "3 BILLION DRAINED"),
            COLORS.dangerRed
        );
    } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 44px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t('Rompiendo el Aislamiento de Bitcoin Cash', 'Breaking Bitcoin Cash Out of Its Island'), W / 2, 170);

        drawIsland(450, 480, 190, tTime);
        drawCoin(360, 420, 36, 'BCH', COLORS.bchGreen, COLORS.bchGreen, tTime);
        drawCoin(520, 410, 32, 'PUSD', COLORS.pusdGold, COLORS.pusdGold, tTime + 0.5);

        ctx.save();
        ctx.fillStyle = 'rgba(130, 71, 229, 0.15)';
        ctx.strokeStyle = COLORS.polygonPurple;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(1300, 320, 420, 280, 20);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t('CONTINENTE DE LIQUIDEZ EVM', 'EVM LIQUIDITY CONTINENT'), 1510, 380);
        ctx.fillStyle = COLORS.usdtTeal;
        ctx.font = 'bold 22px -apple-system, sans-serif';
        ctx.fillText('$100+ Billion USDT / USDC', 1510, 420);

        drawCoin(1380, 500, 34, 'USDT', COLORS.usdtTeal, COLORS.usdtTeal, tTime);
        drawCoin(1495, 500, 34, 'POL', COLORS.polygonPurple, COLORS.polygonPurple, tTime + 0.5);
        drawCoin(1610, 500, 34, 'ETH', COLORS.cyan, COLORS.cyan, tTime + 1);
        ctx.restore();

        ctx.save();
        ctx.shadowColor = COLORS.bchGreen;
        ctx.shadowBlur = 30;
        ctx.strokeStyle = COLORS.bchGreen;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(650, 480);
        ctx.lineTo(1300, 480);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        const beamX = 650 + ((tTime * 200) % 650);
        ctx.arc(beamX, 480, 14, 0, Math.PI * 2);
        ctx.fill();

        drawPill(W / 2 - 140, 450, 280, 60, '⚡ BINARYLIQUID', COLORS.bchGreen);
        ctx.restore();

        drawSubtitleCard(
            t("Conectando BCH a la Liquidez Global de Stablecoins", "Connecting BCH to Global Stablecoin Liquidity"),
            t("BinaryLiquid establece el primer corredor entre pares sin intermediarios ni custodios centralizados.", "BinaryLiquid establishes the first trustless, peer-to-contract liquidity corridor without centralized custodians."),
            t("PUENTE CERO CUSTODIA", "ZERO-CUSTODY BRIDGE"),
            COLORS.bchGreen
        );
    }
}

function renderScene2(tTime) {
    drawBackground(tTime);

    // Split point: Phase 1 (Original AMM) vs Phase 2 (New Permissionless Pool Creation)
    const splitTime = currentLang === 'es' ? 51.0 : 43.0;

    if (tTime < splitTime) {
        // Phase 1 (Preserved 100%): Original AMM Covenant Reservoir
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 44px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t('Cualquier CashToken Emparejado con Cualquier Cadena', 'Any CashToken Paired with Any Chain'), W / 2, 170);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '500 22px -apple-system, sans-serif';
        ctx.fillText(t('Impulsado por Covenants de Bitcoin Cash (P2SH-32) y AMM Descentralizado', 'Powered by Bitcoin Cash Covenants (P2SH-32) & Constant Product AMM'), W / 2, 215);

        // Left: CashToken Stream (BCH Side)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
        ctx.strokeStyle = COLORS.bchGreen;
        ctx.beginPath();
        ctx.roundRect(160, 280, 360, 380, 20);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px -apple-system, sans-serif';
        ctx.fillText('Bitcoin Cash (L1)', 340, 330);
        ctx.fillStyle = COLORS.bchGreen;
        ctx.font = 'bold 18px -apple-system, sans-serif';
        ctx.fillText(t('Capa de CashTokens', 'CashTokens Layer'), 340, 365);

        drawCoin(340, 460, 48, 'P', COLORS.pusdGold, COLORS.pusdGold, tTime);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px -apple-system, sans-serif';
        ctx.fillText('ParyonUSD (PUSD)', 340, 550);
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '16px -apple-system, sans-serif';
        ctx.fillText(t('o CUALQUIER CashToken nativo', 'or ANY native CashToken'), 340, 580);

        // Right: EVM Stream (Polygon / Arbitrum)
        ctx.fillStyle = 'rgba(38, 161, 123, 0.1)';
        ctx.strokeStyle = COLORS.usdtTeal;
        ctx.beginPath();
        ctx.roundRect(1400, 280, 360, 380, 20);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px -apple-system, sans-serif';
        ctx.fillText('Polygon / EVM', 1580, 330);
        ctx.fillStyle = COLORS.usdtTeal;
        ctx.font = 'bold 18px -apple-system, sans-serif';
        ctx.fillText(t('Activo Multi-Cadena', 'Multi-Chain Asset'), 1580, 365);

        drawCoin(1580, 460, 48, '₮', COLORS.usdtTeal, COLORS.usdtTeal, tTime + 1);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px -apple-system, sans-serif';
        ctx.fillText('Tether (USDT)', 1580, 550);
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '16px -apple-system, sans-serif';
        ctx.fillText(t('o USDC, POL, ETH', 'or USDC, POL, ETH'), 1580, 580);

        // Center: Covenant AMM Pool Vault
        drawVault(640, 260, 640, 420, 0.75, COLORS.bchGreen, t('AMM POOL COVENANT P2SH-32', 'P2SH-32 COVENANT AMM POOL'), tTime);

        // AMM Invariant Formula
        ctx.fillStyle = COLORS.cyan;
        ctx.shadowColor = COLORS.cyan;
        ctx.shadowBlur = 15;
        ctx.font = 'bold 42px -apple-system, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('x · y = k', 960, 480);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px -apple-system, sans-serif';
        ctx.fillText(t('100% Peer-to-Contract • Lógica Auditada On-Chain', '100% Peer-to-Contract • Audited On-Chain Logic'), 960, 540);

        // Animated Inflow Arrows
        ctx.strokeStyle = COLORS.pusdGold;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(520, 460);
        ctx.lineTo(640, 460);
        ctx.stroke();

        ctx.strokeStyle = COLORS.usdtTeal;
        ctx.beginPath();
        ctx.moveTo(1400, 460);
        ctx.lineTo(1280, 460);
        ctx.stroke();

        drawSubtitleCard(
            t("Liquidez Descentralizada Sin Intermediarios", "Decentralized Liquidity Without Middlemen"),
            t("Cualquier persona puede crear un pool uniendo CashTokens con stablecoins EVM, regido por matemáticas.", "Anyone can create an AMM pool pairing CashTokens with EVM stablecoins, governed strictly by mathematical covenants."),
            t("COVENANTS AMM", "AMM COVENANTS"),
            COLORS.bchGreen
        );
    } else {
        // Phase 2 (NEW ADDED PART): Permissionless Pool Creation & No Whitelists
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 44px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t('Cero Listas Blancas: Cualquier Creador Puede Abrir un Pool', 'Zero Whitelists: Any Creator Can Launch a Pool'), W / 2, 160);

        ctx.fillStyle = COLORS.btcOrange;
        ctx.font = 'bold 20px -apple-system, sans-serif';
        ctx.fillText(t('🔓 100% LIBRE Y SIN PERMISOS • SIN COSTOS DE LISTADO • COMUNIDAD GLOBAL', '🔓 100% PERMISSIONLESS • ZERO LISTING FEES • GLOBAL ACCESS'), W / 2, 205);

        // 3 Process Step Cards
        const steps = [
            {
                step: t("PASO 1", "STEP 1"),
                title: t("Crea tu CashToken", "Mint CashToken"),
                badge: "BITCOIN CASH L1",
                badgeColor: COLORS.bchGreen,
                desc: t("Emite tu token nativo en BCH para tu proyecto, comunidad o comercio por < 800 sats.", "Issue your native token on BCH L1 for your project, DAO or merchant for sub-cent fee."),
                coinSym: "BCH",
                coinColor: COLORS.bchGreen
            },
            {
                step: t("PASO 2", "STEP 2"),
                title: t("Abre Pool Comunitario", "Launch Community Pool"),
                badge: t("ALISTADO EN SWAP", "AUTO-LISTED ON SWAP"),
                badgeColor: COLORS.pusdGold,
                desc: t("Aportas liquidez con USDT. Tu token se alista automáticamente en el Swap sin intermediarios ni demoras.", "Supply liquidity with USDT. Your token is automatically listed on the Swap with zero gatekeepers."),
                coinSym: "PUSD",
                coinColor: COLORS.pusdGold
            },
            {
                step: t("PASO 3", "STEP 3"),
                title: t("Intercambio en Vivo", "Live Swap Trading"),
                badge: t("TRADING ACTIVO", "LIVE TRADING"),
                badgeColor: COLORS.usdtTeal,
                desc: t("Tu comunidad en Polygon o EVM ya puede intercambiar tu CashToken directamente en la dApp.", "Your community on Polygon or EVM can instantly buy, sell and trade your CashToken in the dApp."),
                coinSym: "USDT",
                coinColor: COLORS.usdtTeal
            }
        ];

        steps.forEach((s, idx) => {
            const cardX = 140 + idx * 560;
            const cardY = 260;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.strokeStyle = s.badgeColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(cardX, cardY, 520, 360, 20);
            ctx.fill();
            ctx.stroke();

            // Step Badge
            drawPill(cardX + 30, cardY + 25, 120, 28, s.step, s.badgeColor);

            // Title
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 26px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(s.title, cardX + 30, cardY + 95);

            // Description
            ctx.fillStyle = COLORS.textMuted;
            ctx.font = '500 17px -apple-system, sans-serif';
            const words = s.desc.split(' ');
            let line = '';
            let lineY = cardY + 140;
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > 460 && n > 0) {
                    ctx.fillText(line, cardX + 30, lineY);
                    line = words[n] + ' ';
                    lineY += 26;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, cardX + 30, lineY);

            // Icon Coin at bottom
            drawCoin(cardX + 260, cardY + 295, 34, s.coinSym, s.badgeColor, s.badgeColor, tTime + idx);

            // Connecting Arrows between cards
            if (idx < 2) {
                ctx.save();
                ctx.strokeStyle = COLORS.btcOrange;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(cardX + 520, cardY + 180);
                ctx.lineTo(cardX + 560, cardY + 180);
                ctx.stroke();
                ctx.restore();
            }
        });

        // Floating LP Fee Ribbon below
        ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
        ctx.strokeStyle = COLORS.pusdGold;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(W / 2 - 400, 640, 800, 48, 24);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = COLORS.pusdGold;
        ctx.font = 'bold 18px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t('💰 El Creador gana el 0.20% de comisión de cada intercambio de su comunidad', '💰 The Creator earns the 0.20% LP fee on every trade from their community'), W / 2, 670);

        drawSubtitleCard(
            t("Alistamiento Inmediato y Trading Comunitario", "Instant Auto-Listing & Community Trading"),
            t("Al abrir un Pool Comunitario con USDT, el token aparece automáticamente en el Swap para intercambio global.", "When you open a Community Pool with USDT, your token is instantly available on the Swap for global trading."),
            t("ALISTADO AUTOMÁTICO", "AUTO-LISTED ON SWAP"),
            COLORS.btcOrange
        );
    }
}

function renderScene3(tTime) {
    drawBackground(tTime);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('Conviértete en Creador de Mercado y Gana 0.20%', 'Become a Market Maker & Earn 0.20% Yield'), W / 2, 170);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 22px -apple-system, sans-serif';
    ctx.fillText(t('Los proveedores de liquidez capturan comisiones reales en cada intercambio.', 'Liquidity providers capture real swap fees on every cross-chain trade.'), W / 2, 215);

    drawVault(760, 280, 400, 360, 0.65, COLORS.bchGreen, t('POOL DE LIQUIDEZ', 'LIQUIDITY POOL'), tTime);

    ctx.fillStyle = 'rgba(247, 147, 26, 0.1)';
    ctx.strokeStyle = COLORS.btcOrange;
    ctx.beginPath();
    ctx.roundRect(160, 280, 460, 360, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px -apple-system, sans-serif';
    ctx.fillText(t('Proveedor de Liquidez (LP)', 'Liquidity Provider (LP)'), 390, 335);

    drawCoin(310, 430, 38, 'P', COLORS.pusdGold, COLORS.pusdGold, tTime);
    drawCoin(470, 430, 38, '₮', COLORS.usdtTeal, COLORS.usdtTeal, tTime + 1);

    ctx.fillStyle = COLORS.bchGreen;
    ctx.font = 'bold 22px -apple-system, sans-serif';
    ctx.fillText(t('Deposita PUSD + USDT', 'Deposit PUSD + USDT'), 390, 520);
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillText(t('Conserva tu propia custodia sin intermediarios', 'Retain full non-custodial ownership'), 390, 555);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.strokeStyle = COLORS.bchGreen;
    ctx.beginPath();
    ctx.roundRect(1300, 280, 460, 360, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px -apple-system, sans-serif';
    ctx.fillText(t('Recompensas Automatizadas LP', 'Automated LP Rewards'), 1530, 335);

    ctx.fillStyle = COLORS.pusdGold;
    ctx.font = 'bold 46px -apple-system, monospace';
    const feeEarned = (142.50 + Math.sin(tTime) * 5).toFixed(2);
    ctx.fillText(`+$${feeEarned}`, 1530, 440);

    ctx.fillStyle = COLORS.bchGreen;
    ctx.font = 'bold 20px -apple-system, sans-serif';
    ctx.fillText(t('0.20% DE CADA INTERCAMBIO', '0.20% OF EVERY SWAP'), 1530, 495);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillText(t('Distribuido continuamente a tus UTXOs', 'Distributed continuously to wallet UTXOs'), 1530, 540);

    const feeProgress = (tTime * 1.5) % 1;
    const fx = 760 + (1300 - 760) * feeProgress;
    const fy = 460 - Math.sin(feeProgress * Math.PI) * 80;
    drawCoin(fx, fy, 22, '★', COLORS.pusdGold, COLORS.pusdGold, tTime);

    drawSubtitleCard(
        t("Rendimiento Pasivo Sostenible en Bitcoin Cash", "Sustainable Passive Yield on Bitcoin Cash"),
        t("A diferencia de granjas inflacionarias, los rendimientos provienen del volumen genuino de intercambios.", "Unlike inflationary farming schemes, BinaryLiquid yields come purely from real trading volume and cross-chain velocity."),
        t("0.20% COMISIÓN LP", "0.20% LP FEE"),
        COLORS.pusdGold
    );
}

function renderScene4(tTime) {
    drawBackground(tTime);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('ParyonUSD (PUSD) — La Stablecoin Nativa de BCH', 'ParyonUSD (PUSD) — The Native Stablecoin'), W / 2, 170);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 22px -apple-system, sans-serif';
    ctx.fillText(t('Patrocinador Oficial de BCH BLAZE • Sobre-Colateralizada en Bitcoin Cash', 'Official BCH BLAZE Track Sponsor • Over-Collateralized on Bitcoin Cash'), W / 2, 215);

    drawCoin(W / 2, 380, 90, 'P', COLORS.pusdGold, COLORS.pusdGold, tTime);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px -apple-system, sans-serif';
    ctx.fillText('ParyonUSD (PUSD)', W / 2, 520);

    ctx.fillStyle = COLORS.bchGreen;
    ctx.font = 'bold 22px -apple-system, sans-serif';
    ctx.fillText(t('100% Respaldada por Bóvedas de Colateral en BCH', '100% Backed by Bitcoin Cash Collateral Vaults'), W / 2, 560);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(240, 600, 440, 75, 14);
    ctx.roundRect(1240, 600, 440, 75, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px -apple-system, sans-serif';
    ctx.fillText(t('CashToken Nativo en BCH', 'Native CashToken on BCH'), 460, 645);
    ctx.fillText(t('Conectado a Tether (USDT)', 'Bridged to Tether (USDT)'), 1460, 645);

    drawSubtitleCard(
        t("Liquidez Global Profunda para Paryon", "Deep Global Liquidity for Paryon"),
        t("BinaryLiquid provee el puente esencial para que PUSD acceda a mercados EVM sin fricción ni KYC.", "BinaryLiquid provides the essential bridge for PUSD to access external EVM markets seamlessly without KYC or centralized exchanges."),
        t("PATROCINADOR OFICIAL", "TRACK SPONSOR"),
        COLORS.pusdGold
    );
}

function renderScene5(tTime) {
    drawBackground(tTime);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('Demo en Vivo: WizardConnect en 1 Clic', 'Live Demo: WizardConnect in 1-Click'), W / 2, 160);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 22px -apple-system, sans-serif';
    ctx.fillText(t('Liquidación atómica entre cadenas en menos de 3 segundos.', 'Atomic settlement across chains in under 3 seconds.'), W / 2, 205);

    const cardW = 580;
    const cardH = 430;
    const cardX = (W - cardW) / 2;
    const cardY = 245;

    // Outer Swap Card
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
    ctx.strokeStyle = COLORS.bchGreen;
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(10, 193, 142, 0.25)';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Card Header Bar: Title + WizardConnect Badge
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('BinaryLiquid AMM Swap', cardX + 28, cardY + 36);

    // Official WizardConnect Logo Badge
    const wizImg = TOKEN_IMAGES['WIZARD'];
    const wizBadgeX = cardX + 340;
    const wizBadgeY = cardY + 16;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.strokeStyle = COLORS.bchGreen;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(wizBadgeX, wizBadgeY, 210, 32, 16);
    ctx.fill();
    ctx.stroke();

    if (wizImg && wizImg.complete && wizImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(wizBadgeX + 18, wizBadgeY + 16, 12, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(wizImg, wizBadgeX + 6, wizBadgeY + 4, 24, 24);
        ctx.restore();
    }
    ctx.fillStyle = COLORS.bchGreen;
    ctx.font = 'bold 12px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⚡ WizardConnect L1', wizBadgeX + 38, wizBadgeY + 21);

    // Top Input Box (10.00 PUSD)
    const inBoxY = cardY + 60;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.beginPath();
    ctx.roundRect(cardX + 24, inBoxY, cardW - 48, 92, 14);
    ctx.fill();

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '13px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(t('Tú envías (Bitcoin Cash):', 'You Pay (Bitcoin Cash):'), cardX + 44, inBoxY + 28);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px -apple-system, monospace';
    ctx.fillText('10.00', cardX + 44, inBoxY + 68);

    drawTokenBadge(cardX + 330, inBoxY + 20, 200, 52, 'PUSD', 'PUSD (BCH)', COLORS.pusdGold, tTime);

    // Center Animated Flow / Wizard Orb
    const orbY = cardY + 185;
    const orbAngle = tTime * 4;

    // Flowing particles between inBox and outBox
    for (let p = 0; p < 5; p++) {
        const flowProg = (tTime * 2 + p * 0.2) % 1;
        const fy = inBoxY + 92 + flowProg * 35;
        ctx.beginPath();
        ctx.arc(W / 2, fy, 3, 0, Math.PI * 2);
        ctx.fillStyle = flowProg < 0.5 ? COLORS.pusdGold : COLORS.usdtTeal;
        ctx.globalAlpha = Math.sin(flowProg * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    ctx.save();
    ctx.translate(W / 2, orbY);
    ctx.rotate(orbAngle);
    ctx.shadowColor = COLORS.bchGreen;
    ctx.shadowBlur = 24;
    ctx.strokeStyle = COLORS.bchGreen;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('↓', W / 2, orbY + 5);

    // Bottom Output Box (9.97 USDT)
    const outBoxY = cardY + 220;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.beginPath();
    ctx.roundRect(cardX + 24, outBoxY, cardW - 48, 92, 14);
    ctx.fill();

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '13px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(t('Recibes (Polygon PoS):', 'You Receive (Polygon PoS):'), cardX + 44, outBoxY + 28);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px -apple-system, monospace';
    ctx.fillText('9.97', cardX + 44, outBoxY + 68);

    drawTokenBadge(cardX + 330, outBoxY + 20, 200, 52, 'USDT', 'USDT (POL)', COLORS.usdtTeal, tTime);

    // Action Button with Shimmer
    const btnY = cardY + 335;
    const btnH = 65;
    const btnGrad = ctx.createLinearGradient(cardX + 24, btnY, cardX + cardW - 24, btnY);
    btnGrad.addColorStop(0, '#0AC18E');
    btnGrad.addColorStop(1, '#06B6D4');

    ctx.save();
    ctx.shadowColor = '#0AC18E';
    ctx.shadowBlur = 20;
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    ctx.roundRect(cardX + 24, btnY, cardW - 48, btnH, 14);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Moving light sweep on button
    const sweepProg = (tTime * 0.8) % 1;
    const sweepX = cardX + 24 + sweepProg * (cardW - 48);
    const sweepGrad = ctx.createLinearGradient(sweepX - 30, btnY, sweepX + 30, btnY);
    sweepGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    sweepGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)');
    sweepGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sweepGrad;
    ctx.beginPath();
    ctx.roundRect(cardX + 24, btnY, cardW - 48, btnH, 14);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#05070B';
    ctx.font = 'bold 22px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('✓ Intercambiar • Liquidado en 2.8s', '✓ Swap • Settled in 2.8s'), W / 2, btnY + 40);

    // Left Companion Card: Source Wallet (Bitcoin Cash L1)
    const leftX = cardX - 340;
    const leftY = cardY + 30;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = COLORS.bchGreen;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(leftX, leftY, 290, 340, 18);
    ctx.fill();
    ctx.stroke();

    drawCoin(leftX + 145, leftY + 65, 36, 'BCH', COLORS.bchGreen, COLORS.bchGreen, tTime);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Bitcoin Cash L1', leftX + 145, leftY + 125);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '14px -apple-system, sans-serif';
    ctx.fillText(t('Billetera Conectada', 'Connected Wallet'), leftX + 145, leftY + 150);

    ctx.fillStyle = COLORS.bchGreen;
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.fillText('🟢 Paytaca / Cashonize', leftX + 145, leftY + 180);

    ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
    ctx.strokeStyle = COLORS.pusdGold;
    ctx.beginPath();
    ctx.roundRect(leftX + 25, leftY + 210, 240, 50, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.pusdGold;
    ctx.font = 'bold 15px -apple-system, monospace';
    ctx.fillText('Balance: 245.50 PUSD', leftX + 145, leftY + 242);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText(t('UTXO CashTokens Seguro', 'UTXO CashTokens Secured'), leftX + 145, leftY + 295);

    // Right Companion Card: Destination (Polygon EVM)
    const rightX = cardX + cardW + 50;
    const rightY = cardY + 30;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = COLORS.usdtTeal;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(rightX, rightY, 290, 340, 18);
    ctx.fill();
    ctx.stroke();

    drawCoin(rightX + 145, rightY + 65, 36, 'POL', COLORS.polygonPurple, COLORS.polygonPurple, tTime + 1);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Polygon PoS (EVM)', rightX + 145, rightY + 125);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '14px -apple-system, sans-serif';
    ctx.fillText(t('Red de Destino', 'Destination Network'), rightX + 145, rightY + 150);

    ctx.fillStyle = COLORS.usdtTeal;
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.fillText('⚡ Liquidación Atómica', rightX + 145, rightY + 180);

    ctx.fillStyle = 'rgba(38, 161, 123, 0.12)';
    ctx.strokeStyle = COLORS.usdtTeal;
    ctx.beginPath();
    ctx.roundRect(rightX + 25, rightY + 210, 240, 50, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.usdtTeal;
    ctx.font = 'bold 15px -apple-system, monospace';
    ctx.fillText('Balance: 1,420 USDT', rightX + 145, rightY + 242);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText(t('Costo Gas L2: < $0.001', 'L2 Gas Cost: < $0.001'), rightX + 145, rightY + 295);

    // Connecting Energy Lines
    ctx.save();
    ctx.strokeStyle = 'rgba(10, 193, 142, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -tTime * 20;
    ctx.beginPath();
    ctx.moveTo(leftX + 290, leftY + 170);
    ctx.lineTo(cardX, cardY + 105);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(38, 161, 123, 0.35)';
    ctx.beginPath();
    ctx.moveTo(cardX + cardW, cardY + 265);
    ctx.lineTo(rightX, rightY + 170);
    ctx.stroke();
    ctx.restore();

    drawSubtitleCard(
        t("Integración Nativa con Paytaca y Cashonize", "Frictionless 1-Click Paytaca Integration"),
        t("WizardConnect se comunica con tu billetera sin copiar direcciones largas ni esperar bloques lentos.", "WizardConnect communicates directly with browser wallets. No manual copy-pasting, no waiting for slow block times."),
        t("DEMO EN VIVO", "LIVE DEMO"),
        COLORS.bchGreen
    );
}

function renderScene6(tTime) {
    drawBackground(tTime);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('Comisiones Microscópicas vs Monstruos de Gas', 'Sub-Cent Fees vs Gas Monsters'), W / 2, 170);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 22px -apple-system, sans-serif';
    ctx.fillText(t('La imbatible eficiencia económica de la Capa 1 de Bitcoin Cash.', 'The unbeatable cost efficiency of Bitcoin Cash Layer 1.'), W / 2, 215);

    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.strokeStyle = COLORS.dangerRed;
    ctx.beginPath();
    ctx.roundRect(240, 280, 660, 360, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.dangerRed;
    ctx.font = 'bold 32px -apple-system, sans-serif';
    ctx.fillText(t('Puentes Tradicionales EVM', 'Traditional EVM Bridges'), 570, 345);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 64px -apple-system, monospace';
    ctx.fillText('$45.80', 570, 445);
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '18px -apple-system, sans-serif';
    ctx.fillText(t('Comisión de Gas por Swap', 'Network Gas Fee per Swap'), 570, 490);

    ctx.fillStyle = COLORS.dangerRed;
    ctx.font = 'bold 20px -apple-system, sans-serif';
    ctx.fillText(t('⏳ 20 - 40 Minutos de Espera', '⏳ 20 - 40 Minutes Confirmation'), 570, 560);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.strokeStyle = COLORS.bchGreen;
    ctx.beginPath();
    ctx.roundRect(1020, 280, 660, 360, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.bchGreen;
    ctx.font = 'bold 32px -apple-system, sans-serif';
    ctx.fillText(t('BinaryLiquid en Bitcoin Cash', 'BinaryLiquid on Bitcoin Cash'), 1350, 345);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 64px -apple-system, monospace';
    ctx.fillText('< 800 sats', 1350, 445);
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '18px -apple-system, sans-serif';
    ctx.fillText(t('Comisión de Red ($0.003)', 'Network Fee ($0.003)'), 1350, 490);

    ctx.fillStyle = COLORS.bchGreen;
    ctx.font = 'bold 20px -apple-system, sans-serif';
    ctx.fillText(t('⚡ Liquidación Atómica en 3 Segundos', '⚡ 3 Seconds Atomic Settlement'), 1350, 560);

    drawSubtitleCard(
        t("Arquitectura Transparente del 0.30%", "A Transparent 0.30% Fee Architecture"),
        t("El 0.20% va íntegro a los proveedores de liquidez y el 0.10% a la reserva del protocolo y centinela Watchman.", "0.20% rewards liquidity providers directly, while 0.10% bolsters protocol reserves and watchman security."),
        t("VENTAJA ECONÓMICA", "ECONOMIC ADVANTAGE"),
        COLORS.bchGreen
    );
}

function renderScene7(tTime) {
    drawBackground(tTime);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('Suite DeFi Completa para Bitcoin Cash', 'The Full DeFi Suite for Bitcoin Cash'), W / 2, 170);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 22px -apple-system, sans-serif';
    ctx.fillText(t('Más allá del swap: Futuros Perpetuos, Préstamos y SDKs Componibles.', 'Going beyond swap: Perpetuals, Lending, and Composable SDKs.'), W / 2, 215);

    const pillars = [
        {
            title: t("Intercambio Atómico", "Cross-Chain Swap"),
            tag: t("ACTIVO", "LIVE"),
            color: COLORS.bchGreen,
            desc: t("Intercambios sin custodia entre CashTokens y EVM.", "Atomic non-custodial swaps between CashTokens and EVM.")
        },
        {
            title: t("Futuros Perpetuos", "Perpetual Futures"),
            tag: "TESTNET",
            color: COLORS.btcOrange,
            desc: t("Opera con apalancamiento colateralizado en CashTokens.", "Trade with real-time leverage colateralized in CashTokens.")
        },
        {
            title: t("Préstamos P2SH-32", "P2SH-32 Lending"),
            tag: "TESTNET",
            color: COLORS.cyan,
            desc: t("Deposita colateral en bóvedas autónomas de Covenants.", "Deposit collateral into autonomous personal covenant vaults.")
        }
    ];

    pillars.forEach((p, i) => {
        const x = 160 + i * 560;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, 280, 480, 360, 20);
        ctx.fill();
        ctx.stroke();

        drawPill(x + 30, 315, 120, 28, p.tag, p.color);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(p.title, x + 30, 395);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '500 18px -apple-system, sans-serif';
        ctx.fillText(p.desc, x + 30, 450);

        const pillarCoins = ['BCH', 'PUSD', 'USDT'];
        drawCoin(x + 240, 540, 38, pillarCoins[i], p.color, p.color, tTime + i);
    });

    drawSubtitleCard(
        t("Arquitectura Componible para Comercios y dApps", "Composable Architecture for Any Merchant or dApp"),
        t("Integra liquidez entre cadenas de CashTokens en tu proyecto con una sola línea de código.", "Integrate cross-chain CashToken liquidity into your project with a single line of code using our SDK."),
        t("ECOSISTEMA DEFI", "DEFI ECOSYSTEM"),
        COLORS.cyan
    );
}

function renderScene8(tTime) {
    drawBackground(tTime);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('BinaryLiquid — Hackathon BCH BLAZE 2026', 'BinaryLiquid — BCH BLAZE Hackathon 2026'), W / 2, 170);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 22px -apple-system, sans-serif';
    ctx.fillText(t('Libertad de Liquidez, Garantizada por Matemáticas.', 'Freedom of Liquidity, Guaranteed by Math.'), W / 2, 215);

    ctx.save();
    ctx.shadowColor = COLORS.bchGreen;
    ctx.shadowBlur = 45;
    drawCoin(W / 2, 365, 82, 'LOGO', COLORS.bchGreen, COLORS.bchGreen, tTime);
    ctx.shadowBlur = 0;
    ctx.restore();

    drawPill(W / 2 - 190, 465, 380, 36, '🏆 DORAHACKS BCH BLAZE 2026', COLORS.btcOrange);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 34px -apple-system, sans-serif';
    ctx.fillText(t('Listo para Evaluación y Despliegue en Mainnet', 'Ready for Evaluation & Mainnet Deployment'), W / 2, 535);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.strokeStyle = COLORS.bchGreen;
    ctx.beginPath();
    ctx.roundRect(W / 2 - 300, 565, 600, 75, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.bchGreen;
    ctx.font = 'bold 30px -apple-system, monospace';
    ctx.fillText('https://bliquid.xyz', W / 2, 612);

    drawSubtitleCard(
        t("Postulación en Dos Pistas Oficiales", "Dual Track Submission"),
        t("Pista Mainnet ($3,500 PUSD) • Pista Media ($1,000 PUSD) • Patrocinado por ParyonUSD (PUSD)", "Mainnet Track ($3,500 PUSD) • Media Track ($1,000 PUSD) • Sponsored by ParyonUSD (PUSD)"),
        t("BCH BLAZE FINAL", "BCH BLAZE FINAL"),
        COLORS.btcOrange
    );
}

// Scene Dispatcher
const SCENE_RENDERERS = [
    renderScene1,
    renderScene2,
    renderScene3,
    renderScene4,
    renderScene5,
    renderScene6,
    renderScene7,
    renderScene8
];

function drawCurrentScene(tTime) {
    SCENE_RENDERERS[currentSceneIndex](tTime);
}

// ==============================================================================
// PLAYBACK & INTERACTIVITY ENGINE
// ==============================================================================

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function renderScenePills() {
    const container = document.getElementById('scene-pills');
    if (!container) return;
    container.innerHTML = '';
    SCENES.forEach((s, idx) => {
        const pill = document.createElement('div');
        pill.className = 'scene-pill' + (idx === currentSceneIndex ? ' active' : '');
        const title = currentLang === 'es' ? s.titleEs : s.titleEn;
        pill.textContent = `${idx + 1}. ${title}`;
        pill.onclick = () => playScene(idx);
        container.appendChild(pill);
    });
}

function updateUI() {
    const scene = SCENES[currentSceneIndex];
    const title = currentLang === 'es' ? scene.titleEs : scene.titleEn;
    const label = currentLang === 'es' ? 'Escena' : 'Scene';
    
    // Dynamic Browser Tab Title
    document.title = `BinaryLiquid | ${label} ${currentSceneIndex + 1}: ${title}`;

    const titleEl = document.getElementById('video-title');
    if (titleEl) titleEl.textContent = `${label} ${currentSceneIndex + 1}: ${title}`;

    const playBtn = document.getElementById('btn-play');
    if (playBtn) {
        playBtn.textContent = isPlaying
            ? (currentLang === 'es' ? '⏸ Pausar' : '⏸ Pause')
            : (currentLang === 'es' ? '▶ Reproducir' : '▶ Play');
    }

    renderScenePills();
}

function loadScene(index, shouldPlay = false) {
    currentSceneIndex = index;
    sceneTime = 0;

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    const scene = SCENES[index];
    const audioPath = currentLang === 'es' ? scene.audioEs : scene.audioEn;
    currentAudio = new Audio(audioPath);

    currentAudio.addEventListener('timeupdate', () => {
        if (isPlaying && currentAudio) {
            sceneTime = currentAudio.currentTime;
        }
    });

    currentAudio.addEventListener('ended', () => {
        if (currentSceneIndex < SCENES.length - 1) {
            loadScene(currentSceneIndex + 1, true);
        } else {
            isPlaying = false;
            updateUI();
        }
    });

    if (shouldPlay) {
        isPlaying = true;
        currentAudio.play().catch(e => console.log('Audio autoplay prevented:', e));
    } else {
        isPlaying = false;
    }

    updateUI();
}

function playScene(index) {
    loadScene(index, true);
}

function setLanguage(lang) {
    currentLang = lang;
    try { localStorage.setItem('explainer_lang', lang); } catch (e) {}
    const btnEs = document.getElementById('btn-lang-es');
    const btnEn = document.getElementById('btn-lang-en');
    if (btnEs) btnEs.classList.toggle('active', lang === 'es');
    if (btnEn) btnEn.classList.toggle('active', lang === 'en');
    
    const wasPlaying = isPlaying;
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    sceneTime = 0;
    if (wasPlaying) {
        loadScene(currentSceneIndex, true);
    } else {
        updateUI();
    }
}

function loop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    const curDur = currentLang === 'es' ? SCENES[currentSceneIndex].durationEs : SCENES[currentSceneIndex].durationEn;
    
    if (isPlaying) {
        if (currentAudio && !currentAudio.paused) {
            sceneTime = currentAudio.currentTime;
        } else {
            sceneTime += delta;
        }
        if (sceneTime >= curDur) {
            if (currentSceneIndex < SCENES.length - 1) {
                loadScene(currentSceneIndex + 1, true);
            } else {
                isPlaying = false;
                sceneTime = curDur;
                updateUI();
            }
        }
    }
    // Note: When isPlaying is false, sceneTime remains completely frozen!

    // Update progress bar & time display
    const pct = Math.min(100, Math.max(0, (sceneTime / curDur) * 100));
    const pb = document.getElementById('progress-bar');
    if (pb) pb.style.width = pct + '%';
    const td = document.getElementById('time-display');
    if (td) td.textContent = `${formatTime(sceneTime)} / ${formatTime(curDur)}`;

    drawCurrentScene(sceneTime);
    animationFrameId = requestAnimationFrame(loop);
}

// Controls Listeners
document.getElementById('btn-play').addEventListener('click', () => {
    if (!isPlaying) {
        if (!currentAudio) {
            const scene = SCENES[currentSceneIndex];
            const audioPath = currentLang === 'es' ? scene.audioEs : scene.audioEn;
            currentAudio = new Audio(audioPath);
            currentAudio.currentTime = sceneTime;
            currentAudio.addEventListener('timeupdate', () => {
                if (isPlaying && currentAudio) {
                    sceneTime = currentAudio.currentTime;
                }
            });
            currentAudio.addEventListener('ended', () => {
                if (currentSceneIndex < SCENES.length - 1) {
                    loadScene(currentSceneIndex + 1, true);
                } else {
                    isPlaying = false;
                    updateUI();
                }
            });
        }
        isPlaying = true;
        currentAudio.play().catch(e => console.log('Playback error:', e));
    } else {
        isPlaying = false;
        if (currentAudio) currentAudio.pause();
    }
    updateUI();
});

document.getElementById('btn-prev').addEventListener('click', () => {
    if (currentSceneIndex > 0) loadScene(currentSceneIndex - 1, isPlaying);
});

document.getElementById('btn-next').addEventListener('click', () => {
    if (currentSceneIndex < SCENES.length - 1) loadScene(currentSceneIndex + 1, isPlaying);
});

document.getElementById('btn-lang-es').addEventListener('click', () => setLanguage('es'));
document.getElementById('btn-lang-en').addEventListener('click', () => setLanguage('en'));

// URL Query Param & Saved Preference Handler (Default English 'en')
const urlParams = new URLSearchParams(window.location.search);
let initialLang = 'en';
try {
    const saved = localStorage.getItem('explainer_lang');
    if (saved === 'es') initialLang = 'es';
} catch (e) {}
if (urlParams.has('lang')) {
    initialLang = urlParams.get('lang') === 'es' ? 'es' : 'en';
}
setLanguage(initialLang);
if (urlParams.has('scene')) {
    currentSceneIndex = Math.max(0, Math.min(SCENES.length - 1, parseInt(urlParams.get('scene'), 10) - 1));
}
if (urlParams.has('t')) {
    sceneTime = parseFloat(urlParams.get('t'));
}

// Auto-start loop
requestAnimationFrame(loop);
updateUI();

// Export helpers for headless automation
window.setLanguage = setLanguage;
window.prepareRecording = function(sceneIndex, lang) {
    if (lang) setLanguage(lang);
    currentSceneIndex = sceneIndex;
    sceneTime = 0;
    isPlaying = false;
    updateUI();
};
window.renderAtTime = function(tTime) {
    sceneTime = tTime;
    drawCurrentScene(tTime);
};

// Tap stage to toggle play/pause like YouTube
document.getElementById('stage-container').addEventListener('click', () => {
    document.getElementById('btn-play').click();
});

// Fullscreen toggle
const fsBtn = document.getElementById('btn-fullscreen');
if (fsBtn) {
    fsBtn.addEventListener('click', () => {
        const sc = document.getElementById('stage-container');
        if (!document.fullscreenElement) {
            sc.requestFullscreen().catch(err => console.log(err));
        } else {
            document.exitFullscreen().catch(err => console.log(err));
        }
    });
}

// Click on progress bar to seek
const pbc = document.getElementById('progress-bar-container');
if (pbc) {
    pbc.addEventListener('click', (e) => {
        const rect = pbc.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, clickX / rect.width));
        const curDur = currentLang === 'es' ? SCENES[currentSceneIndex].durationEs : SCENES[currentSceneIndex].durationEn;
        sceneTime = pct * curDur;
        if (currentAudio) currentAudio.currentTime = sceneTime;
        drawCurrentScene(sceneTime);
    });
}
