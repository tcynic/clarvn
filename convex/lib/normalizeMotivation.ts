/**
 * Normalizes the `motivation` field from user_profiles to always return string[].
 * The field was originally stored as a comma-separated string and is being
 * migrated to an array. This handles both formats during the transition.
 */
export function normalizeMotivation(
  val: string | string[] | undefined
): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return val
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
