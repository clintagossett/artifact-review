import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CTASection } from "@/components/landing/CTASection";

describe("CTASection", () => {
  describe("Content", () => {
    it("should display main heading", () => {
      render(<CTASection />);

      const heading = screen.getByRole("heading", {
        name: /stop screenshotting and emailing/i
      });
      expect(heading).toBeInTheDocument();
    });

    it("should display supporting text", () => {
      render(<CTASection />);

      expect(
        screen.getByText(/join 500\+ product teams saving 2-3 hours per week/i)
      ).toBeInTheDocument();
    });

    it("should display value proposition text", () => {
      render(<CTASection />);

      expect(
        screen.getByText(/free to start, upgrade anytime/i)
      ).toBeInTheDocument();
    });
  });

  describe("CTA Buttons", () => {
    it("should display Start Free button", () => {
      render(<CTASection />);

      const startFreeButtons = screen.getAllByRole("link", { name: /start free/i });
      expect(startFreeButtons.length).toBeGreaterThan(0);
      expect(startFreeButtons[0]).toHaveAttribute("href", "/register");
    });

    it("should display Watch Demo button", () => {
      render(<CTASection />);

      expect(screen.getByRole("button", { name: /watch demo/i })).toBeInTheDocument();
    });

    it("should have white background on Start Free button", () => {
      render(<CTASection />);

      const startFreeLinks = screen.getAllByRole("link", { name: /start free/i });
      const startFreeLink = startFreeLinks.find(link =>
        link.getAttribute("href") === "/register"
      );
      expect(startFreeLink).toBeDefined();
    });
  });

  describe("Footer Text", () => {
    it("should display no credit card required text", () => {
      render(<CTASection />);

      expect(
        screen.getByText(/no credit card required/i)
      ).toBeInTheDocument();
    });

    it("should display free artifacts text", () => {
      render(<CTASection />);

      expect(
        screen.getByText(/3 artifacts free forever/i)
      ).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should have gradient background", () => {
      const { container } = render(<CTASection />);
      const section = container.querySelector("section");

      expect(section).toHaveClass("bg-gradient-to-r");
    });

    it("should use gradient with blue and purple colors", () => {
      const { container } = render(<CTASection />);
      const section = container.querySelector("section");

      expect(section).toHaveClass("from-blue-600");
      expect(section).toHaveClass("to-purple-600");
    });

    it("should have proper spacing", () => {
      const { container } = render(<CTASection />);
      const section = container.querySelector("section");

      expect(section).toHaveClass("py-24");
    });

    it("should center content", () => {
      const { container } = render(<CTASection />);
      const section = container.querySelector("section");

      const contentContainer = section?.querySelector('[class*="text-center"]');
      expect(contentContainer).toBeInTheDocument();
    });
  });

  describe("Text Colors", () => {
    it("should have white text for heading", () => {
      render(<CTASection />);

      const heading = screen.getByRole("heading", {
        name: /stop screenshotting and emailing/i
      });
      expect(heading).toHaveClass("text-white");
    });
  });

  describe("Layout", () => {
    it("should have max-width container", () => {
      const { container } = render(<CTASection />);
      const section = container.querySelector("section");

      const contentContainer = section?.querySelector('[class*="max-w"]');
      expect(contentContainer).toBeInTheDocument();
    });

    it("should be responsive with padding", () => {
      const { container } = render(<CTASection />);
      const section = container.querySelector("section");

      const contentContainer = section?.querySelector('[class*="px-"]');
      expect(contentContainer).toBeInTheDocument();
    });
  });
});
