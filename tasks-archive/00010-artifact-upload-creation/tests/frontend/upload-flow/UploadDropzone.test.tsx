import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { UploadDropzone } from "@/components/artifacts/UploadDropzone";

describe("UploadDropzone", () => {
  describe("rendering and initial state", () => {
    it("should render default state with upload instructions", () => {
      const handleFileSelect = vi.fn();
      render(<UploadDropzone onFileSelect={handleFileSelect} />);

      expect(screen.getByText(/drop your files here/i)).toBeInTheDocument();
      expect(screen.getByText(/choose file/i)).toBeInTheDocument();
    });

    it("should have proper accessibility attributes", () => {
      const handleFileSelect = vi.fn();
      render(<UploadDropzone onFileSelect={handleFileSelect} />);

      const dropzone = screen.getByRole("button");
      expect(dropzone).toHaveAttribute("aria-label", "Drop zone for file upload");
      expect(dropzone).toHaveAttribute("tabIndex", "0");
    });
  });

  describe("drag and drop interactions", () => {
    it("should show drag-active state on drag enter", () => {
      const handleFileSelect = vi.fn();
      render(<UploadDropzone onFileSelect={handleFileSelect} />);

      const dropzone = screen.getByRole("button");
      fireEvent.dragEnter(dropzone);

      // Visual state change - purple border and background
      expect(dropzone).toHaveClass("border-purple-500");
    });

    it("should return to default state on drag leave", () => {
      const handleFileSelect = vi.fn();
      render(<UploadDropzone onFileSelect={handleFileSelect} />);

      const dropzone = screen.getByRole("button");
      fireEvent.dragEnter(dropzone);
      fireEvent.dragLeave(dropzone);

      expect(dropzone).not.toHaveClass("border-purple-500");
    });

    it("should call onFileSelect with valid HTML file on drop", async () => {
      const handleFileSelect = vi.fn();
      render(<UploadDropzone onFileSelect={handleFileSelect} accept=".html,.htm" />);

      const file = new File(["<html></html>"], "test.html", { type: "text/html" });
      const dropzone = screen.getByRole("button");

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(handleFileSelect).toHaveBeenCalledWith(file);
      });
    });

    it("should show error for invalid file type", async () => {
      const handleFileSelect = vi.fn();
      render(<UploadDropzone onFileSelect={handleFileSelect} accept=".html,.htm,.md,.zip" />);

      const file = new File(["content"], "test.pdf", { type: "application/pdf" });
      const dropzone = screen.getByRole("button");

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
      });
      expect(handleFileSelect).not.toHaveBeenCalled();
    });

    it("should show error for file exceeding size limit", async () => {
      const handleFileSelect = vi.fn();
      const maxSize = 5 * 1024 * 1024; // 5MB
      render(<UploadDropzone onFileSelect={handleFileSelect} maxSize={maxSize} accept=".html" />);

      // Create a file larger than 5MB
      const largeContent = new Array(maxSize + 1000).fill("a").join("");
      const file = new File([largeContent], "large.html", { type: "text/html" });
      const dropzone = screen.getByRole("button");

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument();
      });
      expect(handleFileSelect).not.toHaveBeenCalled();
    });
  });

  describe("file picker interaction", () => {
    it("should open file picker on Choose File button click", async () => {
      const user = userEvent.setup();
      const handleFileSelect = vi.fn();
      render(<UploadDropzone onFileSelect={handleFileSelect} />);

      const button = screen.getByRole("button", { name: /choose file/i });

      // Get the file input and add a change listener
      const fileInput = screen.getByLabelText(/upload artifact file/i);
      const file = new File(["<html></html>"], "test.html", { type: "text/html" });

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(handleFileSelect).toHaveBeenCalledWith(file);
      });
    });

    it("should trigger file picker on Enter key press", async () => {
      const handleFileSelect = vi.fn();
      render(<UploadDropzone onFileSelect={handleFileSelect} />);

      const dropzone = screen.getByRole("button");
      fireEvent.keyDown(dropzone, { key: "Enter" });

      // File input should be clicked
      const fileInput = screen.getByLabelText(/upload artifact file/i);
      expect(fileInput).toBeInTheDocument();
    });
  });

  describe("file-selected state", () => {
    it("should show selected file name and size", async () => {
      const handleFileSelect = vi.fn();
      const { rerender } = render(<UploadDropzone onFileSelect={handleFileSelect} />);

      const file = new File(["<html></html>"], "my-artifact.html", { type: "text/html" });
      const dropzone = screen.getByRole("button");

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(handleFileSelect).toHaveBeenCalledWith(file);
      });

      // Rerender with selected file to show selected state
      rerender(<UploadDropzone onFileSelect={handleFileSelect} selectedFile={file} />);

      expect(screen.getByText("my-artifact.html")).toBeInTheDocument();
    });

    it("should show remove button for selected file", async () => {
      const handleFileSelect = vi.fn();
      const handleRemove = vi.fn();
      const file = new File(["<html></html>"], "test.html", { type: "text/html" });

      render(
        <UploadDropzone
          onFileSelect={handleFileSelect}
          selectedFile={file}
          onRemoveFile={handleRemove}
        />
      );

      const removeButton = screen.getByRole("button", { name: /remove file/i });
      expect(removeButton).toBeInTheDocument();

      await userEvent.click(removeButton);
      expect(handleRemove).toHaveBeenCalled();
    });
  });

  describe("error state handling", () => {
    it("should display error message with red border", () => {
      const handleFileSelect = vi.fn();
      render(
        <UploadDropzone
          onFileSelect={handleFileSelect}
          error="Invalid file type. Supports .html, .md, .zip"
        />
      );

      const dropzone = screen.getByRole("button");
      expect(dropzone).toHaveClass("border-red-500");
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    });

    it("should clear error on successful file selection", async () => {
      const handleFileSelect = vi.fn();
      const { rerender } = render(
        <UploadDropzone
          onFileSelect={handleFileSelect}
          error="Previous error"
        />
      );

      expect(screen.getByText("Previous error")).toBeInTheDocument();

      // Simulate successful file drop
      const file = new File(["<html></html>"], "test.html", { type: "text/html" });
      const dropzone = screen.getByRole("button");

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(handleFileSelect).toHaveBeenCalledWith(file);
      });

      // Rerender without error
      rerender(<UploadDropzone onFileSelect={handleFileSelect} />);
      expect(screen.queryByText("Previous error")).not.toBeInTheDocument();
    });
  });

  describe("uploading state", () => {
    it("should disable interactions when uploading", () => {
      const handleFileSelect = vi.fn();
      render(<UploadDropzone onFileSelect={handleFileSelect} isUploading={true} />);

      const dropzone = screen.getByRole("button");
      expect(dropzone).toHaveAttribute("aria-disabled", "true");
      expect(dropzone).toHaveClass("opacity-60");
    });

    it("should show uploading indicator", () => {
      const handleFileSelect = vi.fn();
      render(<UploadDropzone onFileSelect={handleFileSelect} isUploading={true} />);

      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    });
  });
});
