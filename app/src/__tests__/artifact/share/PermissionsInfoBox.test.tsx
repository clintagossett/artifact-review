import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PermissionsInfoBox } from "@/components/artifact/share/PermissionsInfoBox";

describe("PermissionsInfoBox", () => {
  it("should render info icon", () => {
    render(<PermissionsInfoBox />);

    // Look for the info icon (SVG)
    const icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it("should render 'Reviewer Access' title", () => {
    render(<PermissionsInfoBox />);

    expect(screen.getByText("Reviewer Access")).toBeInTheDocument();
  });

  it("should render description about viewing and commenting", () => {
    render(<PermissionsInfoBox />);

    expect(screen.getByText(/Invited reviewers can view the artifact and add comments/i)).toBeInTheDocument();
  });

  it("should render note about not editing or inviting", () => {
    render(<PermissionsInfoBox />);

    expect(screen.getByText(/Reviewers cannot edit the artifact or invite others/i)).toBeInTheDocument();
  });

  it("should have correct styling classes", () => {
    render(<PermissionsInfoBox />);

    // Check for blue background - get the outermost container
    const container = screen.getByText("Reviewer Access").closest('div')?.parentElement?.parentElement;
    expect(container).toHaveClass("bg-blue-50");
    expect(container).toHaveClass("border-blue-100");
  });
});
