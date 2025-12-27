import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";

describe("HowItWorksSection", () => {
  describe("Section Header", () => {
    it("should display HOW IT WORKS label", () => {
      render(<HowItWorksSection />);

      expect(screen.getByText("HOW IT WORKS")).toBeInTheDocument();
    });

    it("should display main headline", () => {
      render(<HowItWorksSection />);

      const headline = screen.getByRole("heading", {
        name: /upload.*share.*get feedback.*in 3 clicks/i
      });
      expect(headline).toBeInTheDocument();
    });
  });

  describe("Step 1 - Upload", () => {
    it("should display Step 1 badge", () => {
      render(<HowItWorksSection />);

      expect(screen.getByText("Step 1")).toBeInTheDocument();
    });

    it("should display Upload icon", () => {
      const { container } = render(<HowItWorksSection />);

      // Should have Upload icon from lucide-react
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it("should display Upload Your Artifact heading", () => {
      render(<HowItWorksSection />);

      const heading = screen.getByRole("heading", {
        name: /upload your artifact/i
      });
      expect(heading).toBeInTheDocument();
    });

    it("should describe drag and drop functionality", () => {
      render(<HowItWorksSection />);

      expect(screen.getByText(/drag and drop your html/i)).toBeInTheDocument();
    });
  });

  describe("Step 2 - Share", () => {
    it("should display Step 2 badge", () => {
      render(<HowItWorksSection />);

      expect(screen.getByText("Step 2")).toBeInTheDocument();
    });

    it("should display Share with Your Team heading", () => {
      render(<HowItWorksSection />);

      const heading = screen.getByRole("heading", {
        name: /share with your team/i
      });
      expect(heading).toBeInTheDocument();
    });

    it("should describe shareable link functionality", () => {
      render(<HowItWorksSection />);

      expect(screen.getByText(/shareable link in seconds/i)).toBeInTheDocument();
    });
  });

  describe("Step 3 - Feedback", () => {
    it("should display Step 3 badge", () => {
      render(<HowItWorksSection />);

      expect(screen.getByText("Step 3")).toBeInTheDocument();
    });

    it("should display Get Inline Feedback heading", () => {
      render(<HowItWorksSection />);

      const heading = screen.getByRole("heading", {
        name: /get inline feedback/i
      });
      expect(heading).toBeInTheDocument();
    });

    it("should describe comment functionality", () => {
      render(<HowItWorksSection />);

      expect(screen.getByText(/highlight text.*leave comments/i)).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("should have three columns on desktop", () => {
      const { container } = render(<HowItWorksSection />);
      const section = container.querySelector("section");

      const gridContainer = section?.querySelector('[class*="grid"]');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass("md:grid-cols-3");
    });

    it("should have white background cards with borders", () => {
      const { container } = render(<HowItWorksSection />);

      const cards = container.querySelectorAll('[class*="bg-white"][class*="border"]');
      expect(cards.length).toBeGreaterThanOrEqual(3);
    });

    it("should have proper spacing", () => {
      const { container } = render(<HowItWorksSection />);
      const section = container.querySelector("section");

      expect(section).toHaveClass("py-24");
    });
  });

  describe("Visual Elements", () => {
    it("should have blue icon backgrounds", () => {
      const { container } = render(<HowItWorksSection />);

      const iconContainers = container.querySelectorAll('[class*="bg-blue-100"]');
      expect(iconContainers.length).toBeGreaterThanOrEqual(3);
    });

    it("should have badge styling", () => {
      const { container } = render(<HowItWorksSection />);

      const badges = container.querySelectorAll('[class*="bg-blue-50"]');
      expect(badges.length).toBeGreaterThanOrEqual(3);
    });
  });
});
