import React, { useState, useEffect, useMemo } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  LayoutDashboard, Package, Truck, BarChart3, Settings as SettingsIcon,
  Plus, Trash2, Search, AlertTriangle, Check,
  ChevronRight, RotateCcw, ArrowLeft, Cloud, CloudOff, Share2, ExternalLink,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "./supabaseClient.js";

/* ============================== DESIGN TOKENS ============================== */
const C = {
  bg: "#0A0B09",
  surface: "#151209",
  surface2: "#1C1810",
  line: "rgba(242,237,227,0.09)",
  lineStrong: "rgba(242,237,227,0.16)",
  text: "#F2EDE3",
  muted: "#9A9284",
  mutedFaint: "#6E685D",
  accent: "#E8622B",
  accentSoft: "#F2A65A",
  green: "#3FAE59",
  red: "#E5544B",
  amber: "#D9A441",
  blue: "#3E8FB0",
};
const FONT_DISPLAY = "'Oswald', 'Arial Narrow', sans-serif";
const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'Courier New', monospace";

/* ============================== CONSTANTS ============================== */
const CATEGORIES = ["Shoes", "Jerseys", "Shirts", "Shorts", "Backpacks", "Clothing", "Accessories", "Other"];
const PRODUCT_STATUSES = ["Researching", "Active", "Paused", "Archived", "Posted", "Planning to Post"];

const SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "facebook", label: "Facebook" },
  { id: "messenger", label: "Messenger" },
  { id: "facebookManager", label: "FB Manager" },
];

// Logistics methods are now data — stored in settings.logisticsMethods — so every
// field (including the weight-rounding rule itself) is editable, and new providers
// can be added from Settings without touching code.
const DEFAULT_LOGISTICS_METHODS = [
  {
    id: "cat-land", label: "Cat China — Land", type: "Land / Road", deliveryTime: "60+ days",
    primaryRateLabel: "China → Mandalay", primaryRateCurrency: "MMK",
    weightRuleKind: "exact", weightRuleNote: "Exact actual weight — never rounded.",
    minCharge: { enabled: true, thresholdKg: 1, flatAmount: 15000, currency: "MMK" },
    hasSecondaryLeg: true, secondaryLegLabel: "Mandalay → Yangon", secondaryIsFlat: false, secondaryRateCurrency: "MMK",
    supportsCbm: false, supportsPerItem: false, supportsVolumetric: false,
    bracketTable: [],
    defaults: { ratePerKg: 25000, secondaryRatePerKg: 6000, homeDeliveryMMK: 0 },
  },
  {
    id: "cat-air", label: "Cat China — Air", type: "Air / Hand Carry", deliveryTime: "Not confirmed yet",
    primaryRateLabel: "Rate", primaryRateCurrency: "RMB",
    weightRuleKind: "exact", weightRuleNote: "Under 1kg is a flat ¥120 total; 1kg+ is exact weight × rate — never rounded.",
    minCharge: { enabled: true, thresholdKg: 1, flatAmount: 120, currency: "RMB" },
    hasSecondaryLeg: false,
    supportsCbm: false, supportsPerItem: false, supportsVolumetric: false,
    bracketTable: [],
    defaults: { ratePerKg: 140, homeDeliveryMMK: 6000 },
  },
  {
    id: "golden-city-air", label: "Golden City — Air", type: "Air", deliveryTime: "3–5 days (COD)",
    primaryRateLabel: "Rate", primaryRateCurrency: "RMB",
    weightRuleKind: "bracket", weightRuleNote: "Rounded up to the next whole kg using the bracket table below.",
    minCharge: { enabled: false },
    hasSecondaryLeg: false,
    supportsCbm: false, supportsPerItem: false, supportsVolumetric: false,
    bracketTable: [
      { upTo: 1, chargeAs: 1 }, { upTo: 2, chargeAs: 2 }, { upTo: 3, chargeAs: 3 },
      { upTo: 4, chargeAs: 4 }, { upTo: 5, chargeAs: 5 },
    ],
    defaults: { ratePerKg: 130, homeDeliveryMMK: 0 },
  },
  {
    id: "dequick-normal", label: "DeQuick — Normal", type: "Land / Road", deliveryTime: "2–4 weeks",
    primaryRateLabel: "Rate", primaryRateCurrency: "RMB",
    weightRuleKind: "exact", weightRuleNote: "Weight rule not confirmed by the provider yet — enter the chargeable weight they quote you directly, no rounding applied.",
    minCharge: { enabled: false },
    hasSecondaryLeg: true, secondaryLegLabel: "Kyaungtone → Yangon", secondaryIsFlat: true, secondaryRateCurrency: "MMK",
    supportsCbm: false, supportsPerItem: true, perItemLabel: "Branded goods — ¥ per item (not weight-based)", perItemRateCurrency: "RMB",
    supportsVolumetric: false,
    bracketTable: [],
    defaults: { ratePerKg: 10, itemRate: 100, secondaryFlatMMK: 20000, homeDeliveryMMK: 0 },
  },
  {
    id: "dequick-premium", label: "DeQuick — Premium", type: "Land / Road", deliveryTime: "7–10 days",
    primaryRateLabel: "Rate", primaryRateCurrency: "RMB",
    weightRuleKind: "exact", weightRuleNote: "Use the provider's quoted chargeable weight — no rounding rule invented.",
    minCharge: { enabled: false },
    hasSecondaryLeg: true, secondaryLegLabel: "Kyaungtone → Yangon", secondaryIsFlat: true, secondaryRateCurrency: "MMK",
    supportsCbm: false, supportsPerItem: false, supportsVolumetric: false,
    bracketTable: [],
    defaults: { ratePerKg: 15, secondaryFlatMMK: 20000, homeDeliveryMMK: 0 },
  },
  {
    id: "ag-sea", label: "AG — Sea", type: "Sea Cargo", deliveryTime: "40–50 days",
    primaryRateLabel: "Rate", primaryRateCurrency: "RMB",
    weightRuleKind: "exact", weightRuleNote: "Use the actual quoted shipment weight — no rounding unless the provider gives one.",
    minCharge: { enabled: false },
    hasSecondaryLeg: false,
    supportsCbm: true, cbmPriceLabel: "CBM price", supportsPerItem: false, supportsVolumetric: false,
    bracketTable: [],
    defaults: { ratePerKg: 22, cbmPriceRmb: 6600, homeDeliveryMMK: 0 },
  },
  {
    id: "ag-flight", label: "AG — Flight", type: "Air / Hand Carry", deliveryTime: "3–7 days",
    primaryRateLabel: "Rate (¥145–¥200/kg)", primaryRateCurrency: "RMB",
    weightRuleKind: "exact", weightRuleNote: "Exact actual weight — never rounded.",
    minCharge: { enabled: false },
    hasSecondaryLeg: false,
    supportsCbm: false, supportsPerItem: false, supportsVolumetric: false,
    bracketTable: [],
    defaults: { ratePerKg: 170, homeDeliveryMMK: 20000 },
  },
  {
    id: "genz", label: "GenZ Cargo", type: "Land / Road", deliveryTime: "3–4 weeks",
    primaryRateLabel: "China → Ruili", primaryRateCurrency: "RMB",
    weightRuleKind: "exact", weightRuleNote: "Actual/quoted chargeable weight — never rounded.",
    minCharge: { enabled: false },
    hasSecondaryLeg: true, secondaryLegLabel: "Ruili → Yangon (variable)", secondaryIsFlat: true, secondaryRateCurrency: "MMK",
    supportsCbm: false, supportsPerItem: false, supportsVolumetric: false,
    bracketTable: [],
    defaults: { ratePerKg: 8, secondaryFlatMMK: 20000, homeDeliveryMMK: 12500 },
  },
  {
    id: "marlar-air", label: "Marlar — Air", type: "Air / Hand Carry", deliveryTime: "3–5 days",
    primaryRateLabel: "Rate (¥100–¥120/kg)", primaryRateCurrency: "RMB",
    weightRuleKind: "bracket", weightRuleNote: "Half-kg charging brackets below. Volumetric weight (L×W×H÷5000) is used instead if it's greater.",
    minCharge: { enabled: false },
    hasSecondaryLeg: false,
    supportsCbm: false, supportsPerItem: false, supportsVolumetric: true,
    bracketTable: [
      { upTo: 0.5, chargeAs: 0.5 }, { upTo: 0.9, chargeAs: 1.0 }, { upTo: 1.2, chargeAs: 1.0 },
      { upTo: 1.6, chargeAs: 1.5 }, { upTo: 1.9, chargeAs: 2.0 }, { upTo: 2.2, chargeAs: 2.0 },
      { upTo: 2.6, chargeAs: 2.5 }, { upTo: 2.9, chargeAs: 3.0 },
    ],
    defaults: { ratePerKg: 110, homeDeliveryMMK: 0 },
  },
  {
    id: "cx-air", label: "CX — Air", type: "Air", deliveryTime: "3–7 days",
    primaryRateLabel: "Rate", primaryRateCurrency: "RMB",
    weightRuleKind: "exact", weightRuleNote: "Use the provider's quoted chargeable weight — no rounding rule invented.",
    minCharge: { enabled: false },
    hasSecondaryLeg: false,
    supportsCbm: false, supportsPerItem: false, supportsVolumetric: false,
    bracketTable: [],
    tierOptions: [{ label: "1kg tier", ratePerKg: 200 }, { label: "10kg tier", ratePerKg: 145 }],
    defaults: { ratePerKg: 200, homeDeliveryMMK: 0 },
  },
];

const ORDER_STATUSES = [
  { id: "order-placed", label: "Order Placed", color: C.muted },
  { id: "payment-processing", label: "Payment Processing", color: C.amber },
  { id: "payment-confirmed", label: "Payment Confirmed", color: C.blue },
  { id: "ordering-dewu", label: "Ordering from Dewu", color: C.accent },
  { id: "receiving-china", label: "Receiving in China", color: C.accentSoft },
  { id: "received-china", label: "Received in China", color: C.accentSoft },
  { id: "on-route-mm", label: "On Route to Myanmar", color: C.blue },
  { id: "arrived-mm", label: "Arrived in Myanmar", color: C.green },
  { id: "local-delivery", label: "Local Delivery", color: C.green },
  { id: "on-route-customer", label: "On Route to Customer", color: C.green },
  { id: "delivered", label: "Delivered / Done", color: C.green },
  { id: "failed", label: "Failed", color: C.red },
  { id: "cancelled", label: "Cancelled", color: C.red },
  { id: "refunded", label: "Refunded", color: C.red },
];
const TERMINAL_STATUSES = ["delivered", "failed", "cancelled", "refunded"];
const BAD_STATUSES = ["failed", "cancelled", "refunded"];
const TRANSIT_STATUSES = ["on-route-mm", "arrived-mm", "local-delivery", "on-route-customer"];
const AWAITING_PAYMENT_STATUSES = ["order-placed", "payment-processing"];

const CUSTOMER_SHIPPING_OPTIONS = ["Air", "Land (GenZ)", "Sea"];

const DEFAULT_SETTINGS = {
  rmbRate: 654,
  usdRate: 4450,
  defaultPaymentFeePct: 2,
  defaultMarketingPct: 20,
  defaultTargetMarginPct: 25,
  roundNearest: 1000,
  packagingOptions: [
    { id: "pkg-standard", name: "Standard poly bag", priceMMK: 0 },
    { id: "pkg-box", name: "Branded box + bubble wrap", priceMMK: 1500 },
  ],
  suppliers: ["Dewu"],
  logisticsMethods: DEFAULT_LOGISTICS_METHODS,
  socialLinks: { instagram: "", tiktok: "", facebook: "", messenger: "", facebookManager: "" },
};

/* ============================== HELPERS ============================== */
const n = (v) => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 9999)}`;

const fmtMMK = (v) => {
  const r = Math.round(v || 0);
  return (r < 0 ? "-" : "") + Math.abs(r).toLocaleString("en-US") + " MMK";
};
const fmtNum = (v, d = 0) => (v || 0).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtPct = (v) => `${(v || 0).toFixed(1)}%`;
const roundClean = (v, nearest) => {
  const nn = nearest > 0 ? nearest : 1000;
  return Math.round(v / nn) * nn;
};

/* ============================== LOGISTICS DEFAULTS & TOTALS ============================== */
// Applies a method's bracket table: finds the smallest "upTo" the actual weight
// fits under; if the weight exceeds every row, extrapolates by continuing the
// same step pattern from the last two rows (so "continue the same pattern"
// instructions in a provider's rules work without needing infinite rows).
function applyBracket(weight, table) {
  if (!table || table.length === 0) return weight;
  const sorted = [...table].sort((a, b) => n(a.upTo) - n(b.upTo));
  for (const row of sorted) {
    if (weight <= n(row.upTo)) return n(row.chargeAs);
  }
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2] || { upTo: 0, chargeAs: 0 };
  const weightStep = n(last.upTo) - n(prev.upTo);
  const chargeStep = n(last.chargeAs) - n(prev.chargeAs);
  if (weightStep <= 0) return n(last.chargeAs);
  const stepsBeyond = Math.ceil((weight - n(last.upTo)) / weightStep);
  return n(last.chargeAs) + stepsBeyond * chargeStep;
}

function defaultLogisticsConfig(method) {
  const d = method.defaults || {};
  return {
    actualWeightKg: "",
    ratePerKg: String(d.ratePerKg ?? 0),
    lengthCm: "", widthCm: "", heightCm: "", useVolumetric: false,
    chargeBasis: "weight", cbmQty: "0", cbmPriceRmb: String(d.cbmPriceRmb ?? 0),
    pricingMode: "weight", itemRate: String(d.itemRate ?? 0),
    minChargeFlatAmount: String(method.minCharge?.flatAmount ?? 0),
    secondaryRatePerKg: String(d.secondaryRatePerKg ?? 0), secondaryFlatMMK: String(d.secondaryFlatMMK ?? 0),
    myanmarSideFeeMMK: "0",
    handlingFeeMMK: "0",
    homeDeliveryMMK: String(d.homeDeliveryMMK ?? 0),
    importCustomsMMK: "0",
  };
}

function defaultAllLogistics(methods) {
  const out = {};
  (methods || []).forEach((m) => { out[m.id] = defaultLogisticsConfig(m); });
  return out;
}

// Every method reduces to the same shape: Product/Shipping Cost + Handling Fees +
// Myanmar-side Fees + Home Delivery + Import/Customs Cost = Total Logistics Cost.
// Which "weight rule" produces the shipping cost is entirely data-driven per method
// (exact / bracket table / per-item / CBM), so adding a new provider never needs code.
function computeMethodTotal(method, cfg, rmbRate) {
  if (!method || !cfg) return { shippingCost: 0, secondaryCost: 0, myanmarSide: 0, handling: 0, homeDelivery: 0, importCustoms: 0, chargeableWeight: 0, total: 0 };

  let actual = n(cfg.actualWeightKg);
  if (method.supportsVolumetric && cfg.useVolumetric) {
    const vol = (n(cfg.lengthCm) * n(cfg.widthCm) * n(cfg.heightCm)) / 5000;
    actual = Math.max(actual, vol);
  }
  const chargeableWeight = method.weightRuleKind === "bracket" ? applyBracket(actual, method.bracketTable) : actual;

  let shippingCost = 0;
  if (method.supportsPerItem && cfg.pricingMode === "perItem") {
    const cur = method.perItemRateCurrency === "RMB" ? rmbRate : 1;
    shippingCost = n(cfg.itemRate) * cur;
  } else if (method.supportsCbm && cfg.chargeBasis === "cbm") {
    shippingCost = n(cfg.cbmQty) * n(cfg.cbmPriceRmb) * rmbRate;
  } else {
    const cur = method.primaryRateCurrency === "RMB" ? rmbRate : 1;
    shippingCost = chargeableWeight * n(cfg.ratePerKg) * cur;
    if (method.minCharge?.enabled && actual > 0 && actual < n(method.minCharge.thresholdKg)) {
      const minCur = method.minCharge.currency === "RMB" ? rmbRate : 1;
      shippingCost = n(cfg.minChargeFlatAmount) * minCur;
    }
  }

  let secondaryCost = 0;
  if (method.hasSecondaryLeg) {
    if (method.secondaryIsFlat) {
      secondaryCost = n(cfg.secondaryFlatMMK);
    } else {
      const cur = method.secondaryRateCurrency === "RMB" ? rmbRate : 1;
      secondaryCost = chargeableWeight * n(cfg.secondaryRatePerKg) * cur;
    }
  }

  const myanmarSide = method.hasSecondaryLeg ? 0 : n(cfg.myanmarSideFeeMMK);
  const handling = n(cfg.handlingFeeMMK);
  const homeDelivery = n(cfg.homeDeliveryMMK);
  const importCustoms = n(cfg.importCustomsMMK);
  const total = shippingCost + secondaryCost + myanmarSide + handling + homeDelivery + importCustoms;

  return { shippingCost, secondaryCost, myanmarSide, handling, homeDelivery, importCustoms, chargeableWeight, total };
}


/* ============================== CORE FINANCIAL FORMULAS ============================== */
// Total Amount Spent = product cost + china domestic shipping + selected logistics total + other costs
function computeProductCore(product, settings) {
  const dewuCostMMK = n(product.dewuPriceRmb) * settings.rmbRate;
  const chinaShippingMMK = n(product.chinaShippingRmb) * settings.rmbRate;
  const methods = settings.logisticsMethods || [];
  const methodBreakdowns = {};
  methods.forEach((m) => { methodBreakdowns[m.id] = computeMethodTotal(m, product.logistics?.[m.id], settings.rmbRate); });
  const methodTotals = {};
  Object.keys(methodBreakdowns).forEach((id) => { methodTotals[id] = methodBreakdowns[id].total; });
  const selectedLogisticsMMK = methodTotals[product.selectedMethod] || 0;
  const otherCost = n(product.otherCost);
  const totalSpent = dewuCostMMK + chinaShippingMMK + selectedLogisticsMMK + otherCost;
  return { dewuCostMMK, chinaShippingMMK, methodBreakdowns, methodTotals, selectedLogisticsMMK, otherCost, totalSpent };
}

// Payment fee = Selling Price × F
// Final Profit = [Selling Price - TotalSpent - PaymentFee] / (1 + M)   (solves the circular marketing-on-final-profit formula)
// Marketing Cost = Final Profit × M
function computeFinancials({ totalSpent, sellingPrice, paymentFeePct, marketingPct }) {
  const F = n(paymentFeePct) / 100;
  const M = n(marketingPct) / 100;
  const paymentFee = sellingPrice * F;
  const grossBeforeMarketing = sellingPrice - totalSpent - paymentFee;
  const finalProfit = grossBeforeMarketing / (1 + M);
  const marketingCost = finalProfit * M;
  const roi = totalSpent > 0 ? (finalProfit / totalSpent) * 100 : 0;
  const profitMargin = sellingPrice > 0 ? (finalProfit / sellingPrice) * 100 : 0;
  return { paymentFee, grossBeforeMarketing, finalProfit, marketingCost, roi, profitMargin };
}

// Break-even: Final Profit = 0, so marketing cost is also 0 → BreakEven = TotalSpent / (1 - F)
function computeBreakEven(totalSpent, paymentFeePct) {
  const F = n(paymentFeePct) / 100;
  return F < 1 ? totalSpent / (1 - F) : null;
}

// Suggested price so that Final Profit = T × SellingPrice:
// SuggestedPrice = TotalSpent / [1 - F - T×(1+M)]
function computeSuggestedPrice(totalSpent, paymentFeePct, marketingPct, targetMarginPct) {
  const F = n(paymentFeePct) / 100;
  const M = n(marketingPct) / 100;
  const T = n(targetMarginPct) / 100;
  const denom = 1 - F - T * (1 + M);
  if (denom <= 0) return null; // target margin not reachable with these fees
  return totalSpent / denom;
}

function computeProductFull(product, settings) {
  const core = computeProductCore(product, settings);
  const breakEven = computeBreakEven(core.totalSpent, product.paymentFeePct);
  const suggested = computeSuggestedPrice(core.totalSpent, product.paymentFeePct, product.marketingPct, product.targetMarginPct);
  const suggestedRounded = suggested != null ? roundClean(suggested, settings.roundNearest) : null;
  const sellingPrice = n(product.actualSellingPrice) > 0 ? n(product.actualSellingPrice) : (suggestedRounded || 0);
  const fin = computeFinancials({ totalSpent: core.totalSpent, sellingPrice, paymentFeePct: product.paymentFeePct, marketingPct: product.marketingPct });

  const marketRaw = n(product.marketPrice);
  const marketCur = product.marketPriceCurrency || "MMK";
  const marketPriceMMK = marketCur === "RMB" ? marketRaw * settings.rmbRate : marketCur === "USD" ? marketRaw * settings.usdRate : marketRaw;
  const marketPriceRMB = settings.rmbRate > 0 ? marketPriceMMK / settings.rmbRate : 0;
  const marketPriceUSD = settings.usdRate > 0 ? marketPriceMMK / settings.usdRate : 0;
  let marketFlag = null;
  if (marketPriceMMK > 0 && suggested != null) {
    if (suggested > marketPriceMMK) marketFlag = "low";
    else if (suggested < marketPriceMMK * 0.9) marketFlag = "good";
  }
  return { ...core, breakEven, suggested, suggestedRounded, sellingPrice, ...fin, marketPrice: marketPriceMMK, marketPriceMMK, marketPriceRMB, marketPriceUSD, marketFlag };
}

/* ============================== PRODUCT / ORDER SCHEMAS ============================== */
function emptyProduct(settings) {
  return {
    id: null, name: "", sku: "", brand: "", category: CATEGORIES[0],
    groupName: "", colorTag: "",
    dewuUrl: "", modelNumber: "", variant: "", size: "", imageUrl: "",
    dewuPriceRmb: "", chinaShippingRmb: "0",
    selectedMethod: "genz",
    logistics: defaultAllLogistics(settings.logisticsMethods),
    otherCost: "0",
    paymentFeePct: String(settings.defaultPaymentFeePct),
    marketingPct: String(settings.defaultMarketingPct),
    targetMarginPct: String(settings.defaultTargetMarginPct),
    marketPrice: "", marketPriceCurrency: "MMK",
    actualSellingPrice: "",
    status: "Researching",
    postedTo: [],
    notes: "", createdAt: null,
  };
}

function emptyOrder(product, full, settings) {
  const firstPkg = (settings.packagingOptions || [])[0];
  return {
    id: null,
    orderNo: `#${Date.now().toString().slice(-6)}`,
    customerName: "", customerContact: "",
    productId: product ? product.id : null,
    productName: product ? product.name : "",
    variant: product ? product.variant : "", size: product ? product.size : "",
    quantity: "1",
    sellingPrice: product ? String(full.sellingPrice || full.suggestedRounded || "") : "",
    customerShipping: "Air",
    logisticsMethod: product ? product.selectedMethod : "genz",
    supplier: (settings.suppliers || [])[0] || "",
    paymentMethod: "",
    amountPaid: "0",
    paymentFeePct: product ? String(product.paymentFeePct) : String(settings.defaultPaymentFeePct),
    marketingPct: product ? String(product.marketingPct) : String(settings.defaultMarketingPct),
    unitTotalSpentSnapshot: product ? full.totalSpent : 0,
    packagingId: firstPkg ? firstPkg.id : "",
    packagingCostPerUnitMMK: firstPkg ? String(firstPkg.priceMMK) : "0",
    actualTotalSpentOverride: "",
    status: "order-placed",
    orderDate: new Date().toISOString().slice(0, 10),
    eta: "",
    notes: "",
    createdAt: null,
  };
}

function computeOrderFinancials(order) {
  const qty = n(order.quantity) || 1;
  const sellingPriceTotal = n(order.sellingPrice) * qty;
  const packagingCost = n(order.packagingCostPerUnitMMK) * qty;
  const expectedTotalSpent = (n(order.unitTotalSpentSnapshot) + n(order.packagingCostPerUnitMMK)) * qty;
  const hasOverride = order.actualTotalSpentOverride !== "" && order.actualTotalSpentOverride != null;
  const actualTotalSpent = hasOverride ? n(order.actualTotalSpentOverride) : expectedTotalSpent;
  const expectedFin = computeFinancials({ totalSpent: expectedTotalSpent, sellingPrice: sellingPriceTotal, paymentFeePct: order.paymentFeePct, marketingPct: order.marketingPct });
  const actualFin = computeFinancials({ totalSpent: actualTotalSpent, sellingPrice: sellingPriceTotal, paymentFeePct: order.paymentFeePct, marketingPct: order.marketingPct });
  const amountPaid = n(order.amountPaid);
  const amountRemaining = Math.max(0, sellingPriceTotal - amountPaid);
  return {
    qty, sellingPriceTotal, packagingCost, expectedTotalSpent, actualTotalSpent, hasOverride,
    expectedProfit: expectedFin.finalProfit, actualProfit: actualFin.finalProfit,
    expectedRoi: expectedFin.roi, actualRoi: actualFin.roi,
    amountPaid, amountRemaining,
  };
}

/* ============================== MIGRATION FROM V1 DATA ============================== */
const V1_METHOD_MAP = { genz: "genz", air: "ag-flight", sea: "ag-sea", handcarry: "marlar-air", other: "cx-air" };

function migrateV1Product(old, oldSettings, settings) {
  const rmbRate = oldSettings?.cnyRate || settings.rmbRate;
  let dewuPriceRmb = n(old.purchasePrice);
  if (old.purchaseCurrency === "USD") dewuPriceRmb = (n(old.purchasePrice) * (oldSettings?.usdRate || 4450)) / rmbRate;
  else if (old.purchaseCurrency === "MMK") dewuPriceRmb = n(old.purchasePrice) / rmbRate;
  const mappedMethod = V1_METHOD_MAP[old.shippingMethod] || "cx-air";
  const methods = settings.logisticsMethods || DEFAULT_LOGISTICS_METHODS;
  const logistics = defaultAllLogistics(methods);
  const method = methods.find((m) => m.id === mappedMethod);
  if (method && logistics[mappedMethod]) {
    logistics[mappedMethod] = {
      ...logistics[mappedMethod],
      actualWeightKg: old.weightPerUnit || "",
      handlingFeeMMK: String(n(old.handlingCost)),
      importCustomsMMK: String(n(old.importCost)),
      homeDeliveryMMK: String(n(old.finalDeliveryCost)),
    };
    if (mappedMethod === "cx-air" && old.shippingMethod === "other") {
      // v1 "Other" stored a flat manual shipping number — fold it in as handling instead of guessing a rate/weight.
      logistics["cx-air"].ratePerKg = "0";
      logistics["cx-air"].actualWeightKg = "0";
      logistics["cx-air"].handlingFeeMMK = String(n(old.manualShippingCost) + n(old.handlingCost));
    }
  }
  return {
    id: old.id, name: old.name || "", sku: "", brand: old.supplier || "", category: CATEGORIES.includes(old.category) ? old.category : "Other",
    dewuUrl: old.url || "", modelNumber: "", variant: "", size: "", imageUrl: old.imageUrl || "",
    dewuPriceRmb: String(Math.round(dewuPriceRmb * 100) / 100), chinaShippingRmb: "0",
    selectedMethod: mappedMethod, logistics,
    otherCost: String(n(old.otherCost)),
    paymentFeePct: String(settings.defaultPaymentFeePct),
    marketingPct: String(n(old.marketingPct) || settings.defaultMarketingPct),
    targetMarginPct: String(settings.defaultTargetMarginPct),
    marketPrice: "", marketPriceCurrency: "MMK",
    actualSellingPrice: String(n(old.sellingPrice) || ""),
    status: "Active",
    notes: [old.notes, "(migrated from the earlier version of this app)"].filter(Boolean).join(" — "),
    createdAt: old.createdAt || Date.now(),
  };
}

/* ============================== MIGRATION: OLD LOGISTICS ENGINE → NEW ============================== */
// The previous version had 5 fixed methods with their own field names and no per-provider
// weight-rounding rules. This maps old product.logistics data onto the new generic engine —
// used on load so nothing already entered is lost, and every product picks up defaults for
// the newly-added providers automatically.
const OLD_METHOD_ID_MAP = { agsea: "ag-sea", agair: "ag-flight", marlar: "marlar-air", cx: "cx-air", genz: "genz" };
const OLD_FIELD_MAPS = {
  genz: { ratePerKg: "rateRmbPerKg", actualWeightKg: "weightKg", handlingFeeMMK: "handlingMMK", secondaryFlatMMK: "ruiliToYangonMMK", homeDeliveryMMK: "yangonToHomeMMK", importCustomsMMK: "otherMMK" },
  "ag-sea": { ratePerKg: "rateRmbPerKg", cbmPriceRmb: "cbmPriceRmb", actualWeightKg: "weightKg", cbmQty: "cbmQty", handlingFeeMMK: "handlingMMK", importCustomsMMK: "importMMK", homeDeliveryMMK: "deliveryMMK" },
  "ag-flight": { ratePerKg: "rateRmbPerKg", actualWeightKg: "weightKg", handlingFeeMMK: "handlingMMK", importCustomsMMK: "importMMK", homeDeliveryMMK: "deliveryMMK" },
  "marlar-air": { ratePerKg: "rateRmbPerKg", actualWeightKg: "weightKg", handlingFeeMMK: "handlingMMK", importCustomsMMK: "importMMK", homeDeliveryMMK: "deliveryMMK" },
  "cx-air": { ratePerKg: "rateRmbPerKg", actualWeightKg: "weightKg", handlingFeeMMK: "handlingMMK", importCustomsMMK: "importMMK", homeDeliveryMMK: "deliveryMMK" },
};

function normalizeProductLogistics(product, methods) {
  const list = methods && methods.length ? methods : DEFAULT_LOGISTICS_METHODS;
  const oldLogistics = product.logistics || {};
  const newLogistics = {};
  list.forEach((m) => {
    // Already shaped for the new engine under this exact id — keep it, just fill any new fields in.
    if (oldLogistics[m.id] && oldLogistics[m.id].ratePerKg !== undefined) {
      newLogistics[m.id] = { ...defaultLogisticsConfig(m), ...oldLogistics[m.id] };
      return;
    }
    // Look for a legacy id/shape that maps onto this method and convert its field names.
    const legacyId = Object.keys(OLD_METHOD_ID_MAP).find((k) => OLD_METHOD_ID_MAP[k] === m.id && oldLogistics[k]);
    if (legacyId && OLD_FIELD_MAPS[m.id]) {
      const src = oldLogistics[legacyId];
      const mapped = defaultLogisticsConfig(m);
      Object.entries(OLD_FIELD_MAPS[m.id]).forEach(([newKey, oldKey]) => {
        if (src[oldKey] !== undefined) mapped[newKey] = String(src[oldKey]);
      });
      newLogistics[m.id] = mapped;
      return;
    }
    // Brand-new method this product has never seen — seed defaults.
    newLogistics[m.id] = defaultLogisticsConfig(m);
  });
  const mappedSelected = OLD_METHOD_ID_MAP[product.selectedMethod] || product.selectedMethod;
  const selectedMethod = list.some((m) => m.id === mappedSelected) ? mappedSelected : (list[0]?.id || "");
  return { ...product, logistics: newLogistics, selectedMethod };
}


// Reads whatever's in this browser's local storage (v2, or v1 as a fallback) —
// used both as the offline data source and as a one-time upload into Supabase
// the first time cloud sync is connected, so nothing already entered is lost.
function loadFromLocalStorage(baseSettings) {
  let s = baseSettings;
  let p = null;
  let o = null;
  try {
    const sraw = localStorage.getItem("courtside_settings_v2");
    if (sraw) s = { ...baseSettings, ...JSON.parse(sraw) };
  } catch (e) { /* keep defaults */ }
  try {
    const praw = localStorage.getItem("courtside_products_v2");
    if (praw) p = JSON.parse(praw);
  } catch (e) { /* none */ }
  try {
    const oraw = localStorage.getItem("courtside_orders_v2");
    if (oraw) o = JSON.parse(oraw);
  } catch (e) { /* none */ }

  if (p === null) {
    try {
      const v1raw = localStorage.getItem("bball_products_v1");
      const v1settingsRaw = localStorage.getItem("bball_settings_v1");
      const oldSettings = v1settingsRaw ? JSON.parse(v1settingsRaw) : null;
      const v1products = v1raw ? JSON.parse(v1raw) : [];
      p = v1products.map((old) => migrateV1Product(old, oldSettings, s));
    } catch (e) { p = []; }
  }
  return { products: p || [], orders: o || [], settings: s };
}

/* ============================== SMALL UI PRIMITIVES ============================== */
const Card = ({ children, className = "", style = {}, padded = true }) => (
  <div className={`rounded-md ${padded ? "p-4 sm:p-5" : ""} ${className}`} style={{ background: C.surface, border: `1px solid ${C.line}`, ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ eyebrow, title, right }) => (
  <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
    <div>
      {eyebrow && <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: C.accent, fontFamily: FONT_BODY }}>{eyebrow}</div>}
      <h2 className="text-2xl sm:text-3xl font-semibold" style={{ color: C.text, fontFamily: FONT_DISPLAY, letterSpacing: "0.01em" }}>{title}</h2>
    </div>
    {right}
  </div>
);

const Field = ({ label, hint, children }) => (
  <label className="block">
    <div className="flex items-baseline justify-between mb-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted, fontFamily: FONT_BODY }}>{label}</span>
      {hint && <span className="text-xs" style={{ color: C.mutedFaint }}>{hint}</span>}
    </div>
    {children}
  </label>
);

const inputStyle = { background: C.surface2, border: `1px solid ${C.lineStrong}`, color: C.text, fontFamily: FONT_BODY };

const TextInput = (props) => (
  <input
    {...props}
    className={`w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-orange-500 transition ${props.className || ""}`}
    style={{ ...inputStyle, ...(props.style || {}) }}
    onFocus={(e) => (e.target.style.borderColor = C.accent)}
    onBlur={(e) => (e.target.style.borderColor = C.lineStrong)}
  />
);

const Select = (props) => (
  <select {...props} className={`w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-orange-500 transition ${props.className || ""}`} style={{ ...inputStyle, ...(props.style || {}) }}>
    {props.children}
  </select>
);

const TextArea = (props) => (
  <textarea {...props} className={`w-full px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-orange-500 transition ${props.className || ""}`} style={{ ...inputStyle, ...(props.style || {}) }} />
);

const Button = ({ children, variant = "primary", className = "", ...rest }) => {
  const styles = {
    primary: { background: C.accent, color: "#160D06", border: `1px solid ${C.accent}` },
    ghost: { background: "transparent", color: C.text, border: `1px solid ${C.lineStrong}` },
    danger: { background: "transparent", color: C.red, border: `1px solid ${C.red}55` },
  };
  return (
    <button {...rest} className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition hover:opacity-85 active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-500 ${className}`} style={styles[variant]}>
      {children}
    </button>
  );
};

const Pill = ({ children, color = C.muted }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide" style={{ color, border: `1px solid ${color}55`, background: `${color}14`, fontFamily: FONT_BODY }}>
    {children}
  </span>
);

const StatusBadge = ({ status }) => {
  const s = ORDER_STATUSES.find((x) => x.id === status) || ORDER_STATUSES[0];
  return <Pill color={s.color}>{s.label}</Pill>;
};

function BasketballMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18" stroke={C.accent} strokeWidth="2.4" />
      <path d="M20 2 V38 M2 20 H38" stroke={C.accent} strokeWidth="2.4" />
      <path d="M6 8 C13 16 13 24 6 32" stroke={C.accent} strokeWidth="2.4" fill="none" />
      <path d="M34 8 C27 16 27 24 34 32" stroke={C.accent} strokeWidth="2.4" fill="none" />
    </svg>
  );
}

// Simple generic glyphs for the platform toggles/links — deliberately not exact
// logo reproductions, just enough shape (plus the label alongside) to read clearly.
function PlatformIcon({ id, size = 16, color }) {
  const c = color || "currentColor";
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (id) {
    case "instagram":
      return (<svg {...common}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17" cy="7" r="0.8" fill={c} stroke="none" /></svg>);
    case "tiktok":
      return (<svg {...common}><path d="M14 3v11.2a3.3 3.3 0 1 1-2.6-3.23" /><path d="M14 3c.4 2.4 2 4 4.5 4.3" /></svg>);
    case "facebook":
      return (<svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M13.2 20v-6.2h2l.3-2.4h-2.3V9.8c0-.7.2-1.2 1.2-1.2h1.3V6.4c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3v1.9H8.6v2.4h2v6.1" /></svg>);
    case "messenger":
      return (<svg {...common}><path d="M12 4C7.3 4 3.5 7.5 3.5 12c0 2.4 1.1 4.6 2.9 6.1V21l2.7-1.5c.9.3 1.9.4 2.9.4 4.7 0 8.5-3.5 8.5-8s-3.8-7.9-8.5-7.9Z" /><path d="M7.5 12.8l2.8-3 2.2 2.3 2.9-3-2.8 4.2-2.2-2.3-2.9 3Z" /></svg>);
    case "facebookManager":
      return (<svg {...common}><rect x="3.5" y="8" width="17" height="11" rx="1.5" /><path d="M8.5 8V6.5A1.5 1.5 0 0 1 10 5h4a1.5 1.5 0 0 1 1.5 1.5V8" /><path d="M3.5 13h17" /></svg>);
    default:
      return null;
  }
}

function ImagePlaceholder({ src, className = "", size = "w-14 h-14" }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) return <img src={src} onError={() => setBroken(true)} className={`${size} object-cover rounded-md ${className}`} style={{ border: `1px solid ${C.line}` }} alt="" />;
  return (
    <div className={`${size} ${className} rounded-md flex items-center justify-center shrink-0`} style={{ background: C.surface2, border: `1px solid ${C.line}` }}>
      <BasketballMark size={Math.round(parseInt(size.match(/\d+/)?.[0] || "14", 10) * 2)} />
    </div>
  );
}

const StatRow = ({ label, value, color, big }) => (
  <div>
    <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: C.mutedFaint }}>{label}</div>
    <div className={`tabular-nums font-semibold ${big ? "text-lg" : "text-sm"}`} style={{ color: color || C.text, fontFamily: FONT_MONO }}>{value}</div>
  </div>
);

const MiniBar = ({ label, value, total, color }) => {
  const pct = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs mb-1" style={{ color: C.mutedFaint }}>
        <span>{label}</span>
        <span className="tabular-nums" style={{ fontFamily: FONT_MONO }}>{fmtNum(value)}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.surface2 }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
};

function Accordion({ title, subtitle, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card padded={false}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3 sm:px-5 text-left focus:outline-none">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold" style={{ color: C.text, fontFamily: FONT_DISPLAY }}>{title}</span>
            {badge}
          </div>
          {subtitle && <div className="text-xs mt-0.5" style={{ color: C.mutedFaint }}>{subtitle}</div>}
        </div>
        <ChevronRight size={18} style={{ color: C.mutedFaint, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }} />
      </button>
      {open && <div className="px-4 pb-4 sm:px-5 pt-1" style={{ borderTop: `1px solid ${C.line}` }}>{children}</div>}
    </Card>
  );
}

/* ============================== NAVIGATION ============================== */
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: Truck },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: SettingsIcon },
  { id: "socials", label: "Socials", icon: Share2 },
];

function Nav({ page, goTo, onAdd, syncStatus }) {
  const syncMeta = {
    synced: { icon: Cloud, color: C.green, label: "Synced" },
    syncing: { icon: Cloud, color: C.amber, label: "Syncing…" },
    error: { icon: CloudOff, color: C.red, label: "Sync error" },
    offline: { icon: CloudOff, color: C.mutedFaint, label: "This device only" },
  }[syncStatus] || { icon: Cloud, color: C.mutedFaint, label: "" };
  const SyncIcon = syncMeta.icon;

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 px-4 py-6" style={{ background: C.surface, borderRight: `1px solid ${C.line}` }}>
        <button onClick={() => goTo("socials")} className="mb-4 self-start focus:outline-none" aria-label="Hoop Corner — go to Socials" title="Go to Socials">
          <img src="/hoopcorner-logo-dark.png" alt="Hoop Corner" style={{ width: 150, height: "auto" }} />
        </button>
        <div className="flex items-center gap-1.5 px-2 mb-6 text-xs" style={{ color: syncMeta.color }}>
          <SyncIcon size={12} /> {syncMeta.label}
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => goTo(item.id)} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition text-left focus:outline-none" style={{ color: active ? C.bg : C.muted, background: active ? C.accent : "transparent", fontFamily: FONT_BODY }}>
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto pt-6">
          <Button variant="primary" className="w-full" onClick={onAdd}><Plus size={16} /> Add new</Button>
        </div>
      </aside>

      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3" style={{ background: C.surface, borderBottom: `1px solid ${C.line}` }}>
        <button onClick={() => goTo("socials")} className="focus:outline-none" aria-label="Hoop Corner — go to Socials">
          <img src="/hoopcorner-logo-dark.png" alt="Hoop Corner" style={{ height: 32, width: "auto" }} />
        </button>
        <button onClick={onAdd} className="p-2 rounded-md" style={{ background: C.accent, color: "#160D06" }} aria-label="Add new"><Plus size={18} /></button>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex justify-around px-1 py-1.5" style={{ background: C.surface, borderTop: `1px solid ${C.line}` }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => goTo(item.id)} className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md flex-1 focus:outline-none" style={{ color: active ? C.accent : C.mutedFaint }}>
              <Icon size={18} />
              <span className="text-xs font-medium" style={{ fontFamily: FONT_BODY }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

function ScoreStat({ label, value, sub, accentColor }) {
  return (
    <div className="px-4 py-3 sm:px-5 sm:py-4" style={{ borderRight: `1px solid ${C.line}` }}>
      <div className="text-xs uppercase tracking-widest mb-1.5" style={{ color: C.muted, fontFamily: FONT_BODY }}>{label}</div>
      <div className="text-xl sm:text-2xl font-semibold tabular-nums" style={{ color: accentColor || C.text, fontFamily: FONT_MONO }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: C.mutedFaint }}>{sub}</div>}
    </div>
  );
}

/* ============================== ADD CHOICE ============================== */
function AddChoicePage({ onCatalog, onOrder }) {
  return (
    <div className="max-w-2xl mx-auto py-10">
      <SectionTitle eyebrow="Add new" title="What do you want to do?" />
      <div className="grid sm:grid-cols-2 gap-4">
        <button onClick={onCatalog} className="text-left p-5 rounded-md transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500" style={{ background: C.surface, border: `1px solid ${C.lineStrong}` }}>
          <Package size={22} style={{ color: C.accent }} className="mb-3" />
          <div className="text-lg font-semibold mb-1" style={{ color: C.text, fontFamily: FONT_DISPLAY }}>Add to Product Catalog</div>
          <div className="text-sm" style={{ color: C.muted }}>Research pricing and logistics for a product. No customer or order is created — it just sits in your catalog until you're ready.</div>
        </button>
        <button onClick={onOrder} className="text-left p-5 rounded-md transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500" style={{ background: C.surface, border: `1px solid ${C.lineStrong}` }}>
          <Truck size={22} style={{ color: C.accent }} className="mb-3" />
          <div className="text-lg font-semibold mb-1" style={{ color: C.text, fontFamily: FONT_DISPLAY }}>Add Order</div>
          <div className="text-sm" style={{ color: C.muted }}>A customer has already committed to buy. Jumps straight into the order form — pick an existing catalog product or just type one in.</div>
        </button>
      </div>
    </div>
  );
}

/* ============================== DASHBOARD ============================== */
function Dashboard({ products, orders, settings, goTo, openProduct, openOrder }) {
  const productFulls = useMemo(() => products.map((p) => ({ p, full: computeProductFull(p, settings) })), [products, settings]);
  const orderFins = useMemo(() => orders.map((o) => ({ o, fin: computeOrderFinancials(o) })), [orders]);

  const realOrders = orderFins.filter(({ o }) => !BAD_STATUSES.includes(o.status));
  const revenue = realOrders.reduce((s, { fin }) => s + fin.sellingPriceTotal, 0);
  const spent = realOrders.reduce((s, { fin }) => s + fin.expectedTotalSpent, 0);
  const profit = realOrders.reduce((s, { fin }) => s + fin.expectedProfit, 0);
  const roi = spent > 0 ? (profit / spent) * 100 : 0;
  const activeOrders = orders.filter((o) => !TERMINAL_STATUSES.includes(o.status));
  const inTransit = orders.filter((o) => TRANSIT_STATUSES.includes(o.status));

  const needsAttention = useMemo(() => {
    const items = [];
    const today = new Date().toISOString().slice(0, 10);
    orders.forEach((o) => {
      if (TERMINAL_STATUSES.includes(o.status)) {
        if (o.status === "failed") items.push({ o, tag: "Failed order", color: C.red });
        return;
      }
      if (AWAITING_PAYMENT_STATUSES.includes(o.status)) items.push({ o, tag: "Payment waiting", color: C.amber });
      else if (o.status === "payment-confirmed") items.push({ o, tag: "Dewu order not placed", color: C.accent });
      else if (TRANSIT_STATUSES.slice(2).includes(o.status)) items.push({ o, tag: "Customer delivery pending", color: C.green });
      if (o.eta && o.eta < today) items.push({ o, tag: "Shipment delayed", color: C.red });
    });
    return items.slice(0, 8);
  }, [orders]);

  const recentOrders = [...orders].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);
  const recentProducts = [...products].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);

  if (products.length === 0 && orders.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center px-4">
        <div className="mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <BasketballMark size={30} />
        </div>
        <h1 className="text-2xl font-semibold mb-2" style={{ color: C.text, fontFamily: FONT_DISPLAY }}>Nothing on the board yet</h1>
        <p className="text-sm mb-6" style={{ color: C.muted }}>Add your first product to start pricing logistics, margins, and orders.</p>
        <Button onClick={() => goTo("addChoice")}><Plus size={16} /> Add your first product</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Business Overview" title="Dashboard" />

      <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        <img src="/hoopcorner-banner.png" alt="Hoop Corner — Basketball Store" className="w-full h-auto block" />
      </div>

      <Card padded={false} className="overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none opacity-5" style={{ backgroundImage: `radial-gradient(circle at 15% 20%, ${C.accent} 0%, transparent 45%)` }} />
        <div className="grid grid-cols-2 sm:grid-cols-4 relative">
          <ScoreStat label="Revenue" value={fmtNum(revenue)} sub="MMK" />
          <ScoreStat label="Profit" value={fmtNum(profit)} accentColor={profit >= 0 ? C.green : C.red} sub="MMK" />
          <ScoreStat label="Amount spent" value={fmtNum(spent)} sub="MMK" />
          <ScoreStat label="ROI" value={fmtPct(roi)} accentColor={roi >= 0 ? C.green : C.red} />
          <ScoreStat label="Orders" value={orders.length} />
          <ScoreStat label="Active orders" value={activeOrders.length} />
          <ScoreStat label="Products" value={products.length} />
          <ScoreStat label="In transit" value={inTransit.length} />
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted, fontFamily: FONT_BODY }}>Needs attention</span>
            <AlertTriangle size={15} style={{ color: C.amber }} />
          </div>
          {needsAttention.length === 0 ? (
            <p className="text-sm" style={{ color: C.mutedFaint }}>Nothing needs your attention right now.</p>
          ) : (
            <div className="space-y-2">
              {needsAttention.map(({ o, tag, color }, i) => (
                <button key={i} onClick={() => openOrder(o.id)} className="w-full flex items-center justify-between text-left px-2.5 py-2 rounded-md hover:opacity-80" style={{ background: C.surface2 }}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: C.text }}>{o.orderNo} · {o.customerName || "No name"}</div>
                    <div className="text-xs truncate" style={{ color: C.mutedFaint }}>{o.productName}</div>
                  </div>
                  <Pill color={color}>{tag}</Pill>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted, fontFamily: FONT_BODY }}>Recent orders</span>
            <button onClick={() => goTo("orders")} className="text-xs font-medium flex items-center gap-0.5" style={{ color: C.accent }}>All <ChevronRight size={13} /></button>
          </div>
          {recentOrders.length === 0 ? <p className="text-sm" style={{ color: C.mutedFaint }}>No orders yet.</p> : (
            <div className="space-y-1">
              {recentOrders.map((o) => (
                <button key={o.id} onClick={() => openOrder(o.id)} className="w-full flex items-center justify-between text-left py-1.5 hover:opacity-80">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: C.text }}>{o.customerName || o.orderNo}</div>
                    <div className="text-xs truncate" style={{ color: C.mutedFaint }}>{o.productName}</div>
                  </div>
                  <StatusBadge status={o.status} />
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.muted, fontFamily: FONT_BODY }}>Recent products</span>
            <button onClick={() => goTo("products")} className="text-xs font-medium flex items-center gap-0.5" style={{ color: C.accent }}>All <ChevronRight size={13} /></button>
          </div>
          {recentProducts.length === 0 ? <p className="text-sm" style={{ color: C.mutedFaint }}>No products yet.</p> : (
            <div className="space-y-1">
              {recentProducts.map((p) => {
                const full = computeProductFull(p, settings);
                return (
                  <button key={p.id} onClick={() => openProduct(p.id)} className="w-full flex items-center gap-2.5 text-left py-1.5 hover:opacity-80">
                    <ImagePlaceholder src={p.imageUrl} size="w-8 h-8" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate" style={{ color: C.text }}>{p.name || "Untitled"}</div>
                      <div className="text-xs truncate" style={{ color: C.mutedFaint }}>{p.category}</div>
                    </div>
                    <div className="text-xs tabular-nums shrink-0" style={{ color: C.muted, fontFamily: FONT_MONO }}>{full.suggestedRounded != null ? fmtNum(full.suggestedRounded) : "—"}</div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ============================== PRODUCTS PAGE ============================== */
function statusColor(status) {
  if (status === "Active" || status === "Posted") return C.green;
  if (status === "Planning to Post") return C.blue;
  if (status === "Archived") return C.mutedFaint;
  return C.amber; // Researching, Paused
}

function ProductCard({ p, full, openProduct, onTogglePosted }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openProduct(p.id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openProduct(p.id); }}
      className="text-left rounded-md p-4 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
      style={{ background: C.surface, border: `1px solid ${C.line}`, borderLeft: p.colorTag ? `4px solid ${p.colorTag}` : `1px solid ${C.line}` }}
    >
      <div className="flex items-start gap-3 mb-3">
        <ImagePlaceholder src={p.imageUrl} size="w-12 h-12" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate" style={{ color: C.text }}>{p.name || "Untitled product"}</div>
          <div className="text-xs truncate" style={{ color: C.mutedFaint }}>{p.category}{p.brand ? ` · ${p.brand}` : ""}{p.groupName ? ` · ${p.groupName}` : ""}</div>
        </div>
        <Pill color={statusColor(p.status)}>{p.status}</Pill>
      </div>
      <div className="grid grid-cols-2 gap-y-1.5 text-xs mb-3">
        <div style={{ color: C.mutedFaint }}>Dewu price</div>
        <div className="text-right tabular-nums" style={{ color: C.text, fontFamily: FONT_MONO }}>¥{fmtNum(n(p.dewuPriceRmb), 0)}</div>
        <div style={{ color: C.mutedFaint }}>Suggested price</div>
        <div className="text-right tabular-nums" style={{ color: C.accentSoft, fontFamily: FONT_MONO }}>{full.suggestedRounded != null ? fmtNum(full.suggestedRounded) : "—"}</div>
        <div style={{ color: C.mutedFaint }}>Break-even</div>
        <div className="text-right tabular-nums" style={{ color: C.muted, fontFamily: FONT_MONO }}>{full.breakEven != null ? fmtNum(full.breakEven) : "—"}</div>
        <div style={{ color: C.mutedFaint }}>Target margin</div>
        <div className="text-right tabular-nums" style={{ color: C.muted, fontFamily: FONT_MONO }}>{p.targetMarginPct || 0}%</div>
      </div>
      <div className="flex items-center gap-1.5 pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
        <span className="text-xs mr-0.5" style={{ color: C.mutedFaint }}>Posted:</span>
        {SOCIAL_PLATFORMS.map((sp) => {
          const active = (p.postedTo || []).includes(sp.id);
          return (
            <button
              key={sp.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); onTogglePosted(p.id, sp.id); }}
              className="p-1.5 rounded-md"
              style={{ background: active ? `${C.accent}1F` : C.surface2, border: `1px solid ${active ? C.accent : C.lineStrong}` }}
              title={sp.label}
              aria-label={`Toggle posted on ${sp.label}`}
            >
              <PlatformIcon id={sp.id} size={13} color={active ? C.accentSoft : C.mutedFaint} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProductsPage({ products, settings, openProduct, goTo, onTogglePosted }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [catFilter, setCatFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [postedFilter, setPostedFilter] = useState("All");

  const rows = useMemo(() => {
    let list = products.map((p) => ({ p, full: computeProductFull(p, settings) }));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(({ p }) => (p.name + " " + p.brand + " " + p.sku + " " + (p.groupName || "")).toLowerCase().includes(q));
    }
    if (catFilter !== "All") list = list.filter(({ p }) => p.category === catFilter);
    if (statusFilter !== "All") list = list.filter(({ p }) => p.status === statusFilter);
    if (postedFilter === "Not posted") list = list.filter(({ p }) => !(p.postedTo || []).length);
    else if (postedFilter !== "All") list = list.filter(({ p }) => (p.postedTo || []).includes(postedFilter));
    const sorters = {
      newest: (a, b) => (b.p.createdAt || 0) - (a.p.createdAt || 0),
      profit: (a, b) => b.full.finalProfit - a.full.finalProfit,
      roi: (a, b) => b.full.roi - a.full.roi,
      priceAsc: (a, b) => (a.full.suggestedRounded || 0) - (b.full.suggestedRounded || 0),
      name: (a, b) => (a.p.name || "").localeCompare(b.p.name || ""),
      group: (a, b) => (a.p.groupName || "\uffff").localeCompare(b.p.groupName || "\uffff") || (a.p.name || "").localeCompare(b.p.name || ""),
    };
    return [...list].sort(sorters[sortBy] || sorters.newest);
  }, [products, settings, search, sortBy, catFilter, statusFilter, postedFilter]);

  // When sorting by group, cluster into labeled sections so a big catalog stays easy to scan.
  const groupedSections = useMemo(() => {
    if (sortBy !== "group") return null;
    const sections = [];
    let current = null;
    rows.forEach((row) => {
      const label = row.p.groupName || "Ungrouped";
      if (!current || current.label !== label) {
        current = { label, items: [] };
        sections.push(current);
      }
      current.items.push(row);
    });
    return sections;
  }, [rows, sortBy]);

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow={`${products.length} products`} title="Product Catalog" right={<Button onClick={() => goTo("addChoice")}><Plus size={15} /> Add product</Button>} />

      <Card>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1" style={{ minWidth: 180 }}>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.mutedFaint }} />
            <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, brand, SKU, group" className="pl-9" />
          </div>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-auto">
            <option value="newest">Sort: Newest</option>
            <option value="group">Sort: Group name</option>
            <option value="profit">Sort: Highest profit</option>
            <option value="roi">Sort: Highest ROI</option>
            <option value="priceAsc">Sort: Lowest suggested price</option>
            <option value="name">Sort: Name</option>
          </Select>
          <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="w-auto">
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
            <option value="All">All statuses</option>
            {PRODUCT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={postedFilter} onChange={(e) => setPostedFilter(e.target.value)} className="w-auto">
            <option value="All">All posted-to</option>
            <option value="Not posted">Not posted anywhere</option>
            {SOCIAL_PLATFORMS.map((sp) => <option key={sp.id} value={sp.id}>{sp.label}</option>)}
          </Select>
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card className="text-center py-10"><p className="text-sm" style={{ color: C.mutedFaint }}>No products match these filters.</p></Card>
      ) : groupedSections ? (
        <div className="space-y-6">
          {groupedSections.map((section) => (
            <div key={section.label}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2.5" style={{ color: C.muted, fontFamily: FONT_BODY }}>{section.label} <span style={{ color: C.mutedFaint }}>· {section.items.length}</span></div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {section.items.map(({ p, full }) => <ProductCard key={p.id} p={p} full={full} openProduct={openProduct} onTogglePosted={onTogglePosted} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(({ p, full }) => <ProductCard key={p.id} p={p} full={full} openProduct={openProduct} onTogglePosted={onTogglePosted} />)}
        </div>
      )}
    </div>
  );
}

/* ============================== LOGISTICS FIELD GROUP ============================== */
function LogisticsFields({ method, cfg, setCfg, rmbRate }) {
  const set = (key) => (e) => setCfg({ ...cfg, [key]: e.target.value });
  const setBool = (key) => (e) => setCfg({ ...cfg, [key]: e.target.checked });
  const breakdown = computeMethodTotal(method, cfg, rmbRate);
  const rateCurrencyHint = method.primaryRateCurrency === "RMB" ? "¥/kg" : "MMK/kg";
  const usingPerItem = method.supportsPerItem && cfg.pricingMode === "perItem";
  const usingCbm = method.supportsCbm && cfg.chargeBasis === "cbm";

  const breakdownRows = [
    { label: usingPerItem ? "Per-item cost" : usingCbm ? "CBM cost" : "Shipping cost", value: breakdown.shippingCost },
    method.hasSecondaryLeg && { label: method.secondaryLegLabel || "Second leg", value: breakdown.secondaryCost },
    !method.hasSecondaryLeg && n(cfg.myanmarSideFeeMMK) > 0 && { label: "Myanmar-side fee", value: breakdown.myanmarSide },
    n(cfg.handlingFeeMMK) > 0 && { label: "Handling", value: breakdown.handling },
    n(cfg.homeDeliveryMMK) > 0 && { label: "Home delivery", value: breakdown.homeDelivery },
    n(cfg.importCustomsMMK) > 0 && { label: "Import / customs", value: breakdown.importCustoms },
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      {method.weightRuleNote && <p className="text-xs leading-relaxed" style={{ color: C.mutedFaint }}>{method.weightRuleNote}</p>}

      {method.supportsPerItem && (
        <div className="flex gap-2">
          <button type="button" onClick={() => setCfg({ ...cfg, pricingMode: "weight" })} className="px-3 py-1.5 rounded-md text-xs font-semibold" style={{ background: !usingPerItem ? `${C.accent}1F` : C.surface2, border: `1px solid ${!usingPerItem ? C.accent : C.lineStrong}`, color: !usingPerItem ? C.accentSoft : C.muted }}>By weight</button>
          <button type="button" onClick={() => setCfg({ ...cfg, pricingMode: "perItem" })} className="px-3 py-1.5 rounded-md text-xs font-semibold" style={{ background: usingPerItem ? `${C.accent}1F` : C.surface2, border: `1px solid ${usingPerItem ? C.accent : C.lineStrong}`, color: usingPerItem ? C.accentSoft : C.muted }}>Per item (branded)</button>
        </div>
      )}
      {method.supportsCbm && (
        <div className="flex gap-2">
          <button type="button" onClick={() => setCfg({ ...cfg, chargeBasis: "weight" })} className="px-3 py-1.5 rounded-md text-xs font-semibold" style={{ background: !usingCbm ? `${C.accent}1F` : C.surface2, border: `1px solid ${!usingCbm ? C.accent : C.lineStrong}`, color: !usingCbm ? C.accentSoft : C.muted }}>By weight</button>
          <button type="button" onClick={() => setCfg({ ...cfg, chargeBasis: "cbm" })} className="px-3 py-1.5 rounded-md text-xs font-semibold" style={{ background: usingCbm ? `${C.accent}1F` : C.surface2, border: `1px solid ${usingCbm ? C.accent : C.lineStrong}`, color: usingCbm ? C.accentSoft : C.muted }}>By CBM</button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {usingPerItem ? (
          <Field label={method.perItemLabel || "Rate per item"} hint={method.perItemRateCurrency === "RMB" ? "¥/item" : "MMK/item"}>
            <TextInput type="number" min="0" value={cfg.itemRate} onChange={set("itemRate")} />
          </Field>
        ) : usingCbm ? (
          <>
            <Field label={method.cbmPriceLabel || "CBM price"} hint="¥/CBM"><TextInput type="number" min="0" value={cfg.cbmPriceRmb} onChange={set("cbmPriceRmb")} /></Field>
            <Field label="Total CBM"><TextInput type="number" min="0" value={cfg.cbmQty} onChange={set("cbmQty")} /></Field>
          </>
        ) : (
          <>
            <Field label={method.primaryRateLabel || "Rate"} hint={rateCurrencyHint}><TextInput type="number" min="0" value={cfg.ratePerKg} onChange={set("ratePerKg")} /></Field>
            <Field label="Actual weight" hint="kg"><TextInput type="number" min="0" value={cfg.actualWeightKg} onChange={set("actualWeightKg")} /></Field>
            {method.supportsVolumetric && (
              <>
                <Field label="Dimensions" hint="cm — L × W × H, optional">
                  <div className="flex gap-2">
                    <TextInput type="number" min="0" value={cfg.lengthCm} onChange={set("lengthCm")} placeholder="L" />
                    <TextInput type="number" min="0" value={cfg.widthCm} onChange={set("widthCm")} placeholder="W" />
                    <TextInput type="number" min="0" value={cfg.heightCm} onChange={set("heightCm")} placeholder="H" />
                  </div>
                </Field>
                <label className="flex items-center gap-2 text-xs pt-6" style={{ color: C.muted }}>
                  <input type="checkbox" checked={!!cfg.useVolumetric} onChange={setBool("useVolumetric")} /> Use volumetric weight if greater
                </label>
              </>
            )}
            {method.weightRuleKind === "bracket" && (
              <div className="text-xs pt-1 sm:col-span-2" style={{ color: C.mutedFaint }}>
                Chargeable weight (after rounding): <span style={{ color: C.text, fontFamily: FONT_MONO }}>{fmtNum(breakdown.chargeableWeight, 2)} kg</span> · edit the bracket table in Settings.
              </div>
            )}
            {method.minCharge?.enabled && (
              <Field label="Minimum charge" hint={`applies under ${method.minCharge.thresholdKg}kg — ${method.minCharge.currency}`}>
                <TextInput type="number" min="0" value={cfg.minChargeFlatAmount} onChange={set("minChargeFlatAmount")} />
              </Field>
            )}
          </>
        )}

        {method.hasSecondaryLeg && (
          method.secondaryIsFlat ? (
            <Field label={method.secondaryLegLabel} hint="MMK — estimate, adjust when known"><TextInput type="number" min="0" value={cfg.secondaryFlatMMK} onChange={set("secondaryFlatMMK")} /></Field>
          ) : (
            <Field label={method.secondaryLegLabel} hint={method.secondaryRateCurrency === "RMB" ? "¥/kg" : "MMK/kg"}><TextInput type="number" min="0" value={cfg.secondaryRatePerKg} onChange={set("secondaryRatePerKg")} /></Field>
          )
        )}
        {!method.hasSecondaryLeg && <Field label="Myanmar-side fee" hint="MMK — optional"><TextInput type="number" min="0" value={cfg.myanmarSideFeeMMK} onChange={set("myanmarSideFeeMMK")} /></Field>}
        <Field label="Handling" hint="MMK"><TextInput type="number" min="0" value={cfg.handlingFeeMMK} onChange={set("handlingFeeMMK")} /></Field>
        <Field label="Home delivery" hint="MMK"><TextInput type="number" min="0" value={cfg.homeDeliveryMMK} onChange={set("homeDeliveryMMK")} /></Field>
        <Field label="Import / customs" hint="MMK"><TextInput type="number" min="0" value={cfg.importCustomsMMK} onChange={set("importCustomsMMK")} /></Field>
      </div>

      <div className="pt-2 space-y-1" style={{ borderTop: `1px solid ${C.line}` }}>
        {breakdownRows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-xs pt-1" style={{ color: C.mutedFaint }}>
            <span>{r.label}</span>
            <span className="tabular-nums" style={{ fontFamily: FONT_MONO }}>{fmtNum(r.value)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Total {method.label} cost</span>
          <span className="text-base font-semibold tabular-nums" style={{ color: C.text, fontFamily: FONT_MONO }}>{fmtMMK(breakdown.total)}</span>
        </div>
      </div>
    </div>
  );
}

/* ============================== PRODUCT DETAIL PAGE ============================== */
function ProductDetailPage({ draft, setDraft, settings, onSave, onDelete, onCreateOrder, isNew, onBack }) {
  const full = useMemo(() => computeProductFull(draft, settings), [draft, settings]);
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  const setLogistics = (methodId) => (cfg) => setDraft((d) => ({ ...d, logistics: { ...d.logistics, [methodId]: cfg } }));

  const comparisonRows = (settings.logisticsMethods || []).map((m) => {
    const totalSpent = full.dewuCostMMK + full.chinaShippingMMK + full.methodTotals[m.id] + full.otherCost;
    const suggested = computeSuggestedPrice(totalSpent, draft.paymentFeePct, draft.marketingPct, draft.targetMarginPct);
    const suggestedRounded = suggested != null ? roundClean(suggested, settings.roundNearest) : null;
    const sellingPrice = n(draft.actualSellingPrice) > 0 ? n(draft.actualSellingPrice) : (suggestedRounded || 0);
    const fin = computeFinancials({ totalSpent, sellingPrice, paymentFeePct: draft.paymentFeePct, marketingPct: draft.marketingPct });
    return { method: m, totalSpent, suggestedRounded, profit: fin.finalProfit, roi: fin.roi };
  });
  const bestRoiId = comparisonRows.length ? comparisonRows.reduce((a, b) => (b.roi > a.roi ? b : a)).method.id : null;

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium mb-1" style={{ color: C.muted }}><ArrowLeft size={15} /> Back</button>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: C.accent, fontFamily: FONT_BODY }}>{isNew ? "New Product" : "Edit Product"}</div>
          <h2 className="text-2xl sm:text-3xl font-semibold flex items-center gap-2.5" style={{ color: C.text, fontFamily: FONT_DISPLAY }}>
            {draft.colorTag && <span style={{ width: 16, height: 16, borderRadius: 4, background: draft.colorTag, border: `1px solid ${C.lineStrong}`, flexShrink: 0 }} title={draft.colorTag} />}
            {draft.name || "Untitled product"}
          </h2>
          {draft.groupName && <div className="text-xs mt-1" style={{ color: C.mutedFaint }}>{draft.groupName}</div>}
        </div>
        <div className="flex gap-2">
          {!isNew && <Button variant="danger" onClick={onDelete}><Trash2 size={14} /> Delete</Button>}
          <Button onClick={onSave}><Check size={14} /> {isNew ? "Save product" : "Save changes"}</Button>
        </div>
      </div>

      {/* Summary */}
      <Card style={{ borderColor: full.finalProfit >= 0 ? `${C.green}55` : `${C.red}55` }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-3">
          <StatRow label="Total amount spent" value={fmtMMK(full.totalSpent)} />
          <StatRow label="Break-even" value={full.breakEven != null ? fmtMMK(full.breakEven) : "—"} />
          <StatRow label="Suggested price" value={full.suggestedRounded != null ? fmtMMK(full.suggestedRounded) : "Not reachable"} color={C.accentSoft} />
          <StatRow label="Selling price" value={fmtMMK(full.sellingPrice)} />
          <StatRow label="Payment fee" value={fmtMMK(full.paymentFee)} />
          <StatRow label="Marketing cost" value={fmtMMK(full.marketingCost)} />
          <StatRow label="Final profit" value={fmtMMK(full.finalProfit)} color={full.finalProfit >= 0 ? C.green : C.red} big />
          <StatRow label="ROI" value={fmtPct(full.roi)} color={full.roi >= 0 ? C.green : C.red} big />
        </div>
        {full.suggested != null && Math.round(full.suggested) !== full.suggestedRounded && (
          <div className="mt-3 text-xs" style={{ color: C.mutedFaint }}>Exact suggested price before rounding: {fmtMMK(full.suggested)}</div>
        )}
        {full.suggested == null && (
          <div className="mt-3 text-xs" style={{ color: C.red }}>Target margin isn't reachable with the current payment fee / marketing % — lower one of them or the target margin.</div>
        )}
      </Card>

      {/* Basic info */}
      <Card>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.accent, fontFamily: FONT_BODY }}>Product info</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Product name"><TextInput value={draft.name} onChange={set("name")} placeholder="e.g. Nike Varsity Elite Backpack" /></Field>
          <Field label="Category"><Select value={draft.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
          <Field label="Group name" hint="your own grouping — e.g. a drop or batch"><TextInput value={draft.groupName} onChange={set("groupName")} placeholder="e.g. Summer Drop" /></Field>
          <Field label="Color tag" hint="for quick visual sorting">
            <div className="flex items-center gap-2">
              <input type="color" value={draft.colorTag || "#E8622B"} onChange={set("colorTag")} className="w-10 h-9 rounded-md cursor-pointer" style={{ background: "transparent", border: `1px solid ${C.lineStrong}` }} />
              <TextInput value={draft.colorTag} onChange={set("colorTag")} placeholder="#E8622B" className="flex-1" />
            </div>
          </Field>
          <Field label="Brand"><TextInput value={draft.brand} onChange={set("brand")} /></Field>
          <Field label="SKU / Product ID"><TextInput value={draft.sku} onChange={set("sku")} placeholder="e.g. HM9965-503" /></Field>
          <Field label="Dewu model number"><TextInput value={draft.modelNumber} onChange={set("modelNumber")} /></Field>
          <Field label="Variant / color"><TextInput value={draft.variant} onChange={set("variant")} /></Field>
          <Field label="Size" hint="if applicable"><TextInput value={draft.size} onChange={set("size")} /></Field>
          <Field label="Status"><Select value={draft.status} onChange={set("status")}>{PRODUCT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
          <Field label="Dewu URL"><TextInput value={draft.dewuUrl} onChange={set("dewuUrl")} placeholder="https://..." /></Field>
          <Field label="Image URL" hint="optional"><TextInput value={draft.imageUrl} onChange={set("imageUrl")} placeholder="https://..." /></Field>
        </div>
        <div className="mt-4"><Field label="Notes" hint="optional"><TextArea rows={2} value={draft.notes} onChange={set("notes")} /></Field></div>
      </Card>

      {/* Posted to */}
      <Card>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.accent, fontFamily: FONT_BODY }}>Posted to</div>
        <div className="flex flex-wrap gap-2">
          {SOCIAL_PLATFORMS.map((p) => {
            const active = (draft.postedTo || []).includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setDraft((d) => {
                  const cur = d.postedTo || [];
                  return { ...d, postedTo: cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur, p.id] };
                })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold"
                style={{ background: active ? `${C.accent}1F` : C.surface2, border: `1px solid ${active ? C.accent : C.lineStrong}`, color: active ? C.accentSoft : C.muted }}
              >
                <PlatformIcon id={p.id} size={14} /> {p.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Cost inputs */}
      <Card>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.accent, fontFamily: FONT_BODY }}>Product cost</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Dewu price" hint="RMB / Yuan"><TextInput type="number" min="0" value={draft.dewuPriceRmb} onChange={set("dewuPriceRmb")} placeholder="0" /></Field>
          <Field label="China domestic shipping" hint="RMB"><TextInput type="number" min="0" value={draft.chinaShippingRmb} onChange={set("chinaShippingRmb")} /></Field>
          <Field label="Other costs" hint="MMK — packaging, misc"><TextInput type="number" min="0" value={draft.otherCost} onChange={set("otherCost")} /></Field>
        </div>
        <div className="mt-3 text-xs tabular-nums" style={{ color: C.mutedFaint, fontFamily: FONT_MONO }}>
          {fmtNum(n(draft.dewuPriceRmb))} RMB × {settings.rmbRate} = <span style={{ color: C.text }}>{fmtMMK(full.dewuCostMMK)}</span>
          {n(draft.chinaShippingRmb) > 0 && <> · + China shipping {fmtMMK(full.chinaShippingMMK)}</>}
        </div>
      </Card>

      <Card>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.accent, fontFamily: FONT_BODY }}>Market / reference price</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Reference price" hint="optional — what it sells for elsewhere">
            <TextInput type="number" min="0" value={draft.marketPrice} onChange={set("marketPrice")} />
          </Field>
          <Field label="Currency">
            <Select value={draft.marketPriceCurrency} onChange={set("marketPriceCurrency")}>
              <option value="MMK">MMK</option>
              <option value="RMB">RMB / Yuan</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
        </div>
        {n(draft.marketPrice) > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs tabular-nums" style={{ color: C.mutedFaint, fontFamily: FONT_MONO }}>
            <span>MMK: <span style={{ color: C.text }}>{fmtNum(full.marketPriceMMK)}</span></span>
            <span>¥ RMB: <span style={{ color: C.text }}>{fmtNum(full.marketPriceRMB, 2)}</span></span>
            <span>$ USD: <span style={{ color: C.text }}>{fmtNum(full.marketPriceUSD, 2)}</span></span>
          </div>
        )}
      </Card>

      {/* Percentages */}
      <Card>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.accent, fontFamily: FONT_BODY }}>Fees, marketing &amp; target margin</div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Payment fee %" hint="of selling price"><TextInput type="number" min="0" max="100" value={draft.paymentFeePct} onChange={set("paymentFeePct")} /></Field>
          <Field label="Marketing %" hint="of final profit"><TextInput type="number" min="0" max="100" value={draft.marketingPct} onChange={set("marketingPct")} /></Field>
          <Field label="Target profit margin %"><TextInput type="number" min="0" max="100" value={draft.targetMarginPct} onChange={set("targetMarginPct")} /></Field>
        </div>
      </Card>

      {/* Selling price */}
      <Card>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.accent, fontFamily: FONT_BODY }}>Selling price</div>
        <Field label="Selling price" hint="MMK — leave blank to use the suggested price">
          <TextInput type="number" min="0" value={draft.actualSellingPrice} onChange={set("actualSellingPrice")} placeholder={full.suggestedRounded != null ? String(full.suggestedRounded) : "—"} />
        </Field>
        {full.marketFlag === "low" && (
          <div className="mt-3 px-3 py-2 rounded-md text-sm flex items-center gap-2" style={{ background: `${C.red}14`, border: `1px solid ${C.red}55`, color: C.red }}>
            <AlertTriangle size={15} /> Market price too low — your suggested price is above the market reference. This may not be commercially viable.
          </div>
        )}
        {full.marketFlag === "good" && (
          <div className="mt-3 px-3 py-2 rounded-md text-sm flex items-center gap-2" style={{ background: `${C.green}14`, border: `1px solid ${C.green}55`, color: C.green }}>
            <Check size={15} /> Good price room — comfortably below the market reference.
          </div>
        )}
      </Card>

      {/* Logistics */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: C.accent, fontFamily: FONT_BODY }}>China → Myanmar logistics</div>
        <div className="space-y-3">
          {(settings.logisticsMethods || []).map((m) => {
            const isSelected = draft.selectedMethod === m.id;
            const cfg = draft.logistics?.[m.id] || defaultLogisticsConfig(m);
            return (
              <Accordion
                key={m.id}
                title={m.label}
                subtitle={`${m.type}${m.deliveryTime ? ` · ${m.deliveryTime}` : ""}`}
                defaultOpen={isSelected}
                badge={
                  <>
                    {isSelected && <Pill color={C.accent}>In use</Pill>}
                    <span className="text-xs tabular-nums ml-1" style={{ color: C.mutedFaint, fontFamily: FONT_MONO }}>{fmtNum(full.methodTotals[m.id])}</span>
                  </>
                }
              >
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, selectedMethod: m.id }))}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold"
                    style={{
                      background: isSelected ? `${C.accent}1F` : C.surface2,
                      border: `1px solid ${isSelected ? C.accent : C.lineStrong}`,
                      color: isSelected ? C.accentSoft : C.muted,
                    }}
                  >
                    {isSelected ? "✓ Used for Total Amount Spent" : "Use this method"}
                  </button>
                </div>
                <LogisticsFields method={m} cfg={cfg} setCfg={setLogistics(m.id)} rmbRate={settings.rmbRate} />
              </Accordion>
            );
          })}
          {(settings.logisticsMethods || []).length === 0 && (
            <Card className="text-center py-6"><p className="text-sm" style={{ color: C.mutedFaint }}>No logistics methods set up yet — add one in Settings.</p></Card>
          )}
        </div>
      </div>

      {/* Comparison table */}
      <Card padded={false} className="overflow-x-auto">
        <div className="px-4 pt-4 sm:px-5"><div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: C.accent, fontFamily: FONT_BODY }}>Logistics comparison</div></div>
        <table className="w-full text-sm mt-2">
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.line}` }}>
              {["Logistics", "Total spent", "Suggested sell", "Profit", "ROI"].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-xs uppercase tracking-wide font-semibold whitespace-nowrap" style={{ color: C.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((r) => (
              <tr key={r.method.id} style={{ borderBottom: `1px solid ${C.line}`, background: r.method.id === bestRoiId ? `${C.green}0D` : "transparent" }}>
                <td className="px-3 py-2.5 font-medium whitespace-nowrap" style={{ color: C.text }}>
                  {r.method.label} {r.method.id === draft.selectedMethod && <Pill color={C.accent}>Selected</Pill>} {r.method.id === bestRoiId && <Pill color={C.green}>Best ROI</Pill>}
                </td>
                <td className="px-3 py-2.5 tabular-nums whitespace-nowrap" style={{ color: C.text, fontFamily: FONT_MONO }}>{fmtNum(r.totalSpent)}</td>
                <td className="px-3 py-2.5 tabular-nums whitespace-nowrap" style={{ color: C.text, fontFamily: FONT_MONO }}>{r.suggestedRounded != null ? fmtNum(r.suggestedRounded) : "—"}</td>
                <td className="px-3 py-2.5 tabular-nums font-semibold whitespace-nowrap" style={{ color: r.profit >= 0 ? C.green : C.red, fontFamily: FONT_MONO }}>{fmtNum(r.profit)}</td>
                <td className="px-3 py-2.5 tabular-nums whitespace-nowrap" style={{ color: r.roi >= 0 ? C.green : C.red, fontFamily: FONT_MONO }}>{fmtPct(r.roi)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="h-4" />
      </Card>

      {!isNew && (
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCreateOrder}><Truck size={15} /> Create order from this product</Button>
        </div>
      )}
    </div>
  );
}

/* ============================== ORDERS PAGE ============================== */
function OrdersPage({ orders, openOrder, goTo }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const rows = useMemo(() => {
    let list = orders.map((o) => ({ o, fin: computeOrderFinancials(o) }));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(({ o }) => (o.customerName + " " + o.productName + " " + o.orderNo).toLowerCase().includes(q));
    }
    if (statusFilter !== "All") list = list.filter(({ o }) => o.status === statusFilter);
    return [...list].sort((a, b) => (b.o.createdAt || 0) - (a.o.createdAt || 0));
  }, [orders, search, statusFilter]);

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow={`${orders.length} orders`} title="Orders" right={<Button onClick={() => goTo("orderFormNew")}><Plus size={15} /> New order</Button>} />

      <Card>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1" style={{ minWidth: 180 }}>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.mutedFaint }} />
            <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer, product, order #" className="pl-9" />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
            <option value="All">All statuses</option>
            {ORDER_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card className="text-center py-10"><p className="text-sm" style={{ color: C.mutedFaint }}>No orders match these filters.</p></Card>
      ) : (
        <div className="grid gap-3">
          {rows.map(({ o, fin }) => (
            <button key={o.id} onClick={() => openOrder(o.id)} className="text-left rounded-md p-4 flex flex-wrap items-center gap-3 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <div className="min-w-0 flex-1" style={{ minWidth: 160 }}>
                <div className="text-sm font-semibold truncate" style={{ color: C.text }}>{o.customerName || "No customer name"} <span style={{ color: C.mutedFaint, fontWeight: 400 }}>· {o.orderNo}</span></div>
                <div className="text-xs truncate" style={{ color: C.mutedFaint }}>{o.productName}{o.variant ? ` · ${o.variant}` : ""}{o.size ? ` · ${o.size}` : ""} × {o.quantity}</div>
              </div>
              <StatusBadge status={o.status} />
              <div className="text-right" style={{ minWidth: 90 }}>
                <div className="text-xs" style={{ color: C.mutedFaint }}>Profit</div>
                <div className="text-sm tabular-nums font-semibold" style={{ color: fin.expectedProfit >= 0 ? C.green : C.red, fontFamily: FONT_MONO }}>{fmtNum(fin.expectedProfit)}</div>
              </div>
              <div className="text-right" style={{ minWidth: 90 }}>
                <div className="text-xs" style={{ color: C.mutedFaint }}>Remaining</div>
                <div className="text-sm tabular-nums font-semibold" style={{ color: fin.amountRemaining > 0 ? C.amber : C.green, fontFamily: FONT_MONO }}>{fmtNum(fin.amountRemaining)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================== ORDER FORM PAGE ============================== */
function OrderFormPage({ draft, setDraft, products, settings, onSave, onDelete, isNew, onBack }) {
  const fin = useMemo(() => computeOrderFinancials(draft), [draft]);
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  const applyProduct = (productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) { setDraft((d) => ({ ...d, productId: null, productName: "" })); return; }
    const full = computeProductFull(product, settings);
    setDraft((d) => ({
      ...d, productId: product.id, productName: product.name, variant: product.variant, size: product.size,
      logisticsMethod: product.selectedMethod, sellingPrice: d.sellingPrice || String(full.sellingPrice || ""),
      paymentFeePct: product.paymentFeePct, marketingPct: product.marketingPct,
      unitTotalSpentSnapshot: full.totalSpent,
    }));
  };

  const applyPackaging = (packagingId) => {
    const pkg = (settings.packagingOptions || []).find((p) => p.id === packagingId);
    setDraft((d) => ({ ...d, packagingId, packagingCostPerUnitMMK: pkg ? String(pkg.priceMMK) : d.packagingCostPerUnitMMK }));
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium mb-1" style={{ color: C.muted }}><ArrowLeft size={15} /> Back</button>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <SectionTitle eyebrow={isNew ? "New Order" : `Order ${draft.orderNo}`} title={draft.customerName || "Untitled order"} />
        <div className="flex gap-2">
          {!isNew && <Button variant="danger" onClick={onDelete}><Trash2 size={14} /> Delete</Button>}
          <Button onClick={onSave}><Check size={14} /> {isNew ? "Create order" : "Save changes"}</Button>
        </div>
      </div>

      <Card style={{ borderColor: fin.expectedProfit >= 0 ? `${C.green}55` : `${C.red}55` }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-3">
          <StatRow label="Selling price (total)" value={fmtMMK(fin.sellingPriceTotal)} />
          <StatRow label="Packaging cost" value={fmtMMK(fin.packagingCost)} />
          <StatRow label="Total spent (expected)" value={fmtMMK(fin.expectedTotalSpent)} />
          <StatRow label="Expected profit" value={fmtMMK(fin.expectedProfit)} color={fin.expectedProfit >= 0 ? C.green : C.red} big />
          <StatRow label="Expected ROI" value={fmtPct(fin.expectedRoi)} color={fin.expectedRoi >= 0 ? C.green : C.red} big />
          <StatRow label="Amount paid" value={fmtMMK(fin.amountPaid)} />
          <StatRow label="Amount remaining" value={fmtMMK(fin.amountRemaining)} color={fin.amountRemaining > 0 ? C.amber : C.green} />
          <StatRow label="Actual profit" value={fmtMMK(fin.actualProfit)} color={fin.actualProfit >= 0 ? C.green : C.red} />
        </div>
      </Card>

      <Card>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.accent, fontFamily: FONT_BODY }}>Customer &amp; product</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Customer name"><TextInput value={draft.customerName} onChange={set("customerName")} /></Field>
          <Field label="Customer contact"><TextInput value={draft.customerContact} onChange={set("customerContact")} placeholder="Phone, Viber, etc." /></Field>
          <Field label="Product">
            <Select value={draft.productId || ""} onChange={(e) => applyProduct(e.target.value)}>
              <option value="">— Select from catalog —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name || "Untitled"}</option>)}
            </Select>
          </Field>
          <Field label="Product name" hint="override if not in catalog"><TextInput value={draft.productName} onChange={set("productName")} /></Field>
          <Field label="Variant / color"><TextInput value={draft.variant} onChange={set("variant")} /></Field>
          <Field label="Size"><TextInput value={draft.size} onChange={set("size")} /></Field>
          <Field label="Quantity"><TextInput type="number" min="1" value={draft.quantity} onChange={set("quantity")} /></Field>
          <Field label="Selling price" hint="MMK per unit"><TextInput type="number" min="0" value={draft.sellingPrice} onChange={set("sellingPrice")} /></Field>
        </div>
      </Card>

      <Card>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.accent, fontFamily: FONT_BODY }}>Supplier &amp; packaging</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Supplier">
            <Select value={draft.supplier} onChange={set("supplier")}>
              <option value="">— Select supplier —</option>
              {(settings.suppliers || []).map((s) => <option key={s} value={s}>{s}</option>)}
              {draft.supplier && !(settings.suppliers || []).includes(draft.supplier) && <option value={draft.supplier}>{draft.supplier}</option>}
            </Select>
          </Field>
          <Field label="Packaging">
            <Select value={draft.packagingId} onChange={(e) => applyPackaging(e.target.value)}>
              <option value="">— None —</option>
              {(settings.packagingOptions || []).map((p) => <option key={p.id} value={p.id}>{p.name} ({fmtNum(p.priceMMK)} MMK)</option>)}
            </Select>
          </Field>
          <Field label="Packaging cost" hint="MMK per unit — auto-filled, editable">
            <TextInput type="number" min="0" value={draft.packagingCostPerUnitMMK} onChange={set("packagingCostPerUnitMMK")} />
          </Field>
        </div>
        <p className="text-xs mt-3" style={{ color: C.mutedFaint }}>New suppliers and packaging options can be added in Settings.</p>
      </Card>

      <Card>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.accent, fontFamily: FONT_BODY }}>Shipping &amp; logistics</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Customer shipping option"><Select value={draft.customerShipping} onChange={set("customerShipping")}>{CUSTOMER_SHIPPING_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</Select></Field>
          <Field label="Logistics method"><Select value={draft.logisticsMethod} onChange={set("logisticsMethod")}>{(settings.logisticsMethods || []).map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</Select></Field>
          <Field label="Order date"><TextInput type="date" value={draft.orderDate} onChange={set("orderDate")} /></Field>
          <Field label="Estimated arrival"><TextInput type="date" value={draft.eta} onChange={set("eta")} /></Field>
        </div>
      </Card>

      <Card>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.accent, fontFamily: FONT_BODY }}>Payment</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Payment method"><TextInput value={draft.paymentMethod} onChange={set("paymentMethod")} placeholder="KBZPay, bank transfer, cash…" /></Field>
          <Field label="Amount paid" hint="MMK"><TextInput type="number" min="0" value={draft.amountPaid} onChange={set("amountPaid")} /></Field>
          <Field label="Payment fee %"><TextInput type="number" min="0" max="100" value={draft.paymentFeePct} onChange={set("paymentFeePct")} /></Field>
          <Field label="Marketing %" hint="of final profit"><TextInput type="number" min="0" max="100" value={draft.marketingPct} onChange={set("marketingPct")} /></Field>
        </div>
      </Card>

      <Card>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.accent, fontFamily: FONT_BODY }}>Cost &amp; status</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Unit cost snapshot" hint="MMK — frozen from product at order time"><TextInput type="number" min="0" value={draft.unitTotalSpentSnapshot} onChange={set("unitTotalSpentSnapshot")} /></Field>
          <Field label="Actual total spent" hint="MMK — leave blank to use (snapshot + packaging) × quantity"><TextInput type="number" min="0" value={draft.actualTotalSpentOverride} onChange={set("actualTotalSpentOverride")} placeholder={fmtNum(fin.expectedTotalSpent)} /></Field>
          <Field label="Status">
            <Select value={draft.status} onChange={set("status")}>{ORDER_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</Select>
          </Field>
        </div>
        <div className="mt-3"><Field label="Notes"><TextArea rows={2} value={draft.notes} onChange={set("notes")} /></Field></div>
      </Card>
    </div>
  );
}

/* ============================== ANALYTICS PAGE ============================== */
function AnalyticsPage({ products, orders, settings }) {
  const orderRows = useMemo(() => orders.filter((o) => !BAD_STATUSES.includes(o.status)).map((o) => ({ o, fin: computeOrderFinancials(o) })), [orders]);

  if (orderRows.length === 0) {
    return <Card className="text-center py-10"><p className="text-sm" style={{ color: C.mutedFaint }}>Add and price a few orders to see analytics.</p></Card>;
  }

  const agg = orderRows.reduce((a, { o, fin }) => {
    a.revenue += fin.sellingPriceTotal;
    a.spent += fin.expectedTotalSpent;
    a.profit += fin.expectedProfit;
    a.roiSum += fin.expectedRoi;
    a.marginSum += fin.sellingPriceTotal > 0 ? (fin.expectedProfit / fin.sellingPriceTotal) * 100 : 0;
    return a;
  }, { revenue: 0, spent: 0, profit: 0, roiSum: 0, marginSum: 0 });

  const byProduct = {};
  orderRows.forEach(({ o, fin }) => {
    const key = o.productName || "Untitled";
    byProduct[key] = (byProduct[key] || 0) + fin.expectedProfit;
  });
  const profitByProduct = Object.entries(byProduct).sort((a, b) => b[1] - a[1]).map(([name, profit]) => ({ name, profit: Math.round(profit) }));

  const statusCounts = {};
  orders.forEach((o) => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
  const statusData = ORDER_STATUSES.map((s) => ({ name: s.label, value: statusCounts[s.id] || 0, color: s.color })).filter((d) => d.value > 0);

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Performance" title="Analytics" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><div className="text-xs uppercase tracking-wide mb-1" style={{ color: C.muted }}>Revenue</div><div className="text-lg font-semibold tabular-nums" style={{ color: C.text, fontFamily: FONT_MONO }}>{fmtNum(agg.revenue)}</div></Card>
        <Card><div className="text-xs uppercase tracking-wide mb-1" style={{ color: C.muted }}>Profit</div><div className="text-lg font-semibold tabular-nums" style={{ color: agg.profit >= 0 ? C.green : C.red, fontFamily: FONT_MONO }}>{fmtNum(agg.profit)}</div></Card>
        <Card><div className="text-xs uppercase tracking-wide mb-1" style={{ color: C.muted }}>Avg ROI</div><div className="text-lg font-semibold tabular-nums" style={{ color: C.text, fontFamily: FONT_MONO }}>{fmtPct(agg.roiSum / orderRows.length)}</div></Card>
        <Card><div className="text-xs uppercase tracking-wide mb-1" style={{ color: C.muted }}>Avg margin</div><div className="text-lg font-semibold tabular-nums" style={{ color: C.text, fontFamily: FONT_MONO }}>{fmtPct(agg.marginSum / orderRows.length)}</div></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: C.muted, fontFamily: FONT_BODY }}>Orders by status</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {statusData.map((d, i) => <Cell key={i} fill={d.color} stroke={C.surface} strokeWidth={2} />)}
              </Pie>
              <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.lineStrong}`, color: C.text, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
            {statusData.map((d) => <div key={d.name} className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }}><span className="w-2 h-2 rounded-full" style={{ background: d.color }} /> {d.name}</div>)}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: C.muted, fontFamily: FONT_BODY }}>Profit by product</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={profitByProduct} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: C.mutedFaint, fontSize: 10 }} stroke={C.line} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={{ fill: C.mutedFaint, fontSize: 11 }} stroke={C.line} />
              <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.lineStrong}`, color: C.text, fontSize: 12 }} formatter={(v) => fmtMMK(v)} />
              <Bar dataKey="profit" radius={[3, 3, 0, 0]}>{profitByProduct.map((d, i) => <Cell key={i} fill={d.profit >= 0 ? C.accent : C.red} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

/* ============================== SOCIALS PAGE ============================== */
function SocialsPage({ settings, onSave }) {
  const [draft, setDraft] = useState(settings.socialLinks || {});
  useEffect(() => setDraft(settings.socialLinks || {}), [settings.socialLinks]);
  const [saved, setSaved] = useState(false);

  const set = (id) => (e) => setDraft((d) => ({ ...d, [id]: e.target.value }));
  const save = () => {
    onSave({ ...settings, socialLinks: draft });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const openable = (url) => url && /^https?:\/\//i.test(url.trim());

  return (
    <div className="space-y-5 max-w-2xl">
      <SectionTitle eyebrow="Hoop Corner" title="Socials" right={<Button onClick={save}>{saved ? <><Check size={14} /> Saved</> : "Save links"}</Button>} />
      <p className="text-sm -mt-3" style={{ color: C.mutedFaint }}>Paste each profile link once — the icon button opens it directly, and the logo in the sidebar jumps here.</p>

      <div className="grid sm:grid-cols-2 gap-3">
        {SOCIAL_PLATFORMS.map((p) => {
          const url = draft[p.id] || "";
          return (
            <Card key={p.id}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0" style={{ background: C.surface2, border: `1px solid ${C.line}` }}>
                  <PlatformIcon id={p.id} size={18} color={C.accentSoft} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: C.text, fontFamily: FONT_DISPLAY }}>{p.label}</div>
                </div>
                {openable(url) && (
                  <a href={url} target="_blank" rel="noreferrer" className="p-2 rounded-md" style={{ color: C.accent }} aria-label={`Open ${p.label}`}>
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
              <TextInput value={url} onChange={set(p.id)} placeholder={`https://...`} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
/* ============================== LOGISTICS METHODS EDITOR (Settings) ============================== */
function blankMethodTemplate() {
  return {
    id: uid("method"), label: "New Provider", type: "Land / Road", deliveryTime: "",
    primaryRateLabel: "Rate", primaryRateCurrency: "RMB",
    weightRuleKind: "exact", weightRuleNote: "",
    minCharge: { enabled: false, thresholdKg: 1, flatAmount: 0, currency: "RMB" },
    hasSecondaryLeg: false, secondaryLegLabel: "", secondaryIsFlat: true, secondaryRateCurrency: "MMK",
    supportsCbm: false, cbmPriceLabel: "CBM price",
    supportsPerItem: false, perItemLabel: "Per item", perItemRateCurrency: "RMB",
    supportsVolumetric: false,
    bracketTable: [],
    defaults: { ratePerKg: 0, homeDeliveryMMK: 0 },
  };
}

function LogisticsMethodEditor({ method, onChange, onDelete }) {
  const set = (key) => (e) => onChange({ ...method, [key]: e.target.value });
  const setBool = (key) => (e) => onChange({ ...method, [key]: e.target.checked });
  const setDefault = (key) => (e) => onChange({ ...method, defaults: { ...method.defaults, [key]: e.target.value } });
  const setMinCharge = (key) => (e) => onChange({ ...method, minCharge: { ...method.minCharge, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value } });

  const bracketTable = method.bracketTable || [];
  const setBracketTable = (list) => onChange({ ...method, bracketTable: list });
  const addBracketRow = () => setBracketTable([...bracketTable, { upTo: 0, chargeAs: 0 }]);
  const updateBracketRow = (i, key, value) => setBracketTable(bracketTable.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  const removeBracketRow = (i) => setBracketTable(bracketTable.filter((_, idx) => idx !== i));

  return (
    <Accordion title={method.label || "Untitled provider"} subtitle={`${method.type || ""}${method.deliveryTime ? " · " + method.deliveryTime : ""}`}>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Label"><TextInput value={method.label} onChange={set("label")} /></Field>
          <Field label="Type"><TextInput value={method.type} onChange={set("type")} placeholder="e.g. Air, Land, Sea" /></Field>
          <Field label="Delivery time"><TextInput value={method.deliveryTime} onChange={set("deliveryTime")} placeholder="e.g. 3–7 days" /></Field>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Primary rate label"><TextInput value={method.primaryRateLabel} onChange={set("primaryRateLabel")} /></Field>
          <Field label="Rate currency">
            <Select value={method.primaryRateCurrency} onChange={set("primaryRateCurrency")}>
              <option value="RMB">RMB (¥/kg)</option>
              <option value="MMK">MMK (MMK/kg)</option>
            </Select>
          </Field>
          <Field label="Default rate"><TextInput type="number" min="0" value={method.defaults?.ratePerKg ?? 0} onChange={setDefault("ratePerKg")} /></Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Weight rule">
            <Select value={method.weightRuleKind} onChange={set("weightRuleKind")}>
              <option value="exact">Exact weight — no rounding</option>
              <option value="bracket">Bracket table — round to fixed steps</option>
            </Select>
          </Field>
          <Field label="Note shown on the product page" hint="optional"><TextInput value={method.weightRuleNote} onChange={set("weightRuleNote")} /></Field>
        </div>

        {method.weightRuleKind === "bracket" && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.muted }}>Bracket table</div>
            <div className="space-y-2">
              {bracketTable.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <TextInput type="number" min="0" step="0.1" value={row.upTo} onChange={(e) => updateBracketRow(i, "upTo", e.target.value)} placeholder="up to kg" />
                  <span className="text-xs shrink-0" style={{ color: C.mutedFaint }}>kg →</span>
                  <TextInput type="number" min="0" step="0.1" value={row.chargeAs} onChange={(e) => updateBracketRow(i, "chargeAs", e.target.value)} placeholder="charge as kg" />
                  <button onClick={() => removeBracketRow(i)} className="p-1.5 rounded-md shrink-0" style={{ color: C.red }} aria-label="Remove row"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="mt-2" onClick={addBracketRow}><Plus size={13} /> Add row</Button>
            <p className="text-xs mt-2" style={{ color: C.mutedFaint }}>Beyond the last row, the same step pattern continues automatically.</p>
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.muted }}>
            <input type="checkbox" checked={!!method.minCharge?.enabled} onChange={setMinCharge("enabled")} /> Minimum charge under a weight threshold
          </label>
          {method.minCharge?.enabled && (
            <div className="grid sm:grid-cols-3 gap-3 pl-6">
              <Field label="Under (kg)"><TextInput type="number" min="0" step="0.1" value={method.minCharge.thresholdKg} onChange={setMinCharge("thresholdKg")} /></Field>
              <Field label="Flat charge"><TextInput type="number" min="0" value={method.minCharge.flatAmount} onChange={setMinCharge("flatAmount")} /></Field>
              <Field label="Currency">
                <Select value={method.minCharge.currency} onChange={setMinCharge("currency")}>
                  <option value="RMB">RMB</option>
                  <option value="MMK">MMK</option>
                </Select>
              </Field>
            </div>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: C.muted }}>
            <input type="checkbox" checked={!!method.hasSecondaryLeg} onChange={setBool("hasSecondaryLeg")} /> Has a second leg (e.g. a domestic Myanmar-side fee)
          </label>
          {method.hasSecondaryLeg && (
            <div className="grid sm:grid-cols-3 gap-3 pl-6">
              <Field label="Leg label"><TextInput value={method.secondaryLegLabel} onChange={set("secondaryLegLabel")} placeholder="e.g. Ruili → Yangon" /></Field>
              <Field label="Pricing">
                <Select value={method.secondaryIsFlat ? "flat" : "perkg"} onChange={(e) => onChange({ ...method, secondaryIsFlat: e.target.value === "flat" })}>
                  <option value="flat">Flat amount</option>
                  <option value="perkg">Per kg</option>
                </Select>
              </Field>
              {method.secondaryIsFlat ? (
                <Field label="Default flat (MMK)"><TextInput type="number" min="0" value={method.defaults?.secondaryFlatMMK ?? 0} onChange={setDefault("secondaryFlatMMK")} /></Field>
              ) : (
                <>
                  <Field label="Rate currency">
                    <Select value={method.secondaryRateCurrency} onChange={set("secondaryRateCurrency")}>
                      <option value="RMB">RMB</option>
                      <option value="MMK">MMK</option>
                    </Select>
                  </Field>
                  <Field label="Default rate/kg"><TextInput type="number" min="0" value={method.defaults?.secondaryRatePerKg ?? 0} onChange={setDefault("secondaryRatePerKg")} /></Field>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
            <input type="checkbox" checked={!!method.supportsCbm} onChange={setBool("supportsCbm")} /> Supports CBM pricing alternative
          </label>
          <label className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
            <input type="checkbox" checked={!!method.supportsPerItem} onChange={setBool("supportsPerItem")} /> Supports per-item pricing
          </label>
          <label className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
            <input type="checkbox" checked={!!method.supportsVolumetric} onChange={setBool("supportsVolumetric")} /> Supports volumetric weight
          </label>
        </div>

        {method.supportsCbm && (
          <div className="grid sm:grid-cols-2 gap-3 pl-6">
            <Field label="CBM price label"><TextInput value={method.cbmPriceLabel} onChange={set("cbmPriceLabel")} /></Field>
            <Field label="Default CBM price (¥)"><TextInput type="number" min="0" value={method.defaults?.cbmPriceRmb ?? 0} onChange={setDefault("cbmPriceRmb")} /></Field>
          </div>
        )}
        {method.supportsPerItem && (
          <div className="grid sm:grid-cols-3 gap-3 pl-6">
            <Field label="Per-item label"><TextInput value={method.perItemLabel} onChange={set("perItemLabel")} /></Field>
            <Field label="Rate currency">
              <Select value={method.perItemRateCurrency} onChange={set("perItemRateCurrency")}>
                <option value="RMB">RMB</option>
                <option value="MMK">MMK</option>
              </Select>
            </Field>
            <Field label="Default rate/item"><TextInput type="number" min="0" value={method.defaults?.itemRate ?? 0} onChange={setDefault("itemRate")} /></Field>
          </div>
        )}

        <Field label="Default home delivery" hint="MMK"><TextInput type="number" min="0" value={method.defaults?.homeDeliveryMMK ?? 0} onChange={setDefault("homeDeliveryMMK")} /></Field>

        <div className="pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
          <Button variant="danger" className="mt-3" onClick={onDelete}><Trash2 size={13} /> Delete this provider</Button>
        </div>
      </div>
    </Accordion>
  );
}

function LogisticsMethodsSection({ methods, setMethods }) {
  const updateMethod = (id, next) => setMethods(methods.map((m) => (m.id === id ? next : m)));
  const deleteMethod = (id) => setMethods(methods.filter((m) => m.id !== id));
  const addMethod = () => setMethods([...methods, blankMethodTemplate()]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.accent, fontFamily: FONT_BODY }}>Logistics providers</div>
          <p className="text-xs mt-1" style={{ color: C.mutedFaint }}>Every field — including the weight-rounding rule — is editable. Add as many custom providers as you need.</p>
        </div>
        <Button variant="ghost" onClick={addMethod}><Plus size={14} /> Add provider</Button>
      </div>
      <div className="space-y-2">
        {methods.map((m) => (
          <LogisticsMethodEditor key={m.id} method={m} onChange={(next) => updateMethod(m.id, next)} onDelete={() => deleteMethod(m.id)} />
        ))}
        {methods.length === 0 && <Card className="text-center py-6"><p className="text-sm" style={{ color: C.mutedFaint }}>No providers yet — add one above.</p></Card>}
      </div>
    </div>
  );
}

/* ============================== SETTINGS PAGE ============================== */
function SettingsPage({ settings, onSave }) {
  const [draft, setDraft] = useState(settings);
  useEffect(() => setDraft(settings), [settings]);
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  const [saved, setSaved] = useState(false);

  const save = () => {
    const cleaned = { ...draft };
    Object.keys(DEFAULT_SETTINGS).forEach((k) => {
      if (typeof DEFAULT_SETTINGS[k] === "number") cleaned[k] = n(draft[k]);
    });
    onSave(cleaned);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };
  const reset = () => setDraft(DEFAULT_SETTINGS);

  const packaging = draft.packagingOptions || [];
  const setPackaging = (list) => setDraft((d) => ({ ...d, packagingOptions: list }));
  const addPackaging = () => setPackaging([...packaging, { id: uid("pkg"), name: "", priceMMK: 0 }]);
  const updatePackaging = (id, key, value) => setPackaging(packaging.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  const removePackaging = (id) => setPackaging(packaging.filter((p) => p.id !== id));

  const suppliers = draft.suppliers || [];
  const setSuppliers = (list) => setDraft((d) => ({ ...d, suppliers: list }));
  const addSupplier = () => setSuppliers([...suppliers, ""]);
  const updateSupplier = (idx, value) => setSuppliers(suppliers.map((s, i) => (i === idx ? value : s)));
  const removeSupplier = (idx) => setSuppliers(suppliers.filter((_, i) => i !== idx));

  return (
    <div className="space-y-5 max-w-3xl">
      <SectionTitle eyebrow="Centralized" title="Settings" right={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={reset}><RotateCcw size={14} /> Reset defaults</Button>
          <Button onClick={save}>{saved ? <><Check size={14} /> Saved</> : "Save settings"}</Button>
        </div>
      } />
      <p className="text-sm -mt-3" style={{ color: C.mutedFaint }}>Every product and order pulls its rates from here — nothing is hardcoded in the calculators.</p>

      <Card>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.accent, fontFamily: FONT_BODY }}>Exchange rates</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="RMB → MMK"><TextInput type="number" value={draft.rmbRate} onChange={set("rmbRate")} /></Field>
          <Field label="USD → MMK"><TextInput type="number" value={draft.usdRate} onChange={set("usdRate")} /></Field>
        </div>
      </Card>

      <LogisticsMethodsSection methods={draft.logisticsMethods || []} setMethods={(list) => setDraft((d) => ({ ...d, logisticsMethods: list }))} />

      <Card>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.accent, fontFamily: FONT_BODY }}>Defaults for new products</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Default payment fee %"><TextInput type="number" value={draft.defaultPaymentFeePct} onChange={set("defaultPaymentFeePct")} /></Field>
          <Field label="Default marketing %" hint="of final profit"><TextInput type="number" value={draft.defaultMarketingPct} onChange={set("defaultMarketingPct")} /></Field>
          <Field label="Default target margin %"><TextInput type="number" value={draft.defaultTargetMarginPct} onChange={set("defaultTargetMarginPct")} /></Field>
          <Field label="Round suggested price to nearest" hint="MMK"><TextInput type="number" value={draft.roundNearest} onChange={set("roundNearest")} /></Field>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.accent, fontFamily: FONT_BODY }}>Packaging options</div>
          <Button variant="ghost" onClick={addPackaging}><Plus size={13} /> Add packaging</Button>
        </div>
        {packaging.length === 0 && <p className="text-sm" style={{ color: C.mutedFaint }}>No packaging options yet.</p>}
        <div className="space-y-2">
          {packaging.map((p) => (
            <div key={p.id} className="flex gap-2 items-center">
              <TextInput value={p.name} onChange={(e) => updatePackaging(p.id, "name", e.target.value)} placeholder="e.g. Branded box + bubble wrap" className="flex-1" />
              <TextInput type="number" min="0" value={p.priceMMK} onChange={(e) => updatePackaging(p.id, "priceMMK", e.target.value)} placeholder="MMK" style={{ width: 120 }} />
              <button onClick={() => removePackaging(p.id)} className="p-2 rounded-md shrink-0" style={{ color: C.red }} aria-label="Remove packaging option"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: C.mutedFaint }}>Shown when creating an order — the price is added to that order's total cost per unit.</p>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.accent, fontFamily: FONT_BODY }}>Suppliers</div>
          <Button variant="ghost" onClick={addSupplier}><Plus size={13} /> Add supplier</Button>
        </div>
        {suppliers.length === 0 && <p className="text-sm" style={{ color: C.mutedFaint }}>No suppliers yet.</p>}
        <div className="space-y-2">
          {suppliers.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <TextInput value={s} onChange={(e) => updateSupplier(i, e.target.value)} placeholder="e.g. Dewu" className="flex-1" />
              <button onClick={() => removeSupplier(i)} className="p-2 rounded-md shrink-0" style={{ color: C.red }} aria-label="Remove supplier"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: C.mutedFaint }}>Shown as a dropdown when placing an order.</p>
      </Card>
    </div>
  );
}

/* ============================== ROOT APP ============================== */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
  const [draftProduct, setDraftProduct] = useState(null);
  const [draftOrder, setDraftOrder] = useState(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [isNewOrder, setIsNewOrder] = useState(false);
  const [toast, setToast] = useState("");
  // 'synced' | 'syncing' | 'error' | 'offline' (offline = Supabase not configured, using this browser only)
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? "syncing" : "offline");

  // ---- Initial load: cloud if configured, this browser's storage otherwise ----
  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured) {
        const { products: rawP, orders: o, settings: s } = loadFromLocalStorage(DEFAULT_SETTINGS);
        const p = rawP.map((prod) => normalizeProductLogistics(prod, s.logisticsMethods));
        setSettingsState(s);
        setProducts(p);
        setOrders(o);
        try { localStorage.setItem("courtside_products_v2", JSON.stringify(p)); } catch (e) { /* ignore */ }
        setLoading(false);
        return;
      }

      try {
        const [prodRes, orderRes, settingsRes] = await Promise.all([
          supabase.from("products").select("*"),
          supabase.from("orders").select("*"),
          supabase.from("settings").select("*").eq("id", "singleton").maybeSingle(),
        ]);
        if (prodRes.error) throw prodRes.error;
        if (orderRes.error) throw orderRes.error;
        if (settingsRes.error) throw settingsRes.error;

        let p = (prodRes.data || []).map((r) => r.data);
        let o = (orderRes.data || []).map((r) => r.data);
        let s = settingsRes.data ? { ...DEFAULT_SETTINGS, ...settingsRes.data.data } : DEFAULT_SETTINGS;

        // Cloud is empty — this is likely the first connect. Upload whatever's
        // already sitting in this browser's local storage so nothing is lost.
        if (p.length === 0 && o.length === 0 && !settingsRes.data) {
          const local = loadFromLocalStorage(s);
          p = local.products; o = local.orders; s = local.settings;
          const now = new Date().toISOString();
          if (p.length) await supabase.from("products").upsert(p.map((x) => ({ id: x.id, data: x, updated_at: now })));
          if (o.length) await supabase.from("orders").upsert(o.map((x) => ({ id: x.id, data: x, updated_at: now })));
          await supabase.from("settings").upsert({ id: "singleton", data: s, updated_at: now });
        }

        const normalizedP = p.map((prod) => normalizeProductLogistics(prod, s.logisticsMethods));
        if (JSON.stringify(normalizedP) !== JSON.stringify(p) && normalizedP.length) {
          // Old logistics shape/ids from a previous version — push the upgraded shape back up.
          const now = new Date().toISOString();
          await supabase.from("products").upsert(normalizedP.map((x) => ({ id: x.id, data: x, updated_at: now })));
        }

        setSettingsState(s);
        setProducts(normalizedP);
        setOrders(o);
        setSyncStatus("synced");
      } catch (e) {
        // Cloud load failed (bad keys, table not created yet, offline, etc.) —
        // fall back to this browser's local copy so the app still works.
        const { products: rawP, orders: o, settings: s } = loadFromLocalStorage(DEFAULT_SETTINGS);
        const p = rawP.map((prod) => normalizeProductLogistics(prod, s.logisticsMethods));
        setSettingsState(s);
        setProducts(p);
        setOrders(o);
        setSyncStatus("error");
      }
      setLoading(false);
    })();
  }, []);

  // ---- Live sync: reflect changes made from any other device/tab ----
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const refetch = async (table, setter) => {
      const { data, error } = await supabase.from(table).select("*");
      if (!error && data) setter(data.map((r) => r.data));
    };
    const channel = supabase
      .channel("courtside-live-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => refetch("products", setProducts))
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => refetch("orders", setOrders))
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, async () => {
        const { data, error } = await supabase.from("settings").select("*").eq("id", "singleton").maybeSingle();
        if (!error && data) setSettingsState({ ...DEFAULT_SETTINGS, ...data.data });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const persistProducts = (next) => {
    const removedIds = products.filter((p) => !next.some((x) => x.id === p.id)).map((p) => p.id);
    setProducts(next);
    if (!isSupabaseConfigured) {
      try { localStorage.setItem("courtside_products_v2", JSON.stringify(next)); } catch (e) { setSyncStatus("error"); }
      return;
    }
    (async () => {
      try {
        setSyncStatus("syncing");
        const now = new Date().toISOString();
        if (next.length) { const { error } = await supabase.from("products").upsert(next.map((p) => ({ id: p.id, data: p, updated_at: now }))); if (error) throw error; }
        if (removedIds.length) { const { error } = await supabase.from("products").delete().in("id", removedIds); if (error) throw error; }
        setSyncStatus("synced");
      } catch (e) { setSyncStatus("error"); }
    })();
  };

  const persistOrders = (next) => {
    const removedIds = orders.filter((o) => !next.some((x) => x.id === o.id)).map((o) => o.id);
    setOrders(next);
    if (!isSupabaseConfigured) {
      try { localStorage.setItem("courtside_orders_v2", JSON.stringify(next)); } catch (e) { setSyncStatus("error"); }
      return;
    }
    (async () => {
      try {
        setSyncStatus("syncing");
        const now = new Date().toISOString();
        if (next.length) { const { error } = await supabase.from("orders").upsert(next.map((o) => ({ id: o.id, data: o, updated_at: now }))); if (error) throw error; }
        if (removedIds.length) { const { error } = await supabase.from("orders").delete().in("id", removedIds); if (error) throw error; }
        setSyncStatus("synced");
      } catch (e) { setSyncStatus("error"); }
    })();
  };

  const persistSettings = (next) => {
    setSettingsState(next);
    if (!isSupabaseConfigured) {
      try { localStorage.setItem("courtside_settings_v2", JSON.stringify(next)); } catch (e) { setSyncStatus("error"); }
      return;
    }
    (async () => {
      try {
        setSyncStatus("syncing");
        const { error } = await supabase.from("settings").upsert({ id: "singleton", data: next, updated_at: new Date().toISOString() });
        if (error) throw error;
        setSyncStatus("synced");
      } catch (e) { setSyncStatus("error"); }
    })();
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2200); };
  const goTo = (p) => setPage(p);

  // ---- Product flow ----
  const openAddChoice = () => setPage("addChoice");
  const chooseAddCatalog = () => {
    setDraftProduct(emptyProduct(settings));
    setIsNewProduct(true);
    setPage("productDetail");
  };
  const openProduct = (id) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setDraftProduct({ ...p, logistics: { ...defaultAllLogistics(settings.logisticsMethods), ...p.logistics } });
    setIsNewProduct(false);
    setPage("productDetail");
  };
  const saveProduct = () => {
    if (!draftProduct.name.trim()) { showToast("Give the product a name first"); return; }
    let saved;
    if (draftProduct.id) {
      saved = { ...draftProduct };
      persistProducts(products.map((p) => (p.id === saved.id ? saved : p)));
      showToast("Product updated");
    } else {
      saved = { ...draftProduct, id: uid("p"), createdAt: Date.now() };
      persistProducts([saved, ...products]);
      showToast("Product saved");
    }
    setDraftProduct(saved);
    setIsNewProduct(false);
    setPage("products");
  };
  const deleteProduct = () => {
    persistProducts(products.filter((p) => p.id !== draftProduct.id));
    showToast("Product deleted");
    setPage("products");
  };
  const togglePostedTo = (productId, platformId) => {
    persistProducts(products.map((p) => {
      if (p.id !== productId) return p;
      const cur = p.postedTo || [];
      return { ...p, postedTo: cur.includes(platformId) ? cur.filter((x) => x !== platformId) : [...cur, platformId] };
    }));
  };

  // ---- Order flow ----
  const startOrderFromProduct = (product, isFreshFlow) => {
    const full = computeProductFull(product, settings);
    setDraftOrder(emptyOrder(product, full, settings));
    setIsNewOrder(true);
    setPage("orderForm");
  };
  const openNewOrderBlank = () => {
    setDraftOrder(emptyOrder(null, {}, settings));
    setIsNewOrder(true);
    setPage("orderForm");
  };
  const openOrder = (id) => {
    const o = orders.find((x) => x.id === id);
    if (!o) return;
    setDraftOrder({ ...o });
    setIsNewOrder(false);
    setPage("orderForm");
  };
  const saveOrder = () => {
    let saved;
    if (draftOrder.id) {
      saved = { ...draftOrder };
      persistOrders(orders.map((o) => (o.id === saved.id ? saved : o)));
      showToast("Order updated");
    } else {
      saved = { ...draftOrder, id: uid("o"), createdAt: Date.now() };
      persistOrders([saved, ...orders]);
      showToast("Order created");
    }
    setDraftOrder(saved);
    setIsNewOrder(false);
    setPage("orders");
  };
  const deleteOrder = () => {
    persistOrders(orders.filter((o) => o.id !== draftOrder.id));
    showToast("Order deleted");
    setPage("orders");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <div className="flex flex-col items-center gap-3">
          <BasketballMark size={32} />
          <span className="text-sm" style={{ color: C.muted, fontFamily: FONT_BODY }}>Loading your board…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex" style={{ background: C.bg, fontFamily: FONT_BODY }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        * { scrollbar-width: thin; scrollbar-color: ${C.lineStrong} transparent; }
      `}</style>

      <Nav page={page} goTo={goTo} onAdd={openAddChoice} syncStatus={syncStatus} />

      <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 sm:py-8 pb-24 lg:pb-8" style={{ maxWidth: 1400 }}>
        {syncStatus === "offline" && (
          <div className="mb-4 px-3 py-2 rounded-md text-xs flex items-center gap-2" style={{ background: `${C.amber}14`, border: `1px solid ${C.amber}55`, color: C.amber }}>
            <CloudOff size={14} /> Not connected to a cloud database — changes are only saved on this device/browser. See README.md to connect Supabase.
          </div>
        )}
        {syncStatus === "error" && (
          <div className="mb-4 px-3 py-2 rounded-md text-xs flex items-center gap-2" style={{ background: `${C.red}14`, border: `1px solid ${C.red}55`, color: C.red }}>
            <CloudOff size={14} /> Couldn't reach the cloud database — showing this device's last-known data. Changes here may not sync until connection is restored.
          </div>
        )}

        {page === "dashboard" && <Dashboard products={products} orders={orders} settings={settings} goTo={goTo} openProduct={openProduct} openOrder={openOrder} />}
        {page === "addChoice" && <AddChoicePage onCatalog={chooseAddCatalog} onOrder={openNewOrderBlank} />}
        {page === "products" && <ProductsPage products={products} settings={settings} openProduct={openProduct} goTo={goTo} onTogglePosted={togglePostedTo} />}
        {page === "productDetail" && draftProduct && (
          <ProductDetailPage
            draft={draftProduct} setDraft={setDraftProduct} settings={settings}
            onSave={saveProduct} onDelete={deleteProduct}
            onCreateOrder={() => startOrderFromProduct(draftProduct, false)}
            isNew={isNewProduct} onBack={() => setPage(isNewProduct ? "dashboard" : "products")}
          />
        )}
        {page === "orders" && <OrdersPage orders={orders} openOrder={openOrder} goTo={(p) => (p === "orderFormNew" ? openNewOrderBlank() : goTo(p))} />}
        {page === "orderForm" && draftOrder && (
          <OrderFormPage
            draft={draftOrder} setDraft={setDraftOrder} products={products} settings={settings}
            onSave={saveOrder} onDelete={deleteOrder} isNew={isNewOrder} onBack={() => setPage("orders")}
          />
        )}
        {page === "analytics" && <AnalyticsPage products={products} orders={orders} settings={settings} />}
        {page === "settings" && <SettingsPage settings={settings} onSave={(s) => { persistSettings(s); showToast("Settings saved"); }} />}
        {page === "socials" && <SocialsPage settings={settings} onSave={(s) => { persistSettings(s); showToast("Social links saved"); }} />}
      </main>

      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-md text-sm font-medium shadow-lg" style={{ background: C.surface2, border: `1px solid ${C.lineStrong}`, color: C.text }}>
          {toast}
        </div>
      )}
    </div>
  );
}
