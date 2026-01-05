/**
 * Unit tests for MarkdownViewer component
 * Following TDD workflow - write tests first, then implement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MarkdownViewer } from '@/components/artifact/MarkdownViewer';

// Mock fetch for testing
global.fetch = vi.fn();

describe('MarkdownViewer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Markdown Rendering', () => {
    it('should render basic markdown with headings, paragraphs, and lists', async () => {
      const markdown = `# Hello World

This is a paragraph.

- List item 1
- List item 2
- List item 3`;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => markdown,
      });

      render(<MarkdownViewer src="https://example.com/test.md" />);

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Hello World' })).toBeInTheDocument();
      });

      expect(screen.getByText('This is a paragraph.')).toBeInTheDocument();
      expect(screen.getByText('List item 1')).toBeInTheDocument();
      expect(screen.getByText('List item 2')).toBeInTheDocument();
      expect(screen.getByText('List item 3')).toBeInTheDocument();
    });
  });

  describe('GitHub Flavored Markdown (GFM) Features', () => {
    it('should render tables correctly', async () => {
      const markdown = `| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
| Data 3   | Data 4   |`;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => markdown,
      });

      render(<MarkdownViewer src="https://example.com/table.md" />);

      await waitFor(() => {
        expect(screen.getByText('Column 1')).toBeInTheDocument();
      });

      expect(screen.getByText('Column 2')).toBeInTheDocument();
      expect(screen.getByText('Data 1')).toBeInTheDocument();
      expect(screen.getByText('Data 2')).toBeInTheDocument();
      expect(screen.getByText('Data 3')).toBeInTheDocument();
      expect(screen.getByText('Data 4')).toBeInTheDocument();
    });

    it('should render task lists correctly', async () => {
      const markdown = `- [x] Completed task
- [ ] Incomplete task
- [x] Another completed task`;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => markdown,
      });

      render(<MarkdownViewer src="https://example.com/tasks.md" />);

      await waitFor(() => {
        expect(screen.getByText('Completed task')).toBeInTheDocument();
      });

      // Check for checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
      expect(checkboxes[2]).toBeChecked();
    });

    it('should render strikethrough text correctly', async () => {
      const markdown = '~~This text is crossed out~~';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => markdown,
      });

      render(<MarkdownViewer src="https://example.com/strike.md" />);

      await waitFor(() => {
        const element = screen.getByText('This text is crossed out');
        expect(element.tagName).toBe('DEL');
      });
    });
  });

  describe('Code Blocks', () => {
    it('should render inline code correctly', async () => {
      const markdown = 'This has `inline code` in it.';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => markdown,
      });

      render(<MarkdownViewer src="https://example.com/inline.md" />);

      await waitFor(() => {
        const codeElement = screen.getByText('inline code');
        expect(codeElement.tagName).toBe('CODE');
      });
    });

    it('should render fenced code blocks correctly', async () => {
      const markdown = `\`\`\`javascript
function hello() {
  console.log("Hello, world!");
}
\`\`\``;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => markdown,
      });

      render(<MarkdownViewer src="https://example.com/code.md" />);

      await waitFor(() => {
        expect(screen.getByText(/function hello/)).toBeInTheDocument();
      });

      expect(screen.getByText(/console\.log/)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton when isLoading is true', () => {
      render(<MarkdownViewer src="https://example.com/test.md" isLoading={true} />);

      // Check for loading skeleton (similar to ArtifactFrame)
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show loading state while fetching content', async () => {
      (global.fetch as any).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  text: async () => '# Test',
                }),
              100
            )
          )
      );

      render(<MarkdownViewer src="https://example.com/test.md" />);

      // Should show loading initially
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should show error message when fetch fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      render(<MarkdownViewer src="https://example.com/missing.md" />);

      await waitFor(() => {
        const errorElements = screen.getAllByText(/failed to load/i);
        expect(errorElements.length).toBeGreaterThan(0);
        expect(errorElements[0]).toBeInTheDocument();
      });
    });

    it('should show error message when network error occurs', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(<MarkdownViewer src="https://example.com/test.md" />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe('Content Fetching', () => {
    it('should fetch content from the provided src URL', async () => {
      const testUrl = 'https://example.com/test.md';
      const markdown = '# Test Content';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => markdown,
      });

      render(<MarkdownViewer src={testUrl} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(testUrl);
      });
    });

    it('should re-fetch content when src changes', async () => {
      const markdown1 = '# First Content';
      const markdown2 = '# Second Content';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => markdown1,
      });

      const { rerender } = render(<MarkdownViewer src="https://example.com/first.md" />);

      await waitFor(() => {
        expect(screen.getByText('First Content')).toBeInTheDocument();
      });

      // Change src
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => markdown2,
      });

      rerender(<MarkdownViewer src="https://example.com/second.md" />);

      await waitFor(() => {
        expect(screen.getByText('Second Content')).toBeInTheDocument();
      });
    });
  });

  describe('Styling', () => {
    it('should apply prose classes for styling', async () => {
      const markdown = '# Test';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => markdown,
      });

      const { container } = render(<MarkdownViewer src="https://example.com/test.md" />);

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });

      // Check for prose class
      const proseElement = container.querySelector('.prose');
      expect(proseElement).toBeInTheDocument();
    });

    it('should apply custom className when provided', async () => {
      const markdown = '# Test';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => markdown,
      });

      const { container } = render(
        <MarkdownViewer src="https://example.com/test.md" className="custom-class" />
      );

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });

      const customElement = container.querySelector('.custom-class');
      expect(customElement).toBeInTheDocument();
    });
  });
});
