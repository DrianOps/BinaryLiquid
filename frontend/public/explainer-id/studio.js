/**
 * SovereignLink Video Explainer Studio
 * 1080p High-Fidelity Vector Motion Graphics Renderer & Audio Engine
 * Bilingual Voiceover: 🇪🇸 Español (es-MX-JorgeNeural) + 🇺🇸 English (en-US-ChristopherNeural)
 * Built for BCH BLAZE 2026 Hackathon · Powered by Paytaca & Drian Stack Labs
 */

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const W = 1920;
const H = 1080;

let currentLang = 'es'; // default Spanish as requested by user
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

// 7 Scenes Configuration with Exact Neural Audio Files and Durations
const SCENES = [
    {
        id: 1,
        titleEs: "1. La Trampa de la Identidad Centralizada y el Gas",
        titleEn: "1. The Centralized Identity & Gas Fee Trap",
        chapterEs: "El Dilema",
        chapterEn: "The Trap",
        durationEs: 38.90,
        durationEn: 30.14,
        audioEs: "./audio/scene1_es.mp3",
        audioEn: "./audio/scene1.mp3"
    },
    {
        id: 2,
        titleEs: "2. ¿Qué es SovereignLink? — Pagos por Nombre de Usuario",
        titleEn: "2. What is SovereignLink? — Payments by Username",
        chapterEs: "Qué y Cómo",
        chapterEn: "What & How",
        durationEs: 54.79,
        durationEn: 50.74,
        audioEs: "./audio/scene2_es.mp3",
        audioEn: "./audio/scene2.mp3"
    },
    {
        id: 3,
        titleEs: "3. ¿Para Qué Sirve? — Pagos P2P sin Direcciones Largas",
        titleEn: "3. Real-World Utility — P2P Payments Without Long Hashes",
        chapterEs: "Para Qué Sirve",
        chapterEn: "Use Cases",
        durationEs: 38.54,
        durationEn: 35.78,
        audioEs: "./audio/scene3_es.mp3",
        audioEn: "./audio/scene3.mp3"
    },
    {
        id: 4,
        titleEs: "4. Seguridad Criptográfica Impenetrable",
        titleEn: "4. Unbreakable Cryptographic Security",
        chapterEs: "Seguridad",
        chapterEn: "Security",
        durationEs: 32.11,
        durationEn: 25.25,
        audioEs: "./audio/scene4_es.mp3",
        audioEn: "./audio/scene4.mp3"
    },
    {
        id: 5,
        titleEs: "5. Comparativa: Soberano vs Sistemas Tradicionales",
        titleEn: "5. Direct Comparison: Sovereign vs Traditional",
        chapterEs: "Ventajas",
        chapterEn: "Comparison",
        durationEs: 29.09,
        durationEn: 23.57,
        audioEs: "./audio/scene5_es.mp3",
        audioEn: "./audio/scene5.mp3"
    },
    {
        id: 6,
        titleEs: "6. Cómo Usar SovereignLink en 3 Sencillos Pasos",
        titleEn: "6. How to Use SovereignLink in 3 Simple Steps",
        chapterEs: "3 Pasos",
        chapterEn: "How to Use",
        durationEs: 26.59,
        durationEn: 24.94,
        audioEs: "./audio/scene6_es.mp3",
        audioEn: "./audio/scene6.mp3"
    },
    {
        id: 7,
        titleEs: "7. Gran Cierre — Homenaje y Patrocinio a Paytaca",
        titleEn: "7. Grand Finale — Spotlight & Tribute to Paytaca",
        chapterEs: "Paytaca",
        chapterEn: "Paytaca Spotlight",
        durationEs: 32.64,
        durationEn: 29.90,
        audioEs: "./audio/scene7_es.mp3",
        audioEn: "./audio/scene7.mp3"
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

function getCurDuration() {
    return currentLang === 'es' ? SCENES[currentSceneIndex].durationEs : SCENES[currentSceneIndex].durationEn;
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
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, 0, W, 80);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, 80);
    ctx.lineTo(W, 80);
    ctx.stroke();

    // SovereignLink Brand
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
    ctx.fillText('SovereignLink', 120, 48);
    const brandW = ctx.measureText('SovereignLink').width;

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 16px -apple-system, sans-serif';
    ctx.fillText(t('•  Identidad Descentralizada Bitcoin Cash & Nostr', '•  Decentralized Identity for Bitcoin Cash & Nostr'), 120 + brandW + 18, 47);

    // Track Badges (Top Right)
    drawPill(1400, 24, 230, 32, 'BCH BLAZE 2026 ($500)', COLORS.btcOrange);
    drawPill(1650, 24, 210, 32, 'POWERED BY PAYTACA', COLORS.paytacaTeal);
}

function drawPill(x, y, w, h, text, color) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
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

    // 3. Fallback / Custom Symbol
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${radius * 0.85}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, x, floatY + 2);

    // 4. Glass Sheen
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

function drawSubtitleCard(title, body, badgeText, badgeColor = COLORS.bchGreen) {
    ctx.save();
    const boxW = 1400;
    const boxH = 150;
    const boxX = (W - boxW) / 2;
    const boxY = H - 190;

    ctx.fillStyle = 'rgba(8, 11, 17, 0.94)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 18);
    ctx.fill();
    ctx.stroke();

    drawPill(boxX + 35, boxY + 24, 260, 30, badgeText, badgeColor);

    ctx.fillStyle = COLORS.textMain;
    ctx.font = 'bold 26px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, boxX + 315, boxY + 46);

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
            context.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    context.fillText(line, x, currentY);
}

// ==============================================================================
// 7 SCENES ANIMATION RENDERERS (BILINGUAL WITH SIMULATIONS)
// ==============================================================================

// SCENE 1: THE CENTRALIZED IDENTITY TRAP
function renderScene1(tTime) {
    drawBackground(tTime);

    // Title Header
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('¿Quién es el Dueño de tu Identidad en la Red?', 'Who Owns Your Identity on the Web?'), W / 2, 160);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 22px -apple-system, sans-serif';
    ctx.fillText(t('La Trampa de los Monopolios Web2 y las Comisiones Excesivas de Web3', 'The Big Tech Web2 Monopolies & Traditional Web3 Gas Trap'), W / 2, 205);

    // Left Simulation: Corporate Server Rack & Account Ban
    const c1X = 220;
    const c1Y = 250;
    const cW = 680;
    const cH = 460;

    ctx.save();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.strokeStyle = COLORS.dangerRed;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(c1X, c1Y, cW, cH, 20);
    ctx.fill();
    ctx.stroke();

    drawPill(c1X + 35, c1Y + 30, 280, 32, t('❌ RIESGO WEB2: MONOPOLIOS', '❌ WEB2 RISK: BIG TECH MONOPOLY'), COLORS.dangerRed);

    // Server rack graphic
    const rackX = c1X + 60;
    const rackY = c1Y + 90;
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.roundRect(rackX, rackY, 220, 240, 12);
    ctx.fill();
    ctx.stroke();

    // Server blades with blinking LEDs
    for (let i = 0; i < 4; i++) {
        const bY = rackY + 20 + i * 50;
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(rackX + 15, bY, 190, 36);
        // Blinking red/yellow LEDs
        ctx.fillStyle = (Math.sin(tTime * 5 + i) > 0) ? COLORS.dangerRed : '#475569';
        ctx.beginPath();
        ctx.arc(rackX + 35, bY + 18, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(rackX + 55, bY + 18, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    // Ban Lockout Animation
    const lockX = c1X + 330;
    const lockY = c1Y + 130;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.strokeStyle = COLORS.dangerRed;
    ctx.beginPath();
    ctx.roundRect(lockX, lockY, 280, 180, 14);
    ctx.fill();
    ctx.stroke();

    ctx.font = '40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔒', lockX + 140, lockY + 55);

    ctx.fillStyle = COLORS.dangerRed;
    ctx.font = 'bold 20px -apple-system, sans-serif';
    ctx.fillText(t('CUENTA SUSPENDIDA', 'ACCOUNT SUSPENDED'), lockX + 140, lockY + 100);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '14px -apple-system, sans-serif';
    ctx.fillText(t('Cero claves = Cero control', 'No private keys = No control'), lockX + 140, lockY + 130);
    ctx.fillText(t('Tus datos son monetizados', 'Your data is sold to brokers'), lockX + 140, lockY + 152);

    ctx.restore();

    // Right Simulation: Ethereum ENS Gas Trap
    const c2X = 1020;
    const c2Y = 250;

    ctx.save();
    ctx.fillStyle = 'rgba(247, 147, 26, 0.08)';
    ctx.strokeStyle = COLORS.btcOrange;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(c2X, c2Y, cW, cH, 20);
    ctx.fill();
    ctx.stroke();

    drawPill(c2X + 35, c2Y + 30, 310, 32, t('⚠️ WEB3 TRADICIONAL: TRAMPA DE GAS', '⚠️ TRADITIONAL WEB3: GAS TRAP'), COLORS.btcOrange);

    // Gas Meter Gauge
    const gaugeX = c2X + 160;
    const gaugeY = c2Y + 210;
    const gaugeR = 90;

    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, gaugeR, Math.PI * 0.8, Math.PI * 2.2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 14;
    ctx.stroke();

    // Red high gas arc
    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, gaugeR, Math.PI * 1.5, Math.PI * 2.2);
    ctx.strokeStyle = COLORS.dangerRed;
    ctx.lineWidth = 14;
    ctx.stroke();

    // Needle shaking in red zone
    const needleAngle = Math.PI * 1.8 + Math.sin(tTime * 8) * 0.15;
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
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('95 Gwei ($48.50)', gaugeX, gaugeY + 45);

    // Bill Box
    const billX = c2X + 330;
    const billY = c2Y + 130;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.roundRect(billX, billY, 280, 180, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.btcOrange;
    ctx.font = 'bold 18px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(t('Factura de Registro ENS:', 'ENS Registration Invoice:'), billX + 20, billY + 40);

    ctx.fillStyle = COLORS.dangerRed;
    ctx.font = 'bold 22px monospace';
    ctx.fillText(t('Gas: $48.50 USD', 'Gas: $48.50 USD'), billX + 20, billY + 80);

    ctx.fillStyle = COLORS.gold;
    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillText(t('+ Renta Anual: $25.00/año', '+ Annual Rent: $25.00/yr'), billX + 20, billY + 115);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '14px -apple-system, sans-serif';
    ctx.fillText(t('Si no pagas, pierdes tu nombre.', 'Miss a payment and lose it.'), billX + 20, billY + 145);

    ctx.restore();

    // Subtitle card synchronized with voiceover
    drawSubtitleCard(
        t('La Soberanía Digital no Puede Depender de Corporaciones ni Gas', 'Digital Sovereignty Cannot Depend on Monopolies or Gas Rents'),
        t('SovereignLink rompe este dilema combinando Bitcoin Cash con Nostr: sin servidores, sin gas y sin costos anuales.', 'SovereignLink breaks the dilemma by uniting Bitcoin Cash with Nostr: zero servers, zero gas, zero annual rents.'),
        t('EL PROBLEMA REAL', 'THE CORE PROBLEM'),
        COLORS.dangerRed
    );
}

// SCENE 2: WHAT IS SOVEREIGNLINK & HOW DOES IT WORK?
function renderScene2(tTime) {
    drawBackground(tTime);

    const splitTime = currentLang === 'es' ? 26.0 : 23.0;

    if (tTime < splitTime) {
        // PHASE A: WHAT IS IT? (Username Payments & BCH ⇄ Nostr Bridge)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 44px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t('¿Qué es SovereignLink? — Pagos por Nombre de Usuario', 'What is SovereignLink? — Username Payments'), W / 2, 150);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '500 22px -apple-system, sans-serif';
        ctx.fillText(t('Envía y Recibe Bitcoin Cash por tu @usuario en vez de Códigos Largos de 42 Caracteres', 'Send and Receive Bitcoin Cash via your @handle instead of 42-Character Hash Strings'), W / 2, 192);

        // Visual Comparison Bar: ANTES vs AHORA
        const compY = 225;
        const compW = 1440;
        const compX = (W - compW) / 2;

        // Old Way (Red Box)
        ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(compX, compY, 700, 78, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = COLORS.dangerRed;
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(t("❌ ANTES: DIRECCIÓN COMPLEJA DE 42 CARACTERES", "❌ BEFORE: 42-CHARACTER UNREADABLE STRING"), compX + 25, compY + 28);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '500 16px monospace';
        ctx.fillText("bitcoincash:qpc5tceta5qgl4tsynwhxtgn608pteevvsqm5xqt7p", compX + 25, compY + 56);

        // New SovereignLink Way (Green Box)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
        ctx.beginPath();
        ctx.roundRect(compX + 740, compY, 700, 78, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = COLORS.bchGreen;
        ctx.font = 'bold 15px monospace';
        ctx.fillText(t("🟢 CON SOVEREIGNLINK: TU NOMBRE DE USUARIO / NOSTR", "🟢 WITH SOVEREIGNLINK: YOUR HUMAN USERNAME / NOSTR"), compX + 765, compY + 28);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 19px monospace';
        ctx.fillText(t("@adrian  o  adrian@bliquid.xyz  (Pago en 1 Clic)", "@adrian  or  adrian@bliquid.xyz  (1-Click Pay)"), compX + 765, compY + 56);

        // Left Coin: Bitcoin Cash
        drawCoin(460, 460, 75, '₿', COLORS.bchGreen, COLORS.bchGreen, tTime);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 26px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Bitcoin Cash (BCH)', 460, 565);
        ctx.fillStyle = COLORS.bchGreen;
        ctx.font = 'bold 17px -apple-system, sans-serif';
        ctx.fillText(t('Dinero P2P Soberano (Paytaca)', 'Sovereign P2P Cash (Paytaca)'), 460, 595);

        // Right Coin: Nostr
        drawCoin(1460, 460, 75, '🔑', COLORS.nostrPurple, COLORS.nostrPurple, tTime + 0.5);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 26px -apple-system, sans-serif';
        ctx.fillText('Nostr Protocol', 1460, 565);
        ctx.fillStyle = COLORS.nostrPurple;
        ctx.font = 'bold 17px -apple-system, sans-serif';
        ctx.fillText(t('Identidad y Comunicación Libre (BIP-340)', 'Censorship-Free Identity (BIP-340)'), 1460, 595);

        // Center Laser Bridge with traveling particle energy
        ctx.save();
        ctx.strokeStyle = COLORS.paytacaTeal;
        ctx.lineWidth = 6;
        ctx.shadowColor = COLORS.paytacaTeal;
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.moveTo(560, 460);
        ctx.lineTo(1360, 460);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Traveling particles
        const particleX = 560 + ((tTime * 350) % 800);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(particleX, 460, 12, 0, Math.PI * 2);
        ctx.fill();

        // Center Atom Badge
        drawPill(W / 2 - 190, 425, 380, 70, '⚡ PAGOS POR NOMBRE DE USUARIO ⚡', COLORS.btcOrange);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('secp256k1 (ECDSA) ⇄ BIP-340 (Schnorr)', W / 2, 475);
        ctx.restore();

        drawSubtitleCard(
            t('Envía y Recibe BCH por Nombre de Usuario sin Intermediarios', 'Send and Receive BCH by Username Without Middlemen'),
            t('SovereignLink es como un CashApp descentralizado: vincula tu billetera Paytaca a tu identidad de Nostr a costo de gas cero.', 'SovereignLink is like a decentralized CashApp: binds your Paytaca wallet to your Nostr identity at zero gas cost.'),
            t('DEFINICIÓN DEL PROTOCOLO', 'PROTOCOL DEFINITION'),
            COLORS.paytacaTeal
        );
    } else {
        // PHASE B: HOW DOES IT WORK? (THE 3-PHASE ENGINE)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 44px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t('¿Cómo Funciona Paso a Paso?', 'How Does It Work Step-by-Step?'), W / 2, 160);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '500 22px -apple-system, sans-serif';
        ctx.fillText(t('El Engranaje Criptográfico de Doble Firma (NIP-39 / Kind 30078)', 'The Cryptographic Dual-Signature Engine (NIP-39 / Kind 30078)'), W / 2, 205);

        // 3 Process Cards Side by Side
        const cardW = 440;
        const cardH = 430;
        const gap = 50;
        const startX = 250;

        const steps = [
            {
                num: "01",
                badge: t("ATESTACIÓN CANÓNICA", "CANONICAL STATEMENT"),
                title: t("Paso 1: Declaración JSON", "Step 1: JSON Payload"),
                desc: t("Se construye un payload estandarizado vinculando la dirección BCH con la clave pública Nostr (npub), red y timestamp.", "Constructs a standardized payload binding the BCH address with Nostr pubkey, network, and UTC timestamp."),
                color: COLORS.btcOrange,
                icon: "📄"
            },
            {
                num: "02",
                badge: t("DOBLE FIRMA DUAL", "DUAL SIGNATURE"),
                title: t("Paso 2: Doble Sello Matemático", "Step 2: Dual Crypto Sign"),
                desc: t("Paytaca firma con secp256k1 (ECDSA) y Nostr firma con BIP-340 Schnorr. Ambas firmas quedan selladas irrevocablemente.", "Paytaca signs with secp256k1 (ECDSA) and Nostr signs with BIP-340 Schnorr. Both signatures are inextricably locked."),
                color: COLORS.bchGreen,
                icon: "🔐"
            },
            {
                num: "03",
                badge: t("DIFUSIÓN P2P EN RELAYS", "RELAY BROADCAST"),
                title: t("Paso 3: Verificación Global", "Step 3: Global Verification"),
                desc: t("Se publica en relays globales (damus, nos.lol). Cualquier dApp en el planeta verifica ambas firmas en < 30 milisegundos.", "Broadcasts across global relays. Any dApp or user on Earth verifies both signatures in under 30 milliseconds."),
                color: COLORS.paytacaTeal,
                icon: "🌐"
            }
        ];

        steps.forEach((st, i) => {
            const x = startX + i * (cardW + gap);
            const y = 250;

            ctx.save();
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.strokeStyle = st.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(x, y, cardW, cardH, 20);
            ctx.fill();
            ctx.stroke();

            // Step Number Pill
            drawPill(x + 30, y + 25, 90, 32, `PASO ${st.num}`, st.color);

            ctx.font = '40px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(st.icon, x + cardW - 35, y + 55);

            ctx.fillStyle = COLORS.textMain;
            ctx.font = 'bold 22px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(st.title, x + 30, y + 105);

            // Divider
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.moveTo(x + 30, y + 130);
            ctx.lineTo(x + cardW - 30, y + 130);
            ctx.stroke();

            ctx.fillStyle = COLORS.textMuted;
            ctx.font = '400 17px -apple-system, sans-serif';
            wrapText(ctx, st.desc, x + 30, y + 170, cardW - 60, 26);

            // Bottom Pulse check
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.beginPath();
            ctx.roundRect(x + 30, y + 330, cardW - 60, 65, 12);
            ctx.fill();

            ctx.fillStyle = st.color;
            ctx.font = 'bold 15px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(i === 0 ? "Canonical JSON ✓" : (i === 1 ? "secp256k1 + Schnorr ✓" : "Relays: <28ms Verified ✓"), x + cardW / 2, y + 370);

            ctx.restore();
        });

        drawSubtitleCard(
            t('Prueba Matemática Verificable por Cualquier Nodo', 'Mathematical Proof Verifiable by Any Node in Real-Time'),
            t('Sin servidores intermedios: la identidad se comprueba directamente contra las claves públicas mediante álgebra elíptica.', 'Zero intermediate servers: identity is proven directly against public keys using elliptic curve mathematics.'),
            t('ARQUITECTURA DE FUNCIONAMIENTO', 'HOW IT WORKS'),
            COLORS.bchGreen
        );
    }
}

// SCENE 3: REAL-WORLD VALUE & USE CASES
function renderScene3(tTime) {
    drawBackground(tTime);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('¿Para Qué Sirve en la Vida Real?', 'What is it Used For in Everyday Life?'), W / 2, 160);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 22px -apple-system, sans-serif';
    ctx.fillText(t('Tres Aplicaciones Inmediatas para Creadores, Comercios y dApps', 'Three Immediate Applications for Creators, Merchants & dApps'), W / 2, 205);

    // 3 Use Case Visual Cards
    const cardW = 440;
    const cardH = 460;
    const gap = 50;
    const startX = 250;

    const cases = [
        {
            icon: "⚡",
            badge: t("PAGOS POR @USUARIO", "PAYMENTS BY @USERNAME"),
            title: t("Paga Directo a @nombre", "Pay Direct to @handle"),
            desc: t("Olvídate de direcciones de 42 caracteres. Solo di: 'párgame a mi @usuario en Nostr'. Satoshis directos a tu Paytaca en 1 clic.", "Forget copying 42-character strings. Just say: 'pay to my Nostr handle'. Satoshis arrive straight in your Paytaca in 1 click."),
            color: COLORS.btcOrange,
            simAction: "@adrian ➔ +0.05 BCH Paytaca ✓"
        },
        {
            icon: "🛡️",
            badge: t("ANTI-SUPLANTACIÓN", "ANTI-IMPERSONATION"),
            title: t("Protección Contra Estafas", "Cryptographic Anti-Scam"),
            desc: t("Compradores y comerciantes verifican en tiempo real que la dirección BCH pertenece al creador auténtico. Cero bots ni cuentas clonadas.", "Merchants and peers verify on-chain that the BCH address genuinely belongs to that creator. Zero impostors or cloned accounts."),
            color: COLORS.bchGreen,
            simAction: "Verificado Criptográfico ✓"
        },
        {
            icon: "🔑",
            badge: t("LOGIN UNIVERSAL", "PASSWORDLESS LOGIN"),
            title: t("Inicio de Sesión sin Contraseña", "Universal Passwordless Login"),
            desc: t("Inicia sesión en tiendas y foros Web3 firmando un reto criptográfico con tu billetera Paytaca. Cero contraseñas que hackear o filtrar.", "Sign into Web3 stores and dApps by signing a cryptographic nonce challenge from Paytaca. Zero passwords to leak or breach."),
            color: COLORS.paytacaTeal,
            simAction: "Login en 15ms ✓"
        }
    ];

    cases.forEach((c, i) => {
        const x = startX + i * (cardW + gap);
        const y = 240;

        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 20);
        ctx.fill();
        ctx.stroke();

        drawPill(x + 30, y + 25, 220, 30, c.badge, c.color);

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

        // Simulation Box at bottom of each card
        const simY = y + 360;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = c.color;
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
        t('De las Redes Sociales al Comercio Web3 Global', 'From Social Media to Global Web3 Commerce'),
        t('Micropagos instantáneos en Bitcoin Cash + credenciales verificables en Nostr con cero comisiones abusivas.', 'Instant Bitcoin Cash micropayments + verifiable Nostr credentials with zero predatory gas taxes.'),
        t('CASOS DE USO REALES', 'REAL-WORLD UTILITY'),
        COLORS.btcOrange
    );
}

// SCENE 4: UNBREAKABLE CRYPTOGRAPHIC SECURITY
function renderScene4(tTime) {
    drawBackground(tTime);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('Seguridad Criptográfica Impenetrable', 'Unbreakable Cryptographic Security'), W / 2, 160);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 22px -apple-system, sans-serif';
    ctx.fillText(t('Aislamiento Total de Claves y Protección con Álgebra de Curvas Elípticas', 'Strict Key Isolation Enclave & Battle-Tested Elliptic Curve Cryptography'), W / 2, 205);

    // Visual Key Vault Isolation
    const v1X = 280;
    const vY = 250;
    const vW = 540;
    const vH = 450;

    // Vault A: BCH Paytaca Enclave
    ctx.save();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.strokeStyle = COLORS.bchGreen;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(v1X, vY, vW, vH, 20);
    ctx.fill();
    ctx.stroke();

    drawPill(v1X + 35, vY + 30, 280, 32, t('BÓVEDA BITCOIN CASH (PAYTACA)', 'BITCOIN CASH ENCLAVE'), COLORS.bchGreen);

    ctx.font = '50px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🛡️', v1X + vW / 2, vY + 130);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.fillText(t('Clave Privada BCH Protegida', 'Secured BCH Private Key'), v1X + vW / 2, vY + 190);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillText(t('Firma digital secp256k1 en dispositivo local.', 'secp256k1 digital signatures strictly on-device.'), v1X + vW / 2, vY + 230);
    ctx.fillText(t('Nunca se envía a internet ni a ningún servidor.', 'Never transmitted over the network or cloud.'), v1X + vW / 2, vY + 260);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.beginPath();
    ctx.roundRect(v1X + 40, vY + 320, vW - 80, 80, 12);
    ctx.fill();
    ctx.fillStyle = COLORS.bchGreen;
    ctx.font = 'bold 16px monospace';
    ctx.fillText("✓ ECDSA Mathematical Signature", v1X + vW / 2, vY + 365);
    ctx.restore();

    // Center Firewall Barrier
    const wallX = 890;
    ctx.save();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.strokeStyle = COLORS.dangerRed;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(wallX, vY + 40, 140, vH - 80, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.dangerRed;
    ctx.font = 'bold 14px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('AISLAMIENTO', 'KEY'), wallX + 70, vY + 180);
    ctx.fillText(t('TOTAL DE', 'ISOLATION'), wallX + 70, vY + 205);
    ctx.fillText(t('CLAVES', 'FIREWALL'), wallX + 70, vY + 230);

    ctx.font = '32px sans-serif';
    ctx.fillText('⚡', wallX + 70, vY + 290);
    ctx.restore();

    // Vault B: Nostr Enclave
    const v2X = 1100;
    ctx.save();
    ctx.fillStyle = 'rgba(138, 43, 226, 0.08)';
    ctx.strokeStyle = COLORS.nostrPurple;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(v2X, vY, vW, vH, 20);
    ctx.fill();
    ctx.stroke();

    drawPill(v2X + 35, vY + 30, 260, 32, t('BÓVEDA NOSTR (BIP-340)', 'NOSTR IDENTITY ENCLAVE'), COLORS.nostrPurple);

    ctx.font = '50px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔑', v2X + vW / 2, vY + 130);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.fillText(t('Clave Privada Nostr Protegida', 'Secured Nostr Secret Key'), v2X + vW / 2, vY + 190);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillText(t('Firma de eventos Kind 30078 con Schnorr.', 'Signs Kind 30078 events with BIP-340 Schnorr.'), v2X + vW / 2, vY + 230);
    ctx.fillText(t('Aislamiento completo de tus fondos en BCH.', 'Fully segregated from your Bitcoin Cash funds.'), v2X + vW / 2, vY + 260);

    ctx.fillStyle = 'rgba(138, 43, 226, 0.15)';
    ctx.beginPath();
    ctx.roundRect(v2X + 40, vY + 320, vW - 80, 80, 12);
    ctx.fill();
    ctx.fillStyle = COLORS.nostrPurple;
    ctx.font = 'bold 16px monospace';
    ctx.fillText("✓ BIP-340 Schnorr Signature", v2X + vW / 2, vY + 365);
    ctx.restore();

    drawSubtitleCard(
        t('Tus Fondos y tu Identidad Permanecen Estrictamente Segregados', 'Your Funds and Identity Remain Strictly Segregated'),
        t('Si tu clave Nostr llegara a comprometerse, tus fondos en Bitcoin Cash siguen 100% seguros bajo el control de Paytaca.', 'Even if your Nostr secret key were compromised, your BCH funds remain 100% secure in Paytaca.'),
        t('SEGURIDAD DE GRADO BANCARIO', 'BANK-GRADE SECURITY'),
        COLORS.bchGreen
    );
}

// SCENE 5: DIRECT COMPARISON: SOVEREIGN VS TRADITIONAL
function renderScene5(tTime) {
    drawBackground(tTime);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('Comparativa: Soberano vs Sistemas Tradicionales', 'Direct Comparison: Sovereign vs Traditional'), W / 2, 160);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 22px -apple-system, sans-serif';
    ctx.fillText(t('Por Qué SovereignLink Supera a Web2 y a los Dominios Tradicionales en L1', 'Why SovereignLink Outperforms Web2 and Legacy L1 Name Services'), W / 2, 205);

    // Table Matrix
    const tX = 260;
    const tY = 250;
    const tW = 1400;
    const rowH = 90;

    const rows = [
        {
            feature: t("Costo de Registro en Gas", "Registration Gas Fee"),
            web2: t("Gratis (Tú eres el producto)", "Free (You are the product)"),
            ens: "$35 - $60 USD en Gas (ETH)",
            sovereign: "$0.00 USD (Costo Cero)"
        },
        {
            feature: t("Cuota de Renovación Forzada", "Forced Annual Renewal Rent"),
            web2: t("Sujeto a TOS corporativo", "Subject to arbitrary TOS"),
            ens: "$25.00 USD / cada año",
            sovereign: t("Gratis Vitalicio (Tuyo para siempre)", "Lifetime Free (Yours forever)")
        },
        {
            feature: t("Riesgo de Baneo o Censura", "Risk of Censorship / Ban"),
            web2: t("Extremo (Google/Apple/Meta)", "High (Big Tech Monopoly)"),
            ens: t("Medio (Contratos congelables)", "Medium (Smart Contract risks)"),
            sovereign: t("Cero (Resistente a censura)", "Zero (P2P Mathematical)")
        },
        {
            feature: t("Pagos en Efectivo P2P", "Native P2P Cash Payments"),
            web2: t("No (Tarjetas y bancos)", "No (Credit cards / Stripe)"),
            ens: t("Lento y caro en L1", "Slow & expensive L1 gas"),
            sovereign: t("Instantáneo en Bitcoin Cash", "Instant P2P Bitcoin Cash")
        }
    ];

    // Table Headers
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(tX, tY, tW, 60);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = 'bold 18px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(t("CARACTERÍSTICA", "FEATURE"), tX + 30, tY + 38);
    ctx.textAlign = 'center';
    ctx.fillText("WEB2 (GOOGLE/META)", tX + 460, tY + 38);
    ctx.fillText("ETHEREUM ENS (.ETH)", tX + 800, tY + 38);
    ctx.fillStyle = COLORS.paytacaTeal;
    ctx.fillText("SOVEREIGNLINK (BCH + NOSTR)", tX + 1170, tY + 38);

    rows.forEach((r, idx) => {
        const rY = tY + 60 + idx * rowH;

        ctx.fillStyle = idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(tX, rY, tW, rowH);

        // Feature
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(r.feature, tX + 30, rY + 52);

        // Web2
        ctx.fillStyle = COLORS.dangerRed;
        ctx.font = '16px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(r.web2, tX + 460, rY + 52);

        // ENS
        ctx.fillStyle = COLORS.btcOrange;
        ctx.fillText(r.ens, tX + 800, rY + 52);

        // SovereignLink Highlight Box
        ctx.fillStyle = 'rgba(0, 209, 178, 0.15)';
        ctx.beginPath();
        ctx.roundRect(tX + 980, rY + 12, 380, rowH - 24, 10);
        ctx.fill();

        ctx.fillStyle = COLORS.paytacaTeal;
        ctx.font = 'bold 17px -apple-system, sans-serif';
        ctx.fillText(`✓ ${r.sovereign}`, tX + 1170, rY + 52);
    });

    drawSubtitleCard(
        t('La Libertad Digital No Debe Pagar Impuesto de Gas', 'Digital Freedom Should Not Pay an Annual Gas Tax'),
        t('SovereignLink ofrece la mejor experiencia de usuario sin barreras económicas ni riesgos de custodia.', 'SovereignLink delivers frictionless identity with zero financial barriers and zero custody honeypots.'),
        t('VENTAJA COMPETITIVA', 'COMPETITIVE EDGE'),
        COLORS.paytacaTeal
    );
}

// SCENE 6: HOW TO USE IN 3 SIMPLE STEPS
function renderScene6(tTime) {
    drawBackground(tTime);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('Cómo Usar SovereignLink en 3 Sencillos Pasos', 'How to Use SovereignLink in 3 Simple Steps'), W / 2, 160);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '500 22px -apple-system, sans-serif';
    ctx.fillText(t('Tu Identidad Verificada en la Red Nostr en Menos de 30 Segundos', 'Your Cryptographically Verified Nostr Identity in Under 30 Seconds'), W / 2, 205);

    // 3 Step Walkthrough Cards
    const cardW = 440;
    const cardH = 460;
    const gap = 50;
    const startX = 250;

    const steps = [
        {
            num: "01",
            icon: "📲",
            title: t("Conecta tu Billetera Paytaca", "Connect Paytaca Wallet"),
            desc: t("Accede a bliquid.xyz/identity y conecta tu billetera Bitcoin Cash compatible como Paytaca o Cashonize con un solo clic.", "Visit bliquid.xyz/identity and connect your Bitcoin Cash wallet like Paytaca in a single click."),
            mock: "🟢 Conectado: bitcoincash:qp...377d",
            color: COLORS.btcOrange
        },
        {
            num: "02",
            icon: "✍️",
            title: t("Autoriza la Doble Firma", "Authorize Dual Signature"),
            desc: t("Firma la atestación canónica en tu billetera. Paytaca firma con secp256k1 y Nostr firma con BIP-340 Schnorr.", "Sign the canonical attestation statement. Paytaca signs with secp256k1 and Nostr seals with Schnorr."),
            mock: "🔐 Firmado: secp256k1 + Schnorr ✓",
            color: COLORS.bchGreen
        },
        {
            num: "03",
            icon: "🎉",
            title: t("Publica en Relays Públicos", "Broadcast to Nostr Relays"),
            desc: t("Tu atestación se transmite a damus, nos.lol y primal. Tu perfil queda 100% verificado y listo para Zaps y login.", "Broadcasts via NIP-39 to public relays. Your profile is verified across Nostr dApps and ready for Zaps."),
            mock: "🌐 Relays: Verificado < 25ms ✓",
            color: COLORS.paytacaTeal
        }
    ];

    steps.forEach((st, i) => {
        const x = startX + i * (cardW + gap);
        const y = 240;

        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = st.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 20);
        ctx.fill();
        ctx.stroke();

        drawPill(x + 30, y + 25, 110, 32, `PASO ${st.num}`, st.color);

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

        // Simulated Mockup Status
        const mY = y + 360;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = st.color;
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
        t('Verificación Instantánea sin Esperas ni Descargas Complejas', 'Frictionless Experience in Under 30 Seconds'),
        t('Todo el proceso ocurre en tu navegador y billetera de forma privada, segura y sin fricción.', 'The entire procedure happens locally inside your browser and wallet, zero third-party dependencies.'),
        t('GUÍA RÁPIDA', 'HOW TO USE'),
        COLORS.bchGreen
    );
}

// SCENE 7: GRAND FINALE — SPOTLIGHT TO PAYTACA
function renderScene7(tTime) {
    drawBackground(tTime);

    // Floating celebratory particles
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
    ctx.fillText(t('Entrega Oficial para el Hackathon BCH BLAZE 2026 · Pista Decentralized Identity', 'Official Submission · BCH BLAZE 2026 Hackathon · Decentralized Identity Track'), W / 2, 205);

    // Paytaca Spotlight Centerpiece
    const cX = W / 2;
    const cY = 430;

    // Glowing aura
    const aura = ctx.createRadialGradient(cX, cY, 40, cX, cY, 320);
    aura.addColorStop(0, 'rgba(0, 209, 178, 0.25)');
    aura.addColorStop(0.5, 'rgba(247, 147, 26, 0.12)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(cX - 350, cY - 350, 700, 700);

    // Center Card
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = COLORS.paytacaTeal;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(cX - 420, cY - 160, 840, 320, 24);
    ctx.fill();
    ctx.stroke();

    drawPill(cX - 180, cY - 135, 360, 36, '🏆 BCH BLAZE 2026 OFFICIAL SUBMISSION', COLORS.btcOrange);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Homenaje y Agradecimiento a Paytaca', cX, cY - 45);

    ctx.fillStyle = COLORS.paytacaTeal;
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.fillText('www.paytaca.com · Líderes en Pagos No Custodiales en BCH', cX, cY);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '18px -apple-system, sans-serif';
    ctx.fillText(t('Dinero Soberano (BCH) + Identidad Soberana (Nostr) = Libertad Total', 'Sovereign Cash (BCH) + Sovereign Identity (Nostr) = True Freedom'), cX, cY + 45);

    // Action button inside card
    drawPill(cX - 220, cY + 80, 440, 50, '🚀 PROBAR EN VIVO: BLIQUID.XYZ/IDENTITY', COLORS.bchGreen);
    ctx.restore();

    drawSubtitleCard(
        t('Gracias a Paytaca por Impulsar la Revolución No Custodial', 'Special Tribute to Paytaca for Championing Non-Custodial Innovation'),
        t('Desarrollado con dedicación por Drian Stack Labs (@drianops). Código abierto para toda la comunidad de Bitcoin Cash.', 'Built with passion by Drian Stack Labs (@drianops). Open-source for the global Bitcoin Cash ecosystem.'),
        t('GRAN CIERRE', 'GRAND FINALE'),
        COLORS.paytacaTeal
    );
}

// ==============================================================================
// AUDIO ENGINE & PLAYBACK CONTROLLER
// ==============================================================================

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

function updateUI() {
    const cur = SCENES[currentSceneIndex];
    const curDur = getCurDuration();

    // Title
    const titleEl = document.getElementById('video-title');
    if (titleEl) {
        titleEl.textContent = currentLang === 'es' ? cur.titleEs : cur.titleEn;
    }

    // Play button
    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) {
        btnPlay.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
    }

    // Time display
    const td = document.getElementById('time-display');
    if (td) {
        td.textContent = `${formatTime(sceneTime)} / ${formatTime(curDur)}`;
    }

    // Progress bar
    const pb = document.getElementById('progress-bar');
    if (pb) {
        const pct = Math.min(100, Math.max(0, (sceneTime / curDur) * 100));
        pb.style.width = pct + '%';
    }

    // Pills
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

// Main Animation Loop
function loop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    const curDur = getCurDuration();

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

    // Update Progress bar & time display
    const pct = Math.min(100, Math.max(0, (sceneTime / curDur) * 100));
    const pb = document.getElementById('progress-bar');
    if (pb) pb.style.width = pct + '%';
    const td = document.getElementById('time-display');
    if (td) td.textContent = `${formatTime(sceneTime)} / ${formatTime(curDur)}`;

    // Render Canvas for Current Scene
    switch (currentSceneIndex) {
        case 0: renderScene1(sceneTime); break;
        case 1: renderScene2(sceneTime); break;
        case 2: renderScene3(sceneTime); break;
        case 3: renderScene4(sceneTime); break;
        case 4: renderScene5(sceneTime); break;
        case 5: renderScene6(sceneTime); break;
        case 6: renderScene7(sceneTime); break;
    }

    animationFrameId = requestAnimationFrame(loop);
}

// Event Listeners
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

document.getElementById('btn-lang-en').addEventListener('click', () => setLanguage('en'));
document.getElementById('btn-lang-es').addEventListener('click', () => setLanguage('es'));

document.getElementById('btn-fullscreen').addEventListener('click', () => {
    const el = document.getElementById('stage-container');
    if (!document.fullscreenElement) {
        el.requestFullscreen().catch(err => console.warn(err));
    } else {
        document.exitFullscreen();
    }
});

document.getElementById('progress-bar-container').addEventListener('click', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const curDur = getCurDuration();
    sceneTime = pos * curDur;
    if (currentAudio) {
        currentAudio.currentTime = sceneTime;
    }
    updateUI();
});

// Keyboard Controls
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        document.getElementById('btn-play').click();
    } else if (e.code === 'ArrowRight') {
        document.getElementById('btn-next').click();
    } else if (e.code === 'ArrowLeft') {
        document.getElementById('btn-prev').click();
    } else if (e.key === 'f' || e.key === 'F') {
        document.getElementById('btn-fullscreen').click();
    }
});

// Parse initial URL query parameters
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
} catch (e) {}

// Apply initial language UI
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
