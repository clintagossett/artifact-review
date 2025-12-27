import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FeaturesSection } from "@/components/landing/FeaturesSection";

describe("FeaturesSection", () => {
  describe("Section Header", () => {
    it("should display KEY FEATURES label", () => {
      render(<FeaturesSection />);

      expect(screen.getByText("KEY FEATURES")).toBeInTheDocument();
    });

    it("should display main headline", () => {
      render(<FeaturesSection />);

      const headline = screen.getByRole("heading", {
        name: /built for ai-native teams.*works with your entire stack/i
      });
      expect(headline).toBeInTheDocument();
    });
  });

  describe("Feature 1 - Zero Format Loss", () => {
    it("should display AI-Native badge", () => {
      render(<FeaturesSection />);

      expect(screen.getByText("AI-Native")).toBeInTheDocument();
    });

    it("should display Zero Format Loss heading", () => {
      render(<FeaturesSection />);

      const heading = screen.getByRole("heading", {
        name: /zero format loss/i
      });
      expect(heading).toBeInTheDocument();
    });

    it("should describe format preservation", () => {
      render(<FeaturesSection />);

      expect(screen.getByText(/what ai generates is what stakeholders see/i)).toBeInTheDocument();
    });

    it("should list key benefits with checkmarks", () => {
      render(<FeaturesSection />);

      expect(screen.getByText(/upload html directly.*renders beautifully/i)).toBeInTheDocument();
      expect(screen.getByText(/responsive design preserved/i)).toBeInTheDocument();
      expect(screen.getByText(/export with comments baked in/i)).toBeInTheDocument();
    });

    it("should show comparison visual", () => {
      render(<FeaturesSection />);

      expect(screen.getByText(/google docs/i)).toBeInTheDocument();
      expect(screen.getByText(/artifact review/i)).toBeInTheDocument();
    });
  });

  describe("Feature 2 - Reviewers Don't Need Licenses", () => {
    it("should display Collaboration badge", () => {
      render(<FeaturesSection />);

      expect(screen.getByText("Collaboration")).toBeInTheDocument();
    });

    it("should display Reviewers Don't Need Licenses heading", () => {
      render(<FeaturesSection />);

      const heading = screen.getByRole("heading", {
        name: /reviewers don't need licenses/i
      });
      expect(heading).toBeInTheDocument();
    });

    it("should describe free reviewer access", () => {
      render(<FeaturesSection />);

      expect(screen.getByText(/only creators pay for uploads.*reviewers comment for free/i)).toBeInTheDocument();
    });

    it("should list collaboration benefits", () => {
      render(<FeaturesSection />);

      expect(screen.getByText(/claude team projects requires.*30-60.*user/i)).toBeInTheDocument();
      expect(screen.getByText(/reviewers are always free/i)).toBeInTheDocument();
      expect(screen.getByText(/invite anyone with an email/i)).toBeInTheDocument();
    });

    it("should show creator vs reviewers visual", () => {
      render(<FeaturesSection />);

      expect(screen.getByText("Creator")).toBeInTheDocument();
      expect(screen.getByText(/paid user/i)).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("should have gray background", () => {
      const { container } = render(<FeaturesSection />);
      const section = container.querySelector("section");

      expect(section).toHaveClass("bg-gray-50");
    });

    it("should have two feature rows", () => {
      const { container } = render(<FeaturesSection />);

      const grids = container.querySelectorAll('[class*="grid"][class*="md:grid-cols-2"]');
      expect(grids.length).toBeGreaterThanOrEqual(2);
    });

    it("should have spacing between features", () => {
      const { container } = render(<FeaturesSection />);

      const spacingContainer = container.querySelector('[class*="space-y-24"]');
      expect(spacingContainer).toBeInTheDocument();
    });

    it("should reverse layout for second feature", () => {
      const { container } = render(<FeaturesSection />);

      const orderElements = container.querySelectorAll('[class*="md:order-"]');
      expect(orderElements.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Visual Elements", () => {
    it("should have badge styling", () => {
      const { container } = render(<FeaturesSection />);

      const purpleBadge = container.querySelector('[class*="bg-purple-50"]');
      const blueBadge = container.querySelector('[class*="bg-blue-50"]');

      expect(purpleBadge).toBeInTheDocument();
      expect(blueBadge).toBeInTheDocument();
    });

    it("should have check icons for benefits", () => {
      const { container } = render(<FeaturesSection />);

      const checkIcons = container.querySelectorAll('svg');
      expect(checkIcons.length).toBeGreaterThan(0);
    });
  });
});
