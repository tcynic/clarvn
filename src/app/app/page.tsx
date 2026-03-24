"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { TierBadge } from "../../components/TierBadge";
import {
  getPersonalScore,
  loadProfile,
  saveProfile,
  hasCompletedOnboarding,
  type UserProfile,
  type ModifierData,
} from "../../lib/personalScore";

type Tier = "Clean" | "Watch" | "Caution" | "Avoid";

interface ListItem {
  name: string;
  requestSent?: boolean;
}

function ScorePill({ score, tier }: { score: number; tier: Tier }) {
  const colors: Record<Tier, string> = {
    Clean: "var(--tier-clean)",
    Watch: "var(--tier-watch)",
    Caution: "var(--tier-caution)",
    Avoid: "var(--tier-avoid)",
  };
  return (
    <span
      className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white font-bold text-sm shrink-0"
      style={{ background: colors[tier], fontFamily: "var(--font-serif)" }}
    >
      {score.toFixed(1)}
    </span>
  );
}

function ProductRow({
  item,
  profile,
  isSelected,
  onSelect,
  onRequest,
}: {
  item: ListItem;
  profile: UserProfile;
  isSelected: boolean;
  onSelect: () => void;
  onRequest: () => void;
}) {
  const product = useQuery(api.products.getProduct, { name: item.name });
  const ingredientLinks = useQuery(
    api.ingredients.getIngredientsByProduct,
    product ? { productId: product._id } : "skip"
  );
  const modifiers = useQuery(
    api.ingredients.getModifiersByIngredients,
    ingredientLinks
      ? { ingredientIds: (ingredientLinks as Doc<"ingredients">[]).map((i) => i._id) }
      : "skip"
  );

  if (product === undefined) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-white">
        <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] animate-pulse shrink-0" />
        <div className="flex-1">
          <div className="h-3 bg-[var(--surface-2)] rounded w-40 animate-pulse" />
        </div>
      </div>
    );
  }

  if (product === null) {
    return (
      <div
        className={`flex items-center justify-between px-4 py-3 rounded-[var(--radius-lg)] border transition-colors ${
          isSelected ? "border-[var(--teal)] bg-[var(--teal-light)]" : "border-[var(--border)] bg-white"
        }`}
      >
        <div>
          <p className="text-sm font-medium text-[var(--ink)]">{item.name}</p>
          <p className="text-xs text-[var(--ink-3)]">Not yet scored</p>
        </div>
        {item.requestSent ? (
          <span className="b-teal">Requested ✓</span>
        ) : (
          <button
            onClick={onRequest}
            className="text-xs bg-[var(--surface-2)] text-[var(--ink-2)] font-medium px-3 py-1.5 rounded-[var(--radius)] hover:bg-[var(--surface-3)] transition-colors"
          >
            Request
          </button>
        )}
      </div>
    );
  }

  const personal = modifiers
    ? getPersonalScore(product.baseScore, modifiers as ModifierData[], profile)
    : null;
  const displayScore = personal?.personalScore ?? product.baseScore;
  const displayTier = personal?.personalTier ?? (product.tier as Tier);
  const hasModifiers = personal && personal.appliedModifiers.length > 0;

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] border text-left transition-colors ${
        isSelected ? "border-[var(--teal)] bg-[var(--teal-light)]" : "border-[var(--border)] bg-white hover:bg-[var(--surface)]"
      }`}
    >
      <ScorePill score={displayScore} tier={displayTier} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium text-[var(--ink)] truncate">
            {product.emoji} {product.name}
          </p>
          <TierBadge tier={displayTier} />
        </div>
        <p className="text-xs text-[var(--ink-3)]">{product.brand}</p>
        {hasModifiers && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {personal!.appliedModifiers.map((m, i) => (
              <span key={i} className="text-xs text-[var(--tier-caution)]">
                +{m.modifierAmount} {m.condition}
              </span>
            ))}
          </div>
        )}
      </div>
      {hasModifiers && (
        <span className="text-xs line-through text-[var(--ink-4)] shrink-0">
          {product.baseScore.toFixed(1)}
        </span>
      )}
    </button>
  );
}

function ProductDetail({
  name,
  profile,
  onClose,
  onSwap,
}: {
  name: string;
  profile: UserProfile;
  onClose: () => void;
  onSwap: (newName: string) => void;
}) {
  const product = useQuery(api.products.getProduct, { name });
  const ingredientLinks = useQuery(
    api.ingredients.getIngredientsByProduct,
    product ? { productId: product._id } : "skip"
  );
  const modifiers = useQuery(
    api.ingredients.getModifiersByIngredients,
    ingredientLinks
      ? { ingredientIds: (ingredientLinks as Doc<"ingredients">[]).map((i) => i._id) }
      : "skip"
  );
  const alternatives = useQuery(
    api.scoringQueue.getAlternativesForProduct,
    product ? { productId: product._id } : "skip"
  );

  if (!product) return null;

  const personal = modifiers
    ? getPersonalScore(product.baseScore, modifiers as ModifierData[], profile)
    : null;
  const displayScore = personal?.personalScore ?? product.baseScore;
  const displayTier = personal?.personalTier ?? (product.tier as Tier);

  return (
    <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--border)] p-5 mt-3">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-semibold text-[var(--ink)] text-sm">
            {product.emoji} {product.name}
          </h2>
          <p className="text-xs text-[var(--ink-3)]">{product.brand}</p>
        </div>
        <button onClick={onClose} className="text-[var(--ink-3)] hover:text-[var(--ink)] text-xl leading-none">×</button>
      </div>

      {/* Score display */}
      <div className="flex items-center gap-4 mb-5">
        <div className="flex flex-col items-center">
          {personal && personal.personalScore !== personal.baseScore && (
            <span className="text-xs line-through text-[var(--ink-4)]">{personal.baseScore.toFixed(1)}</span>
          )}
          <span
            className="text-4xl font-bold"
            style={{ fontFamily: "var(--font-serif)", color: `var(--tier-${displayTier.toLowerCase()})` }}
          >
            {displayScore.toFixed(1)}
          </span>
          <TierBadge tier={displayTier} />
        </div>
        <div className="text-xs text-[var(--ink-3)]">
          <p>v{product.scoreVersion}</p>
          <p className="mt-0.5">AI-generated</p>
        </div>
      </div>

      {/* Profile modifiers */}
      {personal && personal.appliedModifiers.length > 0 && (
        <div className="mb-4 p-3 bg-[var(--tier-caution-light)] rounded-[var(--radius)]">
          <p className="text-xs font-semibold text-[var(--tier-caution)] uppercase tracking-wide mb-1.5">Your Profile</p>
          {personal.appliedModifiers.map((m, i) => (
            <div key={i} className="text-xs text-[var(--tier-caution)] mb-0.5">
              +{m.modifierAmount} {m.condition} · {m.evidenceCitation.split(" ").slice(0, 5).join(" ")}…
            </div>
          ))}
        </div>
      )}

      {/* Ingredients */}
      {ingredientLinks && (
        <div className="border-t border-[var(--border)] pt-4">
          <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2">Ingredients</p>
          <ul className="flex flex-col gap-1">
            {(ingredientLinks as Doc<"ingredients">[])
              .sort((a, b) => b.baseScore - a.baseScore)
              .map((ing) => (
                <li key={ing._id} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-[var(--ink-2)]">
                    {ing.canonicalName}
                    {ing.flagLabel && <span className="text-[var(--ink-4)] ml-1">· {ing.flagLabel}</span>}
                  </span>
                  <TierBadge tier={ing.tier as Tier} />
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Alternatives */}
      {alternatives && alternatives.length > 0 && (
        <div className="border-t border-[var(--border)] pt-4 mt-1">
          <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2">Alternatives</p>
          <ul className="flex flex-col gap-2">
            {(alternatives as Doc<"products">[]).map((alt) => (
              <li key={alt._id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-sm font-bold shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white"
                    style={{ background: `var(--tier-${alt.tier.toLowerCase()})`, fontFamily: "var(--font-serif)" }}
                  >
                    {alt.baseScore.toFixed(1)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--ink)] truncate">
                      {alt.emoji} {alt.name}
                    </p>
                    <TierBadge tier={alt.tier as Tier} />
                  </div>
                </div>
                <button
                  onClick={() => onSwap(alt.name)}
                  className="text-xs bg-[var(--teal-light)] text-[var(--teal-dark)] font-medium px-3 py-1.5 rounded-[var(--radius)] hover:bg-[var(--teal-pale)] transition-colors shrink-0"
                >
                  Swap
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProfilePanel({
  profile,
  onChange,
  onClose,
  onSignOut,
}: {
  profile: UserProfile;
  onChange: (p: UserProfile) => void;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const CONDITIONS = ["ADHD","IBS / Gut sensitivity","Thyroid condition","Eczema / skin","Hormone-sensitive condition","Cancer history","Pregnancy"];
  const SENSITIVITIES = ["Migraines","Food allergies","Gluten sensitivity","Gut sensitivity","Artificial dyes","Preservatives"];

  function toggle(type: "conditions" | "sensitivities", val: string) {
    const next = profile[type].includes(val)
      ? profile[type].filter((v) => v !== val)
      : [...profile[type], val];
    const updated = { ...profile, [type]: next };
    onChange(updated);
    saveProfile(updated);
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--border)] p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[var(--ink)]" style={{ fontFamily: "var(--font-serif)" }}>Your Profile</h2>
          <button onClick={onClose} className="text-[var(--ink-3)] text-xl">×</button>
        </div>
        <div className="mb-4">
          <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2">Conditions</p>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <button key={c} onClick={() => toggle("conditions", c)}
                className={profile.conditions.includes(c) ? "pill" : "pill-neutral"}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wide mb-2">Sensitivities</p>
          <div className="flex flex-wrap gap-2">
            {SENSITIVITIES.map((s) => (
              <button key={s} onClick={() => toggle("sensitivities", s)}
                className={profile.sensitivities.includes(s) ? "pill" : "pill-neutral"}>{s}</button>
            ))}
          </div>
        </div>
        <div className="border-t border-[var(--border)] mt-4 pt-4">
          <button
            onClick={onSignOut}
            className="text-xs text-[var(--ink-3)] hover:text-[var(--tier-avoid)] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShoppingListPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const [search, setSearch] = useState("");
  const [list, setList] = useState<ListItem[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    motivation: [], conditions: [], sensitivities: [],
  });

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setProfile(loadProfile());
    if (!hasCompletedOnboarding()) {
      router.push("/onboarding");
    }
  }, [isAuthenticated, isLoading, router]);

  const addToQueue = useMutation(api.scoringQueue.addToQueue);

  function handleAdd() {
    const name = search.trim();
    if (!name || list.some((i) => i.name === name)) return;
    setList((prev) => [...prev, { name }]);
    setSearch("");
    setSelectedName(name);
  }

  async function handleRequest(name: string) {
    await addToQueue({ productName: name, source: "user_request", priority: 1 });
    setList((prev) => prev.map((item) => item.name === name ? { ...item, requestSent: true } : item));
  }

  function handleSwap(currentName: string, newName: string) {
    setList((prev) => prev.map((item) => item.name === currentName ? { name: newName } : item));
    setSelectedName(newName);
  }

  const activeConditionCount = profile.conditions.length + profile.sensitivities.length;

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center">
        <span className="text-sm text-[var(--ink-3)]">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <header className="bg-[var(--ink)] text-white px-4 py-3 flex items-center justify-between">
        <h1 className="font-semibold text-sm">
          clar<span className="text-[var(--teal-mid)] italic">vn</span>
        </h1>
        <button
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-full"
        >
          {activeConditionCount > 0 ? `${activeConditionCount} active` : "Profile"}
          <span>▾</span>
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }} className="flex gap-2 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or add a product…"
            className="flex-1 border border-[var(--border)] rounded-[var(--radius-lg)] px-4 py-3 text-sm text-[var(--ink)] bg-white outline-none focus:border-[var(--teal)] transition-colors"
          />
          <button
            type="submit"
            disabled={!search.trim()}
            className="bg-[var(--teal)] text-white font-medium text-sm px-4 py-3 rounded-[var(--radius-lg)] hover:bg-[var(--teal-dark)] transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </form>

        {list.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">🛒</p>
            <p className="text-sm text-[var(--ink-3)]">Search for a product to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {list.map((item) => (
              <ProductRow
                key={item.name}
                item={item}
                profile={profile}
                isSelected={selectedName === item.name}
                onSelect={() => setSelectedName(selectedName === item.name ? null : item.name)}
                onRequest={() => handleRequest(item.name)}
              />
            ))}
          </div>
        )}

        {selectedName && (
          <ProductDetail
            name={selectedName}
            profile={profile}
            onClose={() => setSelectedName(null)}
            onSwap={(newName) => handleSwap(selectedName, newName)}
          />
        )}
      </div>

      {showProfile && (
        <ProfilePanel
          profile={profile}
          onChange={setProfile}
          onClose={() => setShowProfile(false)}
          onSignOut={() => signOut()}
        />
      )}
    </div>
  );
}
