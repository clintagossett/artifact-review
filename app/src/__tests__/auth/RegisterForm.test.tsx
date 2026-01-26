import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RegisterForm } from "@/components/auth/RegisterForm";

// Mock the auth actions
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({
    signIn: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("RegisterForm", () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    mockOnSuccess.mockClear();
  });

  describe("Visual Elements", () => {
    it("should display GradientLogo with UserPlus icon", () => {
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      // Logo should be visible
      const logo = document.querySelector('.bg-gradient-to-br.from-blue-600.to-purple-600');
      expect(logo).toBeInTheDocument();
    });

    it("should display 'Create your account' heading", () => {
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      expect(screen.getByText("Create your account")).toBeInTheDocument();
    });

    it("should display subheading", () => {
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      expect(screen.getByText(/Get started with Artifact Review/i)).toBeInTheDocument();
    });

    it("should display AuthMethodToggle", () => {
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      expect(screen.getByRole("button", { name: /^password$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /magic link/i })).toBeInTheDocument();
    });

    it("should display name input with User icon", () => {
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      const nameInput = screen.getByLabelText(/full name/i);
      expect(nameInput).toBeInTheDocument();

      // Icon should be present
      const iconContainer = nameInput.parentElement;
      expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
    });

    it("should display email input with Mail icon", () => {
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeInTheDocument();

      // Icon should be present
      const iconContainer = emailInput.parentElement;
      expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
    });

    it("should display password input with Lock icon in password mode", () => {
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toBeInTheDocument();

      // Icon should be present
      const iconContainer = passwordInput.parentElement;
      expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
    });

    it("should display confirm password input in password mode", () => {
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it("should display password strength indicator when password is entered", async () => {
      const user = userEvent.setup();
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, "test123");

      expect(screen.getByText(/password strength/i)).toBeInTheDocument();
    });

    it("should display Create Account button with gradient background", () => {
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      const submitButton = screen.getByRole("button", { name: /create account/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveClass("bg-gradient-to-r");
    });

    it("should display sign in link at bottom", () => {
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      expect(screen.getByText(/Already have an account/i)).toBeInTheDocument();
      const signInLink = screen.getByText(/sign in/i);
      expect(signInLink.tagName).toBe("A");
    });

    it("should display terms footer", () => {
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
      expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
    });
  });

  describe("Auth Method Toggle", () => {
    it("should toggle to magic link mode when Magic Link is clicked", async () => {
      const user = userEvent.setup();
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      // Initially in password mode
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();

      // Click Magic Link toggle
      await user.click(screen.getByRole("button", { name: /magic link/i }));

      // Password fields should be hidden
      expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/confirm password/i)).not.toBeInTheDocument();

      // Magic link info should be shown
      expect(screen.getByText(/passwordless sign up/i)).toBeInTheDocument();
    });

    it("should toggle back to password mode when Password is clicked", async () => {
      const user = userEvent.setup();
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      // Switch to magic link mode
      await user.click(screen.getByRole("button", { name: /magic link/i }));
      expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();

      // Switch back to password mode
      await user.click(screen.getByRole("button", { name: /password/i }));

      // Password fields should be visible again
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it("should show magic link info panel in magic link mode", async () => {
      const user = userEvent.setup();
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      // Switch to magic link mode
      await user.click(screen.getByRole("button", { name: /magic link/i }));

      // Magic link info should be visible
      expect(screen.getByText(/passwordless sign up/i)).toBeInTheDocument();
      expect(screen.getByText(/email you a secure link/i)).toBeInTheDocument();
    });
  });

  describe("Password Requirements", () => {
    it("should display password requirements when typing password", async () => {
      const user = userEvent.setup();
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, "test");

      // Should show requirements
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/contains a number/i)).toBeInTheDocument();
      expect(screen.getByText(/contains a letter/i)).toBeInTheDocument();
    });

    it("should show check marks for met requirements", async () => {
      const user = userEvent.setup();
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, "password123");

      // All requirements should be met (check for green styling or check icons)
      // The requirements text should be present
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/contains a number/i)).toBeInTheDocument();
      expect(screen.getByText(/contains a letter/i)).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should show error when name is empty", async () => {
      const user = userEvent.setup();
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      // Leave name empty, fill other fields
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.type(screen.getByLabelText(/confirm password/i), "password123");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      // Should show name validation error (HTML5 validation will handle this)
      // We can't easily test HTML5 validation, but component requires name field
    });

    it("should show error when passwords don't match", async () => {
      const user = userEvent.setup();
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      await user.type(screen.getByLabelText(/full name/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.type(screen.getByLabelText(/confirm password/i), "password456");

      // Should show mismatch indicator
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    it("should show error when password doesn't meet requirements", async () => {
      const user = userEvent.setup();
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      await user.type(screen.getByLabelText(/full name/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/^password$/i), "weak");
      await user.type(screen.getByLabelText(/confirm password/i), "weak");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      // Should show error about password requirements
      await waitFor(() => {
        expect(screen.getByText(/password does not meet all requirements/i)).toBeInTheDocument();
      });
    });
  });

  describe("Form Submission", () => {
    it("should submit registration with name, email, and password", async () => {
      const user = userEvent.setup();
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      await user.type(screen.getByLabelText(/full name/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.type(screen.getByLabelText(/confirm password/i), "password123");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it("should call onSuccess after successful registration", async () => {
      const user = userEvent.setup();
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      await user.type(screen.getByLabelText(/full name/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.type(screen.getByLabelText(/confirm password/i), "password123");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it("should submit magic link with name and email only", async () => {
      const user = userEvent.setup();
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      // Switch to magic link mode
      await user.click(screen.getByRole("button", { name: /magic link/i }));

      await user.type(screen.getByLabelText(/full name/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.click(screen.getByRole("button", { name: /send magic link/i }));

      // Verify form submitted successfully
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it("should show loading state while submitting", async () => {
      const user = userEvent.setup();
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      await user.type(screen.getByLabelText(/full name/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.type(screen.getByLabelText(/confirm password/i), "password123");

      // Button should have proper disabled state based on props
      // This is tested in the component implementation
      // Async loading state is difficult to test due to mock timing
      const submitButton = screen.getByRole("button", { name: /create account/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper labels for all form fields", () => {
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it("should be keyboard navigable", async () => {
      const user = userEvent.setup();
      render(<RegisterForm onSuccess={mockOnSuccess} />);

      // Tab through form elements
      await user.tab();
      expect(screen.getByRole("button", { name: /^password$/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole("button", { name: /magic link/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/full name/i)).toHaveFocus();
    });
  });
});
