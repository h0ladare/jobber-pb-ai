export const PRODUCT_NAME = "Pricebook";

export interface BusinessInfo {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  licenseNumber: string;
  logo?: string;
  brandPhilosophy?: string;
  coverPhotoUrl?: string;
}

export const MOCK_BUSINESS: BusinessInfo = {
  name: "GaryFlow Plumbing",
  tagline: "Residential Plumbing Done Right",
  phone: "(604) 555-0187",
  email: "quotes@garyflow.ca",
  address: "2847 Kingsway, Vancouver, BC V5R 5H9",
  licenseNumber: "LIC-BC-48291",
  logo: "/sp-logo.png",
  brandPhilosophy: "Quality-first residential plumbing. We use premium fixtures, explain every option honestly, and guarantee our work for two years. No shortcuts, no surprises on your invoice.",
  coverPhotoUrl: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1200&h=400&fit=crop",
};

export interface MarkupRule {
  type: "percentage" | "fixed";
  value: number;
}

export interface MaterialVariant {
  id: string;
  name: string;
  unitCost: number;
  quantity: number;
  imageUrl?: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  unitCost: number;
  quantity: number;
  unitType: string;
  markup: MarkupRule;
  variants?: MaterialVariant[];
}

export interface LaborInput {
  id: string;
  description: string;
  hourlyRate: number;
  estimatedHours: number;
  costRate?: number;
}

export type PriceMode = "manual" | "calculated";

export interface OptionTier {
  id: string;
  label: string;
  description: string;
  price: number;
  highlights: string[];
  marginPercent: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  unitPrice: number;
  unitType: string;
  taxable: boolean;
  priceMode: PriceMode;
  materials: MaterialItem[];
  labor: LaborInput[];
  markupRule: MarkupRule;
  category?: string;
  optionTiers?: OptionTier[];
  gbbEnabled?: boolean;
  childServiceIds?: string[];
}

export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  serviceIds: string[];
  discountPercent: number;
  category?: string;
}

export function calcMaterialBase(m: MaterialItem): number {
  if (m.variants && m.variants.length > 0) {
    return m.variants.reduce((sum, v) => sum + v.unitCost * v.quantity, 0);
  }
  return m.unitCost * m.quantity;
}

export function calcMaterialMarkup(m: MaterialItem): number {
  const base = calcMaterialBase(m);
  return m.markup.type === "percentage"
    ? base * (m.markup.value / 100)
    : m.markup.value;
}

export function calcMaterialSubtotal(m: MaterialItem): number {
  return calcMaterialBase(m) + calcMaterialMarkup(m);
}

export function calcLaborSubtotal(l: LaborInput): number {
  return l.hourlyRate * l.estimatedHours;
}

export function calcServiceTotals(service: Pick<Service, "materials" | "labor" | "markupRule">) {
  const materialTotal = service.materials.reduce((sum, m) => sum + calcMaterialSubtotal(m), 0);
  const rawMaterialCost = service.materials.reduce((sum, m) => sum + m.unitCost * m.quantity, 0);
  const laborTotal = service.labor.reduce((sum, l) => sum + calcLaborSubtotal(l), 0);
  const laborCost = service.labor.reduce((sum, l) => sum + (l.costRate ?? l.hourlyRate) * l.estimatedHours, 0);
  const costTotal = materialTotal + laborTotal;
  const rawCost = rawMaterialCost + laborCost;
  const serviceMarkup = service.markupRule.type === "percentage"
    ? costTotal * (service.markupRule.value / 100)
    : service.markupRule.value;
  const calculatedPrice = costTotal + serviceMarkup;
  return { materialTotal, rawMaterialCost, laborTotal, laborCost, costTotal, rawCost, serviceMarkup, calculatedPrice };
}

export function calcServicePrice(service: Pick<Service, "materials" | "labor" | "markupRule">): number {
  return calcServiceTotals(service).calculatedPrice;
}

function svc(partial: Omit<Service, "unitPrice"> & { unitPrice?: number }): Service {
  const calculated = calcServicePrice(partial);
  return { ...partial, unitPrice: partial.unitPrice ?? calculated } as Service;
}

export const MOCK_SERVICES: Service[] = [
  svc({
    id: "svc-1",
    name: "Kitchen Faucet Replacement",
    description: "Remove existing faucet, install new faucet with supply lines",
    imageUrl: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop",
    unitPrice: 470,
    unitType: "flat",
    taxable: true,
    priceMode: "calculated",
    category: "Fixtures",
    materials: [
      {
        id: "m1", name: "Kitchen faucet", unitCost: 180, quantity: 1, unitType: "each", markup: { type: "percentage", value: 35 },
        variants: [
          { id: "var-glacier", name: "Glacier Bay Single-Handle", unitCost: 89, quantity: 1 },
          { id: "var-moen", name: "Moen Adler Pull-Down", unitCost: 179, quantity: 1 },
          { id: "var-kohler", name: "Kohler Simplice Touchless", unitCost: 389, quantity: 1 },
        ],
      },
      { id: "m2", name: "Supply lines", unitCost: 12, quantity: 2, unitType: "each", markup: { type: "percentage", value: 35 } },
      { id: "m3", name: "Plumber's putty", unitCost: 8, quantity: 1, unitType: "each", markup: { type: "percentage", value: 35 } },
    ],
    labor: [
      { id: "l1", description: "Plumber - standard rate", hourlyRate: 85, estimatedHours: 1.5, costRate: 35 },
    ],
    markupRule: { type: "percentage", value: 0 },
    gbbEnabled: true,
    optionTiers: [
      { id: "tier-good", label: "Basic", description: "Reliable faucet, standard installation", price: 380, highlights: ["Glacier Bay single-handle faucet", "Supply line connection", "Leak test"], marginPercent: 38 },
      { id: "tier-better", label: "Mid-Range", description: "Quality fixture with valve refresh", price: 620, highlights: ["Moen pull-down faucet", "Shut-off valve refresh", "New braided supply lines", "Parts warranty"], marginPercent: 44 },
      { id: "tier-best", label: "Premium", description: "Designer touchless fixture, full upgrade", price: 1050, highlights: ["Kohler touchless faucet", "Full supply line upgrade", "Valve replacement", "Disposal of old fixture", "2-year labor warranty"], marginPercent: 52 },
    ],
  }),
  svc({
    id: "svc-2",
    name: "Water Heater Flush",
    description: "Drain, flush, and refill standard tank water heater",
    imageUrl: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=300&fit=crop",
    unitPrice: 185,
    unitType: "flat",
    taxable: true,
    priceMode: "calculated",
    category: "Maintenance",
    materials: [
      { id: "m4", name: "Garden hose adapter", unitCost: 8, quantity: 1, unitType: "each", markup: { type: "percentage", value: 20 } },
      { id: "m5", name: "Teflon tape", unitCost: 3, quantity: 1, unitType: "each", markup: { type: "percentage", value: 20 } },
    ],
    labor: [
      { id: "l2", description: "Plumber - standard rate", hourlyRate: 85, estimatedHours: 1.5, costRate: 35 },
    ],
    markupRule: { type: "percentage", value: 10 },
  }),
  svc({
    id: "svc-3",
    name: "Toilet Replacement",
    description: "Remove old toilet, install new toilet with wax ring and supply",
    unitPrice: 425,
    unitType: "flat",
    taxable: true,
    priceMode: "manual",
    category: "Fixtures",
    materials: [],
    labor: [],
    markupRule: { type: "percentage", value: 0 },
  }),
  svc({
    id: "svc-4",
    name: "Garbage Disposal Install",
    description: "Install new garbage disposal unit under kitchen sink",
    unitPrice: 380,
    unitType: "flat",
    taxable: true,
    priceMode: "manual",
    category: "Installation",
    materials: [],
    labor: [],
    markupRule: { type: "percentage", value: 0 },
  }),
  svc({
    id: "svc-5",
    name: "Pipe Insulation - per linear ft",
    description: "Insulate exposed pipes with foam insulation",
    unitPrice: 12,
    unitType: "per foot",
    taxable: false,
    priceMode: "manual",
    category: "Installation",
    materials: [],
    labor: [],
    markupRule: { type: "percentage", value: 0 },
  }),

  svc({
    id: "svc-6",
    name: "Drain Cleaning",
    description: "Snake or hydro-jet main drain or branch line, clear blockage, camera inspection",
    unitPrice: 275,
    unitType: "flat",
    taxable: true,
    priceMode: "calculated",
    category: "Maintenance",
    materials: [
      { id: "m6", name: "Drain auger blade", unitCost: 15, quantity: 1, unitType: "each", markup: { type: "percentage", value: 30 } },
      { id: "m7", name: "Enzyme drain cleaner", unitCost: 18, quantity: 1, unitType: "each", markup: { type: "percentage", value: 25 } },
    ],
    labor: [
      { id: "l3", description: "Plumber - standard rate", hourlyRate: 85, estimatedHours: 2, costRate: 35 },
    ],
    markupRule: { type: "percentage", value: 10 },
  }),
  svc({
    id: "svc-7",
    name: "Sump Pump Install",
    description: "Install new sump pump with check valve, discharge line, and battery backup",
    imageUrl: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop",
    unitPrice: 950,
    unitType: "flat",
    taxable: true,
    priceMode: "calculated",
    category: "Installation",
    materials: [
      { id: "m8", name: "Sump pump (1/3 HP)", unitCost: 180, quantity: 1, unitType: "each", markup: { type: "percentage", value: 35 } },
      { id: "m9", name: "Check valve", unitCost: 25, quantity: 1, unitType: "each", markup: { type: "percentage", value: 30 } },
      { id: "m10", name: "PVC discharge pipe", unitCost: 8, quantity: 10, unitType: "foot", markup: { type: "percentage", value: 25 } },
      { id: "m11", name: "Battery backup unit", unitCost: 120, quantity: 1, unitType: "each", markup: { type: "percentage", value: 30 } },
    ],
    labor: [
      { id: "l4", description: "Plumber - standard rate", hourlyRate: 85, estimatedHours: 3, costRate: 35 },
    ],
    markupRule: { type: "percentage", value: 5 },
  }),
  svc({
    id: "svc-8",
    name: "Shower Valve Replacement",
    description: "Replace shower mixing valve, update trim kit, test temperature and pressure",
    unitPrice: 520,
    unitType: "flat",
    taxable: true,
    priceMode: "calculated",
    category: "Fixtures",
    materials: [
      { id: "m12", name: "Pressure-balance valve body", unitCost: 85, quantity: 1, unitType: "each", markup: { type: "percentage", value: 35 } },
      { id: "m13", name: "Trim kit (handle + escutcheon)", unitCost: 65, quantity: 1, unitType: "each", markup: { type: "percentage", value: 30 } },
      { id: "m14", name: "SharkBite fittings", unitCost: 12, quantity: 2, unitType: "each", markup: { type: "percentage", value: 25 } },
    ],
    labor: [
      { id: "l5", description: "Plumber - standard rate", hourlyRate: 85, estimatedHours: 2.5, costRate: 35 },
    ],
    markupRule: { type: "percentage", value: 0 },
  }),
  svc({
    id: "svc-9",
    name: "Water Softener Install",
    description: "Install whole-home water softener with bypass valve and drain connection",
    unitPrice: 1450,
    unitType: "flat",
    taxable: true,
    priceMode: "manual",
    category: "Installation",
    materials: [],
    labor: [],
    markupRule: { type: "percentage", value: 0 },
  }),
  svc({
    id: "svc-10",
    name: "Water Heater Install",
    description: "Remove existing unit, install new water heater with supply lines, expansion tank, and code-compliant venting",
    unitPrice: 2200,
    unitType: "flat",
    taxable: true,
    priceMode: "calculated",
    category: "Installation",
    materials: [
      {
        id: "mat-heater",
        name: "Water Heater Unit",
        unitCost: 650,
        quantity: 1,
        unitType: "each",
        markup: { type: "percentage", value: 25 },
        variants: [
          { id: "var-40gal-gas", name: "40 Gal Gas Tank", unitCost: 580, quantity: 1 },
          { id: "var-50gal-gas", name: "50 Gal Gas Tank", unitCost: 720, quantity: 1 },
          { id: "var-tankless", name: "Tankless Gas (Navien)", unitCost: 1450, quantity: 1 },
        ],
      },
      {
        id: "mat-expansion",
        name: "Expansion tank + fittings",
        unitCost: 45,
        quantity: 1,
        unitType: "kit",
        markup: { type: "percentage", value: 20 },
      },
    ],
    labor: [
      { id: "lab-heater", description: "Removal, install & pressure test", hourlyRate: 95, estimatedHours: 4 },
    ],
    markupRule: { type: "percentage", value: 15 },
    gbbEnabled: true,
    optionTiers: [
      { id: "tier-good", label: "Standard Tank", description: "40-gallon gas tank water heater, reliable and budget-friendly", price: 1650, highlights: ["40 Gal gas tank heater", "Standard expansion tank", "Code-compliant venting", "Pressure test"], marginPercent: 35 },
      { id: "tier-better", label: "Large Tank", description: "50-gallon gas tank for bigger households", price: 2200, highlights: ["50 Gal gas tank heater", "Premium expansion tank", "Code-compliant venting", "Pressure test", "10-year tank warranty"], marginPercent: 40 },
      { id: "tier-best", label: "Tankless", description: "On-demand hot water, endless supply, energy savings", price: 3400, highlights: ["Navien tankless unit", "Condensing technology", "Wi-Fi monitoring", "Gas line upgrade if needed", "15-year heat exchanger warranty"], marginPercent: 48 },
    ],
  }),
];

export const MOCK_PACKAGES: ServicePackage[] = [
  {
    id: "pkg-1",
    name: "Kitchen Plumbing Refresh",
    description: "Faucet replacement plus garbage disposal install, bundled for one visit.",
    serviceIds: ["svc-1", "svc-4"],
    discountPercent: 10,
    category: "Fixtures",
  },
  {
    id: "pkg-2",
    name: "Bathroom Refresh",
    description: "Toilet replacement and shower valve upgrade in one appointment.",
    serviceIds: ["svc-3", "svc-8"],
    discountPercent: 10,
    category: "Fixtures",
  },
];

export interface QuoteLineItem {
  service: Service;
  quantity: number;
  adjustedPrice: number;
  materialOverrides?: Record<string, { quantity?: number }>;
  laborOverrides?: Record<string, { estimatedHours?: number }>;
  markupOverride?: MarkupRule;
  optionTiers?: OptionTier[];
  selectedTierId?: string;
  variantSelections?: Record<string, string>;
  packageGroupId?: string;
  packageName?: string;
}

export type QuoteStatus = "draft" | "review" | "sent" | "approved" | "declined" | "changes-requested";

export interface QuoteAssembly {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  date: string;
  validUntil: string;
  items: QuoteLineItem[];
  notes: string;
  depositPercent: number;
  internalNotes?: string;
}

export const MOCK_QUOTE: {
  clientName: string;
  quoteNumber: string;
  date: string;
  validUntil: string;
  items: QuoteLineItem[];
  depositPercent?: number;
  notes?: string;
} = {
  clientName: "Sarah Chen",
  quoteNumber: "Q-2026-0147",
  date: "March 29, 2026",
  validUntil: "April 28, 2026",
  depositPercent: 25,
  notes: "Work scheduled within 5 business days of approval. All areas left clean.",
  items: [
    {
      service: MOCK_SERVICES[0],
      quantity: 1,
      adjustedPrice: 620,
      optionTiers: MOCK_SERVICES[0].optionTiers,
      selectedTierId: "tier-better",
      variantSelections: { m1: "var-moen" },
    },
    {
      service: MOCK_SERVICES[1],
      quantity: 1,
      adjustedPrice: 185,
      laborOverrides: { l2: { estimatedHours: 2 } },
    },
  ],
};
