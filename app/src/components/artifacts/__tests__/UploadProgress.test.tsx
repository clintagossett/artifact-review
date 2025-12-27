import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { UploadProgress } from "../UploadProgress";

describe("UploadProgress", () => {
  describe("rendering", () => {
    it("should display file name", () => {
      render(<UploadProgress fileName="test-artifact.html" progress={50} />);

      expect(screen.getByText("test-artifact.html")).toBeInTheDocument();
    });

    it("should display progress percentage", () => {
      render(<UploadProgress fileName="test.html" progress={75} />);

      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("should show progress bar with correct value", () => {
      render(<UploadProgress fileName="test.html" progress={60} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "60");
    });
  });

  describe("file size formatting", () => {
    it("should format bytes correctly", () => {
      render(<UploadProgress fileName="test.html" progress={50} fileSize={512} />);

      expect(screen.getByText(/512 B/)).toBeInTheDocument();
    });

    it("should format KB correctly", () => {
      render(<UploadProgress fileName="test.html" progress={50} fileSize={1536} />); // 1.5 KB

      expect(screen.getByText(/1.5 KB/)).toBeInTheDocument();
    });

    it("should format MB correctly", () => {
      render(<UploadProgress fileName="test.html" progress={50} fileSize={2097152} />); // 2 MB

      expect(screen.getByText(/2.0 MB/)).toBeInTheDocument();
    });

    it("should not show size if not provided", () => {
      render(<UploadProgress fileName="test.html" progress={50} />);

      // Should only show filename and progress
      expect(screen.getByText("test.html")).toBeInTheDocument();
      expect(screen.getByText("50%")).toBeInTheDocument();
    });
  });

  describe("progress states", () => {
    it("should show 0% progress", () => {
      render(<UploadProgress fileName="test.html" progress={0} />);

      expect(screen.getByText("0%")).toBeInTheDocument();
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "0");
    });

    it("should show 100% progress", () => {
      render(<UploadProgress fileName="test.html" progress={100} />);

      expect(screen.getByText("100%")).toBeInTheDocument();
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "100");
    });

    it("should have proper ARIA attributes", () => {
      render(<UploadProgress fileName="test.html" progress={45} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuemin", "0");
      expect(progressBar).toHaveAttribute("aria-valuemax", "100");
      expect(progressBar).toHaveAttribute("aria-valuenow", "45");
    });
  });

  describe("visual elements", () => {
    it("should show file icon", () => {
      const { container } = render(<UploadProgress fileName="test.html" progress={50} />);

      // Check for lucide FileText icon
      const icon = container.querySelector('svg.lucide-file-text');
      expect(icon).toBeInTheDocument();
    });
  });
});
