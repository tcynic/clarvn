export const MOTIVATION_CHIPS: string[] = [
  "General health & wellness",
  "Managing a chronic condition",
  "Avoiding specific additives",
  "Reducing processed foods",
  "Gut health & digestion",
  "Skin health",
  "Weight management",
  "Better energy levels",
  "Improved sleep",
  "Mental clarity & focus",
  "Reducing inflammation",
  "Heart health",
  "Blood sugar management",
  "Prenatal & pregnancy nutrition",
  "Hormone balance",
  "Athletic performance",
  "Post-illness recovery",
  "Avoiding artificial dyes",
  "Immune support",
  "Managing food sensitivities",
  "Environmental & sustainability",
  "Doctor's recommendation",
  "Learning what's in my food",
  "Transitioning to a new diet",
  "Reducing sugar intake",
  "Just curious",
];

export const CONDITIONS_CHIPS: string[] = [
  "Pregnant",
  "ADHD",
  "Anxiety or depression",
  "Autism spectrum",
  "Thyroid condition",
  "Eczema",
  "Psoriasis",
  "Hormone-sensitive condition",
  "PCOS or endometriosis",
  "Cancer history",
  "Autoimmune disease",
  "Type 1 diabetes",
  "Type 2 diabetes",
  "Heart condition",
  "High blood pressure",
  "High cholesterol",
  "Celiac disease",
  "Crohn's or IBD",
  "Kidney condition",
  "Liver condition",
  "Asthma",
  "Arthritis or joint pain",
  "Fibromyalgia",
];
export const CONDITIONS_EXCLUSIVE = "None of these";

export const SENSITIVITIES_CHIPS: string[] = [
  "IBS / gut issues",
  "Migraines",
  "Food allergies (general)",
  "Peanut allergy",
  "Tree nut allergy",
  "Shellfish allergy",
  "Egg sensitivity",
  "Lactose intolerance",
  "Gluten sensitivity (non-celiac)",
  "Soy sensitivity",
  "Corn sensitivity",
  "Histamine sensitivity",
  "Sulphite sensitivity",
  "Salicylate sensitivity",
  "Oxalate sensitivity",
  "FODMAP sensitivity",
  "Fructose intolerance",
  "Caffeine sensitivity",
  "Chemical / preservative sensitivity",
  "Nightshade sensitivity",
];
export const SENSITIVITIES_EXCLUSIVE = "None of these";

export const DIETARY_CHIPS: string[] = [
  "Gluten-free",
  "Dairy-free",
  "Vegan",
  "Vegetarian",
  "Nut-free",
  "Soy-free",
  "Low sodium",
  "Kosher",
  "Halal",
];
export const DIETARY_EXCLUSIVE = "No restrictions";

export const INGREDIENTS_TO_FLAG_CHIPS: string[] = [
  "Red 40",
  "Yellow 5",
  "Yellow 6",
  "Blue 1",
  "BHT",
  "BHA",
  "TBHQ",
  "HFCS",
  "Sodium nitrite",
  "Carrageenan",
  "Titanium dioxide",
  "Artificial flavors",
  "MSG",
  "Aspartame",
];

export interface HouseholdRole {
  label: string;
  role: string;
  ageRange?: string;
}

export const HOUSEHOLD_ROLES: HouseholdRole[] = [
  { label: "Partner", role: "partner" },
  { label: "Baby (0–1)", role: "baby", ageRange: "0-1" },
  { label: "Toddler (1–3)", role: "toddler", ageRange: "1-3" },
  { label: "Child (3–12)", role: "child", ageRange: "3-12" },
  { label: "Teen (13–17)", role: "teen", ageRange: "13-17" },
  { label: "Pregnant", role: "pregnant" },
];
