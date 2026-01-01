import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { VersionSwitcher } from '@/components/artifact/VersionSwitcher';

describe('VersionSwitcher', () => {
  const mockVersions = [
    { number: 3, createdAt: Date.now(), isLatest: true },
    { number: 2, createdAt: Date.now() - 86400000, isLatest: false },
    { number: 1, createdAt: Date.now() - 172800000, isLatest: false },
  ];

  it('displays "Latest" badge for the latest version', () => {
    render(
      <VersionSwitcher
        currentVersion={3}
        versions={mockVersions}
        onVersionChange={() => {}}
      />
    );

    // Open dropdown
    const combobox = screen.getByRole('combobox');
    combobox.click();

    // Check for Latest label on v3
    expect(screen.getByText(/v3.*Latest/i)).toBeInTheDocument();
  });

  it('displays date for non-latest versions', () => {
    render(
      <VersionSwitcher
        currentVersion={3}
        versions={mockVersions}
        onVersionChange={() => {}}
      />
    );

    // Open dropdown
    const combobox = screen.getByRole('combobox');
    combobox.click();

    // v2 should show date, not "Latest"
    const options = screen.getAllByRole('option');
    const v2Option = options.find(opt => opt.textContent?.includes('v2'));
    expect(v2Option).toBeDefined();
    expect(v2Option?.textContent).not.toMatch(/Latest/);
  });
});
