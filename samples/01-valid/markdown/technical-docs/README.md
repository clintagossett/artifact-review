# Technical Docs Sample

Multi-file markdown documentation project for testing annotation and navigation.

## Versions

| Version | Files | Changes |
|---------|-------|---------|
| v1 | 4 files (flat) | Initial structure |
| v2 | 5 files (nested) | Restructured with folders |

## Structure Changes (v1 → v2)

```
v1/                              v2/
├── README.md                    ├── README.md (updated TOC)
├── getting-started.md           ├── getting-started.md (minor edits)
├── configuration.md      →      ├── guides/
└── api.md                →      │   └── configuration.md (moved)
                                 └── api/
                                     ├── overview.md (split)
                                     └── endpoints.md (split)
```

## Features

- Table of Contents with anchor links
- Cross-file navigation links
- Code blocks: JavaScript, TypeScript, Python, SQL, Bash, JSON, YAML
- GFM tables
- Mermaid diagrams
- Nested lists

## Usage

Upload `v1.zip` or `v2.zip` to test multi-file markdown artifacts with annotation.
