"use client";

import { useState } from "react";
import { useStore, type BookHealthIssue } from "@/lib/store";
import { formatCurrency } from "@/lib/formatCurrency";
import { calcServiceTotals } from "@/lib/mockData";
import { getAreaAverage, suggestGBBTiers } from "@/lib/aiSuggestions";

const DISMISS_REASONS = [
  "I already handle this differently",
  "Not relevant to my business",
  "I'll get to it later",
  "This recommendation is wrong",
];

interface FeedCard {
  id: string;
  type: "health" | "opportunity" | "area-alert" | "gbb" | "welcome-back" | "milestone";
  priority: "high" | "medium" | "low";
  severity: "warning" | "opportunity" | "info" | "success";
  icon: string;
  title: string;
  message: string;
  impact?: string;
  action?: string;
  relatedIds?: string[];
  data?: Record<string, unknown>;
}

export function ActionFeed() {
  const services = useStore((s) => s.services);
  const materials = useStore((s) => s.materials);
  const getBookHealth = useStore((s) => s.getBookHealth);
  const setContextPanel = useStore((s) => s.setContextPanel);
  const addMessage = useStore((s) => s.addMessage);
  const updateService = useStore((s) => s.updateService);
  const proposeAction = useStore((s) => s.proposeAction);
  const approveAction = useStore((s) => s.approveAction);

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const cards = buildFeedCards(services, materials, getBookHealth);
  const visible = cards.filter((c) => !dismissed.has(c.id));

  const highPriority = visible.filter((c) => c.priority === "high");
  const medPriority = visible.filter((c) => c.priority === "medium");
  const lowPriority = visible.filter((c) => c.priority === "low");

  const handleDismiss = (id: string, _reason: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    setDismissingId(null);
  };

  const handleAction = (card: FeedCard) => {
    if (card.type === "gbb" && card.relatedIds?.length) {
      setContextPanel({ type: "service-detail", data: { id: card.relatedIds[0] } });
      addMessage({ role: "agent", content: `Opened ${card.title.replace("Add Good/Better/Best to ", "")} for tier setup. Adjust materials and markup to create pricing tiers.`, cardType: "status-update" });
    } else if (card.id.includes("unused-material")) {
      setContextPanel({ type: "catalog" });
      addMessage({ role: "agent", content: "Opened your catalog. Check the Materials tab to see which materials need linking to services.", cardType: "status-update" });
    } else if (card.type === "health" && card.relatedIds?.length) {
      if (card.id.includes("low-margin")) {
        const svc = services.find((s) => s.id === card.relatedIds![0]);
        if (svc) {
          const newMarkup = Math.max(svc.markupRule.value + 15, 25);
          updateService(svc.id, { markupRule: { type: "percentage", value: newMarkup } });
          const actionId = proposeAction({ type: "adjust-margins", title: `Raised margin on ${svc.name}`, description: `Markup increased to ${newMarkup}%`, impact: `+${newMarkup - svc.markupRule.value}%` });
          approveAction(actionId);
          addMessage({ role: "agent", content: `Raised markup on "${svc.name}" to ${newMarkup}%. Price updated automatically.`, cardType: "status-update" });
          setDismissed((prev) => new Set(prev).add(card.id));
        }
      } else {
        setContextPanel({ type: "service-detail", data: { id: card.relatedIds[0] } });
      }
    } else if (card.relatedIds?.length) {
      setContextPanel({ type: "service-detail", data: { id: card.relatedIds[0] } });
    } else {
      setContextPanel({ type: "catalog" });
    }
  };

  if (visible.length === 0) {
    return (
      <div className="px-5 py-6">
        <div className="bg-interactive-muted/50 border border-interactive/15 rounded-[var(--radius-large)] p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-interactive/10 flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-interactive"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <p className="text-[14px] font-medium text-text-primary mb-1">You&apos;re all caught up</p>
          <p className="text-[13px] text-text-secondary">No actions needed right now. I&apos;ll surface things as they come up.</p>
        </div>
      </div>
    );
  }

  // Build the greeting
  const costed = services.filter((s) => s.priceMode === "calculated" && (s.materials.length > 0 || s.labor.length > 0));
  const avgMargin = costed.length > 0
    ? Math.round(costed.reduce((sum, svc) => { const t = calcServiceTotals(svc); return sum + (svc.unitPrice > 0 ? ((svc.unitPrice - t.rawCost) / svc.unitPrice) * 100 : 0); }, 0) / costed.length)
    : 0;
  const totalRevenue = services.reduce((s, svc) => s + svc.unitPrice, 0);

  return (
    <div className="px-5 py-5 space-y-5">
      {/* ─── Status bar: at-a-glance numbers ─── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-4 bg-surface rounded-[var(--radius-base)] border border-border-subtle px-4 py-2.5 shadow-[var(--shadow-low)] flex-1">
          <Metric label="Services" value={String(services.length)} />
          <div className="w-px h-5 bg-border-subtle" />
          <Metric label="Revenue" value={formatCurrency(totalRevenue)} />
          <div className="w-px h-5 bg-border-subtle" />
          <Metric label="Avg margin" value={`${avgMargin}%`} color={avgMargin >= 30 ? "green" : avgMargin >= 15 ? "amber" : "red"} />
        </div>
      </div>

      {/* ─── Needs attention (high priority) ─── */}
      {highPriority.length > 0 && (
        <section>
          <SectionLabel label="Needs attention" count={highPriority.length} variant="warning" />
          <div className="space-y-2">
            {highPriority.map((card) => (
              <HighPriorityCard key={card.id} card={card} onAction={handleAction} onDismiss={handleDismiss} dismissingId={dismissingId} setDismissingId={setDismissingId} />
            ))}
          </div>
        </section>
      )}

      {/* ─── Opportunities (medium priority) ─── */}
      {medPriority.length > 0 && (
        <section>
          <SectionLabel label="Opportunities" count={medPriority.length} variant="opportunity" />
          <div className="space-y-2">
            {medPriority.map((card) => (
              <OpportunityCard key={card.id} card={card} onAction={handleAction} onDismiss={handleDismiss} dismissingId={dismissingId} setDismissingId={setDismissingId} />
            ))}
          </div>
        </section>
      )}

      {/* ─── Good to know (low priority) ─── */}
      {lowPriority.length > 0 && (
        <section>
          <SectionLabel label="Good to know" count={lowPriority.length} variant="info" />
          <div className="space-y-1.5">
            {lowPriority.map((card) => (
              <LowPriorityCard key={card.id} card={card} onAction={handleAction} onDismiss={() => setDismissed((prev) => new Set(prev).add(card.id))} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── Metric pill ─── */

function Metric({ label, value, color }: { label: string; value: string; color?: "green" | "amber" | "red" }) {
  const colorClass = color ? { green: "text-interactive", amber: "text-[var(--jb-warning-on-surface)]", red: "text-destructive" }[color] : "text-text-primary";
  return (
    <div className="text-center min-w-0">
      <p className={`text-[15px] font-bold leading-tight ${colorClass}`}>{value}</p>
      <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">{label}</p>
    </div>
  );
}

/* ─── Section label ─── */

function SectionLabel({ label, count, variant }: { label: string; count: number; variant: "warning" | "opportunity" | "info" }) {
  const dotColor = { warning: "bg-destructive", opportunity: "bg-interactive", info: "bg-text-tertiary" }[variant];
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">{label}</p>
      <span className="text-[11px] text-text-tertiary">({count})</span>
    </div>
  );
}

/* ─── High priority: colored left border, prominent ─── */

function HighPriorityCard({ card, onAction, onDismiss, dismissingId, setDismissingId }: { card: FeedCard; onAction: (c: FeedCard) => void; onDismiss: (id: string, reason: string) => void; dismissingId: string | null; setDismissingId: (id: string | null) => void }) {
  const isDismissing = dismissingId === card.id;
  const borderColor = card.severity === "warning" ? "border-l-destructive" : "border-l-[var(--jb-warning)]";

  if (isDismissing) return <DismissPanel id={card.id} onDismiss={onDismiss} onCancel={() => setDismissingId(null)} />;

  return (
    <div className={`bg-surface border border-border-subtle border-l-[3px] ${borderColor} rounded-[var(--radius-base)] p-4 shadow-[var(--shadow-low)] transition-all hover:shadow-[var(--shadow-base)]`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive-surface flex items-center justify-center text-[16px]">{card.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-[14px] font-semibold text-text-primary leading-snug">{card.title}</h4>
            {card.impact && <span className="flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-destructive-surface text-destructive">{card.impact}</span>}
          </div>
          <p className="text-[13px] text-text-secondary leading-relaxed">{card.message}</p>
          <div className="flex items-center gap-2 mt-3">
            {card.action && <button onClick={() => onAction(card)} className="h-[32px] px-4 text-[13px] font-bold bg-interactive text-white rounded-[var(--radius-small)] hover:bg-interactive-hover transition-colors cursor-pointer shadow-[var(--shadow-low)]">{card.action}</button>}
            <button onClick={() => setDismissingId(card.id)} className="text-[12px] text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer">Not now</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Medium priority: clean card, balanced ─── */

function OpportunityCard({ card, onAction, onDismiss, dismissingId, setDismissingId }: { card: FeedCard; onAction: (c: FeedCard) => void; onDismiss: (id: string, reason: string) => void; dismissingId: string | null; setDismissingId: (id: string | null) => void }) {
  const isDismissing = dismissingId === card.id;

  if (isDismissing) return <DismissPanel id={card.id} onDismiss={onDismiss} onCancel={() => setDismissingId(null)} />;

  return (
    <div className="bg-surface border border-border-subtle rounded-[var(--radius-base)] p-4 shadow-[var(--shadow-low)] transition-all hover:shadow-[var(--shadow-base)] hover:border-interactive/20">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-informative-surface flex items-center justify-center text-[16px]">{card.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-[14px] font-medium text-text-primary leading-snug">{card.title}</h4>
            {card.impact && <span className="flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-interactive-muted text-interactive">{card.impact}</span>}
          </div>
          <p className="text-[13px] text-text-secondary leading-relaxed">{card.message}</p>
          <div className="flex items-center gap-2 mt-3">
            {card.action && <button onClick={() => onAction(card)} className="h-[30px] px-3 text-[12px] font-bold text-interactive border border-interactive/30 rounded-[var(--radius-small)] hover:bg-interactive-muted transition-colors cursor-pointer">{card.action}</button>}
            <button onClick={() => setDismissingId(card.id)} className="text-[12px] text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer">Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Low priority: compact, minimal ─── */

function LowPriorityCard({ card, onAction, onDismiss }: { card: FeedCard; onAction: (c: FeedCard) => void; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-surface-bg rounded-[var(--radius-small)] px-3 py-2.5 border border-transparent hover:border-border-subtle transition-all group">
      <span className="text-[14px] flex-shrink-0">{card.icon}</span>
      <p className="flex-1 text-[13px] text-text-secondary min-w-0 truncate"><span className="font-medium text-text-primary">{card.title}</span></p>
      {card.action && <button onClick={() => onAction(card)} className="flex-shrink-0 text-[12px] font-semibold text-interactive hover:underline cursor-pointer">{card.action}</button>}
      <button onClick={onDismiss} className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-text-secondary cursor-pointer transition-all"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
    </div>
  );
}

/* ─── Shared dismiss panel ─── */

function DismissPanel({ id, onDismiss, onCancel }: { id: string; onDismiss: (id: string, reason: string) => void; onCancel: () => void }) {
  return (
    <div className="bg-surface border border-border-subtle rounded-[var(--radius-base)] p-4 shadow-[var(--shadow-low)]">
      <p className="text-[13px] font-medium text-text-primary mb-3">Tell me why you're skipping this</p>
      <div className="space-y-1.5 mb-3">
        {DISMISS_REASONS.map((reason) => <button key={reason} onClick={() => onDismiss(id, reason)} className="w-full text-left px-3 py-2 rounded-[var(--radius-small)] text-[13px] text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer">{reason}</button>)}
      </div>
      <button onClick={onCancel} className="text-[12px] text-text-tertiary hover:text-text-primary cursor-pointer">Cancel</button>
    </div>
  );
}

/* ─── Card builder ─── */

function buildFeedCards(
  services: ReturnType<typeof useStore.getState>["services"],
  materials: ReturnType<typeof useStore.getState>["materials"],
  getBookHealth: () => BookHealthIssue[]
): FeedCard[] {
  const cards: FeedCard[] = [];

  // Health issues -> high priority
  const health = getBookHealth();
  for (const issue of health) {
    cards.push({
      id: `health-${issue.type}-${issue.relatedIds?.join("-") || "all"}`,
      type: "health",
      priority: issue.severity === "warning" ? "high" : "medium",
      severity: issue.severity,
      icon: issue.severity === "warning" ? "⚠️" : issue.severity === "opportunity" ? "💡" : "ℹ️",
      title: issue.title,
      message: issue.message,
      impact: issue.impact,
      action: issue.action,
      relatedIds: issue.relatedIds,
    });
  }

  // GBB opportunities -> medium priority
  const costedWithoutTiers = services.filter(
    (s) => s.priceMode === "calculated" && s.materials.length >= 2 && !s.gbbEnabled && !s.optionTiers?.length
  );
  if (costedWithoutTiers.length > 0) {
    const svc = costedWithoutTiers[0];
    const gbb = suggestGBBTiers(svc.name, svc.unitPrice);
    if (gbb) {
      const uplift = Math.round(svc.unitPrice * (gbb.tiers[2].priceMultiplier - 1));
      cards.push({
        id: `gbb-${svc.id}`,
        type: "gbb",
        priority: "medium",
        severity: "opportunity",
        icon: "🏷️",
        title: `Add Good/Better/Best to ${svc.name}`,
        message: `Tiered quotes see up to 285% higher ticket sizes. I can set up three tiers based on ${gbb.basis.toLowerCase()}.`,
        impact: `+${formatCurrency(uplift)}`,
        action: "Set up tiers",
        relatedIds: [svc.id],
        data: { gbb },
      });
    }
  }

  // Area pricing alerts -> medium priority
  for (const svc of services) {
    const area = getAreaAverage(svc.name, svc.unitPrice);
    if (area && svc.unitPrice > area.high) {
      cards.push({
        id: `area-high-${svc.id}`,
        type: "area-alert",
        priority: "medium",
        severity: "info",
        icon: "📍",
        title: `${svc.name} above area average`,
        message: `You: ${formatCurrency(svc.unitPrice)} vs area ${formatCurrency(area.low)}\u2013${formatCurrency(area.high)}. Premium positioning. Make sure your proposals communicate the value.`,
        action: "Review",
        relatedIds: [svc.id],
      });
    }
  }

  // Milestone -> low priority
  if (services.length >= 5 && materials.length >= 10) {
    cards.push({
      id: "milestone-catalog",
      type: "milestone",
      priority: "low",
      severity: "success",
      icon: "🎯",
      title: `${services.length} services, ${materials.length} materials. Your pricebook is in good shape`,
      message: "",
      action: "View catalog",
    });
  }

  return cards;
}
