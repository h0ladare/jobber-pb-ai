import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Service, ServicePackage, QuoteAssembly, QuoteLineItem } from "./mockData";
import {
  MOCK_SERVICES,
  MOCK_PACKAGES,
  calcServicePrice,
  calcServiceTotals,
} from "./mockData";
import { getAreaAverage } from "./aiSuggestions";

// ── Types ──

export type AutonomyLevel = 0 | 1 | 2 | 3;
// 0 = always ask, 1 = propose and wait, 2 = do and notify, 3 = do silently

export type ActionType =
  | "create-service"
  | "update-pricing"
  | "create-package"
  | "create-quote"
  | "adjust-margins"
  | "bulk-import"
  | "health-fix";

export type ActionStatus = "proposed" | "approved" | "rejected" | "auto-applied";

export interface ActionRecord {
  id: string;
  type: ActionType;
  status: ActionStatus;
  title: string;
  description: string;
  impact?: string;
  timestamp: number;
  rejectionReason?: string;
  data?: Record<string, unknown>;
}

export type MessageRole = "agent" | "user" | "system";
export type CardType =
  | "text"
  | "action-proposal"
  | "insight"
  | "trust-calibration"
  | "status-update"
  | "learning-confirmation"
  | "service-preview"
  | "quote-draft";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  cardType?: CardType;
  cardData?: Record<string, unknown>;
}

export interface CatalogMaterial {
  id: string;
  name: string;
  unitCost: number;
  unitType: string;
  markup: { type: "percentage" | "fixed"; value: number };
  category?: string;
}

export interface CatalogLaborRate {
  id: string;
  description: string;
  hourlyRate: number;
  costRate?: number;
}

export interface BookHealthIssue {
  type: string;
  severity: "warning" | "info" | "opportunity";
  title: string;
  message: string;
  impact?: string;
  action?: string;
  relatedIds?: string[];
}

interface AppState {
  // ── Catalog data ──
  services: Service[];
  packages: ServicePackage[];
  materials: CatalogMaterial[];
  laborRates: CatalogLaborRate[];
  setupComplete: boolean;

  // ── Conversation ──
  messages: ChatMessage[];
  contextPanel: { type: string; data?: Record<string, unknown> } | null;

  // ── Action feed ──
  actions: ActionRecord[];
  autonomyPrefs: Record<ActionType, AutonomyLevel>;

  // ── Quoting ──
  activeQuote: QuoteAssembly | null;
  savedQuotes: QuoteAssembly[];
  quoteCounter: number;

  // ── Brand ──
  brandValues: string[];
  industry: string;
}

interface AppActions {
  // ── Catalog CRUD ──
  addService: (partial: Omit<Service, "id">) => Service;
  updateService: (id: string, updates: Partial<Service>) => void;
  deleteService: (id: string) => void;
  addPackage: (partial: Omit<ServicePackage, "id">) => ServicePackage;
  deletePackage: (id: string) => void;
  addMaterial: (partial: Omit<CatalogMaterial, "id">) => void;
  updateMaterial: (id: string, updates: Partial<CatalogMaterial>) => void;
  deleteMaterial: (id: string) => void;
  addLaborRate: (partial: Omit<CatalogLaborRate, "id">) => void;
  updateLaborRate: (id: string, updates: Partial<CatalogLaborRate>) => void;
  deleteLaborRate: (id: string) => void;
  bulkImportMaterials: (mats: Omit<CatalogMaterial, "id">[]) => void;
  bulkImportLaborRates: (rates: Omit<CatalogLaborRate, "id">[]) => void;
  markSetupComplete: () => void;

  // ── Conversation ──
  addMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearMessages: () => void;
  setContextPanel: (ctx: { type: string; data?: Record<string, unknown> } | null) => void;

  // ── Actions ──
  proposeAction: (action: Omit<ActionRecord, "id" | "timestamp" | "status">) => string;
  approveAction: (id: string) => void;
  rejectAction: (id: string, reason: string) => void;
  setAutonomy: (type: ActionType, level: AutonomyLevel) => void;

  // ── Quoting ──
  setActiveQuote: (quote: QuoteAssembly | null) => void;
  updateQuoteItem: (index: number, updates: Partial<QuoteLineItem>) => void;
  addQuoteItem: (item: QuoteLineItem) => void;
  removeQuoteItem: (index: number) => void;
  reorderQuoteItems: (fromIndex: number, toIndex: number) => void;
  updateQuoteMeta: (updates: Partial<Pick<QuoteAssembly, "clientName" | "clientEmail" | "clientPhone" | "notes" | "depositPercent" | "internalNotes" | "status">>) => void;
  saveQuote: () => void;
  createNewQuote: (clientName: string, items: QuoteLineItem[], notes?: string) => QuoteAssembly;

  // ── Brand ──
  setBrandValues: (values: string[]) => void;
  setIndustry: (industry: string) => void;

  // ── Health ──
  getBookHealth: () => BookHealthIssue[];

  // ── Reset ──
  reset: () => void;
}

function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildDefaultMaterials(): CatalogMaterial[] {
  const seen = new Map<string, CatalogMaterial>();
  for (const svc of MOCK_SERVICES) {
    for (const m of svc.materials) {
      if (!m.name.trim()) continue;
      const key = m.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.set(key, {
          id: m.id,
          name: m.name,
          unitCost: m.unitCost,
          unitType: m.unitType,
          markup: { ...m.markup },
          category: svc.category,
        });
      }
    }
  }
  return Array.from(seen.values());
}

function buildDefaultLaborRates(): CatalogLaborRate[] {
  const seen = new Map<string, CatalogLaborRate>();
  for (const svc of MOCK_SERVICES) {
    for (const l of svc.labor) {
      if (!l.description.trim()) continue;
      const key = l.description.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.set(key, {
          id: l.id,
          description: l.description,
          hourlyRate: l.hourlyRate,
          costRate: l.costRate,
        });
      }
    }
  }
  return Array.from(seen.values());
}

const DEFAULT_AUTONOMY: Record<ActionType, AutonomyLevel> = {
  "create-service": 1,
  "update-pricing": 1,
  "create-package": 1,
  "create-quote": 1,
  "adjust-margins": 0,
  "bulk-import": 0,
  "health-fix": 1,
};

const initialState: AppState = {
  services: [],
  packages: [],
  materials: [],
  laborRates: [],
  setupComplete: false,
  messages: [],
  contextPanel: null,
  actions: [],
  autonomyPrefs: { ...DEFAULT_AUTONOMY },
  activeQuote: null,
  savedQuotes: [],
  quoteCounter: 0,
  brandValues: [],
  industry: "",
};

export const useStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ── Catalog CRUD ──

      addService: (partial) => {
        const id = genId("svc");
        const service: Service = {
          ...partial,
          id,
          unitPrice: partial.unitPrice || calcServicePrice(partial),
        };
        set((s) => ({ services: [...s.services, service] }));
        return service;
      },

      updateService: (id, updates) => {
        set((s) => ({
          services: s.services.map((svc) => {
            if (svc.id !== id) return svc;
            const updated = { ...svc, ...updates };
            if (updates.materials || updates.labor || updates.markupRule) {
              if (updated.priceMode === "calculated") {
                updated.unitPrice = calcServicePrice(updated);
              }
            }
            return updated;
          }),
        }));
      },

      deleteService: (id) => {
        set((s) => ({
          services: s.services.filter((svc) => svc.id !== id),
          packages: s.packages.map((p) => ({
            ...p,
            serviceIds: p.serviceIds.filter((sid) => sid !== id),
          })),
        }));
      },

      addPackage: (partial) => {
        const id = genId("pkg");
        const pkg: ServicePackage = { ...partial, id };
        set((s) => ({ packages: [...s.packages, pkg] }));
        return pkg;
      },

      deletePackage: (id) => {
        set((s) => ({
          packages: s.packages.filter((p) => p.id !== id),
        }));
      },

      addMaterial: (partial) => {
        const mat: CatalogMaterial = { ...partial, id: genId("mat") };
        set((s) => ({ materials: [...s.materials, mat] }));
      },

      updateMaterial: (id, updates) => {
        set((s) => ({
          materials: s.materials.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        }));
      },

      deleteMaterial: (id) => {
        set((s) => ({
          materials: s.materials.filter((m) => m.id !== id),
        }));
      },

      addLaborRate: (partial) => {
        const rate: CatalogLaborRate = { ...partial, id: genId("labor") };
        set((s) => ({ laborRates: [...s.laborRates, rate] }));
      },

      updateLaborRate: (id, updates) => {
        set((s) => ({
          laborRates: s.laborRates.map((l) =>
            l.id === id ? { ...l, ...updates } : l
          ),
        }));
      },

      deleteLaborRate: (id) => {
        set((s) => ({
          laborRates: s.laborRates.filter((l) => l.id !== id),
        }));
      },

      bulkImportMaterials: (mats) => {
        const newMats = mats.map((m) => ({ ...m, id: genId("mat") }));
        set((s) => ({ materials: [...s.materials, ...newMats] }));
      },

      bulkImportLaborRates: (rates) => {
        const newRates = rates.map((r) => ({ ...r, id: genId("labor") }));
        set((s) => ({ laborRates: [...s.laborRates, ...newRates] }));
      },

      markSetupComplete: () => set({ setupComplete: true }),

      // ── Conversation ──

      addMessage: (msg) => {
        const message: ChatMessage = {
          ...msg,
          id: genId("msg"),
          timestamp: Date.now(),
        };
        set((s) => ({ messages: [...s.messages, message] }));
      },

      clearMessages: () => set({ messages: [] }),

      setContextPanel: (ctx) => set({ contextPanel: ctx }),

      // ── Actions ──

      proposeAction: (action) => {
        const id = genId("act");
        const record: ActionRecord = {
          ...action,
          id,
          timestamp: Date.now(),
          status: "proposed",
        };
        set((s) => ({ actions: [record, ...s.actions] }));
        return id;
      },

      approveAction: (id) => {
        set((s) => ({
          actions: s.actions.map((a) =>
            a.id === id ? { ...a, status: "approved" as ActionStatus } : a
          ),
        }));
      },

      rejectAction: (id, reason) => {
        set((s) => ({
          actions: s.actions.map((a) =>
            a.id === id
              ? { ...a, status: "rejected" as ActionStatus, rejectionReason: reason }
              : a
          ),
        }));
      },

      setAutonomy: (type, level) => {
        set((s) => ({
          autonomyPrefs: { ...s.autonomyPrefs, [type]: level },
        }));
      },

      // ── Quoting ──

      setActiveQuote: (quote) => set({ activeQuote: quote }),

      updateQuoteItem: (index, updates) => {
        set((s) => {
          if (!s.activeQuote) return s;
          const items = [...s.activeQuote.items];
          items[index] = { ...items[index], ...updates };
          return { activeQuote: { ...s.activeQuote, items } };
        });
      },

      addQuoteItem: (item) => {
        set((s) => {
          if (!s.activeQuote) return s;
          return { activeQuote: { ...s.activeQuote, items: [...s.activeQuote.items, item] } };
        });
      },

      removeQuoteItem: (index) => {
        set((s) => {
          if (!s.activeQuote) return s;
          return { activeQuote: { ...s.activeQuote, items: s.activeQuote.items.filter((_, i) => i !== index) } };
        });
      },

      reorderQuoteItems: (fromIndex, toIndex) => {
        set((s) => {
          if (!s.activeQuote) return s;
          const items = [...s.activeQuote.items];
          const [moved] = items.splice(fromIndex, 1);
          items.splice(toIndex, 0, moved);
          return { activeQuote: { ...s.activeQuote, items } };
        });
      },

      updateQuoteMeta: (updates) => {
        set((s) => {
          if (!s.activeQuote) return s;
          return { activeQuote: { ...s.activeQuote, ...updates } };
        });
      },

      saveQuote: () => {
        set((s) => {
          if (!s.activeQuote) return s;
          const existing = s.savedQuotes.findIndex((q) => q.id === s.activeQuote!.id);
          const saved = existing >= 0
            ? s.savedQuotes.map((q, i) => i === existing ? s.activeQuote! : q)
            : [...s.savedQuotes, s.activeQuote!];
          return { savedQuotes: saved };
        });
      },

      createNewQuote: (clientName, items, notes) => {
        const state = get();
        const counter = state.quoteCounter + 1;
        const now = new Date();
        const validDate = new Date(now);
        validDate.setDate(validDate.getDate() + 30);

        const quote: QuoteAssembly = {
          id: genId("quote"),
          quoteNumber: `Q-${now.getFullYear()}-${String(counter).padStart(4, "0")}`,
          status: "draft",
          clientName,
          date: now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
          validUntil: validDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
          items,
          notes: notes || "",
          depositPercent: 0,
        };

        set({ activeQuote: quote, quoteCounter: counter });
        return quote;
      },

      // ── Brand ──

      setBrandValues: (values) => set({ brandValues: values }),
      setIndustry: (industry) => set({ industry }),

      // ── Health ──

      getBookHealth: () => {
        const state = get();
        const issues: BookHealthIssue[] = [];

        const usedNames = new Set<string>();
        for (const svc of state.services) {
          for (const m of svc.materials) {
            usedNames.add(m.name.toLowerCase().trim());
          }
        }
        const unused = state.materials.filter(
          (m) => !usedNames.has(m.name.toLowerCase().trim())
        );
        if (unused.length > 0) {
          issues.push({
            type: "unused-material",
            severity: "info",
            title: `${unused.length} material${unused.length > 1 ? "s" : ""} sitting unused`,
            message: `${unused.map((m) => m.name).slice(0, 3).join(", ")} should be linked to services.`,
            action: "Link to services",
            relatedIds: unused.map((m) => m.id),
          });
        }

        const manual = state.services.filter(
          (s) =>
            s.priceMode === "manual" ||
            (s.materials.length === 0 && s.labor.length === 0)
        );
        if (manual.length > 0) {
          issues.push({
            type: "no-cost-data",
            severity: "warning",
            title: `${manual.length} service${manual.length > 1 ? "s" : ""} need cost data`,
            message: "Profit is invisible until costs are added.",
            action: "Fix now",
            relatedIds: manual.map((s) => s.id),
          });
        }

        const costed = state.services.filter(
          (s) =>
            s.priceMode === "calculated" &&
            (s.materials.length > 0 || s.labor.length > 0)
        );
        for (const svc of costed) {
          const totals = calcServiceTotals(svc);
          const margin =
            svc.unitPrice > 0
              ? ((svc.unitPrice - totals.rawCost) / svc.unitPrice) * 100
              : 0;
          if (margin < 20 && margin >= 0) {
            issues.push({
              type: "low-margin",
              severity: "warning",
              title: `${svc.name} losing money`,
              message: `At ${Math.round(margin)}% margin, overhead eats the profit.`,
              impact: `${Math.round(margin)}% margin`,
              action: "Adjust pricing",
              relatedIds: [svc.id],
            });
          }
        }

        const belowArea = state.services.filter((svc) => {
          const area = getAreaAverage(svc.name, svc.unitPrice);
          return area && svc.unitPrice < area.low;
        });
        if (belowArea.length > 0) {
          issues.push({
            type: "benchmark",
            severity: "opportunity",
            title: `${belowArea.length} service${belowArea.length > 1 ? "s" : ""} underpriced`,
            message: "You're leaving money on the table.",
            action: "Raise prices",
            relatedIds: belowArea.map((s) => s.id),
          });
        }

        return issues.sort((a, b) => {
          const order = { warning: 0, opportunity: 1, info: 2 };
          return order[a.severity] - order[b.severity];
        });
      },

      // ── Reset ──

      reset: () =>
        set({
          ...initialState,
          messages: [
            {
              id: genId("msg"),
              role: "agent",
              content:
                "I'm your pricing partner. Tell me about your business and I'll set up your pricebook.",
              timestamp: Date.now(),
              cardType: "text",
            },
          ],
        }),
    }),
    {
      name: "jobber-pb-ai-store",
      partialize: (state) => ({
        services: state.services,
        packages: state.packages,
        materials: state.materials,
        laborRates: state.laborRates,
        setupComplete: state.setupComplete,
        actions: state.actions,
        autonomyPrefs: state.autonomyPrefs,
        activeQuote: state.activeQuote,
        savedQuotes: state.savedQuotes,
        quoteCounter: state.quoteCounter,
        brandValues: state.brandValues,
        industry: state.industry,
        messages: state.messages.slice(-100),
      }),
    }
  )
);
