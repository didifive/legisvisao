"use client";

import { useSyncExternalStore } from "react";
import {
  getStoredAnswersCount,
  getStoredGranularAnswers,
  type StoredGranularAnswers,
} from "./storage";

const EMPTY_GRANULAR: StoredGranularAnswers = {};

let granularCache: { key: string; value: StoredGranularAnswers } = {
  key: "{}",
  value: EMPTY_GRANULAR,
};

function subscribeAnswers(onChange: () => void): () => void {
  window.addEventListener("storage-answers-updated", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("storage-answers-updated", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function subscribeNoop(): () => void {
  return () => {};
}

function getGranularSnapshot(): StoredGranularAnswers {
  const current = getStoredGranularAnswers();
  const key = JSON.stringify(current);
  if (key !== granularCache.key) {
    granularCache = { key, value: current };
  }
  return granularCache.value;
}

export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}

export function useStoredAnswersCount(): number {
  return useSyncExternalStore(subscribeAnswers, () => getStoredAnswersCount(), () => 0);
}

export function useStoredGranularAnswers(): StoredGranularAnswers {
  return useSyncExternalStore(subscribeAnswers, getGranularSnapshot, () => EMPTY_GRANULAR);
}
