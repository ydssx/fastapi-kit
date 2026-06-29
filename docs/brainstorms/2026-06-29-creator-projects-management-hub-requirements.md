---
date: 2026-06-29
topic: creator-projects-management-hub
---

# Creator Projects Management Hub Requirements

## Summary

Upgrade the Creator Workbench projects page into a publish sprint hub. The page should prioritize content projects closest to publishing, make the next action obvious, and keep new project creation available without letting it dominate the page.

---

## Problem Frame

The current projects page has the right building blocks: a new project form, active and completed project sections, project cards with progress, platform chips, update time, status, delete, and publish progress summaries. It still reads like a list plus a creation form, which makes the area feel thin when a creator returns to continue work.

The user-facing gap is project management, not raw capability. A creator should be able to open the page and immediately know which content project is closest to a publishable outcome and what to do next.

---

## Key Decisions

- **Prioritize closest-to-publish over recency.** The main recommendation should favor projects nearest the Publish Checklist because the desired outcome is completed content, not chronological browsing.
- **Use a publish sprint structure.** Grouping by distance to publishing creates a stronger management center than adding one recommended card above the existing list.
- **Demote creation without hiding it.** New project creation remains part of the page, but the first-read experience shifts toward continuing and completing existing work.

---

## Requirements

**Publish Sprint Overview**

- R1. The projects page must surface a primary publish sprint area for active content projects closest to completion.
- R2. The primary sprint area must show each highlighted project's current Pipeline Step, progress toward the Publish Checklist, target platforms, and next action.
- R3. The page must make the top recommended action reachable with one clear continuation CTA.
- R4. Projects already on the Publish Checklist must use publish progress language instead of generic in-progress language.

**Project Organization**

- R5. Active projects must be organized by publish readiness before falling back to general active browsing.
- R6. Projects far from publishing must remain accessible without competing visually with publish-ready projects.
- R7. Stalled or older projects may be called out only when that helps the creator decide what to continue next.
- R8. Completed projects must remain available as lightweight history, not as the primary page focus.

**Creation and Handoff**

- R9. New project creation must stay available from the projects page.
- R10. The creation area should be visually secondary to the continuation surface when active projects exist.
- R11. The Inspiration Lab entry must remain available for creators who do not yet have a concrete topic.
- R12. Empty state behavior must still guide first-time users toward either creating a project or using the Inspiration Lab.

**Creator Workbench Fit**

- R13. The redesign must preserve the Creator Workbench's studio sidebar mental model and Creator UI vocabulary.
- R14. The projects page must use existing Design Tokens, Stage Line treatment, and the coral user-action versus mint AI-adjacent accent split.
- R15. The page must avoid introducing dashboard, board, or analytics navigation expectations that the product does not intend to support in this scope.

---

## Key Flows

- F1. Returning creator continues near-publish work.
  - **Trigger:** A creator opens the projects page with one or more active content projects.
  - **Steps:** The page ranks active projects by closeness to publishing, highlights the strongest candidate, shows the next Pipeline Step or Publish Checklist action, and offers a continuation CTA.
  - **Outcome:** The creator can resume the most output-ready project without scanning the full list.
  - **Covered by:** R1, R2, R3, R5

- F2. Creator reviews non-sprint projects.
  - **Trigger:** The creator wants a project that is not in the publish sprint area.
  - **Steps:** The creator scans the secondary active project area, sees enough progress and platform context to identify the project, and opens it from the card.
  - **Outcome:** Lower-readiness projects remain findable while the page still emphasizes completion.
  - **Covered by:** R5, R6, R7

- F3. Creator starts something new.
  - **Trigger:** The creator has no suitable active project to continue or arrives with a new topic.
  - **Steps:** The creator uses the secondary creation surface or chooses the Inspiration Lab entry when the topic is not yet formed.
  - **Outcome:** Creation stays available without weakening the page's continuation-first purpose.
  - **Covered by:** R9, R10, R11, R12

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3.** Given a creator has multiple active projects and one is on step 6 of 7, when they open the projects page, then that project appears in the publish sprint area with a clear next action to continue.
- AE2. **Covers R4.** Given a project is on the Publish Checklist, when it appears in the sprint area or a project card, then the status copy reflects platform publish progress rather than a generic in-progress badge.
- AE3. **Covers R6, R8.** Given a creator has early-stage and completed projects, when they scan the page, then early-stage projects and completed history remain accessible but do not outrank near-publish work.
- AE4. **Covers R10.** Given a creator has active projects, when they open the projects page, then the new project form is secondary.
- AE5. **Covers R12.** Given no active projects exist, when the creator opens the projects page, then the empty state can lead with project creation and Inspiration Lab guidance.

---

## Success Criteria

- Creators can identify the most publish-ready active project without reading every card.
- Internal review no longer describes the projects area as a generic list or simple CRUD surface.
- The redesign increases perceived project management depth without adding dashboard, kanban, or analytics expectations.

---

## Scope Boundaries

- No drag-and-drop board, kanban workflow, or multi-level project navigation.
- No analytics dashboard, performance metrics, creator content calendar, or platform API publishing.
- No automatic project prioritization based on external platform data.
- No new project lifecycle states unless planning determines an existing state cannot express publish readiness.
- No replacement of the Inspiration Lab; it remains a pre-pipeline helper.

---

## Dependencies / Assumptions

- Active content projects already expose enough local signals to rank publish readiness: current Pipeline Step, completed status, target platforms, updated time, and Publish Checklist progress.
- Publish readiness can be expressed from existing workflow progress unless planning finds a missing data contract.
- The Creator Workbench remains a fixed-pipeline product, not a general project management suite.

---

## Sources / Research

- `CONCEPTS.md` defines Creator Workbench, Content Pipeline, Pipeline Step, Inspiration Lab, Publish Checklist, and Creator UI vocabulary.
- `docs/superpowers/specs/2026-06-11-creator-product-prototype-design.md` defines the projects entry as list, new project creation, progress, and publish status overview while excluding dashboards, kanban, and multi-level navigation.
- `docs/solutions/design-patterns/creator-workspace-ui-redesign-studio-sidebar.md` records the current Creator Workbench visual direction and project page polish pattern.
- `creator/src/pages/ProjectsPage.tsx` currently separates active and completed projects and includes the new project surface.
- `creator/src/components/ProjectCard.tsx` currently renders project title, pipeline and step metadata, platform chips, progress, status, update time, detail navigation, and delete.
- `creator/src/types/api.ts` and `app/schemas/creator.py` show the project and publish progress fields available to the frontend.
