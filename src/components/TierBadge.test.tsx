// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import { TierBadge } from "./TierBadge";

describe("TierBadge", () => {
  test("renders Clean tier", () => {
    const { container } = render(<TierBadge tier="Clean" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.textContent).toBe("Clean");
    expect(badge.className).toContain("b-clean");
  });

  test("renders Watch tier", () => {
    const { container } = render(<TierBadge tier="Watch" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.textContent).toBe("Watch");
    expect(badge.className).toContain("b-watch");
  });

  test("renders Caution tier", () => {
    const { container } = render(<TierBadge tier="Caution" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.textContent).toBe("Caution");
    expect(badge.className).toContain("b-caution");
  });

  test("renders Avoid tier", () => {
    const { container } = render(<TierBadge tier="Avoid" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.textContent).toBe("Avoid");
    expect(badge.className).toContain("b-avoid");
  });

  test("renders as a span element", () => {
    const { container } = render(<TierBadge tier="Clean" />);
    expect(container.firstChild!.nodeName).toBe("SPAN");
  });
});
