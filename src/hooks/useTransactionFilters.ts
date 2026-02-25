"use client";

import { useReducer, useCallback } from "react";
import type {
  FilterState,
  PaymentMethod,
  TransactionStatus,
  EnrichedTransaction,
} from "@/lib/types";

type Action =
  | { type: "SET_DATE_RANGE"; payload: [string, string] | null }
  | { type: "TOGGLE_PAYMENT_METHOD"; payload: PaymentMethod }
  | { type: "TOGGLE_STATUS"; payload: TransactionStatus }
  | { type: "TOGGLE_STATE"; payload: string }
  | { type: "RESET" };

const initialState: FilterState = {
  dateRange: null,
  paymentMethods: [],
  statuses: [],
  states: [],
};

function reducer(state: FilterState, action: Action): FilterState {
  switch (action.type) {
    case "SET_DATE_RANGE":
      return { ...state, dateRange: action.payload };
    case "TOGGLE_PAYMENT_METHOD": {
      const m = action.payload;
      const arr = state.paymentMethods;
      return {
        ...state,
        paymentMethods: arr.includes(m) ? arr.filter((x) => x !== m) : [...arr, m],
      };
    }
    case "TOGGLE_STATUS": {
      const s = action.payload;
      const arr = state.statuses;
      return {
        ...state,
        statuses: arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s],
      };
    }
    case "TOGGLE_STATE": {
      const s = action.payload;
      const arr = state.states;
      return {
        ...state,
        states: arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s],
      };
    }
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useTransactionFilters() {
  const [filters, dispatch] = useReducer(reducer, initialState);

  const setDateRange = useCallback(
    (range: [string, string] | null) => dispatch({ type: "SET_DATE_RANGE", payload: range }),
    []
  );
  const togglePaymentMethod = useCallback(
    (method: PaymentMethod) => dispatch({ type: "TOGGLE_PAYMENT_METHOD", payload: method }),
    []
  );
  const toggleStatus = useCallback(
    (status: TransactionStatus) => dispatch({ type: "TOGGLE_STATUS", payload: status }),
    []
  );
  const toggleState = useCallback(
    (state: string) => dispatch({ type: "TOGGLE_STATE", payload: state }),
    []
  );
  const resetFilters = useCallback(() => dispatch({ type: "RESET" }), []);

  const applyFilters = useCallback(
    (txns: EnrichedTransaction[]): EnrichedTransaction[] => {
      let result = txns;

      if (filters.dateRange) {
        const [start, end] = filters.dateRange;
        result = result.filter((t) => t.timestamp >= start && t.timestamp <= end);
      }
      if (filters.paymentMethods.length > 0) {
        result = result.filter((t) => filters.paymentMethods.includes(t.paymentMethod));
      }
      if (filters.statuses.length > 0) {
        result = result.filter((t) => filters.statuses.includes(t.status));
      }
      if (filters.states.length > 0) {
        result = result.filter((t) => filters.states.includes(t.state));
      }

      return result;
    },
    [filters]
  );

  return {
    filters,
    setDateRange,
    togglePaymentMethod,
    toggleStatus,
    toggleState,
    resetFilters,
    applyFilters,
  };
}
