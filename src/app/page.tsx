"use client";

import { useState, useEffect } from "react";
import { ConversationPanel } from "@/components/ConversationPanel";
import { ContextPanel } from "@/components/ContextPanel";
import { useStore } from "@/lib/store";
import Link from "next/link";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const contextPanel = useStore((s) => s.contextPanel);
  const setupComplete = useStore((s) => s.setupComplete);
  const serviceCount = useStore((s) => s.services.length);
  const reset = useStore((s) => s.reset);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (contextPanel) setContextOpen(true);
  }, [contextPanel]);

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-bg">
        <div className="w-6 h-6 border-2 border-interactive border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-surface-bg">
      {/* Top bar */}
      <header className="flex-shrink-0 h-[52px] border-b border-border-subtle bg-surface flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[var(--radius-base)] bg-interactive flex items-center justify-center">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                <path
                  fill="white"
                  d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"
                />
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-text-primary">
              JobberAI
            </span>
            <span className="text-[13px] text-text-tertiary">Pricebook</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {setupComplete && (
            <>
              <span className="text-[12px] text-text-tertiary mr-2">
                {serviceCount} services
              </span>

              <button
                onClick={() => setContextOpen(!contextOpen)}
                className={`p-2 rounded-[var(--radius-small)] transition-colors cursor-pointer ${
                  contextOpen
                    ? "bg-surface-active text-text-primary"
                    : "text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
                }`}
                title="Toggle context panel"
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
                  />
                </svg>
              </button>

              <Link
                href="/catalog"
                className="p-2 rounded-[var(--radius-small)] text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors"
                title="Full catalog"
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </Link>
            </>
          )}

          <Link
            href="/settings"
            className="p-2 rounded-[var(--radius-small)] text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors"
            title="Settings"
          >
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </Link>

          <button
            onClick={reset}
            className="p-2 rounded-[var(--radius-small)] text-text-tertiary hover:bg-surface-hover hover:text-destructive transition-colors cursor-pointer"
            title="Reset everything"
          >
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <div
          className={`flex-1 min-w-0 border-r border-border-subtle ${
            contextOpen ? "" : "border-r-0"
          }`}
        >
          <ConversationPanel />
        </div>

        {contextOpen && (
          <div className="w-[400px] flex-shrink-0 bg-surface overflow-hidden">
            <ContextPanel />
          </div>
        )}
      </div>
    </div>
  );
}
