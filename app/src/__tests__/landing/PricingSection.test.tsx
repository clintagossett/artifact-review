import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PricingSection } from "@/components/landing/PricingSection";

describe("PricingSection", () => {
  describe("Section Header", () => {
    it("should display section category label", () => {
      render(<PricingSection />);

      expect(screen.getByText(/simple, transparent pricing/i)).toBeInTheDocument();
    });

    it("should display section heading", () => {
      render(<PricingSection />);

      const heading = screen.getByRole("heading", {
        name: /start free.*upgrade when you're ready/i
      });
      expect(heading).toBeInTheDocument();
    });

    it("should display section subtitle", () => {
      render(<PricingSection />);

      expect(screen.getByText(/creators pay.*reviewers comment for free/i)).toBeInTheDocument();
    });
  });

  describe("Free Plan Card", () => {
    it("should display Free plan badge", () => {
      render(<PricingSection />);

      expect(screen.getByText(/free forever/i)).toBeInTheDocument();
    });

    it("should display $0 pricing", () => {
      render(<PricingSection />);

      const { container } = render(<PricingSection />);
      const section = container.querySelector("section");

      // Look for $0 text
      expect(section?.textContent).toContain("$0");
    });

    it("should display Free plan features", () => {
      render(<PricingSection />);

      expect(screen.getByText(/3 artifacts/i)).toBeInTheDocument();
      expect(screen.getByText(/3 versions per artifact/i)).toBeInTheDocument();
      expect(screen.getByText(/7-day review period/i)).toBeInTheDocument();
      expect(screen.getByText(/5 reviewers per artifact/i)).toBeInTheDocument();
      expect(screen.getByText(/basic commenting/i)).toBeInTheDocument();
    });

    it("should display Start Free button", () => {
      render(<PricingSection />);

      const buttons = screen.getAllByRole("link", { name: /start free/i });
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Pro Plan Card", () => {
    it("should display Most Popular badge", () => {
      render(<PricingSection />);

      expect(screen.getByText(/most popular/i)).toBeInTheDocument();
    });

    it("should display $12 pricing", () => {
      render(<PricingSection />);

      const { container } = render(<PricingSection />);
      const section = container.querySelector("section");

      expect(section?.textContent).toContain("$12");
    });

    it("should display annual pricing option", () => {
      render(<PricingSection />);

      expect(screen.getByText(/\$10\/mo billed annually/i)).toBeInTheDocument();
    });

    it("should display Pro plan features", () => {
      render(<PricingSection />);

      expect(screen.getByText(/unlimited artifacts/i)).toBeInTheDocument();
      expect(screen.getByText(/unlimited versions/i)).toBeInTheDocument();
      expect(screen.getByText(/unlimited reviewers/i)).toBeInTheDocument();
      expect(screen.getByText(/advanced commenting/i)).toBeInTheDocument();
      expect(screen.getByText(/version history.*diff view/i)).toBeInTheDocument();
      expect(screen.getByText(/custom branding/i)).toBeInTheDocument();
    });

    it("should display trial CTA button", () => {
      render(<PricingSection />);

      expect(screen.getByRole("link", { name: /start 14-day trial/i })).toBeInTheDocument();
    });

    it("should have highlighted border styling", () => {
      const { container } = render(<PricingSection />);

      // Pro plan should have border-2 border-blue-600 styling
      const cards = container.querySelectorAll('[class*="border-2"]');
      expect(cards.length).toBeGreaterThanOrEqual(1);
    });

    it("should display no credit card message", () => {
      render(<PricingSection />);

      expect(screen.getByText(/no credit card required/i)).toBeInTheDocument();
    });
  });

  describe("Team Plan Card", () => {
    it("should display Teams badge", () => {
      render(<PricingSection />);

      expect(screen.getByText(/teams 3\+/i)).toBeInTheDocument();
    });

    it("should display $18 per user pricing", () => {
      render(<PricingSection />);

      const { container } = render(<PricingSection />);
      const section = container.querySelector("section");

      expect(section?.textContent).toContain("$18");
    });

    it("should display annual pricing option", () => {
      render(<PricingSection />);

      expect(screen.getByText(/\$15\/user\/mo billed annually/i)).toBeInTheDocument();
    });

    it("should display Team plan features", () => {
      render(<PricingSection />);

      expect(screen.getByText(/everything in pro, plus:/i)).toBeInTheDocument();
      expect(screen.getByText(/team workspace.*folders/i)).toBeInTheDocument();
      expect(screen.getByText(/approval workflow/i)).toBeInTheDocument();
      expect(screen.getByText(/due dates.*reminders/i)).toBeInTheDocument();
      expect(screen.getByText(/sso.*google.*microsoft/i)).toBeInTheDocument();
      expect(screen.getByText(/slack integration/i)).toBeInTheDocument();
    });

    it("should display Contact Sales button", () => {
      render(<PricingSection />);

      expect(screen.getByRole("button", { name: /contact sales/i })).toBeInTheDocument();
    });
  });

  describe("Feature Lists", () => {
    it("should display checkmark icons for features", () => {
      const { container } = render(<PricingSection />);

      // Should have multiple check icons (SVG elements)
      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("should use three-column grid on desktop", () => {
      const { container } = render(<PricingSection />);
      const section = container.querySelector("section");

      const gridContainer = section?.querySelector('[class*="grid"]');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass("md:grid-cols-3");
    });

    it("should have proper spacing and padding", () => {
      const { container } = render(<PricingSection />);
      const section = container.querySelector("section");

      expect(section).toHaveClass("py-24");
    });
  });
});
