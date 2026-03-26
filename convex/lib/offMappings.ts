/**
 * Epic 2 — Open Food Facts Mapping Tables
 *
 * Pure functions for mapping OFF API tags to Clarvn schema values.
 * No Convex runtime dependency — safe to import anywhere.
 */

type CategoryMapping = { category: string; subcategory?: string };

/**
 * Maps OFF `categories_tags` entries to Clarvn category/subcategory.
 * Ordered from most-specific to least-specific within each category group.
 */
export const OFF_CATEGORY_MAP: Record<string, CategoryMapping> = {
  // Snacks
  "en:chips-and-crisps": { category: "snacks", subcategory: "chips" },
  "en:chips": { category: "snacks", subcategory: "chips" },
  "en:crisps": { category: "snacks", subcategory: "chips" },
  "en:crackers": { category: "snacks", subcategory: "crackers" },
  "en:popcorn": { category: "snacks", subcategory: "popcorn" },
  "en:pretzels": { category: "snacks", subcategory: "pretzels" },
  "en:corn-chips": { category: "snacks", subcategory: "chips" },
  "en:pork-rinds": { category: "snacks", subcategory: "chips" },
  "en:rice-cakes": { category: "snacks", subcategory: "crackers" },
  "en:salty-snacks": { category: "snacks" },
  "en:sweet-snacks": { category: "snacks", subcategory: "sweet_snacks" },
  "en:snacks": { category: "snacks" },

  // Dairy
  "en:yogurts": { category: "dairy", subcategory: "yogurt" },
  "en:greek-yogurts": { category: "dairy", subcategory: "yogurt" },
  "en:milks": { category: "dairy", subcategory: "milk" },
  "en:whole-milks": { category: "dairy", subcategory: "milk" },
  "en:skim-milks": { category: "dairy", subcategory: "milk" },
  "en:cheeses": { category: "dairy", subcategory: "cheese" },
  "en:butters": { category: "dairy", subcategory: "butter" },
  "en:creams": { category: "dairy", subcategory: "cream" },
  "en:sour-creams": { category: "dairy", subcategory: "cream" },
  "en:cream-cheeses": { category: "dairy", subcategory: "cheese" },
  "en:cottage-cheeses": { category: "dairy", subcategory: "cheese" },
  "en:dairies": { category: "dairy" },

  // Beverages
  "en:colas": { category: "beverages", subcategory: "soda" },
  "en:sodas": { category: "beverages", subcategory: "soda" },
  "en:carbonated-beverages": { category: "beverages", subcategory: "soda" },
  "en:fruit-juices": { category: "beverages", subcategory: "juice" },
  "en:juices": { category: "beverages", subcategory: "juice" },
  "en:sparkling-waters": { category: "beverages", subcategory: "water" },
  "en:waters": { category: "beverages", subcategory: "water" },
  "en:teas": { category: "beverages", subcategory: "tea" },
  "en:iced-teas": { category: "beverages", subcategory: "tea" },
  "en:coffees": { category: "beverages", subcategory: "coffee" },
  "en:energy-drinks": { category: "beverages", subcategory: "energy_drink" },
  "en:sport-drinks": { category: "beverages", subcategory: "sports_drink" },
  "en:plant-milks": { category: "beverages", subcategory: "plant_milk" },
  "en:oat-drinks": { category: "beverages", subcategory: "plant_milk" },
  "en:almond-milks": { category: "beverages", subcategory: "plant_milk" },
  "en:beverages": { category: "beverages" },

  // Breakfast
  "en:breakfast-cereals": { category: "breakfast", subcategory: "cereal" },
  "en:hot-cereals": { category: "breakfast", subcategory: "oatmeal" },
  "en:oatmeals": { category: "breakfast", subcategory: "oatmeal" },
  "en:granolas": { category: "breakfast", subcategory: "granola" },
  "en:mueslis": { category: "breakfast", subcategory: "granola" },
  "en:pancake-mixes": { category: "breakfast", subcategory: "pancake_waffle" },
  "en:waffles": { category: "breakfast", subcategory: "pancake_waffle" },
  "en:breakfast-bars": { category: "breakfast", subcategory: "bar" },
  "en:breakfasts": { category: "breakfast" },

  // Pantry Staples
  "en:pastas": { category: "pantry_staples", subcategory: "pasta" },
  "en:rices": { category: "pantry_staples", subcategory: "rice" },
  "en:white-rices": { category: "pantry_staples", subcategory: "rice" },
  "en:brown-rices": { category: "pantry_staples", subcategory: "rice" },
  "en:breads": { category: "pantry_staples", subcategory: "bread" },
  "en:white-breads": { category: "pantry_staples", subcategory: "bread" },
  "en:whole-wheat-breads": { category: "pantry_staples", subcategory: "bread" },
  "en:canned-foods": { category: "pantry_staples", subcategory: "canned" },
  "en:canned-vegetables": { category: "pantry_staples", subcategory: "canned" },
  "en:canned-beans": { category: "pantry_staples", subcategory: "canned" },
  "en:tomato-sauces": { category: "pantry_staples", subcategory: "sauce" },
  "en:pasta-sauces": { category: "pantry_staples", subcategory: "sauce" },
  "en:sauces": { category: "pantry_staples", subcategory: "sauce" },
  "en:ketchups": { category: "pantry_staples", subcategory: "condiment" },
  "en:mustards": { category: "pantry_staples", subcategory: "condiment" },
  "en:mayonnaises": { category: "pantry_staples", subcategory: "condiment" },
  "en:salad-dressings": { category: "pantry_staples", subcategory: "condiment" },
  "en:condiments": { category: "pantry_staples", subcategory: "condiment" },
  "en:vegetable-oils": { category: "pantry_staples", subcategory: "oil" },
  "en:olive-oils": { category: "pantry_staples", subcategory: "oil" },
  "en:coconut-oils": { category: "pantry_staples", subcategory: "oil" },
  "en:oils": { category: "pantry_staples", subcategory: "oil" },
  "en:flours": { category: "pantry_staples", subcategory: "flour" },
  "en:sugars": { category: "pantry_staples", subcategory: "sweetener" },
  "en:honey": { category: "pantry_staples", subcategory: "sweetener" },
  "en:soy-sauces": { category: "pantry_staples", subcategory: "sauce" },
  "en:hot-sauces": { category: "pantry_staples", subcategory: "condiment" },
  "en:broths": { category: "pantry_staples", subcategory: "broth" },
  "en:stocks": { category: "pantry_staples", subcategory: "broth" },
  "en:pantry-staples": { category: "pantry_staples" },

  // Frozen
  "en:frozen-pizzas": { category: "frozen", subcategory: "pizza" },
  "en:frozen-meals": { category: "frozen", subcategory: "entree" },
  "en:frozen-entrees": { category: "frozen", subcategory: "entree" },
  "en:frozen-vegetables": { category: "frozen", subcategory: "vegetables" },
  "en:frozen-fruits": { category: "frozen", subcategory: "fruit" },
  "en:ice-creams": { category: "frozen", subcategory: "ice_cream" },
  "en:frozen-yogurts": { category: "frozen", subcategory: "ice_cream" },
  "en:sorbets": { category: "frozen", subcategory: "ice_cream" },
  "en:frozen-desserts": { category: "frozen", subcategory: "ice_cream" },
  "en:frozen-foods": { category: "frozen" },

  // Meat & Protein
  "en:beef": { category: "meat_protein", subcategory: "beef" },
  "en:chicken": { category: "meat_protein", subcategory: "poultry" },
  "en:turkey": { category: "meat_protein", subcategory: "poultry" },
  "en:poultry": { category: "meat_protein", subcategory: "poultry" },
  "en:processed-meats": { category: "meat_protein", subcategory: "deli_meat" },
  "en:deli-meats": { category: "meat_protein", subcategory: "deli_meat" },
  "en:hot-dogs": { category: "meat_protein", subcategory: "deli_meat" },
  "en:sausages": { category: "meat_protein", subcategory: "deli_meat" },
  "en:fish": { category: "meat_protein", subcategory: "fish" },
  "en:tuna": { category: "meat_protein", subcategory: "fish" },
  "en:salmon": { category: "meat_protein", subcategory: "fish" },
  "en:plant-based-foods": { category: "meat_protein", subcategory: "plant_based" },
  "en:meat-alternatives": { category: "meat_protein", subcategory: "plant_based" },
  "en:tofu": { category: "meat_protein", subcategory: "plant_based" },
  "en:tempeh": { category: "meat_protein", subcategory: "plant_based" },
  "en:meats": { category: "meat_protein" },

  // Baked Goods
  "en:chocolate-cakes": { category: "baked_goods", subcategory: "cake" },
  "en:cakes": { category: "baked_goods", subcategory: "cake" },
  "en:muffins": { category: "baked_goods", subcategory: "muffin" },
  "en:cupcakes": { category: "baked_goods", subcategory: "cake" },
  "en:cookies": { category: "baked_goods", subcategory: "cookie" },
  "en:biscuits": { category: "baked_goods", subcategory: "cookie" },
  "en:brownies": { category: "baked_goods", subcategory: "cookie" },
  "en:donuts": { category: "baked_goods", subcategory: "pastry" },
  "en:pastries": { category: "baked_goods", subcategory: "pastry" },
  "en:pies": { category: "baked_goods", subcategory: "pastry" },
  "en:baked-goods": { category: "baked_goods" },

  // Candy & Chocolate
  "en:chocolates": { category: "candy", subcategory: "chocolate" },
  "en:dark-chocolates": { category: "candy", subcategory: "chocolate" },
  "en:milk-chocolates": { category: "candy", subcategory: "chocolate" },
  "en:chocolate-bars": { category: "candy", subcategory: "chocolate" },
  "en:gummies": { category: "candy", subcategory: "gummy" },
  "en:hard-candies": { category: "candy", subcategory: "hard_candy" },
  "en:candies": { category: "candy" },

  // Baby & Kids
  "en:baby-formulas": { category: "baby_kids", subcategory: "baby_formula" },
  "en:baby-milks": { category: "baby_kids", subcategory: "baby_formula" },
  "en:baby-foods": { category: "baby_kids", subcategory: "baby_food" },
  "en:baby-cereals": { category: "baby_kids", subcategory: "baby_food" },
  "en:baby-snacks": { category: "baby_kids", subcategory: "baby_snack" },

  // Produce
  "en:fresh-vegetables": { category: "produce", subcategory: "vegetables" },
  "en:fresh-fruits": { category: "produce", subcategory: "fruit" },
  "en:fresh-herbs": { category: "produce", subcategory: "herbs" },
  "en:produce": { category: "produce" },

  // Supplements & Health
  "en:dietary-supplements": { category: "supplements" },
  "en:protein-powders": { category: "supplements", subcategory: "protein" },
  "en:vitamins": { category: "supplements", subcategory: "vitamins" },

  // Bars
  "en:energy-bars": { category: "bars", subcategory: "energy_bar" },
  "en:protein-bars": { category: "bars", subcategory: "protein_bar" },
  "en:granola-bars": { category: "bars", subcategory: "granola_bar" },
  "en:cereal-bars": { category: "bars", subcategory: "granola_bar" },
  "en:nutrition-bars": { category: "bars" },
};

/**
 * Maps an array of OFF `categories_tags` to a Clarvn category + subcategory.
 * Checks from most-specific (end of array) to least-specific (start).
 * Returns null if no mapping found.
 */
export function mapOFFCategory(categoryTags: string[]): CategoryMapping | null {
  // Most-specific tags are typically at the end of the OFF array
  for (let i = categoryTags.length - 1; i >= 0; i--) {
    const mapped = OFF_CATEGORY_MAP[categoryTags[i]];
    if (mapped) return mapped;
  }
  return null;
}

/**
 * Maps OFF `labels_tags` to Clarvn claim strings.
 * Deduplicates (e.g. en:organic and en:usda-organic both → usda_organic).
 */
export const OFF_LABEL_MAP: Record<string, string> = {
  // Organic
  "en:organic": "usda_organic",
  "en:usda-organic": "usda_organic",
  "en:eu-organic": "eu_organic",
  "en:certified-organic": "usda_organic",
  // Non-GMO
  "en:non-gmo": "non_gmo",
  "en:non-gmo-project-verified": "non_gmo",
  "en:no-gmos": "non_gmo",
  "en:gmo-free": "non_gmo",
  // Gluten
  "en:gluten-free": "gluten_free",
  "en:no-gluten": "gluten_free",
  "en:certified-gluten-free": "gluten_free",
  // Diet
  "en:vegan": "vegan",
  "en:vegetarian": "vegetarian",
  "en:plant-based": "vegan",
  // Religious
  "en:kosher": "kosher",
  "en:halal": "halal",
  // Trade
  "en:fair-trade": "fair_trade",
  "en:fairtrade": "fair_trade",
  "en:rainforest-alliance": "rainforest_alliance",
  // Additives
  "en:no-artificial-flavors": "no_artificial_flavors",
  "en:no-artificial-flavours": "no_artificial_flavors",
  "en:no-preservatives": "no_preservatives",
  "en:no-artificial-colors": "no_artificial_colors",
  "en:no-artificial-colours": "no_artificial_colors",
  "en:no-artificial-additives": "no_artificial_flavors",
  // Sugar
  "en:no-added-sugar": "no_added_sugar",
  "en:no-added-sugars": "no_added_sugar",
  "en:sugar-free": "sugar_free",
  "en:unsweetened": "no_added_sugar",
  // Allergens
  "en:lactose-free": "lactose_free",
  "en:dairy-free": "dairy_free",
  "en:soy-free": "soy_free",
  "en:nut-free": "nut_free",
  "en:peanut-free": "peanut_free",
  // Other
  "en:whole-grain": "whole_grain",
  "en:whole-grains": "whole_grain",
  "en:no-palm-oil": "no_palm_oil",
  "en:palm-oil-free": "no_palm_oil",
};

/**
 * Maps an array of OFF `labels_tags` to Clarvn claim strings.
 * Returns deduplicated array.
 */
export function mapOFFLabels(labelTags: string[]): string[] {
  const claims = new Set<string>();
  for (const tag of labelTags) {
    const mapped = OFF_LABEL_MAP[tag];
    if (mapped) claims.add(mapped);
  }
  return Array.from(claims);
}
