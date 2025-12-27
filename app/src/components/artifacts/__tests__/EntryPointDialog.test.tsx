import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { EntryPointDialog } from "../EntryPointDialog";

describe("EntryPointDialog", () => {
  const mockHtmlFiles = [
    "index.html",
    "about.html",
    "contact.html",
    "pages/home.html",
  ];

  it("should not render when closed", () => {
    render(
      <EntryPointDialog
        open={false}
        onOpenChange={vi.fn()}
        zipFileName="test.zip"
        htmlFiles={mockHtmlFiles}
        onSelect={vi.fn()}
      />
    );

    expect(screen.queryByText("Select Entry Point")).not.toBeInTheDocument();
  });

  it("should render when open", () => {
    render(
      <EntryPointDialog
        open={true}
        onOpenChange={vi.fn()}
        zipFileName="test.zip"
        htmlFiles={mockHtmlFiles}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText("Select Entry Point")).toBeInTheDocument();
  });

  it("should display ZIP filename", () => {
    render(
      <EntryPointDialog
        open={true}
        onOpenChange={vi.fn()}
        zipFileName="my-project.zip"
        htmlFiles={mockHtmlFiles}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText(/my-project\.zip/i)).toBeInTheDocument();
  });

  it("should show file count", () => {
    render(
      <EntryPointDialog
        open={true}
        onOpenChange={vi.fn()}
        zipFileName="test.zip"
        htmlFiles={mockHtmlFiles}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText(/found 4 html files/i)).toBeInTheDocument();
  });

  it("should display all HTML files in list", () => {
    render(
      <EntryPointDialog
        open={true}
        onOpenChange={vi.fn()}
        zipFileName="test.zip"
        htmlFiles={mockHtmlFiles}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getAllByText("index.html").length).toBeGreaterThan(0);
    expect(screen.getAllByText("about.html").length).toBeGreaterThan(0);
    expect(screen.getAllByText("contact.html").length).toBeGreaterThan(0);
    expect(screen.getAllByText("pages/home.html").length).toBeGreaterThan(0);
  });

  it("should auto-select index.html if present", () => {
    render(
      <EntryPointDialog
        open={true}
        onOpenChange={vi.fn()}
        zipFileName="test.zip"
        htmlFiles={mockHtmlFiles}
        onSelect={vi.fn()}
      />
    );

    // index.html should have the selected indicator
    const buttons = screen.getAllByRole("button");
    const fileButtons = buttons.filter((btn) => !btn.textContent?.match(/cancel|confirm/i));
    const indexButton = fileButtons.find((btn) => btn.textContent?.includes("index.html"));
    expect(indexButton).toHaveClass("border-purple-500");
  });

  it("should auto-select main.html if index.html not present", () => {
    const filesWithoutIndex = ["main.html", "about.html"];

    render(
      <EntryPointDialog
        open={true}
        onOpenChange={vi.fn()}
        zipFileName="test.zip"
        htmlFiles={filesWithoutIndex}
        onSelect={vi.fn()}
      />
    );

    const buttons = screen.getAllByRole("button");
    const fileButtons = buttons.filter((btn) => !btn.textContent?.match(/cancel|confirm/i));
    const mainButton = fileButtons.find((btn) => btn.textContent?.includes("main.html"));
    expect(mainButton).toHaveClass("border-purple-500");
  });

  it("should auto-select first file if no index or main", () => {
    const files = ["home.html", "about.html"];

    render(
      <EntryPointDialog
        open={true}
        onOpenChange={vi.fn()}
        zipFileName="test.zip"
        htmlFiles={files}
        onSelect={vi.fn()}
      />
    );

    const buttons = screen.getAllByRole("button");
    const fileButtons = buttons.filter((btn) => !btn.textContent?.match(/cancel|confirm/i));
    const homeButton = fileButtons.find((btn) => btn.textContent?.includes("home.html"));
    expect(homeButton).toHaveClass("border-purple-500");
  });

  it("should allow selecting different file", async () => {
    const user = userEvent.setup();
    render(
      <EntryPointDialog
        open={true}
        onOpenChange={vi.fn()}
        zipFileName="test.zip"
        htmlFiles={mockHtmlFiles}
        onSelect={vi.fn()}
      />
    );

    // Click on a different file
    const buttons = screen.getAllByRole("button");
    const fileButtons = buttons.filter((btn) => !btn.textContent?.match(/cancel|confirm/i));
    const aboutButton = fileButtons.find((btn) => btn.textContent?.includes("about.html"));
    await user.click(aboutButton!);

    // about.html should now be selected
    expect(aboutButton).toHaveClass("border-purple-500");
  });

  it("should call onSelect with chosen file on confirm", async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn().mockResolvedValue({});

    render(
      <EntryPointDialog
        open={true}
        onOpenChange={vi.fn()}
        zipFileName="test.zip"
        htmlFiles={mockHtmlFiles}
        onSelect={handleSelect}
      />
    );

    // Select a file
    const buttons = screen.getAllByRole("button");
    const fileButtons = buttons.filter((btn) => !btn.textContent?.match(/cancel|confirm/i));
    const aboutButton = fileButtons.find((btn) => btn.textContent?.includes("about.html"));
    await user.click(aboutButton!);

    // Confirm
    const confirmButton = screen.getByRole("button", { name: /confirm/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(handleSelect).toHaveBeenCalledWith("about.html");
    });
  });

  it("should close on cancel", async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();

    render(
      <EntryPointDialog
        open={true}
        onOpenChange={handleOpenChange}
        zipFileName="test.zip"
        htmlFiles={mockHtmlFiles}
        onSelect={vi.fn()}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it("should show checkmark icon on selected item", () => {
    render(
      <EntryPointDialog
        open={true}
        onOpenChange={vi.fn()}
        zipFileName="test.zip"
        htmlFiles={mockHtmlFiles}
        onSelect={vi.fn()}
      />
    );

    // index.html is auto-selected, should have checkmark
    const buttons = screen.getAllByRole("button");
    const fileButtons = buttons.filter((btn) => !btn.textContent?.match(/cancel|confirm/i));
    const indexButton = fileButtons.find((btn) => btn.textContent?.includes("index.html"));
    const checkIcon = indexButton?.querySelector('svg.lucide-check-circle-2');
    expect(checkIcon).toBeInTheDocument();
  });
});
