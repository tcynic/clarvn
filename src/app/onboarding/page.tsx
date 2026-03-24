"use client";

import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";

const QUESTIONS = [
  "Hey! What brings you to CleanList? Are you managing a health condition, avoiding certain ingredients, or something else?",
  "Got it. Do you have any diagnosed conditions I should know about — things like IBS, thyroid issues, ADHD, eczema, or anything similar? No worries if not.",
  "Last one — any sensitivities or things you personally react to? Migraines, gluten, food dyes, preservatives, anything like that?",
];

type Message = {
  role: "bot" | "user";
  text: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const parseAndSaveProfile = useAction(api.onboarding.parseAndSaveProfile);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show the first question on mount (after auth resolves)
  useEffect(() => {
    if (!authLoading && isAuthenticated && messages.length === 0) {
      setMessages([{ role: "bot", text: QUESTIONS[0] }]);
    }
  }, [authLoading, isAuthenticated, messages.length]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input after bot message appears
  useEffect(() => {
    if (!submitting && !done) {
      inputRef.current?.focus();
    }
  }, [messages, submitting, done]);

  async function handleSend() {
    const text = input.trim();
    if (!text || submitting || done) return;

    const newAnswers = [...answers, text];
    const newMessages: Message[] = [...messages, { role: "user", text }];
    setInput("");
    setAnswers(newAnswers);
    setMessages(newMessages);

    const nextIndex = questionIndex + 1;

    if (nextIndex < QUESTIONS.length) {
      // Small delay so the bot reply feels natural
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: QUESTIONS[nextIndex] },
        ]);
        setQuestionIndex(nextIndex);
      }, 400);
    } else {
      // All questions answered — parse and save
      setDone(true);
      setSubmitting(true);
      setSubmitError(null);

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: "Perfect, building your profile now...",
          },
        ]);
      }, 400);

      try {
        await parseAndSaveProfile({ answers: newAnswers });
        router.push("/app");
      } catch {
        setSubmitError("Something went wrong saving your profile. Please try again.");
        setDone(false);
        setSubmitting(false);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center">
        <p className="text-sm text-[var(--ink-3)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg flex flex-col" style={{ height: "min(600px, 90vh)" }}>
        {/* Header */}
        <div className="mb-4 text-center">
          <p className="section-eyebrow">CleanList</p>
          <h1
            className="text-xl text-[var(--ink)]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Let&apos;s personalise your experience
          </h1>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto bg-white rounded-[var(--radius-xl)] border border-[var(--border)] p-4 flex flex-col gap-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[var(--teal)] text-white rounded-br-sm"
                    : "bg-[var(--surface-2)] text-[var(--ink)] rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {submitting && !submitError && (
            <div className="flex justify-start">
              <div className="bg-[var(--surface-2)] rounded-2xl rounded-bl-sm px-4 py-2.5">
                <span className="inline-flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-3)] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-3)] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-3)] animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Error */}
        {submitError && (
          <p className="text-xs text-red-600 mt-2 text-center">{submitError}</p>
        )}

        {/* Input */}
        <div className="mt-3 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer…"
            disabled={submitting || done}
            className="flex-1 text-sm border border-[var(--border)] rounded-[var(--radius)] px-4 py-2.5 bg-white text-[var(--ink)] placeholder:text-[var(--ink-4)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)] disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || submitting || done}
            className="bg-[var(--teal)] text-white font-medium text-sm px-5 py-2.5 rounded-[var(--radius)] hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </div>

        <p className="text-xs text-[var(--ink-4)] text-center mt-3">
          Scores are AI-generated using peer-reviewed evidence and regulatory data.
        </p>
      </div>
    </div>
  );
}
