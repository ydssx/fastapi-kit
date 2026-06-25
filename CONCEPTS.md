# Concepts

> Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Creator domain

### Creator Workbench

The browser SPA served at `/creator/` where authenticated users manage content projects, brand settings, and AI-assisted pipeline steps. Distinct from the admin console at `/admin/`.

### Content Pipeline

A fixed multi-step workflow (e.g. topic → script → publish) that guides one content project from ideation through platform-specific publish checklist. Each project is bound to one pipeline definition.

### Pipeline Step

A single stage inside a content pipeline. Projects track a current step key and advance when the user confirms step output; AI suggestions are scoped per step.

### Inspiration Lab

The pre-pipeline playground where users generate and refine topic ideas from brand context before handing off into a new content project. Uses playground-specific API quotas separate from in-pipeline AI calls.

### Brand Profile

Persistent creator settings (tone, audience, taboos, structure preferences) injected into AI suggestions across the lab and pipeline steps.

### Publish Checklist

The terminal pipeline step variant: per-target-platform tasks the user marks complete before the project status becomes completed.

## Creator UI vocabulary

### Design Tokens

Named CSS custom properties in the creator global stylesheet that define color, type, spacing, and layout variables. Components must consume tokens via `var(--*)` rather than literal hex values.

### Stage Line

A thin horizontal gradient accent at the top of panels and auth cards — the creator UI signature element distinguishing elevated content surfaces from the page background.

### Stage Pipeline Mark

The brand mark graphic: three pipeline stage bars crossed by a horizontal beam with a mint AI highlight at the center — the visual form of Stage Line on the sidebar mark, favicon, and auth surfaces.

### Nav Accent Split

The convention that primary navigation uses coral accent for active states while Inspiration Lab alone uses mint accent, signaling AI-adjacent surfaces consistently from sidebar through playground empty states.

### Studio Sidebar

The desktop navigation pattern for the creator workbench: a fixed left column for wayfinding and account utilities, with the main canvas for page content.

## Flagged ambiguities

- "工作台" in conversation may mean the whole creator SPA or only the projects home; in code and routes, prefer **Creator Workbench** for the app and **content project** for a single pipeline instance.
