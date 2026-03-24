/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as assembly from "../assembly.js";
import type * as auth from "../auth.js";
import type * as extraction from "../extraction.js";
import type * as extractionMutations from "../extractionMutations.js";
import type * as http from "../http.js";
import type * as ingredientQueue from "../ingredientQueue.js";
import type * as ingredientScoring from "../ingredientScoring.js";
import type * as ingredients from "../ingredients.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_authHelpers from "../lib/authHelpers.js";
import type * as lib_ingredientScoringPrompt from "../lib/ingredientScoringPrompt.js";
import type * as lib_scoringPrompt from "../lib/scoringPrompt.js";
import type * as lib_validator from "../lib/validator.js";
import type * as migrations from "../migrations.js";
import type * as products from "../products.js";
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
  assembly: typeof assembly;
  auth: typeof auth;
  extraction: typeof extraction;
  extractionMutations: typeof extractionMutations;
  http: typeof http;
  ingredientQueue: typeof ingredientQueue;
  ingredientScoring: typeof ingredientScoring;
  ingredients: typeof ingredients;
  "lib/auth": typeof lib_auth;
  "lib/authHelpers": typeof lib_authHelpers;
  "lib/ingredientScoringPrompt": typeof lib_ingredientScoringPrompt;
  "lib/scoringPrompt": typeof lib_scoringPrompt;
  "lib/validator": typeof lib_validator;
  migrations: typeof migrations;
  products: typeof products;
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
