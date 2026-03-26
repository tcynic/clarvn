// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePremiumGate } from "./usePremiumGate";

beforeEach(() => {
  sessionStorage.clear();
});

describe("usePremiumGate — gateAction", () => {
  test('returns "none" for a premium user', () => {
    const { result } = renderHook(() =>
      usePremiumGate({ isAuthenticated: true, isPremium: true })
    );

    expect(result.current.gateAction()).toBe("none");
    expect(result.current.gateAction({ requiresDelta: true })).toBe("none");
  });

  test('returns "signup" for an unauthenticated guest', () => {
    const { result } = renderHook(() =>
      usePremiumGate({ isAuthenticated: false, isPremium: false })
    );

    expect(result.current.gateAction()).toBe("signup");
  });

  test('returns "upgrade" for authenticated free user', () => {
    const { result } = renderHook(() =>
      usePremiumGate({ isAuthenticated: true, isPremium: false })
    );

    expect(result.current.gateAction()).toBe("upgrade");
  });

  test('returns "suppress" when requiresDelta=true and user has not seen a score delta', () => {
    const { result } = renderHook(() =>
      usePremiumGate({ isAuthenticated: true, isPremium: false })
    );

    expect(result.current.gateAction({ requiresDelta: true })).toBe("suppress");
  });

  test('returns "upgrade" when requiresDelta=true and delta has been seen', () => {
    const { result } = renderHook(() =>
      usePremiumGate({ isAuthenticated: true, isPremium: false })
    );

    act(() => {
      result.current.markScoreDelta();
    });

    expect(result.current.gateAction({ requiresDelta: true })).toBe("upgrade");
  });

  test('returns "upgrade" when requiresDelta=false even without seeing a delta', () => {
    const { result } = renderHook(() =>
      usePremiumGate({ isAuthenticated: true, isPremium: false })
    );

    expect(result.current.gateAction({ requiresDelta: false })).toBe("upgrade");
  });
});

describe("usePremiumGate — isGuest", () => {
  test("isGuest is true when not authenticated", () => {
    const { result } = renderHook(() =>
      usePremiumGate({ isAuthenticated: false, isPremium: false })
    );
    expect(result.current.isGuest).toBe(true);
  });

  test("isGuest is false when authenticated", () => {
    const { result } = renderHook(() =>
      usePremiumGate({ isAuthenticated: true, isPremium: false })
    );
    expect(result.current.isGuest).toBe(false);
  });
});

describe("usePremiumGate — subscriptionStatus", () => {
  test("surfaces subscriptionStatus passed in", () => {
    const { result } = renderHook(() =>
      usePremiumGate({
        isAuthenticated: true,
        isPremium: true,
        subscriptionStatus: "active",
      })
    );
    expect(result.current.subscriptionStatus).toBe("active");
  });

  test("defaults to null when not provided", () => {
    const { result } = renderHook(() =>
      usePremiumGate({ isAuthenticated: true, isPremium: false })
    );
    expect(result.current.subscriptionStatus).toBeNull();
  });
});

describe("usePremiumGate — markScoreDelta", () => {
  test("markScoreDelta sets hasSeenScoreDelta to true", () => {
    const { result } = renderHook(() =>
      usePremiumGate({ isAuthenticated: true, isPremium: false })
    );

    expect(result.current.hasSeenScoreDelta).toBe(false);

    act(() => {
      result.current.markScoreDelta();
    });

    expect(result.current.hasSeenScoreDelta).toBe(true);
  });

  test("markScoreDelta persists to sessionStorage", () => {
    const { result } = renderHook(() =>
      usePremiumGate({ isAuthenticated: true, isPremium: false })
    );

    act(() => {
      result.current.markScoreDelta();
    });

    expect(sessionStorage.getItem("clarvn_seen_score_delta")).toBe("1");
  });

  test("hasSeenScoreDelta initializes to true if sessionStorage already set", () => {
    sessionStorage.setItem("clarvn_seen_score_delta", "1");

    const { result } = renderHook(() =>
      usePremiumGate({ isAuthenticated: true, isPremium: false })
    );

    // useEffect runs after render; needs act to flush
    expect(result.current.hasSeenScoreDelta).toBe(true);
  });
});
