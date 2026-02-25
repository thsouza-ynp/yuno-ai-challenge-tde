import type { PaymentMethod, TransactionStatus } from "./types";

// ── Mexican Cities & States ──
export const LOCATIONS: { city: string; state: string; weight: number }[] = [
  { city: "Ciudad de México", state: "CDMX", weight: 0.25 },
  { city: "Guadalajara", state: "Jalisco", weight: 0.15 },
  { city: "Monterrey", state: "Nuevo León", weight: 0.15 },
  { city: "Cancún", state: "Quintana Roo", weight: 0.08 }, // fraud hotspot
  { city: "Tijuana", state: "Baja California", weight: 0.07 }, // fraud hotspot
  { city: "Puebla", state: "Puebla", weight: 0.08 },
  { city: "Mérida", state: "Yucatán", weight: 0.07 },
  { city: "Querétaro", state: "Querétaro", weight: 0.06 },
  { city: "León", state: "Guanajuato", weight: 0.05 },
  { city: "Oaxaca", state: "Oaxaca", weight: 0.04 },
];

export const FRAUD_HOTSPOT_CITIES = new Set(["Cancún", "Tijuana"]);

// ── Payment Method Distribution ──
export const PAYMENT_METHODS: { method: PaymentMethod; weight: number; label: string }[] = [
  { method: "credit_card", weight: 0.45, label: "Credit Card" },
  { method: "debit_card", weight: 0.15, label: "Debit Card" },
  { method: "spei", weight: 0.20, label: "SPEI" },
  { method: "oxxo", weight: 0.15, label: "OXXO" },
  { method: "wallet", weight: 0.05, label: "Digital Wallet" },
];

// ── Status Distribution (baseline, modified by fraud patterns) ──
export const STATUS_WEIGHTS: { status: TransactionStatus; weight: number }[] = [
  { status: "approved", weight: 0.84 },
  { status: "declined", weight: 0.12 },
  { status: "chargeback", weight: 0.02 },
  { status: "pending", weight: 0.015 },
  { status: "refunded", weight: 0.005 },
];

// ── Amount Distribution ──
export const AMOUNT_MIN = 50;
export const AMOUNT_MAX = 5000;
export const AMOUNT_MEAN = 850;
export const AMOUNT_STD = 600;
export const OUTLIER_MAX = 15000;

// ── Fraud Pattern Config ──
export const FRAUD_RING_SIZE = 20; // customers always transacting late night
export const VELOCITY_ABUSER_COUNT = 5; // customers with 6-10 txns/day
export const LATE_NIGHT_CHARGEBACK_MULTIPLIER = 16; // 8% vs 0.5% baseline
export const HOTSPOT_CHARGEBACK_RATE = 0.05;
export const CARD_CHARGEBACK_RATE = 0.03;

// ── Anomaly Thresholds ──
export const UNUSUAL_HOUR_START = 0;
export const UNUSUAL_HOUR_END = 5;
export const HIGH_AMOUNT_MULTIPLIER = 2.5;
export const HIGH_AMOUNT_FLOOR = 2500;
export const HIGH_VELOCITY_THRESHOLD = 5;
export const RAPID_FIRE_SECONDS = 120;
export const GEO_ANOMALY_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

// ── Dataset Config ──
export const HISTORICAL_COUNT = 5500;
export const HISTORICAL_DAYS = 45;
export const CUSTOMER_COUNT = 1500;
export const GENERATOR_SEED = 42;

// ── Chart Colors ──
export const COLORS = {
  primary: "#6366f1", // indigo
  danger: "#ef4444", // red
  warning: "#f59e0b", // amber
  success: "#10b981", // emerald
  info: "#3b82f6", // blue
  muted: "#6b7280", // gray
  heatmapLow: "#1e1b4b", // indigo-950
  heatmapHigh: "#ef4444", // red
  chartGrid: "#374151", // gray-700
  chartText: "#9ca3af", // gray-400
};

export const METHOD_COLORS: Record<PaymentMethod, string> = {
  credit_card: "#ef4444",
  debit_card: "#f59e0b",
  spei: "#10b981",
  oxxo: "#3b82f6",
  wallet: "#8b5cf6",
};

export const STATUS_COLORS: Record<TransactionStatus, string> = {
  approved: "#10b981",
  declined: "#f59e0b",
  chargeback: "#ef4444",
  pending: "#6b7280",
  refunded: "#3b82f6",
};

// ── Labels ──
export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const METHOD_LABELS: Record<PaymentMethod, string> = {
  credit_card: "Credit Card",
  debit_card: "Debit Card",
  spei: "SPEI",
  oxxo: "OXXO",
  wallet: "Digital Wallet",
};
export const STATUS_LABELS: Record<TransactionStatus, string> = {
  approved: "Approved",
  declined: "Declined",
  chargeback: "Chargeback",
  pending: "Pending",
  refunded: "Refunded",
};
