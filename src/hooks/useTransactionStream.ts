"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { EnrichedTransaction, CustomerState, DatasetStats } from "@/lib/types";

export function useTransactionStream() {
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [stats, setStats] = useState<DatasetStats>({
    amountMean: 0,
    amountStd: 0,
    sortedAmounts: [],
    globalAvgVelocity: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const customerStatesRef = useRef<Map<string, CustomerState>>(new Map());
  const rngRef = useRef<(() => number) | null>(null);
  const initRef = useRef(false);

  // Load initial dataset on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      const { generateHistoricalDataset, createRng } = await import("@/lib/generator");
      const { enrichBatch, computeDatasetStats } = await import("@/lib/enrichment");

      const { transactions: raw, customerStates } = generateHistoricalDataset();
      const enriched = enrichBatch(raw);
      const dataStats = computeDatasetStats(enriched);

      customerStatesRef.current = customerStates;
      rngRef.current = createRng(Date.now());
      setStats(dataStats);
      setTransactions(enriched);
    })();
  }, []);

  const toggleStreaming = useCallback(() => {
    setIsStreaming((prev) => !prev);
  }, []);

  // Streaming interval
  useEffect(() => {
    if (!isStreaming) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(async () => {
      const { generateTransaction } = await import("@/lib/generator");
      const { enrichOne } = await import("@/lib/enrichment");

      if (!rngRef.current) return;

      const raw = generateTransaction(rngRef.current, new Date(), customerStatesRef.current);
      const customerState = customerStatesRef.current.get(raw.customerId);
      const enriched = enrichOne(raw, customerState, stats);

      setTransactions((prev) => {
        const next = [...prev, enriched];
        return next.length > 8000 ? next.slice(next.length - 8000) : next;
      });
    }, 800);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isStreaming, stats]);

  return { transactions, isStreaming, toggleStreaming, stats };
}
