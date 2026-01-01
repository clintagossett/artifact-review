/**
 * Tests for file type helpers (Step 1)
 * Location: convex/lib/fileTypes.ts
 */

import { describe, it, expect } from "vitest";
import {
  SUPPORTED_SINGLE_FILE_TYPES,
  SUPPORTED_FILE_TYPES,
  isValidFileType,
  isSingleFileType,
  getDefaultFilePath,
  getMimeType,
  MAX_SINGLE_FILE_SIZE,
  MAX_VERSION_NAME_LENGTH,
} from "../../../../../../app/convex/lib/fileTypes";

describe("fileTypes helpers", () => {
  describe("constants", () => {
    it("should export SUPPORTED_SINGLE_FILE_TYPES array", () => {
      expect(SUPPORTED_SINGLE_FILE_TYPES).toEqual(["html", "markdown"]);
    });

    it("should export SUPPORTED_FILE_TYPES array", () => {
      expect(SUPPORTED_FILE_TYPES).toEqual(["html", "markdown", "zip"]);
    });

    it("should export MAX_SINGLE_FILE_SIZE constant", () => {
      expect(MAX_SINGLE_FILE_SIZE).toBe(5 * 1024 * 1024);
    });

    it("should export MAX_VERSION_NAME_LENGTH constant", () => {
      expect(MAX_VERSION_NAME_LENGTH).toBe(100);
    });
  });

  describe("isValidFileType", () => {
    it("returns true for 'html'", () => {
      expect(isValidFileType("html")).toBe(true);
    });

    it("returns true for 'markdown'", () => {
      expect(isValidFileType("markdown")).toBe(true);
    });

    it("returns true for 'zip'", () => {
      expect(isValidFileType("zip")).toBe(true);
    });

    it("returns false for 'pdf'", () => {
      expect(isValidFileType("pdf")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidFileType("")).toBe(false);
    });

    it("returns false for unknown type", () => {
      expect(isValidFileType("docx")).toBe(false);
    });
  });

  describe("isSingleFileType", () => {
    it("returns true for 'html'", () => {
      expect(isSingleFileType("html")).toBe(true);
    });

    it("returns true for 'markdown'", () => {
      expect(isSingleFileType("markdown")).toBe(true);
    });

    it("returns false for 'zip'", () => {
      expect(isSingleFileType("zip")).toBe(false);
    });

    it("returns false for 'pdf'", () => {
      expect(isSingleFileType("pdf")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isSingleFileType("")).toBe(false);
    });
  });

  describe("getDefaultFilePath", () => {
    it("returns 'index.html' for html", () => {
      expect(getDefaultFilePath("html")).toBe("index.html");
    });

    it("returns 'README.md' for markdown", () => {
      expect(getDefaultFilePath("markdown")).toBe("README.md");
    });

    it("returns 'index.html' for zip", () => {
      expect(getDefaultFilePath("zip")).toBe("index.html");
    });

    it("returns 'content' for unknown type", () => {
      expect(getDefaultFilePath("unknown")).toBe("content");
    });
  });

  describe("getMimeType", () => {
    it("returns 'text/html' for html", () => {
      expect(getMimeType("html")).toBe("text/html");
    });

    it("returns 'text/markdown' for markdown", () => {
      expect(getMimeType("markdown")).toBe("text/markdown");
    });

    it("returns 'application/zip' for zip", () => {
      expect(getMimeType("zip")).toBe("application/zip");
    });

    it("returns 'application/octet-stream' for unknown type", () => {
      expect(getMimeType("unknown")).toBe("application/octet-stream");
    });
  });
});
