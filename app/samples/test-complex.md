# Comprehensive Test Document

## Introduction
This document serves as a robust test case for the annotation system. It includes various Markdown elements to verify text selection, highlighting behavior, and layout reflow.

### Text Formatting
Here is a paragraph with **bold text**, *italicized text*, and `inline code`. We need to ensure that selections spanning these different formatting styles are handled correctly by the underlying range matching logic.

## Lists

### Unordered List
*   Item 1: Simple text
*   Item 2: A longer item that might wrap to the next line depending on the viewport width, testing the multiline highlight capability.
*   Item 3: Nested content
    *   Sub-item A
    *   Sub-item B

### Ordered List
1.  First step in the process
2.  Second step involves analyzing the layout behavior when the sidebar is toggled.
3.  Third step confirms that sticky highlights remain attached to their text nodes.

## Complex Layouts

> This is a blockquote. Annotations inside blockquotes should render correctly and not bleed outside the container.

Here is a code block:
```typescript
function test() {
  console.log("Hello World");
}
```

## Conclusion
Final paragraph to test the bottom of the document. Ensuring that the overlay layer covers the entire scrollable height is crucial for complete coverage.
