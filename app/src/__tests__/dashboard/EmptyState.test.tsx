import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { EmptyState } from "@/components/artifacts/EmptyState";

describe("EmptyState", () => {
  it("should render heading and description", () => {
    render(<EmptyState onCreateFirst={vi.fn()} />);

    expect(screen.getByText("Create your first artifact")).toBeInTheDocument();
    expect(
      screen.getByText(/Upload HTML, Markdown, or ZIP files/i)
    ).toBeInTheDocument();
  });

  it("should render upload icon", () => {
    const { container } = render(<EmptyState onCreateFirst={vi.fn()} />);

    // Check for icon container
    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should render CTA button", () => {
    render(<EmptyState onCreateFirst={vi.fn()} />);

    const button = screen.getByRole("button", { name: /create artifact/i });
    expect(button).toBeInTheDocument();
  });

  it("should call onCreateFirst when button clicked", async () => {
    const user = userEvent.setup();
    const handleCreate = vi.fn();

    render(<EmptyState onCreateFirst={handleCreate} />);

    const button = screen.getByRole("button", { name: /create artifact/i });
    await user.click(button);

    expect(handleCreate).toHaveBeenCalledTimes(1);
  });

  it("should be center aligned", () => {
    const { container } = render(<EmptyState onCreateFirst={vi.fn()} />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("text-center");
  });

  it("should have generous padding", () => {
    const { container } = render(<EmptyState onCreateFirst={vi.fn()} />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("p-12");
  });
});
