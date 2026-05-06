import type { ChatMessage } from "./store";
import type { Service, QuoteLineItem, QuoteAssembly } from "./mockData";
import { calcServiceTotals } from "./mockData";
import { getStarterKit, getSuggestion } from "./aiSuggestions";
import type { StarterKit } from "./aiSuggestions";

export interface ConversationResponse {
  messages: Omit<ChatMessage, "id" | "timestamp">[];
  starterKit?: StarterKit;
  sideEffect?: () => void;
  quoteData?: QuoteAssembly;
  quoteMutation?: QuoteMutation;
}

export type QuoteMutation =
  | { type: "add-service"; serviceId: string }
  | { type: "remove-service"; serviceName: string }
  | { type: "set-quantity"; serviceName: string; quantity: number }
  | { type: "set-labor-hours"; serviceName: string; hours: number }
  | { type: "set-deposit"; percent: number }
  | { type: "set-notes"; notes: string }
  | { type: "bundle"; discount: number }
  | { type: "select-tier"; serviceName: string; tierLabel: string }
  | { type: "send" };

const GREETING_PATTERNS = /^(hi|hey|hello|sup|yo|start|begin|get started)/i;
const TRADE_PATTERNS =
  /\b(plumb|electric|hvac|landscap|paint|clean|roof|carpet|handyman|general|construct)\w*/i;
const SERVICE_PATTERNS =
  /\b(offer|add|create|build|set up|setup|want to do|do)\b.*\b(service|services|work|jobs?)\b/i;
const QUOTE_PATTERNS = /\b(quote|estimate|bid|proposal)\b/i;
const FAUCET_PATTERNS = /\b(faucet|tap|sink|kitchen|bathroom|toilet|water heater|drain|sump|shower|disposal|pipe)\b/i;

export async function processMessage(
  userText: string,
  context: {
    setupComplete: boolean;
    serviceCount: number;
    industry: string;
    services?: Service[];
    activeQuote?: QuoteAssembly | null;
  }
): Promise<ConversationResponse> {
  const text = userText.trim();

  if (!context.setupComplete) {
    return handleOnboarding(text, context);
  }

  if (context.activeQuote) {
    const mutation = detectQuoteMutation(text, context);
    if (mutation) return mutation;
  }

  return handleOperational(text, context);
}

function detectQuoteMutation(
  text: string,
  context: { services?: Service[]; activeQuote?: QuoteAssembly | null }
): ConversationResponse | null {
  const lower = text.toLowerCase();
  const services = context.services || [];
  const quote = context.activeQuote;
  if (!quote) return null;

  if (/\b(send\s*(it|quote|this)?|deliver|ship\s*it)\b/i.test(lower)) {
    return {
      messages: [{ role: "agent", content: `Sending quote to ${quote.clientName}.`, cardType: "status-update" }],
      quoteMutation: { type: "send" },
    };
  }

  const addMatch = lower.match(/\badd\s+(.+?)(?:\s+to\s+(?:the\s+)?quote)?\s*$/i);
  if (addMatch && !SERVICE_PATTERNS.test(text)) {
    const term = addMatch[1].replace(/\bthe\b/g, "").trim();
    const svc = findServiceByName(term, services);
    if (svc) {
      return {
        messages: [{ role: "agent", content: `Added ${svc.name} to the quote.`, cardType: "status-update" }],
        quoteMutation: { type: "add-service", serviceId: svc.id },
      };
    }
  }

  const removeMatch = lower.match(/\b(?:remove|drop|delete)\s+(.+?)(?:\s+from\s+(?:the\s+)?quote)?\s*$/i);
  if (removeMatch) {
    const term = removeMatch[1].replace(/\bthe\b/g, "").trim();
    return {
      messages: [{ role: "agent", content: `Removed ${term} from the quote.`, cardType: "status-update" }],
      quoteMutation: { type: "remove-service", serviceName: term },
    };
  }

  const qtyMatch = lower.match(/\b(?:change|set|update|make)\s+(?:the\s+)?(?:quantity|qty)\s+(?:to|=|:)?\s*(\d+)/i)
    || lower.match(/\b(\d+)\s+(?:of|x)\s+(.+)/i);
  if (qtyMatch) {
    if (qtyMatch[2]) {
      return {
        messages: [{ role: "agent", content: `Set quantity to ${qtyMatch[1]} for ${qtyMatch[2].trim()}.`, cardType: "status-update" }],
        quoteMutation: { type: "set-quantity", serviceName: qtyMatch[2].trim(), quantity: parseInt(qtyMatch[1]) },
      };
    }
    return {
      messages: [{ role: "agent", content: `Updated quantity to ${qtyMatch[1]}.`, cardType: "status-update" }],
      quoteMutation: { type: "set-quantity", serviceName: "", quantity: parseInt(qtyMatch[1]) },
    };
  }

  const laborMatch = lower.match(/\b(?:bump|set|change|adjust)\s+(?:the\s+)?labor\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*(?:h|hours?)/i);
  if (laborMatch) {
    const nameMatch = lower.match(/(?:on|for)\s+(?:the\s+)?(.+?)$/i);
    return {
      messages: [{ role: "agent", content: `Adjusted labor to ${laborMatch[1]} hours${nameMatch ? ` on ${nameMatch[1]}` : ""}.`, cardType: "status-update" }],
      quoteMutation: { type: "set-labor-hours", serviceName: nameMatch?.[1] || "", hours: parseFloat(laborMatch[1]) },
    };
  }

  const depositMatch = lower.match(/\b(?:set|make|change)\s+(?:the\s+)?deposit\s+(?:to\s+)?(\d+)\s*%/i);
  if (depositMatch) {
    return {
      messages: [{ role: "agent", content: `Set deposit to ${depositMatch[1]}%.`, cardType: "status-update" }],
      quoteMutation: { type: "set-deposit", percent: parseInt(depositMatch[1]) },
    };
  }

  const bundleMatch = lower.match(/\bbundle\s+.*?(\d+)\s*%\s*(?:off|discount)?/i);
  if (bundleMatch) {
    return {
      messages: [{ role: "agent", content: `Bundled all items with ${bundleMatch[1]}% discount.`, cardType: "status-update" }],
      quoteMutation: { type: "bundle", discount: parseInt(bundleMatch[1]) },
    };
  }

  const tierMatch = lower.match(/\b(?:select|pick|choose|use|switch\s+to)\s+(?:the\s+)?(\w+)\s+(?:tier|option|level)/i);
  if (tierMatch) {
    const nameMatch = lower.match(/(?:on|for)\s+(?:the\s+)?(.+?)$/i);
    return {
      messages: [{ role: "agent", content: `Selected the ${tierMatch[1]} tier${nameMatch ? ` for ${nameMatch[1]}` : ""}.`, cardType: "status-update" }],
      quoteMutation: { type: "select-tier", serviceName: nameMatch?.[1] || "", tierLabel: tierMatch[1] },
    };
  }

  return null;
}

function findServiceByName(term: string, services: Service[]): Service | undefined {
  const lower = term.toLowerCase();
  return services.find((s) => s.name.toLowerCase().includes(lower))
    || services.find((s) => {
      const parts = s.name.toLowerCase().split(/\s+/).filter((p) => p.length > 3);
      return parts.some((p) => lower.includes(p));
    });
}

async function handleOnboarding(
  text: string,
  context: { industry: string; serviceCount: number }
): Promise<ConversationResponse> {
  if (GREETING_PATTERNS.test(text) && !context.industry) {
    return {
      messages: [
        {
          role: "agent",
          content: "I'm your AI pricing partner. Tell me what kind of work you do and I'll build your pricebook.",
          cardType: "text",
        },
      ],
    };
  }

  const tradeMatch = text.match(TRADE_PATTERNS);
  if (tradeMatch || text.toLowerCase().includes("plumb")) {
    const trade = tradeMatch?.[0] || "plumbing";
    const kit = await getStarterKit(trade);

    return {
      messages: [
        {
          role: "agent",
          content: `${trade.charAt(0).toUpperCase() + trade.slice(1)}. I put together a starter kit based on what works for ${trade} businesses in your area.`,
          cardType: "text",
        },
        {
          role: "agent",
          content: "",
          cardType: "trust-calibration",
          cardData: {
            trade,
            services: kit.services.map((s) => s.name),
            materials: kit.materials.map((m) => m.name),
            laborRates: kit.laborRates.map((l) => `${l.description} ($${l.hourlyRate}/hr)`),
            packages: kit.packages.map((p) => p.name),
          },
        },
      ],
      starterKit: kit,
    };
  }

  return {
    messages: [
      {
        role: "agent",
        content: "Name your trade or industry. For example: plumbing, electrical, HVAC, landscaping, painting.",
        cardType: "text",
      },
    ],
  };
}

async function handleOperational(
  text: string,
  context: {
    serviceCount: number;
    industry: string;
    services?: Service[];
  }
): Promise<ConversationResponse> {
  if (SERVICE_PATTERNS.test(text) || FAUCET_PATTERNS.test(text)) {
    if (QUOTE_PATTERNS.test(text)) {
      return buildQuoteResponse(text, context);
    }

    const suggestion = await getSuggestion(text);

    if (suggestion) {
      return {
        messages: [
          {
            role: "agent",
            content: `Found a match. Here's what I'd build for "${suggestion.serviceName}":`,
            cardType: "text",
          },
          {
            role: "agent",
            content: "",
            cardType: "service-preview",
            cardData: {
              name: suggestion.serviceName,
              description: suggestion.description,
              materials: suggestion.materials,
              labor: suggestion.labor,
              markup: suggestion.markupRule,
              confidence: suggestion.confidence,
              basis: suggestion.basis,
              warnings: suggestion.warnings,
            },
          },
        ],
      };
    }

    return {
      messages: [
        {
          role: "agent",
          content: "",
          cardType: "service-preview",
          cardData: {
            name: text.replace(/^(add|create|build|set up|offer|do)\s+/i, "").replace(/\s*(service|services|work|jobs?)\s*$/i, "").trim() || "Custom service",
            description: `Custom service based on: "${text}"`,
            materials: [],
            labor: [{ id: "l-tmp-1", description: "General labor", hourlyRate: 75, estimatedHours: 2, costRate: 35 }],
            markup: { type: "percentage", value: 25 },
            confidence: "medium",
            basis: "Template service. Add materials and adjust labor after creating.",
          },
        },
      ],
    };
  }

  if (QUOTE_PATTERNS.test(text)) {
    return buildQuoteResponse(text, context);
  }

  if (/\b(health|check|audit|review|how.+doing)\b/i.test(text)) {
    return {
      messages: [
        {
          role: "agent",
          content: "",
          cardType: "insight",
          cardData: { requestType: "health-check" },
        },
      ],
    };
  }

  if (/\b(catalog|price ?book|pricebook|services|browse|list|show)\b/i.test(text)) {
    return {
      messages: [
        {
          role: "agent",
          content: `You have ${context.serviceCount} services in your catalog.`,
          cardType: "text",
          cardData: { action: "open-catalog", actionLabel: "Open Catalog" },
        },
      ],
    };
  }

  if (/\b(quotes?|recent|history|past|previous)\b/i.test(text) && /\b(show|list|see|view|recent|past|previous|history)\b/i.test(text)) {
    return {
      messages: [
        {
          role: "agent",
          content: "",
          cardType: "text",
          cardData: { action: "show-quotes" },
        },
      ],
    };
  }

  return {
    messages: [
      {
        role: "agent",
        content: getContextualFallback(context),
        cardType: "text",
      },
    ],
  };
}

function buildQuoteResponse(
  text: string,
  context: {
    serviceCount: number;
    industry: string;
    services?: Service[];
  }
): ConversationResponse {
  const services = context.services || [];

  if (services.length === 0) {
    return {
      messages: [
        {
          role: "agent",
          content: "You need services in your catalog before I can build a quote. Tell me what services you offer and I'll add them.",
          cardType: "text",
        },
      ],
    };
  }

  const clientName = extractClientName(text) || "New client";
  const matchedServices = matchServicesToText(text, services);

  if (matchedServices.length === 0) {
    const topServices = services.slice(0, 8);
    return {
      messages: [
        {
          role: "agent",
          content: `Building a quote for ${clientName}. Pick the services to include.`,
          cardType: "text",
        },
        {
          role: "agent",
          content: "",
          cardType: "quote-draft",
          cardData: {
            clientName,
            availableServices: topServices.map((s) => ({
              id: s.id,
              name: s.name,
              price: s.unitPrice,
              imageUrl: s.imageUrl,
              description: s.description,
            })),
            lineItems: [],
            notes: "",
            status: "picking",
          },
        },
      ],
    };
  }

  const items: QuoteLineItem[] = matchedServices.map((svc) => {
    const hasTiers = svc.optionTiers && svc.optionTiers.length >= 2;
    const selectedTier = hasTiers ? svc.optionTiers![Math.min(1, svc.optionTiers!.length - 1)] : null;
    const adjustedPrice = selectedTier ? selectedTier.price : svc.unitPrice;

    return {
      service: svc,
      quantity: 1,
      adjustedPrice,
      optionTiers: svc.optionTiers,
      selectedTierId: selectedTier?.id,
    };
  });

  const subtotal = items.reduce((sum, li) => sum + li.adjustedPrice * li.quantity, 0);

  return {
    messages: [
      {
        role: "agent",
        content: `Built a quote for ${clientName} with ${items.length} service${items.length > 1 ? "s" : ""}. Total: $${subtotal.toLocaleString()}. Review it in the panel and send when ready.`,
        cardType: "status-update",
      },
    ],
    quoteData: buildQuoteAssembly(clientName, items, `Prepared by JobberAI based on: "${text}"`),
  };
}

function buildQuoteAssembly(clientName: string, items: QuoteLineItem[], notes: string): QuoteAssembly {
  const now = new Date();
  const validDate = new Date(now);
  validDate.setDate(validDate.getDate() + 30);

  return {
    id: `quote-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    quoteNumber: `Q-${now.getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    status: "draft",
    clientName,
    date: now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    validUntil: validDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    items,
    notes,
    depositPercent: 0,
  };
}

function extractClientName(text: string): string | null {
  const forMatch = text.match(/\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (forMatch) return forMatch[1];

  const atMatch = text.match(/\bat\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (atMatch) return atMatch[1];

  const clientMatch = text.match(/\bclient\s*(?:is\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  if (clientMatch) return clientMatch[1];

  return null;
}

function matchServicesToText(
  text: string,
  services: Service[]
): Service[] {
  const lower = text.toLowerCase();
  const matched: Service[] = [];

  for (const svc of services) {
    const nameParts = svc.name.toLowerCase().split(/\s+/);
    const significantParts = nameParts.filter((p) => p.length > 3);

    for (const part of significantParts) {
      if (lower.includes(part)) {
        matched.push(svc);
        break;
      }
    }
  }

  return matched;
}

function getContextualFallback(context: { serviceCount: number }): string {
  if (context.serviceCount === 0) {
    return "Tell me what kind of work you do and I'll start building your pricebook. Or say \"plumbing\", \"electrical\", \"HVAC\" to get started with a template.";
  }
  const suggestions = [
    "Try asking me to add a new service, build a quote, or check your pricebook health.",
    "I can help with adding services, building quotes, checking margins, or reviewing your catalog.",
    "I'm ready to help. Add a service, build a quote, or run a pricebook review.",
  ];
  return suggestions[Math.floor(Math.random() * suggestions.length)];
}
