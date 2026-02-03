import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { NewArtifactDialog } from "../NewArtifactDialog";

describe("NewArtifactDialog", () => {
  it("should not render when closed", () => {
    const handleOpenChange = vi.fn();
    const handleCreate = vi.fn();

    render(
      <NewArtifactDialog
        open={false}
        onOpenChange={handleOpenChange}
        onCreateArtifact={handleCreate}
      />
    );

    expect(screen.queryByText("Create New Artifact")).not.toBeInTheDocument();
  });

  it("should render when open", () => {
    const handleOpenChange = vi.fn();
    const handleCreate = vi.fn();

    render(
      <NewArtifactDialog
        open={true}
        onOpenChange={handleOpenChange}
        onCreateArtifact={handleCreate}
      />
    );

    expect(screen.getByText("Create New Artifact")).toBeInTheDocument();
  });

  it("should show embedded upload dropzone", () => {
    render(
      <NewArtifactDialog
        open={true}
        onOpenChange={vi.fn()}
        onCreateArtifact={vi.fn()}
      />
    );

    expect(screen.getByText(/drop your files here/i)).toBeInTheDocument();
  });

  it("should have title and description inputs", () => {
    render(
      <NewArtifactDialog
        open={true}
        onOpenChange={vi.fn()}
        onCreateArtifact={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/artifact name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it("should auto-suggest title from filename", async () => {
    const user = userEvent.setup();
    render(
      <NewArtifactDialog
        open={true}
        onOpenChange={vi.fn()}
        onCreateArtifact={vi.fn()}
      />
    );

    const fileInput = screen.getByLabelText(/upload artifact file/i);
    const file = new File(["content"], "my-awesome-project.html", {
      type: "text/html",
    });

    await user.upload(fileInput, file);

    await waitFor(() => {
      const titleInput = screen.getByLabelText(/artifact name/i) as HTMLInputElement;
      expect(titleInput.value).toBe("My Awesome Project");
    });
  });

  it("should disable Create button without file", () => {
    render(
      <NewArtifactDialog
        open={true}
        onOpenChange={vi.fn()}
        onCreateArtifact={vi.fn()}
      />
    );

    const createButton = screen.getByRole("button", { name: /create artifact/i });
    expect(createButton).toBeDisabled();
  });

  it("should disable Create button without title", async () => {
    const user = userEvent.setup();
    render(
      <NewArtifactDialog
        open={true}
        onOpenChange={vi.fn()}
        onCreateArtifact={vi.fn()}
      />
    );

    // Upload file
    const fileInput = screen.getByLabelText(/upload artifact file/i);
    const file = new File(["content"], "test.html", { type: "text/html" });
    await user.upload(fileInput, file);

    // Clear the auto-suggested title
    const titleInput = screen.getByLabelText(/artifact name/i);
    await user.clear(titleInput);

    const createButton = screen.getByRole("button", { name: /create artifact/i });
    expect(createButton).toBeDisabled();
  });

  it("should call onCreateArtifact with correct data", async () => {
    const user = userEvent.setup();
    const handleCreate = vi.fn().mockResolvedValue({});

    render(
      <NewArtifactDialog
        open={true}
        onOpenChange={vi.fn()}
        onCreateArtifact={handleCreate}
      />
    );

    // Upload file
    const fileInput = screen.getByLabelText(/upload artifact file/i);
    const file = new File(["content"], "test.html", { type: "text/html" });
    await user.upload(fileInput, file);

    // Edit title
    const titleInput = screen.getByLabelText(/artifact name/i);
    await user.clear(titleInput);
    await user.type(titleInput, "My Project");

    // Add description
    const descInput = screen.getByLabelText(/description/i);
    await user.type(descInput, "My description");

    // Submit
    const createButton = screen.getByRole("button", { name: /create artifact/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(handleCreate).toHaveBeenCalledWith({
        file,
        name: "My Project",
        description: "My description",
      });
    }, { timeout: 10000 });
  }, 10000);

  it("should close on cancel", async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();

    render(
      <NewArtifactDialog
        open={true}
        onOpenChange={handleOpenChange}
        onCreateArtifact={vi.fn()}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
