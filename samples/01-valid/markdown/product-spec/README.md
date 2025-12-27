# Product Spec Markdown Sample - Multi-Version Artifact

## Purpose

This sample demonstrates **artifact versioning with markdown documents** - common for AI-generated documentation, specs, and technical writing.

## What This Tests

- **Version comparison UI:** All 5 versions have the same base title but different version numbers
- **Markdown rendering:** GitHub-flavored markdown with code blocks, tables, and task lists
- **Version identification:** H1 and version metadata clearly show v1 through v5
- **Real-world use case:** Mimics AI-generated product specs, API docs, and technical documentation

## Structure

```
product-spec/
├── README.md              # This file
└── v1.md → v5.md          # 5 versions of the same document
```

## For AI Agents

**When testing artifact upload:**
1. Upload each `.md` file directly (no ZIP needed)
2. Upload them as separate versions of the same artifact
3. Verify the H1 heading displays the correct version when rendered
4. Test version comparison between any two versions

**File paths for upload:**
- `samples/01-valid/markdown/product-spec/v1.md`
- `samples/01-valid/markdown/product-spec/v2.md`
- `samples/01-valid/markdown/product-spec/v3.md`
- `samples/01-valid/markdown/product-spec/v4.md`
- `samples/01-valid/markdown/product-spec/v5.md`

**When modifying samples:**
1. Edit the version files directly (`v1.md` through `v5.md`)
2. Ensure H1 format remains: `# Product Specification: Dashboard Component v#`
3. Update version metadata: `**Version:** #.0`
4. Keep all versions identical except for version numbers

## Expected Behavior

### Upload & Storage
- ✅ Upload as single markdown file
- ✅ Store directly in `markdownContent` field
- ✅ No warnings (all external links are allowed)

### Rendering
- ✅ GitHub-flavored markdown rendering
- ✅ Code blocks with syntax highlighting (TypeScript, JavaScript)
- ✅ Tables render correctly
- ✅ Task lists are interactive (if supported)
- ✅ H1 and metadata clearly show version number

### Version Comparison
- ✅ User can select any two versions to compare
- ✅ Version numbers visible in rendered previews
- ✅ Testers can easily identify which version they're viewing

## File Details

| Version | Size | H1 Title | Metadata Version |
|---------|------|----------|------------------|
| v1 | 1.9 KB | Product Specification: Dashboard Component v1 | 1.0 |
| v2 | 1.9 KB | Product Specification: Dashboard Component v2 | 2.0 |
| v3 | 1.9 KB | Product Specification: Dashboard Component v3 | 3.0 |
| v4 | 1.9 KB | Product Specification: Dashboard Component v4 | 4.0 |
| v5 | 1.9 KB | Product Specification: Dashboard Component v5 | 5.0 |

## Content Features

**All versions contain:**
- H1 heading with version number
- Version metadata (Version, Author, Date)
- Overview section
- Feature descriptions
- TypeScript code blocks with interfaces
- JavaScript code examples
- Configuration table
- Implementation checklist (task list)
- External resource links
- Notes section

**Dependencies:**
- External links to Chart.js docs (allowed)
- External links to React TypeScript Cheatsheet (allowed)
- NO local file references

## Common Issues

**Version Not Showing:**
- Check H1 tag: `# Product Specification: Dashboard Component v#`
- Check metadata: `**Version:** #.0`
- Verify you uploaded the correct version file

**Code Blocks Not Highlighting:**
- Ensure language specifier is present (```typescript, ```javascript)
- Check markdown renderer supports syntax highlighting

---

**Last Updated:** 2025-12-27
**Related Task:** #15 - Fix ZIP artifact viewing
