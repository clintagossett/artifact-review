import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProblemSection } from "@/components/landing/ProblemSection";

describe("ProblemSection", () => {
  describe("Section Label", () => {
    it("should display THE PROBLEM label", () => {
      render(<ProblemSection />);

      expect(screen.getByText("THE PROBLEM")).toBeInTheDocument();
    });

    it("should have uppercase styling on label", () => {
      render(<ProblemSection />);
      const label = screen.getByText("THE PROBLEM");

      expect(label).toHaveClass("uppercase");
    });
  });

  describe("Headline", () => {
    it("should display problem statement headline", () => {
      render(<ProblemSection />);

      const headline = screen.getByRole("heading", {
        name: /ai tools generate html.*collaboration tools break it/i
      });
      expect(headline).toBeInTheDocument();
    });

    it("should be large and bold", () => {
      render(<ProblemSection />);
      const headline = screen.getByRole("heading", {
        name: /ai tools generate html/i
      });

      expect(headline).toHaveClass("font-bold");
    });
  });

  describe("Description", () => {
    it("should display problem description text", () => {
      render(<ProblemSection />);

      expect(screen.getByText(/product managers using claude code/i)).toBeInTheDocument();
    });

    it("should mention key pain points", () => {
      render(<ProblemSection />);

      // Should mention format breaking
      expect(screen.getByText(/formatting breaks/i)).toBeInTheDocument();

      // Should mention the time waste
      expect(screen.getByText(/2-3 hours per week/i)).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("should have gray background", () => {
      const { container } = render(<ProblemSection />);
      const section = container.querySelector("section");

      expect(section).toHaveClass("bg-gray-50");
    });

    it("should be centered with max width", () => {
      const { container } = render(<ProblemSection />);
      const section = container.querySelector("section");

      expect(section?.querySelector('[class*="max-w"]')).toBeInTheDocument();
    });

    it("should center text content", () => {
      const { container } = render(<ProblemSection />);
      const section = container.querySelector("section");

      expect(section?.querySelector('[class*="text-center"]')).toBeInTheDocument();
    });
  });
});
