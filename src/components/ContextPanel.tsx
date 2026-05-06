"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/formatCurrency";
import { calcServiceTotals } from "@/lib/mockData";
import { QuoteWorkspace } from "./QuoteWorkspace";

export function ContextPanel() {
  const contextPanel = useStore((s) => s.contextPanel);
  const setContextPanel = useStore((s) => s.setContextPanel);
  const activeQuote = useStore((s) => s.activeQuote);

  if (contextPanel?.type === "quote-workspace" || (activeQuote && contextPanel?.type === "quote-preview"))
    return <QuoteWorkspace onClose={() => setContextPanel(null)} />;

  if (!contextPanel) return <EmptyContext />;

  if (contextPanel.type === "catalog")
    return <CatalogContext onClose={() => setContextPanel(null)} />;

  if (contextPanel.type === "service-detail")
    return <ServiceDetailContext serviceId={contextPanel.data?.id as string} onClose={() => setContextPanel(null)} />;

  return <EmptyContext />;
}

/* ─── Empty / Snapshot ─── */

function EmptyContext() {
  const setupComplete = useStore((s) => s.setupComplete);
  const services = useStore((s) => s.services);
  const materials = useStore((s) => s.materials);
  const laborRates = useStore((s) => s.laborRates);
  const packages = useStore((s) => s.packages);
  const industry = useStore((s) => s.industry);
  const setContextPanel = useStore((s) => s.setContextPanel);

  if (!setupComplete) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8">
        <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center mb-4">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-text-tertiary">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
          </svg>
        </div>
        <h3 className="text-[15px] font-medium text-text-primary mb-1">Getting started</h3>
        <p className="text-[13px] text-text-secondary max-w-[240px]">
          Tell me about your business in the chat and I&apos;ll build your pricebook. Preview will appear here.
        </p>
      </div>
    );
  }

  const costed = services.filter((s) => s.priceMode === "calculated" && (s.materials.length > 0 || s.labor.length > 0));
  const totalRevenue = services.reduce((s, svc) => s + svc.unitPrice, 0);
  const avgMargin = costed.length > 0
    ? Math.round(costed.reduce((sum, svc) => {
        const t = calcServiceTotals(svc);
        return sum + (svc.unitPrice > 0 ? ((svc.unitPrice - t.rawCost) / svc.unitPrice) * 100 : 0);
      }, 0) / costed.length)
    : 0;
  const categories = [...new Set(services.map((s) => s.category).filter(Boolean))];

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-4 border-b border-border-subtle">
        <h2 className="text-[15px] font-semibold text-text-primary">{industry || "Your"} pricebook</h2>
        <p className="text-[12px] text-text-secondary mt-0.5">Snapshot</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-2.5">
          <QuickStat label="Services" value={String(services.length)} />
          <QuickStat label="Materials" value={String(materials.length)} />
          <QuickStat label="Labor rates" value={String(laborRates.length)} />
          <QuickStat label="Packages" value={String(packages.length)} />
        </div>
        <div className="bg-surface-bg rounded-[var(--radius-base)] p-4 border border-border-subtle">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-3">Revenue per catalog</p>
          <p className="text-[22px] font-bold text-text-primary">{formatCurrency(totalRevenue)}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 bg-border-subtle rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${avgMargin >= 30 ? "bg-interactive" : avgMargin >= 15 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${Math.min(avgMargin, 100)}%` }} />
            </div>
            <span className={`text-[12px] font-semibold ${avgMargin >= 30 ? "text-interactive" : avgMargin >= 15 ? "text-[var(--jb-warning-on-surface)]" : "text-destructive"}`}>{avgMargin}% avg margin</span>
          </div>
        </div>
        {categories.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Categories</p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const count = services.filter((s) => s.category === cat).length;
                return <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium bg-surface-hover text-text-secondary border border-border-subtle">{cat} <span className="text-text-tertiary">({count})</span></span>;
              })}
            </div>
          </div>
        )}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Top services</p>
            <button onClick={() => setContextPanel({ type: "catalog" })} className="text-[11px] font-semibold text-interactive hover:underline cursor-pointer">View all</button>
          </div>
          <div className="space-y-1">
            {services.slice().sort((a, b) => b.unitPrice - a.unitPrice).slice(0, 5).map((svc) => {
              const t = calcServiceTotals(svc);
              const margin = svc.unitPrice > 0 ? Math.round(((svc.unitPrice - t.rawCost) / svc.unitPrice) * 100) : 0;
              return (
                <button key={svc.id} onClick={() => setContextPanel({ type: "service-detail", data: { id: svc.id } })} className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-small)] hover:bg-surface-hover transition-colors cursor-pointer text-left">
                  <span className="text-[13px] text-text-primary truncate pr-2">{svc.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[13px] font-medium text-text-primary">{formatCurrency(svc.unitPrice)}</span>
                    {svc.priceMode === "calculated" && <span className={`text-[11px] font-semibold ${margin >= 30 ? "text-interactive" : margin >= 15 ? "text-[var(--jb-warning-on-surface)]" : "text-destructive"}`}>{margin}%</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-bg rounded-[var(--radius-small)] px-3 py-2.5 text-center border border-border-subtle">
      <p className="text-[20px] font-bold text-text-primary">{value}</p>
      <p className="text-[11px] text-text-tertiary">{label}</p>
    </div>
  );
}

/* ─── Catalog List ─── */

function CatalogContext({ onClose }: { onClose: () => void }) {
  const services = useStore((s) => s.services);
  const setContextPanel = useStore((s) => s.setContextPanel);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <h2 className="text-[15px] font-semibold text-text-primary">Catalog ({services.length})</h2>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {services.length === 0 ? (
          <div className="p-5 text-center text-[13px] text-text-tertiary">No services yet. Start a conversation to build your catalog.</div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {services.map((svc) => {
              const totals = calcServiceTotals(svc);
              const margin = svc.unitPrice > 0 ? Math.round(((svc.unitPrice - totals.rawCost) / svc.unitPrice) * 100) : 0;
              return (
                <button key={svc.id} onClick={() => setContextPanel({ type: "service-detail", data: { id: svc.id } })} className="w-full text-left px-5 py-3.5 hover:bg-[var(--jb-informative-surface)]/30 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-text-primary truncate">{svc.name}</p>
                      <p className="text-[12px] text-text-tertiary mt-0.5">{svc.materials.length} materials, {svc.labor.length} labor</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-[14px] font-semibold text-text-primary">{formatCurrency(svc.unitPrice)}</p>
                      {svc.priceMode === "calculated" && <p className={`text-[11px] font-semibold ${margin >= 30 ? "text-interactive" : margin >= 15 ? "text-[var(--jb-warning-on-surface)]" : "text-destructive"}`}>{margin}% margin</p>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Service Detail (with add material/labor) ─── */

function ServiceDetailContext({ serviceId, onClose }: { serviceId: string; onClose: () => void }) {
  const services = useStore((s) => s.services);
  const updateService = useStore((s) => s.updateService);
  const deleteService = useStore((s) => s.deleteService);
  const proposeAction = useStore((s) => s.proposeAction);
  const approveAction = useStore((s) => s.approveAction);
  const svc = services.find((s) => s.id === serviceId);

  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [addingLabor, setAddingLabor] = useState(false);
  const [newMatName, setNewMatName] = useState("");
  const [newMatCost, setNewMatCost] = useState("");
  const [newMatQty, setNewMatQty] = useState("1");
  const [newLabDesc, setNewLabDesc] = useState("");
  const [newLabRate, setNewLabRate] = useState("");
  const [newLabHours, setNewLabHours] = useState("1");

  if (!svc) {
    return (
      <div className="p-5 text-[13px] text-text-tertiary">
        Service not found. <button onClick={onClose} className="text-interactive cursor-pointer">Go back</button>
      </div>
    );
  }

  const totals = calcServiceTotals(svc);
  const margin = svc.unitPrice > 0 ? Math.round(((svc.unitPrice - totals.rawCost) / svc.unitPrice) * 100) : 0;

  const startEdit = (field: string, val: string) => { setEditing(field); setEditValue(val); };

  const saveEdit = () => {
    if (!editing) return;
    if (editing === "name") updateService(svc.id, { name: editValue });
    else if (editing === "description") updateService(svc.id, { description: editValue });
    else if (editing === "category") updateService(svc.id, { category: editValue });
    else if (editing === "markup") updateService(svc.id, { markupRule: { type: "percentage", value: parseFloat(editValue) || 0 } });
    else if (editing.startsWith("mat-cost-")) {
      const matId = editing.replace("mat-cost-", "");
      updateService(svc.id, { materials: svc.materials.map((m) => m.id === matId ? { ...m, unitCost: parseFloat(editValue) || 0 } : m) });
    } else if (editing.startsWith("mat-qty-")) {
      const matId = editing.replace("mat-qty-", "");
      updateService(svc.id, { materials: svc.materials.map((m) => m.id === matId ? { ...m, quantity: parseFloat(editValue) || 1 } : m) });
    } else if (editing.startsWith("mat-markup-")) {
      const matId = editing.replace("mat-markup-", "");
      updateService(svc.id, { materials: svc.materials.map((m) => m.id === matId ? { ...m, markup: { type: "percentage" as const, value: parseFloat(editValue) || 0 } } : m) });
    } else if (editing.startsWith("labor-rate-")) {
      const labId = editing.replace("labor-rate-", "");
      updateService(svc.id, { labor: svc.labor.map((l) => l.id === labId ? { ...l, hourlyRate: parseFloat(editValue) || 0 } : l) });
    } else if (editing.startsWith("labor-hours-")) {
      const labId = editing.replace("labor-hours-", "");
      updateService(svc.id, { labor: svc.labor.map((l) => l.id === labId ? { ...l, estimatedHours: parseFloat(editValue) || 0 } : l) });
    }
    const actionId = proposeAction({ type: "update-pricing", title: `Updated ${svc.name}`, description: `Changed ${editing.split("-")[0]} field` });
    approveAction(actionId);
    setEditing(null);
  };

  const addMaterial = () => {
    if (!newMatName.trim()) return;
    const newMat = { id: `m-${Date.now()}`, name: newMatName.trim(), unitCost: parseFloat(newMatCost) || 0, quantity: parseFloat(newMatQty) || 1, unitType: "each", markup: { type: "percentage" as const, value: 20 } };
    updateService(svc.id, { materials: [...svc.materials, newMat] });
    setAddingMaterial(false);
    setNewMatName(""); setNewMatCost(""); setNewMatQty("1");
  };

  const addLabor = () => {
    if (!newLabDesc.trim()) return;
    const newLab = { id: `l-${Date.now()}`, description: newLabDesc.trim(), hourlyRate: parseFloat(newLabRate) || 0, estimatedHours: parseFloat(newLabHours) || 1, costRate: 0 };
    updateService(svc.id, { labor: [...svc.labor, newLab] });
    setAddingLabor(false);
    setNewLabDesc(""); setNewLabRate(""); setNewLabHours("1");
  };

  const removeMaterial = (matId: string) => updateService(svc.id, { materials: svc.materials.filter((m) => m.id !== matId) });
  const removeLabor = (labId: string) => updateService(svc.id, { labor: svc.labor.filter((l) => l.id !== labId) });
  const handleDelete = () => { deleteService(svc.id); onClose(); };

  const inputClass = "h-[32px] px-2 rounded-[var(--radius-small)] border border-border-default bg-surface text-[13px] text-text-primary focus:border-interactive focus:outline-none focus:ring-1 focus:ring-interactive/20 transition-all";

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          {editing === "name" ? (
            <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className="text-[15px] font-semibold text-text-primary bg-transparent border-b-2 border-focus outline-none w-full" />
          ) : (
            <h2 onClick={() => startEdit("name", svc.name)} className="text-[15px] font-semibold text-text-primary cursor-pointer hover:text-interactive transition-colors" >{svc.name}</h2>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div>
          {editing === "description" ? (
            <textarea autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} rows={2} className="w-full text-[13px] text-text-secondary bg-surface-bg border border-focus rounded-[var(--radius-small)] px-3 py-2 outline-none resize-none" />
          ) : (
            <p onClick={() => startEdit("description", svc.description || "")} className="text-[13px] text-text-secondary cursor-pointer hover:text-text-primary transition-colors min-h-[20px]" >{svc.description || "Add a description..."}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-tertiary">Category:</span>
          {editing === "category" ? (
            <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className="text-[12px] font-medium bg-transparent border-b border-focus outline-none" />
          ) : (
            <button onClick={() => startEdit("category", svc.category || "")} className="text-[12px] font-medium text-text-secondary hover:text-interactive transition-colors cursor-pointer">{svc.category || "Uncategorized"}</button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Price" value={formatCurrency(svc.unitPrice)} sub={svc.priceMode === "calculated" ? "auto-calculated" : "manual"} />
          <StatCard label="Margin" value={`${margin}%`} sub={margin >= 30 ? "healthy" : margin >= 15 ? "below target" : "at risk"} color={margin >= 30 ? "green" : margin >= 15 ? "amber" : "red"} />
        </div>

        <div className="flex items-center justify-between bg-surface-bg rounded-[var(--radius-small)] px-3 py-2 border border-border-subtle">
          <span className="text-[12px] text-text-secondary">Service markup</span>
          {editing === "markup" ? (
            <div className="flex items-center gap-1">
              <input autoFocus type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className="w-16 text-right text-[13px] font-medium bg-transparent border-b border-focus outline-none" />
              <span className="text-[12px] text-text-tertiary">%</span>
            </div>
          ) : (
            <button onClick={() => startEdit("markup", String(svc.markupRule.value))} className="text-[13px] font-medium text-text-primary hover:text-interactive transition-colors cursor-pointer">{svc.markupRule.value}%</button>
          )}
        </div>

        {/* Materials */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Materials ({svc.materials.length})</h4>
            <button onClick={() => setAddingMaterial(true)} className="text-[11px] font-semibold text-interactive hover:underline cursor-pointer">+ Add</button>
          </div>
          <div className="space-y-1">
            {svc.materials.map((m) => (
              <div key={m.id} className="group flex items-center gap-2 text-[13px] py-2 px-3 bg-surface-bg rounded-[var(--radius-small)] hover:bg-[var(--jb-informative-surface)]/30 transition-colors border border-transparent hover:border-border-subtle">
                <span className="flex-1 text-text-primary truncate">{m.name}</span>
                {editing === `mat-cost-${m.id}` ? <input autoFocus type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className="w-16 text-right text-[12px] bg-transparent border-b border-focus outline-none" /> : <button onClick={() => startEdit(`mat-cost-${m.id}`, String(m.unitCost))} className="text-[12px] text-text-secondary hover:text-interactive cursor-pointer">{formatCurrency(m.unitCost)}</button>}
                <span className="text-text-tertiary">x</span>
                {editing === `mat-qty-${m.id}` ? <input autoFocus type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className="w-10 text-right text-[12px] bg-transparent border-b border-focus outline-none" /> : <button onClick={() => startEdit(`mat-qty-${m.id}`, String(m.quantity))} className="text-[12px] text-text-secondary hover:text-interactive cursor-pointer">{m.quantity}</button>}
                {editing === `mat-markup-${m.id}` ? <div className="flex items-center gap-0.5"><input autoFocus type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className="w-10 text-right text-[12px] bg-transparent border-b border-focus outline-none" /><span className="text-[10px] text-text-tertiary">%</span></div> : <button onClick={() => startEdit(`mat-markup-${m.id}`, String(m.markup.value))} className="text-[11px] text-text-tertiary hover:text-interactive cursor-pointer">+{m.markup.value}%</button>}
                <button onClick={() => removeMaterial(m.id)} className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-destructive transition-all cursor-pointer"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            ))}
            {addingMaterial && (
              <div className="bg-surface-bg rounded-[var(--radius-small)] p-3 border border-interactive/30 space-y-2">
                <input value={newMatName} onChange={(e) => setNewMatName(e.target.value)} placeholder="Material name" className={`${inputClass} w-full`} autoFocus />
                <div className="flex gap-2">
                  <input value={newMatCost} onChange={(e) => setNewMatCost(e.target.value)} placeholder="Cost" type="number" className={`${inputClass} flex-1`} />
                  <input value={newMatQty} onChange={(e) => setNewMatQty(e.target.value)} placeholder="Qty" type="number" className={`${inputClass} w-16`} />
                </div>
                <div className="flex gap-2">
                  <button onClick={addMaterial} disabled={!newMatName.trim()} className="h-[32px] px-3 bg-interactive text-white text-[12px] font-bold rounded-[var(--radius-small)] hover:bg-interactive-hover transition-colors cursor-pointer disabled:opacity-30">Add</button>
                  <button onClick={() => setAddingMaterial(false)} className="h-[32px] px-3 text-[12px] text-text-tertiary hover:text-text-primary cursor-pointer">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Labor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Labor ({svc.labor.length})</h4>
            <button onClick={() => setAddingLabor(true)} className="text-[11px] font-semibold text-interactive hover:underline cursor-pointer">+ Add</button>
          </div>
          <div className="space-y-1">
            {svc.labor.map((l) => (
              <div key={l.id} className="group flex items-center gap-2 text-[13px] py-2 px-3 bg-surface-bg rounded-[var(--radius-small)] hover:bg-[var(--jb-informative-surface)]/30 transition-colors border border-transparent hover:border-border-subtle">
                <span className="flex-1 text-text-primary truncate">{l.description}</span>
                {editing === `labor-rate-${l.id}` ? <div className="flex items-center gap-0.5"><span className="text-[12px] text-text-tertiary">$</span><input autoFocus type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className="w-14 text-right text-[12px] bg-transparent border-b border-focus outline-none" /><span className="text-[11px] text-text-tertiary">/hr</span></div> : <button onClick={() => startEdit(`labor-rate-${l.id}`, String(l.hourlyRate))} className="text-[12px] text-text-secondary hover:text-interactive cursor-pointer">{formatCurrency(l.hourlyRate)}/hr</button>}
                <span className="text-text-tertiary">x</span>
                {editing === `labor-hours-${l.id}` ? <div className="flex items-center gap-0.5"><input autoFocus type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className="w-10 text-right text-[12px] bg-transparent border-b border-focus outline-none" step="0.25" /><span className="text-[11px] text-text-tertiary">h</span></div> : <button onClick={() => startEdit(`labor-hours-${l.id}`, String(l.estimatedHours))} className="text-[12px] text-text-secondary hover:text-interactive cursor-pointer">{l.estimatedHours}h</button>}
                <button onClick={() => removeLabor(l.id)} className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-destructive transition-all cursor-pointer"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            ))}
            {addingLabor && (
              <div className="bg-surface-bg rounded-[var(--radius-small)] p-3 border border-interactive/30 space-y-2">
                <input value={newLabDesc} onChange={(e) => setNewLabDesc(e.target.value)} placeholder="Role / description" className={`${inputClass} w-full`} autoFocus />
                <div className="flex gap-2">
                  <input value={newLabRate} onChange={(e) => setNewLabRate(e.target.value)} placeholder="$/hr" type="number" className={`${inputClass} flex-1`} />
                  <input value={newLabHours} onChange={(e) => setNewLabHours(e.target.value)} placeholder="Hours" type="number" step="0.25" className={`${inputClass} w-16`} />
                </div>
                <div className="flex gap-2">
                  <button onClick={addLabor} disabled={!newLabDesc.trim()} className="h-[32px] px-3 bg-interactive text-white text-[12px] font-bold rounded-[var(--radius-small)] hover:bg-interactive-hover transition-colors cursor-pointer disabled:opacity-30">Add</button>
                  <button onClick={() => setAddingLabor(false)} className="h-[32px] px-3 text-[12px] text-text-tertiary hover:text-text-primary cursor-pointer">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-border-subtle">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-text-secondary">This will permanently delete the service.</span>
              <button onClick={handleDelete} className="text-[13px] font-medium text-destructive hover:underline cursor-pointer">Yes, delete</button>
              <button onClick={() => setConfirmDelete(false)} className="text-[13px] text-text-tertiary hover:text-text-primary cursor-pointer">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-[13px] text-text-tertiary hover:text-destructive transition-colors cursor-pointer">Delete service</button>
          )}
        </div>
      </div>
    </div>
  );
}


function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color?: "green" | "amber" | "red" }) {
  const colorClass = color ? { green: "text-interactive", amber: "text-[var(--jb-warning-on-surface)]", red: "text-destructive" }[color] : "text-text-primary";
  return (
    <div className="bg-surface-bg rounded-[var(--radius-base)] p-3 border border-border-subtle">
      <p className="text-[11px] text-text-tertiary mb-0.5">{label}</p>
      <p className={`text-[17px] font-semibold ${colorClass}`}>{value}</p>
      <p className="text-[11px] text-text-tertiary">{sub}</p>
    </div>
  );
}
