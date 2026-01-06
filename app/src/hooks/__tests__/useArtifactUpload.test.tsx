import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useArtifactUpload } from "../useArtifactUpload";
import type { ReactNode } from "react";

// Mock Convex hooks
const mockMutation = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockMutation,
}));

// Mock ConvexProvider wrapper
function createWrapper() {
  const Wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
}

describe("useArtifactUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() => useArtifactUpload(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isUploading).toBe(false);
      expect(result.current.uploadProgress).toBe(0);
      expect(result.current.error).toBeNull();
    });
  });

  describe("HTML file upload", () => {
    it("should upload HTML file successfully", async () => {
      const mockArtifactId = "artifact123" as unknown;
      const mockVersionId = "version123" as unknown;
      const mockShareToken = "abc12345";

      mockMutation.mockResolvedValueOnce({
        artifactId: mockArtifactId,
        versionId: mockVersionId,
        number: 1,
        shareToken: mockShareToken,
      });

      const { result } = renderHook(() => useArtifactUpload(), {
        wrapper: createWrapper(),
      });

      const file = new File(["<html><body>Test</body></html>"], "test.html", {
        type: "text/html",
      });

      let uploadResult: unknown;
      await act(async () => {
        uploadResult = await result.current.uploadFile({
          file,
          name: "Test Artifact",
          description: "Test description",
        });
      });

      expect(mockMutation).toHaveBeenCalledWith({
        name: "Test Artifact",
        description: "Test description",
        fileType: "html",
        content: "<html><body>Test</body></html>",
        originalFileName: "test.html",
      });

      expect(uploadResult).toEqual({
        artifactId: mockArtifactId,
        versionId: mockVersionId,
        number: 1,
        shareToken: mockShareToken,
      });
    });

    it("should set uploading state during upload", async () => {
      mockMutation.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useArtifactUpload(), {
        wrapper: createWrapper(),
      });

      const file = new File(["<html></html>"], "test.html", {
        type: "text/html",
      });

      act(() => {
        result.current.uploadFile({
          file,
          name: "Test",
        });
      });

      // Should be uploading immediately
      expect(result.current.isUploading).toBe(true);

      await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
      });
    });

    it("should track upload progress for HTML files", async () => {
      mockMutation.mockResolvedValueOnce({
        artifactId: "id1" as unknown,
        versionId: "v1" as unknown,
        number: 1,
        shareToken: "token1",
      });

      const { result } = renderHook(() => useArtifactUpload(), {
        wrapper: createWrapper(),
      });

      const file = new File(["<html></html>"], "test.html", {
        type: "text/html",
      });

      await act(async () => {
        await result.current.uploadFile({
          file,
          name: "Test",
        });
      });

      // Progress should be 100 when complete
      await waitFor(() => {
        expect(result.current.uploadProgress).toBe(100);
      });
    });
  });

  describe("Markdown file upload", () => {
    it("should upload Markdown file successfully", async () => {
      const mockArtifactId = "artifact123" as unknown;
      const mockVersionId = "version123" as unknown;

      mockMutation.mockResolvedValueOnce({
        artifactId: mockArtifactId,
        versionId: mockVersionId,
        number: 1,
        shareToken: "token",
      });

      const { result } = renderHook(() => useArtifactUpload(), {
        wrapper: createWrapper(),
      });

      const file = new File(["# Test Markdown"], "test.md", {
        type: "text/markdown",
      });

      await act(async () => {
        await result.current.uploadFile({
          file,
          name: "Test MD",
        });
      });

      expect(mockMutation).toHaveBeenCalledWith({
        name: "Test MD",
        fileType: "markdown",
        content: "# Test Markdown",
        originalFileName: "test.md",
      });
    });
  });

  describe("ZIP file upload", () => {
    it("should upload ZIP file with entry point", async () => {
      const mockArtifactId = "artifact123" as unknown;
      const mockVersionId = "version123" as unknown;

      mockMutation.mockResolvedValueOnce({
        artifactId: mockArtifactId,
        versionId: mockVersionId,
        number: 1,
        shareToken: "token",
      });

      const { result } = renderHook(() => useArtifactUpload(), {
        wrapper: createWrapper(),
      });

      const file = new File(["zip content"], "test.zip", {
        type: "application/zip",
      });

      await act(async () => {
        await result.current.uploadFile({
          file,
          name: "Test ZIP",
          entryPoint: "index.html",
        });
      });

      expect(mockMutation).toHaveBeenCalledWith({
        name: "Test ZIP",
        description: undefined,
        size: file.size,
        entryPoint: "index.html",
      });
    });
  });

  describe("error handling", () => {
    it("should handle mutation errors", async () => {
      const error = new Error("Upload failed");
      mockMutation.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useArtifactUpload(), {
        wrapper: createWrapper(),
      });

      const file = new File(["<html></html>"], "test.html", {
        type: "text/html",
      });

      await act(async () => {
        try {
          await result.current.uploadFile({
            file,
            name: "Test",
          });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Upload failed");
      expect(result.current.isUploading).toBe(false);
    });

    it("should handle file reading errors", async () => {
      const { result } = renderHook(() => useArtifactUpload(), {
        wrapper: createWrapper(),
      });

      // Create a file that will fail to read
      const file = new File(["content"], "test.html", {
        type: "text/html",
      });

      // Mock FileReader to throw error
      const originalFileReader = global.FileReader;
      class MockFileReader {
        onerror: ((err: Error) => void) | null = null;
        readAsText() {
          setTimeout(() => {
            this.onerror?.(new Error("Read failed"));
          }, 0);
        }
      }
      global.FileReader = MockFileReader as unknown as typeof FileReader;

      await act(async () => {
        try {
          await result.current.uploadFile({
            file,
            name: "Test",
          });
        } catch {
          // Expected to throw
        }
      });

      global.FileReader = originalFileReader;

      expect(result.current.error).toBeTruthy();
      expect(result.current.isUploading).toBe(false);
    });
  });

  describe("reset functionality", () => {
    it("should reset state after upload", async () => {
      mockMutation.mockResolvedValueOnce({
        artifactId: "id" as unknown,
        versionId: "v1" as unknown,
        number: 1,
        shareToken: "token",
      });

      const { result } = renderHook(() => useArtifactUpload(), {
        wrapper: createWrapper(),
      });

      const file = new File(["<html></html>"], "test.html", {
        type: "text/html",
      });

      await act(async () => {
        await result.current.uploadFile({
          file,
          name: "Test",
        });
      });

      expect(result.current.uploadProgress).toBe(100);

      act(() => {
        result.current.reset();
      });

      expect(result.current.uploadProgress).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.isUploading).toBe(false);
    });

    it("should clear errors on reset", async () => {
      mockMutation.mockRejectedValueOnce(new Error("Upload failed"));

      const { result } = renderHook(() => useArtifactUpload(), {
        wrapper: createWrapper(),
      });

      const file = new File(["<html></html>"], "test.html", {
        type: "text/html",
      });

      await act(async () => {
        try {
          await result.current.uploadFile({
            file,
            name: "Test",
          });
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
