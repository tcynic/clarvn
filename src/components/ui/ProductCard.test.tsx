// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ProductCard } from "./ProductCard";

describe("ProductCard", () => {
  test("renders product name and brand", () => {
    const { getByText } = render(
      <ProductCard name="Almond Milk" brand="Silk" />
    );
    expect(getByText("Almond Milk")).toBeTruthy();
    expect(getByText("Silk")).toBeTruthy(); // CSS class handles uppercase visually
  });

  test("renders default emoji when no image provided", () => {
    const { getByText } = render(
      <ProductCard name="Mystery Product" brand="Acme" />
    );
    expect(getByText("🛒")).toBeTruthy();
  });

  test("renders custom emoji when provided", () => {
    const { getByText } = render(
      <ProductCard name="Milk" brand="Farm" emoji="🥛" />
    );
    expect(getByText("🥛")).toBeTruthy();
  });

  test("renders score pill with score and tier", () => {
    const { container } = render(
      <ProductCard name="Kale Chips" brand="Greens" baseScore={2.3} tier="Clean" />
    );
    expect(container.textContent).toContain("2.3");
    expect(container.textContent).toContain("Clean");
  });

  test("renders match badge when matchPercentage provided", () => {
    const { getByText } = render(
      <ProductCard name="Granola" brand="Health" matchPercentage={85} />
    );
    expect(getByText("85% match")).toBeTruthy();
  });

  test("does not render match badge when matchPercentage not provided", () => {
    const { container } = render(
      <ProductCard name="Granola" brand="Health" />
    );
    expect(container.textContent).not.toContain("% match");
  });

  test("renders price when provided", () => {
    const { getByText } = render(
      <ProductCard name="Crackers" brand="Simple Mills" price={4.99} />
    );
    expect(getByText("$4.99")).toBeTruthy();
  });

  test("calls onSelect when card is clicked", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <ProductCard name="Oat Milk" brand="Oatly" onSelect={onSelect} />
    );
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  test("calls onTogglePantry when save button clicked without triggering onSelect", () => {
    const onSelect = vi.fn();
    const onTogglePantry = vi.fn();
    const { getByRole } = render(
      <ProductCard
        name="Yogurt"
        brand="Chobani"
        onSelect={onSelect}
        onTogglePantry={onTogglePantry}
      />
    );
    const saveButton = getByRole("button", { name: /save to pantry/i });
    fireEvent.click(saveButton);
    expect(onTogglePantry).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('shows filled heart (♥) when inPantry is true', () => {
    const { getByRole } = render(
      <ProductCard
        name="Butter"
        brand="Kerrygold"
        onTogglePantry={() => {}}
        inPantry={true}
      />
    );
    const button = getByRole("button", { name: /remove from pantry/i });
    expect(button.textContent).toBe("♥");
  });

  test('shows empty heart (♡) when inPantry is false', () => {
    const { getByRole } = render(
      <ProductCard
        name="Butter"
        brand="Kerrygold"
        onTogglePantry={() => {}}
        inPantry={false}
      />
    );
    const button = getByRole("button", { name: /save to pantry/i });
    expect(button.textContent).toBe("♡");
  });

  test("renders rating when averageRating provided", () => {
    const { container } = render(
      <ProductCard name="Cheese" brand="Cabot" averageRating={4.5} />
    );
    expect(container.textContent).toContain("4.5");
  });

  test("renders img element when imageUrl provided", () => {
    const { container } = render(
      <ProductCard name="Eggs" brand="Pete" imageUrl="https://example.com/egg.jpg" />
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toBe("https://example.com/egg.jpg");
    expect(img!.getAttribute("alt")).toBe("Eggs");
  });

  test("does not render score pill when baseScore or tier is missing", () => {
    const { container } = render(
      <ProductCard name="Water" brand="Generic" baseScore={1.0} />
      // tier not provided
    );
    // Score pill requires both baseScore and tier
    expect(container.querySelector(".score-pill-clean")).toBeNull();
  });
});
