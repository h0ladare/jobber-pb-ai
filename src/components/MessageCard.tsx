"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/formatCurrency";
import { useStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/store";
import type { MaterialItem, LaborInput } from "@/lib/mockData";

interface Props {
  message: ChatMessage;
  onApproveKit?: (removedServices: string[], removedMaterials: string[]) => void;
  onApproveService?: (data: Record<string, unknown>) => void;
  onOpenCatalog?: () => void;
  onHealthCheck?: () => void;
  onBuildQuote?: (clientName: string, serviceIds: string[]) => void;
  onEditService?: (data: Record<string, unknown>) => void;
  onDismissCard?: (id: string) => void;
  onOpenQuote?: (quoteId: string) => void;
}

export function MessageCard({ message, onApproveKit, onApproveService, onOpenCatalog, onHealthCheck, onBuildQuote, onEditService, onDismissCard, onOpenQuote }: Props) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-[var(--radius-large)] bg-[var(--jb-surface-reverse)] text-white px-4 py-2.5 text-[14px]">{message.content}</div>
      </div>
    );
  }

  if (message.cardType === "trust-calibration") return <TrustCalibrationCard data={message.cardData!} onApprove={onApproveKit} />;
  if (message.cardType === "service-preview") return <ServicePreviewCard data={message.cardData!} onApprove={onApproveService} onEdit={onEditService} onDismiss={() => onDismissCard?.(message.id)} />;
  if (message.cardType === "insight") return <InsightRequestCard onCheck={onHealthCheck} />;
  if (message.cardType === "quote-draft") return <QuoteDraftCard data={message.cardData!} onBuild={onBuildQuote} />;

  if (message.cardData?.action === "show-quotes") {
    return <QuoteHistoryCard onOpenQuote={onOpenQuote} />;
  }

  if (message.cardData?.action === "open-catalog") {
    const label = (message.cardData.actionLabel as string) || "Open catalog";
    return (
      <div className="flex gap-3 max-w-[85%]">
        <AgentAvatar />
        <div className="space-y-2">
          <div className="bg-surface border border-border-subtle rounded-[var(--radius-large)] px-4 py-2.5 text-[14px] text-text-primary shadow-[var(--shadow-low)]">{message.content}</div>
          <button onClick={onOpenCatalog} className="text-[13px] font-medium text-interactive hover:underline cursor-pointer">{label}</button>
        </div>
      </div>
    );
  }

  if (message.cardData?.action === "view-service") {
    const svcId = message.cardData.serviceId as string;
    const actionLabel = (message.cardData.actionLabel as string) || "View";
    return (
      <div className="flex gap-3 max-w-[85%]">
        <AgentAvatar />
        <div className="space-y-2">
          <div className="bg-surface border border-border-subtle rounded-[var(--radius-large)] px-4 py-2.5 text-[14px] text-text-primary shadow-[var(--shadow-low)]">{message.content}</div>
          <button onClick={() => onEditService?.({ id: svcId })} className="text-[13px] font-medium text-interactive hover:underline cursor-pointer">{actionLabel}</button>
        </div>
      </div>
    );
  }

  if (message.cardType === "status-update") {
    return (
      <div className="flex gap-3 max-w-[85%]">
        <AgentAvatar />
        <div className="bg-interactive-muted/50 border border-interactive/20 rounded-[var(--radius-large)] px-4 py-2.5 text-[14px] text-text-primary shadow-[var(--shadow-low)]">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-interactive flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 max-w-[85%]">
      <AgentAvatar />
      <div className="bg-surface border border-border-subtle rounded-[var(--radius-large)] px-4 py-2.5 text-[14px] text-text-primary shadow-[var(--shadow-low)]">{message.content}</div>
    </div>
  );
}

function AgentAvatar() {
  return (
    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-interactive flex items-center justify-center">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path fill="white" d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" /></svg>
    </div>
  );
}

/* ─── Trust Calibration (with real checkboxes) ─── */

function TrustCalibrationCard({ data, onApprove }: { data: Record<string, unknown>; onApprove?: (removedServices: string[], removedMaterials: string[]) => void }) {
  const services = data.services as string[];
  const materials = data.materials as string[];
  const laborRates = data.laborRates as string[];
  const packages = data.packages as string[];

  const [removedSvcs, setRemovedSvcs] = useState<Set<string>>(new Set());
  const [removedMats, setRemovedMats] = useState<Set<string>>(new Set());

  const toggleSvc = (name: string) => setRemovedSvcs((prev) => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  const toggleMat = (name: string) => setRemovedMats((prev) => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });

  const activeServices = services.length - removedSvcs.size;
  const activeMaterials = materials.length - removedMats.size;

  return (
    <div className="flex gap-3 max-w-[90%]">
      <AgentAvatar />
      <div className="flex-1 bg-surface border border-border-subtle rounded-[var(--radius-large)] p-5 shadow-[var(--shadow-base)]">
        <h3 className="text-[15px] font-semibold text-text-primary mb-1">Here&apos;s what I&apos;ll set up for you</h3>
        <p className="text-[13px] text-text-secondary mb-4">Uncheck anything you don&apos;t need. The rest gets added to your pricebook.</p>

        <div className="space-y-4">
          <CheckableSection label="Services" items={services} removed={removedSvcs} onToggle={toggleSvc} color="green" />
          <CheckableSection label="Materials" items={materials} removed={removedMats} onToggle={toggleMat} color="blue" />
          <Section label="Labor rates" count={laborRates.length} items={laborRates} color="amber" />
          {packages.length > 0 && <Section label="Packages" count={packages.length} items={packages} color="green" />}
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={() => onApprove?.(Array.from(removedSvcs), Array.from(removedMats))} className="flex-1 h-[44px] bg-interactive text-white text-[14px] font-bold rounded-[var(--radius-base)] hover:bg-interactive-hover transition-colors cursor-pointer shadow-[var(--shadow-base)]">
            Build My Pricebook ({activeServices} services, {activeMaterials} materials)
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckableSection({ label, items, removed, onToggle, color }: { label: string; items: string[]; removed: Set<string>; onToggle: (name: string) => void; color: "green" | "blue" | "amber" }) {
  const colorMap = { green: "bg-interactive-muted text-interactive border-interactive/20", blue: "bg-informative-surface text-informative border-informative/20", amber: "bg-warning-surface text-[var(--jb-warning-on-surface)] border-warning/20" };
  const uncheckedClass = "bg-surface-bg text-text-tertiary border-border-subtle line-through opacity-60";

  return (
    <div>
      <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">{label} ({items.length - removed.size}/{items.length})</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const isRemoved = removed.has(item);
          return (
            <button key={item} onClick={() => onToggle(item)} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium border cursor-pointer transition-all ${isRemoved ? uncheckedClass : colorMap[color]}`}>
              {!isRemoved && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Section({ label, count, items, color }: { label: string; count: number; items: string[]; color: "green" | "blue" | "amber" }) {
  const colorMap = { green: "bg-interactive-muted text-interactive border-interactive/20", blue: "bg-informative-surface text-informative border-informative/20", amber: "bg-warning-surface text-[var(--jb-warning-on-surface)] border-warning/20" };
  return (
    <div>
      <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">{label} ({count})</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => <span key={item} className={`inline-block px-2.5 py-1 rounded-full text-[12px] font-medium border ${colorMap[color]}`}>{item}</span>)}
      </div>
    </div>
  );
}

/* ─── Service Preview (Edit/Skip wired) ─── */

function ServicePreviewCard({ data, onApprove, onEdit, onDismiss }: { data: Record<string, unknown>; onApprove?: (data: Record<string, unknown>) => void; onEdit?: (data: Record<string, unknown>) => void; onDismiss?: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const name = data.name as string;
  const description = data.description as string;
  const materials = (data.materials || []) as MaterialItem[];
  const labor = (data.labor || []) as LaborInput[];
  const confidence = data.confidence as string;
  const basis = data.basis as string;

  const materialCost = materials.reduce((sum, m) => sum + m.unitCost * m.quantity, 0);
  const laborCost = labor.reduce((sum, l) => sum + l.hourlyRate * l.estimatedHours, 0);
  const total = materialCost + laborCost;

  return (
    <div className="flex gap-3 max-w-[90%]">
      <AgentAvatar />
      <div className="flex-1 bg-surface border border-border-subtle rounded-[var(--radius-large)] p-5 shadow-[var(--shadow-base)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-[15px] font-semibold text-text-primary">{name}</h3>
            <p className="text-[13px] text-text-secondary mt-0.5">{description}</p>
          </div>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${confidence === "high" ? "bg-interactive-muted text-interactive" : "bg-warning-surface text-[var(--jb-warning-on-surface)]"}`}>{confidence} confidence</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-surface-bg rounded-[var(--radius-small)] p-2.5 text-center"><p className="text-[11px] text-text-tertiary">Materials</p><p className="text-[15px] font-semibold text-text-primary">{formatCurrency(materialCost)}</p></div>
          <div className="bg-surface-bg rounded-[var(--radius-small)] p-2.5 text-center"><p className="text-[11px] text-text-tertiary">Labor</p><p className="text-[15px] font-semibold text-text-primary">{formatCurrency(laborCost)}</p></div>
          <div className="bg-surface-bg rounded-[var(--radius-small)] p-2.5 text-center"><p className="text-[11px] text-text-tertiary">Total cost</p><p className="text-[15px] font-semibold text-interactive">{formatCurrency(total)}</p></div>
        </div>
        <p className="text-[11px] text-text-tertiary mb-4">{basis}</p>
        <div className="flex gap-2">
          <button onClick={() => onApprove?.(data)} className="flex-1 h-[40px] bg-interactive text-white text-[13px] font-bold rounded-[var(--radius-base)] hover:bg-interactive-hover transition-colors cursor-pointer shadow-[var(--shadow-low)]">Add to Catalog</button>
          <button onClick={() => { onApprove?.(data); onEdit?.(data); }} className="px-4 h-[40px] text-[13px] font-semibold text-interactive border border-interactive/30 rounded-[var(--radius-base)] hover:bg-interactive-muted transition-colors cursor-pointer">Add and Edit</button>
          <button onClick={() => { setDismissed(true); onDismiss?.(); }} className="px-4 h-[40px] text-[13px] font-medium text-text-tertiary rounded-[var(--radius-base)] hover:bg-surface-hover transition-colors cursor-pointer">Skip</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Quote Draft Picker (with images and descriptions) ─── */

function QuoteDraftCard({ data, onBuild }: { data: Record<string, unknown>; onBuild?: (clientName: string, serviceIds: string[]) => void }) {
  const clientName = (data.clientName as string) || "Client";
  const availableServices = (data.availableServices as Array<{ id: string; name: string; price: number; imageUrl?: string; description?: string }>) || [];
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectedTotal = availableServices.filter((s) => selected.has(s.id)).reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="flex gap-3 max-w-[90%]">
      <AgentAvatar />
      <div className="flex-1 bg-surface border border-quote/20 rounded-[var(--radius-large)] p-5 shadow-[var(--shadow-base)]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-quote-surface text-quote">Quote</span>
          <h3 className="text-[15px] font-semibold text-text-primary">For {clientName}</h3>
        </div>
        <p className="text-[13px] text-text-secondary mb-3">Pick the services to include:</p>
        <div className="space-y-1.5 mb-4">
          {availableServices.map((svc) => (
            <button key={svc.id} onClick={() => toggle(svc.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-small)] text-left transition-all cursor-pointer border ${selected.has(svc.id) ? "bg-interactive-muted border-interactive/30" : "bg-surface-bg border-border-subtle hover:border-border-default"}`}>
              <div className={`w-4 h-4 rounded-[3px] border-2 flex items-center justify-center transition-colors flex-shrink-0 ${selected.has(svc.id) ? "bg-interactive border-interactive" : "border-border-default"}`}>
                {selected.has(svc.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
              {svc.imageUrl ? (
                <img src={svc.imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded bg-surface border border-border-subtle flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-text-tertiary"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-medium text-text-primary block truncate">{svc.name}</span>
                {svc.description && <span className="text-[11px] text-text-tertiary block truncate">{svc.description}</span>}
              </div>
              <span className="text-[13px] font-medium text-text-secondary flex-shrink-0">{formatCurrency(svc.price)}</span>
            </button>
          ))}
        </div>
        <button onClick={() => onBuild?.(clientName, Array.from(selected))} disabled={selected.size === 0} className="w-full h-[44px] bg-interactive text-white text-[14px] font-bold rounded-[var(--radius-base)] hover:bg-interactive-hover transition-colors cursor-pointer shadow-[var(--shadow-base)] disabled:opacity-30 disabled:cursor-not-allowed">
          Build Quote ({selected.size} service{selected.size !== 1 ? "s" : ""}{selected.size > 0 ? ` \u00B7 ${formatCurrency(selectedTotal)}` : ""})
        </button>
      </div>
    </div>
  );
}

/* ─── Quote History ─── */

function QuoteHistoryCard({ onOpenQuote }: { onOpenQuote?: (quoteId: string) => void }) {
  const savedQuotes = useStore((s) => s.savedQuotes);
  const activeQuote = useStore((s) => s.activeQuote);
  const allQuotes = [...(activeQuote ? [activeQuote] : []), ...savedQuotes.filter((q) => q.id !== activeQuote?.id)];

  if (allQuotes.length === 0) {
    return (
      <div className="flex gap-3 max-w-[85%]">
        <AgentAvatar />
        <div className="bg-surface border border-border-subtle rounded-[var(--radius-large)] px-4 py-2.5 text-[14px] text-text-primary shadow-[var(--shadow-low)]">No quotes yet. Ask me to build one.</div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 max-w-[90%]">
      <AgentAvatar />
      <div className="flex-1 bg-surface border border-border-subtle rounded-[var(--radius-large)] p-4 shadow-[var(--shadow-base)]">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Recent quotes ({allQuotes.length})</p>
        <div className="space-y-1.5">
          {allQuotes.slice(0, 5).map((q) => {
            const total = q.items.reduce((sum, li) => sum + li.adjustedPrice * li.quantity, 0);
            const statusColors: Record<string, string> = { draft: "bg-quote-surface text-quote", sent: "bg-interactive-muted text-interactive", approved: "bg-interactive-muted text-interactive", declined: "bg-destructive/10 text-destructive", "changes-requested": "bg-warning-surface text-[var(--jb-warning-on-surface)]" };
            return (
              <button key={q.id} onClick={() => onOpenQuote?.(q.id)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-[var(--radius-small)] bg-surface-bg border border-border-subtle hover:border-border-default transition-colors cursor-pointer text-left">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-text-primary truncate">{q.clientName}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColors[q.status] || "bg-surface-bg text-text-tertiary"}`}>{q.status}</span>
                  </div>
                  <span className="text-[11px] text-text-tertiary">{q.quoteNumber} &middot; {q.items.length} item{q.items.length !== 1 ? "s" : ""}</span>
                </div>
                <span className="text-[13px] font-semibold text-text-primary flex-shrink-0">{formatCurrency(total)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Insight / Health Check ─── */

function InsightRequestCard({ onCheck }: { onCheck?: () => void }) {
  return (
    <div className="flex gap-3 max-w-[90%]">
      <AgentAvatar />
      <div className="flex-1 bg-surface border border-border-subtle rounded-[var(--radius-large)] p-5 shadow-[var(--shadow-base)]">
        <h3 className="text-[15px] font-semibold text-text-primary mb-1">Pricebook health check</h3>
        <p className="text-[13px] text-text-secondary mb-3">I&apos;ll check your catalog for margin issues, missing cost data, and pricing opportunities.</p>
        <button onClick={onCheck} className="h-[40px] px-[var(--space-large)] bg-interactive text-white text-[13px] font-bold rounded-[var(--radius-base)] hover:bg-interactive-hover transition-colors cursor-pointer shadow-[var(--shadow-low)]">Run Health Check</button>
      </div>
    </div>
  );
}
