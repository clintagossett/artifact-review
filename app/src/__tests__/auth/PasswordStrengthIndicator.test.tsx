import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";

describe("PasswordStrengthIndicator", () => {
  describe("Visual Elements", () => {
    it("should render strength indicator bar", () => {
      const { container } = render(<PasswordStrengthIndicator password="" />);

      // Should have a visual bar element
      const bar = container.querySelector('[role="progressbar"]');
      expect(bar).toBeInTheDocument();
    });

    it("should display strength label", () => {
      render(<PasswordStrengthIndicator password="" />);

      // Should show some strength text
      expect(screen.getByText(/strength/i)).toBeInTheDocument();
    });
  });

  describe("Strength Levels", () => {
    it("should show 'Too weak' for empty password", () => {
      render(<PasswordStrengthIndicator password="" />);

      expect(screen.getByText(/too weak/i)).toBeInTheDocument();
    });

    it("should show 'Weak' for short password", () => {
      render(<PasswordStrengthIndicator password="pass" />);

      expect(screen.getByText(/weak/i)).toBeInTheDocument();
    });

    it("should show 'Fair' for medium password", () => {
      render(<PasswordStrengthIndicator password="pass123" />);

      expect(screen.getByText(/fair/i)).toBeInTheDocument();
    });

    it("should show 'Good' for strong password", () => {
      render(<PasswordStrengthIndicator password="password123" />);

      expect(screen.getByText(/good/i)).toBeInTheDocument();
    });

    it("should show 'Strong' for very strong password", () => {
      render(<PasswordStrengthIndicator password="MyP@ssw0rd123!" />);

      expect(screen.getByText(/strong/i)).toBeInTheDocument();
    });
  });

  describe("Visual Feedback", () => {
    it("should have red bar for weak password", () => {
      const { container } = render(<PasswordStrengthIndicator password="pass" />);

      const bar = container.querySelector('[role="progressbar"]');
      expect(bar).toHaveClass("bg-red-500");
    });

    it("should have yellow bar for fair password", () => {
      const { container } = render(<PasswordStrengthIndicator password="pass123" />);

      const bar = container.querySelector('[role="progressbar"]');
      expect(bar).toHaveClass("bg-yellow-500");
    });

    it("should have green bar for good password", () => {
      const { container } = render(<PasswordStrengthIndicator password="password123" />);

      const bar = container.querySelector('[role="progressbar"]');
      expect(bar).toHaveClass("bg-green-500");
    });

    it("should increase bar width as password gets stronger", () => {
      const { container: container1 } = render(<PasswordStrengthIndicator password="pass" />);
      const weakBar = container1.querySelector('[role="progressbar"]');
      const weakWidth = weakBar?.getAttribute('style');

      const { container: container2 } = render(<PasswordStrengthIndicator password="password123" />);
      const strongBar = container2.querySelector('[role="progressbar"]');
      const strongWidth = strongBar?.getAttribute('style');

      // Strong password should have wider bar than weak
      expect(weakWidth).not.toBe(strongWidth);
    });
  });

  describe("Accessibility", () => {
    it("should have aria-label on progress bar", () => {
      const { container } = render(<PasswordStrengthIndicator password="pass123" />);

      const bar = container.querySelector('[role="progressbar"]');
      expect(bar).toHaveAttribute('aria-label');
    });

    it("should have aria-valuenow reflecting strength", () => {
      const { container } = render(<PasswordStrengthIndicator password="pass123" />);

      const bar = container.querySelector('[role="progressbar"]');
      expect(bar).toHaveAttribute('aria-valuenow');
    });
  });
});
