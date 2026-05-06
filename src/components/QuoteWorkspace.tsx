"use client";

import { useState, useCallback, useRef } from "react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/formatCurrency";
import { calcServiceTotals } from "@/lib/mockData";
import type { QuoteLineItem, OptionTier } from "@/lib/mockData";
import { generateProposalContent, getSalesInsights } from "@/lib/aiSuggestions";
import { MOCK_BUSINESS } from "@/lib/mockData";

type ViewMode = "internal" | "client";

export function QuoteWorkspace({ onClose }: { onClose: () => void }) {
  const quote = useStore((s) => s.activeQuote);
  const services = useStore((s) => s.services);
  const updateQuoteItem = useStore((s) => s.updateQuoteItem);
  const addQuoteItem = useStore((s) => s.addQuoteItem);
  const removeQuoteItem = useStore((s) => s.removeQuoteItem);
  const reorderQuoteItems = useStore((s) => s.reorderQuoteItems);
  const updateQuoteMeta = useStore((s) => s.updateQuoteMeta);
  const saveQuote = useStore((s) => s.saveQuote);
  const setActiveQuote = useStore((s) => s.setActiveQuote);
  const proposeAction = useStore((s) => s.proposeAction);
  const approveAction = useStore((s) => s.approveAction);
  const addMessage = useStore((s) => s.addMessage);

  const [viewMode, setViewMode] = useState<ViewMode>("internal");
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [editingClient, setEditingClient] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!quote) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8">
        <p className="text-[13px] text-text-tertiary">No active quote. Start one from the chat.</p>
        <button onClick={onClose} className="mt-2 text-[13px] font-medium text-interactive hover:underline cursor-pointer">Go Back</button>
      </div>
    );
  }

  const quoteTotal = quote.items.reduce((sum, li) => {
    const price = li.selectedTierId && li.optionTiers
      ? (li.optionTiers.find((t) => t.id === li.selectedTierId)?.price ?? li.adjustedPrice)
      : li.adjustedPrice;
    return sum + price * li.quantity;
  }, 0);
  const taxRate = 0.13;
  const tax = quoteTotal * taxRate;
  const total = quoteTotal + tax;
  const deposit = quote.depositPercent > 0 ? total * (quote.depositPercent / 100) : 0;

  const costedItems = quote.items.filter(
    (li) => li.service.priceMode === "calculated" && (li.service.materials.length > 0 || li.service.labor.length > 0)
  );
  const totalCost = costedItems.reduce((sum, li) => calcServiceTotals(li.service).rawCost * li.quantity, 0);
  const blendedMargin = quoteTotal > 0 ? Math.round(((quoteTotal - totalCost) / quoteTotal) * 100) : 0;

  const insights = getSalesInsights(
    quote.items.map((li) => ({
      serviceName: li.service.name,
      price: li.adjustedPrice,
      hasDescription: !!li.service.description,
      hasOptionTiers: !!(li.optionTiers && li.optionTiers.length > 0),
      materialCount: li.service.materials.length,
    })),
    quoteTotal
  );

  const handleSend = () => {
    updateQuoteMeta({ status: "sent" });
    saveQuote();
    const actionId = proposeAction({ type: "create-quote", title: `Quote for ${quote.clientName}`, description: `${quote.items.length} services, ${formatCurrency(total)} total`, impact: formatCurrency(total) });
    approveAction(actionId);
    addMessage({ role: "agent", content: `Sent quote to ${quote.clientName}. ${quote.items.length} services totaling ${formatCurrency(total)}.`, cardType: "status-update" });
  };

  const handleAddFromPicker = (serviceId: string) => {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    const hasTiers = svc.optionTiers && svc.optionTiers.length >= 2;
    const selectedTier = hasTiers ? svc.optionTiers![Math.min(1, svc.optionTiers!.length - 1)] : null;
    addQuoteItem({
      service: svc,
      quantity: 1,
      adjustedPrice: selectedTier ? selectedTier.price : svc.unitPrice,
      optionTiers: svc.optionTiers,
      selectedTierId: selectedTier?.id,
    });
    setShowAddPicker(false);
    setAddSearch("");
  };

  const handleTierSelect = (itemIndex: number, tierId: string) => {
    const item = quote.items[itemIndex];
    const tier = item.optionTiers?.find((t) => t.id === tierId);
    if (tier) {
      updateQuoteItem(itemIndex, { selectedTierId: tierId, adjustedPrice: tier.price });
    }
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex !== null && dragIndex !== targetIndex) {
      reorderQuoteItems(dragIndex, targetIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const existingServiceIds = new Set(quote.items.map((li) => li.service.id));
  const availableToAdd = services.filter((s) => {
    if (existingServiceIds.has(s.id)) return false;
    if (!addSearch) return true;
    return s.name.toLowerCase().includes(addSearch.toLowerCase());
  });

  if (quote.status === "sent") {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8">
        <div className="w-14 h-14 rounded-full bg-interactive-muted flex items-center justify-center mb-4">
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-interactive"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 className="text-[17px] font-semibold text-text-primary mb-1">Quote sent</h3>
        <p className="text-[13px] text-text-secondary mb-1">{formatCurrency(total)} to {quote.clientName}</p>
        <p className="text-[12px] text-text-tertiary mb-1">{quote.quoteNumber}</p>
        <p className="text-[12px] text-text-tertiary mb-4">{quote.items.length} service{quote.items.length > 1 ? "s" : ""}</p>
        <button onClick={() => { setActiveQuote(null); onClose(); }} className="text-[13px] font-medium text-interactive hover:underline cursor-pointer">Back to Workspace</button>
      </div>
    );
  }

  if (viewMode === "client") {
    return <ClientPreview quote={quote} total={total} tax={tax} quoteTotal={quoteTotal} deposit={deposit} onBack={() => setViewMode("internal")} onTierSelect={handleTierSelect} />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-[15px] font-semibold text-text-primary">Quote workspace</h2>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-quote-surface text-quote">{quote.quoteNumber}</span>
        </div>
        <div className="flex items-center gap-1 bg-surface-bg rounded-full p-0.5 border border-border-subtle">
          <button onClick={() => setViewMode("internal")} className="px-3 py-1 text-[12px] font-medium rounded-full transition-all cursor-pointer bg-surface shadow-sm text-text-primary">Internal</button>
          <button onClick={() => setViewMode("client")} className="px-3 py-1 text-[12px] font-medium rounded-full transition-all cursor-pointer text-text-tertiary hover:text-text-secondary">Client Preview</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Stats bar */}
        <div className="flex items-center gap-4 px-5 py-3 bg-surface-bg border-b border-border-subtle">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-tertiary">Items</span>
            <span className="text-[13px] font-bold text-text-primary">{quote.items.length}</span>
          </div>
          <div className="w-px h-4 bg-border-subtle" />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-tertiary">Total</span>
            <span className="text-[13px] font-bold text-interactive">{formatCurrency(total)}</span>
          </div>
          <div className="w-px h-4 bg-border-subtle" />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-tertiary">Profit</span>
            <span className={`text-[13px] font-bold ${blendedMargin >= 30 ? "text-interactive" : blendedMargin >= 15 ? "text-[var(--jb-warning-on-surface)]" : "text-destructive"}`}>{blendedMargin}%</span>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Client */}
          <div className="bg-surface-bg rounded-[var(--radius-base)] p-4 border border-border-subtle">
            <p className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold mb-1">Prepared for</p>
            {editingClient ? (
              <input autoFocus value={quote.clientName} onChange={(e) => updateQuoteMeta({ clientName: e.target.value })} onBlur={() => setEditingClient(false)} onKeyDown={(e) => e.key === "Enter" && setEditingClient(false)} className="text-[16px] font-semibold text-text-primary bg-transparent border-b-2 border-focus outline-none w-full" />
            ) : (
              <p onClick={() => setEditingClient(true)} className="text-[16px] font-semibold text-text-primary cursor-pointer hover:text-interactive transition-colors">{quote.clientName}</p>
            )}
            <p className="text-[12px] text-text-tertiary mt-1">Valid until {quote.validUntil}</p>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Line items ({quote.items.length})</p>
              <button onClick={() => setShowAddPicker(true)} className="text-[11px] font-semibold text-interactive hover:underline cursor-pointer">+ Add from Pricebook</button>
            </div>

            <div className="space-y-2">
              {quote.items.map((item, i) => (
                <QuoteLineItemRow
                  key={`${item.service.id}-${i}`}
                  item={item}
                  index={i}
                  isExpanded={expandedItem === i}
                  onToggleExpand={() => setExpandedItem(expandedItem === i ? null : i)}
                  onUpdateItem={(updates) => updateQuoteItem(i, updates)}
                  onRemove={() => removeQuoteItem(i)}
                  onTierSelect={(tierId) => handleTierSelect(i, tierId)}
                  isDragging={dragIndex === i}
                  isDragOver={dragOverIndex === i}
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={() => setDragOverIndex(i)}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                />
              ))}
            </div>

            {/* Add from pricebook picker */}
            {showAddPicker && (
              <div className="mt-2 bg-surface border border-interactive/20 rounded-[var(--radius-base)] p-3 space-y-2">
                <input
                  autoFocus
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  placeholder="Search your pricebook..."
                  className="w-full h-[32px] px-3 text-[13px] rounded-[var(--radius-small)] border border-border-default bg-surface-bg text-text-primary focus:border-interactive focus:outline-none"
                />
                <div className="max-h-[180px] overflow-y-auto space-y-0.5">
                  {availableToAdd.slice(0, 8).map((svc) => (
                    <button key={svc.id} onClick={() => handleAddFromPicker(svc.id)} className="w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-small)] text-left hover:bg-surface-hover transition-colors cursor-pointer">
                      {svc.imageUrl ? (
                        <img src={svc.imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-surface-bg border border-border-subtle flex items-center justify-center flex-shrink-0">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-text-tertiary"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-text-primary truncate">{svc.name}</p>
                        <p className="text-[11px] text-text-tertiary truncate">{svc.description}</p>
                      </div>
                      <span className="text-[13px] font-medium text-text-secondary flex-shrink-0">{formatCurrency(svc.unitPrice)}</span>
                    </button>
                  ))}
                  {availableToAdd.length === 0 && <p className="text-[12px] text-text-tertiary text-center py-2">No more services available</p>}
                </div>
                <button onClick={() => { setShowAddPicker(false); setAddSearch(""); }} className="text-[12px] text-text-tertiary hover:text-text-primary cursor-pointer">Cancel</button>
              </div>
            )}

            {/* Add custom line */}
            <button onClick={() => {
              addQuoteItem({
                service: { id: `freehand-${Date.now()}`, name: "Custom line item", description: "", unitPrice: 0, unitType: "flat", taxable: true, priceMode: "manual", materials: [], labor: [], markupRule: { type: "percentage", value: 0 } },
                quantity: 1,
                adjustedPrice: 0,
              });
              setExpandedItem(quote.items.length);
            }} className="w-full mt-2 h-[36px] text-[13px] font-medium text-text-secondary border border-dashed border-border-default rounded-[var(--radius-small)] hover:border-interactive hover:text-interactive transition-colors cursor-pointer">
              + Add Custom Line Item
            </button>
          </div>

          {/* Totals */}
          <div className="border-t border-border-subtle pt-4 space-y-2">
            <div className="flex justify-between text-[13px]"><span className="text-text-secondary">Subtotal</span><span className="font-medium text-text-primary">{formatCurrency(quoteTotal)}</span></div>
            <div className="flex justify-between text-[13px]"><span className="text-text-secondary">Tax (13%)</span><span className="font-medium text-text-primary">{formatCurrency(tax)}</span></div>
            <div className="flex justify-between text-[16px] font-bold pt-2 border-t border-border-subtle"><span className="text-text-primary">Total</span><span className="text-interactive">{formatCurrency(total)}</span></div>
            {deposit > 0 && (
              <div className="flex justify-between text-[12px]"><span className="text-text-tertiary">Deposit ({quote.depositPercent}%)</span><span className="font-medium text-text-secondary">{formatCurrency(deposit)}</span></div>
            )}
          </div>

          {/* Deposit */}
          <div className="flex items-center justify-between bg-surface-bg rounded-[var(--radius-small)] px-3 py-2 border border-border-subtle">
            <span className="text-[12px] text-text-secondary">Deposit required</span>
            <div className="flex items-center gap-1">
              <input type="number" min="0" max="100" value={quote.depositPercent} onChange={(e) => updateQuoteMeta({ depositPercent: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })} className="w-12 text-right text-[13px] font-medium text-text-primary bg-transparent border-b border-border-subtle focus:border-interactive outline-none" />
              <span className="text-[12px] text-text-tertiary">%</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1">Notes</p>
            {editingNotes ? (
              <textarea autoFocus value={quote.notes} onChange={(e) => updateQuoteMeta({ notes: e.target.value })} onBlur={() => setEditingNotes(false)} rows={3} className="w-full text-[13px] text-text-secondary bg-surface-bg border border-focus rounded-[var(--radius-small)] px-3 py-2 outline-none resize-none" />
            ) : (
              <p onClick={() => setEditingNotes(true)} className="text-[13px] text-text-secondary cursor-pointer hover:text-text-primary transition-colors min-h-[20px]">{quote.notes || "Add notes for the client..."}</p>
            )}
          </div>

          {/* AI Insights sidebar */}
          {insights.length > 0 && (
            <div className="bg-[var(--jb-informative-surface)]/30 border border-[var(--jb-informative)]/15 rounded-[var(--radius-base)] p-4">
              <p className="text-[11px] font-semibold text-[var(--jb-informative)] uppercase tracking-wider mb-2">Quote intelligence</p>
              <div className="space-y-2.5">
                {insights.map((insight, i) => (
                  <div key={i} className="text-[12px]">
                    <div className="flex items-start gap-1.5">
                      <span className="flex-shrink-0 mt-0.5">{insight.type === "tip" ? "💡" : insight.type === "upsell" ? "📦" : insight.type === "urgency" ? "⚡" : "👥"}</span>
                      <div>
                        <p className="font-semibold text-text-primary">{insight.title}</p>
                        <p className="text-text-secondary mt-0.5">{insight.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-border-subtle bg-surface px-5 py-3 flex gap-2">
        <button onClick={handleSend} disabled={quote.items.length === 0} className="flex-1 h-[44px] bg-interactive text-white text-[14px] font-bold rounded-[var(--radius-base)] hover:bg-interactive-hover transition-colors cursor-pointer shadow-[var(--shadow-base)] disabled:opacity-30 disabled:cursor-not-allowed">Send to Client</button>
        <button onClick={() => setViewMode("client")} className="h-[44px] px-4 text-[13px] font-semibold text-interactive border border-interactive/30 rounded-[var(--radius-base)] hover:bg-interactive-muted transition-colors cursor-pointer">Preview</button>
      </div>
    </div>
  );
}

/* ─── Quote Line Item Row ─── */

function QuoteLineItemRow({
  item, index, isExpanded, onToggleExpand, onUpdateItem, onRemove, onTierSelect,
  isDragging, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  item: QuoteLineItem;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateItem: (updates: Partial<QuoteLineItem>) => void;
  onRemove: () => void;
  onTierSelect: (tierId: string) => void;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [nameVal, setNameVal] = useState(item.service.name);
  const [priceVal, setPriceVal] = useState(String(item.adjustedPrice));
  const svc = item.service;
  const hasTiers = item.optionTiers && item.optionTiers.length > 0;
  const totals = svc.priceMode === "calculated" ? calcServiceTotals(svc) : null;
  const isCosted = svc.priceMode === "calculated" && (svc.materials.length > 0 || svc.labor.length > 0);
  const margin = item.adjustedPrice > 0 && totals ? Math.round(((item.adjustedPrice - totals.rawCost) / item.adjustedPrice) * 100) : 0;
  const lineTotal = item.adjustedPrice * item.quantity;
  const selectedTier = item.selectedTierId && item.optionTiers ? item.optionTiers.find((t) => t.id === item.selectedTierId) : null;

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      onDragEnd={onDragEnd}
      className={`bg-surface-bg rounded-[var(--radius-base)] border transition-all ${isDragOver ? "border-interactive ring-1 ring-interactive/20" : "border-border-subtle"} ${isDragging ? "opacity-40 scale-[0.98]" : ""}`}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-3 py-3">
        {/* Grip */}
        <div className="cursor-grab text-text-tertiary hover:text-text-secondary flex-shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" /></svg>
        </div>

        {/* Image */}
        {svc.imageUrl ? (
          <img src={svc.imageUrl} alt="" className="w-10 h-10 rounded-[var(--radius-small)] object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-[var(--radius-small)] bg-surface border border-border-subtle flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-text-tertiary"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
        )}

        {/* Name and details */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input autoFocus value={nameVal} onChange={(e) => setNameVal(e.target.value)} onBlur={() => { onUpdateItem({ service: { ...svc, name: nameVal } }); setEditingName(false); }} onKeyDown={(e) => { if (e.key === "Enter") { onUpdateItem({ service: { ...svc, name: nameVal } }); setEditingName(false); }}} className="text-[14px] font-medium text-text-primary bg-transparent border-b border-focus outline-none w-full" />
          ) : (
            <p onClick={() => { setNameVal(svc.name); setEditingName(true); }} className="text-[14px] font-medium text-text-primary truncate cursor-pointer hover:text-interactive transition-colors">{svc.name}</p>
          )}
          {selectedTier && <span className="text-[11px] font-medium text-interactive">{selectedTier.label} tier</span>}
          {!selectedTier && svc.description && <p className="text-[11px] text-text-tertiary truncate">{svc.description}</p>}
        </div>

        {/* Qty controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onUpdateItem({ quantity: Math.max(1, item.quantity - 1) })} className="w-6 h-6 rounded border border-border-subtle flex items-center justify-center text-text-tertiary hover:text-text-primary hover:border-border-default cursor-pointer text-[14px]">-</button>
          <span className="w-6 text-center text-[13px] font-medium text-text-primary">{item.quantity}</span>
          <button onClick={() => onUpdateItem({ quantity: item.quantity + 1 })} className="w-6 h-6 rounded border border-border-subtle flex items-center justify-center text-text-tertiary hover:text-text-primary hover:border-border-default cursor-pointer text-[14px]">+</button>
        </div>

        {/* Price */}
        <div className="text-right flex-shrink-0 w-20">
          {editingPrice ? (
            <input autoFocus type="number" value={priceVal} onChange={(e) => setPriceVal(e.target.value)} onBlur={() => { onUpdateItem({ adjustedPrice: parseFloat(priceVal) || 0 }); setEditingPrice(false); }} onKeyDown={(e) => { if (e.key === "Enter") { onUpdateItem({ adjustedPrice: parseFloat(priceVal) || 0 }); setEditingPrice(false); }}} className="w-full text-right text-[14px] font-semibold text-text-primary bg-transparent border-b border-focus outline-none" />
          ) : (
            <p onClick={() => { setPriceVal(String(item.adjustedPrice)); setEditingPrice(true); }} className="text-[14px] font-semibold text-text-primary cursor-pointer hover:text-interactive transition-colors">{formatCurrency(lineTotal)}</p>
          )}
          {isCosted && <p className={`text-[11px] font-semibold ${margin >= 30 ? "text-interactive" : margin >= 15 ? "text-[var(--jb-warning-on-surface)]" : "text-destructive"}`}>{margin}% profit</p>}
        </div>

        {/* Expand/actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isCosted && (
            <button onClick={onToggleExpand} className="w-6 h-6 flex items-center justify-center text-text-tertiary hover:text-text-primary cursor-pointer transition-transform" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
          )}
          <button onClick={onRemove} className="w-6 h-6 flex items-center justify-center text-text-tertiary hover:text-destructive cursor-pointer">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* GBB Tiers */}
      {hasTiers && (
        <div className="px-3 pb-3">
          <div className="flex gap-1.5">
            {item.optionTiers!.map((tier) => {
              const isSelected = item.selectedTierId === tier.id;
              return (
                <button
                  key={tier.id}
                  onClick={() => onTierSelect(tier.id)}
                  className={`flex-1 px-2 py-1.5 rounded-[var(--radius-small)] text-[11px] font-medium border transition-all cursor-pointer ${isSelected ? "bg-interactive-muted border-interactive/30 text-interactive" : "bg-surface border-border-subtle text-text-secondary hover:border-border-default"}`}
                >
                  <p className="font-semibold">{tier.label}</p>
                  <p className={`${isSelected ? "text-interactive" : "text-text-tertiary"}`}>{formatCurrency(tier.price)}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Expanded cost breakdown */}
      {isExpanded && isCosted && totals && (
        <CostBreakdown item={item} totals={totals} onUpdateItem={onUpdateItem} />
      )}
    </div>
  );
}

/* ─── Cost Breakdown (internal) ─── */

function CostBreakdown({
  item,
  totals,
  onUpdateItem,
}: {
  item: QuoteLineItem;
  totals: ReturnType<typeof calcServiceTotals>;
  onUpdateItem: (updates: Partial<QuoteLineItem>) => void;
}) {
  const svc = item.service;
  const matPercent = totals.costTotal > 0 ? Math.round((totals.materialTotal / totals.costTotal) * 100) : 0;
  const labPercent = totals.costTotal > 0 ? Math.round((totals.laborTotal / totals.costTotal) * 100) : 0;
  const profitAmount = item.adjustedPrice - totals.rawCost;

  return (
    <div className="px-3 pb-3 border-t border-border-subtle mx-3">
      <div className="py-2">
        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">Cost breakdown (internal)</p>

        {/* Profit bar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-2 bg-border-subtle rounded-full overflow-hidden flex">
            <div className="bg-[var(--jb-informative)] h-full" style={{ width: `${matPercent}%` }} />
            <div className="bg-[var(--jb-warning)] h-full" style={{ width: `${labPercent}%` }} />
            <div className="bg-interactive h-full flex-1" />
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-[var(--jb-informative)]" />Mat</span>
            <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-[var(--jb-warning)]" />Lab</span>
            <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-interactive" />Profit</span>
          </div>
        </div>

        {/* Materials */}
        {svc.materials.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] font-semibold text-text-tertiary mb-1">Materials</p>
            {svc.materials.map((m) => {
              const override = item.materialOverrides?.[m.id];
              const qty = override?.quantity ?? m.quantity;
              return (
                <div key={m.id} className="flex items-center justify-between text-[12px] py-0.5">
                  <span className="text-text-secondary">{m.name}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={qty}
                      onChange={(e) => {
                        const newQty = parseInt(e.target.value) || 1;
                        const overrides = { ...item.materialOverrides, [m.id]: { quantity: newQty } };
                        onUpdateItem({ materialOverrides: overrides });
                      }}
                      className="w-8 text-right text-[11px] bg-transparent border-b border-transparent hover:border-border-subtle focus:border-interactive outline-none"
                      min="1"
                    />
                    <span className="text-text-tertiary">x {formatCurrency(m.unitCost)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Labor */}
        {svc.labor.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] font-semibold text-text-tertiary mb-1">Labor</p>
            {svc.labor.map((l) => {
              const override = item.laborOverrides?.[l.id];
              const hours = override?.estimatedHours ?? l.estimatedHours;
              return (
                <div key={l.id} className="flex items-center justify-between text-[12px] py-0.5">
                  <span className="text-text-secondary">{l.description}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={hours}
                      onChange={(e) => {
                        const newHours = parseFloat(e.target.value) || 0;
                        const overrides = { ...item.laborOverrides, [l.id]: { estimatedHours: newHours } };
                        onUpdateItem({ laborOverrides: overrides });
                      }}
                      className="w-10 text-right text-[11px] bg-transparent border-b border-transparent hover:border-border-subtle focus:border-interactive outline-none"
                      step="0.25"
                      min="0"
                    />
                    <span className="text-text-tertiary">h x {formatCurrency(l.hourlyRate)}/hr</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Totals */}
        <div className="flex items-center justify-between text-[12px] pt-2 border-t border-border-subtle">
          <span className="text-text-secondary">Cost: {formatCurrency(totals.rawCost)}</span>
          <span className="font-semibold text-interactive">Profit: {formatCurrency(profitAmount)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Client Preview ─── */

function ClientPreview({
  quote,
  total,
  tax,
  quoteTotal,
  deposit,
  onBack,
  onTierSelect,
}: {
  quote: NonNullable<ReturnType<typeof useStore.getState>["activeQuote"]>;
  total: number;
  tax: number;
  quoteTotal: number;
  deposit: number;
  onBack: () => void;
  onTierSelect: (itemIndex: number, tierId: string) => void;
}) {
  const [approved, setApproved] = useState(false);
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [changeMessage, setChangeMessage] = useState("");
  const biz = MOCK_BUSINESS;

  if (approved) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8">
        <div className="w-16 h-16 rounded-full bg-interactive-muted flex items-center justify-center mb-4 animate-in zoom-in">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-interactive"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 className="text-[20px] font-bold text-text-primary mb-1">Quote approved</h3>
        <p className="text-[14px] text-text-secondary mb-1">{quote.quoteNumber} for {quote.clientName}</p>
        <p className="text-[13px] text-text-tertiary mb-6">Confirmation sent to your email</p>
        <button onClick={onBack} className="text-[13px] font-medium text-interactive hover:underline cursor-pointer">Back to Internal View</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border-subtle">
        <button onClick={onBack} className="text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-[15px] font-semibold text-text-primary">Client preview</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="bg-surface border border-border-subtle rounded-[var(--radius-large)] m-4 overflow-hidden shadow-[var(--shadow-base)]">
          {/* Business header */}
          <div className="bg-surface-bg px-6 py-5 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              {biz.logo && <img src={biz.logo} alt="" className="w-10 h-10 rounded-full object-cover" />}
              <div>
                <h3 className="text-[16px] font-bold text-text-primary">{biz.name}</h3>
                <p className="text-[12px] text-text-tertiary">{biz.tagline}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 text-[12px] text-text-secondary">
              <span>{biz.phone}</span>
              <span>{biz.email}</span>
            </div>
          </div>

          {/* Quote meta */}
          <div className="flex items-center justify-between px-6 py-3 bg-surface border-b border-border-subtle text-[12px]">
            <div><span className="text-text-tertiary">Quote </span><span className="font-semibold text-text-primary">{quote.quoteNumber}</span></div>
            <div><span className="text-text-tertiary">Prepared for </span><span className="font-semibold text-text-primary">{quote.clientName}</span></div>
            <div><span className="text-text-tertiary">Date </span><span className="text-text-primary">{quote.date}</span></div>
          </div>

          {/* Line items */}
          <div className="px-6 py-5 space-y-6">
            {quote.items.map((item, i) => (
              <ClientLineItem key={i} item={item} index={i} onTierSelect={onTierSelect} />
            ))}
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="px-6 pb-4">
              <p className="text-[13px] text-text-secondary italic">{quote.notes}</p>
            </div>
          )}

          {/* Totals */}
          <div className="border-t-2 border-border-subtle px-6 py-4 space-y-2">
            <div className="flex justify-between text-[13px]"><span className="text-text-secondary">Subtotal</span><span className="font-medium">{formatCurrency(quoteTotal)}</span></div>
            <div className="flex justify-between text-[13px]"><span className="text-text-secondary">Tax</span><span className="font-medium">{formatCurrency(tax)}</span></div>
            <div className="flex justify-between text-[18px] font-bold pt-2 border-t border-border-subtle"><span>Total</span><span className="text-interactive">{formatCurrency(total)}</span></div>
            {deposit > 0 && (
              <div className="bg-surface-bg rounded-[var(--radius-small)] p-3 mt-2 text-[12px]">
                <p className="font-semibold text-text-primary">{quote.depositPercent}% deposit required</p>
                <p className="text-text-secondary">{formatCurrency(deposit)} due upon approval. Remainder on completion.</p>
              </div>
            )}
          </div>

          {/* Approval actions */}
          <div className="px-6 py-4 border-t border-border-subtle space-y-2">
            {requestingChanges ? (
              <div className="space-y-2">
                <textarea value={changeMessage} onChange={(e) => setChangeMessage(e.target.value)} placeholder="What would you like to change..." rows={3} className="w-full text-[13px] bg-surface-bg border border-border-default rounded-[var(--radius-small)] px-3 py-2 outline-none resize-none focus:border-interactive" />
                <div className="flex gap-2">
                  <button onClick={() => setRequestingChanges(false)} disabled={!changeMessage.trim()} className="flex-1 h-[40px] bg-interactive text-white text-[13px] font-bold rounded-[var(--radius-base)] hover:bg-interactive-hover cursor-pointer disabled:opacity-30">Send Request</button>
                  <button onClick={() => setRequestingChanges(false)} className="h-[40px] px-4 text-[13px] text-text-tertiary hover:text-text-primary cursor-pointer">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <button onClick={() => setApproved(true)} className="w-full h-[44px] bg-interactive text-white text-[14px] font-bold rounded-[var(--radius-base)] hover:bg-interactive-hover cursor-pointer shadow-[var(--shadow-base)]">Approve This Quote</button>
                <button onClick={() => setRequestingChanges(true)} className="w-full h-[36px] text-[13px] font-medium text-text-secondary hover:text-text-primary cursor-pointer">Request Changes</button>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-border-subtle text-[11px] text-text-tertiary text-center">
            Valid until {quote.validUntil} &middot; Licensed &middot; Insured &middot; {biz.licenseNumber}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Client Line Item ─── */

function ClientLineItem({
  item,
  index,
  onTierSelect,
}: {
  item: QuoteLineItem;
  index: number;
  onTierSelect: (itemIndex: number, tierId: string) => void;
}) {
  const svc = item.service;
  const proposal = generateProposalContent(svc);
  const hasTiers = item.optionTiers && item.optionTiers.length > 0;
  const selectedTier = item.selectedTierId ? item.optionTiers?.find((t) => t.id === item.selectedTierId) : null;
  const linePrice = selectedTier ? selectedTier.price * item.quantity : item.adjustedPrice * item.quantity;

  return (
    <div>
      {index > 0 && <hr className="border-border-subtle mb-6" />}
      <div className="flex gap-4">
        {svc.imageUrl && (
          <img src={svc.imageUrl} alt="" className="w-24 h-24 rounded-[var(--radius-base)] object-cover flex-shrink-0" />
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h4 className="text-[16px] font-bold text-text-primary">{svc.name}</h4>
            {!hasTiers && <span className="text-[16px] font-bold text-text-primary">{formatCurrency(linePrice)}</span>}
          </div>
          {item.quantity > 1 && <p className="text-[12px] text-text-tertiary">Qty: {item.quantity}</p>}
          <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">{proposal.scopeNarrative}</p>

          {proposal.includes.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1">What&apos;s included</p>
              <div className="space-y-0.5">
                {proposal.includes.map((inc, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[12px] text-text-primary">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-interactive flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {inc}
                  </div>
                ))}
              </div>
            </div>
          )}

          {proposal.excludes.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1">Not included</p>
              <div className="space-y-0.5">
                {proposal.excludes.map((exc, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[12px] text-text-tertiary">
                    <span className="flex-shrink-0">-</span>
                    {exc}
                  </div>
                ))}
              </div>
            </div>
          )}

          {proposal.timeline && (
            <div className="flex items-center gap-1.5 mt-3 text-[12px] text-text-secondary">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              {proposal.timeline}
            </div>
          )}

          {/* Variant callouts */}
          {item.variantSelections && Object.keys(item.variantSelections).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(item.variantSelections).map(([matId, variantId]) => {
                const mat = svc.materials.find((m) => m.id === matId);
                const variant = mat?.variants?.find((v) => v.id === variantId);
                if (!variant) return null;
                return <span key={matId} className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-interactive-muted text-interactive border border-interactive/20">{variant.name}</span>;
              })}
            </div>
          )}
        </div>
      </div>

      {/* GBB Tier cards */}
      {hasTiers && (
        <div className="mt-4">
          <p className="text-[12px] font-semibold text-text-secondary mb-2">Choose your option</p>
          <div className="grid grid-cols-1 gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(item.optionTiers!.length, 3)}, 1fr)` }}>
            {item.optionTiers!.map((tier, ti) => {
              const isSelected = item.selectedTierId === tier.id;
              const isMiddle = item.optionTiers!.length >= 3 && ti === 1;
              return (
                <button
                  key={tier.id}
                  onClick={() => onTierSelect(index, tier.id)}
                  className={`relative p-3 rounded-[var(--radius-base)] border-2 text-left transition-all cursor-pointer ${isSelected ? "border-interactive bg-interactive-muted" : "border-border-subtle hover:border-border-default"}`}
                >
                  {isMiddle && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-interactive text-white">Most popular</span>}
                  <p className="text-[13px] font-bold text-text-primary">{tier.label}</p>
                  <p className="text-[11px] text-text-secondary mt-0.5">{tier.description}</p>
                  <div className="space-y-0.5 mt-2">
                    {tier.highlights.map((h, hi) => (
                      <div key={hi} className="flex items-center gap-1 text-[11px] text-text-primary">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-interactive flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        {h}
                      </div>
                    ))}
                  </div>
                  <p className="text-[16px] font-bold text-text-primary mt-2">{formatCurrency(tier.price)}</p>
                  {isSelected && <span className="inline-block mt-1 text-[11px] font-semibold text-interactive">Selected</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
