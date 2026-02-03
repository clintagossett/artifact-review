# Pricing Landscape Analysis (2026)

**Status:** Validated Research
**Last Updated:** January 2026

This document captures market pricing data to validate the [Pricing Strategy](../design/pricing-and-packaging.md).

## Executive Summary

1.  **Markup.io Opportunity:** A direct competitor removed their free tier and raised pricing to ~$79/mo. This creates a massive opening for our $12/mo Pro tier.
2.  **The "Reviewer Tax":** Most niche review tools (Filestage, GoVisually) charge for reviewers or have high per-user costs ($20+). General tools (Notion, Linear) do not. We align with general tools.
3.  **Git-Sync Threat:** Netlify/Vercel dominate the "Git Sync" workflow with free/cheap reviewer models. We compete best on "Ad-Hoc" artifacts (no repo required).

## Competitive Matrix

| Platform | Free Tier | Pro / Individual | Team / Business | Pricing Model Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Artifact Review** | **3 active docs** | **$12/user** | **$18/user** | **Proposed Strategy** |
| **Notion** | Unlimited blocks | $10/user | $18/user | Benchmark for "Daily Driver" tools. |
| **Figma** | 3 files | $12/user | $45/user | Complex seat types (Dev vs Design). |
| **Linear** | 250 issues | $8/user | $12/user | Benchmark for "Simple, High Quality". |
| **Slack** | 90 days history | $7.25/user | $12.50/user | The "Floor" for SaaS pricing. |
| **Markup.io** | ❌ **Removed** | **$79/month** | Custom | **MAJOR OUTLIER.** Pivot to Enterprise. |
| **Filestage** | 2 projects | ~$59/month | ~$179/month | Expensive for individuals. |
| **GoVisually** | ❌ Trial only | $20/user | $40/user | 3-user minimum on Pro. |

## "Git Sync" Competitors (DX Platforms)

For users who want to "sync a repo to get comments", we compete with Deployment Platforms.

| Platform | Git Sync | Commenting Features | Threat Level |
| :--- | :--- | :--- | :--- |
| **Netlify** | ✅ Native | **Excellent** (Drawer, Video, Screenshots) | **CRITICAL** (Unlimited free reviewers) |
| **Vercel** | ✅ Native | **Good** (Toolbar overlay) | **HIGH** (Standard for Next.js) |
| **GitBook** | ✅ Native | **Excellent** (Change Requests) | **HIGH** (For Docs/Markdown) |
| **CloudCannon** | ✅ Native | ❌ None (Third-party) | **LOW** (CMS focused) |

**Strategic Implication:**
If we build "Git Sync", we compete directly with Netlify/Vercel.
If we focus on "Drag & Drop" / "Ad-Hoc Uploads", we own the niche of "Quick Artifacts" where setting up a CI/CD pipeline is overkill.

## User Experience & Sentiment (Reddit/Forum Analysis)

**The "Best Commenting Experience" Benchmark:**
*   **Netlify Drawer:** Widely praised for **rich media** (video recording, screenshots with metadata). The "Reviewer" role is frictionless.
*   **Vercel Comments:** Considered "good enough" for dev teams but **high friction for clients** (requires Vercel account).
*   **Pastel / BugHerd:** The "Gold Standard" for agency/client review. Loved because **clients don't need to log in**.

**Key Takeaway:**
To win on "Feedback", we must match the **frictionless access** of Pastel/Netlify (no login for reviewers) vs the "Login Wall" of Vercel/Figma.

## AI-Readability Gap (The "Blue Ocean")

**The Problem:** Existing tools (Markup.io/Pastel) optimize for humans (screenshots, XY coordinates). This is useless for AI agents trying to refactor code.
**The "W3Schools" Targeting Model:**
*   AI Agents need **DOM Selectors** (e.g., `#hero-section > h1`), not "pixel 400,200".
*   **Competitor Status:**
    *   **Hypothesis:** Uses W3C Web Annotation standards (Selectors). Good model, but academic UI.
    *   **Markup.io:** Exports JSON, but data is pixel-based/visual.
    *   **Pastel:** Exports CSV, but focus is visual.

**Strategic Opportunity:**
Artifact Review becomes the **only tool** that gives AI agents "Machine-Readable Feedback" (Selectors + Text) natively. This is our "Killer Feature" for the AI era.

## Market Trends 2025

1.  **Seat Complexity:** Figma and others are splitting seats into "Full" vs "Lite" vs "Dev".
    *   *Our Counter:* Simple seats. Creator pays, Reviewer free.
2.  **AI Premiums:** Notion/others charging +$10/mo for AI.
    *   *Our Counter:* AI workflow is the *core* product, not an add-on.
3.  **Minimums:** 3-seat minimums becoming standard for "Team" plans to prevent abuse of group features.
