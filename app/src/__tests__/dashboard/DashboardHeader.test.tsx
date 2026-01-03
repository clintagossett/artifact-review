import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardHeader } from "@/components/artifacts/DashboardHeader";

// Mock Convex auth
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({
    signOut: vi.fn(),
  }),
}));

describe("DashboardHeader", () => {
  const defaultProps = {
    onUploadClick: vi.fn(),
    userEmail: "user@example.com",
    userName: "John Doe",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render logo and brand text", () => {
    render(<DashboardHeader {...defaultProps} />);

    expect(screen.getByText("Artifact Review")).toBeInTheDocument();
    // Logo icon should be present
    const header = screen.getByRole("banner");
    expect(header.querySelector("svg")).toBeInTheDocument();
  });

  it("should render upload button", () => {
    render(<DashboardHeader {...defaultProps} />);

    const uploadButton = screen.getByRole("button", { name: /upload/i });
    expect(uploadButton).toBeInTheDocument();
  });

  it("should call onUploadClick when upload button clicked", async () => {
    const user = userEvent.setup();
    const handleUpload = vi.fn();

    render(<DashboardHeader {...defaultProps} onUploadClick={handleUpload} />);

    const uploadButton = screen.getByRole("button", { name: /upload/i });
    await user.click(uploadButton);

    expect(handleUpload).toHaveBeenCalledTimes(1);
  });

  it("should render user menu trigger", () => {
    render(<DashboardHeader {...defaultProps} />);

    // User menu trigger should be present
    const userMenuTriggers = screen.getAllByRole("button");
    const userMenuTrigger = userMenuTriggers.find((button) =>
      button.querySelector('svg')
    );
    expect(userMenuTrigger).toBeInTheDocument();
  });

  it("should display user name in menu", async () => {
    const user = userEvent.setup();
    render(<DashboardHeader {...defaultProps} />);

    // Find and click user menu button (last button with User icon)
    const buttons = screen.getAllByRole("button");
    const userButton = buttons[buttons.length - 1];
    await user.click(userButton);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("should display user email in menu", async () => {
    const user = userEvent.setup();
    render(<DashboardHeader {...defaultProps} />);

    // Find and click user menu button
    const buttons = screen.getAllByRole("button");
    const userButton = buttons[buttons.length - 1];
    await user.click(userButton);

    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  it("should show default user name when not provided", async () => {
    const user = userEvent.setup();
    render(
      <DashboardHeader
        {...defaultProps}
        userName={undefined}
        userEmail="user@example.com"
      />
    );

    const buttons = screen.getAllByRole("button");
    const userButton = buttons[buttons.length - 1];
    await user.click(userButton);

    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("should have settings menu item", async () => {
    const user = userEvent.setup();
    render(<DashboardHeader {...defaultProps} />);

    const buttons = screen.getAllByRole("button");
    const userButton = buttons[buttons.length - 1];
    await user.click(userButton);

    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("should have sign out menu item", async () => {
    const user = userEvent.setup();
    render(<DashboardHeader {...defaultProps} />);

    const buttons = screen.getAllByRole("button");
    const userButton = buttons[buttons.length - 1];
    await user.click(userButton);

    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("should have purple upload button", () => {
    render(<DashboardHeader {...defaultProps} />);

    const uploadButton = screen.getByRole("button", { name: /upload/i });
    expect(uploadButton).toHaveClass("bg-purple-600");
  });

  it("should have proper header styling", () => {
    const { container } = render(<DashboardHeader {...defaultProps} />);

    const header = container.querySelector("header");
    expect(header).toHaveClass("border-b");
    expect(header).toHaveClass("bg-white");
  });
});
