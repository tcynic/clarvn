"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Widget } from "@/components/ui/Widget";

const MOODS: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: "😞", label: "Rough" },
  { value: 2, emoji: "😕", label: "Meh" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
];

interface CheckinWidgetProps {
  isAuthenticated: boolean;
}

export function CheckinWidget({ isAuthenticated }: CheckinWidgetProps) {
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const todayCheckin = useQuery(
    api.checkins.getTodayCheckin,
    isAuthenticated ? {} : "skip"
  );

  const logCheckin = useMutation(api.checkins.logCheckin);

  async function handleMoodSelect(mood: number) {
    if (!isAuthenticated || submitting) return;
    setSubmitting(true);
    try {
      await logCheckin({ date: today, mood });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Widget title="Daily check-in">
      {!isAuthenticated ? (
        <p className="text-xs text-[var(--ink-3)]">
          Sign in to track how you feel each day.
        </p>
      ) : todayCheckin ? (
        <div className="text-center py-2">
          <span className="text-3xl">
            {MOODS.find((m) => m.value === todayCheckin.mood)?.emoji ?? "✓"}
          </span>
          <p className="text-xs text-[var(--ink-3)] mt-1">
            Logged for today
          </p>
        </div>
      ) : (
        <div>
          <p className="text-xs text-[var(--ink-3)] mb-3">How are you feeling?</p>
          <div className="flex justify-between">
            {MOODS.map((mood) => (
              <button
                key={mood.value}
                type="button"
                onClick={() => handleMoodSelect(mood.value)}
                disabled={submitting}
                title={mood.label}
                className="text-2xl hover:scale-125 transition-transform disabled:opacity-50"
                aria-label={mood.label}
              >
                {mood.emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </Widget>
  );
}
