"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import {
  loadProfile,
  saveProfile,
  type UserProfile,
} from "../../lib/personalScore";
import { BrowsePanel } from "./BrowsePanel";
import { ListSidebar } from "./ListSidebar";
import { ProductDetail } from "./ProductDetail";
import { ProfilePanel } from "./ProfilePanel";

interface ListItem {
  name: string;
  requestSent: boolean;
}

type ActiveTab = "browse" | "list";

export default function ShoppingListPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    motivation: [], conditions: [], sensitivities: [],
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>("browse");
  const [listSearch, setListSearch] = useState("");

  // Persistent shopping list from Convex
  const listDocs = useQuery(
    api.shoppingList.getMyList,
    isAuthenticated ? {} : "skip"
  );
  const list: ListItem[] = (listDocs ?? []).map((d) => ({
    name: d.name,
    requestSent: d.requestSent,
  }));
  const addItemMutation = useMutation(api.shoppingList.addItem);
  const markRequestedMutation = useMutation(api.shoppingList.markRequested);
  const swapItemMutation = useMutation(api.shoppingList.swapItem);
  const clearListMutation = useMutation(api.shoppingList.clearList);

  // Derived set of names in the list for the browser's "Added" state
  const listNames = useMemo(() => new Set(list.map((i) => i.name)), [list]);

  // Sync profile: hydrate from localStorage (fast), then override from Convex (source of truth)
  const convexProfile = useQuery(
    api.userProfiles.getMyProfile,
    isAuthenticated ? {} : "skip"
  );

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setProfile(loadProfile());
  }, [isAuthenticated, isLoading, router]);

  // Redirect to onboarding only if Convex confirms no profile exists (one-time check)
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (convexProfile === undefined) return;
    if (convexProfile === null) {
      router.push("/onboarding");
    }
  }, [convexProfile, isAuthenticated, isLoading, router]);

  // When Convex profile loads, sync it to local state and localStorage
  useEffect(() => {
    if (convexProfile) {
      const synced: UserProfile = {
        motivation: convexProfile.motivation
          ? convexProfile.motivation.split(", ").filter(Boolean)
          : profile.motivation,
        conditions: convexProfile.conditions,
        sensitivities: convexProfile.sensitivities,
      };
      setProfile(synced);
      saveProfile(synced);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convexProfile]);

  const requestProduct = useAction(api.extraction.requestProduct);

  function handleAdd(name: string) {
    if (!name || list.some((i) => i.name === name)) return;
    addItemMutation({ name }).catch(() => {});
    setSelectedName(name);
  }

  async function handleRequest(name: string) {
    try {
      await requestProduct({ productName: name });
    } catch {
      // Silently fail — product will show as "Not yet scored"
    }
    markRequestedMutation({ name }).catch(() => {});
  }

  function handleSwap(currentName: string, newName: string) {
    swapItemMutation({ currentName, newName }).catch(() => {});
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

      {/* Mobile tab bar */}
      <div className="flex gap-1 px-4 pt-4 md:hidden">
        <button
          onClick={() => setActiveTab("browse")}
          className={`flex-1 text-sm font-medium py-2 rounded-[var(--radius-lg)] transition-colors ${
            activeTab === "browse"
              ? "bg-[var(--teal)] text-white"
              : "bg-[var(--surface-2)] text-[var(--ink-3)]"
          }`}
        >
          Browse
        </button>
        <button
          onClick={() => setActiveTab("list")}
          className={`flex-1 text-sm font-medium py-2 rounded-[var(--radius-lg)] transition-colors ${
            activeTab === "list"
              ? "bg-[var(--teal)] text-white"
              : "bg-[var(--surface-2)] text-[var(--ink-3)]"
          }`}
        >
          My List {list.length > 0 && `(${list.length})`}
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 md:py-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-4 md:gap-6">

          {/* Browser panel */}
          <div className={activeTab === "list" ? "hidden md:block" : ""}>
            <BrowsePanel
              onAdd={(name) => {
                handleAdd(name);
                setActiveTab("list");
              }}
              listNames={listNames}
              selectedName={selectedName}
              onSelect={setSelectedName}
            />
            {selectedName && (
              <ProductDetail
                name={selectedName}
                onClose={() => setSelectedName(null)}
                onSwap={(newName) => handleSwap(selectedName, newName)}
              />
            )}
          </div>

          {/* Shopping list sidebar */}
          <div className={activeTab === "browse" ? "hidden md:block" : ""}>
            <ListSidebar
              list={list}
              selectedName={selectedName}
              onSelect={setSelectedName}
              onRequest={handleRequest}
              onClear={() => {
                clearListMutation().catch(() => {});
                setSelectedName(null);
              }}
              onAdd={handleAdd}
              search={listSearch}
              onSearchChange={setListSearch}
            />
            {/* Detail panel on mobile when list tab is active */}
            {selectedName && activeTab === "list" && (
              <ProductDetail
                name={selectedName}
                onClose={() => setSelectedName(null)}
                onSwap={(newName) => handleSwap(selectedName, newName)}
              />
            )}
          </div>

        </div>
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
