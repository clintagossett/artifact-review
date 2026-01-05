/**
 * Simple import test to verify react-markdown and remark-gfm packages work
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// This file just needs to compile without errors
// If imports work, the packages are installed correctly

export const testImports = () => {
  console.log('Imports successful:', {
    ReactMarkdown: typeof ReactMarkdown,
    remarkGfm: typeof remarkGfm,
  });
};
