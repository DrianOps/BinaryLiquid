/**
 * SovereignLink Animated Explainer Studio
 * 1080p High-Fidelity Vector Motion Graphics Renderer
 * Bilingual Engine: 🇺🇸 English + 🇪🇸 Español
 * Topic: Decentralized Identity for Bitcoin Cash & Nostr (Paytaca $500 Bounty)
 */

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const W = 1920;
const H = 1080;

let currentLang = 'en'; // default English
let isPlaying = false;
let currentSceneIdx = 0;
let sceneTime = 0;
let lastTimestamp = 0;
let animationFrameId = null;

// Color Palette
const COLORS = {
    bg: '#080B11',
    cardBg: 'rgba(15, 23, 42, 0.85)',
    cardBorder: 'rgba(255, 255, 255, 0.1)',
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

// 6 Scenes Configuration
const SCENES = [
    {
        id: 1,
        titleEn: "1. The Centralized Identity Trap",
        titleEs: "1. La Trampa de la Identidad Centralizada",
        duration: 16.0,
        chapterEn: "The Trap",
        chapterEs: "El Dilema"
    },
    {
        id: 2,
        titleEn: "2. What is SovereignLink & Real Use Cases",
        titleEs: "2. ¿Para Qué Sirve SovereignLink?",
        duration: 18.0,
        chapterEn: "Use Cases",
        chapterEs: "Utilidad Real"
    },
    {
        id: 3,
        titleEn: "3. Unbreakable Cryptographic Security",
        titleEs: "3. Seguridad Criptográfica Impenetrable",
        duration: 18.0,
        chapterEn: "Security",
        chapterEs: "Seguridad"
    },
    {
        id: 4,
        titleEn: "4. Direct Comparison: Sovereign vs Traditional",
        titleEs: "4. Comparativa: Soberano vs Tradicional",
        duration: 16.0,
        chapterEn: "Comparison",
        chapterEs: "Ventajas"
    },
    {
        id: 5,
        titleEn: "5. How to Use in 3 Simple Steps",
        titleEs: "5. Cómo se Usa en 3 Pasos",
        duration: 16.0,
        chapterEn: "How to Use",
        chapterEs: "3 Pasos"
    },
    {
        id: 6,
        titleEn: "6. Grand Finale — Spotlight to Paytaca",
        titleEs: "6. Gran Cierre — Patrocinio Paytaca",
        duration: 20.0,
        chapterEn: "Paytaca Spotlight",
        chapterEs: "Paytaca"
    }
];

// Helper Easing Functions
function easeOutCubic(t) {
    return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
}
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Background Grid with Ambient Glows
function drawBackground(t) {
    // Deep dark background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 60;
    for (let x = 0; x < W; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }

    // Ambient radial glows in corners
    const glow1 = ctx.createRadialGradient(200, 200, 10, 200, 200, 600);
    glow1.addColorStop(0, 'rgba(247, 147, 26, 0.08)');
    glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, W, H);

    const glow2 = ctx.createRadialGradient(W - 200, H - 200, 10, W - 200, H - 200, 600);
    glow2.addColorStop(0, 'rgba(0, 209, 178, 0.08)');
    glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);
}

// Draw Top Header Pill
function drawHeaderBadge(categoryEn, categoryEs, titleEn, titleEs) {
    ctx.save();
    // Badge
    const badgeText = currentLang === 'es' ? categoryEs : categoryEn;
    ctx.font = '700 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const textWidth = ctx.measureText(badgeText).width;
    const pillW = textWidth + 36;
    const pillH = 36;
    const pillX = (W - pillW) / 2;
    const pillY = 50;

    ctx.fillStyle = 'rgba(247, 147, 26, 0.12)';
    ctx.strokeStyle = 'rgba(247, 147, 26, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.btcOrange;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, W / 2, pillY + pillH / 2);

    // Main Scene Title
    const title = currentLang === 'es' ? titleEs : titleEn;
    ctx.font = '800 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = COLORS.textMain;
    ctx.fillText(title, W / 2, 125);
    ctx.restore();
}

// ==========================================
// SCENE 1: THE CENTRALIZED IDENTITY TRAP
// ==========================================
function renderScene1(t) {
    drawHeaderBadge(
        "THE WEB2 & TRADITIONAL WEB3 PROBLEM",
        "EL PROBLEMA EN WEB2 Y WEB3 TRADICIONAL",
        "The Centralized Identity & Gas Fee Trap",
        "La Trampa de la Identidad Centralizada"
    );

    const entrance = easeOutCubic(t / 1.2);

    // Card 1: Web2 Monopolies (Google/Meta/Apple)
    ctx.save();
    const c1X = 220;
    const c1Y = 220 + (1 - entrance) * 50;
    const cW = 680;
    const cH = 600;

    ctx.fillStyle = 'rgba(239, 68, 68, 0.06)';
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(c1X, c1Y, cW, cH, 24);
    ctx.fill();
    ctx.stroke();

    // Red pill
    ctx.fillStyle = '#EF4444';
    ctx.font = '700 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(currentLang === 'es' ? "❌ RIESGO WEB2: MONOPOLIOS CENTRALIZADOS" : "❌ WEB2 RISK: CORPORATE MONOPOLIES", c1X + 40, c1Y + 55);

    // Bullet points
    const bulletsWeb2 = currentLang === 'es' ? [
        "• Tu cuenta le pertenece a Google, Apple o Meta.",
        "• Si te banean o censuran, pierdes tu reputación y accesos.",
        "• Tus datos personales se venden a terceros.",
        "• Cero soberanía: tú eres el producto, no el dueño."
    ] : [
        "• Your account belongs to Google, Apple, or Meta.",
        "• Arbitrary bans lock you out of contacts and reputation.",
        "• Your personal data is harvested and sold.",
        "• Zero sovereignty: you are the product, not the owner."
    ];

    ctx.font = '500 24px sans-serif';
    ctx.fillStyle = COLORS.textMain;
    bulletsWeb2.forEach((line, i) => {
        ctx.fillText(line, c1X + 40, c1Y + 130 + i * 55);
    });

    // Big alert box at bottom of card 1
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.beginPath();
    ctx.roundRect(c1X + 40, c1Y + 390, cW - 80, 150, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FCA5A5';
    ctx.font = '700 22px sans-serif';
    ctx.fillText(currentLang === 'es' ? "⚠️ Pérdida Total de Acceso" : "⚠️ Total Access Loss", c1X + 70, c1Y + 440);
    ctx.font = '400 19px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(currentLang === 'es' ? "Sin claves privadas, dependes de servidores corporativos." : "Without private keys, you depend entirely on corporate servers.", c1X + 70, c1Y + 485);
    ctx.restore();

    // Card 2: Traditional Web3 (Ethereum ENS Gas Trap)
    ctx.save();
    const c2X = 1020;
    const c2Y = 220 + (1 - entrance) * 50;

    ctx.fillStyle = 'rgba(247, 147, 26, 0.06)';
    ctx.strokeStyle = 'rgba(247, 147, 26, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(c2X, c2Y, cW, cH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.btcOrange;
    ctx.font = '700 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(currentLang === 'es' ? "⚠️ WEB3 TRADICIONAL: COMISIONES ABUSIVAS" : "⚠️ TRADITIONAL WEB3: EXORBITANT GAS TRAP", c2X + 40, c2Y + 55);

    const bulletsWeb3 = currentLang === 'es' ? [
        "• Registrar un dominio ENS cuesta $20 a $50 dólares en gas.",
        "• Renovaciones periódicas forzadas o pierdes tu nombre.",
        "• No incluye pagos directos en Bitcoin Cash.",
        "• Congestión de red y transacciones lentas."
    ] : [
        "• Registering an ENS domain costs $20-$50+ in gas fees.",
        "• Forced annual renewals or your name expires.",
        "• Disconnected from native Bitcoin Cash payments.",
        "• Network congestion and slow execution times."
    ];

    ctx.font = '500 24px sans-serif';
    ctx.fillStyle = COLORS.textMain;
    bulletsWeb3.forEach((line, i) => {
        ctx.fillText(line, c2X + 40, c2Y + 130 + i * 55);
    });

    // Solution callout
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.beginPath();
    ctx.roundRect(c2X + 40, c2Y + 390, cW - 80, 150, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.bchGreen;
    ctx.font = '700 22px sans-serif';
    ctx.fillText(currentLang === 'es' ? "💡 La Alternativa Soberana" : "💡 The Sovereign Alternative", c2X + 70, c2Y + 440);
    ctx.font = '400 19px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(currentLang === 'es' ? "Bitcoin Cash + Nostr: Costo $0, instantáneo y sin intermediarios." : "Bitcoin Cash + Nostr: $0 cost, instant, and truly peer-to-peer.", c2X + 70, c2Y + 485);
    ctx.restore();

    // Bottom summary pill
    ctx.save();
    ctx.font = '600 22px sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = 'center';
    ctx.fillText(
        currentLang === 'es'
            ? "«SovereignLink rompe el monopolio uniendo Bitcoin Cash con Nostr en una identidad autosoberana.»"
            : "«SovereignLink breaks the monopoly by cryptographically unifying Bitcoin Cash with Nostr.»",
        W / 2,
        910
    );
    ctx.restore();
}

// ==========================================
// SCENE 2: WHAT IS SOVEREIGNLINK & REAL USE CASES
// ==========================================
function renderScene2(t) {
    drawHeaderBadge(
        "REAL-WORLD VALUE & UTILITY",
        "UTILIDAD Y CASOS DE USO REALES",
        "What is SovereignLink & Why Does It Matter?",
        "¿Para Qué Sirve SovereignLink en la Vida Real?"
    );

    const progress = Math.min(1, t / 1.5);
    const cardY = 240;
    const cardW = 440;
    const cardH = 580;
    const startX = 220;
    const gap = 50;

    const useCases = [
        {
            icon: "⚡",
            tag: currentLang === 'es' ? "PAGOS INSTANTÁNEOS" : "INSTANT PAYMENTS",
            title: currentLang === 'es' ? "Zaps P2P Directos a tu Perfil" : "P2P Zaps & Tips to Nostr Profiles",
            desc: currentLang === 'es'
                ? "Envía y recibe Bitcoin Cash directamente en clientes de Nostr (Damus, Primal, Amethyst) sin copiar ni pegar direcciones de 42 caracteres."
                : "Send and receive Bitcoin Cash directly to Nostr profiles across apps like Damus and Primal without copying 42-character addresses.",
            color: COLORS.btcOrange
        },
        {
            icon: "🛡️",
            tag: currentLang === 'es' ? "ANTI-ESTAFAS" : "SCAM PROTECTION",
            title: currentLang === 'es' ? "Perfiles Verificados sin Fraude" : "Mathematical Anti-Impersonation",
            desc: currentLang === 'es'
                ? "Los compradores y usuarios verifican criptográficamente que la billetera BCH pertenece al autor legítimo. Cero cuentas clonadas o bots."
                : "Buyers and peers verify on-chain that the BCH address genuinely belongs to that content creator. Zero impostors or cloned accounts.",
            color: COLORS.bchGreen
        },
        {
            icon: "🔑",
            tag: currentLang === 'es' ? "LOGIN UNIVERSAL" : "UNIVERSAL LOGIN",
            title: currentLang === 'es' ? "Inicio de Sesión sin Contraseñas" : "Passwordless Challenge-Response",
            desc: currentLang === 'es'
                ? "Autentícate en cualquier dApp, foro o comercio Web3 firmando un reto criptográfico desde tu billetera Paytaca. Cero contraseñas que hackear."
                : "Sign in to any Web3 dApp, forum, or store by signing a nonce challenge from Paytaca. Zero passwords to breach or leak.",
            color: COLORS.paytacaTeal
        }
    ];

    useCases.forEach((uc, i) => {
        const x = startX + i * (cardW + gap);
        const cardEntrance = easeOutCubic(Math.max(0, (t - i * 0.3) / 1.0));
        const y = cardY + (1 - cardEntrance) * 60;

        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = uc.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 20);
        ctx.fill();
        ctx.stroke();

        // Icon circle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.arc(x + 70, y + 80, 45, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(uc.icon, x + 70, y + 80);

        // Tag
        ctx.fillStyle = uc.color;
        ctx.font = '700 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(uc.tag, x + 135, y + 80);

        // Title
        ctx.fillStyle = COLORS.textMain;
        ctx.font = '700 24px sans-serif';
        ctx.fillText(uc.title, x + 35, y + 175, cardW - 70);

        // Divider
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(x + 35, y + 230);
        ctx.lineTo(x + cardW - 35, y + 230);
        ctx.stroke();

        // Description
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '400 19px -apple-system, sans-serif';
        wrapText(ctx, uc.desc, x + 35, y + 280, cardW - 70, 32);

        ctx.restore();
    });

    // Bottom banner
    ctx.save();
    ctx.font = '600 22px sans-serif';
    ctx.fillStyle = COLORS.textMain;
    ctx.textAlign = 'center';
    ctx.fillText(
        currentLang === 'es'
            ? "«Libertad de expresión en Nostr + Dinero soberano en Bitcoin Cash = Soberanía Digital Completa.»"
            : "«Censorship-free speech on Nostr + Censorship-free cash on BCH = Complete Digital Sovereignty.»",
        W / 2,
        910
    );
    ctx.restore();
}

// ==========================================
// SCENE 3: UNBREAKABLE CRYPTOGRAPHIC SECURITY
// ==========================================
function renderScene3(t) {
    drawHeaderBadge(
        "CRYPTOGRAPHIC ARCHITECTURE & ISOLATION",
        "ARQUITECTURA Y BLINDAJE CRIPTOGRÁFICO",
        "Unbreakable Mathematical Security",
        "Seguridad Criptográfica Impenetrable"
    );

    const entrance = easeOutCubic(t / 1.2);

    // Left visual: Dual curve isolation blueprint
    const bpX = 200;
    const bpY = 220;
    const bpW = 700;
    const bpH = 620;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bpX, bpY, bpW, bpH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.gold;
    ctx.font = '700 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(currentLang === 'es' ? "PROTOCOLO DE DOBLE FIRMA SECP256K1" : "SECP256K1 DUAL-SIGNATURE PROTOCOL", bpX + 40, bpY + 50);

    // Box 1: BCH Wallet
    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.strokeStyle = COLORS.bchGreen;
    ctx.beginPath();
    ctx.roundRect(bpX + 40, bpY + 90, bpW - 80, 110, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.bchGreen;
    ctx.font = '700 20px sans-serif';
    ctx.fillText("Bitcoin Cash (Paytaca Wallet)", bpX + 65, bpY + 130);
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '16px monospace';
    ctx.fillText("SignAttestation(statementHash, bchPrivateKey) ➜ secp256k1", bpX + 65, bpY + 165);

    // Connecting arrows
    ctx.fillStyle = COLORS.btcOrange;
    ctx.font = '700 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("↕", bpX + bpW / 2, bpY + 235);

    // Box 2: Nostr Keypair
    ctx.fillStyle = 'rgba(138, 43, 226, 0.1)';
    ctx.strokeStyle = COLORS.nostrPurple;
    ctx.beginPath();
    ctx.roundRect(bpX + 40, bpY + 260, bpW - 80, 110, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#C084FC';
    ctx.font = '700 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText("Nostr Identity (BIP-340 Schnorr)", bpX + 65, bpY + 300);
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '16px monospace';
    ctx.fillText("FinalizeEvent(Kind 30078 + NIP-39 tags) ➜ Schnorr Sig", bpX + 65, bpY + 335);

    // Box 3: Relays
    ctx.fillStyle = 'rgba(0, 209, 178, 0.1)';
    ctx.strokeStyle = COLORS.paytacaTeal;
    ctx.beginPath();
    ctx.roundRect(bpX + 40, bpY + 430, bpW - 80, 140, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.paytacaTeal;
    ctx.font = '700 20px sans-serif';
    ctx.fillText(currentLang === 'es' ? "Relays Descentralizados (P2P)" : "Decentralized Relays (P2P)", bpX + 65, bpY + 475);
    ctx.fillStyle = COLORS.textMain;
    ctx.font = '16px sans-serif';
    ctx.fillText("wss://relay.damus.io • wss://nos.lol • wss://relay.primal.net", bpX + 65, bpY + 510);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(currentLang === 'es' ? "Verificable en milisegundos por cualquier cliente Web3." : "Verifiable in milliseconds by any Web3 client.", bpX + 65, bpY + 540);
    ctx.restore();

    // Right: 4 Security Guarantees
    const secX = 960;
    const secW = 760;
    const secH = 620;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(secX, bpY, secW, secH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.bchGreen;
    ctx.font = '700 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(currentLang === 'es' ? "GARANTÍAS DE SEGURIDAD CRIPTOGRÁFICA" : "CRYPTOGRAPHIC SECURITY GUARANTEES", secX + 40, bpY + 50);

    const pillars = [
        {
            title: currentLang === 'es' ? "1. Claves Privadas 100% Protegidas" : "1. Zero Private Keys Exposed",
            desc: currentLang === 'es'
                ? "Tus claves privadas nunca salen de tu billetera Paytaca. El sistema solo transmite firmas criptográficas."
                : "Your private keys never leave your Paytaca wallet. Only compact mathematical signatures are published."
        },
        {
            title: currentLang === 'es' ? "2. Aislamiento e Independencia de Claves" : "2. Strict Keypair Isolation",
            desc: currentLang === 'es'
                ? "La clave de Bitcoin Cash y la clave de Nostr son independientes. Si rotas tu clave Nostr, tus fondos en BCH siguen 100% a salvo."
                : "Your BCH key and Nostr key are completely independent. Rotating your Nostr identity never risks your BCH funds."
        },
        {
            title: currentLang === 'es' ? "3. Cero Servidores Centralizados" : "3. Zero Centralized Servers or DBs",
            desc: currentLang === 'es'
                ? "Ningún gobierno, empresa o atacante puede apagar tu identidad; vive distribuida en la red global de relays."
                : "No government or corporate entity can shut down your profile; it lives distributed across global Nostr relays."
        },
        {
            title: currentLang === 'es' ? "4. Blindaje Anti-Replay" : "4. Cryptographic Anti-Replay Defense",
            desc: currentLang === 'es'
                ? "Cada firma incluye marcas de tiempo UTC y hashes canónicos, impidiendo que alguien reutilice firmas viejas."
                : "Every proof includes UTC timestamps and canonical hashes, preventing attackers from replaying stale signatures."
        }
    ];

    pillars.forEach((p, idx) => {
        const itemY = bpY + 95 + idx * 125;
        ctx.fillStyle = COLORS.textMain;
        ctx.font = '700 21px sans-serif';
        ctx.fillText(p.title, secX + 40, itemY);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '400 18px sans-serif';
        wrapText(ctx, p.desc, secX + 40, itemY + 30, secW - 80, 26);
    });

    ctx.restore();
}

// ==========================================
// SCENE 4: DIRECT COMPARISON: SOVEREIGN VS TRADITIONAL
// ==========================================
function renderScene4(t) {
    drawHeaderBadge(
        "THE DEFINITIVE COMPARISON",
        "LA COMPARATIVA DEFINITIVA",
        "Why SovereignLink Beats Legacy Systems",
        "¿Por Qué SovereignLink Supera a las Alternativas?"
    );

    const cW = 460;
    const cH = 620;
    const startX = 200;
    const gap = 40;
    const cardY = 220;

    const cols = [
        {
            badge: "WEB2 TRADICIONAL",
            badgeEn: "LEGACY WEB2",
            title: "Google / Apple / OAuth",
            color: '#EF4444',
            items: currentLang === 'es' ? [
                "❌ Identidad alquilada",
                "❌ Te pueden banear en cualquier momento",
                "❌ Venden tu historial de datos",
                "❌ Sin pagos cripto nativos",
                "❌ Servidores centralizados frágiles"
            ] : [
                "❌ Rented corporate identity",
                "❌ Arbitrary bans and deplatforming",
                "❌ Personal data is harvested & sold",
                "❌ No native crypto payments",
                "❌ Centralized single points of failure"
            ]
        },
        {
            badge: "WEB3 ETHEREUM",
            badgeEn: "ETHEREUM WEB3",
            title: "ENS / Smart Contracts",
            color: '#F59E0B',
            items: currentLang === 'es' ? [
                "🟡 Descentralizado pero costoso",
                "❌ Comisiones de gas de $20 a $50+",
                "❌ Renovaciones periódicas obligatorias",
                "❌ No conectado al dinero de Bitcoin Cash",
                "❌ Red lenta en momentos de congestión"
            ] : [
                "🟡 Decentralized but expensive",
                "❌ High gas fees ($20-$50+ per name)",
                "❌ Forced annual rent / expiration",
                "❌ Disconnected from Bitcoin Cash economy",
                "❌ Congested EVM execution bottlenecks"
            ]
        },
        {
            badge: "SOVEREIGNLINK",
            badgeEn: "SOVEREIGNLINK",
            title: "BCH ⟷ Nostr (Paytaca)",
            color: COLORS.bchGreen,
            items: currentLang === 'es' ? [
                "✅ 100% No-custodio y autosoberano",
                "✅ Costo $0 (Prácticamente gratis)",
                "✅ Pagos y Zaps instantáneos en BCH",
                "✅ Sin vencimiento forzado ni cobros anuales",
                "✅ Relays abiertos P2P globales"
            ] : [
                "✅ 100% Non-custodial & self-sovereign",
                "✅ Virtually $0 setup & verification",
                "✅ Instant micro-cent BCH Zaps & tips",
                "✅ Permanent identity with zero annual rent",
                "✅ Open global P2P relay federation"
            ]
        }
    ];

    cols.forEach((col, i) => {
        const x = startX + i * (cW + gap);
        ctx.save();

        ctx.fillStyle = i === 2 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = col.color;
        ctx.lineWidth = i === 2 ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.roundRect(x, cardY, cW, cH, 20);
        ctx.fill();
        ctx.stroke();

        // Badge
        ctx.fillStyle = col.color;
        ctx.font = '700 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(currentLang === 'es' ? col.badge : col.badgeEn, x + 35, cardY + 50);

        // Title
        ctx.fillStyle = COLORS.textMain;
        ctx.font = '700 24px sans-serif';
        ctx.fillText(col.title, x + 35, cardY + 95);

        // Divider
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(x + 35, cardY + 125);
        ctx.lineTo(x + cW - 35, cardY + 125);
        ctx.stroke();

        // Items
        col.items.forEach((item, itemIdx) => {
            const isGood = item.startsWith('✅');
            const isMid = item.startsWith('🟡');
            ctx.fillStyle = isGood ? '#34D399' : (isMid ? '#FBBF24' : '#F87171');
            ctx.font = '600 20px sans-serif';
            ctx.fillText(item, x + 35, cardY + 180 + itemIdx * 80, cW - 70);
        });

        ctx.restore();
    });

    // Bottom verdict
    ctx.save();
    ctx.font = '700 22px sans-serif';
    ctx.fillStyle = COLORS.btcOrange;
    ctx.textAlign = 'center';
    ctx.fillText(
        currentLang === 'es'
            ? "«SovereignLink ofrece soberanía real sin las tarifas de gas abusivas de Ethereum.»"
            : "«SovereignLink delivers true sovereignty without the predatory gas fees of Ethereum.»",
        W / 2,
        910
    );
    ctx.restore();
}

// ==========================================
// SCENE 5: HOW TO USE IN 3 SIMPLE STEPS
// ==========================================
function renderScene5(t) {
    drawHeaderBadge(
        "EFFORTLESS USER EXPERIENCE",
        "EXPERIENCIA DE USUARIO FLUIDA",
        "How to Use SovereignLink in 3 Steps",
        "Cómo Usar SovereignLink en 3 Sencillos Pasos"
    );

    const stepW = 460;
    const stepH = 580;
    const startX = 200;
    const gap = 40;
    const stepY = 240;

    const steps = [
        {
            num: "1",
            icon: "📲",
            title: currentLang === 'es' ? "Conecta tu Billetera Paytaca" : "Connect Paytaca Wallet",
            desc: currentLang === 'es'
                ? "Abre la dApp en bliquid.xyz/identity y toca 'Conectar Paytaca'. Escanea el código QR desde tu app móvil o usa la extensión web."
                : "Open the dApp at bliquid.xyz/identity and click 'Connect Paytaca'. Scan the QR code from mobile or connect via browser extension.",
            action: currentLang === 'es' ? "Listo en 5 segundos" : "Ready in 5 seconds"
        },
        {
            num: "2",
            icon: "✍️",
            title: currentLang === 'es' ? "Firma la Vinculación Cruzada" : "Sign Cross-Attestation",
            desc: currentLang === 'es'
                ? "Toca 'Crear Enlace Soberano'. Tu app Paytaca te pedirá autorizar la firma criptográfica para vincular tu dirección BCH con tu clave Nostr."
                : "Tap 'Create Sovereign Link'. Paytaca prompts you to sign the attestation statement tying your BCH address to your Nostr identity.",
            action: currentLang === 'es' ? "1 solo toque en tu móvil" : "1 tap on your device"
        },
        {
            num: "3",
            icon: "🌐",
            title: currentLang === 'es' ? "Verificación y Uso Mundial" : "Global Live Verification",
            desc: currentLang === 'es'
                ? "El evento firmado se publica en los relays de Nostr. Ya puedes recibir zaps en BCH, evitar fraudes y autenticarte en cualquier dApp."
                : "The signed event broadcasts to Nostr relays. You can now receive BCH zaps, eliminate impersonators, and log in passwordless.",
            action: currentLang === 'es' ? "Activo en todo el planeta" : "Active worldwide"
        }
    ];

    steps.forEach((st, i) => {
        const x = startX + i * (stepW + gap);
        ctx.save();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = COLORS.btcOrange;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, stepY, stepW, stepH, 20);
        ctx.fill();
        ctx.stroke();

        // Step number badge
        ctx.fillStyle = COLORS.btcOrange;
        ctx.beginPath();
        ctx.arc(x + 50, stepY + 60, 24, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#05070B';
        ctx.font = '800 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(st.num, x + 50, stepY + 60);

        // Icon
        ctx.font = '36px sans-serif';
        ctx.fillText(st.icon, x + stepW - 50, stepY + 60);

        // Title
        ctx.fillStyle = COLORS.textMain;
        ctx.font = '700 24px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(st.title, x + 35, stepY + 140, stepW - 70);

        // Divider
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(x + 35, stepY + 185);
        ctx.lineTo(x + stepW - 35, stepY + 185);
        ctx.stroke();

        // Desc
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '400 20px -apple-system, sans-serif';
        wrapText(ctx, st.desc, x + 35, stepY + 230, stepW - 70, 32);

        // Action Pill at Bottom
        ctx.fillStyle = 'rgba(247, 147, 26, 0.12)';
        ctx.strokeStyle = 'rgba(247, 147, 26, 0.3)';
        ctx.beginPath();
        ctx.roundRect(x + 35, stepY + 480, stepW - 70, 50, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = COLORS.btcOrange;
        ctx.font = '700 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`✓ ${st.action}`, x + stepW / 2, stepY + 505);

        ctx.restore();
    });

    // Bottom note
    ctx.save();
    ctx.font = '600 22px sans-serif';
    ctx.fillStyle = COLORS.bchGreen;
    ctx.textAlign = 'center';
    ctx.fillText(
        currentLang === 'es'
            ? "«Sin formularios, sin subir tu documento de identidad (KYC) y sin custodios.»"
            : "«No forms, no intrusive KYC identity uploads, and zero centralized custodians.»",
        W / 2,
        910
    );
    ctx.restore();
}

// ==========================================
// SCENE 6: GRAND FINALE — SPOTLIGHT TO PAYTACA
// ==========================================
function renderScene6(t) {
    drawHeaderBadge(
        "OFFICIAL SUBMISSION · BCH BLAZE 2026",
        "ENTREGA OFICIAL · HACKATHON BCH BLAZE 2026",
        "Special Thanks & Spotlight to Paytaca",
        "Homenaje Especial y Agradecimiento a Paytaca"
    );

    const entrance = easeOutCubic(t / 1.5);

    // Center Hero Spotlight Card
    const cX = 320;
    const cY = 220;
    const cW = 1280;
    const cH = 640;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = 'rgba(0, 209, 178, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(cX, cY, cW, cH, 28);
    ctx.fill();
    ctx.stroke();

    // Subtle glow behind the logo
    const centerGlow = ctx.createRadialGradient(W / 2, cY + 140, 10, W / 2, cY + 140, 250);
    centerGlow.addColorStop(0, 'rgba(0, 209, 178, 0.2)');
    centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(cX, cY, cW, 300);

    // Paytaca Brand Emblem
    ctx.fillStyle = COLORS.paytacaTeal;
    ctx.font = '900 68px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("Paytaca", W / 2, cY + 120);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '600 24px sans-serif';
    ctx.fillText(
        currentLang === 'es'
            ? "La Billetera Móvil No-Custodia por Excelencia de Bitcoin Cash"
            : "The Premier Non-Custodial Mobile Wallet for Bitcoin Cash",
        W / 2,
        cY + 175
    );

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(cX + 120, cY + 220);
    ctx.lineTo(cX + cW - 120, cY + 220);
    ctx.stroke();

    // Quote & Callout
    ctx.fillStyle = COLORS.btcOrange;
    ctx.font = '700 30px sans-serif';
    ctx.fillText(
        currentLang === 'es'
            ? "«La libertad de expresión necesita dinero libre de censura.»"
            : "«Freedom of speech requires censorship-resistant money.»",
        W / 2,
        cY + 285
    );

    // 3 Highlight badges for Paytaca
    const badgeW = 340;
    const badgeH = 120;
    const bStartX = cX + 80;
    const bGap = 40;
    const bY = cY + 340;

    const sponsorBadges = [
        {
            title: currentLang === 'es' ? "Bounty Sponsor" : "Bounty Sponsor",
            sub: "$500 PUSD Prize Track",
            color: COLORS.gold
        },
        {
            title: currentLang === 'es' ? "Soberanía Total" : "True Sovereignty",
            sub: "Keys Belong to You",
            color: COLORS.bchGreen
        },
        {
            title: "CashTokens & DeFi",
            sub: "Full Ecosystem Ready",
            color: COLORS.cyan
        }
    ];

    sponsorBadges.forEach((sb, i) => {
        const bx = bStartX + i * (badgeW + bGap);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.strokeStyle = sb.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, bY, badgeW, badgeH, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = sb.color;
        ctx.font = '700 22px sans-serif';
        ctx.fillText(sb.title, bx + badgeW / 2, bY + 45);

        ctx.fillStyle = COLORS.textMain;
        ctx.font = '500 17px sans-serif';
        ctx.fillText(sb.sub, bx + badgeW / 2, bY + 85);
    });

    // Download Paytaca CTA Banner
    const ctaY = cY + 500;
    ctx.fillStyle = COLORS.paytacaTeal;
    ctx.beginPath();
    ctx.roundRect(W / 2 - 280, ctaY, 560, 60, 30);
    ctx.fill();

    ctx.fillStyle = '#05070B';
    ctx.font = '800 22px sans-serif';
    ctx.fillText(
        currentLang === 'es' ? "📲 Descarga Paytaca en paytaca.com" : "📲 Download Paytaca at paytaca.com",
        W / 2,
        ctaY + 36
    );

    ctx.restore();

    // Bottom author signature
    ctx.save();
    ctx.font = '600 20px sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = 'center';
    ctx.fillText(
        currentLang === 'es'
            ? "Diseñado y desarrollado por Drian Stack Labs (@drianops) para el hackathon BCH BLAZE 2026."
            : "Architected & engineered by Drian Stack Labs (@drianops) for BCH BLAZE 2026 Hackathon.",
        W / 2,
        920
    );
    ctx.restore();
}

// Text wrapping helper
function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            context.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    context.fillText(line, x, currentY);
}

// ==========================================
// MAIN RENDER LOOP & PLAYBACK CONTROLLER
// ==========================================
function render(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    const currentScene = SCENES[currentSceneIdx];

    if (isPlaying) {
        sceneTime += delta;
        if (sceneTime >= currentScene.duration) {
            if (currentSceneIdx < SCENES.length - 1) {
                currentSceneIdx++;
                sceneTime = 0;
                updateSceneUI();
            } else {
                isPlaying = false;
                sceneTime = currentScene.duration;
                document.getElementById('btn-play').textContent = '▶ Replay';
            }
        }
    }

    // Render Canvas
    drawBackground(sceneTime);

    switch (currentSceneIdx) {
        case 0: renderScene1(sceneTime); break;
        case 1: renderScene2(sceneTime); break;
        case 2: renderScene3(sceneTime); break;
        case 3: renderScene4(sceneTime); break;
        case 4: renderScene5(sceneTime); break;
        case 5: renderScene6(sceneTime); break;
    }

    // Update Progress bar & time display
    const progressPercent = (sceneTime / currentScene.duration) * 100;
    document.getElementById('progress-bar').style.width = `${progressPercent}%`;
    document.getElementById('time-display').textContent = `${formatTime(sceneTime)} / ${formatTime(currentScene.duration)}`;

    animationFrameId = requestAnimationFrame(render);
}

function formatTime(seconds) {
    const s = Math.floor(seconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function updateSceneUI() {
    const cur = SCENES[currentSceneIdx];
    document.getElementById('video-title').textContent = currentLang === 'es' ? cur.titleEs : cur.titleEn;

    // Update pills active status
    document.querySelectorAll('.scene-pill').forEach((pill, idx) => {
        if (idx === currentSceneIdx) {
            pill.classList.add('active');
            pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else {
            pill.classList.remove('active');
        }
    });
}

function setupPills() {
    const container = document.getElementById('scene-pills');
    container.innerHTML = '';
    SCENES.forEach((scene, idx) => {
        const btn = document.createElement('button');
        btn.className = `scene-pill ${idx === currentSceneIdx ? 'active' : ''}`;
        btn.textContent = currentLang === 'es' ? scene.chapterEs : scene.chapterEn;
        btn.onclick = () => {
            currentSceneIdx = idx;
            sceneTime = 0;
            updateSceneUI();
        };
        container.appendChild(btn);
    });
}

// Event Listeners
document.getElementById('btn-play').onclick = () => {
    if (isPlaying) {
        isPlaying = false;
        document.getElementById('btn-play').textContent = '▶ Play';
    } else {
        if (currentSceneIdx === SCENES.length - 1 && sceneTime >= SCENES[currentSceneIdx].duration) {
            currentSceneIdx = 0;
            sceneTime = 0;
        }
        isPlaying = true;
        document.getElementById('btn-play').textContent = '⏸ Pause';
    }
};

document.getElementById('btn-prev').onclick = () => {
    if (currentSceneIdx > 0) {
        currentSceneIdx--;
        sceneTime = 0;
        updateSceneUI();
    }
};

document.getElementById('btn-next').onclick = () => {
    if (currentSceneIdx < SCENES.length - 1) {
        currentSceneIdx++;
        sceneTime = 0;
        updateSceneUI();
    }
};

document.getElementById('btn-lang-en').onclick = () => {
    currentLang = 'en';
    document.getElementById('btn-lang-en').classList.add('active');
    document.getElementById('btn-lang-es').classList.remove('active');
    updateSceneUI();
    setupPills();
};

document.getElementById('btn-lang-es').onclick = () => {
    currentLang = 'es';
    document.getElementById('btn-lang-es').classList.add('active');
    document.getElementById('btn-lang-en').classList.remove('active');
    updateSceneUI();
    setupPills();
};

document.getElementById('btn-fullscreen').onclick = () => {
    const el = document.getElementById('stage-container');
    if (!document.fullscreenElement) {
        el.requestFullscreen().catch(err => console.warn(err));
    } else {
        document.exitFullscreen();
    }
};

document.getElementById('progress-bar-container').onclick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    sceneTime = pos * SCENES[currentSceneIdx].duration;
};

// Keyboard controls
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        document.getElementById('btn-play').click();
    } else if (e.code === 'ArrowRight') {
        document.getElementById('btn-next').click();
    } else if (e.code === 'ArrowLeft') {
        document.getElementById('btn-prev').click();
    }
});

// Initialize
try {
    const params = new URLSearchParams(window.location.search);
    const sceneParam = params.get('scene') || window.location.hash.replace('#', '');
    if (sceneParam) {
        const sIdx = parseInt(sceneParam, 10);
        if (!isNaN(sIdx) && sIdx >= 1 && sIdx <= SCENES.length) {
            currentSceneIdx = sIdx - 1;
        }
    }
    const langParam = params.get('lang');
    if (langParam === 'es' || langParam === 'en') {
        currentLang = langParam;
        if (langParam === 'es') {
            document.getElementById('btn-lang-es')?.classList.add('active');
            document.getElementById('btn-lang-en')?.classList.remove('active');
        }
    }
} catch (e) {}

setupPills();
updateSceneUI();
requestAnimationFrame(render);
