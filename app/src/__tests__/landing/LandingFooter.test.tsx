import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LandingFooter } from "@/components/landing/LandingFooter";

describe("LandingFooter", () => {
  describe("Branding", () => {
    it("should display logo with gradient background", () => {
      const { container } = render(<LandingFooter />);

      const footer = container.querySelector("footer");
      const logoContainer = footer?.querySelector('[class*="bg-gradient-to-br"]');
      expect(logoContainer).toBeInTheDocument();
    });

    it("should display brand name", () => {
      render(<LandingFooter />);

      expect(screen.getByText("Artifact Review")).toBeInTheDocument();
    });

    it("should display tagline", () => {
      render(<LandingFooter />);

      expect(
        screen.getByText(/from ai output to stakeholder feedback in one click/i)
      ).toBeInTheDocument();
    });
  });

  describe("Navigation Links", () => {
    describe("Product Section", () => {
      it("should display Product section heading", () => {
        render(<LandingFooter />);

        expect(screen.getByText("Product")).toBeInTheDocument();
      });

      it("should display product links", () => {
        render(<LandingFooter />);

        expect(screen.getByRole("link", { name: /^features$/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /^pricing$/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /security/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /changelog/i })).toBeInTheDocument();
      });
    });

    describe("Resources Section", () => {
      it("should display Resources section heading", () => {
        render(<LandingFooter />);

        expect(screen.getByText("Resources")).toBeInTheDocument();
      });

      it("should display resource links", () => {
        render(<LandingFooter />);

        expect(screen.getByRole("link", { name: /documentation/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /blog/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /help center/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /status/i })).toBeInTheDocument();
      });
    });

    describe("Company Section", () => {
      it("should display Company section heading", () => {
        render(<LandingFooter />);

        expect(screen.getByText("Company")).toBeInTheDocument();
      });

      it("should display company links", () => {
        render(<LandingFooter />);

        expect(screen.getByRole("link", { name: /about/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /contact/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /privacy/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /terms/i })).toBeInTheDocument();
      });
    });
  });

  describe("Footer Bottom", () => {
    it("should display copyright text", () => {
      render(<LandingFooter />);

      expect(screen.getByText(/© 2025 artifact review/i)).toBeInTheDocument();
    });

    it("should display built with message", () => {
      render(<LandingFooter />);

      expect(screen.getByText(/built with/i)).toBeInTheDocument();
      expect(screen.getByText(/for ai-native teams/i)).toBeInTheDocument();
    });

    it("should have border separator above footer bottom", () => {
      const { container } = render(<LandingFooter />);

      const footer = container.querySelector("footer");
      const borderDiv = footer?.querySelector('[class*="border-t"]');
      expect(borderDiv).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should have dark background", () => {
      const { container } = render(<LandingFooter />);
      const footer = container.querySelector("footer");

      expect(footer).toHaveClass("bg-gray-900");
    });

    it("should have gray text color", () => {
      const { container } = render(<LandingFooter />);
      const footer = container.querySelector("footer");

      expect(footer).toHaveClass("text-gray-400");
    });

    it("should have proper spacing", () => {
      const { container } = render(<LandingFooter />);
      const footer = container.querySelector("footer");

      expect(footer).toHaveClass("py-16");
    });
  });

  describe("Layout", () => {
    it("should use grid layout for link sections", () => {
      const { container } = render(<LandingFooter />);

      const footer = container.querySelector("footer");
      const gridContainer = footer?.querySelector('[class*="grid"]');
      expect(gridContainer).toBeInTheDocument();
    });

    it("should have max-width container", () => {
      const { container } = render(<LandingFooter />);

      const footer = container.querySelector("footer");
      const maxWidthContainer = footer?.querySelector('[class*="max-w"]');
      expect(maxWidthContainer).toBeInTheDocument();
    });

    it("should be responsive", () => {
      const { container } = render(<LandingFooter />);

      const footer = container.querySelector("footer");
      const gridContainer = footer?.querySelector('[class*="md:grid-cols"]');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe("Link Behavior", () => {
    it("should have hover states on links", () => {
      render(<LandingFooter />);

      const featuresLink = screen.getByRole("link", { name: /^features$/i });
      expect(featuresLink).toHaveClass("hover:text-white");
    });

    it("should use placeholder hrefs for links", () => {
      render(<LandingFooter />);

      const featuresLink = screen.getByRole("link", { name: /^features$/i });
      expect(featuresLink).toHaveAttribute("href", "#");
    });
  });
});
