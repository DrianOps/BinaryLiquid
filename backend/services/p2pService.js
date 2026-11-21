import crypto from 'crypto';
import { config } from '../config.js';
import { db } from './db.js';
import { oraclePool } from './oraclePool.js';
import { bchService } from './bchService.js';
import { parseCashAddress, isSameBchAddress } from '../utils/bchAddress.js';

const SUPPORTED_ASSETS = {
  PUSD: { symbol: 'PUSD', name: 'ParyonUSD (CashToken)', decimals: 6, isCashToken: true },
  BCH: { symbol: 'BCH', name: 'Bitcoin Cash L1', decimals: 8, isCashToken: false },
  MUSD: { symbol: 'MUSD', name: 'Moria USD (CashToken)', decimals: 6, isCashToken: true },
  LIFT: { symbol: 'LIFT', name: 'Paytaca LIFT (CashToken)', decimals: 2, isCashToken: true }
};

const SUPPORTED_FIATS = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', methods: ['Zelle', 'Wise', 'AirTM', 'ACH / Wire'] },
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso', methods: ['GCash', 'Maya', 'BPI', 'UnionBank', 'InstaPay'] },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan (RMB)', methods: ['Alipay', 'WeChat Pay', 'UnionPay', 'Bank Card'] },
  VES: { code: 'VES', symbol: 'Bs.', name: 'Bolívar Venezolano', methods: ['Pago Móvil', 'Banesco', 'Mercantil', 'BDV'] },
  COP: { code: 'COP', symbol: 'COP$', name: 'Peso Colombiano', methods: ['Nequi', 'Bancolombia', 'Daviplata'] },
  MXN: { code: 'MXN', symbol: 'MX$', name: 'Peso Mexicano', methods: ['SPEI', 'MercadoPago', 'BBVA'] },
  ARS: { code: 'ARS', symbol: 'ARS$', name: 'Peso Argentino', methods: ['MercadoPago', 'CBU/CVU', 'Brubank'] },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Real Brasileño', methods: ['Pix', 'Nubank', 'Itaú'] },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', methods: ['SEPA Instant', 'Revolut', 'Wise', 'Bizum'] },
  PEN: { code: 'PEN', symbol: 'S/', name: 'Sol Peruano', methods: ['Yape', 'Plin', 'BCP', 'Interbank'] },
  CLP: { code: 'CLP', symbol: 'CLP$', name: 'Peso Chileno', methods: ['CuentaRUT', 'Mach', 'MercadoPago'] },
  DOP: { code: 'DOP', symbol: 'RD$', name: 'Peso Dominicano', methods: ['Banco Popular', 'Banreservas', 'BHD'] },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', methods: ['Faster Payments', 'Revolut', 'Monzo'] },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', methods: ['OPay', 'Kuda', 'Bank Transfer'] },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', methods: ['UPI', 'IMPS', 'Paytm'] },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', methods: ['PayPay', 'Bank Furikomi', 'Wise'] }
};

const COUNTRY_TO_FIAT = {
  PH: 'PHP',
  CN: 'CNY',
  HK: 'CNY',
  MO: 'CNY',
  VE: 'VES',
  CO: 'COP',
  MX: 'MXN',
  AR: 'ARS',
  BR: 'BRL',
  PE: 'PEN',
  CL: 'CLP',
  DO: 'DOP',
  GB: 'GBP',
  UK: 'GBP',
  NG: 'NGN',
  IN: 'INR',
  JP: 'JPY',
  US: 'USD',
  PR: 'USD',
  EC: 'USD',
  PA: 'USD',
  SV: 'USD',
  ES: 'EUR',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  PT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  IE: 'EUR',
  FI: 'EUR',
  GR: 'EUR'
};

const TIMEZONE_TO_FIAT = {
  'Asia/Manila': 'PHP',
  'Asia/Shanghai': 'CNY',
  'Asia/Chongqing': 'CNY',
  'Asia/Harbin': 'CNY',
  'Asia/Urumqi': 'CNY',
  'Asia/Hong_Kong': 'CNY',
  'America/Caracas': 'VES',
  'America/Bogota': 'COP',
  'America/Mexico_City': 'MXN',
  'America/Monterrey': 'MXN',
  'America/Cancun': 'MXN',
  'America/Tijuana': 'MXN',
  'America/Buenos_Aires': 'ARS',
  'America/Argentina/Buenos_Aires': 'ARS',
  'America/Argentina/Cordoba': 'ARS',
  'America/Sao_Paulo': 'BRL',
  'America/Fortaleza': 'BRL',
  'America/Recife': 'BRL',
  'America/Lima': 'PEN',
  'America/Santiago': 'CLP',
  'America/Santo_Domingo': 'DOP',
  'Europe/London': 'GBP',
  'Africa/Lagos': 'NGN',
  'Asia/Kolkata': 'INR',
  'Asia/Calcutta': 'INR',
  'Asia/Tokyo': 'JPY',
  'America/New_York': 'USD',
  'America/Chicago': 'USD',
  'America/Denver': 'USD',
  'America/Los_Angeles': 'USD'
};

export function detectFiatFromContext({ countryCode = '', timeZone = '', acceptLanguage = '' } = {}) {
  const cc = String(countryCode || '').trim().toUpperCase();
  if (cc && COUNTRY_TO_FIAT[cc]) {
    return { fiat: COUNTRY_TO_FIAT[cc], source: 'country', countryCode: cc };
  }
  const tz = String(timeZone || '').trim();
  if (tz) {
    if (TIMEZONE_TO_FIAT[tz]) {
      return { fiat: TIMEZONE_TO_FIAT[tz], source: 'timezone', countryCode: cc || null };
    }
    if (tz.startsWith('America/Argentina/')) {
      return { fiat: 'ARS', source: 'timezone', countryCode: cc || 'AR' };
    }
    if (tz.startsWith('Europe/')) {
      return { fiat: 'EUR', source: 'timezone', countryCode: cc || null };
    }
  }
  const lang = String(acceptLanguage || '').toLowerCase();
  if (lang.includes('-ph') || lang.startsWith('fil') || lang.startsWith('tl')) return { fiat: 'PHP', source: 'locale', countryCode: 'PH' };
  if (lang.includes('-cn') || lang.includes('zh-hans')) return { fiat: 'CNY', source: 'locale', countryCode: 'CN' };
  if (lang.includes('-ve')) return { fiat: 'VES', source: 'locale', countryCode: 'VE' };
  if (lang.includes('-co')) return { fiat: 'COP', source: 'locale', countryCode: 'CO' };
  if (lang.includes('-mx')) return { fiat: 'MXN', source: 'locale', countryCode: 'MX' };
  if (lang.includes('-ar')) return { fiat: 'ARS', source: 'locale', countryCode: 'AR' };
  if (lang.includes('-br') || lang.startsWith('pt-br')) return { fiat: 'BRL', source: 'locale', countryCode: 'BR' };
  if (lang.includes('-pe')) return { fiat: 'PEN', source: 'locale', countryCode: 'PE' };
  if (lang.includes('-cl')) return { fiat: 'CLP', source: 'locale', countryCode: 'CL' };
  if (lang.includes('-do')) return { fiat: 'DOP', source: 'locale', countryCode: 'DO' };
  if (lang.includes('-gb')) return { fiat: 'GBP', source: 'locale', countryCode: 'GB' };
  if (lang.includes('-in') || lang.startsWith('hi')) return { fiat: 'INR', source: 'locale', countryCode: 'IN' };
  if (lang.includes('-jp') || lang.startsWith('ja')) return { fiat: 'JPY', source: 'locale', countryCode: 'JP' };
  return { fiat: 'USD', source: 'default', countryCode: cc || 'US' };
}

class P2PService {
  constructor() {
    this.initStore();
  }

  initStore() {
    if (!Array.isArray(db.memoryState.p2pOffers)) {
      db.memoryState.p2pOffers = [];
    } else {
      // Remove any legacy synthetic/test desk offers that were not published by real users
      db.memoryState.p2pOffers = db.memoryState.p2pOffers.filter(
        o =>
          o &&
          !o.isTestnetDesk &&
          !String(o.id || '').startsWith('desk_chipnet_') &&
          String(o.merchantHandle || '').toLowerCase() !== '@bliquid_desk@bliquid.xyz'
      );
    }
    if (!Array.isArray(db.memoryState.p2pTrades)) {
      db.memoryState.p2pTrades = [];
    }
    if (!db.memoryState.p2pReputation || typeof db.memoryState.p2pReputation !== 'object') {
      db.memoryState.p2pReputation = {};
    }
  }

  _normalizeBch(addr, isTestnet = true) {
    const clean = String(addr || '').split(',')[0].trim();
    const parsed = parseCashAddress(clean, isTestnet);
    return parsed ? parsed.tokenAddress : '';
  }

  _normalizeRequiredHandle(rawHandle) {
    const trimmed = String(rawHandle || '').trim().toLowerCase();
    if (!trimmed) {
      throw new Error(
        'Es obligatorio contar con una Identidad Descentralizada (@usuario) creada en BinaryLiquid Identity (/identity) para operar en P2P.'
      );
    }
    const noLeadingAt = trimmed.replace(/^@+/, '');
    const [userPart, domainPart] = noLeadingAt.includes('@')
      ? noLeadingAt.split('@')
      : [noLeadingAt, 'bliquid.xyz'];
    const cleanUser = String(userPart || '').replace(/[^a-z0-9_-]/g, '');
    if (cleanUser.length < 3 || cleanUser.length > 24) {
      throw new Error(
        'Tu Identidad Descentralizada (@usuario) debe tener entre 3 y 24 caracteres válidos (a-z, 0-9, _, -). Créala en /identity.'
      );
    }
    const cleanDomain = String(domainPart || 'bliquid.xyz').replace(/[^a-z0-9.-]/g, '') || 'bliquid.xyz';
    return `@${cleanUser}@${cleanDomain}`;
  }

  _normalizePaymentDetails(raw, required = true) {
    if (!raw || typeof raw !== 'object') {
      if (required) {
        throw new Error(
          'Debes ingresar tus datos bancarios / cuenta de cobro (Titular, Banco/App y Número de cuenta/Teléfono/Alias) para recibir el pago fiat.'
        );
      }
      return null;
    }
    const holderName = String(raw.holderName || '').trim().slice(0, 80);
    const bankName = String(raw.bankName || '').trim().slice(0, 80);
    const accountNumber = String(raw.accountNumber || '').trim().slice(0, 120);
    const documentId = String(raw.documentId || '').trim().slice(0, 50);
    const instructions = String(raw.instructions || '').trim().slice(0, 200);

    if (
      required &&
      (!holderName || holderName.length < 2 || !bankName || bankName.length < 2 || !accountNumber || accountNumber.length < 4)
    ) {
      throw new Error(
        'Completa tus datos bancarios de cobro: Nombre del Titular, Banco o App de Pago y Número de Cuenta / Teléfono / Correo / Alias.'
      );
    }
    if (!holderName && !bankName && !accountNumber) return null;
    return {
      holderName,
      bankName,
      accountNumber,
      documentId: documentId || null,
      instructions: instructions || null
    };
  }

  _sanitizeTrade(trade) {
    if (!trade) return null;
    const isEscrowUnlocked = ['ESCROW_FUNDED', 'FIAT_SENT', 'DISPUTED', 'COMPLETED'].includes(trade.status);
    if (!trade.paymentDetails) {
      return { ...trade, paymentDetails: null, paymentDetailsUnlocked: isEscrowUnlocked };
    }
    if (!isEscrowUnlocked) {
      return {
        ...trade,
        paymentDetailsUnlocked: false,
        paymentDetails: {
          holderName: '🔒 Protegido hasta bloqueo Escrow on-chain',
          bankName: trade.paymentDetails.bankName || trade.paymentMethod,
          accountNumber: '🔒 Se revela al verificar el depósito en BinaryLiquidP2PEscrow.cash',
          documentId: null,
          instructions: null,
          isLockedUntilEscrow: true
        }
      };
    }
    return {
      ...trade,
      paymentDetailsUnlocked: true,
      paymentDetails: {
        ...trade.paymentDetails,
        isLockedUntilEscrow: false
      }
    };
  }

  _getReputation(bchAddress) {
    const key = String(bchAddress || '').trim().toLowerCase();
    const rec = db.memoryState.p2pReputation?.[key];
    if (!rec) {
      return {
        completedTrades: 0,
        disputes: 0,
        completionRate: 100,
        avgRating: 5.0,
        reviewCount: 0,
        recentReviews: [],
        liftCashbackEarned: 0
      };
    }
    const total = Number(rec.completedTrades || 0) + Number(rec.cancelledTrades || 0);
    const rate = total > 0 ? Math.round((Number(rec.completedTrades || 0) / total) * 100) : 100;
    const reviews = Array.isArray(rec.reviews) ? rec.reviews : [];
    const avgRating =
      reviews.length > 0
        ? Number((reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / reviews.length).toFixed(2))
        : 5.0;
    return {
      completedTrades: Number(rec.completedTrades || 0),
      disputes: Number(rec.disputes || 0),
      completionRate: Math.max(0, Math.min(100, rate)),
      avgRating,
      reviewCount: reviews.length,
      recentReviews: reviews.slice(0, 15),
      liftCashbackEarned: Number(Number(rec.liftCashbackEarned || 0).toFixed(2))
    };
  }

  _bumpReputation(bchAddress, field, amount = 1) {
    const key = String(bchAddress || '').trim().toLowerCase();
    if (!key) return;
    if (!db.memoryState.p2pReputation[key]) {
      db.memoryState.p2pReputation[key] = {
        completedTrades: 0,
        cancelledTrades: 0,
        disputes: 0,
        liftCashbackEarned: 0,
        reviews: []
      };
    }
    db.memoryState.p2pReputation[key][field] =
      Number(db.memoryState.p2pReputation[key][field] || 0) + Number(amount || 0);
  }

  async _getUnitFiatPrice(assetSymbol, fiatCode, marginPct = 0, fixedPrice = null) {
    const asset = SUPPORTED_ASSETS[assetSymbol] || SUPPORTED_ASSETS.PUSD;
    const fiat = SUPPORTED_FIATS[fiatCode] || SUPPORTED_FIATS.USD;
    const [assetUsd, fiatRates] = await Promise.all([
      oraclePool.getPriceUsd(asset.symbol).catch(() => (asset.symbol === 'BCH' ? 200 : 1)),
      oraclePool.getFiatRates()
    ]);
    const fx = Number(fiatRates?.[fiat.code] || 1);
    const oracleFiatPrice = assetUsd * fx;
    if (Number.isFinite(Number(fixedPrice)) && Number(fixedPrice) > 0) {
      return {
        oracleFiatPrice: Number(oracleFiatPrice.toFixed(4)),
        unitFiatPrice: Number(Number(fixedPrice).toFixed(4)),
        assetUsd,
        fx
      };
    }
    const factor = 1 + (Number(marginPct) || 0) / 100;
    return {
      oracleFiatPrice: Number(oracleFiatPrice.toFixed(4)),
      unitFiatPrice: Number((oracleFiatPrice * factor).toFixed(4)),
      assetUsd,
      fx
    };
  }

  async getOverview({
    network = 'testnet',
    fiat = 'AUTO',
    asset = 'PUSD',
    side = 'all',
    userAddress = '',
    countryCode = '',
    timeZone = '',
    acceptLanguage = ''
  } = {}) {
    this.initStore();
    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    const net = isTestnet ? 'testnet' : 'mainnet';
    const cleanAsset = SUPPORTED_ASSETS[String(asset || 'PUSD').toUpperCase()] ? String(asset).toUpperCase() : 'PUSD';

    const geoDetection = detectFiatFromContext({ countryCode, timeZone, acceptLanguage });
    const reqFiatUpper = String(fiat || 'AUTO').toUpperCase();
    const cleanFiat =
      reqFiatUpper !== 'AUTO' && SUPPORTED_FIATS[reqFiatUpper]
        ? reqFiatUpper
        : geoDetection.fiat;

    const [fiatRates, bchUsd, liftUsd] = await Promise.all([
      oraclePool.getFiatRates(),
      oraclePool.getPriceUsd('BCH').catch(() => 200),
      oraclePool.getPriceUsd('LIFT').catch(() => 0.015)
    ]);

    const userPublished = db.memoryState.p2pOffers.filter(
      o =>
        o &&
        o.active !== false &&
        !o.isTestnetDesk &&
        (o.network || 'testnet') === net &&
        Number(o.availableAmount || 0) >= Number(o.minAmount || 0.000001)
    );

    const filtered = userPublished.filter(o => {
      if (cleanAsset && o.asset !== cleanAsset) return false;
      if (cleanFiat && o.fiat !== cleanFiat) return false;
      if (side === 'buy' && o.side !== 'sell') return false; // User wants to BUY -> show merchant SELL ads
      if (side === 'sell' && o.side !== 'buy') return false; // User wants to SELL -> show merchant BUY ads
      return true;
    });

    const assetUsdMap = { PUSD: 1.0, MUSD: 1.0, BCH: bchUsd, LIFT: liftUsd };
    const enrichOffer = (o) => {
      const fx = Number(fiatRates?.[o.fiat] || 1);
      const oracleFiatPrice = (assetUsdMap[o.asset] || 1) * fx;
      const unitFiatPrice =
        o.pricingMode === 'fixed' && Number(o.fixedPrice) > 0
          ? Number(o.fixedPrice)
          : Number((oracleFiatPrice * (1 + (Number(o.marginPct) || 0) / 100)).toFixed(4));
      const rep = this._getReputation(o.merchantAddress);
      const { paymentDetails, ...publicOffer } = o;
      return {
        ...publicOffer,
        hasPaymentDetails: Boolean(paymentDetails?.accountNumber),
        paymentBankLabel: paymentDetails?.bankName || null,
        oracleFiatPrice: Number(oracleFiatPrice.toFixed(4)),
        unitFiatPrice,
        fiatSymbol: SUPPORTED_FIATS[o.fiat]?.symbol || '$',
        cashbackRatePct: 0.25,
        reputation: rep
      };
    };

    const offers = filtered.map(enrichOffer).sort((a, b) => {
      return side === 'sell' ? b.unitFiatPrice - a.unitFiatPrice : a.unitFiatPrice - b.unitFiatPrice;
    });

    const allNetTrades = db.memoryState.p2pTrades.filter(tr => (tr.network || 'testnet') === net && !tr.isTestnetDesk);
    const cleanUserBch = userAddress ? this._normalizeBch(userAddress, isTestnet) : '';
    const myTrades = cleanUserBch
      ? allNetTrades
          .filter(tr => isSameBchAddress(tr.sellerAddress, cleanUserBch) || isSameBchAddress(tr.buyerAddress, cleanUserBch))
          .slice(0, 30)
          .map(tr => this._sanitizeTrade(tr))
      : [];

    const completedTrades = allNetTrades.filter(tr => tr.status === 'COMPLETED');
    const totalVolumeUsd = completedTrades.reduce((s, tr) => s + Number(tr.cryptoUsdValue || 0), 0);
    const userRep = cleanUserBch ? this._getReputation(cleanUserBch) : this._getReputation('');

    return {
      network: net,
      activeFiat: cleanFiat,
      detectedFiat: geoDetection.fiat,
      detectionSource: geoDetection.source,
      detectedCountry: geoDetection.countryCode,
      contract: {
        name: 'BinaryLiquidP2PEscrow.cash',
        type: 'P2SH32 Non-Custodial CashScript Covenant',
        timelockHours: 24,
        feePercent: 0,
        cashbackRatePct: 0.25
      },
      userRewards: {
        liftCashbackEarned: userRep.liftCashbackEarned,
        completedTrades: userRep.completedTrades,
        avgRating: userRep.avgRating,
        reviewCount: userRep.reviewCount,
        cashbackRatePct: 0.25
      },
      assets: Object.values(SUPPORTED_ASSETS),
      fiats: Object.values(SUPPORTED_FIATS),
      fiatRates,
      assetPricesUsd: assetUsdMap,
      oracleProvider: oraclePool.activeProvider,
      stats: {
        activeOffersCount: userPublished.length,
        totalTradesCount: allNetTrades.length,
        completedTradesCount: completedTrades.length,
        totalVolumeUsd: Number(totalVolumeUsd.toFixed(2))
      },
      offers,
      myTrades
    };
  }

  async createOffer({
    merchantAddress,
    merchantHandle = '',
    side = 'sell',
    asset = 'PUSD',
    fiat = 'VES',
    pricingMode = 'floating',
    marginPct = 0.5,
    fixedPrice = null,
    availableAmount = 100,
    minAmount = 5,
    maxAmount = 100,
    paymentMethods = [],
    paymentDetails = null,
    terms = '',
    network = 'testnet'
  }) {
    this.initStore();
    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    const net = isTestnet ? 'testnet' : 'mainnet';
    const cleanMerchant = this._normalizeBch(merchantAddress, isTestnet);
    if (!cleanMerchant) {
      throw new Error(`Conecta tu billetera Bitcoin Cash (${isTestnet ? 'Chipnet' : 'Mainnet'}) para publicar un anuncio P2P.`);
    }

    // Mandatory Decentralized Identity (@usuario)
    const cleanHandle = this._normalizeRequiredHandle(merchantHandle);

    const cleanAsset = String(asset || 'PUSD').toUpperCase();
    if (!SUPPORTED_ASSETS[cleanAsset]) {
      throw new Error(`Activo ${cleanAsset} no soportado en P2P.`);
    }
    const cleanFiat = String(fiat || 'VES').toUpperCase();
    if (!SUPPORTED_FIATS[cleanFiat]) {
      throw new Error(`Moneda fiat ${cleanFiat} no soportada en P2P.`);
    }

    const cleanSide = String(side || 'sell').toLowerCase() === 'buy' ? 'buy' : 'sell';
    const avail = Number(availableAmount);
    const min = Number(minAmount);
    const max = Number(maxAmount);
    if (!Number.isFinite(avail) || avail <= 0) throw new Error('Ingresa una cantidad disponible válida.');
    if (!Number.isFinite(min) || min <= 0 || !Number.isFinite(max) || max < min) {
      throw new Error('Los límites mínimo y máximo del anuncio son inválidos.');
    }
    if (min > avail) {
      throw new Error('El monto mínimo no puede superar la liquidez total disponible.');
    }

    const methods = Array.isArray(paymentMethods)
      ? paymentMethods.map(m => String(m || '').trim()).filter(Boolean).slice(0, 5)
      : [];
    if (methods.length === 0) {
      methods.push(SUPPORTED_FIATS[cleanFiat].methods[0]);
    }

    // If merchant is SELLING crypto, they will RECEIVE fiat -> paymentDetails (bank/payment account) is mandatory
    const cleanPaymentDetails = this._normalizePaymentDetails(paymentDetails, cleanSide === 'sell');

    const cleanMargin = Math.max(-15, Math.min(25, Number(marginPct) || 0));
    const cleanFixed = pricingMode === 'fixed' && Number(fixedPrice) > 0 ? Number(fixedPrice) : null;
    if (pricingMode === 'fixed' && !cleanFixed) {
      throw new Error('Ingresa un precio fijo válido en moneda fiat.');
    }

    const offer = {
      id: `p2p_ad_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      merchantAddress: cleanMerchant,
      merchantHandle: cleanHandle,
      side: cleanSide,
      asset: cleanAsset,
      fiat: cleanFiat,
      pricingMode: cleanFixed ? 'fixed' : 'floating',
      marginPct: cleanMargin,
      fixedPrice: cleanFixed,
      totalAmount: Number(avail.toFixed(6)),
      availableAmount: Number(avail.toFixed(6)),
      minAmount: Number(min.toFixed(6)),
      maxAmount: Number(Math.min(max, avail).toFixed(6)),
      paymentMethods: methods,
      paymentDetails: cleanPaymentDetails,
      terms: String(terms || '').trim().slice(0, 280),
      network: net,
      isTestnetDesk: false,
      active: true,
      createdAt: Date.now()
    };

    db.memoryState.p2pOffers.unshift(offer);
    db.persist();
    const { paymentDetails: _pd, ...publicOffer } = offer;
    return {
      ...publicOffer,
      hasPaymentDetails: Boolean(cleanPaymentDetails?.accountNumber),
      paymentBankLabel: cleanPaymentDetails?.bankName || null
    };
  }

  deleteOffer({ offerId, merchantAddress, network = 'testnet' }) {
    this.initStore();
    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    const cleanMerchant = this._normalizeBch(merchantAddress, isTestnet);
    const idx = db.memoryState.p2pOffers.findIndex(o => o.id === offerId);
    if (idx === -1) throw new Error('Anuncio P2P no encontrado.');
    const offer = db.memoryState.p2pOffers[idx];
    if (!cleanMerchant || !isSameBchAddress(offer.merchantAddress, cleanMerchant)) {
      throw new Error('Solo el comerciante propietario puede desactivar este anuncio.');
    }
    db.memoryState.p2pOffers.splice(idx, 1);
    db.persist();
    return { deleted: true, offerId };
  }

  async createTrade({
    offerId,
    takerAddress,
    takerHandle = '',
    cryptoAmount,
    paymentMethod = '',
    paymentDetails = null,
    network = 'testnet'
  }) {
    this.initStore();
    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    const net = isTestnet ? 'testnet' : 'mainnet';
    const cleanTaker = this._normalizeBch(takerAddress, isTestnet);
    if (!cleanTaker) {
      throw new Error(`Conecta tu billetera Bitcoin Cash (${isTestnet ? 'Chipnet' : 'Mainnet'}) para abrir una orden P2P.`);
    }

    // Mandatory Decentralized Identity (@usuario) for Taker
    const cleanTakerHandle = this._normalizeRequiredHandle(takerHandle);

    const offer = db.memoryState.p2pOffers.find(o => o && o.id === offerId && o.active !== false && !o.isTestnetDesk);
    if (!offer) {
      throw new Error('El anuncio P2P ya no está disponible.');
    }

    const amt = Number(cryptoAmount);
    if (!Number.isFinite(amt) || amt < Number(offer.minAmount) || amt > Number(offer.maxAmount)) {
      throw new Error(`El monto debe estar entre ${offer.minAmount} y ${offer.maxAmount} ${offer.asset}.`);
    }
    if (amt > Number(offer.availableAmount)) {
      throw new Error(`Liquidez insuficiente en el anuncio (disponible: ${offer.availableAmount} ${offer.asset}).`);
    }

    // Determine Seller (funds CashScript escrow & receives fiat) & Buyer (sends fiat & receives CashScript escrow)
    // If offer.side === 'sell', merchant is Seller and taker is Buyer.
    // If offer.side === 'buy', merchant is Buyer and taker is Seller.
    const sellerAddress = offer.side === 'sell' ? offer.merchantAddress : cleanTaker;
    const sellerHandle = offer.side === 'sell' ? offer.merchantHandle : cleanTakerHandle;
    const buyerAddress = offer.side === 'sell' ? cleanTaker : offer.merchantAddress;
    const buyerHandle = offer.side === 'sell' ? cleanTakerHandle : offer.merchantHandle;

    if (isSameBchAddress(sellerAddress, buyerAddress)) {
      throw new Error('No puedes tomar tu propio anuncio P2P con la misma billetera.');
    }

    // Seller's Bank / Payment Details:
    // - If offer.side === 'sell', use the merchant's stored offer.paymentDetails
    // - If offer.side === 'buy', the taker is the Seller receiving fiat, so taker MUST provide paymentDetails
    const sellerPaymentDetails =
      offer.side === 'sell'
        ? offer.paymentDetails || this._normalizePaymentDetails(paymentDetails, true)
        : this._normalizePaymentDetails(paymentDetails, true);

    const pricing = await this._getUnitFiatPrice(offer.asset, offer.fiat, offer.marginPct, offer.fixedPrice);
    const fiatAmount = Number((amt * pricing.unitFiatPrice).toFixed(2));
    const cryptoUsdValue = Number((amt * pricing.assetUsd).toFixed(2));
    const liftUsdPrice = await oraclePool.getPriceUsd('LIFT').catch(() => 0.015);
    const safeLiftUsd = Number.isFinite(Number(liftUsdPrice)) && Number(liftUsdPrice) > 0 ? Number(liftUsdPrice) : 0.015;
    const liftCashbackReward = Number(Math.max(1, (cryptoUsdValue * 0.0025) / safeLiftUsd).toFixed(2));

    const tradeId = `p2p_tr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const assetMeta = SUPPORTED_ASSETS[offer.asset] || SUPPORTED_ASSETS.PUSD;

    // Derive REAL, unique, isolated P2SH32 CashScript Escrow Covenant for this exact trade
    const escrow = await bchService.createP2PEscrowCovenant({
      tradeId,
      sellerAddress,
      buyerAddress,
      isChipnet: isTestnet,
      isCashToken: assetMeta.isCashToken
    });

    const chosenMethod =
      paymentMethod && offer.paymentMethods.includes(paymentMethod)
        ? paymentMethod
        : offer.paymentMethods[0] || 'Transferencia';

    // Reserve offer liquidity so concurrent orders cannot over-subscribe
    offer.availableAmount = Number(Math.max(0, Number(offer.availableAmount) - amt).toFixed(6));
    if (offer.availableAmount < Number(offer.minAmount || 0.000001)) {
      offer.active = false;
    } else {
      offer.maxAmount = Number(Math.min(Number(offer.maxAmount), offer.availableAmount).toFixed(6));
    }

    const trade = {
      id: tradeId,
      offerId: offer.id,
      network: net,
      isTestnetDesk: false,
      asset: offer.asset,
      assetDecimals: assetMeta.decimals,
      isCashToken: assetMeta.isCashToken,
      cryptoAmount: Number(amt.toFixed(assetMeta.decimals)),
      cryptoUsdValue,
      fiat: offer.fiat,
      fiatSymbol: SUPPORTED_FIATS[offer.fiat]?.symbol || '$',
      unitFiatPrice: pricing.unitFiatPrice,
      fiatAmount,
      cashbackRatePct: 0.25,
      liftCashbackReward,
      liftCashbackCredited: false,
      paymentMethod: chosenMethod,
      paymentDetails: sellerPaymentDetails,
      sellerAddress: escrow.sellerTokenAddress,
      sellerHandle,
      buyerAddress: escrow.buyerTokenAddress,
      buyerHandle,
      escrowAddress: escrow.address,
      escrowBaseAddress: escrow.baseAddress,
      escrowTokenAddress: escrow.tokenAddress,
      escrowExplorerUrl: escrow.explorerUrl,
      contractName: escrow.contractName,
      contractType: escrow.contractType,
      expiryTimestamp: escrow.expiryTimestamp,
      status: 'AWAITING_ESCROW',
      fundTxHash: null,
      fundExplorerUrl: null,
      fiatReference: null,
      releaseTxHash: null,
      releaseExplorerUrl: null,
      disputeReason: null,
      buyerReview: null,
      sellerReview: null,
      messages: [
        {
          id: `msg_${Date.now()}`,
          sender: 'SYSTEM',
          text: `Escrow CashScript P2SH32 derivado (${escrow.address.slice(0, 18)}...). Los datos bancarios del vendedor (${sellerHandle}) se desbloquearán automáticamente en cuanto el depósito cripto sea verificado on-chain. Recompensa Cashback de la orden: +${liftCashbackReward} LIFT (0.25%).`,
          timestamp: Date.now()
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    db.memoryState.p2pTrades.unshift(trade);
    db.persist();
    return this._sanitizeTrade(trade);
  }

  _getRawTrade(tradeId) {
    this.initStore();
    const trade = db.memoryState.p2pTrades.find(t => t.id === tradeId);
    if (!trade) throw new Error('Orden P2P no encontrada.');
    return trade;
  }

  getTrade(tradeId) {
    return this._sanitizeTrade(this._getRawTrade(tradeId));
  }

  async buildFundEscrowTx({ tradeId, senderAddress }) {
    const trade = this._getRawTrade(tradeId);
    const isChipnet = trade.network === 'testnet';
    return bchService.buildUnsignedSwapWcTransaction({
      senderAddress: senderAddress || trade.sellerAddress,
      depositAddress: trade.escrowAddress,
      tokenSymbol: trade.asset,
      amount: trade.cryptoAmount,
      isChipnet
    });
  }

  async verifyEscrowDeposit({ tradeId, txHash = '' }) {
    this.initStore();
    return db.withLock(`p2p_verify:${tradeId}`, async () => {
      const trade = this._getRawTrade(tradeId);
      if (['ESCROW_FUNDED', 'FIAT_SENT', 'COMPLETED'].includes(trade.status)) {
        return this._sanitizeTrade(trade);
      }

      const isChipnet = trade.network === 'testnet';
      await bchService.readyPromise;
      const provider = isChipnet ? bchService.chipnetProvider : bchService.mainnetProvider;
      if (!provider) throw new Error('Proveedor Electrum BCH no disponible.');

      const cleanTx = String(txHash || '').trim().replace(/^0x/i, '').toLowerCase();
      const [utxosToken, utxosBase] = await Promise.all([
        provider.getUtxos(trade.escrowTokenAddress).catch(() => []),
        provider.getUtxos(trade.escrowBaseAddress).catch(() => [])
      ]);

      // Strict UTXO deduplication by txid:vout
      const seen = new Set();
      const allUtxos = [...(utxosToken || []), ...(utxosBase || [])].filter(u => {
        const key = `${String(u?.txid || '').toLowerCase()}:${u?.vout ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const explorerTxBase = isChipnet
        ? 'https://chipnet.imaginary.cash/tx'
        : 'https://3xpl.com/bitcoin-cash/transaction';

      let matchedTxId = null;
      let fundedAmount = 0;

      if (trade.isCashToken) {
        const expectedCat = String(bchService.getTokenCategory(trade.asset, isChipnet) || '').toLowerCase();
        const decimals = trade.assetDecimals || 6;
        const matching = allUtxos.filter(u => {
          if (u.token?.category?.toLowerCase() !== expectedCat) return false;
          if (BigInt(u.token?.amount || 0) <= 0n) return false;
          if (cleanTx && u.txid?.toLowerCase() !== cleanTx) return false;
          return true;
        });
        const totalUnits = matching.reduce((s, u) => s + BigInt(u.token.amount), 0n);
        fundedAmount = Number(totalUnits) / 10 ** decimals;
        if (fundedAmount >= trade.cryptoAmount * 0.99 && matching.length > 0) {
          matchedTxId = matching[0].txid.toLowerCase();
        }
      } else {
        const matching = allUtxos.filter(u => {
          if (u.token) return false;
          if (BigInt(u.satoshis || 0) < 546n) return false;
          if (cleanTx && u.txid?.toLowerCase() !== cleanTx) return false;
          return true;
        });
        const totalSats = matching.reduce((s, u) => s + BigInt(u.satoshis), 0n);
        fundedAmount = Number(totalSats) / 1e8;
        if (fundedAmount >= trade.cryptoAmount * 0.98 && matching.length > 0) {
          matchedTxId = matching[0].txid.toLowerCase();
        }
      }

      if (!matchedTxId) {
        throw new Error(
          `Aún no se detectan ${trade.cryptoAmount} ${trade.asset} bloqueados en el Escrow P2SH32 (${trade.escrowAddress}). Envía los fondos y vuelve a verificar.`
        );
      }

      trade.status = 'ESCROW_FUNDED';
      trade.fundTxHash = matchedTxId;
      trade.fundExplorerUrl = `${explorerTxBase}/${matchedTxId}`;
      trade.updatedAt = Date.now();
      trade.messages.push({
        id: `msg_${Date.now()}`,
        sender: 'SYSTEM',
        text: `✅ Escrow verificado on-chain: ${fundedAmount.toFixed(trade.isCashToken ? 4 : 6)} ${trade.asset} bloqueados en BinaryLiquidP2PEscrow.cash (TX ${matchedTxId.slice(0, 12)}...). Datos bancarios del vendedor desbloqueados para transferir ${trade.fiatSymbol} ${trade.fiatAmount} vía ${trade.paymentMethod}.`,
        timestamp: Date.now()
      });

      db.markTxHashConsumed(matchedTxId, { module: 'P2P_ESCROW_FUND', tradeId: trade.id });
      db.persist();
      return this._sanitizeTrade(trade);
    });
  }

  markFiatPaid({ tradeId, actorAddress, fiatReference = '' }) {
    this.initStore();
    const trade = this._getRawTrade(tradeId);
    const isChipnet = trade.network === 'testnet';
    const cleanActor = this._normalizeBch(actorAddress, isChipnet);

    const isBuyer = cleanActor && isSameBchAddress(trade.buyerAddress, cleanActor);
    if (!isBuyer) {
      throw new Error('Solo el comprador puede marcar el pago fiat como enviado.');
    }
    if (trade.status !== 'ESCROW_FUNDED') {
      throw new Error(`No se puede marcar pago fiat cuando la orden está en estado ${trade.status}.`);
    }

    const cleanRef = String(fiatReference || '').trim().slice(0, 120);
    if (!cleanRef || cleanRef.length < 3) {
      throw new Error('Debes ingresar el número de referencia o comprobante bancario de tu transferencia fiat.');
    }

    trade.status = 'FIAT_SENT';
    trade.fiatReference = cleanRef;
    trade.updatedAt = Date.now();
    trade.messages.push({
      id: `msg_${Date.now()}`,
      sender: 'SYSTEM',
      text: `💸 Pago fiat marcado como enviado (${trade.paymentMethod} · Ref: ${trade.fiatReference}). El vendedor debe verificar la acreditación en su cuenta bancaria antes de liberar el Escrow.`,
      timestamp: Date.now()
    });
    db.persist();
    return this._sanitizeTrade(trade);
  }

  addMessage({ tradeId, actorAddress, text }) {
    this.initStore();
    const trade = this._getRawTrade(tradeId);
    const isChipnet = trade.network === 'testnet';
    const cleanActor = this._normalizeBch(actorAddress, isChipnet);
    const cleanText = String(text || '').trim().slice(0, 400);
    if (!cleanText) throw new Error('El mensaje no puede estar vacío.');

    const isSeller = cleanActor && isSameBchAddress(trade.sellerAddress, cleanActor);
    const isBuyer = cleanActor && isSameBchAddress(trade.buyerAddress, cleanActor);
    if (!isSeller && !isBuyer) {
      throw new Error('Solo el comprador o vendedor de esta orden pueden escribir en el chat.');
    }

    const msg = {
      id: `msg_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      sender: isSeller ? 'SELLER' : 'BUYER',
      senderAddress: cleanActor,
      text: cleanText,
      timestamp: Date.now()
    };
    trade.messages.push(msg);
    if (trade.messages.length > 80) {
      trade.messages = trade.messages.slice(-80);
    }
    trade.updatedAt = Date.now();
    db.persist();
    return this._sanitizeTrade(trade);
  }

  async releaseTrade({ tradeId, actorAddress }) {
    this.initStore();
    return db.withLock(`p2p_settle:${tradeId}`, async () => {
      const trade = this._getRawTrade(tradeId);
      if (trade.status === 'COMPLETED') return this._sanitizeTrade(trade);
      if (!['ESCROW_FUNDED', 'FIAT_SENT'].includes(trade.status)) {
        throw new Error(`El Escrow debe estar fondeado on-chain antes de liberar (estado actual: ${trade.status}).`);
      }

      const isChipnet = trade.network === 'testnet';
      const cleanActor = this._normalizeBch(actorAddress, isChipnet);
      const isSeller = cleanActor && isSameBchAddress(trade.sellerAddress, cleanActor);
      if (!isSeller) {
        throw new Error('Solo el vendedor que bloqueó los fondos puede liberar el Escrow hacia el comprador.');
      }

      const settled = await bchService.settleP2PEscrow({
        tradeId: trade.id,
        sellerAddress: trade.sellerAddress,
        buyerAddress: trade.buyerAddress,
        expiryTimestamp: trade.expiryTimestamp,
        action: 'release',
        isChipnet
      });

      trade.status = 'COMPLETED';
      trade.releaseTxHash = settled.txHash;
      trade.releaseExplorerUrl = settled.explorerUrl;
      trade.liftCashbackCredited = true;
      trade.updatedAt = Date.now();
      const cashbackAmt = Number(trade.liftCashbackReward || 10);
      trade.messages.push({
        id: `msg_${Date.now()}`,
        sender: 'SYSTEM',
        text: `🎉 Escrow liberado on-chain hacia el comprador! TXID: ${settled.txHash.slice(0, 14)}... · Recompensa Cashback acreditada: +${cashbackAmt} LIFT (0.25%) para comprador y vendedor. ¡Ya pueden calificarse con estrellas (1–5 ★)!`,
        timestamp: Date.now()
      });

      this._bumpReputation(trade.sellerAddress, 'completedTrades');
      this._bumpReputation(trade.buyerAddress, 'completedTrades');
      this._bumpReputation(trade.sellerAddress, 'liftCashbackEarned', cashbackAmt);
      this._bumpReputation(trade.buyerAddress, 'liftCashbackEarned', cashbackAmt);
      db.persist();
      return this._sanitizeTrade(trade);
    });
  }

  submitReview({ tradeId, actorAddress, rating = 5, comment = '', tags = [] }) {
    this.initStore();
    const trade = this._getRawTrade(tradeId);
    const isChipnet = trade.network === 'testnet';
    const cleanActor = this._normalizeBch(actorAddress, isChipnet);
    const isSeller = cleanActor && isSameBchAddress(trade.sellerAddress, cleanActor);
    const isBuyer = cleanActor && isSameBchAddress(trade.buyerAddress, cleanActor);
    if (!isSeller && !isBuyer) {
      throw new Error('Solo el comprador o vendedor de esta orden pueden dejar una reseña verificada.');
    }
    if (trade.status !== 'COMPLETED') {
      throw new Error('Solo puedes calificar con estrellas una orden P2P completada on-chain.');
    }

    const numRating = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
    const cleanComment = String(comment || '').trim().slice(0, 240);
    const cleanTags = Array.isArray(tags)
      ? tags.map(t => String(t || '').trim().slice(0, 40)).filter(Boolean).slice(0, 4)
      : [];

    if (isBuyer && trade.buyerReview) {
      throw new Error('Ya enviaste tu calificación y reseña para esta orden.');
    }
    if (isSeller && trade.sellerReview) {
      throw new Error('Ya enviaste tu calificación y reseña para esta orden.');
    }

    const reviewerHandle = isBuyer ? trade.buyerHandle : trade.sellerHandle;
    const targetAddress = isBuyer ? trade.sellerAddress : trade.buyerAddress;
    const targetHandle = isBuyer ? trade.sellerHandle : trade.buyerHandle;

    const reviewRecord = {
      id: `rev_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      tradeId: trade.id,
      reviewerRole: isBuyer ? 'BUYER' : 'SELLER',
      reviewerAddress: cleanActor,
      reviewerHandle: reviewerHandle || cleanActor.slice(0, 18),
      targetAddress,
      targetHandle,
      rating: numRating,
      tags: cleanTags,
      comment: cleanComment || (numRating >= 5 ? 'Excelente operación P2P no-custodia.' : 'Operación completada.'),
      asset: trade.asset,
      cryptoAmount: trade.cryptoAmount,
      fiat: trade.fiat,
      releaseTxHash: trade.releaseTxHash || null,
      createdAt: Date.now()
    };

    if (isBuyer) {
      trade.buyerReview = reviewRecord;
    } else {
      trade.sellerReview = reviewRecord;
    }

    const targetKey = String(targetAddress || '').trim().toLowerCase();
    if (!db.memoryState.p2pReputation[targetKey]) {
      db.memoryState.p2pReputation[targetKey] = {
        completedTrades: 1,
        cancelledTrades: 0,
        disputes: 0,
        liftCashbackEarned: Number(trade.liftCashbackReward || 0),
        reviews: []
      };
    }
    if (!Array.isArray(db.memoryState.p2pReputation[targetKey].reviews)) {
      db.memoryState.p2pReputation[targetKey].reviews = [];
    }
    db.memoryState.p2pReputation[targetKey].reviews.unshift(reviewRecord);
    if (db.memoryState.p2pReputation[targetKey].reviews.length > 50) {
      db.memoryState.p2pReputation[targetKey].reviews = db.memoryState.p2pReputation[targetKey].reviews.slice(0, 50);
    }

    const starsStr = '★'.repeat(numRating) + '☆'.repeat(5 - numRating);
    trade.messages.push({
      id: `msg_${Date.now()}`,
      sender: 'SYSTEM',
      text: `⭐ ${reviewerHandle || (isBuyer ? 'Comprador' : 'Vendedor')} calificó a ${targetHandle || 'su contraparte'} con ${starsStr} (${numRating}/5): "${reviewRecord.comment}"`,
      timestamp: Date.now()
    });
    trade.updatedAt = Date.now();
    db.persist();

    return {
      trade: this._sanitizeTrade(trade),
      review: reviewRecord,
      targetReputation: this._getReputation(targetAddress)
    };
  }

  getMerchantReviews({ merchantAddress, network = 'testnet' }) {
    this.initStore();
    const isTestnet = String(network || 'testnet').toLowerCase() === 'testnet';
    const cleanAddr = this._normalizeBch(merchantAddress, isTestnet) || String(merchantAddress || '').trim();
    const rep = this._getReputation(cleanAddr);
    return {
      merchantAddress: cleanAddr,
      ...rep
    };
  }

  async cancelOrRefundTrade({ tradeId, actorAddress }) {
    this.initStore();
    return db.withLock(`p2p_settle:${tradeId}`, async () => {
      const trade = this._getRawTrade(tradeId);
      if (trade.status === 'COMPLETED' || trade.status === 'CANCELLED') {
        return this._sanitizeTrade(trade);
      }

      const isChipnet = trade.network === 'testnet';
      const cleanActor = this._normalizeBch(actorAddress, isChipnet);
      const isSeller = cleanActor && isSameBchAddress(trade.sellerAddress, cleanActor);
      const isBuyer = cleanActor && isSameBchAddress(trade.buyerAddress, cleanActor);
      if (!isSeller && !isBuyer) {
        throw new Error('Solo el comprador o vendedor pueden cancelar esta orden.');
      }
      if (trade.status === 'FIAT_SENT' && !isBuyer) {
        throw new Error('El comprador ya marcó el pago fiat como enviado. Solo el comprador puede cancelar voluntariamente o abre una Disputa.');
      }

      if (trade.status === 'ESCROW_FUNDED' || trade.status === 'FIAT_SENT') {
        const refunded = await bchService.settleP2PEscrow({
          tradeId: trade.id,
          sellerAddress: trade.sellerAddress,
          buyerAddress: trade.buyerAddress,
          expiryTimestamp: trade.expiryTimestamp,
          action: 'refund',
          isChipnet
        });
        trade.releaseTxHash = refunded.txHash;
        trade.releaseExplorerUrl = refunded.explorerUrl;
        trade.messages.push({
          id: `msg_${Date.now()}`,
          sender: 'SYSTEM',
          text: `↩️ Orden cancelada y fondos devueltos on-chain al vendedor desde BinaryLiquidP2PEscrow.cash (TX ${refunded.txHash.slice(0, 14)}...).`,
          timestamp: Date.now()
        });
      } else {
        trade.messages.push({
          id: `msg_${Date.now()}`,
          sender: 'SYSTEM',
          text: 'Orden cancelada antes de fondear el Escrow. Liquidez restaurada al anuncio.',
          timestamp: Date.now()
        });
      }

      // Restore reserved liquidity back to the offer
      const parentOffer = db.memoryState.p2pOffers.find(o => o && o.id === trade.offerId);
      if (parentOffer) {
        const cap = Number(parentOffer.totalAmount || Number(parentOffer.availableAmount || 0) + Number(trade.cryptoAmount || 0));
        parentOffer.availableAmount = Number(
          Math.min(cap, Number(parentOffer.availableAmount || 0) + Number(trade.cryptoAmount || 0)).toFixed(6)
        );
        if (parentOffer.availableAmount >= Number(parentOffer.minAmount || 0.000001)) {
          parentOffer.active = true;
          parentOffer.maxAmount = Number(Math.max(Number(parentOffer.maxAmount || 0), parentOffer.availableAmount).toFixed(6));
        }
      }

      trade.status = 'CANCELLED';
      trade.updatedAt = Date.now();
      this._bumpReputation(cleanActor, 'cancelledTrades');
      db.persist();
      return this._sanitizeTrade(trade);
    });
  }

  openDispute({ tradeId, actorAddress, reason = '' }) {
    this.initStore();
    const trade = this._getRawTrade(tradeId);
    const isChipnet = trade.network === 'testnet';
    const cleanActor = this._normalizeBch(actorAddress, isChipnet);
    const isSeller = cleanActor && isSameBchAddress(trade.sellerAddress, cleanActor);
    const isBuyer = cleanActor && isSameBchAddress(trade.buyerAddress, cleanActor);
    if (!isSeller && !isBuyer) {
      throw new Error('Solo las partes de la orden pueden abrir una disputa.');
    }
    if (!['ESCROW_FUNDED', 'FIAT_SENT'].includes(trade.status)) {
      throw new Error('Solo se puede disputar una orden con Escrow fondeado on-chain.');
    }

    trade.status = 'DISPUTED';
    trade.disputeReason = String(reason || 'Disputa abierta para mediación de árbitro').trim().slice(0, 240);
    trade.updatedAt = Date.now();
    trade.messages.push({
      id: `msg_${Date.now()}`,
      sender: 'SYSTEM',
      text: `⚖️ Disputa abierta (${isSeller ? 'Vendedor' : 'Comprador'}): ${trade.disputeReason}. Los fondos permanecen bloqueados de forma no-custodia en ${trade.escrowAddress.slice(0, 18)}...`,
      timestamp: Date.now()
    });
    this._bumpReputation(cleanActor, 'disputes');
    db.persist();
    return this._sanitizeTrade(trade);
  }
}

export const p2pService = new P2PService();
