"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/formatCurrency";
import { calcServiceTotals, type Service } from "@/lib/mockData";
import { getAreaAverage } from "@/lib/aiSuggestions";
import type { CatalogMaterial, CatalogLaborRate, BookHealthIssue } from "@/lib/store";
import Link from "next/link";

type Tab = "services" | "materials" | "labor";

export default function CatalogPage() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("services");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const services = useStore((s) => s.services);
  const materials = useStore((s) => s.materials);
  const laborRates = useStore((s) => s.laborRates);
  const getBookHealth = useStore((s) => s.getBookHealth);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "services", label: "Services", count: services.length },
    { id: "materials", label: "Materials", count: materials.length },
    { id: "labor", label: "Labor", count: laborRates.length },
  ];

  const categories = ["All", ...Array.from(new Set(services.map((s) => s.category || "Other").filter(Boolean)))];
  const filteredServices = services
    .filter((s) => category === "All" || (s.category || "Other") === category)
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || (s.description || "").toLowerCase().includes(search.toLowerCase()));
  const filteredMaterials = materials.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));
  const filteredLabor = laborRates.filter((l) => l.description.toLowerCase().includes(search.toLowerCase()));

  const health = getBookHealth();

  return (
    <div className="h-screen flex flex-col bg-surface-bg">
      {/* Header */}
      <header className="flex-shrink-0 h-[52px] border-b border-border-subtle bg-surface flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-text-tertiary hover:text-text-primary transition-colors">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-[15px] font-semibold text-text-primary">Pricebook</h1>
          <span className="text-[12px] text-text-tertiary">{services.length} services, {materials.length} materials, {laborRates.length} labor rates</span>
        </div>
      </header>

      {/* Health banner */}
      {health.length > 0 && tab === "services" && <HealthBanner issues={health} onSelectService={setSelectedId} />}

      {/* Tab bar + search + filters */}
      <div className="flex-shrink-0 border-b border-border-subtle bg-surface">
        <div className="max-w-5xl mx-auto w-full px-6">
          <div className="flex items-center gap-4 py-3">
            <div className="flex gap-1 bg-surface-hover rounded-[var(--radius-base)] p-0.5">
              {tabs.map((t) => (
                <button key={t.id} onClick={() => { setTab(t.id); setSearch(""); setCategory("All"); setSelectedId(null); }} className={`px-3 py-1.5 rounded-[var(--radius-small)] text-[13px] font-medium transition-colors cursor-pointer ${tab === t.id ? "bg-surface text-text-primary shadow-[var(--shadow-low)]" : "text-text-secondary hover:text-text-primary"}`}>{t.label} ({t.count})</button>
              ))}
            </div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${tab}...`} className="flex-1 max-w-[240px] h-[36px] bg-surface-bg border border-border-default rounded-[var(--radius-base)] px-3 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-interactive focus:ring-2 focus:ring-interactive/20 transition-all" />
          </div>
          {/* Category pills (services only) */}
          {tab === "services" && categories.length > 1 && (
            <div className="flex gap-1.5 pb-3 overflow-x-auto">
              {categories.map((cat) => {
                const count = cat === "All" ? services.length : services.filter((s) => (s.category || "Other") === cat).length;
                return (
                  <button key={cat} onClick={() => setCategory(cat)} className={`flex-shrink-0 px-3 py-1 rounded-full text-[12px] font-medium border transition-all cursor-pointer ${category === cat ? "bg-interactive text-white border-interactive" : "bg-surface-bg text-text-secondary border-border-subtle hover:border-border-default"}`}>
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content area: split into table + detail */}
      <div className="flex-1 overflow-hidden flex">
        {/* Table */}
        <div className={`flex-1 overflow-y-auto transition-all ${selectedId ? "max-w-[60%]" : "max-w-5xl mx-auto w-full"}`}>
          <div className="px-6 py-4">
            {tab === "services" && <ServicesTable services={filteredServices} selectedId={selectedId} onSelect={setSelectedId} />}
            {tab === "materials" && <MaterialsTable materials={filteredMaterials} />}
            {tab === "labor" && <LaborTable rates={filteredLabor} />}
          </div>
        </div>

        {/* Detail panel */}
        {selectedId && tab === "services" && (
          <div className="w-[40%] min-w-[340px] max-w-[440px] border-l border-border-subtle bg-surface overflow-y-auto">
            <ServiceDetailPanel serviceId={selectedId} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Health banner ─── */

function HealthBanner({ issues, onSelectService }: { issues: BookHealthIssue[]; onSelectService: (id: string) => void }) {
  const warnings = issues.filter((i) => i.severity === "warning");
  const opportunities = issues.filter((i) => i.severity === "opportunity");
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex-shrink-0 bg-surface border-b border-border-subtle">
      <div className="max-w-5xl mx-auto w-full px-6">
        <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between py-2.5 cursor-pointer group">
          <div className="flex items-center gap-3">
            {warnings.length > 0 && <span className="flex items-center gap-1.5 text-[12px] font-semibold text-destructive"><span className="w-1.5 h-1.5 rounded-full bg-destructive" />{warnings.length} issue{warnings.length > 1 ? "s" : ""}</span>}
            {opportunities.length > 0 && <span className="flex items-center gap-1.5 text-[12px] font-semibold text-interactive"><span className="w-1.5 h-1.5 rounded-full bg-interactive" />{opportunities.length} opportunit{opportunities.length > 1 ? "ies" : "y"}</span>}
          </div>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className={`text-text-tertiary transition-transform ${expanded ? "rotate-180" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
        {expanded && (
          <div className="pb-3 space-y-1.5">
            {issues.map((issue, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-[var(--radius-small)] bg-surface-bg border border-border-subtle">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${issue.severity === "warning" ? "bg-destructive" : issue.severity === "opportunity" ? "bg-interactive" : "bg-informative"}`} />
                  <span className="text-[13px] text-text-primary truncate">{issue.title}</span>
                  {issue.impact && <span className="flex-shrink-0 text-[11px] font-semibold text-text-tertiary">{issue.impact}</span>}
                </div>
                {issue.relatedIds?.[0] && <button onClick={() => onSelectService(issue.relatedIds![0])} className="flex-shrink-0 text-[12px] font-semibold text-interactive hover:underline cursor-pointer">{issue.action || "View"}</button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Services table with health indicators + area pricing ─── */

const inputClass = "h-[36px] px-3 rounded-[var(--radius-base)] border border-border-default bg-surface text-[13px] text-text-primary focus:border-interactive focus:outline-none focus:ring-2 focus:ring-interactive/20 transition-all";

function ServicesTable({ services, selectedId, onSelect }: { services: Service[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const deleteService = useStore((s) => s.deleteService);
  const addService = useStore((s) => s.addService);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCat, setNewCat] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    addService({ name: newName.trim(), description: newDesc.trim(), category: newCat.trim() || undefined, unitType: "flat", unitPrice: 0, taxable: true, priceMode: "calculated", materials: [], labor: [], markupRule: { type: "percentage", value: 20 } });
    setAdding(false); setNewName(""); setNewDesc(""); setNewCat("");
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setAdding(true)} className="h-[34px] px-4 bg-interactive text-white text-[13px] font-bold rounded-[var(--radius-base)] hover:bg-interactive-hover transition-colors cursor-pointer shadow-[var(--shadow-low)]">+ Add service</button>
      </div>

      {adding && (
        <div className="bg-surface rounded-[var(--radius-base)] border border-interactive/30 p-4 shadow-[var(--shadow-base)] space-y-2.5">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Service name" className={`${inputClass} w-full`} autoFocus />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)" className={`${inputClass} w-full`} />
          <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Category (optional)" className={`${inputClass} w-full`} />
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!newName.trim()} className="h-[34px] px-4 bg-interactive text-white text-[12px] font-bold rounded-[var(--radius-base)] hover:bg-interactive-hover transition-colors cursor-pointer disabled:opacity-30">Create</button>
            <button onClick={() => setAdding(false)} className="h-[34px] px-4 text-[12px] text-text-tertiary hover:text-text-primary cursor-pointer">Cancel</button>
          </div>
        </div>
      )}

      {services.length === 0 && !adding ? <Empty message="No services match your filters." /> : (
        <div className="bg-surface rounded-[var(--radius-base)] shadow-[var(--shadow-base)] overflow-hidden border border-border-subtle">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left border-b-2 border-border-subtle bg-surface-bg">
                <th className="py-2.5 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Service</th>
                <th className="py-2.5 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider text-right">Price</th>
                <th className="py-2.5 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider text-right">Cost</th>
                <th className="py-2.5 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider text-right">Margin</th>
                <th className="py-2.5 px-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {services.map((svc) => {
                const totals = calcServiceTotals(svc);
                const margin = svc.unitPrice > 0 ? Math.round(((svc.unitPrice - totals.rawCost) / svc.unitPrice) * 100) : 0;
                const area = getAreaAverage(svc.name, svc.unitPrice);
                const isSelected = selectedId === svc.id;
                const hasNoCost = svc.materials.length === 0 && svc.labor.length === 0;
                const isLowMargin = svc.priceMode === "calculated" && margin < 20 && margin >= 0 && !hasNoCost;
                const isBelowArea = area && svc.unitPrice < area.low;

                return (
                  <tr key={svc.id} onClick={() => onSelect(svc.id)} className={`cursor-pointer transition-all duration-150 ${isSelected ? "bg-interactive-muted/50 border-l-2 border-l-interactive" : "hover:bg-[var(--jb-informative-surface)]/20"}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {/* Health indicator dot */}
                        {hasNoCost && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-destructive" title="Missing cost data" />}
                        {isLowMargin && !hasNoCost && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[var(--jb-warning)]" title="Low margin" />}
                        {isBelowArea && !hasNoCost && !isLowMargin && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-informative" title="Below area average" />}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-text-primary truncate">{svc.name}</p>
                            {svc.gbbEnabled && <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-interactive-muted text-interactive uppercase">GBB</span>}
                          </div>
                          {svc.description && <p className="text-[12px] text-text-tertiary truncate max-w-[260px] mt-0.5">{svc.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <p className="font-medium text-text-primary">{formatCurrency(svc.unitPrice)}</p>
                      {area && <p className="text-[11px] text-text-tertiary mt-0.5">Area: {formatCurrency(area.low)}-{formatCurrency(area.high)}</p>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {svc.priceMode === "calculated" ? (
                        <p className="text-text-secondary">{formatCurrency(totals.rawCost)}</p>
                      ) : (
                        <p className="text-text-tertiary">--</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {svc.priceMode === "calculated" && !hasNoCost ? (
                        <span className={`font-semibold ${margin >= 30 ? "text-interactive" : margin >= 15 ? "text-[var(--jb-warning-on-surface)]" : "text-destructive"}`}>{margin}%</span>
                      ) : hasNoCost ? (
                        <span className="text-[11px] text-destructive font-medium">No costs</span>
                      ) : (
                        <span className="text-text-tertiary">--</span>
                      )}
                    </td>
                    <td className="py-3 px-4 w-10" onClick={(e) => e.stopPropagation()}>
                      {confirmId === svc.id ? (
                        <button onClick={() => { deleteService(svc.id); setConfirmId(null); }} className="text-[11px] font-semibold text-destructive cursor-pointer">Delete</button>
                      ) : (
                        <button onClick={() => setConfirmId(svc.id)} className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-destructive transition-all cursor-pointer"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Service detail panel (inline in catalog page) ─── */

function ServiceDetailPanel({ serviceId, onClose }: { serviceId: string; onClose: () => void }) {
  const services = useStore((s) => s.services);
  const updateService = useStore((s) => s.updateService);
  const svc = services.find((s) => s.id === serviceId);

  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [addingLabor, setAddingLabor] = useState(false);
  const [newMatName, setNewMatName] = useState("");
  const [newMatCost, setNewMatCost] = useState("");
  const [newMatQty, setNewMatQty] = useState("1");
  const [newLabDesc, setNewLabDesc] = useState("");
  const [newLabRate, setNewLabRate] = useState("");
  const [newLabHours, setNewLabHours] = useState("1");

  if (!svc) return <div className="p-5 text-[13px] text-text-tertiary">Service not found.</div>;

  const totals = calcServiceTotals(svc);
  const margin = svc.unitPrice > 0 ? Math.round(((svc.unitPrice - totals.rawCost) / svc.unitPrice) * 100) : 0;
  const area = getAreaAverage(svc.name, svc.unitPrice);

  const startEdit = (field: string, val: string) => { setEditing(field); setEditValue(val); };
  const saveEdit = () => {
    if (!editing) return;
    if (editing === "name") updateService(svc.id, { name: editValue });
    else if (editing === "description") updateService(svc.id, { description: editValue });
    else if (editing === "category") updateService(svc.id, { category: editValue });
    else if (editing === "markup") updateService(svc.id, { markupRule: { type: "percentage", value: parseFloat(editValue) || 0 } });
    else if (editing.startsWith("mat-cost-")) { const matId = editing.replace("mat-cost-", ""); updateService(svc.id, { materials: svc.materials.map((m) => m.id === matId ? { ...m, unitCost: parseFloat(editValue) || 0 } : m) }); }
    else if (editing.startsWith("mat-qty-")) { const matId = editing.replace("mat-qty-", ""); updateService(svc.id, { materials: svc.materials.map((m) => m.id === matId ? { ...m, quantity: parseFloat(editValue) || 1 } : m) }); }
    else if (editing.startsWith("mat-markup-")) { const matId = editing.replace("mat-markup-", ""); updateService(svc.id, { materials: svc.materials.map((m) => m.id === matId ? { ...m, markup: { type: "percentage" as const, value: parseFloat(editValue) || 0 } } : m) }); }
    else if (editing.startsWith("labor-rate-")) { const labId = editing.replace("labor-rate-", ""); updateService(svc.id, { labor: svc.labor.map((l) => l.id === labId ? { ...l, hourlyRate: parseFloat(editValue) || 0 } : l) }); }
    else if (editing.startsWith("labor-hours-")) { const labId = editing.replace("labor-hours-", ""); updateService(svc.id, { labor: svc.labor.map((l) => l.id === labId ? { ...l, estimatedHours: parseFloat(editValue) || 0 } : l) }); }
    setEditing(null);
  };

  const addMaterial = () => { if (!newMatName.trim()) return; updateService(svc.id, { materials: [...svc.materials, { id: `m-${Date.now()}`, name: newMatName.trim(), unitCost: parseFloat(newMatCost) || 0, quantity: parseFloat(newMatQty) || 1, unitType: "each", markup: { type: "percentage" as const, value: 20 } }] }); setAddingMaterial(false); setNewMatName(""); setNewMatCost(""); setNewMatQty("1"); };
  const addLabor = () => { if (!newLabDesc.trim()) return; updateService(svc.id, { labor: [...svc.labor, { id: `l-${Date.now()}`, description: newLabDesc.trim(), hourlyRate: parseFloat(newLabRate) || 0, estimatedHours: parseFloat(newLabHours) || 1, costRate: 0 }] }); setAddingLabor(false); setNewLabDesc(""); setNewLabRate(""); setNewLabHours("1"); };
  const removeMaterial = (matId: string) => updateService(svc.id, { materials: svc.materials.filter((m) => m.id !== matId) });
  const removeLabor = (labId: string) => updateService(svc.id, { labor: svc.labor.filter((l) => l.id !== labId) });

  const fieldInput = "h-[30px] px-2 rounded-[var(--radius-small)] border border-border-default bg-surface text-[12px] text-text-primary focus:border-interactive focus:outline-none focus:ring-1 focus:ring-interactive/20 transition-all";

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-surface-bg">
        <div className="flex items-center gap-2 min-w-0">
          {editing === "name" ? (
            <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className="text-[15px] font-semibold text-text-primary bg-transparent border-b-2 border-focus outline-none w-full" />
          ) : (
            <h2 onClick={() => startEdit("name", svc.name)} className="text-[15px] font-semibold text-text-primary cursor-pointer hover:text-interactive transition-colors truncate" >{svc.name}</h2>
          )}
          {svc.gbbEnabled && <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-interactive-muted text-interactive uppercase">GBB</span>}
        </div>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer flex-shrink-0">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Description */}
        {editing === "description" ? (
          <textarea autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} rows={2} className="w-full text-[13px] text-text-secondary bg-surface-bg border border-focus rounded-[var(--radius-small)] px-3 py-2 outline-none resize-none" />
        ) : (
          <p onClick={() => startEdit("description", svc.description || "")} className="text-[13px] text-text-secondary cursor-pointer hover:text-text-primary transition-colors min-h-[20px]">{svc.description || "Add a description..."}</p>
        )}

        {/* Category + Markup row */}
        <div className="flex items-center gap-4 text-[12px]">
          <div className="flex items-center gap-1.5">
            <span className="text-text-tertiary">Category:</span>
            {editing === "category" ? <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className="text-[12px] font-medium bg-transparent border-b border-focus outline-none w-24" /> : <button onClick={() => startEdit("category", svc.category || "")} className="font-medium text-text-secondary hover:text-interactive cursor-pointer">{svc.category || "None"}</button>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-text-tertiary">Markup:</span>
            {editing === "markup" ? <div className="flex items-center gap-0.5"><input autoFocus type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className="w-12 text-right text-[12px] font-medium bg-transparent border-b border-focus outline-none" /><span className="text-text-tertiary">%</span></div> : <button onClick={() => startEdit("markup", String(svc.markupRule.value))} className="font-medium text-text-secondary hover:text-interactive cursor-pointer">{svc.markupRule.value}%</button>}
          </div>
        </div>

        {/* Pricing strip */}
        <div className="grid grid-cols-3 gap-2">
          <PricingStat label="Price" value={formatCurrency(svc.unitPrice)} />
          <PricingStat label="Cost" value={svc.priceMode === "calculated" ? formatCurrency(totals.rawCost) : "--"} />
          <PricingStat label="Margin" value={svc.priceMode === "calculated" && svc.materials.length + svc.labor.length > 0 ? `${margin}%` : "--"} color={margin >= 30 ? "green" : margin >= 15 ? "amber" : "red"} />
        </div>

        {/* Area comparison */}
        {area && (
          <div className="bg-surface-bg rounded-[var(--radius-small)] px-3 py-2 border border-border-subtle">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-text-tertiary">Area average</span>
              <span className="text-text-secondary">{formatCurrency(area.low)} - {formatCurrency(area.high)}</span>
            </div>
            <div className="mt-1.5 h-1.5 bg-border-subtle rounded-full relative overflow-hidden">
              {/* Range bar */}
              <div className="absolute h-full bg-informative/30 rounded-full" style={{ left: `${Math.max(0, (area.low / (area.high * 1.3)) * 100)}%`, width: `${Math.min(100, ((area.high - area.low) / (area.high * 1.3)) * 100)}%` }} />
              {/* Your position */}
              <div className={`absolute w-2.5 h-2.5 rounded-full -top-[2px] border-2 border-surface shadow-[var(--shadow-low)] transition-all ${svc.unitPrice < area.low ? "bg-destructive" : svc.unitPrice > area.high ? "bg-informative" : "bg-interactive"}`} style={{ left: `${Math.min(96, Math.max(2, (svc.unitPrice / (area.high * 1.3)) * 100))}%` }} />
            </div>
            <p className="text-[11px] mt-1 text-text-tertiary">
              {svc.unitPrice < area.low ? "Below area range. You may be underpriced." : svc.unitPrice > area.high ? "Above area range. Premium positioning." : "Within the typical area range."}
            </p>
          </div>
        )}

        {/* Materials */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Materials ({svc.materials.length})</h4>
            <button onClick={() => setAddingMaterial(true)} className="text-[11px] font-semibold text-interactive hover:underline cursor-pointer">+ Add</button>
          </div>
          {svc.materials.length === 0 && !addingMaterial && <p className="text-[12px] text-text-tertiary py-2">No materials yet.</p>}
          <div className="space-y-1">
            {svc.materials.map((m) => (
              <div key={m.id} className="group flex items-center gap-1.5 text-[12px] py-1.5 px-2.5 bg-surface-bg rounded-[var(--radius-small)] hover:bg-[var(--jb-informative-surface)]/20 transition-colors border border-transparent hover:border-border-subtle">
                <span className="flex-1 text-text-primary truncate">{m.name}</span>
                {editing === `mat-cost-${m.id}` ? <input autoFocus type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className="w-14 text-right text-[11px] bg-transparent border-b border-focus outline-none" /> : <button onClick={() => startEdit(`mat-cost-${m.id}`, String(m.unitCost))} className="text-[11px] text-text-secondary hover:text-interactive cursor-pointer">{formatCurrency(m.unitCost)}</button>}
                <span className="text-text-tertiary text-[10px]">x</span>
                {editing === `mat-qty-${m.id}` ? <input autoFocus type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className="w-8 text-right text-[11px] bg-transparent border-b border-focus outline-none" /> : <button onClick={() => startEdit(`mat-qty-${m.id}`, String(m.quantity))} className="text-[11px] text-text-secondary hover:text-interactive cursor-pointer">{m.quantity}</button>}
                {editing === `mat-markup-${m.id}` ? <div className="flex items-center gap-0.5"><input autoFocus type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className="w-8 text-right text-[11px] bg-transparent border-b border-focus outline-none" /><span className="text-[9px] text-text-tertiary">%</span></div> : <button onClick={() => startEdit(`mat-markup-${m.id}`, String(m.markup.value))} className="text-[10px] text-text-tertiary hover:text-interactive cursor-pointer">+{m.markup.value}%</button>}
                <button onClick={() => removeMaterial(m.id)} className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-destructive transition-all cursor-pointer"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            ))}
            {addingMaterial && (
              <div className="bg-surface-bg rounded-[var(--radius-small)] p-2.5 border border-interactive/30 space-y-1.5">
                <input value={newMatName} onChange={(e) => setNewMatName(e.target.value)} placeholder="Material name" className={`${fieldInput} w-full`} autoFocus />
                <div className="flex gap-1.5">
                  <input value={newMatCost} onChange={(e) => setNewMatCost(e.target.value)} placeholder="Cost" type="number" className={`${fieldInput} flex-1`} />
                  <input value={newMatQty} onChange={(e) => setNewMatQty(e.target.value)} placeholder="Qty" type="number" className={`${fieldInput} w-14`} />
                </div>
                <div className="flex gap-1.5">
                  <button onClick={addMaterial} disabled={!newMatName.trim()} className="h-[28px] px-3 bg-interactive text-white text-[11px] font-bold rounded-[var(--radius-small)] hover:bg-interactive-hover cursor-pointer disabled:opacity-30">Add</button>
                  <button onClick={() => setAddingMaterial(false)} className="h-[28px] px-2 text-[11px] text-text-tertiary hover:text-text-primary cursor-pointer">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Labor */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Labor ({svc.labor.length})</h4>
            <button onClick={() => setAddingLabor(true)} className="text-[11px] font-semibold text-interactive hover:underline cursor-pointer">+ Add</button>
          </div>
          {svc.labor.length === 0 && !addingLabor && <p className="text-[12px] text-text-tertiary py-2">No labor entries yet.</p>}
          <div className="space-y-1">
            {svc.labor.map((l) => (
              <div key={l.id} className="group flex items-center gap-1.5 text-[12px] py-1.5 px-2.5 bg-surface-bg rounded-[var(--radius-small)] hover:bg-[var(--jb-informative-surface)]/20 transition-colors border border-transparent hover:border-border-subtle">
                <span className="flex-1 text-text-primary truncate">{l.description}</span>
                {editing === `labor-rate-${l.id}` ? <div className="flex items-center gap-0.5"><span className="text-[10px] text-text-tertiary">$</span><input autoFocus type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className="w-12 text-right text-[11px] bg-transparent border-b border-focus outline-none" /><span className="text-[10px] text-text-tertiary">/hr</span></div> : <button onClick={() => startEdit(`labor-rate-${l.id}`, String(l.hourlyRate))} className="text-[11px] text-text-secondary hover:text-interactive cursor-pointer">{formatCurrency(l.hourlyRate)}/hr</button>}
                <span className="text-text-tertiary text-[10px]">x</span>
                {editing === `labor-hours-${l.id}` ? <div className="flex items-center gap-0.5"><input autoFocus type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={saveEdit} onKeyDown={(e) => e.key === "Enter" && saveEdit()} className="w-8 text-right text-[11px] bg-transparent border-b border-focus outline-none" step="0.25" /><span className="text-[10px] text-text-tertiary">h</span></div> : <button onClick={() => startEdit(`labor-hours-${l.id}`, String(l.estimatedHours))} className="text-[11px] text-text-secondary hover:text-interactive cursor-pointer">{l.estimatedHours}h</button>}
                <button onClick={() => removeLabor(l.id)} className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-destructive transition-all cursor-pointer"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            ))}
            {addingLabor && (
              <div className="bg-surface-bg rounded-[var(--radius-small)] p-2.5 border border-interactive/30 space-y-1.5">
                <input value={newLabDesc} onChange={(e) => setNewLabDesc(e.target.value)} placeholder="Role / description" className={`${fieldInput} w-full`} autoFocus />
                <div className="flex gap-1.5">
                  <input value={newLabRate} onChange={(e) => setNewLabRate(e.target.value)} placeholder="$/hr" type="number" className={`${fieldInput} flex-1`} />
                  <input value={newLabHours} onChange={(e) => setNewLabHours(e.target.value)} placeholder="Hours" type="number" step="0.25" className={`${fieldInput} w-14`} />
                </div>
                <div className="flex gap-1.5">
                  <button onClick={addLabor} disabled={!newLabDesc.trim()} className="h-[28px] px-3 bg-interactive text-white text-[11px] font-bold rounded-[var(--radius-small)] hover:bg-interactive-hover cursor-pointer disabled:opacity-30">Add</button>
                  <button onClick={() => setAddingLabor(false)} className="h-[28px] px-2 text-[11px] text-text-tertiary hover:text-text-primary cursor-pointer">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Materials table ─── */

function MaterialsTable({ materials }: { materials: CatalogMaterial[] }) {
  const updateMaterial = useStore((s) => s.updateMaterial);
  const deleteMaterial = useStore((s) => s.deleteMaterial);
  const addMaterial = useStore((s) => s.addMaterial);
  const [editing, setEditing] = useState<{ id: string; field: string } | null>(null);
  const [editVal, setEditVal] = useState("");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newMarkup, setNewMarkup] = useState("20");

  const save = () => { if (!editing) return; const val = parseFloat(editVal); if (editing.field === "unitCost" && !isNaN(val)) updateMaterial(editing.id, { unitCost: val }); else if (editing.field === "markup" && !isNaN(val)) updateMaterial(editing.id, { markup: { type: "percentage", value: val } }); setEditing(null); };
  const handleAdd = () => { if (!newName.trim()) return; addMaterial({ name: newName.trim(), unitCost: parseFloat(newCost) || 0, unitType: "each", markup: { type: "percentage", value: parseFloat(newMarkup) || 20 } }); setAdding(false); setNewName(""); setNewCost(""); setNewMarkup("20"); };

  return (
    <div className="space-y-3 max-w-4xl mx-auto">
      <div className="flex justify-end"><button onClick={() => setAdding(true)} className="h-[34px] px-4 bg-interactive text-white text-[13px] font-bold rounded-[var(--radius-base)] hover:bg-interactive-hover transition-colors cursor-pointer shadow-[var(--shadow-low)]">+ Add material</button></div>
      {adding && (
        <div className="bg-surface rounded-[var(--radius-base)] border border-interactive/30 p-4 shadow-[var(--shadow-base)] space-y-2.5">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Material name" className={`${inputClass} w-full`} autoFocus />
          <div className="flex gap-3"><input value={newCost} onChange={(e) => setNewCost(e.target.value)} placeholder="Unit cost" type="number" className={`${inputClass} flex-1`} /><div className="flex items-center gap-1"><input value={newMarkup} onChange={(e) => setNewMarkup(e.target.value)} placeholder="Markup" type="number" className={`${inputClass} w-20`} /><span className="text-text-tertiary text-[13px]">%</span></div></div>
          <div className="flex gap-2"><button onClick={handleAdd} disabled={!newName.trim()} className="h-[34px] px-4 bg-interactive text-white text-[12px] font-bold rounded-[var(--radius-base)] hover:bg-interactive-hover cursor-pointer disabled:opacity-30">Add material</button><button onClick={() => setAdding(false)} className="h-[34px] px-4 text-[12px] text-text-tertiary hover:text-text-primary cursor-pointer">Cancel</button></div>
        </div>
      )}
      {materials.length === 0 && !adding ? <Empty message="No materials found." /> : (
        <div className="bg-surface rounded-[var(--radius-base)] shadow-[var(--shadow-base)] overflow-hidden border border-border-subtle">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left border-b-2 border-border-subtle bg-surface-bg"><th className="py-2.5 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Material</th><th className="py-2.5 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Category</th><th className="py-2.5 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider text-right">Unit cost</th><th className="py-2.5 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider text-right">Markup</th><th className="py-2.5 px-4 w-10"></th></tr></thead>
            <tbody className="divide-y divide-border-subtle">
              {materials.map((m) => (
                <tr key={m.id} className="hover:bg-[var(--jb-informative-surface)]/20 transition-all" onMouseEnter={() => setHoverId(m.id)} onMouseLeave={() => setHoverId(null)}>
                  <td className="py-3 px-4 font-medium text-text-primary">{m.name}</td>
                  <td className="py-3 px-4 text-text-secondary">{m.category || "--"}</td>
                  <td className="py-3 px-4 text-right">{editing?.id === m.id && editing.field === "unitCost" ? <input autoFocus type="number" value={editVal} onChange={(e) => setEditVal(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && save()} className="w-20 text-right text-[13px] bg-transparent border-b-2 border-focus outline-none" /> : <button onClick={() => { setEditing({ id: m.id, field: "unitCost" }); setEditVal(String(m.unitCost)); }} className="text-text-primary hover:text-interactive cursor-pointer">{formatCurrency(m.unitCost)}</button>}</td>
                  <td className="py-3 px-4 text-right">{editing?.id === m.id && editing.field === "markup" ? <div className="inline-flex items-center gap-0.5"><input autoFocus type="number" value={editVal} onChange={(e) => setEditVal(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && save()} className="w-12 text-right text-[13px] bg-transparent border-b-2 border-focus outline-none" /><span className="text-text-tertiary">%</span></div> : <button onClick={() => { setEditing({ id: m.id, field: "markup" }); setEditVal(String(m.markup.value)); }} className="text-text-secondary hover:text-interactive cursor-pointer">{m.markup.type === "percentage" ? `${m.markup.value}%` : formatCurrency(m.markup.value)}</button>}</td>
                  <td className="py-3 px-4 w-10">{hoverId === m.id && <button onClick={() => deleteMaterial(m.id)} className="text-text-tertiary hover:text-destructive transition-colors cursor-pointer"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Labor table ─── */

function LaborTable({ rates }: { rates: CatalogLaborRate[] }) {
  const updateLaborRate = useStore((s) => s.updateLaborRate);
  const deleteLaborRate = useStore((s) => s.deleteLaborRate);
  const addLaborRate = useStore((s) => s.addLaborRate);
  const [editing, setEditing] = useState<{ id: string; field: string } | null>(null);
  const [editVal, setEditVal] = useState("");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newCostRate, setNewCostRate] = useState("");

  const save = () => { if (!editing) return; const val = parseFloat(editVal); if (isNaN(val)) { setEditing(null); return; } if (editing.field === "hourlyRate") updateLaborRate(editing.id, { hourlyRate: val }); else if (editing.field === "costRate") updateLaborRate(editing.id, { costRate: val }); setEditing(null); };
  const handleAdd = () => { if (!newDesc.trim()) return; addLaborRate({ description: newDesc.trim(), hourlyRate: parseFloat(newRate) || 0, costRate: parseFloat(newCostRate) || undefined }); setAdding(false); setNewDesc(""); setNewRate(""); setNewCostRate(""); };

  return (
    <div className="space-y-3 max-w-4xl mx-auto">
      <div className="flex justify-end"><button onClick={() => setAdding(true)} className="h-[34px] px-4 bg-interactive text-white text-[13px] font-bold rounded-[var(--radius-base)] hover:bg-interactive-hover transition-colors cursor-pointer shadow-[var(--shadow-low)]">+ Add labor rate</button></div>
      {adding && (
        <div className="bg-surface rounded-[var(--radius-base)] border border-interactive/30 p-4 shadow-[var(--shadow-base)] space-y-2.5">
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Role / description" className={`${inputClass} w-full`} autoFocus />
          <div className="flex gap-3"><div className="flex items-center gap-1 flex-1"><span className="text-text-tertiary text-[13px]">$</span><input value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="Bill rate" type="number" className={`${inputClass} flex-1`} /><span className="text-text-tertiary text-[13px]">/hr</span></div><div className="flex items-center gap-1 flex-1"><span className="text-text-tertiary text-[13px]">$</span><input value={newCostRate} onChange={(e) => setNewCostRate(e.target.value)} placeholder="Cost (optional)" type="number" className={`${inputClass} flex-1`} /><span className="text-text-tertiary text-[13px]">/hr</span></div></div>
          <div className="flex gap-2"><button onClick={handleAdd} disabled={!newDesc.trim()} className="h-[34px] px-4 bg-interactive text-white text-[12px] font-bold rounded-[var(--radius-base)] hover:bg-interactive-hover cursor-pointer disabled:opacity-30">Add labor rate</button><button onClick={() => setAdding(false)} className="h-[34px] px-4 text-[12px] text-text-tertiary hover:text-text-primary cursor-pointer">Cancel</button></div>
        </div>
      )}
      {rates.length === 0 && !adding ? <Empty message="No labor rates found." /> : (
        <div className="bg-surface rounded-[var(--radius-base)] shadow-[var(--shadow-base)] overflow-hidden border border-border-subtle">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left border-b-2 border-border-subtle bg-surface-bg"><th className="py-2.5 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Role</th><th className="py-2.5 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider text-right">Bill rate</th><th className="py-2.5 px-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider text-right">Cost rate</th><th className="py-2.5 px-4 w-10"></th></tr></thead>
            <tbody className="divide-y divide-border-subtle">
              {rates.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--jb-informative-surface)]/20 transition-all" onMouseEnter={() => setHoverId(r.id)} onMouseLeave={() => setHoverId(null)}>
                  <td className="py-3 px-4 font-medium text-text-primary">{r.description}</td>
                  <td className="py-3 px-4 text-right">{editing?.id === r.id && editing.field === "hourlyRate" ? <div className="inline-flex items-center gap-0.5"><span className="text-text-tertiary">$</span><input autoFocus type="number" value={editVal} onChange={(e) => setEditVal(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && save()} className="w-14 text-right text-[13px] bg-transparent border-b-2 border-focus outline-none" /><span className="text-text-tertiary">/hr</span></div> : <button onClick={() => { setEditing({ id: r.id, field: "hourlyRate" }); setEditVal(String(r.hourlyRate)); }} className="text-text-primary hover:text-interactive cursor-pointer">{formatCurrency(r.hourlyRate)}/hr</button>}</td>
                  <td className="py-3 px-4 text-right">{editing?.id === r.id && editing.field === "costRate" ? <div className="inline-flex items-center gap-0.5"><span className="text-text-tertiary">$</span><input autoFocus type="number" value={editVal} onChange={(e) => setEditVal(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && save()} className="w-14 text-right text-[13px] bg-transparent border-b-2 border-focus outline-none" /><span className="text-text-tertiary">/hr</span></div> : <button onClick={() => { setEditing({ id: r.id, field: "costRate" }); setEditVal(String(r.costRate || "")); }} className="text-text-secondary hover:text-interactive cursor-pointer">{r.costRate ? `${formatCurrency(r.costRate)}/hr` : "--"}</button>}</td>
                  <td className="py-3 px-4 w-10">{hoverId === r.id && <button onClick={() => deleteLaborRate(r.id)} className="text-text-tertiary hover:text-destructive transition-colors cursor-pointer"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PricingStat({ label, value, color }: { label: string; value: string; color?: "green" | "amber" | "red" }) {
  const colorClass = color ? { green: "text-interactive", amber: "text-[var(--jb-warning-on-surface)]", red: "text-destructive" }[color] : "text-text-primary";
  return (
    <div className="bg-surface-bg rounded-[var(--radius-small)] px-2.5 py-2 text-center border border-border-subtle">
      <p className={`text-[14px] font-bold ${colorClass}`}>{value}</p>
      <p className="text-[10px] text-text-tertiary uppercase">{label}</p>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return <div className="text-center py-12 text-[13px] text-text-tertiary">{message}</div>;
}
