"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useConvexAuth } from "convex/react";

const DURATION_OPTIONS = [
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "1 year", value: 365 },
  { label: "Indefinite", value: null },
] as const;

type DurationOption = (typeof DURATION_OPTIONS)[number]["value"];

function formatDate(ts: number | null): string {
  if (!ts) return "—";
  if (ts >= 9_999_999_999_000) return "Indefinite";
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusPill({ user }: { user: { isPremium: boolean; isComplimentary: boolean; subscriptionStatus: string | null } }) {
  if (user.isComplimentary && user.isPremium) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
        Complimentary
      </span>
    );
  }
  if (user.isPremium && user.subscriptionStatus === "trialing") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        Trialing
      </span>
    );
  }
  if (user.isPremium) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    );
  }
  if (user.subscriptionStatus === "past_due") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Past Due
      </span>
    );
  }
  if (user.subscriptionStatus === "canceled" || (!user.isPremium && user.isComplimentary)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      Free
    </span>
  );
}

export default function AdminUsersPage() {
  const { isAuthenticated } = useConvexAuth();
  const isAdmin = useQuery(
    api.userProfiles.getIsAdmin,
    isAuthenticated ? {} : "skip"
  );

  if (isAdmin === false) {
    return (
      <div className="py-16 text-center">
        <p className="text-[var(--ink-3)]">You do not have admin access.</p>
      </div>
    );
  }

  if (!isAdmin) return null; // loading

  return <AdminUsersContent />;
}

function AdminUsersContent() {
  const [searchEmail, setSearchEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(30);
  const [grantingId, setGrantingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchResult = useQuery(
    api.adminUsers.searchByEmail,
    submittedEmail ? { email: submittedEmail } : "skip"
  );
  const complimentaryUsers = useQuery(api.adminUsers.listComplimentary, {});
  const grantPremium = useMutation(api.adminUsers.grantPremium);
  const revokePremium = useMutation(api.adminUsers.revokePremium);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmittedEmail(searchEmail.trim());
  }

  async function handleGrant(userId: Id<"users">) {
    setGrantingId(userId);
    setError(null);
    try {
      await grantPremium({ userId, durationDays: selectedDuration });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grant premium");
    } finally {
      setGrantingId(null);
    }
  }

  async function handleRevoke(userId: Id<"users">) {
    setRevokingId(userId);
    setError(null);
    try {
      await revokePremium({ userId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke premium");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--ink)] mb-1">User Management</h1>
        <p className="text-sm text-[var(--ink-3)]">
          Grant or revoke complimentary premium access. Stripe-paying accounts must be managed via the Stripe Customer Portal.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Search */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--ink-2)] uppercase tracking-wide mb-3">
          Search by Email
        </h2>
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            type="email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 px-3 py-2 border border-[var(--surface-3)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--teal)] focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--teal)] text-white rounded-lg text-sm font-medium hover:bg-[var(--teal-dark)] transition-colors"
          >
            Search
          </button>
        </form>

        {submittedEmail && searchResult === undefined && (
          <p className="text-sm text-[var(--ink-3)]">Searching…</p>
        )}

        {submittedEmail && searchResult === null && (
          <p className="text-sm text-[var(--ink-3)]">No user found with that email.</p>
        )}

        {searchResult && (
          <div className="bg-white border border-[var(--surface-3)] rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--ink)]">
                    {searchResult.name ?? "Unnamed user"}
                  </span>
                  <StatusPill user={searchResult} />
                </div>
                <p className="text-sm text-[var(--ink-3)]">{searchResult.email}</p>
                {searchResult.premiumUntil && (
                  <p className="text-xs text-[var(--ink-4)]">
                    {searchResult.isPremium ? "Expires" : "Expired"}:{" "}
                    {formatDate(searchResult.premiumUntil)}
                  </p>
                )}
                {searchResult.grantedBy && (
                  <p className="text-xs text-[var(--ink-4)]">
                    Granted by: {searchResult.grantedBy}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                {/* Grant form */}
                <div className="flex items-center gap-2">
                  <select
                    value={String(selectedDuration)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedDuration(val === "null" ? null : Number(val) as 30 | 90 | 365);
                    }}
                    className="px-2 py-1.5 border border-[var(--surface-3)] rounded-lg text-xs bg-white"
                  >
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={String(opt.value)} value={String(opt.value)}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleGrant(searchResult._id)}
                    disabled={grantingId === searchResult._id}
                    className="px-3 py-1.5 bg-[var(--teal)] text-white rounded-lg text-xs font-medium hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-50"
                  >
                    {grantingId === searchResult._id ? "Granting…" : "Grant Premium"}
                  </button>
                </div>

                {/* Revoke button — only on complimentary accounts */}
                {searchResult.isComplimentary && (
                  <button
                    onClick={() => handleRevoke(searchResult._id)}
                    disabled={revokingId === searchResult._id}
                    className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {revokingId === searchResult._id ? "Revoking…" : "Revoke"}
                  </button>
                )}

                {/* Non-complimentary Stripe accounts */}
                {!searchResult.isComplimentary && searchResult.isPremium && (
                  <p className="text-xs text-[var(--ink-4)]">
                    Cancel via Stripe Customer Portal
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Complimentary users list */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--ink-2)] uppercase tracking-wide mb-3">
          Complimentary Accounts
          {complimentaryUsers && complimentaryUsers.length > 0 && (
            <span className="ml-2 font-normal normal-case text-[var(--ink-4)]">
              ({complimentaryUsers.length})
            </span>
          )}
        </h2>

        {complimentaryUsers === undefined && (
          <p className="text-sm text-[var(--ink-3)]">Loading…</p>
        )}

        {complimentaryUsers && complimentaryUsers.length === 0 && (
          <p className="text-sm text-[var(--ink-3)]">No complimentary accounts yet.</p>
        )}

        {complimentaryUsers && complimentaryUsers.length > 0 && (
          <div className="border border-[var(--surface-3)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface)] border-b border-[var(--surface-3)]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-[var(--ink-3)]">User</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--ink-3)]">Status</th>
                  <th className="text-left px-4 py-2 font-medium text-[var(--ink-3)]">Expires</th>
                  <th className="text-right px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-3)]">
                {complimentaryUsers.map((user) => (
                  <tr key={user._id} className="bg-white">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--ink)]">
                        {user.name ?? "Unnamed"}
                      </div>
                      <div className="text-xs text-[var(--ink-3)]">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill user={{ ...user, isComplimentary: true }} />
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-3)]">
                      {formatDate(user.premiumUntil)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRevoke(user._id)}
                        disabled={revokingId === user._id}
                        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        {revokingId === user._id ? "Revoking…" : "Revoke"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
