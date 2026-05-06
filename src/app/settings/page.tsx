"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import type { ActionType, AutonomyLevel } from "@/lib/store";
import Link from "next/link";

const ACTION_LABELS: Record<ActionType, { label: string; description: string }> = {
  "create-service": { label: "Create services", description: "Add new services to your catalog" },
  "update-pricing": { label: "Update pricing", description: "Change prices based on cost changes or market data" },
  "create-package": { label: "Create packages", description: "Bundle services into packages" },
  "create-quote": { label: "Build quotes", description: "Assemble quotes from requests or conversations" },
  "adjust-margins": { label: "Adjust margins", description: "Change markups to hit profit targets" },
  "bulk-import": { label: "Bulk import", description: "Import multiple items at once" },
  "health-fix": { label: "Fix health issues", description: "Resolve catalog problems automatically" },
};

function ProfileSection() {
  const industry = useStore((s) => s.industry);
  const setIndustry = useStore((s) => s.setIndustry);
  const brandValues = useStore((s) => s.brandValues);
  const setBrandValues = useStore((s) => s.setBrandValues);
  const [editingIndustry, setEditingIndustry] = useState(false);
  const [industryVal, setIndustryVal] = useState(industry);
  const [newValue, setNewValue] = useState("");

  const saveIndustry = () => { setIndustry(industryVal); setEditingIndustry(false); };
  const addBrandValue = () => { if (newValue.trim() && !brandValues.includes(newValue.trim())) { setBrandValues([...brandValues, newValue.trim()]); setNewValue(""); } };
  const removeBrandValue = (v: string) => setBrandValues(brandValues.filter((bv) => bv !== v));

  return (
    <section>
      <h2 className="text-[17px] font-semibold text-text-primary mb-1">Business profile</h2>
      <p className="text-[13px] text-text-secondary mb-4">Information your AI partner uses to personalize recommendations.</p>
      <div className="bg-surface border border-border-subtle rounded-[var(--radius-base)] p-4 space-y-3 shadow-[var(--shadow-low)]">
        <div>
          <p className="text-[12px] text-text-tertiary mb-0.5">Industry</p>
          {editingIndustry ? (
            <div className="flex gap-2">
              <input autoFocus value={industryVal} onChange={(e) => setIndustryVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveIndustry()} className="h-[36px] flex-1 px-3 rounded-[var(--radius-base)] border border-border-default bg-surface text-[14px] text-text-primary focus:border-interactive focus:outline-none focus:ring-2 focus:ring-interactive/20 transition-all" />
              <button onClick={saveIndustry} className="h-[36px] px-3 bg-interactive text-white text-[12px] font-bold rounded-[var(--radius-base)] hover:bg-interactive-hover cursor-pointer">Save</button>
              <button onClick={() => setEditingIndustry(false)} className="h-[36px] px-3 text-[12px] text-text-tertiary hover:text-text-primary cursor-pointer">Cancel</button>
            </div>
          ) : (
            <button onClick={() => { setIndustryVal(industry); setEditingIndustry(true); }} className="text-[14px] text-text-primary font-medium hover:text-interactive transition-colors cursor-pointer">{industry || "Add your industry"}</button>
          )}
        </div>
        <div>
          <p className="text-[12px] text-text-tertiary mb-1">Brand values</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {brandValues.map((v) => (
              <span key={v} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium bg-interactive-muted text-interactive border border-interactive/20">
                {v}
                <button onClick={() => removeBrandValue(v)} className="hover:text-destructive cursor-pointer"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newValue} onChange={(e) => setNewValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addBrandValue()} placeholder="Add a value (e.g., quality, reliability)" className="h-[32px] flex-1 px-3 rounded-[var(--radius-base)] border border-border-default bg-surface text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-interactive focus:outline-none focus:ring-1 focus:ring-interactive/20 transition-all" />
            <button onClick={addBrandValue} disabled={!newValue.trim()} className="h-[32px] px-3 text-[12px] font-semibold text-interactive hover:underline cursor-pointer disabled:opacity-30">Add</button>
          </div>
        </div>
      </div>
    </section>
  );
}

const LEVEL_LABELS: Record<AutonomyLevel, { label: string; description: string }> = {
  0: { label: "Always ask", description: "I want to approve every time" },
  1: { label: "Propose", description: "Show me what you'll do, I'll approve" },
  2: { label: "Do & notify", description: "Just do it and let me know" },
  3: { label: "Full auto", description: "Handle it, I trust you" },
};

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const autonomyPrefs = useStore((s) => s.autonomyPrefs);
  const setAutonomy = useStore((s) => s.setAutonomy);
  const brandValues = useStore((s) => s.brandValues);
  const industry = useStore((s) => s.industry);
  const actions = useStore((s) => s.actions);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const recentActions = actions.slice(0, 10);

  return (
    <div className="h-screen flex flex-col bg-surface-bg">
      <header className="flex-shrink-0 h-[52px] border-b border-border-subtle bg-surface flex items-center px-5 gap-3">
        <Link href="/" className="text-text-tertiary hover:text-text-primary transition-colors">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-[15px] font-semibold text-text-primary">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-10">
          <section>
            <h2 className="text-[17px] font-semibold text-text-primary mb-1">Agent autonomy</h2>
            <p className="text-[13px] text-text-secondary mb-5">
              Control how much your AI partner can do without asking. Start conservative and increase as you build trust.
            </p>

            <div className="space-y-4">
              {(Object.entries(ACTION_LABELS) as [ActionType, { label: string; description: string }][]).map(
                ([type, meta]) => (
                  <div
                    key={type}
                    className="bg-surface border border-border-subtle rounded-[var(--radius-base)] p-4 shadow-[var(--shadow-low)]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-[14px] font-medium text-text-primary">{meta.label}</p>
                        <p className="text-[12px] text-text-tertiary">{meta.description}</p>
                      </div>
                      <span className="text-[12px] font-semibold text-interactive">
                        {LEVEL_LABELS[autonomyPrefs[type]].label}
                      </span>
                    </div>

                    <div className="flex gap-1">
                      {([0, 1, 2, 3] as AutonomyLevel[]).map((level) => (
                        <button
                          key={level}
                          onClick={() => setAutonomy(type, level)}
                          className={`flex-1 py-1.5 rounded-[var(--radius-small)] text-[11px] font-semibold transition-colors cursor-pointer ${
                            autonomyPrefs[type] === level
                              ? "bg-interactive text-white shadow-[var(--shadow-low)]"
                              : "bg-surface-bg text-text-secondary hover:bg-surface-hover border border-transparent hover:border-border-subtle"
                          }`}
                          title={LEVEL_LABELS[level].description}
                        >
                          {LEVEL_LABELS[level].label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </section>

          <ProfileSection />

          <section>
            <h2 className="text-[17px] font-semibold text-text-primary mb-1">Action history</h2>
            <p className="text-[13px] text-text-secondary mb-4">Recent actions taken by your AI partner.</p>

            {recentActions.length === 0 ? (
              <p className="text-[13px] text-text-tertiary">No actions yet. Start a conversation to get going.</p>
            ) : (
              <div className="space-y-2">
                {recentActions.map((action) => (
                  <div
                    key={action.id}
                    className="bg-surface border border-border-subtle rounded-[var(--radius-base)] p-3 flex items-center justify-between shadow-[var(--shadow-low)]"
                  >
                    <div>
                      <p className="text-[13px] font-medium text-text-primary">{action.title}</p>
                      <p className="text-[11px] text-text-tertiary">
                        {new Date(action.timestamp).toLocaleDateString()} \u00b7 {action.description}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        action.status === "approved"
                          ? "bg-interactive-muted text-interactive"
                          : action.status === "rejected"
                          ? "bg-destructive-surface text-destructive"
                          : "bg-informative-surface text-informative"
                      }`}
                    >
                      {action.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
