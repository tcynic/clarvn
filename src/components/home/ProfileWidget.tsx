import Link from "next/link";
import { Widget } from "@/components/ui/Widget";

interface ProfileWidgetProps {
  conditions: string[];
  sensitivities: string[];
  dietaryRestrictions: string[];
  isGuest: boolean;
}

export function ProfileWidget({
  conditions,
  sensitivities,
  dietaryRestrictions,
  isGuest,
}: ProfileWidgetProps) {
  const allTags = [...conditions, ...sensitivities, ...dietaryRestrictions];

  const action = (
    <Link
      href="/onboarding"
      className="text-xs font-medium text-[var(--teal-dark)] hover:text-[var(--teal)] transition-colors"
    >
      Edit
    </Link>
  );

  return (
    <Widget title="Your profile" action={action}>
      {allTags.length === 0 ? (
        <p className="text-xs text-[var(--ink-3)]">
          No profile data yet.{" "}
          <Link href="/onboarding" className="text-[var(--teal-dark)] underline underline-offset-2">
            Complete onboarding →
          </Link>
        </p>
      ) : (
        <div className="space-y-3">
          {conditions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5">
                Conditions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {conditions.map((c) => (
                  <span key={c} className="pill text-xs">{c}</span>
                ))}
              </div>
            </div>
          )}
          {sensitivities.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5">
                Sensitivities
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sensitivities.map((s) => (
                  <span key={s} className="pill text-xs">{s}</span>
                ))}
              </div>
            </div>
          )}
          {dietaryRestrictions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-1.5">
                Dietary
              </p>
              <div className="flex flex-wrap gap-1.5">
                {dietaryRestrictions.map((d) => (
                  <span key={d} className="pill text-xs">{d}</span>
                ))}
              </div>
            </div>
          )}
          <Link
            href="/onboarding"
            className="block text-xs font-medium text-[var(--teal-dark)] hover:text-[var(--teal)] transition-colors"
          >
            + Add more
          </Link>
        </div>
      )}
      {isGuest && (
        <p className="text-xs text-[var(--ink-4)] mt-3 border-t border-[var(--border)] pt-2">
          Guest profile — saved locally.{" "}
          <Link href="/login?from=guest" className="text-[var(--teal-dark)] underline underline-offset-2">
            Sign in to sync
          </Link>
        </p>
      )}
    </Widget>
  );
}
