import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AvatarGroup } from "@/components/ui/avatar-group";

describe("AvatarGroup", () => {
  it("should render avatars for users", () => {
    const users = [
      { name: "John Doe", image: "https://example.com/john.jpg" },
      { name: "Jane Smith", image: "https://example.com/jane.jpg" },
    ];

    render(<AvatarGroup users={users} />);

    // Check that avatars are rendered
    const avatars = screen.getAllByRole("img");
    expect(avatars).toHaveLength(2);
  });

  it("should show user initials when no image is provided", () => {
    const users = [{ name: "John Doe" }];

    render(<AvatarGroup users={users} />);

    // Should show initials
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("should limit displayed avatars to max prop", () => {
    const users = [
      { name: "User 1" },
      { name: "User 2" },
      { name: "User 3" },
      { name: "User 4" },
    ];

    render(<AvatarGroup users={users} max={2} />);

    // Should show 2 avatars + overflow
    expect(screen.getByText("U1")).toBeInTheDocument();
    expect(screen.getByText("U2")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("should show overflow count for extra users", () => {
    const users = [
      { name: "User 1" },
      { name: "User 2" },
      { name: "User 3" },
      { name: "User 4" },
      { name: "User 5" },
    ];

    render(<AvatarGroup users={users} max={3} />);

    // Should show +2 for the extra users
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("should handle empty users array", () => {
    const { container } = render(<AvatarGroup users={[]} />);

    // Should render nothing or empty container
    const avatars = screen.queryAllByRole("img");
    expect(avatars).toHaveLength(0);
  });

  it("should apply correct size classes", () => {
    const users = [{ name: "John Doe" }];

    const { rerender } = render(<AvatarGroup users={users} size="sm" />);
    let container = screen.getByText("JD").closest("span");
    expect(container).toHaveClass("h-6", "w-6");

    rerender(<AvatarGroup users={users} size="md" />);
    container = screen.getByText("JD").closest("span");
    expect(container).toHaveClass("h-8", "w-8");

    rerender(<AvatarGroup users={users} size="lg" />);
    container = screen.getByText("JD").closest("span");
    expect(container).toHaveClass("h-10", "w-10");
  });

  it("should extract initials correctly from names", () => {
    const users = [
      { name: "John Doe" },
      { name: "Sarah Chen" },
      { name: "Mike" },
    ];

    render(<AvatarGroup users={users} />);

    expect(screen.getByText("JD")).toBeInTheDocument();
    expect(screen.getByText("SC")).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("should use gradient background when no image", () => {
    const users = [{ name: "John Doe" }];

    render(<AvatarGroup users={users} />);

    const fallback = screen.getByText("JD").closest("span");
    expect(fallback).toHaveClass("bg-gradient-to-br", "from-blue-500", "to-purple-600");
  });
});
