/**
 * UserLink Video Explainer Studio
 * 1080p High-Fidelity Vector Motion Graphics Renderer & Synchronized Audio Engine
 * Bilingual Voiceover: 🇪🇸 Español (es-MX-JorgeNeural) + 🇺🇸 English (en-US-ChristopherNeural)
 * Built for BCH BLAZE 2026 Hackathon · Powered by Paytaca & Drian Stack Labs
 */

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const W = 1920;
const H = 1080;

let currentLang = 'es';
try {
    const saved = localStorage.getItem('explainer_lang');
    if (saved === 'es' || saved === 'en') currentLang = saved;
} catch (e) {}

// Color Palette
const COLORS = {
    bg: '#080B11',
    cardBg: 'rgba(15, 23, 42, 0.85)',
    cardBorder: 'rgba(255, 255, 255, 0.12)',
    textMain: '#FFFFFF',
    textMuted: '#94A3B8',
    bchGreen: '#10B981',
    bchDarkGreen: '#047857',
    btcOrange: '#F7931A',
    paytacaTeal: '#00D1B2',
    nostrPurple: '#8A2BE2',
    dangerRed: '#EF4444',
    cyan: '#06B6D4',
    gold: '#FBBF24'
};

// 7 Scenes Configuration with Exact ffmpeg-Measured Durations & Phrase Sync Cues
const SCENES = [
    {
        id: 1,
        titleEs: "1. El Dilema de la Identidad Web2 y el Gas L1",
        titleEn: "1. The Centralized Identity & Gas Fee Trap",
        chapterEs: "El Dilema",
        chapterEn: "The Trap",
        durationEs: 37.37,
        durationEn: 34.87,
        audioEs: "./audio/scene1_es.mp3",
        audioEn: "./audio/scene1.mp3"
    },
    {
        id: 2,
        titleEs: "2. ¿Qué es UserLink? — NIP-01 Kind 30078 + NIP-05",
        titleEn: "2. What is UserLink? — NIP-01 Kind 30078 + NIP-05",
        chapterEs: "Qué y Cómo",
        chapterEn: "What & How",
        durationEs: 63.41,
        durationEn: 64.25,
        audioEs: "./audio/scene2_es.mp3",
        audioEn: "./audio/scene2.mp3"
    },
    {
        id: 3,
        titleEs: "3. ¿Para Qué Sirve? — Pagos 1-Clic, Anti-Estafas y Login",
        titleEn: "3. Real-World Utility — 1-Click Pay, Anti-Scam & Login",
        chapterEs: "Usos Reales",
        chapterEn: "Use Cases",
        durationEs: 51.12,
        durationEn: 47.98,
        audioEs: "./audio/scene3_es.mp3",
        audioEn: "./audio/scene3.mp3"
    },
    {
        id: 4,
        titleEs: "4. Seguridad Criptográfica e Aislamiento de Claves",
        titleEn: "4. Cryptographic Security & Strict Key Separation",
        chapterEs: "Seguridad",
        chapterEn: "Security",
        durationEs: 44.26,
        durationEn: 43.75,
        audioEs: "./audio/scene4_es.mp3",
        audioEn: "./audio/scene4.mp3"
    },
    {
        id: 5,
        titleEs: "5. Comparativa: UserLink vs Web2 vs Ethereum ENS",
        titleEn: "5. Comparison: UserLink vs Web2 vs Ethereum ENS",
        chapterEs: "Comparativa",
        chapterEn: "Comparison",
        durationEs: 42.53,
        durationEn: 42.19,
        audioEs: "./audio/scene5_es.mp3",
        audioEn: "./audio/scene5.mp3"
    },
    {
        id: 6,
        titleEs: "6. Cómo Usar UserLink en 3 Sencillos Pasos",
        titleEn: "6. How to Use UserLink in 3 Simple Steps",
        chapterEs: "3 Pasos",
        chapterEn: "3 Steps",
        durationEs: 36.29,
        durationEn: 36.79,
        audioEs: "./audio/scene6_es.mp3",
        audioEn: "./audio/scene6.mp3"
    },
    {
        id: 7,
        titleEs: "7. Gran Cierre — Paytaca & BCH BLAZE 2026 ($500 PUSD)",
        titleEn: "7. Finale — Paytaca & BCH BLAZE 2026 ($500 PUSD)",
        chapterEs: "Paytaca",
        chapterEn: "Paytaca",
        durationEs: 37.44,
        durationEn: 33.62,
        audioEs: "./audio/scene7_es.mp3",
        audioEn: "./audio/scene7.mp3"
    }
];

// Exact ffmpeg silencedetect Phrase Cues (Seconds)
const CUES = {
    es: {
        s1: { web2Start: 3.89, web2End: 14.12, ensStart: 14.12, ensEnd: 26.40, resolveStart: 26.40 },
        s2: { beforeStart: 3.02, afterStart: 8.39, bridgeStart: 18.24, phaseBStart: 24.46, step1: 28.21, step2: 38.08, step3: 49.42 },
        s3: { case1: 6.11, case2: 20.89, case3: 35.92 },
        s4: { firewall: 4.81, left: 10.74, right: 22.68, summary: 32.24 },
        s5: { rows: [4.03, 14.06, 23.63, 35.22] },
        s6: { step1: 5.73, step2: 15.99, step3: 23.10, done: 30.23 },
        s7: { tribute: 13.80, cta: 22.40, closing: 28.93 }
    },
    en: {
        s1: { web2Start: 3.76, web2End: 13.03, ensStart: 13.03, ensEnd: 23.90, resolveStart: 23.90 },
        s2: { beforeStart: 3.33, afterStart: 7.75, bridgeStart: 16.70, phaseBStart: 23.86, step1: 28.09, step2: 37.50, step3: 51.12 },
        s3: { case1: 5.79, case2: 21.24, case3: 34.38 },
        s4: { firewall: 5.37, left: 11.63, right: 23.53, summary: 33.13 },
        s5: { rows: [4.41, 14.97, 23.44, 33.42] },
        s6: { step1: 5.84, step2: 14.93, step3: 22.18, done: 31.54 },
        s7: { tribute: 11.70, cta: 20.27, closing: 25.52 }
    }
};

let currentSceneIndex = 0;
let sceneTime = 0;
let isPlaying = false;
let currentAudio = null;
let bgmAudio = null;
let animationFrameId = null;
let lastTimestamp = 0;

function t(es, en) {
    return currentLang === 'es' ? es : en;
}

function getCues() {
    return currentLang === 'es' ? CUES.es : CUES.en;
}

function getCurDuration() {
    return currentLang === 'es' ? SCENES[currentSceneIndex].durationEs : SCENES[currentSceneIndex].durationEn;
}

function clamp01(v) {
    return Math.max(0, Math.min(1, v));
}

function smoothFade(tTime, start, dur = 0.55) {
    return clamp01((tTime - start) / dur);
}

// ==============================================================================
// DRAWING PRIMITIVES & VECTOR ILLUSTRATIONS
// ==============================================================================

function drawBackground(tTime) {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle moving cyber grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSpacing = 60;
    const offset = (tTime * 15) % gridSpacing;
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

    // Ambient radial glow effects in corners
    const glow1 = ctx.createRadialGradient(250, 250, 10, 250, 250, 700);
    glow1.addColorStop(0, 'rgba(247, 147, 26, 0.07)');
    glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, W, H);

    const glow2 = ctx.createRadialGradient(W - 250, H - 250, 10, W - 250, H - 250, 700);
    glow2.addColorStop(0, 'rgba(0, 209, 178, 0.07)');
    glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);

    // Top Navigation Bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fillRect(0, 0, W, 80);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, 80);
    ctx.lineTo(W, 80);
    ctx.stroke();

    // UserLink Brand
    ctx.beginPath();
    ctx.arc(75, 40, 20, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.paytacaTeal;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(85, 40, 15, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.nostrPurple;
    ctx.fill();

    ctx.fillStyle = COLORS.textMain;
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('UserLink', 120, 48);
    const brandW = ctx.measureText('UserLink').width;

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 16px -apple-system, sans-serif';
    ctx.fillText(t('•  Identidad Descentralizada Bitcoin Cash & Nostr', '•  Decentralized Identity for Bitcoin Cash & Nostr'), 120 + brandW + 18, 47);

    // Track Badges (Top Right)
    drawPill(1345, 24, 285, 32, 'BCH BLAZE 2026 ($500 PUSD)', COLORS.btcOrange);
    drawPill(1650, 24, 210, 32, 'POWERED BY PAYTACA', COLORS.paytacaTeal);
}

function drawPill(x, y, w, h, text, color) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
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

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = Math.max(2, radius * 0.06);
    ctx.stroke();

    const innerRadius = radius * 0.84;
    ctx.beginPath();
    ctx.arc(x, floatY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#080B11';
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${radius * 0.85}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, x, floatY + 2);

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, floatY, innerRadius, 0, Math.PI * 2);
    ctx.clip();

    const sheenGrad = ctx.createLinearGradient(
        x - radius, floatY - radius,
        x + radius, floatY + radius
    );
    sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    sheenGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.1)');
    sheenGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0)');

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

function drawSubtitleCard(title, body, badgeText, badgeColor = COLORS.bchGreen, highlight = false) {
    ctx.save();
    const boxW = 1400;
    const boxH = 150;
    const boxX = (W - boxW) / 2;
    const boxY = H - 190;

    if (highlight) {
        ctx.shadowColor = badgeColor;
        ctx.shadowBlur = 22;
    }

    ctx.fillStyle = 'rgba(8, 11, 17, 0.95)';
    ctx.strokeStyle = highlight ? badgeColor : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = highlight ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 18);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    drawPill(boxX + 35, boxY + 24, 270, 30, badgeText, badgeColor);

    ctx.fillStyle = COLORS.textMain;
    ctx.font = 'bold 26px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, boxX + 325, boxY + 46);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '400 19px -apple-system, sans-serif';
    wrapText(ctx, body, boxX + 35, boxY + 88, boxW - 70, 26);

    ctx.restore();
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            context.fillText(line.trimEnd(), x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    if (line.trim()) {
        context.fillText(line.trimEnd(), x, currentY);
    }
}

// ==============================================================================
// 7 SCENES ANIMATION RENDERERS (SYNCHRONIZED PROGRESSIVE CHOREOGRAPHY)
// ==============================================================================

// SCENE 1: THE CENTRALIZED IDENTITY TRAP
function renderScene1(tTime) {
    drawBackground(tTime);
    const c = getCues().s1;

    const web2Active = tTime >= c.web2Start && tTime < c.web2End;
    const ensActive = tTime >= c.ensStart && tTime < c.ensEnd;
    const resolveActive = tTime >= c.resolveStart;

    const web2Alpha = tTime < c.web2Start ? 0.45 : (web2Active || resolveActive ? 1.0 : 0.72);
    const ensAlpha = tTime < c.ensStart ? 0.35 : (ensActive || resolveActive ? 1.0 : 0.75);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('¿Quién es el Dueño de tu Identidad en la Red?', 'Who Owns Your Identity on the Web?'), W / 2, 160);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 22px -apple-system, sans-serif';
    ctx.fillText(t('La Trampa de los Monopolios Web2 y las Tarifas de Gas en Cadenas Tradicionales', 'Big Tech Web2 Monopolies vs Legacy Blockchain Gas Fees'), W / 2, 205);

    // Left Simulation: Web2 Corporate Monopoly & Account Suspension
    const c1X = 220;
    const c1Y = 250;
    const cW = 680;
    const cH = 460;

    ctx.save();
    ctx.globalAlpha = web2Alpha;
    if (web2Active) {
        ctx.shadowColor = COLORS.dangerRed;
        ctx.shadowBlur = 24;
    }
    ctx.fillStyle = web2Active ? 'rgba(239, 68, 68, 0.14)' : 'rgba(239, 68, 68, 0.07)';
    ctx.strokeStyle = COLORS.dangerRed;
    ctx.lineWidth = web2Active ? 3 : 1.5;
    ctx.beginPath();
    ctx.roundRect(c1X, c1Y, cW, cH, 20);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    drawPill(c1X + 35, c1Y + 30, 290, 32, t('❌ RIESGO WEB2: MONOPOLIOS', '❌ WEB2 RISK: BIG TECH MONOPOLY'), COLORS.dangerRed);

    // Server rack graphic
    const rackX = c1X + 60;
    const rackY = c1Y + 95;
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(rackX, rackY, 220, 240, 12);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
        const bY = rackY + 20 + i * 50;
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(rackX + 15, bY, 190, 36);
        ctx.fillStyle = (web2Active || Math.sin(tTime * 5 + i) > 0) ? COLORS.dangerRed : '#475569';
        ctx.beginPath();
        ctx.arc(rackX + 35, bY + 18, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = web2Active ? '#EF4444' : '#10B981';
        ctx.beginPath();
        ctx.arc(rackX + 55, bY + 18, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    // Account Lockout Box (slides slightly & flashes when narrated)
    const lockProg = smoothFade(tTime, c.web2Start + 2.5, 0.8);
    const lockX = c1X + 330;
    const lockY = c1Y + 130;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
    ctx.strokeStyle = COLORS.dangerRed;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(lockX, lockY, 280, 180, 14);
    ctx.fill();
    ctx.stroke();

    ctx.font = '40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lockProg > 0.5 ? '🔒' : '🔓', lockX + 140, lockY + 55);

    ctx.fillStyle = COLORS.dangerRed;
    ctx.font = 'bold 20px -apple-system, sans-serif';
    ctx.fillText(t('CUENTA SUSPENDIDA', 'ACCOUNT SUSPENDED'), lockX + 140, lockY + 100);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '14px -apple-system, sans-serif';
    ctx.fillText(t('Cero claves = Cero control', 'No private keys = No control'), lockX + 140, lockY + 130);
    ctx.fillText(t('Tus datos son monetizados', 'Your data is monetized'), lockX + 140, lockY + 152);
    ctx.restore();

    // Right Simulation: Ethereum ENS Gas Trap
    const c2X = 1020;
    const c2Y = 250;

    ctx.save();
    ctx.globalAlpha = ensAlpha;
    if (ensActive) {
        ctx.shadowColor = COLORS.btcOrange;
        ctx.shadowBlur = 24;
    }
    ctx.fillStyle = ensActive ? 'rgba(247, 147, 26, 0.14)' : 'rgba(247, 147, 26, 0.07)';
    ctx.strokeStyle = COLORS.btcOrange;
    ctx.lineWidth = ensActive ? 3 : 1.5;
    ctx.beginPath();
    ctx.roundRect(c2X, c2Y, cW, cH, 20);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    drawPill(c2X + 35, c2Y + 30, 320, 32, t('⚠️ WEB3 TRADICIONAL: TRAMPA DE GAS', '⚠️ LEGACY WEB3: GAS & RENT TRAP'), COLORS.btcOrange);

    const gaugeX = c2X + 160;
    const gaugeY = c2Y + 210;
    const gaugeR = 90;

    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, gaugeR, Math.PI * 0.8, Math.PI * 2.2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 14;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, gaugeR, Math.PI * 1.5, Math.PI * 2.2);
    ctx.strokeStyle = COLORS.dangerRed;
    ctx.lineWidth = 14;
    ctx.stroke();

    const needleRise = smoothFade(tTime, c.ensStart, 1.5);
    const needleAngle = Math.PI * (0.95 + 0.95 * needleRise) + Math.sin(tTime * 8) * (ensActive ? 0.14 : 0.05);
    ctx.save();
    ctx.translate(gaugeX, gaugeY);
    ctx.rotate(needleAngle);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(gaugeR - 10, 0);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(t('Gas L1 Variable', 'High L1 Gas Spikes'), gaugeX, gaugeY + 45);

    const billX = c2X + 330;
    const billY = c2Y + 130;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(billX, billY, 290, 180, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.btcOrange;
    ctx.font = 'bold 17px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(t('Costo en Registros ENS:', 'Legacy Name Registry Costs:'), billX + 20, billY + 40);

    ctx.fillStyle = COLORS.dangerRed;
    ctx.font = 'bold 19px monospace';
    ctx.fillText(t('Gas Variable ETH', 'Steep Ethereum Gas'), billX + 20, billY + 80);

    ctx.fillStyle = COLORS.gold;
    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillText(t('+ Renta Anual Obligatoria', '+ Recurring Annual Rent'), billX + 20, billY + 115);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '14px -apple-system, sans-serif';
    ctx.fillText(t('Si dejas de pagar, pierdes tu nombre.', 'Stop paying rent, lose your name.'), billX + 20, billY + 145);
    ctx.restore();

    drawSubtitleCard(
        t('La Soberanía Digital no Puede Depender de Corporaciones ni Gas', 'Digital Sovereignty Cannot Depend on Monopolies or Gas Rents'),
        t('UserLink rompe este dilema combinando Bitcoin Cash con Nostr: sin servidores, sin gas y sin costos anuales.', 'UserLink breaks this dilemma by uniting Bitcoin Cash with Nostr: zero servers, zero blockchain gas, zero annual fees.'),
        resolveActive ? t('✓ SOLUCIÓN USERLINK', '✓ THE USERLINK SOLUTION') : t('EL PROBLEMA REAL', 'THE CORE PROBLEM'),
        resolveActive ? COLORS.paytacaTeal : COLORS.dangerRed,
        resolveActive
    );
}

// SCENE 2: WHAT IS USERLINK & HOW DOES IT WORK?
function renderScene2(tTime) {
    drawBackground(tTime);
    const c = getCues().s2;

    if (tTime < c.phaseBStart) {
        // PHASE A: WHAT IS IT? (Username Payments & BCH ⇄ Nostr Bridge)
        const beforeLit = tTime >= c.beforeStart;
        const afterLit = tTime >= c.afterStart;
        const bridgeLit = tTime >= c.bridgeStart;

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 44px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t('¿Qué es UserLink? — Pagos por Nombre de Usuario', 'What is UserLink? — Username Payments'), W / 2, 150);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '500 22px -apple-system, sans-serif';
        ctx.fillText(t('Envía y Recibe Bitcoin Cash por tu @usuario en vez de Códigos Largos de 42 Caracteres', 'Send and Receive Bitcoin Cash via your @handle instead of 42-Character Hash Strings'), W / 2, 192);

        const compY = 225;
        const compW = 1440;
        const compX = (W - compW) / 2;

        // Red BEFORE box
        ctx.save();
        ctx.globalAlpha = beforeLit ? 1.0 : 0.45;
        if (beforeLit && !afterLit) {
            ctx.shadowColor = COLORS.dangerRed;
            ctx.shadowBlur = 18;
        }
        ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
        ctx.strokeStyle = beforeLit && !afterLit ? COLORS.dangerRed : 'rgba(239, 68, 68, 0.45)';
        ctx.lineWidth = beforeLit && !afterLit ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.roundRect(compX, compY, 700, 78, 12);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = COLORS.dangerRed;
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(t('❌ ANTES: DIRECCIÓN COMPLEJA DE 42 CARACTERES', '❌ BEFORE: 42-CHARACTER UNREADABLE STRING'), compX + 25, compY + 28);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '500 16px monospace';
        ctx.fillText('bitcoincash:qr5zz6098wax242qrz3k7dctsx2kd3vszvywzsefgn', compX + 25, compY + 56);
        ctx.restore();

        // Green WITH USERLINK box
        ctx.save();
        ctx.globalAlpha = afterLit ? 1.0 : 0.45;
        if (afterLit && !bridgeLit) {
            ctx.shadowColor = COLORS.bchGreen;
            ctx.shadowBlur = 22;
        }
        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.strokeStyle = afterLit ? COLORS.bchGreen : 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = afterLit && !bridgeLit ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.roundRect(compX + 740, compY, 700, 78, 12);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = COLORS.bchGreen;
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(t('🟢 CON USERLINK: TU NOMBRE LEGIBLE / NIP-05', '🟢 WITH USERLINK: HUMAN HANDLE / NIP-05'), compX + 765, compY + 28);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 19px monospace';
        ctx.fillText(t('@myuser  o  myuser@bliquid.xyz  (Pago en 1 Clic)', '@myuser  or  myuser@bliquid.xyz  (1-Click Pay)'), compX + 765, compY + 56);
        ctx.restore();

        // Coins & Bridge
        ctx.save();
        ctx.globalAlpha = bridgeLit ? 1.0 : 0.72;
        drawCoin(460, 460, 75, '₿', COLORS.bchGreen, COLORS.bchGreen, tTime);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 26px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Bitcoin Cash (BCH)', 460, 565);
        ctx.fillStyle = COLORS.bchGreen;
        ctx.font = 'bold 17px -apple-system, sans-serif';
        ctx.fillText(t('Dinero P2P Soberano (Paytaca / Cashonize)', 'Sovereign P2P Cash (Paytaca / Cashonize)'), 460, 595);

        drawCoin(1460, 460, 75, '🔑', COLORS.nostrPurple, COLORS.nostrPurple, tTime + 0.5);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 26px -apple-system, sans-serif';
        ctx.fillText('Nostr Protocol', 1460, 565);
        ctx.fillStyle = COLORS.nostrPurple;
        ctx.font = 'bold 17px -apple-system, sans-serif';
        ctx.fillText(t('Identidad y Claves Abiertas (BIP-340)', 'Open Censorship-Free Identity (BIP-340)'), 1460, 595);

        ctx.strokeStyle = COLORS.paytacaTeal;
        ctx.lineWidth = bridgeLit ? 7 : 4;
        ctx.shadowColor = COLORS.paytacaTeal;
        ctx.shadowBlur = bridgeLit ? 28 : 14;
        ctx.beginPath();
        ctx.moveTo(560, 460);
        ctx.lineTo(1360, 460);
        ctx.stroke();
        ctx.shadowBlur = 0;

        const particleX = 560 + ((tTime * 350) % 800);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(particleX, 460, bridgeLit ? 13 : 9, 0, Math.PI * 2);
        ctx.fill();

        drawPill(W / 2 - 195, 414, 390, 34, t('⚡ PAGOS POR NOMBRE DE USUARIO ⚡', '⚡ USERNAME PAYMENTS BRIDGE ⚡'), COLORS.btcOrange);
        drawPill(W / 2 - 185, 472, 370, 34, 'secp256k1 (ECDSA) ⇄ BIP-340 (Schnorr)', COLORS.paytacaTeal);
        ctx.restore();

        drawSubtitleCard(
            t('Envía y Recibe BCH por Nombre de Usuario sin Intermediarios', 'Send and Receive BCH by Username Without Middlemen'),
            t('UserLink vincula tu billetera Paytaca a tu identidad abierta de Nostr a costo de gas cero y sin servidores custodios.', 'UserLink binds your Paytaca wallet to your open Nostr identity at zero blockchain gas cost with zero custodial servers.'),
            t('DEFINICIÓN DEL PROTOCOLO', 'PROTOCOL DEFINITION'),
            COLORS.paytacaTeal,
            bridgeLit
        );
    } else {
        // PHASE B: HOW DOES IT WORK? (THE 3-STEP ENGINE — NIP-01 Kind 30078 + NIP-05)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 44px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t('¿Cómo Funciona Paso a Paso?', 'How Does It Work Step-by-Step?'), W / 2, 160);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '500 22px -apple-system, sans-serif';
        ctx.fillText(t('Motor Criptográfico de Doble Firma (NIP-01 Kind 30078 + NIP-05)', 'Cryptographic Dual-Signature Engine (NIP-01 Kind 30078 + NIP-05)'), W / 2, 205);

        const cardW = 440;
        const cardH = 430;
        const gap = 50;
        const startX = 250;

        const stepTimes = [c.step1, c.step2, c.step3];
        const steps = [
            {
                num: '01',
                title: t('Paso 1: Declaración JSON', 'Step 1: Canonical Statement'),
                desc: t('Se construye un documento estructurado vinculando tu dirección BCH con tu clave pública Nostr (npub), red activa y timestamp.', 'Builds a standardized canonical JSON binding your BCH CashAddress with your Nostr pubkey, network, and UTC timestamp.'),
                color: COLORS.btcOrange,
                icon: '📄',
                footer: t('Declaración Canónica JSON ✓', 'Canonical JSON Payload ✓')
            },
            {
                num: '02',
                title: t('Paso 2: Doble Firma Dual', 'Step 2: Dual Crypto Signature'),
                desc: t('Tu billetera Bitcoin Cash firma con secp256k1 (ECDSA) y Nostr sella el evento Kind 30078 con firma BIP-340 Schnorr.', 'Paytaca signs with secp256k1 (ECDSA) and Nostr seals the Kind 30078 attestation with BIP-340 Schnorr.'),
                color: COLORS.bchGreen,
                icon: '🔐',
                footer: t('secp256k1 + BIP-340 Schnorr ✓', 'secp256k1 + BIP-340 Schnorr ✓')
            },
            {
                num: '03',
                title: t('Paso 3: Relays y Verificación', 'Step 3: Relays & Local Verify'),
                desc: t('Se difunde a primal.net, snort.social, nostr.oxtr.dev y offchain.pub. Cualquier cliente verifica ambas firmas localmente en < 30 ms.', 'Broadcasts to primal.net, snort.social, nostr.oxtr.dev & offchain.pub. Any app verifies both proofs locally in < 30 ms.'),
                color: COLORS.paytacaTeal,
                icon: '🌐',
                footer: t('Verificación local < 30ms ✓', 'Local Crypto Verify < 30ms ✓')
            }
        ];

        steps.forEach((st, i) => {
            const x = startX + i * (cardW + gap);
            const y = 250;
            const sStart = stepTimes[i];
            const sEnd = i < 2 ? stepTimes[i + 1] : 999;
            const isActive = tTime >= sStart && tTime < sEnd;
            const isDone = tTime >= sEnd;
            const alpha = tTime < sStart ? 0.42 : 1.0;

            ctx.save();
            ctx.globalAlpha = alpha;
            if (isActive) {
                ctx.shadowColor = st.color;
                ctx.shadowBlur = 24;
            }
            ctx.fillStyle = isActive ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.82)';
            ctx.strokeStyle = isActive || isDone ? st.color : 'rgba(255,255,255,0.18)';
            ctx.lineWidth = isActive ? 3 : 1.5;
            ctx.beginPath();
            ctx.roundRect(x, y, cardW, cardH, 20);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            drawPill(x + 30, y + 25, 100, 32, t(`PASO ${st.num}`, `STEP ${st.num}`), st.color);

            ctx.font = '40px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(st.icon, x + cardW - 35, y + 55);

            ctx.fillStyle = COLORS.textMain;
            ctx.font = 'bold 22px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(st.title, x + 30, y + 105);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.moveTo(x + 30, y + 130);
            ctx.lineTo(x + cardW - 30, y + 130);
            ctx.stroke();

            ctx.fillStyle = COLORS.textMuted;
            ctx.font = '400 17px -apple-system, sans-serif';
            wrapText(ctx, st.desc, x + 30, y + 170, cardW - 60, 26);

            ctx.fillStyle = isActive ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)';
            ctx.beginPath();
            ctx.roundRect(x + 30, y + 330, cardW - 60, 65, 12);
            ctx.fill();

            ctx.fillStyle = st.color;
            ctx.font = 'bold 15px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(st.footer, x + cardW / 2, y + 370);
            ctx.restore();
        });

        drawSubtitleCard(
            t('Prueba Matemática Verificable por Cualquier Cliente', 'Mathematical Proof Verifiable Locally by Any Client'),
            t('Sin servidores custodios: la identidad se valida contra ambas claves públicas en tu navegador con verificación local < 30 ms.', 'Zero custodial middlemen: identity proofs are verified locally against both public keys in under 30 milliseconds.'),
            t('ARQUITECTURA NIP-01 / NIP-05', 'NIP-01 / NIP-05 ARCHITECTURE'),
            COLORS.bchGreen,
            false
        );
    }
}

// SCENE 3: REAL-WORLD VALUE & USE CASES
function renderScene3(tTime) {
    drawBackground(tTime);
    const cCues = getCues().s3;
    const cueTimes = [cCues.case1, cCues.case2, cCues.case3];

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('¿Para Qué Sirve en la Vida Real?', 'What is it Used For in Everyday Life?'), W / 2, 160);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 22px -apple-system, sans-serif';
    ctx.fillText(t('Tres Aplicaciones Inmediatas para Usuarios, Comercios y dApps Compatibles', 'Three Immediate Applications for Users, Merchants & Compatible dApps'), W / 2, 205);

    const cardW = 440;
    const cardH = 460;
    const gap = 50;
    const startX = 250;

    const cases = [
        {
            icon: '⚡',
            badge: t('PAGOS POR @USUARIO', 'PAYMENTS BY @HANDLE'),
            title: t('Paga en 1 Clic a @usuario', '1-Click Pay to @handle'),
            desc: t("Billeteras y dApps con UserLink SDK o NIP-05 resuelven tu @usuario o nombre@bliquid.xyz y abren pagos BIP-21 directos a Paytaca.", "Wallets and dApps integrating UserLink SDK or NIP-05 resolve your @handle or name@bliquid.xyz into 1-click BIP-21 BCH payments to Paytaca."),
            color: COLORS.btcOrange,
            simAction: t('@myuser ➔ Pago BIP-21 Paytaca ✓', '@myuser ➔ 1-Click BIP-21 Pay ✓')
        },
        {
            icon: '🛡️',
            badge: t('ANTI-SUPLANTACIÓN', 'ANTI-IMPERSONATION'),
            title: t('Protección Contra Estafas', 'Cryptographic Anti-Scam'),
            desc: t('Compradores y comercios comprueban en su navegador que la dirección BCH corresponde al perfil Nostr auténtico. Cero clones ni impostores.', 'Merchants and peers verify locally in the browser that a creator’s BCH address matches their Nostr identity. Zero clone accounts.'),
            color: COLORS.bchGreen,
            simAction: t('Identidad Verificada Localmente ✓', 'Locally Verified Authenticity ✓')
        },
        {
            icon: '🔑',
            badge: t('LOGIN SIN CONTRASEÑA', 'PASSWORDLESS LOGIN'),
            title: t('Acceso Web3 con Nostr / SDK', 'dApp Login via Nostr / SDK'),
            desc: t('Inicia sesión en tiendas y dApps que integren Nostr o UserLink SDK firmando un reto único en lugar de usar contraseñas vulnerables.', 'Sign into Web3 stores and dApps integrating Nostr or UserLink SDK with a fresh cryptographic challenge — zero password databases.'),
            color: COLORS.paytacaTeal,
            simAction: t('Verificación local < 30ms ✓', 'Local Auth Verify < 30ms ✓')
        }
    ];

    cases.forEach((c, i) => {
        const x = startX + i * (cardW + gap);
        const y = 240;
        const cStart = cueTimes[i];
        const cEnd = i < 2 ? cueTimes[i + 1] : 999;
        const isActive = tTime >= cStart && tTime < cEnd;
        const isDone = tTime >= cEnd;
        const alpha = tTime < cStart ? 0.42 : 1.0;

        ctx.save();
        ctx.globalAlpha = alpha;
        if (isActive) {
            ctx.shadowColor = c.color;
            ctx.shadowBlur = 24;
        }
        ctx.fillStyle = isActive ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.82)';
        ctx.strokeStyle = isActive || isDone ? c.color : 'rgba(255,255,255,0.18)';
        ctx.lineWidth = isActive ? 3 : 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 20);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        drawPill(x + 30, y + 25, 230, 30, c.badge, c.color);

        ctx.font = '45px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(c.icon, x + cardW - 35, y + 55);

        ctx.fillStyle = COLORS.textMain;
        ctx.font = 'bold 22px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(c.title, x + 30, y + 105);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(x + 30, y + 130);
        ctx.lineTo(x + cardW - 30, y + 130);
        ctx.stroke();

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '400 17px -apple-system, sans-serif';
        wrapText(ctx, c.desc, x + 30, y + 165, cardW - 60, 26);

        const simY = y + 360;
        ctx.fillStyle = isActive ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)';
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x + 30, simY, cardW - 60, 65, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = c.color;
        ctx.font = 'bold 16px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(c.simAction, x + cardW / 2, simY + 38);

        ctx.restore();
    });

    drawSubtitleCard(
        t('De Identidades Legibles al Comercio Web3 Sin Custodia', 'From Human Handles to Non-Custodial Web3 Payments'),
        t('Resolución NIP-05, pagos BIP-21 hacia Paytaca y pruebas verificables en el navegador sin comisiones de gas.', 'NIP-05 handle resolution, 1-click BIP-21 Paytaca payments, and browser-verifiable Nostr proofs at zero gas cost.'),
        t('CASOS DE USO REALES', 'REAL-WORLD UTILITY'),
        COLORS.btcOrange
    );
}

// SCENE 4: CRYPTOGRAPHIC SECURITY & KEY ISOLATION
function renderScene4(tTime) {
    drawBackground(tTime);
    const c = getCues().s4;

    const firewallLit = tTime >= c.firewall;
    const leftLit = tTime >= c.left;
    const rightLit = tTime >= c.right;
    const summaryLit = tTime >= c.summary;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('Seguridad Criptográfica y Separación de Claves', 'Cryptographic Security & Key Separation'), W / 2, 160);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 22px -apple-system, sans-serif';
    ctx.fillText(t('Aislamiento Estricto entre tu Billetera Local BCH y tu Clave de Navegador Nostr', 'Strict Isolation Between Your Local BCH Wallet and Browser Nostr Key'), W / 2, 205);

    const v1X = 280;
    const vY = 250;
    const vW = 540;
    const vH = 450;

    // Left: Local BCH Wallet Extension
    ctx.save();
    ctx.globalAlpha = leftLit ? 1.0 : 0.42;
    if (leftLit && !rightLit) {
        ctx.shadowColor = COLORS.bchGreen;
        ctx.shadowBlur = 24;
    }
    ctx.fillStyle = leftLit ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.06)';
    ctx.strokeStyle = COLORS.bchGreen;
    ctx.lineWidth = leftLit ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.roundRect(v1X, vY, vW, vH, 20);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    drawPill(v1X + 35, vY + 30, 320, 32, t('BILLETERA LOCAL (PAYTACA / CASHONIZE)', 'LOCAL WALLET EXTENSION (PAYTACA)'), COLORS.bchGreen);

    ctx.font = '50px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🛡️', v1X + vW / 2, vY + 130);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.fillText(t('Clave Privada BCH en tu Extensión', 'BCH Private Key Stays Local'), v1X + vW / 2, vY + 190);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillText(t('Firma secp256k1 local en Paytaca o Cashonize.', 'Signs secp256k1 strictly inside your wallet extension.'), v1X + vW / 2, vY + 230);
    ctx.fillText(t('Jamás se envía a ningún servidor backend.', 'Never leaves your device or touches a server.'), v1X + vW / 2, vY + 260);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
    ctx.beginPath();
    ctx.roundRect(v1X + 40, vY + 320, vW - 80, 80, 12);
    ctx.fill();
    ctx.fillStyle = COLORS.bchGreen;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(t('✓ Fondos BCH 100% Bajo tu Control', '✓ BCH Funds Never Exposed'), v1X + vW / 2, vY + 365);
    ctx.restore();

    // Center Separation Firewall
    const wallX = 890;
    ctx.save();
    ctx.globalAlpha = firewallLit ? 1.0 : 0.45;
    if (firewallLit || summaryLit) {
        ctx.shadowColor = COLORS.dangerRed;
        ctx.shadowBlur = summaryLit ? 26 : 16;
    }
    ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
    ctx.strokeStyle = COLORS.dangerRed;
    ctx.lineWidth = summaryLit ? 3 : 2;
    ctx.beginPath();
    ctx.roundRect(wallX, vY + 40, 140, vH - 80, 12);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = COLORS.dangerRed;
    ctx.font = 'bold 14px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('SEPARACIÓN', 'STRICT'), wallX + 70, vY + 180);
    ctx.fillText(t('TOTAL DE', 'KEY'), wallX + 70, vY + 205);
    ctx.fillText(t('CLAVES', 'ISOLATION'), wallX + 70, vY + 230);

    ctx.font = '32px sans-serif';
    ctx.fillText('🧱', wallX + 70, vY + 290);
    ctx.restore();

    // Right: Local Browser / NIP-07 Nostr Key
    const v2X = 1100;
    ctx.save();
    ctx.globalAlpha = rightLit ? 1.0 : 0.42;
    if (rightLit && !summaryLit) {
        ctx.shadowColor = COLORS.nostrPurple;
        ctx.shadowBlur = 24;
    }
    ctx.fillStyle = rightLit ? 'rgba(138, 43, 226, 0.14)' : 'rgba(138, 43, 226, 0.06)';
    ctx.strokeStyle = COLORS.nostrPurple;
    ctx.lineWidth = rightLit ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.roundRect(v2X, vY, vW, vH, 20);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    drawPill(v2X + 35, vY + 30, 310, 32, t('NAVEGADOR / EXTENSIÓN NIP-07', 'BROWSER / NIP-07 NOSTR KEY'), COLORS.nostrPurple);

    ctx.font = '50px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔑', v2X + vW / 2, vY + 130);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.fillText(t('Clave Social Nostr Independiente', 'Isolated Nostr Identity Key'), v2X + vW / 2, vY + 190);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillText(t('Firma eventos Kind 30078 con BIP-340 Schnorr.', 'Signs Kind 30078 proofs using BIP-340 Schnorr.'), v2X + vW / 2, vY + 230);
    ctx.fillText(t('Rotable en cualquier momento sin tocar tus UTXOs.', 'Rotatable anytime without touching BCH UTXOs.'), v2X + vW / 2, vY + 260);

    ctx.fillStyle = 'rgba(138, 43, 226, 0.16)';
    ctx.beginPath();
    ctx.roundRect(v2X + 40, vY + 320, vW - 80, 80, 12);
    ctx.fill();
    ctx.fillStyle = COLORS.nostrPurple;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(t('✓ Solo Firma Atestaciones Públicas', '✓ Identity Proofs Only'), v2X + vW / 2, vY + 365);
    ctx.restore();

    drawSubtitleCard(
        t('Tus Fondos y tu Identidad Permanecen Estrictamente Segregados', 'Your Funds and Identity Keys Remain Strictly Segregated'),
        t('Incluso si rotas o reemplazas tu clave de Nostr, tus fondos en Bitcoin Cash siguen 100% separados e intactos en Paytaca.', 'Even if you rotate or replace your Nostr key, your BCH balance remains completely isolated and safe inside Paytaca.'),
        t('AISLAMIENTO CRIPTOGRÁFICO', 'CRYPTOGRAPHIC SEPARATION'),
        COLORS.bchGreen,
        summaryLit
    );
}

// SCENE 5: DIRECT COMPARISON: USERLINK VS WEB2 VS ENS
function renderScene5(tTime) {
    drawBackground(tTime);
    const rowTimes = getCues().s5.rows;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('Comparativa: UserLink vs Sistemas Tradicionales', 'Direct Comparison: UserLink vs Traditional'), W / 2, 160);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 22px -apple-system, sans-serif';
    ctx.fillText(t('Por Qué UserLink Supera a Web2 y a los Dominios Tradicionales en L1', 'Why UserLink Outperforms Web2 and Legacy L1 Name Services'), W / 2, 205);

    const tX = 260;
    const tY = 250;
    const tW = 1400;
    const rowH = 90;

    const rows = [
        {
            feature: t('Costo de Registro en Gas', 'Registration Gas Fee'),
            web2: t('Gratis (Tus datos pagan)', 'Free (Your data pays)'),
            ens: t('Gas Variable ETH ($15–$50+)', 'Steep L1 Gas ($15–$50+)'),
            sovereign: t('$0.00 USD (Cero Gas)', '$0.00 USD (Zero Gas)')
        },
        {
            feature: t('Cuota de Renovación Anual', 'Annual Renewal Rent'),
            web2: t('Sujeto a TOS corporativo', 'Subject to corporate TOS'),
            ens: t('Pago anual recurrente', 'Recurring yearly fee'),
            sovereign: t('Gratis Vitalicio', 'Lifetime Free')
        },
        {
            feature: t('Resistencia a Censura', 'Censorship Resistance'),
            web2: t('Baja (Cuentas suspendibles)', 'Low (Account bans anytime)'),
            ens: t('Media (Contratos / registradores)', 'Medium (Contract governance)'),
            sovereign: t('Alta (Firmas P2P en 4 Relays)', 'High (P2P Across 4 Relays)')
        },
        {
            feature: t('Pagos en Efectivo P2P', 'Native P2P Cash Payments'),
            web2: t('No (Bancos / tarjetas)', 'No (Custodial rails / cards)'),
            ens: t('Caro y lento en L1', 'Expensive on congested L1'),
            sovereign: t('Directo a Paytaca en BCH', 'Direct to Paytaca via BCH')
        }
    ];

    // Table Headers
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(tX, tY, tW, 60);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = 'bold 18px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(t('CARACTERÍSTICA', 'FEATURE'), tX + 30, tY + 38);
    ctx.textAlign = 'center';
    ctx.fillText('WEB2 (GOOGLE / META)', tX + 460, tY + 38);
    ctx.fillText('ETHEREUM ENS (.ETH)', tX + 800, tY + 38);
    ctx.fillStyle = COLORS.paytacaTeal;
    ctx.fillText('USERLINK (BCH + NOSTR)', tX + 1170, tY + 38);

    rows.forEach((r, idx) => {
        const rY = tY + 60 + idx * rowH;
        const rStart = rowTimes[idx];
        const rEnd = idx < 3 ? rowTimes[idx + 1] : 999;
        const isActive = tTime >= rStart && tTime < rEnd;
        const alpha = tTime < rStart ? 0.35 : 1.0;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = isActive
            ? 'rgba(0, 209, 178, 0.09)'
            : (idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)');
        ctx.fillRect(tX, rY, tW, rowH);

        if (isActive) {
            ctx.strokeStyle = COLORS.paytacaTeal;
            ctx.lineWidth = 2;
            ctx.strokeRect(tX, rY, tW, rowH);
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(r.feature, tX + 30, rY + 52);

        ctx.fillStyle = COLORS.dangerRed;
        ctx.font = '16px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(r.web2, tX + 460, rY + 52);

        ctx.fillStyle = COLORS.btcOrange;
        ctx.fillText(r.ens, tX + 800, rY + 52);

        ctx.fillStyle = isActive ? 'rgba(0, 209, 178, 0.25)' : 'rgba(0, 209, 178, 0.14)';
        ctx.beginPath();
        ctx.roundRect(tX + 980, rY + 12, 380, rowH - 24, 10);
        ctx.fill();

        ctx.fillStyle = COLORS.paytacaTeal;
        ctx.font = 'bold 17px -apple-system, sans-serif';
        ctx.fillText(`✓ ${r.sovereign}`, tX + 1170, rY + 52);
        ctx.restore();
    });

    drawSubtitleCard(
        t('La Libertad Digital No Debe Pagar Impuesto de Gas', 'Digital Freedom Should Not Pay an Annual Gas Tax'),
        t('UserLink ofrece identidad portable con costo de gas cero, sin rentas anuales y pagos nativos en Bitcoin Cash.', 'UserLink delivers portable decentralized identity with zero gas fees, zero annual rents, and native Bitcoin Cash payments.'),
        t('VENTAJA COMPETITIVA', 'COMPETITIVE EDGE'),
        COLORS.paytacaTeal
    );
}

// SCENE 6: HOW TO USE IN 3 SIMPLE STEPS
function renderScene6(tTime) {
    drawBackground(tTime);
    const cCues = getCues().s6;
    const stepTimes = [cCues.step1, cCues.step2, cCues.step3];
    const doneLit = tTime >= cCues.done;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('Cómo Usar UserLink en 3 Sencillos Pasos', 'How to Use UserLink in 3 Simple Steps'), W / 2, 160);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 22px -apple-system, sans-serif';
    ctx.fillText(t('Tu Identidad Verificada en Nostr en Menos de 30 Segundos', 'Your Cryptographically Verified Nostr Identity in Under 30 Seconds'), W / 2, 205);

    const cardW = 440;
    const cardH = 460;
    const gap = 50;
    const startX = 250;

    const steps = [
        {
            num: '01',
            icon: '📲',
            title: t('Conecta Paytaca o Cashonize', 'Connect Paytaca / Cashonize'),
            desc: t('Entra a bliquid.xyz/identity y conecta tu billetera Bitcoin Cash (Paytaca o Cashonize) con un solo clic.', 'Visit bliquid.xyz/identity and connect your Bitcoin Cash wallet like Paytaca or Cashonize in a single click.'),
            mock: t('🟢 Conectado: qr5zz...sefgn', '🟢 Connected: qr5zz...sefgn'),
            color: COLORS.btcOrange
        },
        {
            num: '02',
            icon: '✍️',
            title: t('Autoriza la Doble Firma', 'Authorize Dual Signature'),
            desc: t('Firma localmente la atestación canónica: Paytaca sella con secp256k1 (ECDSA) y Nostr sella con BIP-340 Schnorr.', 'Locally sign the canonical statement: Paytaca signs with secp256k1 (ECDSA) and Nostr signs with BIP-340 Schnorr.'),
            mock: t('🔐 Firmado: secp256k1 + Schnorr ✓', '🔐 Signed: secp256k1 + Schnorr ✓'),
            color: COLORS.bchGreen
        },
        {
            num: '03',
            icon: '🎉',
            title: t('Publica en Relays + NIP-05', 'Broadcast Relays + NIP-05'),
            desc: t('Se transmite a primal.net, snort.social, nostr.oxtr.dev y offchain.pub, activando pagos directos y acceso sin contraseña.', 'Broadcasts Kind 30078 to primal.net, snort.social, nostr.oxtr.dev & offchain.pub with optional NIP-05 handle.'),
            mock: t('🌐 4 Relays Nostr · Verificado < 30ms ✓', '🌐 4 Relays · Local Verify < 30ms ✓'),
            color: COLORS.paytacaTeal
        }
    ];

    steps.forEach((st, i) => {
        const x = startX + i * (cardW + gap);
        const y = 240;
        const sStart = stepTimes[i];
        const sEnd = i < 2 ? stepTimes[i + 1] : cCues.done;
        const isActive = tTime >= sStart && tTime < sEnd;
        const isDone = tTime >= sEnd;
        const alpha = tTime < sStart ? 0.42 : 1.0;

        ctx.save();
        ctx.globalAlpha = alpha;
        if (isActive) {
            ctx.shadowColor = st.color;
            ctx.shadowBlur = 24;
        }
        ctx.fillStyle = isActive ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.82)';
        ctx.strokeStyle = isActive || isDone ? st.color : 'rgba(255,255,255,0.18)';
        ctx.lineWidth = isActive ? 3 : 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 20);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        drawPill(x + 30, y + 25, 110, 32, t(`PASO ${st.num}`, `STEP ${st.num}`), st.color);

        ctx.font = '45px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(st.icon, x + cardW - 35, y + 55);

        ctx.fillStyle = COLORS.textMain;
        ctx.font = 'bold 22px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(st.title, x + 30, y + 105);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(x + 30, y + 130);
        ctx.lineTo(x + cardW - 30, y + 130);
        ctx.stroke();

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '400 17px -apple-system, sans-serif';
        wrapText(ctx, st.desc, x + 30, y + 165, cardW - 60, 26);

        const mY = y + 360;
        ctx.fillStyle = isActive ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)';
        ctx.strokeStyle = st.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x + 30, mY, cardW - 60, 65, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = st.color;
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(st.mock, x + cardW / 2, mY + 38);
        ctx.restore();
    });

    drawSubtitleCard(
        t('Verificación Local en < 30ms sin Esperas ni Descargas', 'Verified Locally in < 30ms Without Friction'),
        t('El proceso criptográfico ocurre directamente en tu navegador y billetera local sin intermediarios.', 'Every cryptographic step runs locally inside your browser and wallet with zero third-party custodians.'),
        t('GUÍA RÁPIDA EN 3 PASOS', '3-STEP QUICKSTART'),
        COLORS.bchGreen,
        doneLit
    );
}

// SCENE 7: GRAND FINALE — SPOTLIGHT TO PAYTACA & BCH BLAZE 2026
function renderScene7(tTime) {
    drawBackground(tTime);
    const cCues = getCues().s7;
    const tributeLit = tTime >= cCues.tribute;
    const ctaLit = tTime >= cCues.cta;
    const closingLit = tTime >= cCues.closing;

    ctx.save();
    for (let i = 0; i < 25; i++) {
        const pX = (W / 2) + Math.cos(tTime * 2 + i) * (300 + (i * 20));
        const pY = 400 + Math.sin(tTime * 3 + i * 2) * 160;
        ctx.fillStyle = i % 2 === 0 ? COLORS.paytacaTeal : COLORS.btcOrange;
        ctx.beginPath();
        ctx.arc(pX, pY, 3 + (i % 4), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('Soberanía Digital: Impulsada por Paytaca y Bitcoin Cash', 'Digital Sovereignty: Powered by Paytaca & Bitcoin Cash'), W / 2, 160);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 22px -apple-system, sans-serif';
    ctx.fillText(t('Entrega Oficial BCH BLAZE 2026 · Pista Paytaca Decentralized Identity ($500 PUSD)', 'Official Submission · BCH BLAZE 2026 · Paytaca Decentralized Identity ($500 PUSD)'), W / 2, 205);

    const cX = W / 2;
    const cY = 435;

    const aura = ctx.createRadialGradient(cX, cY, 40, cX, cY, 340);
    aura.addColorStop(0, tributeLit ? 'rgba(0, 209, 178, 0.30)' : 'rgba(0, 209, 178, 0.18)');
    aura.addColorStop(0.5, 'rgba(247, 147, 26, 0.14)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(cX - 360, cY - 360, 720, 720);

    ctx.save();
    if (tributeLit) {
        ctx.shadowColor = COLORS.paytacaTeal;
        ctx.shadowBlur = 24;
    }
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = COLORS.paytacaTeal;
    ctx.lineWidth = tributeLit ? 3 : 2;
    ctx.beginPath();
    ctx.roundRect(cX - 440, cY - 165, 880, 330, 24);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    drawPill(cX - 240, cY - 140, 480, 36, t('🏆 BCH BLAZE 2026 · PAYTACA IDENTITY ($500 PUSD)', '🏆 BCH BLAZE 2026 · PAYTACA IDENTITY ($500 PUSD)'), COLORS.btcOrange);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 34px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('Homenaje y Agradecimiento a Paytaca', 'Special Tribute & Thanks to Paytaca'), cX, cY - 48);

    ctx.fillStyle = COLORS.paytacaTeal;
    ctx.font = 'bold 23px -apple-system, sans-serif';
    ctx.fillText(t('www.paytaca.com · Estándares No Custodiales en Bitcoin Cash', 'www.paytaca.com · Non-Custodial Standards on Bitcoin Cash'), cX, cY - 4);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '18px -apple-system, sans-serif';
    ctx.fillText(t('Dinero Soberano (BCH) + Identidad Soberana (Nostr) = Libertad Total', 'Sovereign Cash (BCH) + Sovereign Identity (Nostr) = Digital Freedom'), cX, cY + 42);

    ctx.save();
    if (ctaLit) {
        ctx.shadowColor = COLORS.bchGreen;
        ctx.shadowBlur = 20;
    }
    drawPill(cX - 230, cY + 78, 460, 52, '🚀 PROBAR EN VIVO: BLIQUID.XYZ/IDENTITY', COLORS.bchGreen);
    ctx.restore();
    ctx.restore();

    drawSubtitleCard(
        t('Gracias a Paytaca por Impulsar la Revolución No Custodial', 'Special Tribute to Paytaca for Championing Non-Custodial Innovation'),
        t('Desarrollado con orgullo por Drian Stack Labs (@drianops). Código abierto para toda la comunidad de Bitcoin Cash.', 'Built with pride by Drian Stack Labs (@drianops). Open-source infrastructure for the global Bitcoin Cash community.'),
        t('GRAN CIERRE', 'GRAND FINALE'),
        COLORS.paytacaTeal,
        closingLit
    );
}

// ==============================================================================
// AUDIO ENGINE, SUBTLE AMBIENT BGM & PLAYBACK CONTROLLER
// ==============================================================================

function ensureBgmAudio() {
    if (!bgmAudio) {
        bgmAudio = new Audio('./ambient_bgm.mp3');
        bgmAudio.loop = true;
        bgmAudio.volume = 0.065;
    }
}

function syncBgmPlayback(active) {
    ensureBgmAudio();
    if (active) {
        bgmAudio.play().catch(() => {});
    } else if (bgmAudio && !bgmAudio.paused) {
        bgmAudio.pause();
    }
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
        if (isPlaying && currentAudio && !currentAudio.paused) {
            sceneTime = currentAudio.currentTime;
        }
    });

    currentAudio.addEventListener('ended', () => {
        if (currentSceneIndex < SCENES.length - 1) {
            loadScene(currentSceneIndex + 1, true);
        } else {
            isPlaying = false;
            syncBgmPlayback(false);
            updateUI();
        }
    });

    if (shouldPlay) {
        isPlaying = true;
        currentAudio.play().catch(e => console.log('Audio autoplay prevented:', e));
        syncBgmPlayback(true);
    } else {
        isPlaying = false;
        syncBgmPlayback(false);
    }

    updateUI();
}

function updateUI() {
    const cur = SCENES[currentSceneIndex];
    const curDur = getCurDuration();

    const titleEl = document.getElementById('video-title');
    if (titleEl) {
        titleEl.textContent = currentLang === 'es' ? cur.titleEs : cur.titleEn;
    }

    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) {
        btnPlay.textContent = isPlaying
            ? (currentLang === 'es' ? '⏸ Pausar' : '⏸ Pause')
            : (currentLang === 'es' ? '▶ Play' : '▶ Play');
    }

    const td = document.getElementById('time-display');
    if (td) {
        td.textContent = `${formatTime(sceneTime)} / ${formatTime(curDur)}`;
    }

    const pb = document.getElementById('progress-bar');
    if (pb) {
        const pct = Math.min(100, Math.max(0, (sceneTime / curDur) * 100));
        pb.style.width = pct + '%';
    }

    document.querySelectorAll('.scene-pill').forEach((pill, idx) => {
        if (idx === currentSceneIndex) {
            pill.classList.add('active');
            pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else {
            pill.classList.remove('active');
        }
    });
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
    setupPills();

    if (wasPlaying) {
        loadScene(currentSceneIndex, true);
    } else {
        syncBgmPlayback(false);
        updateUI();
    }
}

function formatTime(seconds) {
    const s = Math.floor(seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function setupPills() {
    const container = document.getElementById('scene-pills');
    if (!container) return;
    container.innerHTML = '';

    SCENES.forEach((scene, idx) => {
        const btn = document.createElement('button');
        btn.className = `scene-pill ${idx === currentSceneIndex ? 'active' : ''}`;
        btn.textContent = currentLang === 'es' ? scene.chapterEs : scene.chapterEn;
        btn.onclick = () => {
            loadScene(idx, isPlaying);
        };
        container.appendChild(btn);
    });
}

function drawSceneByIndex(idx, tTime) {
    switch (idx) {
        case 0: renderScene1(tTime); break;
        case 1: renderScene2(tTime); break;
        case 2: renderScene3(tTime); break;
        case 3: renderScene4(tTime); break;
        case 4: renderScene5(tTime); break;
        case 5: renderScene6(tTime); break;
        case 6: renderScene7(tTime); break;
    }
}

// Main Animation Loop (Prevents buffering drift when Audio is loading)
function loop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    const curDur = getCurDuration();

    if (isPlaying) {
        if (currentAudio && !currentAudio.error) {
            if (!currentAudio.paused) {
                sceneTime = currentAudio.currentTime;
            }
            // Wait for audio buffer rather than advancing visual clock prematurely
        } else {
            sceneTime += delta;
        }

        if (sceneTime >= curDur) {
            if (currentSceneIndex < SCENES.length - 1) {
                loadScene(currentSceneIndex + 1, true);
            } else {
                isPlaying = false;
                syncBgmPlayback(false);
                sceneTime = curDur;
                updateUI();
            }
        }
    }

    const pct = Math.min(100, Math.max(0, (sceneTime / curDur) * 100));
    const pb = document.getElementById('progress-bar');
    if (pb) pb.style.width = pct + '%';
    const td = document.getElementById('time-display');
    if (td) td.textContent = `${formatTime(sceneTime)} / ${formatTime(curDur)}`;

    drawSceneByIndex(currentSceneIndex, sceneTime);
    animationFrameId = requestAnimationFrame(loop);
}

// Event Listeners
document.getElementById('btn-play')?.addEventListener('click', () => {
    if (!isPlaying) {
        if (!currentAudio) {
            const scene = SCENES[currentSceneIndex];
            const audioPath = currentLang === 'es' ? scene.audioEs : scene.audioEn;
            currentAudio = new Audio(audioPath);
            currentAudio.currentTime = sceneTime;

            currentAudio.addEventListener('timeupdate', () => {
                if (isPlaying && currentAudio && !currentAudio.paused) {
                    sceneTime = currentAudio.currentTime;
                }
            });

            currentAudio.addEventListener('ended', () => {
                if (currentSceneIndex < SCENES.length - 1) {
                    loadScene(currentSceneIndex + 1, true);
                } else {
                    isPlaying = false;
                    syncBgmPlayback(false);
                    updateUI();
                }
            });
        }
        isPlaying = true;
        currentAudio.play().catch(e => console.log('Playback error:', e));
        syncBgmPlayback(true);
    } else {
        isPlaying = false;
        if (currentAudio) currentAudio.pause();
        syncBgmPlayback(false);
    }
    updateUI();
});

document.getElementById('btn-prev')?.addEventListener('click', () => {
    if (currentSceneIndex > 0) loadScene(currentSceneIndex - 1, isPlaying);
});

document.getElementById('btn-next')?.addEventListener('click', () => {
    if (currentSceneIndex < SCENES.length - 1) loadScene(currentSceneIndex + 1, isPlaying);
});

document.getElementById('btn-lang-en')?.addEventListener('click', () => setLanguage('en'));
document.getElementById('btn-lang-es')?.addEventListener('click', () => setLanguage('es'));

document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
    const el = document.getElementById('stage-container');
    if (!el) return;
    if (!document.fullscreenElement) {
        el.requestFullscreen().catch(err => console.warn(err));
    } else {
        document.exitFullscreen().catch(err => console.warn(err));
    }
});

document.getElementById('progress-bar-container')?.addEventListener('click', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const curDur = getCurDuration();
    sceneTime = pos * curDur;
    if (currentAudio) {
        currentAudio.currentTime = sceneTime;
    }
    updateUI();
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        document.getElementById('btn-play')?.click();
    } else if (e.code === 'ArrowRight') {
        document.getElementById('btn-next')?.click();
    } else if (e.code === 'ArrowLeft') {
        document.getElementById('btn-prev')?.click();
    } else if (e.key === 'f' || e.key === 'F') {
        document.getElementById('btn-fullscreen')?.click();
    }
});

// Deterministic Headless Frame Helpers
window.setLanguage = setLanguage;
window.prepareRecording = function(sceneIndex, lang) {
    if (lang) setLanguage(lang);
    currentSceneIndex = Math.max(0, Math.min(SCENES.length - 1, sceneIndex));
    sceneTime = 0;
    isPlaying = false;
    syncBgmPlayback(false);
    updateUI();
};
window.renderAtTime = function(tTime) {
    sceneTime = tTime;
    drawSceneByIndex(currentSceneIndex, tTime);
};

// Initial URL query parameters
try {
    const params = new URLSearchParams(window.location.search);
    const sceneParam = params.get('scene') || window.location.hash.replace('#', '');
    if (sceneParam) {
        const sIdx = parseInt(sceneParam, 10);
        if (!isNaN(sIdx) && sIdx >= 1 && sIdx <= SCENES.length) {
            currentSceneIndex = sIdx - 1;
        }
    }
    const langParam = params.get('lang');
    if (langParam === 'es' || langParam === 'en') {
        currentLang = langParam;
    }
    const tParam = parseFloat(params.get('t'));
    if (!isNaN(tParam) && tParam >= 0) {
        sceneTime = tParam;
    }
} catch (e) {}

if (currentLang === 'es') {
    document.getElementById('btn-lang-es')?.classList.add('active');
    document.getElementById('btn-lang-en')?.classList.remove('active');
} else {
    document.getElementById('btn-lang-en')?.classList.add('active');
    document.getElementById('btn-lang-es')?.classList.remove('active');
}

setupPills();
updateUI();
requestAnimationFrame(loop);
