/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminUsers from "../adminUsers.js";
import type * as alternatives from "../alternatives.js";
import type * as alternativesMutations from "../alternativesMutations.js";
import type * as assembly from "../assembly.js";
import type * as auth from "../auth.js";
import type * as brandSuggestions from "../brandSuggestions.js";
import type * as checkins from "../checkins.js";
import type * as contentArticles from "../contentArticles.js";
import type * as crons from "../crons.js";
import type * as deduplication from "../deduplication.js";
import type * as enrichment from "../enrichment.js";
import type * as enrichmentMutations from "../enrichmentMutations.js";
import type * as extraction from "../extraction.js";
import type * as extractionMutations from "../extractionMutations.js";
import type * as http from "../http.js";
import type * as ingredientQueue from "../ingredientQueue.js";
import type * as ingredientScoring from "../ingredientScoring.js";
import type * as ingredients from "../ingredients.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_authHelpers from "../lib/authHelpers.js";
import type * as lib_ingredientFunctionPrompt from "../lib/ingredientFunctionPrompt.js";
import type * as lib_ingredientScoringPrompt from "../lib/ingredientScoringPrompt.js";
import type * as lib_normalizeMotivation from "../lib/normalizeMotivation.js";
import type * as lib_offMappings from "../lib/offMappings.js";
import type * as lib_premium from "../lib/premium.js";
import type * as lib_scoringPrompt from "../lib/scoringPrompt.js";
import type * as lib_validator from "../lib/validator.js";
import type * as migrations_backfillMotivation from "../migrations/backfillMotivation.js";
import type * as pantry from "../pantry.js";
import type * as products from "../products.js";
import type * as recommendations from "../recommendations.js";
import type * as scoring from "../scoring.js";
import type * as scoringQueue from "../scoringQueue.js";
import type * as shoppingList from "../shoppingList.js";
import type * as userProfiles from "../userProfiles.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminUsers: typeof adminUsers;
  alternatives: typeof alternatives;
  alternativesMutations: typeof alternativesMutations;
  assembly: typeof assembly;
  auth: typeof auth;
  brandSuggestions: typeof brandSuggestions;
  checkins: typeof checkins;
  contentArticles: typeof contentArticles;
  crons: typeof crons;
  deduplication: typeof deduplication;
  enrichment: typeof enrichment;
  enrichmentMutations: typeof enrichmentMutations;
  extraction: typeof extraction;
  extractionMutations: typeof extractionMutations;
  http: typeof http;
  ingredientQueue: typeof ingredientQueue;
  ingredientScoring: typeof ingredientScoring;
  ingredients: typeof ingredients;
  "lib/auth": typeof lib_auth;
  "lib/authHelpers": typeof lib_authHelpers;
  "lib/ingredientFunctionPrompt": typeof lib_ingredientFunctionPrompt;
  "lib/ingredientScoringPrompt": typeof lib_ingredientScoringPrompt;
  "lib/normalizeMotivation": typeof lib_normalizeMotivation;
  "lib/offMappings": typeof lib_offMappings;
  "lib/premium": typeof lib_premium;
  "lib/scoringPrompt": typeof lib_scoringPrompt;
  "lib/validator": typeof lib_validator;
  "migrations/backfillMotivation": typeof migrations_backfillMotivation;
  pantry: typeof pantry;
  products: typeof products;
  recommendations: typeof recommendations;
  scoring: typeof scoring;
  scoringQueue: typeof scoringQueue;
  shoppingList: typeof shoppingList;
  userProfiles: typeof userProfiles;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
