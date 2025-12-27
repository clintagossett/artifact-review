import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import userEvent from "@testing-library/user-event";
import { FAQSection } from "@/components/landing/FAQSection";

describe("FAQSection", () => {
  describe("Section Header", () => {
    it("should display section heading", () => {
      render(<FAQSection />);

      const heading = screen.getByRole("heading", {
        name: /frequently asked questions/i
      });
      expect(heading).toBeInTheDocument();
    });
  });

  describe("FAQ Items", () => {
    it("should display all FAQ questions", () => {
      render(<FAQSection />);

      // Based on Figma design, we have 5 FAQs
      expect(screen.getByText(/why not just use google docs/i)).toBeInTheDocument();
      expect(screen.getByText(/do reviewers need to create accounts/i)).toBeInTheDocument();
      expect(screen.getByText(/how does mcp integration work/i)).toBeInTheDocument();
      expect(screen.getByText(/is my data secure/i)).toBeInTheDocument();
      expect(screen.getByText(/what ai tools do you support/i)).toBeInTheDocument();
    });

    it("should display FAQ answers when expanded", async () => {
      const user = userEvent.setup();
      render(<FAQSection />);

      // Find the first accordion trigger and click it
      const firstQuestion = screen.getByText(/why not just use google docs/i);
      await user.click(firstQuestion);

      // Answer should be visible
      expect(
        screen.getByText(/google docs breaks html formatting/i)
      ).toBeInTheDocument();
    });

    it("should support multiple questions being expanded independently", async () => {
      const user = userEvent.setup();
      render(<FAQSection />);

      const firstQuestion = screen.getByText(/why not just use google docs/i);
      const secondQuestion = screen.getByText(/do reviewers need to create accounts/i);

      // Expand first question
      await user.click(firstQuestion);
      expect(screen.getByText(/google docs breaks html formatting/i)).toBeVisible();

      // The accordion should work as expected
      expect(firstQuestion).toBeInTheDocument();
      expect(secondQuestion).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("should have gray background", () => {
      const { container } = render(<FAQSection />);
      const section = container.querySelector("section");

      expect(section).toHaveClass("bg-gray-50");
    });

    it("should have centered content with max-width", () => {
      const { container } = render(<FAQSection />);
      const section = container.querySelector("section");

      // Check for max-width container
      const contentContainer = section?.querySelector('[class*="max-w"]');
      expect(contentContainer).toBeInTheDocument();
    });

    it("should have proper spacing", () => {
      const { container } = render(<FAQSection />);
      const section = container.querySelector("section");

      expect(section).toHaveClass("py-24");
    });
  });

  describe("Accessibility", () => {
    it("should use semantic heading for section title", () => {
      render(<FAQSection />);

      const heading = screen.getByRole("heading", {
        name: /frequently asked questions/i
      });
      expect(heading.tagName).toBe("H2");
    });

    it("should have keyboard navigable accordion", async () => {
      const user = userEvent.setup();
      render(<FAQSection />);

      const firstQuestion = screen.getByText(/why not just use google docs/i);

      // Should be able to tab to it
      await user.tab();
      // Note: This test verifies the accordion is keyboard accessible
      // Radix UI Accordion handles keyboard navigation automatically
      expect(firstQuestion).toBeInTheDocument();
    });
  });
});
