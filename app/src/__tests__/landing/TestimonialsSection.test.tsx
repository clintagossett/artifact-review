import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";

describe("TestimonialsSection", () => {
  describe("Section Header", () => {
    it("should display section category label", () => {
      render(<TestimonialsSection />);

      expect(screen.getByText(/trusted by product teams/i)).toBeInTheDocument();
    });

    it("should display section heading", () => {
      render(<TestimonialsSection />);

      const heading = screen.getByRole("heading", {
        name: /saving 2-3 hours per week for teams like yours/i
      });
      expect(heading).toBeInTheDocument();
    });
  });

  describe("Testimonials", () => {
    it("should display three testimonial cards", () => {
      const { container } = render(<TestimonialsSection />);

      // Look for testimonial containers
      const cards = container.querySelectorAll('[class*="border"]');
      // Should have at least 3 cards (may have more due to nesting)
      expect(cards.length).toBeGreaterThanOrEqual(3);
    });

    it("should display star ratings", () => {
      render(<TestimonialsSection />);

      // Each testimonial should have 5 stars
      const stars = screen.getAllByText("★");
      expect(stars.length).toBeGreaterThanOrEqual(15); // 3 testimonials × 5 stars
    });

    it("should display testimonial quotes", () => {
      render(<TestimonialsSection />);

      expect(screen.getByText(/waste 30 minutes per prd/i)).toBeInTheDocument();
      expect(screen.getByText(/pixel-perfect fidelity/i)).toBeInTheDocument();
      expect(screen.getByText(/saves us \$2,000\/month/i)).toBeInTheDocument();
    });

    it("should display author names and titles", () => {
      render(<TestimonialsSection />);

      // Author names
      expect(screen.getByText("Alex Chen")).toBeInTheDocument();
      expect(screen.getByText("Morgan Taylor")).toBeInTheDocument();
      expect(screen.getByText("Jamie Rodriguez")).toBeInTheDocument();

      // Titles
      expect(screen.getByText("Product Manager")).toBeInTheDocument();
      expect(screen.getByText("Design Lead")).toBeInTheDocument();
      expect(screen.getByText("Engineering Manager")).toBeInTheDocument();
    });

    it("should display author avatars", () => {
      render(<TestimonialsSection />);

      // Check for avatar initials
      expect(screen.getByText("AC")).toBeInTheDocument();
      expect(screen.getByText("MT")).toBeInTheDocument();
      expect(screen.getByText("JR")).toBeInTheDocument();
    });
  });

  describe("Stats Section", () => {
    it("should display three statistics", () => {
      render(<TestimonialsSection />);

      expect(screen.getByText(/500\+/)).toBeInTheDocument();
      expect(screen.getByText(/10,000\+/)).toBeInTheDocument();
      expect(screen.getByText(/2\.5 hrs/)).toBeInTheDocument();
    });

    it("should display stat descriptions", () => {
      render(<TestimonialsSection />);

      expect(screen.getByText(/teams using the platform/i)).toBeInTheDocument();
      expect(screen.getByText(/artifacts reviewed/i)).toBeInTheDocument();
      expect(screen.getByText(/average time saved per week/i)).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("should use grid layout for testimonials", () => {
      const { container } = render(<TestimonialsSection />);
      const section = container.querySelector("section");

      const gridContainer = section?.querySelector('[class*="grid"]');
      expect(gridContainer).toBeInTheDocument();
    });

    it("should have gradient background", () => {
      const { container } = render(<TestimonialsSection />);
      const section = container.querySelector("section");

      expect(section).toHaveClass("bg-gradient-to-b");
    });

    it("should have appropriate padding", () => {
      const { container } = render(<TestimonialsSection />);
      const section = container.querySelector("section");

      expect(section).toHaveClass("py-20");
    });
  });
});
