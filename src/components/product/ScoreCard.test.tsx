// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { ScoreCard } from "./ScoreCard";

// Mock next/link since it requires Next.js router context
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

describe("ScoreCard", () => {
  test("renders score formatted to 1 decimal place", () => {
    const { getByText } = render(<ScoreCard score={7.345} tier="Caution" />);
    expect(getByText("7.3")).toBeTruthy();
  });

  test("renders tier label", () => {
    const { getByText } = render(<ScoreCard score={3.0} tier="Clean" />);
    expect(getByText("Clean")).toBeTruthy();
  });

  test("has data-tier attribute matching the tier", () => {
    const { container } = render(<ScoreCard score={5.0} tier="Watch" />);
    const card = container.querySelector("[data-testid='score-card']");
    expect(card).not.toBeNull();
    expect(card!.getAttribute("data-tier")).toBe("Watch");
  });

  test("renders 'See breakdown' link", () => {
    const { getByRole } = render(<ScoreCard score={8.5} tier="Avoid" />);
    const link = getByRole("link", { name: /see breakdown/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("#ingredient-list");
  });

  test("renders score of 10.0 correctly", () => {
    const { getByText } = render(<ScoreCard score={10.0} tier="Avoid" />);
    expect(getByText("10.0")).toBeTruthy();
  });

  test("renders score of 1.0 correctly", () => {
    const { getByText } = render(<ScoreCard score={1.0} tier="Clean" />);
    expect(getByText("1.0")).toBeTruthy();
  });

  test("applies gradient class based on tier", () => {
    const tiers = ["Clean", "Watch", "Caution", "Avoid"] as const;
    tiers.forEach((tier) => {
      const { container } = render(<ScoreCard score={5.0} tier={tier} />);
      const card = container.querySelector("[data-testid='score-card']") as HTMLElement;
      // Each tier has a unique gradient class
      expect(card.className).toContain("bg-gradient-to-br");
    });
  });
});
