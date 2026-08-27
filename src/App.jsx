import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  LayoutDashboard, Package, Truck, BarChart3, Settings as SettingsIcon,
  Plus, Trash2, Search, AlertTriangle, Check,
  ChevronRight, RotateCcw, ArrowLeft,
} from "lucide-react";

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
const PRODUCT_STATUSES = ["Researching", "Active", "Paused", "Archived"];

const LOGISTICS_METHODS = [
  {
    id: "genz", label: "GenZ Cargo", sub: "Land — China → Ruili → Yangon",
    goodFor: "Bags, jerseys, shirts, shorts, clothing, soft goods.",
    warn: "Avoid for shoes — shoebox/handling risk on this route.",
    fieldSet: "genz",
  },
  {
    id: "agsea", label: "AG Sea", sub: "~40–50 days · batched shipments",
    goodFor: "Larger orders — best value once you have 20–50kg to ship together.",
    warn: "Slowest option; cargo-loss risk on very small shipments.",
    fieldSet: "sea",
  },
  {
    id: "agair", label: "AG Air / Flight", sub: "~3–7 days",
    goodFor: "Faster turnaround when the margin supports it.",
    warn: "",
    fieldSet: "std",
  },
  {
    id: "marlar", label: "Marlar Air / Hand Carry", sub: "~3–5 days",
    goodFor: "Branded shoes, bags, and clothing.",
    warn: "",
    fieldSet: "std",
  },
  {
    id: "cx", label: "CX Logistics", sub: "~3–7 days · tiered pricing",
    goodFor: "Branded items — rate drops noticeably above ~10kg.",
    warn: "Rate is tiered by weight — adjust the ¥/kg field for larger shipments.",
    fieldSet: "std",
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
  genzRate: 8,
  genzRuiliToYangonDefault: 20000,
  agSeaRate: 22,
  agSeaCbmPrice: 6600,
  agAirRate: 170,
  marlarRate: 110,
  cxRate: 200,
  defaultPaymentFeePct: 2,
  defaultMarketingPct: 20,
  defaultTargetMarginPct: 25,
  roundNearest: 1000,
  packagingOptions: [
    { id: "pkg-standard", name: "Standard poly bag", priceMMK: 0 },
    { id: "pkg-box", name: "Branded box + bubble wrap", priceMMK: 1500 },
  ],
  suppliers: ["Dewu"],
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
function defaultLogisticsConfig(methodId, settings) {
  switch (methodId) {
    case "genz":
      return { rateRmbPerKg: String(settings.genzRate), weightKg: "", handlingMMK: "0", ruiliToYangonMMK: String(settings.genzRuiliToYangonDefault), yangonToHomeMMK: "0", otherMMK: "0" };
    case "agsea":
      return { rateRmbPerKg: String(settings.agSeaRate), cbmPriceRmb: String(settings.agSeaCbmPrice), weightKg: "", cbmQty: "0", handlingMMK: "0", importMMK: "0", deliveryMMK: "0" };
    case "agair":
      return { rateRmbPerKg: String(settings.agAirRate), weightKg: "", handlingMMK: "0", importMMK: "0", deliveryMMK: "0" };
    case "marlar":
      return { rateRmbPerKg: String(settings.marlarRate), weightKg: "", handlingMMK: "0", importMMK: "0", deliveryMMK: "0" };
    case "cx":
      return { rateRmbPerKg: String(settings.cxRate), weightKg: "", handlingMMK: "0", importMMK: "0", deliveryMMK: "0" };
    default:
      return {};
  }
}

function defaultAllLogistics(settings) {
  const out = {};
  LOGISTICS_METHODS.forEach((m) => { out[m.id] = defaultLogisticsConfig(m.id, settings); });
  return out;
}

function computeMethodTotal(methodId, cfg, rmbRate) {
  if (!cfg) return 0;
  const weight = n(cfg.weightKg);
  const rate = n(cfg.rateRmbPerKg);
  const freight = weight * rate * rmbRate;
  switch (methodId) {
    case "genz":
      return freight + n(cfg.handlingMMK) + n(cfg.ruiliToYangonMMK) + n(cfg.yangonToHomeMMK) + n(cfg.otherMMK);
    case "agsea": {
      const cbmCost = n(cfg.cbmQty) * n(cfg.cbmPriceRmb) * rmbRate;
      return freight + cbmCost + n(cfg.handlingMMK) + n(cfg.importMMK) + n(cfg.deliveryMMK);
    }
    case "agair":
    case "marlar":
    case "cx":
      return freight + n(cfg.handlingMMK) + n(cfg.importMMK) + n(cfg.deliveryMMK);
    default:
      return 0;
  }
}

/* ============================== CORE FINANCIAL FORMULAS ============================== */
// Total Amount Spent = product cost + china domestic shipping + selected logistics total + other costs
function computeProductCore(product, settings) {
  const dewuCostMMK = n(product.dewuPriceRmb) * settings.rmbRate;
  const chinaShippingMMK = n(product.chinaShippingRmb) * settings.rmbRate;
  const methodTotals = {};
  LOGISTICS_METHODS.forEach((m) => { methodTotals[m.id] = computeMethodTotal(m.id, product.logistics?.[m.id], settings.rmbRate); });
  const selectedLogisticsMMK = methodTotals[product.selectedMethod] || 0;
  const otherCost = n(product.otherCost);
  const totalSpent = dewuCostMMK + chinaShippingMMK + selectedLogisticsMMK + otherCost;
  return { dewuCostMMK, chinaShippingMMK, methodTotals, selectedLogisticsMMK, otherCost, totalSpent };
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
  const marketPrice = n(product.marketPrice);
  let marketFlag = null;
  if (marketPrice > 0 && suggested != null) {
    if (suggested > marketPrice) marketFlag = "low";
    else if (suggested < marketPrice * 0.9) marketFlag = "good";
  }
  return { ...core, breakEven, suggested, suggestedRounded, sellingPrice, ...fin, marketPrice, marketFlag };
}

/* ============================== PRODUCT / ORDER SCHEMAS ============================== */
function emptyProduct(settings) {
  return {
    id: null, name: "", sku: "", brand: "", category: CATEGORIES[0],
    dewuUrl: "", modelNumber: "", variant: "", size: "", imageUrl: "",
    dewuPriceRmb: "", chinaShippingRmb: "0",
    selectedMethod: "genz",
    logistics: defaultAllLogistics(settings),
    otherCost: "0",
    paymentFeePct: String(settings.defaultPaymentFeePct),
    marketingPct: String(settings.defaultMarketingPct),
    targetMarginPct: String(settings.defaultTargetMarginPct),
    marketPrice: "",
    actualSellingPrice: "",
    status: "Researching",
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
const V1_METHOD_MAP = { genz: "genz", air: "agair", sea: "agsea", handcarry: "marlar", other: "cx" };

function migrateV1Product(old, oldSettings, settings) {
  const rmbRate = oldSettings?.cnyRate || settings.rmbRate;
  let dewuPriceRmb = n(old.purchasePrice);
  if (old.purchaseCurrency === "USD") dewuPriceRmb = (n(old.purchasePrice) * (oldSettings?.usdRate || 4450)) / rmbRate;
  else if (old.purchaseCurrency === "MMK") dewuPriceRmb = n(old.purchasePrice) / rmbRate;
  const mappedMethod = V1_METHOD_MAP[old.shippingMethod] || "cx";
  const logistics = defaultAllLogistics(settings);
  logistics[mappedMethod] = {
    ...logistics[mappedMethod],
    weightKg: old.weightPerUnit || "",
    handlingMMK: String(n(old.handlingCost)),
    importMMK: String(n(old.importCost)),
    deliveryMMK: String(n(old.finalDeliveryCost)),
    ...(mappedMethod === "genz" ? { ruiliToYangonMMK: "0" } : {}),
  };
  if (mappedMethod === "cx" && old.shippingMethod === "other") {
    // v1 "Other" stored a flat manual shipping number — fold it into CX's freight-equivalent via handling.
    logistics.cx.rateRmbPerKg = "0";
    logistics.cx.weightKg = "0";
    logistics.cx.handlingMMK = String(n(old.manualShippingCost) + n(old.handlingCost));
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
    marketPrice: "",
    actualSellingPrice: String(n(old.sellingPrice) || ""),
    status: "Active",
    notes: [old.notes, "(migrated from the earlier version of this app)"].filter(Boolean).join(" — "),
    createdAt: old.createdAt || Date.now(),
  };
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
];

function Nav({ page, goTo, onAdd }) {
  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 px-4 py-6" style={{ background: C.surface, borderRight: `1px solid ${C.line}` }}>
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <BasketballMark size={26} />
          <div>
            <div className="text-lg font-semibold leading-none" style={{ color: C.text, fontFamily: FONT_DISPLAY, letterSpacing: "0.02em" }}>COURTSIDE</div>
            <div className="text-xs uppercase tracking-widest" style={{ color: C.muted }}>Resale Ops</div>
          </div>
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
        <div className="flex items-center gap-2">
          <BasketballMark size={22} />
          <span className="text-base font-semibold" style={{ color: C.text, fontFamily: FONT_DISPLAY, letterSpacing: "0.02em" }}>COURTSIDE</span>
        </div>
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
function ProductsPage({ products, settings, openProduct, goTo }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [catFilter, setCatFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const rows = useMemo(() => {
    let list = products.map((p) => ({ p, full: computeProductFull(p, settings) }));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(({ p }) => (p.name + " " + p.brand + " " + p.sku).toLowerCase().includes(q));
    }
    if (catFilter !== "All") list = list.filter(({ p }) => p.category === catFilter);
    if (statusFilter !== "All") list = list.filter(({ p }) => p.status === statusFilter);
    const sorters = {
      newest: (a, b) => (b.p.createdAt || 0) - (a.p.createdAt || 0),
      profit: (a, b) => b.full.finalProfit - a.full.finalProfit,
      roi: (a, b) => b.full.roi - a.full.roi,
      priceAsc: (a, b) => (a.full.suggestedRounded || 0) - (b.full.suggestedRounded || 0),
      name: (a, b) => (a.p.name || "").localeCompare(b.p.name || ""),
    };
    return [...list].sort(sorters[sortBy] || sorters.newest);
  }, [products, settings, search, sortBy, catFilter, statusFilter]);

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow={`${products.length} products`} title="Product Catalog" right={<Button onClick={() => goTo("addChoice")}><Plus size={15} /> Add product</Button>} />

      <Card>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1" style={{ minWidth: 180 }}>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.mutedFaint }} />
            <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, brand, SKU" className="pl-9" />
          </div>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-auto">
            <option value="newest">Sort: Newest</option>
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
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card className="text-center py-10"><p className="text-sm" style={{ color: C.mutedFaint }}>No products match these filters.</p></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(({ p, full }) => (
            <button key={p.id} onClick={() => openProduct(p.id)} className="text-left rounded-md p-4 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <div className="flex items-start gap-3 mb-3">
                <ImagePlaceholder src={p.imageUrl} size="w-12 h-12" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate" style={{ color: C.text }}>{p.name || "Untitled product"}</div>
                  <div className="text-xs truncate" style={{ color: C.mutedFaint }}>{p.category}{p.brand ? ` · ${p.brand}` : ""}</div>
                </div>
                <Pill color={p.status === "Active" ? C.green : p.status === "Archived" ? C.mutedFaint : C.amber}>{p.status}</Pill>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                <div style={{ color: C.mutedFaint }}>Dewu price</div>
                <div className="text-right tabular-nums" style={{ color: C.text, fontFamily: FONT_MONO }}>¥{fmtNum(n(p.dewuPriceRmb), 0)}</div>
                <div style={{ color: C.mutedFaint }}>Suggested price</div>
                <div className="text-right tabular-nums" style={{ color: C.accentSoft, fontFamily: FONT_MONO }}>{full.suggestedRounded != null ? fmtNum(full.suggestedRounded) : "—"}</div>
                <div style={{ color: C.mutedFaint }}>Break-even</div>
                <div className="text-right tabular-nums" style={{ color: C.muted, fontFamily: FONT_MONO }}>{full.breakEven != null ? fmtNum(full.breakEven) : "—"}</div>
                <div style={{ color: C.mutedFaint }}>Target margin</div>
                <div className="text-right tabular-nums" style={{ color: C.muted, fontFamily: FONT_MONO }}>{p.targetMarginPct || 0}%</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================== LOGISTICS FIELD GROUP ============================== */
function LogisticsFields({ method, cfg, setCfg, rmbRate }) {
  const set = (key) => (e) => setCfg({ ...cfg, [key]: e.target.value });
  const total = computeMethodTotal(method.id, cfg, rmbRate);
  return (
    <div className="space-y-4">
      {(method.goodFor || method.warn) && (
        <div className="text-xs leading-relaxed space-y-1">
          {method.goodFor && <p style={{ color: C.mutedFaint }}>{method.goodFor}</p>}
          {method.warn && <p style={{ color: C.amber }}>⚠ {method.warn}</p>}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Rate" hint="¥/kg"><TextInput type="number" min="0" value={cfg.rateRmbPerKg} onChange={set("rateRmbPerKg")} /></Field>
        <Field label="Chargeable weight" hint="kg"><TextInput type="number" min="0" value={cfg.weightKg} onChange={set("weightKg")} /></Field>
        {method.fieldSet === "sea" && (
          <>
            <Field label="CBM price" hint="¥/CBM"><TextInput type="number" min="0" value={cfg.cbmPriceRmb} onChange={set("cbmPriceRmb")} /></Field>
            <Field label="Total CBM"><TextInput type="number" min="0" value={cfg.cbmQty} onChange={set("cbmQty")} /></Field>
          </>
        )}
        <Field label="Handling" hint="MMK"><TextInput type="number" min="0" value={cfg.handlingMMK} onChange={set("handlingMMK")} /></Field>
        {method.fieldSet === "genz" ? (
          <>
            <Field label="Ruili → Yangon" hint="MMK — estimate, adjust when known"><TextInput type="number" min="0" value={cfg.ruiliToYangonMMK} onChange={set("ruiliToYangonMMK")} /></Field>
            <Field label="Yangon → home delivery" hint="MMK"><TextInput type="number" min="0" value={cfg.yangonToHomeMMK} onChange={set("yangonToHomeMMK")} /></Field>
            <Field label="Other handling" hint="MMK"><TextInput type="number" min="0" value={cfg.otherMMK} onChange={set("otherMMK")} /></Field>
          </>
        ) : (
          <>
            <Field label="Import / customs" hint="MMK"><TextInput type="number" min="0" value={cfg.importMMK} onChange={set("importMMK")} /></Field>
            <Field label="Home delivery" hint="MMK"><TextInput type="number" min="0" value={cfg.deliveryMMK} onChange={set("deliveryMMK")} /></Field>
          </>
        )}
      </div>
      <div className="pt-2 flex items-center justify-between" style={{ borderTop: `1px solid ${C.line}` }}>
        <span className="text-xs font-semibold uppercase tracking-wide pt-2" style={{ color: C.muted }}>
          {method.id === "genz" ? "GenZ Cargo price (including handling)" : `Total ${method.label} cost`}
        </span>
        <span className="text-base font-semibold tabular-nums pt-2" style={{ color: C.text, fontFamily: FONT_MONO }}>{fmtMMK(total)}</span>
      </div>
    </div>
  );
}

/* ============================== PRODUCT DETAIL PAGE ============================== */
function ProductDetailPage({ draft, setDraft, settings, onSave, onDelete, onCreateOrder, isNew, onBack }) {
  const full = useMemo(() => computeProductFull(draft, settings), [draft, settings]);
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  const setLogistics = (methodId) => (cfg) => setDraft((d) => ({ ...d, logistics: { ...d.logistics, [methodId]: cfg } }));

  const comparisonRows = LOGISTICS_METHODS.map((m) => {
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
          <h2 className="text-2xl sm:text-3xl font-semibold" style={{ color: C.text, fontFamily: FONT_DISPLAY }}>{draft.name || "Untitled product"}</h2>
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

      {/* Cost inputs */}
      <Card>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.accent, fontFamily: FONT_BODY }}>Product cost</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Dewu price" hint="RMB / Yuan"><TextInput type="number" min="0" value={draft.dewuPriceRmb} onChange={set("dewuPriceRmb")} placeholder="0" /></Field>
          <Field label="China domestic shipping" hint="RMB"><TextInput type="number" min="0" value={draft.chinaShippingRmb} onChange={set("chinaShippingRmb")} /></Field>
          <Field label="Other costs" hint="MMK — packaging, misc"><TextInput type="number" min="0" value={draft.otherCost} onChange={set("otherCost")} /></Field>
          <Field label="Market / reference price" hint="MMK — optional"><TextInput type="number" min="0" value={draft.marketPrice} onChange={set("marketPrice")} /></Field>
        </div>
        <div className="mt-3 text-xs tabular-nums" style={{ color: C.mutedFaint, fontFamily: FONT_MONO }}>
          {fmtNum(n(draft.dewuPriceRmb))} RMB × {settings.rmbRate} = <span style={{ color: C.text }}>{fmtMMK(full.dewuCostMMK)}</span>
          {n(draft.chinaShippingRmb) > 0 && <> · + China shipping {fmtMMK(full.chinaShippingMMK)}</>}
        </div>
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
          {LOGISTICS_METHODS.map((m) => {
            const isSelected = draft.selectedMethod === m.id;
            return (
              <Accordion
                key={m.id}
                title={m.label}
                subtitle={m.sub}
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
                <LogisticsFields method={m} cfg={draft.logistics[m.id]} setCfg={setLogistics(m.id)} rmbRate={settings.rmbRate} />
              </Accordion>
            );
          })}
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
          <Field label="Logistics method"><Select value={draft.logisticsMethod} onChange={set("logisticsMethod")}>{LOGISTICS_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</Select></Field>
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
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.accent, fontFamily: FONT_BODY }}>Exchange rate</div>
        <Field label="RMB → MMK"><TextInput type="number" value={draft.rmbRate} onChange={set("rmbRate")} /></Field>
      </Card>

      <Card>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.accent, fontFamily: FONT_BODY }}>GenZ Cargo</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="China → Ruili rate" hint="¥/kg — default 8"><TextInput type="number" value={draft.genzRate} onChange={set("genzRate")} /></Field>
          <Field label="Ruili → Yangon default" hint="MMK — estimate, varies by shipment"><TextInput type="number" value={draft.genzRuiliToYangonDefault} onChange={set("genzRuiliToYangonDefault")} /></Field>
        </div>
        <p className="text-xs mt-3 leading-relaxed" style={{ color: C.mutedFaint }}>GenZ cost = (weight × rate × RMB→MMK) + handling + Ruili→Yangon + Yangon→home. Never a flat fee. Not recommended for shoes.</p>
      </Card>

      <Card>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: C.accent, fontFamily: FONT_BODY }}>Other logistics defaults</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="AG Sea rate" hint="¥/kg — default 22"><TextInput type="number" value={draft.agSeaRate} onChange={set("agSeaRate")} /></Field>
          <Field label="AG Sea CBM price" hint="¥/CBM — default 6600"><TextInput type="number" value={draft.agSeaCbmPrice} onChange={set("agSeaCbmPrice")} /></Field>
          <Field label="AG Air rate" hint="¥/kg — 145–200 range"><TextInput type="number" value={draft.agAirRate} onChange={set("agAirRate")} /></Field>
          <Field label="Marlar Air rate" hint="¥/kg — 100–120 range"><TextInput type="number" value={draft.marlarRate} onChange={set("marlarRate")} /></Field>
          <Field label="CX rate" hint="¥/kg — tiered, ~200 at 1kg / ~145 at 10kg+"><TextInput type="number" value={draft.cxRate} onChange={set("cxRate")} /></Field>
        </div>
      </Card>

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
  const [storageOk, setStorageOk] = useState(true);

  useEffect(() => {
    let s = DEFAULT_SETTINGS;
    let p = null;
    let o = null;
    try {
      const sraw = localStorage.getItem("courtside_settings_v2");
      if (sraw) s = { ...DEFAULT_SETTINGS, ...JSON.parse(sraw) };
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
      // No v2 data yet — try migrating v1 data so nothing is lost.
      try {
        const v1raw = localStorage.getItem("bball_products_v1");
        const v1settingsRaw = localStorage.getItem("bball_settings_v1");
        const oldSettings = v1settingsRaw ? JSON.parse(v1settingsRaw) : null;
        const v1products = v1raw ? JSON.parse(v1raw) : [];
        p = v1products.map((old) => migrateV1Product(old, oldSettings, s));
      } catch (e) { p = []; }
    }

    setSettingsState(s);
    setProducts(p || []);
    setOrders(o || []);
    try {
      if (!localStorage.getItem("courtside_products_v2")) localStorage.setItem("courtside_products_v2", JSON.stringify(p || []));
    } catch (e) { setStorageOk(false); }
    setLoading(false);
  }, []);

  const persistProducts = useCallback((next) => {
    setProducts(next);
    try { localStorage.setItem("courtside_products_v2", JSON.stringify(next)); } catch (e) { setStorageOk(false); }
  }, []);
  const persistOrders = useCallback((next) => {
    setOrders(next);
    try { localStorage.setItem("courtside_orders_v2", JSON.stringify(next)); } catch (e) { setStorageOk(false); }
  }, []);
  const persistSettings = useCallback((next) => {
    setSettingsState(next);
    try { localStorage.setItem("courtside_settings_v2", JSON.stringify(next)); } catch (e) { setStorageOk(false); }
  }, []);

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
    setDraftProduct({ ...p, logistics: { ...defaultAllLogistics(settings), ...p.logistics } });
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

      <Nav page={page} goTo={goTo} onAdd={openAddChoice} />

      <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 sm:py-8 pb-24 lg:pb-8" style={{ maxWidth: 1400 }}>
        {!storageOk && (
          <div className="mb-4 px-3 py-2 rounded-md text-xs" style={{ background: `${C.amber}14`, border: `1px solid ${C.amber}55`, color: C.amber }}>
            Changes couldn't be saved to persistent storage — data will reset if you reload.
          </div>
        )}

        {page === "dashboard" && <Dashboard products={products} orders={orders} settings={settings} goTo={goTo} openProduct={openProduct} openOrder={openOrder} />}
        {page === "addChoice" && <AddChoicePage onCatalog={chooseAddCatalog} onOrder={openNewOrderBlank} />}
        {page === "products" && <ProductsPage products={products} settings={settings} openProduct={openProduct} goTo={goTo} />}
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
      </main>

      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-md text-sm font-medium shadow-lg" style={{ background: C.surface2, border: `1px solid ${C.lineStrong}`, color: C.text }}>
          {toast}
        </div>
      )}
    </div>
  );
}
