import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ============================================================================
// Mocks
// ============================================================================

// Mock next/navigation — layout.tsx uses useRouter + usePathname, page.tsx uses redirect
const mockPush = vi.fn();
const mockRedirect = vi.fn();
let mockPathname = "/settings/account";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    // Next.js redirect throws to halt rendering; simulate that
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/components/auth/ProtectedPage", () => ({
  ProtectedPage: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="protected-page">{children}</div>
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
    </div>
  ),
}));

// Lazy imports so mocks are applied first
const importSettingsPage = () => import("@/app/settings/page");
const importSettingsLayout = () => import("@/app/settings/layout");
const importAccountPage = () => import("@/app/settings/account/page");
const importAgentsPage = () => import("@/app/settings/agents/page");
const importDeveloperPage = () => import("@/app/settings/developer/page");
const importBillingPage = () => import("@/app/settings/billing/page");

// ============================================================================
// Tests: /settings redirect page
// ============================================================================

describe("SettingsPage (/settings)", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
  });

  it("should redirect to /settings/account", async () => {
    const { default: SettingsPage } = await importSettingsPage();
    expect(() => SettingsPage()).toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/settings/account");
  });
});

// ============================================================================
// Tests: Settings layout (shared across all settings sub-pages)
// ============================================================================

describe("SettingsLayout", () => {
  beforeEach(() => {
    mockPathname = "/settings/account";
    mockPush.mockClear();
  });

  async function renderLayout(children?: React.ReactNode) {
    const { default: SettingsLayout } = await importSettingsLayout();
    return render(
      <SettingsLayout>{children ?? <div>Content</div>}</SettingsLayout>
    );
  }

  it("should render inside ProtectedPage", async () => {
    await renderLayout();
    expect(screen.getByTestId("protected-page")).toBeInTheDocument();
  });

  it("should have Settings title", async () => {
    await renderLayout();
    expect(screen.getByRole("heading", { name: /^settings$/i })).toBeInTheDocument();
  });

  it("should have back button to dashboard", async () => {
    await renderLayout();
    const backButton = screen.getByRole("button", { name: /back to dashboard/i });
    expect(backButton).toBeInTheDocument();
  });

  it("should render sidebar navigation with all sections", async () => {
    await renderLayout();
    expect(screen.getByRole("link", { name: /account/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /agents/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /developer/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /billing/i })).toBeInTheDocument();
  });

  it("should render children in content area", async () => {
    await renderLayout(<div data-testid="child-content">Hello</div>);
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });
});

// ============================================================================
// Tests: Sub-page components
// ============================================================================

describe("AccountSettingsPage (/settings/account)", () => {
  it("should render AccountInfoSection", async () => {
    const { default: AccountPage } = await importAccountPage();
    render(<AccountPage />);
    expect(screen.getByTestId("account-info-section")).toBeInTheDocument();
  });

  it("should render PasswordSection", async () => {
    const { default: AccountPage } = await importAccountPage();
    render(<AccountPage />);
    expect(screen.getByTestId("password-section")).toBeInTheDocument();
  });

  it("should render DebugToggle in development mode", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const { default: AccountPage } = await importAccountPage();
    render(<AccountPage />);
    expect(screen.getByTestId("debug-toggle")).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it("should not render DebugToggle in production mode", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const { default: AccountPage } = await importAccountPage();
    render(<AccountPage />);
    expect(screen.queryByTestId("debug-toggle")).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});

describe("AgentsSettingsPage (/settings/agents)", () => {
  it("should render AgentsSection", async () => {
    const { default: AgentsPage } = await importAgentsPage();
    render(<AgentsPage />);
    expect(screen.getByTestId("agents-section")).toBeInTheDocument();
  });
});

describe("DeveloperSettingsPage (/settings/developer)", () => {
  it("should render DeveloperSection", async () => {
    const { default: DeveloperPage } = await importDeveloperPage();
    render(<DeveloperPage />);
    expect(screen.getByTestId("developer-section")).toBeInTheDocument();
  });
});

describe("BillingSettingsPage (/settings/billing)", () => {
  it("should render BillingSection", async () => {
    const { default: BillingPage } = await importBillingPage();
    render(<BillingPage />);
    expect(screen.getByTestId("billing-section")).toBeInTheDocument();
  });
});
