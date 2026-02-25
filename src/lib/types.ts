// ── Shared type contract for Mercado Luna Anomaly Detector ──

export type PaymentMethod = "credit_card" | "debit_card" | "spei" | "oxxo" | "wallet";
export type TransactionStatus = "approved" | "declined" | "chargeback" | "pending" | "refunded";

export interface RawTransaction {
  id: string;
  customerId: string;
  amount: number; // MXN
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  city: string;
  state: string;
  timestamp: string; // ISO 8601
}

// Features computed by enrichment pipeline
export interface ComputedFeatures {
  hour: number; // 0-23
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  timeSincePrevTxn: number | null; // seconds, null if first txn
  amountPercentile: number; // 0-100
  customerAvgAmount: number;
  velocity24h: number; // txns per customer in last 24h
}

// Anomaly flags
export interface AnomalyFlags {
  isUnusualHour: boolean; // hour 0-5
  isHighAmount: boolean; // > 2.5x customer avg AND > 2500 MXN
  isHighVelocity: boolean; // velocity24h >= 5
  isGeoAnomaly: boolean; // city changed within 2h
  isRapidFire: boolean; // timeSincePrevTxn < 120s
  isSuspicious: boolean; // composite OR of above
}

// Anomaly score (stretch goal)
export interface AnomalyScore {
  score: number; // 0-100
  signals: string[]; // human-readable explanations
}

// Fully enriched transaction
export interface EnrichedTransaction extends RawTransaction, ComputedFeatures, AnomalyFlags {
  anomalyScore: number; // 0-100
  scoreSignals: string[];
}

// Customer state tracked across transactions
export interface CustomerState {
  lastCity: string;
  lastTimestamp: number; // epoch ms
  totalAmount: number;
  txnCount: number;
  recentTimestamps: number[]; // for velocity calc (last 24h window)
}

// Dataset-level statistics for scoring
export interface DatasetStats {
  amountMean: number;
  amountStd: number;
  sortedAmounts: number[]; // for percentile lookup
  globalAvgVelocity: number;
}

// Filter state for dashboard
export interface FilterState {
  dateRange: [string, string] | null; // ISO dates
  paymentMethods: PaymentMethod[];
  statuses: TransactionStatus[];
  states: string[];
}

// KPI summary
export interface KpiSummary {
  totalTransactions: number;
  chargebackRate: number; // percentage
  flaggedPercent: number;
  avgAmount: number;
  totalAmount: number;
}

// Heatmap cell data
export interface HeatmapCell {
  hour: number;
  dayOfWeek: number;
  count: number;
  chargebackCount: number;
  chargebackRate: number;
}

// Geographic data
export interface GeoData {
  state: string;
  total: number;
  chargebacks: number;
  chargebackRate: number;
}

// Payment method risk data
export interface PaymentRiskData {
  method: PaymentMethod;
  label: string;
  total: number;
  chargebacks: number;
  chargebackRate: number;
}

// Chat message for AI analyst
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Dashboard stats sent to AI analyst
export interface DashboardContext {
  kpi: KpiSummary;
  topChargebackStates: GeoData[];
  riskByMethod: PaymentRiskData[];
  peakChargebackHours: number[];
  flaggedCount: number;
  totalCustomers: number;
}
