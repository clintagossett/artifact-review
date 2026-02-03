import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SettingsPage from "@/app/settings/page";

// Mock all child components
vi.mock("@/components/auth/ProtectedPage", () => ({
  ProtectedPage: ({ children }: { children: React.ReactNode }) => <div data-testid="protected-page">{children}</div>,
}));

vi.mock("@/components/settings/SidebarNav", () => ({
  SidebarNav: ({ items, activeTab, onTabChange }: any) => (
    <div data-testid="sidebar-nav">
      {items.map((item: any) => (
        <button
          key={item.id}
          data-testid={`nav-${item.id}`}
          onClick={() => onTabChange(item.id)}
          className={activeTab === item.id ? "active" : ""}
        >
          {item.title}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/components/settings/AccountInfoSection", () => ({
  AccountInfoSection: () => <div data-testid="account-info-section">Account Info</div>,
}));

vi.mock("@/components/settings/PasswordSection", () => ({
  PasswordSection: () => <div data-testid="password-section">Password Section</div>,
}));

vi.mock("@/components/settings/BillingSection", () => ({
  BillingSection: () => <div data-testid="billing-section">Billing Section</div>,
}));

vi.mock("@/components/settings/AgentsSection", () => ({
  AgentsSection: () => <div data-testid="agents-section">Agents Section</div>,
}));

vi.mock("@/components/settings/DeveloperSection", () => ({
  DeveloperSection: () => <div data-testid="developer-section">Developer Section</div>,
}));

vi.mock("@/components/settings/DebugToggle", () => ({
  DebugToggle: ({ onOverride }: any) => (
    <div data-testid="debug-toggle">
      <button onClick={() => onOverride("auto")}>Auto</button>
      <button onClick={() => onOverride("fresh")}>Fresh</button>
      <button onClick={() => onOverride("stale")}>Stale</button>
    </div>
  ),
}));

describe("SettingsPage", () => {
  it("should render inside ProtectedPage", () => {
    render(<SettingsPage />);

    expect(screen.getByTestId("protected-page")).toBeInTheDocument();
  });

  it("should have back button to dashboard", () => {
    render(<SettingsPage />);

    const backButton = screen.getByRole("button", { name: /back to dashboard/i });
    expect(backButton).toBeInTheDocument();
  });

  it("should have Settings title", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: /^settings$/i })).toBeInTheDocument();
  });

  it("should render sidebar navigation", () => {
    render(<SettingsPage />);

    expect(screen.getByTestId("sidebar-nav")).toBeInTheDocument();
  });

  it("should show AgentsSection by default", () => {
    render(<SettingsPage />);

    // Default tab is "agents"
    expect(screen.getByTestId("agents-section")).toBeInTheDocument();
  });

  it("should render AccountInfoSection when general tab is selected", () => {
    render(<SettingsPage />);

    // Click on General tab
    fireEvent.click(screen.getByTestId("nav-general"));

    expect(screen.getByTestId("account-info-section")).toBeInTheDocument();
  });

  it("should render PasswordSection when general tab is selected", () => {
    render(<SettingsPage />);

    // Click on General tab
    fireEvent.click(screen.getByTestId("nav-general"));

    expect(screen.getByTestId("password-section")).toBeInTheDocument();
  });

  it("should render DebugToggle in development mode when general tab is selected", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    render(<SettingsPage />);

    // Click on General tab
    fireEvent.click(screen.getByTestId("nav-general"));

    // DebugToggle should be rendered
    expect(screen.getByTestId("debug-toggle")).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it("should not render DebugToggle in production mode", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    render(<SettingsPage />);

    // Click on General tab
    fireEvent.click(screen.getByTestId("nav-general"));

    // DebugToggle should NOT be rendered
    expect(screen.queryByTestId("debug-toggle")).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it("should render DeveloperSection when developer tab is selected", () => {
    render(<SettingsPage />);

    // Click on Developer tab
    fireEvent.click(screen.getByTestId("nav-developer"));

    expect(screen.getByTestId("developer-section")).toBeInTheDocument();
  });

  it("should render BillingSection when billing tab is selected", () => {
    render(<SettingsPage />);

    // Click on Billing tab
    fireEvent.click(screen.getByTestId("nav-billing"));

    expect(screen.getByTestId("billing-section")).toBeInTheDocument();
  });
});
