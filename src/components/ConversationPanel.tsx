"use client";

import { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/formatCurrency";
import { processMessage } from "@/lib/conversationEngine";
import type { QuoteMutation } from "@/lib/conversationEngine";
import { MessageCard } from "./MessageCard";
import { ActionFeed } from "./ActionFeed";
import type { StarterKit } from "@/lib/aiSuggestions";
import type { MaterialItem, LaborInput, QuoteLineItem } from "@/lib/mockData";

export function ConversationPanel() {
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingKit = useRef<StarterKit | null>(null);

  const messages = useStore((s) => s.messages);
  const setupComplete = useStore((s) => s.setupComplete);
  const services = useStore((s) => s.services);
  const industry = useStore((s) => s.industry);
  const addMessage = useStore((s) => s.addMessage);
  const addService = useStore((s) => s.addService);
  const bulkImportMaterials = useStore((s) => s.bulkImportMaterials);
  const bulkImportLaborRates = useStore((s) => s.bulkImportLaborRates);
  const addPackage = useStore((s) => s.addPackage);
  const markSetupComplete = useStore((s) => s.markSetupComplete);
  const setIndustry = useStore((s) => s.setIndustry);
  const setContextPanel = useStore((s) => s.setContextPanel);
  const getBookHealth = useStore((s) => s.getBookHealth);
  const activeQuote = useStore((s) => s.activeQuote);
  const setActiveQuote = useStore((s) => s.setActiveQuote);
  const createNewQuote = useStore((s) => s.createNewQuote);
  const addQuoteItem = useStore((s) => s.addQuoteItem);
  const removeQuoteItem = useStore((s) => s.removeQuoteItem);
  const updateQuoteItem = useStore((s) => s.updateQuoteItem);
  const updateQuoteMeta = useStore((s) => s.updateQuoteMeta);
  const saveQuote = useStore((s) => s.saveQuote);

  useEffect(() => {
    if (showChat) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isThinking, showChat]);

  useEffect(() => {
    if (messages.length === 0) {
      addMessage({
        role: "agent",
        content:
          "I'm your AI pricing partner. Tell me what kind of work you do and I'll build your pricebook.",
        cardType: "text",
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activateChat = useCallback(() => {
    setShowChat(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const applyQuoteMutation = useCallback((mutation: QuoteMutation) => {
    const quote = useStore.getState().activeQuote;
    if (!quote && mutation.type !== "send") return;

    switch (mutation.type) {
      case "add-service": {
        const svc = services.find((s) => s.id === mutation.serviceId);
        if (svc && quote) {
          const hasTiers = svc.optionTiers && svc.optionTiers.length >= 2;
          const selectedTier = hasTiers ? svc.optionTiers![Math.min(1, svc.optionTiers!.length - 1)] : null;
          addQuoteItem({
            service: svc,
            quantity: 1,
            adjustedPrice: selectedTier ? selectedTier.price : svc.unitPrice,
            optionTiers: svc.optionTiers,
            selectedTierId: selectedTier?.id,
          });
        }
        break;
      }
      case "remove-service": {
        if (!quote) break;
        const idx = quote.items.findIndex((li) => li.service.name.toLowerCase().includes(mutation.serviceName.toLowerCase()));
        if (idx >= 0) removeQuoteItem(idx);
        break;
      }
      case "set-quantity": {
        if (!quote) break;
        if (mutation.serviceName) {
          const idx = quote.items.findIndex((li) => li.service.name.toLowerCase().includes(mutation.serviceName.toLowerCase()));
          if (idx >= 0) updateQuoteItem(idx, { quantity: mutation.quantity });
        } else if (quote.items.length === 1) {
          updateQuoteItem(0, { quantity: mutation.quantity });
        }
        break;
      }
      case "set-labor-hours": {
        if (!quote) break;
        const idx = mutation.serviceName
          ? quote.items.findIndex((li) => li.service.name.toLowerCase().includes(mutation.serviceName.toLowerCase()))
          : 0;
        if (idx >= 0) {
          const item = quote.items[idx];
          const overrides: Record<string, { estimatedHours: number }> = {};
          for (const l of item.service.labor) {
            overrides[l.id] = { estimatedHours: mutation.hours };
          }
          updateQuoteItem(idx, { laborOverrides: overrides });
        }
        break;
      }
      case "set-deposit":
        updateQuoteMeta({ depositPercent: mutation.percent });
        break;
      case "set-notes":
        updateQuoteMeta({ notes: mutation.notes });
        break;
      case "bundle": {
        if (!quote) break;
        const groupId = `pkg-${Date.now()}`;
        quote.items.forEach((item, idx) => {
          const discountedPrice = Math.round(item.adjustedPrice * (1 - mutation.discount / 100));
          updateQuoteItem(idx, { packageGroupId: groupId, packageName: "Bundle", adjustedPrice: discountedPrice });
        });
        break;
      }
      case "select-tier": {
        if (!quote) break;
        const idx = mutation.serviceName
          ? quote.items.findIndex((li) => li.service.name.toLowerCase().includes(mutation.serviceName.toLowerCase()))
          : quote.items.findIndex((li) => li.optionTiers && li.optionTiers.length > 0);
        if (idx >= 0) {
          const item = quote.items[idx];
          const tier = item.optionTiers?.find((t) => t.label.toLowerCase().includes(mutation.tierLabel.toLowerCase()));
          if (tier) updateQuoteItem(idx, { selectedTierId: tier.id, adjustedPrice: tier.price });
        }
        break;
      }
      case "send":
        updateQuoteMeta({ status: "sent" });
        saveQuote();
        break;
    }
  }, [services, addQuoteItem, removeQuoteItem, updateQuoteItem, updateQuoteMeta, saveQuote]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isThinking) return;

    if (!showChat) setShowChat(true);

    setInput("");
    addMessage({ role: "user", content: text });
    setIsThinking(true);

    try {
      const response = await processMessage(text, {
        setupComplete,
        serviceCount: services.length,
        industry,
        services,
        activeQuote,
      });

      if (response.starterKit) {
        pendingKit.current = response.starterKit;
        const trade =
          response.starterKit.trade.charAt(0).toUpperCase() +
          response.starterKit.trade.slice(1);
        setIndustry(trade);
      }

      if (response.quoteData) {
        setActiveQuote(response.quoteData);
        setContextPanel({ type: "quote-workspace" });
      }

      if (response.quoteMutation) {
        applyQuoteMutation(response.quoteMutation);
        if (response.quoteMutation.type === "send") {
          setContextPanel({ type: "quote-workspace" });
        }
      }

      for (const msg of response.messages) {
        addMessage(msg);
      }
    } catch {
      addMessage({
        role: "agent",
        content: "Something went wrong on our end. Try again in a moment.",
        cardType: "text",
      });
    } finally {
      setIsThinking(false);
      inputRef.current?.focus();
    }
  }, [input, isThinking, showChat, setupComplete, services, industry, activeQuote, addMessage, setIndustry, setActiveQuote, setContextPanel, applyQuoteMutation]);

  const handleApproveKit = useCallback(
    (removedServices: string[], removedMaterials: string[]) => {
      const kit = pendingKit.current;
      if (!kit) return;

      const removedSvcSet = new Set(removedServices);
      const removedMatSet = new Set(removedMaterials);

      const mats = kit.materials.filter((m) => !removedMatSet.has(m.name));
      const rates = kit.laborRates;
      const svcs = kit.services.filter((s) => !removedSvcSet.has(s.name));

      bulkImportMaterials(
        mats.map((m) => ({
          name: m.name,
          unitCost: m.unitCost,
          unitType: m.unitType,
          markup: m.markup,
          category: m.category,
        }))
      );

      bulkImportLaborRates(
        rates.map((r) => ({
          description: r.description,
          hourlyRate: r.hourlyRate,
          costRate: r.costRate,
        }))
      );

      for (const svc of svcs) {
        addService({
          name: svc.name,
          description: svc.description,
          imageUrl: svc.imageUrl,
          unitType: svc.unitType,
          unitPrice: 0,
          taxable: true,
          priceMode: "calculated",
          category: svc.category,
          materials: svc.materials.map((m, i) => ({
            id: `m-${Date.now()}-${i}`,
            name: m.name,
            unitCost: m.unitCost,
            quantity: m.quantity,
            unitType: m.unitType,
            markup: m.markup,
          })),
          labor: svc.labor.map((l, i) => ({
            id: `l-${Date.now()}-${i}`,
            description: l.description,
            hourlyRate: l.hourlyRate,
            estimatedHours: l.estimatedHours,
            costRate: l.costRate,
          })),
          markupRule: svc.markupRule,
        });
      }

      for (const pkg of kit.packages) {
        addPackage({
          name: pkg.name,
          description: pkg.description,
          serviceIds: [],
          discountPercent: pkg.discountPercent,
          category: pkg.category,
        });
      }

      markSetupComplete();
      pendingKit.current = null;
      setShowChat(false);

      addMessage({
        role: "agent",
        content: `Added ${svcs.length} services, ${mats.length} materials, and ${rates.length} labor rates to your pricebook.`,
        cardType: "status-update",
      });
    },
    [addService, bulkImportMaterials, bulkImportLaborRates, addPackage, markSetupComplete, addMessage]
  );

  const handleApproveService = useCallback(
    (data: Record<string, unknown>) => {
      const materials = (data.materials || []) as MaterialItem[];
      const labor = (data.labor || []) as LaborInput[];

      addService({
        name: data.name as string,
        description: data.description as string,
        unitType: "flat",
        unitPrice: 0,
        taxable: true,
        priceMode: "calculated",
        materials,
        labor,
        markupRule: (data.markup as { type: "percentage" | "fixed"; value: number }) || {
          type: "percentage",
          value: 0,
        },
      });

      addMessage({
        role: "agent",
        content: `Added "${data.name}" to your catalog. Ready to use in quotes.`,
        cardType: "status-update",
      });
    },
    [addService, addMessage]
  );

  const handleBuildQuote = useCallback(
    (clientName: string, serviceIds: string[]) => {
      const selectedServices = services.filter((s) => serviceIds.includes(s.id));
      const items: QuoteLineItem[] = selectedServices.map((svc) => {
        const hasTiers = svc.optionTiers && svc.optionTiers.length >= 2;
        const selectedTier = hasTiers ? svc.optionTiers![Math.min(1, svc.optionTiers!.length - 1)] : null;
        return {
          service: svc,
          quantity: 1,
          adjustedPrice: selectedTier ? selectedTier.price : svc.unitPrice,
          optionTiers: svc.optionTiers,
          selectedTierId: selectedTier?.id,
        };
      });

      const quote = createNewQuote(clientName, items);
      const subtotal = items.reduce((sum, li) => sum + li.adjustedPrice * li.quantity, 0);

      setContextPanel({ type: "quote-workspace" });

      addMessage({
        role: "agent",
        content: `Quote ${quote.quoteNumber} for ${clientName} is ready with ${items.length} service${items.length > 1 ? "s" : ""} totaling ${formatCurrency(subtotal)}. Review it in the panel.`,
        cardType: "status-update",
      });
    },
    [services, setContextPanel, addMessage, createNewQuote]
  );

  const handleEditService = useCallback(
    (data: Record<string, unknown>) => {
      if (data.id) {
        setContextPanel({ type: "service-detail", data: { id: data.id } });
      } else {
        const svc = services.find((s) => s.name === data.name);
        if (svc) setContextPanel({ type: "service-detail", data: { id: svc.id } });
      }
    },
    [services, setContextPanel]
  );

  const handleOpenCatalog = useCallback(() => {
    setContextPanel({ type: "catalog" });
  }, [setContextPanel]);

  const handleOpenQuote = useCallback(
    (quoteId: string) => {
      const state = useStore.getState();
      const quote = state.savedQuotes.find((q) => q.id === quoteId) || (state.activeQuote?.id === quoteId ? state.activeQuote : null);
      if (quote) {
        setActiveQuote(quote);
        setContextPanel({ type: "quote-workspace" });
      }
    },
    [setActiveQuote, setContextPanel]
  );

  const handleHealthCheck = useCallback(() => {
    const issues = getBookHealth();
    if (issues.length === 0) {
      addMessage({
        role: "agent",
        content: "Your pricebook looks healthy. All services are costed, margins are solid, and pricing is competitive.",
        cardType: "status-update",
      });
    } else {
      for (const issue of issues.slice(0, 5)) {
        const icon = issue.severity === "warning" ? "⚠️" : issue.severity === "opportunity" ? "💡" : "ℹ️";
        const actionText = issue.action || "View";

        if (issue.type === "unused-material") {
          addMessage({
            role: "agent",
            content: `${icon} ${issue.title}: ${issue.message}`,
            cardType: "text",
            cardData: { action: "open-catalog", actionLabel: actionText },
          });
        } else if (issue.relatedIds?.length) {
          addMessage({
            role: "agent",
            content: `${icon} ${issue.title}: ${issue.message}`,
            cardType: "text",
            cardData: { action: "view-service", serviceId: issue.relatedIds[0], actionLabel: actionText },
          });
        } else {
          addMessage({
            role: "agent",
            content: `${icon} ${issue.title}: ${issue.message}`,
            cardType: "text",
          });
        }
      }
    }
  }, [getBookHealth, addMessage]);

  if (!setupComplete) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
          {messages.map((msg) => (
            <MessageCard
              key={msg.id}
              message={msg}
              onApproveKit={handleApproveKit}
              onApproveService={handleApproveService}
              onOpenCatalog={handleOpenCatalog}
              onHealthCheck={handleHealthCheck}
              onBuildQuote={handleBuildQuote}
              onEditService={handleEditService}
              onOpenQuote={handleOpenQuote}
            />
          ))}
          {isThinking && <ThinkingIndicator />}
          <div ref={bottomRef} />
        </div>
        <ChatInput
          ref={inputRef}
          value={input}
          onChange={setInput}
          onSend={send}
          disabled={isThinking}
          placeholder="Tell me about your business..."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <ActionFeed />

        {showChat && (
          <div className="border-t border-border-subtle">
            <button
              onClick={() => setShowChat(false)}
              className="w-full px-5 py-2 text-[12px] font-medium text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
              Hide Conversation
            </button>
            <div className="px-5 py-4 space-y-4 max-h-[50vh] overflow-y-auto">
              {messages.slice(-20).map((msg) => (
                <MessageCard
                  key={msg.id}
                  message={msg}
                  onApproveKit={handleApproveKit}
                  onApproveService={handleApproveService}
                  onOpenCatalog={handleOpenCatalog}
                  onHealthCheck={handleHealthCheck}
                  onBuildQuote={handleBuildQuote}
                  onEditService={handleEditService}
                  onOpenQuote={handleOpenQuote}
                />
              ))}
              {isThinking && <ThinkingIndicator />}
              <div ref={bottomRef} />
            </div>
          </div>
        )}
      </div>

      <ChatInput
        ref={inputRef}
        value={input}
        onChange={setInput}
        onSend={send}
        onFocus={activateChat}
        disabled={isThinking}
        placeholder="Build a quote, add a service, check margins..."
        showQuickActions={!showChat}
      />
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex gap-3 max-w-[85%]">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-interactive flex items-center justify-center">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
          <path fill="white" d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
        </svg>
      </div>
      <div className="bg-surface border border-border-subtle rounded-[var(--radius-large)] px-4 py-3 shadow-[var(--shadow-low)]">
        <div className="flex gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: "Build a Quote", prompt: "Build a quote for " },
  { label: "Add a Service", prompt: "Add a new service for " },
  { label: "Check Margins", prompt: "Run a health check on my pricebook" },
];

const ChatInput = forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (v: string) => void;
    onSend: () => void;
    onFocus?: () => void;
    disabled: boolean;
    placeholder: string;
    showQuickActions?: boolean;
  }
>(function ChatInput({ value, onChange, onSend, onFocus, disabled, placeholder, showQuickActions }, ref) {
  const textareaRef = ref as React.RefObject<HTMLTextAreaElement | null>;

  const handleQuickAction = (prompt: string) => {
    onChange(prompt);
    onFocus?.();
    setTimeout(() => textareaRef?.current?.focus(), 50);
  };

  return (
    <div className="border-t border-border-subtle bg-surface px-5 py-3">
      {showQuickActions && (
        <div className="flex gap-1.5 mb-2">
          {QUICK_ACTIONS.map((qa) => (
            <button key={qa.label} onClick={() => handleQuickAction(qa.prompt)} className="h-[28px] px-3 text-[12px] font-medium text-text-secondary bg-surface-bg border border-border-subtle rounded-full hover:border-interactive/30 hover:text-interactive transition-all cursor-pointer">{qa.label}</button>
          ))}
        </div>
      )}
      <div className="flex gap-3 items-end">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none bg-surface-bg border border-border-default rounded-[var(--radius-base)] px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-interactive/20 focus:border-interactive transition-all"
        />
        <button
          onClick={onSend}
          disabled={!value.trim() || disabled}
          className="flex-shrink-0 w-10 h-10 rounded-[var(--radius-base)] bg-interactive text-white flex items-center justify-center hover:bg-interactive-hover transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed shadow-[var(--shadow-low)]"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
});
