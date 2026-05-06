import type { MaterialItem, LaborInput, MarkupRule } from "./mockData";

export interface AISuggestion {
  serviceName: string;
  description: string;
  materials: MaterialItem[];
  labor: LaborInput[];
  markupRule: MarkupRule;
  taxable: boolean;
  confidence: "high" | "medium" | "low";
  basis: string;
  warnings?: string[];
}

export type SuggestionStatus = "idle" | "loading" | "ready" | "dismissed";

const INDUSTRY_CATALOG: Record<string, Omit<AISuggestion, "serviceName">> = {
  "kitchen faucet": {
    description: "Remove existing faucet, install new faucet with supply lines",
    materials: [
      { id: "ai-m1", name: "Kitchen faucet", unitCost: 185, quantity: 1, unitType: "each", markup: { type: "percentage", value: 35 } },
      { id: "ai-m2", name: "Supply lines (pair)", unitCost: 12, quantity: 2, unitType: "each", markup: { type: "percentage", value: 35 } },
      { id: "ai-m3", name: "Plumber's putty", unitCost: 8, quantity: 1, unitType: "each", markup: { type: "percentage", value: 25 } },
    ],
    labor: [
      { id: "ai-l1", description: "Plumber", hourlyRate: 85, estimatedHours: 1.5 },
    ],
    markupRule: { type: "percentage", value: 0 },
    taxable: true,
    confidence: "high",
    basis: "Based on 2,400 similar plumbing jobs in the last 12 months",
  },
  "water heater flush": {
    description: "Drain, flush, and refill standard tank water heater",
    materials: [
      { id: "ai-m4", name: "Garden hose adapter", unitCost: 9, quantity: 1, unitType: "each", markup: { type: "percentage", value: 20 } },
      { id: "ai-m5", name: "Teflon tape", unitCost: 3, quantity: 1, unitType: "each", markup: { type: "percentage", value: 20 } },
    ],
    labor: [
      { id: "ai-l2", description: "Plumber", hourlyRate: 85, estimatedHours: 1.25 },
    ],
    markupRule: { type: "percentage", value: 10 },
    taxable: true,
    confidence: "high",
    basis: "Based on 1,800 water heater maintenance jobs",
  },
  "toilet": {
    description: "Remove old toilet, install new toilet with wax ring and supply line",
    materials: [
      { id: "ai-m6", name: "Wax ring with flange", unitCost: 8, quantity: 1, unitType: "each", markup: { type: "percentage", value: 30 } },
      { id: "ai-m7", name: "Supply line", unitCost: 10, quantity: 1, unitType: "each", markup: { type: "percentage", value: 30 } },
      { id: "ai-m8", name: "Toilet shims", unitCost: 4, quantity: 1, unitType: "pack", markup: { type: "percentage", value: 25 } },
      { id: "ai-m9", name: "Silicone caulk", unitCost: 7, quantity: 1, unitType: "each", markup: { type: "percentage", value: 25 } },
    ],
    labor: [
      { id: "ai-l3", description: "Plumber", hourlyRate: 85, estimatedHours: 2 },
    ],
    markupRule: { type: "percentage", value: 5 },
    taxable: true,
    confidence: "high",
    basis: "Based on 3,100 toilet installation jobs",
  },
  "garbage disposal": {
    description: "Install new garbage disposal unit under kitchen sink",
    materials: [
      { id: "ai-m10", name: "Garbage disposal unit", unitCost: 120, quantity: 1, unitType: "each", markup: { type: "percentage", value: 35 } },
      { id: "ai-m11", name: "Discharge tube", unitCost: 8, quantity: 1, unitType: "each", markup: { type: "percentage", value: 25 } },
      { id: "ai-m12", name: "Plumber's putty", unitCost: 8, quantity: 1, unitType: "each", markup: { type: "percentage", value: 25 } },
    ],
    labor: [
      { id: "ai-l4", description: "Plumber", hourlyRate: 85, estimatedHours: 1.5 },
    ],
    markupRule: { type: "percentage", value: 0 },
    taxable: true,
    confidence: "medium",
    basis: "Based on 950 disposal installation jobs",
    warnings: ["Disposal unit cost varies widely ($80-$300). Verify with your supplier."],
  },
  "pipe insulation": {
    description: "Insulate exposed pipes with foam insulation to prevent freezing",
    materials: [
      { id: "ai-m13", name: "Foam pipe insulation", unitCost: 3, quantity: 1, unitType: "per foot", markup: { type: "percentage", value: 40 } },
      { id: "ai-m14", name: "Insulation tape", unitCost: 5, quantity: 1, unitType: "roll", markup: { type: "fixed", value: 3 } },
    ],
    labor: [
      { id: "ai-l5", description: "Plumber", hourlyRate: 75, estimatedHours: 0.5 },
    ],
    markupRule: { type: "percentage", value: 15 },
    taxable: false,
    confidence: "medium",
    basis: "Based on 400 insulation jobs",
    warnings: ["Labor estimate is per 20 linear feet. Adjust for actual job scope."],
  },
  "deck staining": {
    description: "Pressure wash and apply two coats of stain to wood deck",
    materials: [
      { id: "ai-m15", name: "Deck stain (gallon)", unitCost: 45, quantity: 3, unitType: "gallon", markup: { type: "percentage", value: 30 } },
      { id: "ai-m16", name: "Deck cleaner", unitCost: 18, quantity: 1, unitType: "each", markup: { type: "percentage", value: 25 } },
      { id: "ai-m17", name: "Painter's tape", unitCost: 8, quantity: 2, unitType: "roll", markup: { type: "percentage", value: 20 } },
      { id: "ai-m18", name: "Drop cloths", unitCost: 12, quantity: 2, unitType: "each", markup: { type: "percentage", value: 20 } },
    ],
    labor: [
      { id: "ai-l6", description: "Painter / laborer", hourlyRate: 55, estimatedHours: 8 },
    ],
    markupRule: { type: "percentage", value: 20 },
    taxable: true,
    confidence: "medium",
    basis: "Based on 600 deck staining jobs (avg 300 sqft deck)",
    warnings: ["Material quantities assume a ~300 sqft deck. Scale proportionally for larger decks."],
  },
  "lawn mowing": {
    description: "Mow, edge, and blow standard residential lawn",
    materials: [
      { id: "ai-m19", name: "Fuel cost allocation", unitCost: 5, quantity: 1, unitType: "per visit", markup: { type: "fixed", value: 0 } },
    ],
    labor: [
      { id: "ai-l7", description: "Landscaper", hourlyRate: 45, estimatedHours: 1 },
    ],
    markupRule: { type: "percentage", value: 30 },
    taxable: true,
    confidence: "medium",
    basis: "Based on 8,200 lawn care visits (avg 5,000 sqft lot)",
    warnings: ["Labor varies significantly by lot size. This estimate covers up to ~5,000 sqft."],
  },
};

function findMatch(input: string): { key: string; match: Omit<AISuggestion, "serviceName"> } | null {
  const normalized = input.toLowerCase().trim();
  if (normalized.length < 3) return null;

  for (const [key, data] of Object.entries(INDUSTRY_CATALOG)) {
    if (normalized.includes(key)) {
      return { key, match: data };
    }
  }

  const fuzzyMap: Record<string, string> = {
    "faucet": "kitchen faucet",
    "tap": "kitchen faucet",
    "sink faucet": "kitchen faucet",
    "water heater": "water heater flush",
    "hot water tank": "water heater flush",
    "boiler flush": "water heater flush",
    "disposal": "garbage disposal",
    "garburator": "garbage disposal",
    "insulation": "pipe insulation",
    "insulate": "pipe insulation",
    "stain": "deck staining",
    "deck": "deck staining",
    "mow": "lawn mowing",
    "lawn": "lawn mowing",
    "grass": "lawn mowing",
    "yard": "lawn mowing",
  };

  for (const [term, catalogKey] of Object.entries(fuzzyMap)) {
    if (normalized.includes(term)) {
      return { key: catalogKey, match: INDUSTRY_CATALOG[catalogKey] };
    }
  }

  return null;
}

export function getSuggestion(serviceName: string): Promise<AISuggestion | null> {
  return new Promise((resolve) => {
    const delay = 600 + Math.random() * 800;
    setTimeout(() => {
      const result = findMatch(serviceName);
      if (!result) {
        resolve(null);
        return;
      }
      resolve({
        serviceName,
        ...result.match,
      });
    }, delay);
  });
}

/* ───── Quote Intelligence ───── */

export interface QuoteInsight {
  type: "success" | "warning" | "info" | "opportunity";
  title: string;
  message: string;
  action?: string;
}

export function getQuoteInsights(
  items: Array<{
    serviceName: string;
    adjustedPrice: number;
    costTotal: number;
    marginPercent: number;
    isCosted: boolean;
    hasOverrides: boolean;
    materialCount: number;
    laborHours: number;
  }>,
  quoteTotal: number,
): QuoteInsight[] {
  const insights: QuoteInsight[] = [];
  const costedItems = items.filter((i) => i.isCosted);

  if (costedItems.length === 0) return insights;

  const blendedCost = costedItems.reduce((s, i) => s + i.costTotal, 0);
  const blendedRevenue = costedItems.reduce((s, i) => s + i.adjustedPrice, 0);
  const blendedMargin = blendedRevenue > 0 ? Math.round(((blendedRevenue - blendedCost) / blendedRevenue) * 100) : 0;

  if (blendedMargin >= 30 && blendedMargin <= 50) {
    insights.push({
      type: "success",
      title: "Healthy profit",
      message: `You're keeping ${blendedMargin}% profit across ${costedItems.length} service${costedItems.length > 1 ? "s" : ""} on this quote. That's in the sweet spot for service businesses.`,
    });
  } else if (blendedMargin < 30 && blendedMargin >= 15) {
    insights.push({
      type: "warning",
      title: "Profit below target",
      message: `You're keeping ${blendedMargin}% on this quote. Area reference range is 35-45%. You may have room to charge more.`,
      action: "Review markup on your highest-cost line items.",
    });
  } else if (blendedMargin < 15) {
    insights.push({
      type: "warning",
      title: "Low profit warning",
      message: `Only ${blendedMargin}% profit on this quote. Unexpected costs like callbacks or extra materials could push this job into a loss.`,
      action: "Consider raising prices or reducing scope before sending.",
    });
  }

  const lowMarginItems = costedItems.filter((i) => i.marginPercent < 20);
  if (lowMarginItems.length > 0 && costedItems.length > 1) {
    insights.push({
      type: "info",
      title: "Uneven profit",
      message: `${lowMarginItems.map((i) => `"${i.serviceName}"`).join(" and ")} ${lowMarginItems.length === 1 ? "is" : "are"} under 20% profit. Your other services are making up the difference.`,
    });
  }

  const adjustedItems = items.filter((i) => i.hasOverrides);
  if (adjustedItems.length > 0) {
    insights.push({
      type: "info",
      title: "Per-job adjustments active",
      message: `You adjusted ${adjustedItems.length} line item${adjustedItems.length > 1 ? "s" : ""} for this quote. These changes don't affect your pricebook.`,
    });
  }

  const totalLaborHours = items.reduce((s, i) => s + i.laborHours, 0);
  if (totalLaborHours > 0 && totalLaborHours <= 2) {
    insights.push({
      type: "opportunity",
      title: "Small job, consider minimum charge",
      message: `Total estimated labor is ${totalLaborHours}h. Travel, setup, and cleanup aren't costed. Many SPs set a minimum job charge to cover overhead.`,
    });
  }

  if (quoteTotal > 1000) {
    insights.push({
      type: "opportunity",
      title: "Consider payment terms",
      message: `This quote is over $1,000. Collecting a deposit (typically 25-50%) reduces your risk and signals commitment from the client.`,
    });
  }

  const uncostItems = items.filter((i) => !i.isCosted);
  if (uncostItems.length > 0 && costedItems.length > 0) {
    insights.push({
      type: "info",
      title: "Mixed pricing",
      message: `${uncostItems.length} item${uncostItems.length > 1 ? "s use" : " uses"} manual pricing without cost details. You can't see the profit on ${uncostItems.length === 1 ? "it" : "them"} yet.`,
      action: "Add cost details to see the full picture.",
    });
  }

  return insights;
}

/* ───── Proposal Content Generation ───── */

export interface ProposalContent {
  scopeNarrative: string;
  includes: string[];
  excludes: string[];
  timeline: string;
}

const SCOPE_TEMPLATES: Record<string, { narrative: string; excludes: string[] }> = {
  "kitchen faucet": {
    narrative: "Complete kitchen faucet replacement including removal of your existing fixture, installation of your new faucet with fresh supply lines, and a thorough leak test to make sure everything works.",
    excludes: ["Fixture purchase (provided by homeowner or quoted separately)", "Permits if required by municipality"],
  },
  "water heater flush": {
    narrative: "Full water heater maintenance service. We'll safely drain your tank, flush out sediment buildup that reduces efficiency, and refill the system. This extends your water heater's lifespan and improves performance.",
    excludes: ["Water heater replacement if issues found", "Anode rod replacement (available as add-on)"],
  },
  "toilet": {
    narrative: "Complete toilet replacement including careful removal of your existing toilet, installation of the new unit with a fresh wax ring seal and supply line, and verification that everything flushes and fills properly.",
    excludes: ["Toilet fixture purchase", "Floor repair if subfloor damage found", "Permits if required"],
  },
  "garbage disposal": {
    narrative: "Professional garbage disposal installation under your kitchen sink. Includes mounting the new unit, connecting the discharge tube, and testing operation. We'll remove your old unit if present.",
    excludes: ["Disposal unit purchase", "Electrical work if new circuit needed", "Plumbing modifications beyond standard hookup"],
  },
};

function findScopeTemplate(serviceName: string): { narrative: string; excludes: string[] } | null {
  const n = serviceName.toLowerCase();
  for (const [key, template] of Object.entries(SCOPE_TEMPLATES)) {
    if (n.includes(key)) return template;
  }
  if (n.includes("faucet") || n.includes("tap")) return SCOPE_TEMPLATES["kitchen faucet"];
  if (n.includes("heater") || n.includes("flush")) return SCOPE_TEMPLATES["water heater flush"];
  if (n.includes("toilet")) return SCOPE_TEMPLATES["toilet"];
  if (n.includes("disposal")) return SCOPE_TEMPLATES["garbage disposal"];
  return null;
}

export function generateProposalContent(
  service: { name: string; description: string; materials: MaterialItem[]; labor: LaborInput[] },
): ProposalContent {
  const template = findScopeTemplate(service.name);

  const scopeNarrative = template?.narrative
    ?? (service.description
      ? `${service.description}. All work performed by our licensed, insured team.`
      : "Professional service performed by our licensed, insured team.");

  const includes: string[] = [];
  for (const m of service.materials) {
    const qty = m.quantity > 1 ? ` (${m.quantity})` : "";
    includes.push(`${m.name}${qty}`);
  }
  for (const l of service.labor) {
    const hrs = l.estimatedHours === 1 ? "1 hour" : `${l.estimatedHours} hours`;
    includes.push(`${l.description} (${hrs})`);
  }
  if (includes.length === 0 && service.description) {
    includes.push(service.description);
  }

  const excludes = template?.excludes ?? [];

  const totalHours = service.labor.reduce((s, l) => s + l.estimatedHours, 0);
  let timeline = "";
  if (totalHours > 0) {
    if (totalHours <= 1) timeline = "Under 1 hour on-site";
    else if (totalHours <= 2) timeline = "1-2 hours on-site";
    else if (totalHours <= 4) timeline = "2-4 hours on-site";
    else if (totalHours <= 8) timeline = "Half day on-site";
    else timeline = `Approximately ${Math.ceil(totalHours / 8)} day${Math.ceil(totalHours / 8) > 1 ? "s" : ""} on-site`;
  }

  return { scopeNarrative, includes, excludes, timeline };
}

/* ───── Sales Insights (AI Sales Coach) ───── */

export interface SalesInsight {
  type: "tip" | "upsell" | "urgency" | "social-proof";
  title: string;
  message: string;
  action?: string;
}

export function getSalesInsights(
  items: Array<{
    serviceName: string;
    price: number;
    hasDescription: boolean;
    hasOptionTiers: boolean;
    materialCount: number;
  }>,
  quoteTotal: number,
): SalesInsight[] {
  const insights: SalesInsight[] = [];

  const hasAnyOptions = items.some((i) => i.hasOptionTiers);

  if (!hasAnyOptions && items.length > 0) {
    insights.push({
      type: "tip",
      title: "Add Good/Better/Best options",
      message: "Quotes with tiered options see up to 285% higher ticket sizes. Giving clients a choice shifts the question from 'yes or no' to 'which one.'",
      action: "Try adding option tiers to your highest-value service.",
    });
  }

  const missingDescriptions = items.filter((i) => !i.hasDescription);
  if (missingDescriptions.length > 0) {
    insights.push({
      type: "tip",
      title: "Add scope descriptions",
      message: `${missingDescriptions.length === 1 ? `"${missingDescriptions[0].serviceName}" doesn't have` : `${missingDescriptions.length} services don't have`} a description. Clients who understand what's included are more likely to approve.`,
    });
  }

  const COMMON_BUNDLES: Record<string, string[]> = {
    "kitchen faucet": ["garbage disposal", "supply line", "shut-off valve"],
    "water heater": ["pipe insulation", "expansion tank", "anode rod"],
    "toilet": ["wax ring", "shut-off valve", "bidet attachment"],
  };

  const serviceNames = items.map((i) => i.serviceName.toLowerCase());
  for (const [key, bundles] of Object.entries(COMMON_BUNDLES)) {
    if (serviceNames.some((n) => n.includes(key))) {
      const alreadyQuoted = bundles.filter((b) => serviceNames.some((n) => n.includes(b)));
      const notQuoted = bundles.filter((b) => !serviceNames.some((n) => n.includes(b)));
      if (notQuoted.length > 0 && alreadyQuoted.length === 0) {
        insights.push({
          type: "upsell",
          title: "Bundle opportunity",
          message: `SPs who quote ${key} replacement often bundle ${notQuoted.slice(0, 2).join(" and ")}. Adding related services increases value and saves the client a second visit.`,
        });
        break;
      }
    }
  }

  if (quoteTotal > 500) {
    insights.push({
      type: "social-proof",
      title: "Build trust with details",
      message: "For quotes over $500, clients approve faster when they see exactly what's included. Your cost structure makes this easy to generate automatically.",
    });
  }

  if (quoteTotal < 200 && items.length === 1) {
    insights.push({
      type: "urgency",
      title: "Speed wins small jobs",
      message: "For quick-turnaround services, response time is the biggest factor. Clients often go with the first SP who sends a professional quote.",
    });
  }

  return insights;
}

/* ───── GBB Tier Suggestion ───── */

export interface GBBSuggestion {
  tiers: Array<{
    label: string;
    description: string;
    priceMultiplier: number;
    highlights: string[];
  }>;
  confidence: "high" | "medium";
  basis: string;
}

const GBB_CATALOG: Record<string, GBBSuggestion> = {
  "kitchen faucet": {
    tiers: [
      {
        label: "Good",
        description: "Reliable faucet with basic installation",
        priceMultiplier: 1.0,
        highlights: ["Standard kitchen faucet", "Supply line connection", "Leak test"],
      },
      {
        label: "Better",
        description: "Mid-range fixture with valve refresh",
        priceMultiplier: 1.53,
        highlights: ["Mid-range faucet", "Shut-off valve refresh", "New supply lines", "Extended parts warranty"],
      },
      {
        label: "Best",
        description: "Designer fixture with full upgrade",
        priceMultiplier: 2.34,
        highlights: ["Designer faucet", "Full supply line upgrade", "Valve replacement", "Old fixture disposal", "2-year labor warranty"],
      },
    ],
    confidence: "high",
    basis: "Based on tier adoption across 1,200 plumbing quotes with options",
  },
  "water heater": {
    tiers: [
      {
        label: "Basic Flush",
        description: "Standard drain-and-flush maintenance",
        priceMultiplier: 1.0,
        highlights: ["Tank drain and flush", "Sediment removal", "System refill"],
      },
      {
        label: "Full Service",
        description: "Flush plus inspection and anode check",
        priceMultiplier: 1.6,
        highlights: ["Everything in Basic", "Anode rod inspection", "T&P valve test", "Efficiency check"],
      },
      {
        label: "Premium Care",
        description: "Complete maintenance with parts replacement",
        priceMultiplier: 2.2,
        highlights: ["Everything in Full Service", "New anode rod", "Pipe insulation", "1-year maintenance guarantee"],
      },
    ],
    confidence: "medium",
    basis: "Based on 640 water heater service quotes with options",
  },
};

export function suggestGBBTiers(serviceName: string, basePrice: number): GBBSuggestion | null {
  const n = serviceName.toLowerCase();
  for (const [key, suggestion] of Object.entries(GBB_CATALOG)) {
    if (n.includes(key)) {
      return {
        ...suggestion,
        tiers: suggestion.tiers.map((t) => ({
          ...t,
          priceMultiplier: t.priceMultiplier,
        })),
      };
    }
  }
  if (n.includes("faucet") || n.includes("tap")) return suggestGBBTiers("kitchen faucet", basePrice);
  if (n.includes("heater") || n.includes("flush")) return suggestGBBTiers("water heater", basePrice);
  return null;
}

/* ───── Service-level margin insights ───── */

export interface MarginInsight {
  type: "info" | "warning" | "success";
  message: string;
}

export function getMarginInsights(
  marginPercent: number,
  costTotal: number,
  calculatedPrice: number,
  materialTotal: number,
  laborTotal: number,
): MarginInsight[] {
  const insights: MarginInsight[] = [];

  if (costTotal === 0) return insights;

  if (marginPercent < 15) {
    insights.push({
      type: "warning",
      message: `You're keeping ${marginPercent}% profit on this service. Most profitable businesses target 30-50%. Consider raising your markup.`,
    });
  } else if (marginPercent >= 15 && marginPercent < 30) {
    insights.push({
      type: "info",
      message: `${marginPercent}% profit. Area reference range is 35-45%. There may be room to charge more.`,
    });
  } else if (marginPercent >= 30 && marginPercent <= 55) {
    insights.push({
      type: "success",
      message: `${marginPercent}% profit. That's in the healthy range for service businesses.`,
    });
  } else if (marginPercent > 55) {
    insights.push({
      type: "info",
      message: `${marginPercent}% profit. That's above typical ranges. Make sure your price stays competitive.`,
    });
  }

  if (materialTotal > 0 && laborTotal > 0) {
    const materialRatio = materialTotal / costTotal;
    if (materialRatio > 0.8) {
      insights.push({
        type: "info",
        message: "Materials make up most of the cost. Double-check you've included enough labor time.",
      });
    } else if (materialRatio < 0.15 && materialTotal > 0) {
      insights.push({
        type: "info",
        message: "This service is mostly labor. Verify material list is complete.",
      });
    }
  }

  return insights;
}

/* ───── AI Starter Kit ───── */

export interface StarterKitMaterial {
  name: string;
  unitCost: number;
  unitType: string;
  markup: { type: "percentage" | "fixed"; value: number };
  category?: string;
}

export interface StarterKitLaborRate {
  description: string;
  hourlyRate: number;
  costRate?: number;
}

export interface StarterKitService {
  name: string;
  description: string;
  imageUrl?: string;
  unitType: string;
  category?: string;
  materials: { name: string; unitCost: number; quantity: number; unitType: string; markup: { type: "percentage" | "fixed"; value: number } }[];
  labor: { description: string; hourlyRate: number; estimatedHours: number; costRate?: number }[];
  markupRule: { type: "percentage" | "fixed"; value: number };
}

export interface StarterKitPackage {
  name: string;
  description: string;
  serviceNames: string[];
  discountPercent: number;
  category?: string;
}

export interface StarterKit {
  trade: string;
  materials: StarterKitMaterial[];
  laborRates: StarterKitLaborRate[];
  services: StarterKitService[];
  packages: StarterKitPackage[];
}

const PLUMBING_STARTER: StarterKit = {
  trade: "Plumbing",
  materials: [
    { name: "Kitchen faucet", unitCost: 180, unitType: "each", markup: { type: "percentage", value: 35 }, category: "Fixtures" },
    { name: "Bathroom faucet", unitCost: 120, unitType: "each", markup: { type: "percentage", value: 35 }, category: "Fixtures" },
    { name: "Supply lines (pair)", unitCost: 12, unitType: "each", markup: { type: "percentage", value: 35 }, category: "Fixtures" },
    { name: "Plumber's putty", unitCost: 8, unitType: "each", markup: { type: "percentage", value: 25 }, category: "Consumables" },
    { name: "Teflon tape", unitCost: 3, unitType: "roll", markup: { type: "percentage", value: 20 }, category: "Consumables" },
    { name: "Wax ring", unitCost: 6, unitType: "each", markup: { type: "percentage", value: 30 }, category: "Consumables" },
    { name: "Toilet flange", unitCost: 14, unitType: "each", markup: { type: "percentage", value: 30 }, category: "Fittings" },
    { name: "PVC pipe (10ft)", unitCost: 8, unitType: "foot", markup: { type: "percentage", value: 25 }, category: "Pipe" },
    { name: "Copper pipe (10ft)", unitCost: 32, unitType: "foot", markup: { type: "percentage", value: 30 }, category: "Pipe" },
    { name: "PEX pipe (10ft)", unitCost: 12, unitType: "foot", markup: { type: "percentage", value: 25 }, category: "Pipe" },
    { name: "SharkBite fitting", unitCost: 12, unitType: "each", markup: { type: "percentage", value: 25 }, category: "Fittings" },
    { name: "Ball valve (1/2\")", unitCost: 18, unitType: "each", markup: { type: "percentage", value: 30 }, category: "Fittings" },
    { name: "Gate valve (3/4\")", unitCost: 22, unitType: "each", markup: { type: "percentage", value: 30 }, category: "Fittings" },
    { name: "Pressure-balance valve", unitCost: 85, unitType: "each", markup: { type: "percentage", value: 35 }, category: "Fixtures" },
    { name: "Trim kit (handle + escutcheon)", unitCost: 65, unitType: "each", markup: { type: "percentage", value: 30 }, category: "Fixtures" },
    { name: "Garden hose adapter", unitCost: 8, unitType: "each", markup: { type: "percentage", value: 20 }, category: "Fittings" },
    { name: "Drain auger blade", unitCost: 15, unitType: "each", markup: { type: "percentage", value: 30 }, category: "Tools" },
    { name: "Enzyme drain cleaner", unitCost: 18, unitType: "each", markup: { type: "percentage", value: 25 }, category: "Consumables" },
    { name: "Sump pump (1/3 HP)", unitCost: 180, unitType: "each", markup: { type: "percentage", value: 35 }, category: "Equipment" },
    { name: "Check valve", unitCost: 25, unitType: "each", markup: { type: "percentage", value: 30 }, category: "Fittings" },
    { name: "Battery backup unit", unitCost: 120, unitType: "each", markup: { type: "percentage", value: 30 }, category: "Equipment" },
    { name: "Water heater anode rod", unitCost: 35, unitType: "each", markup: { type: "percentage", value: 30 }, category: "Parts" },
    { name: "Garbage disposal (1/2 HP)", unitCost: 145, unitType: "each", markup: { type: "percentage", value: 35 }, category: "Equipment" },
    { name: "Pipe insulation (6ft)", unitCost: 4, unitType: "each", markup: { type: "percentage", value: 25 }, category: "Insulation" },
    { name: "Silicone sealant", unitCost: 7, unitType: "each", markup: { type: "percentage", value: 20 }, category: "Consumables" },
  ],
  laborRates: [
    { description: "Plumber - standard rate", hourlyRate: 85, costRate: 35 },
    { description: "Plumber - senior/lead", hourlyRate: 110, costRate: 48 },
    { description: "Apprentice", hourlyRate: 45, costRate: 22 },
    { description: "Helper/laborer", hourlyRate: 35, costRate: 18 },
  ],
  services: [
    {
      name: "Kitchen Faucet Replacement",
      description: "Remove existing faucet, install new faucet with supply lines",
      imageUrl: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop",
      unitType: "flat", category: "Fixtures",
      materials: [
        { name: "Kitchen faucet", unitCost: 180, quantity: 1, unitType: "each", markup: { type: "percentage", value: 35 } },
        { name: "Supply lines (pair)", unitCost: 12, quantity: 2, unitType: "each", markup: { type: "percentage", value: 35 } },
        { name: "Plumber's putty", unitCost: 8, quantity: 1, unitType: "each", markup: { type: "percentage", value: 35 } },
      ],
      labor: [{ description: "Plumber - standard rate", hourlyRate: 85, estimatedHours: 1.5, costRate: 35 }],
      markupRule: { type: "percentage", value: 0 },
    },
    {
      name: "Water Heater Flush",
      description: "Drain, flush, and refill standard tank water heater",
      imageUrl: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=300&fit=crop",
      unitType: "flat", category: "Maintenance",
      materials: [
        { name: "Garden hose adapter", unitCost: 8, quantity: 1, unitType: "each", markup: { type: "percentage", value: 20 } },
        { name: "Teflon tape", unitCost: 3, quantity: 1, unitType: "each", markup: { type: "percentage", value: 20 } },
      ],
      labor: [{ description: "Plumber - standard rate", hourlyRate: 85, estimatedHours: 1.5, costRate: 35 }],
      markupRule: { type: "percentage", value: 10 },
    },
    {
      name: "Toilet Replacement",
      description: "Remove old toilet, install new toilet with wax ring and supply",
      unitType: "flat", category: "Fixtures",
      materials: [
        { name: "Wax ring", unitCost: 6, quantity: 1, unitType: "each", markup: { type: "percentage", value: 30 } },
        { name: "Toilet flange", unitCost: 14, quantity: 1, unitType: "each", markup: { type: "percentage", value: 30 } },
        { name: "Supply lines (pair)", unitCost: 12, quantity: 1, unitType: "each", markup: { type: "percentage", value: 35 } },
      ],
      labor: [{ description: "Plumber - standard rate", hourlyRate: 85, estimatedHours: 2, costRate: 35 }],
      markupRule: { type: "percentage", value: 15 },
    },
    {
      name: "Garbage Disposal Install",
      description: "Install new garbage disposal unit under kitchen sink",
      unitType: "flat", category: "Installation",
      materials: [
        { name: "Garbage disposal (1/2 HP)", unitCost: 145, quantity: 1, unitType: "each", markup: { type: "percentage", value: 35 } },
        { name: "Plumber's putty", unitCost: 8, quantity: 1, unitType: "each", markup: { type: "percentage", value: 35 } },
      ],
      labor: [{ description: "Plumber - standard rate", hourlyRate: 85, estimatedHours: 1.5, costRate: 35 }],
      markupRule: { type: "percentage", value: 5 },
    },
    {
      name: "Drain Cleaning",
      description: "Snake or hydro-jet main drain or branch line, clear blockage",
      unitType: "flat", category: "Maintenance",
      materials: [
        { name: "Drain auger blade", unitCost: 15, quantity: 1, unitType: "each", markup: { type: "percentage", value: 30 } },
        { name: "Enzyme drain cleaner", unitCost: 18, quantity: 1, unitType: "each", markup: { type: "percentage", value: 25 } },
      ],
      labor: [{ description: "Plumber - standard rate", hourlyRate: 85, estimatedHours: 2, costRate: 35 }],
      markupRule: { type: "percentage", value: 10 },
    },
    {
      name: "Sump Pump Install",
      description: "Install new sump pump with check valve, discharge line, and battery backup",
      imageUrl: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop",
      unitType: "flat", category: "Installation",
      materials: [
        { name: "Sump pump (1/3 HP)", unitCost: 180, quantity: 1, unitType: "each", markup: { type: "percentage", value: 35 } },
        { name: "Check valve", unitCost: 25, quantity: 1, unitType: "each", markup: { type: "percentage", value: 30 } },
        { name: "PVC pipe (10ft)", unitCost: 8, quantity: 10, unitType: "foot", markup: { type: "percentage", value: 25 } },
        { name: "Battery backup unit", unitCost: 120, quantity: 1, unitType: "each", markup: { type: "percentage", value: 30 } },
      ],
      labor: [{ description: "Plumber - standard rate", hourlyRate: 85, estimatedHours: 3, costRate: 35 }],
      markupRule: { type: "percentage", value: 5 },
    },
    {
      name: "Shower Valve Replacement",
      description: "Replace shower mixing valve, update trim kit, test temperature and pressure",
      unitType: "flat", category: "Fixtures",
      materials: [
        { name: "Pressure-balance valve", unitCost: 85, quantity: 1, unitType: "each", markup: { type: "percentage", value: 35 } },
        { name: "Trim kit (handle + escutcheon)", unitCost: 65, quantity: 1, unitType: "each", markup: { type: "percentage", value: 30 } },
        { name: "SharkBite fitting", unitCost: 12, quantity: 2, unitType: "each", markup: { type: "percentage", value: 25 } },
      ],
      labor: [{ description: "Plumber - standard rate", hourlyRate: 85, estimatedHours: 2.5, costRate: 35 }],
      markupRule: { type: "percentage", value: 0 },
    },
    {
      name: "Pipe Insulation",
      description: "Insulate exposed pipes with foam insulation to prevent freezing",
      unitType: "per foot", category: "Installation",
      materials: [
        { name: "Pipe insulation (6ft)", unitCost: 4, quantity: 1, unitType: "each", markup: { type: "percentage", value: 25 } },
      ],
      labor: [{ description: "Apprentice", hourlyRate: 45, estimatedHours: 0.25, costRate: 22 }],
      markupRule: { type: "percentage", value: 20 },
    },
    {
      name: "Water Softener Install",
      description: "Install whole-home water softener with bypass valve and drain connection",
      unitType: "flat", category: "Installation",
      materials: [
        { name: "Ball valve (1/2\")", unitCost: 18, quantity: 2, unitType: "each", markup: { type: "percentage", value: 30 } },
        { name: "PEX pipe (10ft)", unitCost: 12, quantity: 2, unitType: "foot", markup: { type: "percentage", value: 25 } },
        { name: "SharkBite fitting", unitCost: 12, quantity: 4, unitType: "each", markup: { type: "percentage", value: 25 } },
      ],
      labor: [
        { description: "Plumber - senior/lead", hourlyRate: 110, estimatedHours: 3, costRate: 48 },
        { description: "Apprentice", hourlyRate: 45, estimatedHours: 3, costRate: 22 },
      ],
      markupRule: { type: "percentage", value: 10 },
    },
  ],
  packages: [
    {
      name: "Kitchen Plumbing Refresh",
      description: "Faucet replacement plus garbage disposal install, bundled for one visit.",
      serviceNames: ["Kitchen Faucet Replacement", "Garbage Disposal Install"],
      discountPercent: 10,
      category: "Fixtures",
    },
    {
      name: "Bathroom Refresh",
      description: "Toilet replacement and shower valve upgrade in one appointment.",
      serviceNames: ["Toilet Replacement", "Shower Valve Replacement"],
      discountPercent: 10,
      category: "Fixtures",
    },
  ],
};

export async function getStarterKit(_trade: string): Promise<StarterKit> {
  await new Promise((r) => setTimeout(r, 1500));
  return PLUMBING_STARTER;
}

/* ───── AI Image Analysis (simulated) ───── */

export interface ImageAnalysisResult {
  status: "success";
  scene: string;
  confidence: "high" | "medium";
  detectedItems: Array<{
    label: string;
    category: "fixture" | "material" | "condition" | "structure";
    detail: string;
  }>;
  suggestedServices: Array<{
    name: string;
    description: string;
    estimatedPrice: number;
    materials: Array<{ name: string; unitCost: number; quantity: number }>;
    laborHours: number;
    confidence: "high" | "medium";
  }>;
  insights: string[];
}

const IMAGE_SCENARIOS: Record<string, ImageAnalysisResult> = {
  bathroom: {
    status: "success",
    scene: "Residential bathroom with visible plumbing fixtures",
    confidence: "high",
    detectedItems: [
      { label: "Single-handle faucet", category: "fixture", detail: "Chrome finish, moderate wear, ~10 years old" },
      { label: "Pedestal sink", category: "fixture", detail: "Porcelain, minor chips on rim" },
      { label: "Exposed copper supply lines", category: "material", detail: "1/2\" copper, showing patina. Likely original" },
      { label: "Tile backsplash", category: "structure", detail: "Subway tile, grout darkening around faucet" },
      { label: "Shut-off valves", category: "fixture", detail: "Gate valves, recommend upgrading to quarter-turn" },
    ],
    suggestedServices: [
      {
        name: "Bathroom Faucet Replacement",
        description: "Remove worn faucet, install new single-handle fixture with updated supply lines",
        estimatedPrice: 385,
        materials: [
          { name: "Bathroom faucet", unitCost: 120, quantity: 1 },
          { name: "Supply lines (pair)", unitCost: 12, quantity: 1 },
          { name: "Plumber's putty", unitCost: 8, quantity: 1 },
        ],
        laborHours: 1.5,
        confidence: "high",
      },
      {
        name: "Shut-off Valve Upgrade",
        description: "Replace gate valves with quarter-turn ball valves for reliable shut-off",
        estimatedPrice: 220,
        materials: [
          { name: "Ball valve (1/2\")", unitCost: 18, quantity: 2 },
          { name: "SharkBite fitting", unitCost: 12, quantity: 2 },
        ],
        laborHours: 1,
        confidence: "high",
      },
      {
        name: "Supply Line Replacement",
        description: "Replace aging copper supply lines with braided stainless steel",
        estimatedPrice: 165,
        materials: [
          { name: "Braided supply lines", unitCost: 14, quantity: 2 },
          { name: "Teflon tape", unitCost: 3, quantity: 1 },
        ],
        laborHours: 0.75,
        confidence: "medium",
      },
    ],
    insights: [
      "Gate valves are a common failure point. Upgrading to quarter-turn ball valves is a high-value upsell (95% of SPs recommend it).",
      "Copper patina suggests original plumbing. Worth mentioning a whole-bathroom inspection as an add-on.",
      "Based on fixture age, this client may be open to a full bathroom refresh package.",
    ],
  },
  kitchen: {
    status: "success",
    scene: "Kitchen under-sink area with visible plumbing",
    confidence: "high",
    detectedItems: [
      { label: "Garbage disposal unit", category: "fixture", detail: "1/3 HP Badger model, ~8 years, showing corrosion at base" },
      { label: "P-trap assembly", category: "material", detail: "PVC, good condition" },
      { label: "Hot/cold supply valves", category: "fixture", detail: "Multi-turn gate valves, slight lime buildup" },
      { label: "Dishwasher drain hose", category: "material", detail: "Connected to disposal, loop installed correctly" },
      { label: "Water staining", category: "condition", detail: "Cabinet floor has water marks, possible slow leak" },
    ],
    suggestedServices: [
      {
        name: "Garbage Disposal Replacement",
        description: "Remove corroding disposal, install new 1/2 HP unit with fresh mounting hardware",
        estimatedPrice: 420,
        materials: [
          { name: "Garbage disposal (1/2 HP)", unitCost: 145, quantity: 1 },
          { name: "Discharge tube", unitCost: 8, quantity: 1 },
          { name: "Plumber's putty", unitCost: 8, quantity: 1 },
        ],
        laborHours: 1.5,
        confidence: "high",
      },
      {
        name: "Under-Sink Leak Investigation",
        description: "Pressure test connections, identify leak source, repair as needed",
        estimatedPrice: 185,
        materials: [
          { name: "Teflon tape", unitCost: 3, quantity: 1 },
          { name: "Silicone sealant", unitCost: 7, quantity: 1 },
        ],
        laborHours: 1,
        confidence: "high",
      },
      {
        name: "Supply Valve Upgrade",
        description: "Replace old gate valves with quarter-turn ball valves",
        estimatedPrice: 195,
        materials: [
          { name: "Ball valve (1/2\")", unitCost: 18, quantity: 2 },
          { name: "SharkBite fitting", unitCost: 12, quantity: 2 },
        ],
        laborHours: 0.75,
        confidence: "medium",
      },
    ],
    insights: [
      "Water staining on cabinet floor is a red flag. Recommend leak investigation before disposal replacement.",
      "Corrosion at the disposal base typically means 1-2 years before failure. Proactive replacement avoids an emergency call.",
      "Bundle the disposal and valve upgrade as a kitchen plumbing refresh. Average ticket goes up 40%.",
    ],
  },
  exterior: {
    status: "success",
    scene: "Exterior of residential property showing outdoor plumbing",
    confidence: "medium",
    detectedItems: [
      { label: "Outdoor hose bib", category: "fixture", detail: "Standard sillcock, no freeze protection visible" },
      { label: "Exposed pipe run", category: "material", detail: "Copper, running along foundation wall, uninsulated" },
      { label: "Sump pump discharge", category: "structure", detail: "PVC discharge pipe exiting through foundation" },
      { label: "Downspout connection", category: "structure", detail: "Downspout directing water near foundation" },
    ],
    suggestedServices: [
      {
        name: "Frost-Free Hose Bib Install",
        description: "Replace standard hose bib with frost-free sillcock to prevent winter freeze damage",
        estimatedPrice: 285,
        materials: [
          { name: "Frost-free sillcock (12\")", unitCost: 45, quantity: 1 },
          { name: "SharkBite fitting", unitCost: 12, quantity: 1 },
          { name: "Silicone sealant", unitCost: 7, quantity: 1 },
        ],
        laborHours: 1.5,
        confidence: "high",
      },
      {
        name: "Pipe Insulation - Exterior Run",
        description: "Insulate exposed copper pipe along foundation to prevent freezing",
        estimatedPrice: 140,
        materials: [
          { name: "Pipe insulation (6ft)", unitCost: 4, quantity: 4 },
          { name: "Insulation tape", unitCost: 5, quantity: 1 },
        ],
        laborHours: 0.75,
        confidence: "high",
      },
    ],
    insights: [
      "Uninsulated exterior pipe in Vancouver is a freeze risk in January. Seasonal promotion opportunity.",
      "Sump pump discharge looks functional but worth checking the pump age during the visit.",
      "Downspout directing water near foundation could cause basement moisture issues. Cross-sell opportunity.",
    ],
  },
};

export async function analyzeJobPhoto(_imageUrl: string): Promise<ImageAnalysisResult> {
  await new Promise((r) => setTimeout(r, 2200 + Math.random() * 800));
  const scenarios = Object.values(IMAGE_SCENARIOS);
  const pick = scenarios[Math.floor(Math.random() * scenarios.length)];
  return pick;
}

/* ───── Area average pricing (mock competitive data) ───── */

export function getAreaAverage(serviceName: string, unitPrice: number): { avg: number; low: number; high: number } | null {
  if (unitPrice <= 0) return null;
  const seed = serviceName.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const variance = 0.15 + (seed % 20) / 100;
  const skew = ((seed % 7) - 3) / 100;
  const avg = Math.round(unitPrice * (1 + skew) / 5) * 5;
  const low = Math.round(avg * (1 - variance));
  const high = Math.round(avg * (1 + variance));
  return { avg, low, high };
}

/* ───── External product catalog (mock supplier data) ───── */

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  model: string;
  unitCost: number;
  category: string;
  tier?: "good" | "better" | "best";
  specs?: string;
}

const PRODUCT_CATALOG: CatalogProduct[] = [
  // Faucets
  { id: "cat-faucet-1", name: "Glacier Bay Single-Handle Kitchen Faucet", brand: "Glacier Bay", model: "67552-0001", unitCost: 89, category: "faucet", tier: "good", specs: "Chrome, pull-down spray" },
  { id: "cat-faucet-2", name: "Moen Adler Pull-Down Kitchen Faucet", brand: "Moen", model: "87233SRS", unitCost: 179, category: "faucet", tier: "better", specs: "Spot Resist Stainless, Reflex system" },
  { id: "cat-faucet-3", name: "Kohler Simplice Touchless Kitchen Faucet", brand: "Kohler", model: "K-22036-VS", unitCost: 389, category: "faucet", tier: "best", specs: "Vibrant Stainless, Response touchless" },
  { id: "cat-faucet-4", name: "Delta Leland Pull-Down Kitchen Faucet", brand: "Delta", model: "9178-AR-DST", unitCost: 249, category: "faucet", tier: "better", specs: "Arctic Stainless, MagnaTite docking" },

  // Water heaters
  { id: "cat-heater-1", name: "Rheem 40 Gal Gas Water Heater", brand: "Rheem", model: "XG40S09HE40U0", unitCost: 529, category: "water heater", tier: "good", specs: "40 gal, 40K BTU, 6-year warranty" },
  { id: "cat-heater-2", name: "A.O. Smith 50 Gal Gas Water Heater", brand: "A.O. Smith", model: "G6-DVS5050NV", unitCost: 689, category: "water heater", tier: "better", specs: "50 gal, 50K BTU, 9-year warranty" },
  { id: "cat-heater-3", name: "Navien NPE-240A2 Tankless", brand: "Navien", model: "NPE-240A2", unitCost: 1380, category: "water heater", tier: "best", specs: "199K BTU, condensing, Wi-Fi, 15-year HX warranty" },
  { id: "cat-heater-4", name: "Rinnai RU199iN Tankless", brand: "Rinnai", model: "RU199iN", unitCost: 1620, category: "water heater", tier: "best", specs: "199K BTU, recirculation-ready, 12-year HX warranty" },

  // Toilets
  { id: "cat-toilet-1", name: "American Standard Cadet 3 Round", brand: "American Standard", model: "3378.128ST.020", unitCost: 189, category: "toilet", tier: "good", specs: "Round front, 1.28 GPF, EverClean" },
  { id: "cat-toilet-2", name: "TOTO Drake II Elongated", brand: "TOTO", model: "CST454CEFG#01", unitCost: 329, category: "toilet", tier: "better", specs: "Elongated, Tornado Flush, CeFiONtect glaze" },
  { id: "cat-toilet-3", name: "Kohler Wellworth Comfort Height", brand: "Kohler", model: "K-3999-0", unitCost: 259, category: "toilet", tier: "better", specs: "Comfort height, elongated, Class Five flushing" },

  // Valves and parts
  { id: "cat-valve-1", name: "Moen Posi-Temp Valve", brand: "Moen", model: "2520", unitCost: 72, category: "valve", tier: "good", specs: "Pressure-balancing, rough-in" },
  { id: "cat-valve-2", name: "Delta MultiChoice Universal Valve", brand: "Delta", model: "R10000-UNBX", unitCost: 45, category: "valve", specs: "Universal, PEX or copper" },

  // Sump pumps
  { id: "cat-pump-1", name: "Wayne CDU800 1/2 HP Sump Pump", brand: "Wayne", model: "CDU800", unitCost: 145, category: "sump pump", tier: "good", specs: "1/2 HP, 4600 GPH, cast iron/steel" },
  { id: "cat-pump-2", name: "Zoeller M53 Mighty-mate 1/3 HP", brand: "Zoeller", model: "53-0001", unitCost: 199, category: "sump pump", tier: "better", specs: "1/3 HP, cast iron, 2-year warranty" },
  { id: "cat-pump-3", name: "Wayne WSS30VN Battery Backup", brand: "Wayne", model: "WSS30VN", unitCost: 289, category: "sump pump", tier: "best", specs: "Combination 1/2 HP + battery backup" },

  // Garbage disposals
  { id: "cat-disposal-1", name: "InSinkErator Badger 5 (1/2 HP)", brand: "InSinkErator", model: "Badger 5", unitCost: 99, category: "disposal", tier: "good", specs: "1/2 HP, continuous feed" },
  { id: "cat-disposal-2", name: "InSinkErator Evolution Compact (3/4 HP)", brand: "InSinkErator", model: "Evolution Compact", unitCost: 219, category: "disposal", tier: "better", specs: "3/4 HP, 2-stage grind, SoundSeal" },
  { id: "cat-disposal-3", name: "InSinkErator Evolution Excel (1 HP)", brand: "InSinkErator", model: "Evolution Excel", unitCost: 389, category: "disposal", tier: "best", specs: "1 HP, 3-stage grind, ultra-quiet" },

  // Water softeners
  { id: "cat-softener-1", name: "GE 30,000 Grain Water Softener", brand: "GE", model: "GXSF30V", unitCost: 449, category: "water softener", tier: "good", specs: "30K grain, smart soft water technology" },
  { id: "cat-softener-2", name: "Whirlpool 44,000 Grain Softener", brand: "Whirlpool", model: "WHES44", unitCost: 649, category: "water softener", tier: "better", specs: "44K grain, demand-initiated regeneration" },
];

export function searchProductCatalog(query: string): CatalogProduct[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return PRODUCT_CATALOG.filter(
    (p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.model.toLowerCase().includes(q)
  ).slice(0, 8);
}

export function getCatalogProductsByCategory(category: string): CatalogProduct[] {
  const c = category.toLowerCase();
  return PRODUCT_CATALOG.filter((p) => p.category.toLowerCase().includes(c));
}

export function generatePortfolioNarrative(brandPhilosophy: string, serviceCount: number, categories: string[]): string {
  const catList = categories.length > 0
    ? categories.slice(0, 3).join(", ").toLowerCase()
    : "residential services";
  if (brandPhilosophy) {
    return `${brandPhilosophy.replace(/\.$/, "")}. With ${serviceCount} services across ${catList}, we bring the right expertise to every job. Browse our offerings below and request a quote for your project.`;
  }
  return `We offer ${serviceCount} professional services across ${catList}. Every job is performed by our licensed, insured team with guaranteed workmanship. Browse our offerings and request a quote tailored to your needs.`;
}
