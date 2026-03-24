# Project Guidelines

## Project Values
- Prioritize simplicity over cleverness: choose the easiest-to-understand implementation that satisfies the requirement.
- Keep the site lightweight: avoid adding dependencies, client-side JS, or complexity unless there is clear user value.
- Preserve static-first architecture and content-first authoring flows.
- Favor practical, maintainable solutions over novelty; avoid framework-pattern overengineering.
- Keep visual quality high while staying minimal: polished dark aesthetics without unnecessary UI flourishes.

## Code Style
- Use Biome defaults from `biome.jsonc`: tabs for indentation and double quotes in JavaScript/TypeScript.
- Keep changes minimal and consistent with existing Astro component patterns (`.astro` frontmatter + template + scoped/style files).
- Prefer existing reusable components in `src/components/` (`Card`, `Icon`, `LayoutGrid`, `ImageGlow`, `Navbar`) instead of ad-hoc markup.
- Preserve the current dark visual system and token usage from `src/styles/globals.css`; do not introduce new ad-hoc color systems.

## Architecture
- This is a static Astro site with file-based routes under `src/pages/` and dynamic routes in `src/pages/blog/[post].astro` and `src/pages/projects/[project].astro`.
- Shared page shell is `src/layouts/Layout.astro`; page-level UI is composed from `src/components/`.
- Content is schema-driven in `src/content.config.ts` and loaded from `src/content/` collections (`posts`, `projects`, `tags`, `other`, `quickInfo`, `workExperience`).
- Site-wide config and integrations are in `astro.config.ts`, including a local integration from `package/src/` that exposes `spectre:globals`.

## Build and Test
- Install dependencies with `pnpm install`.
- Main commands:
  - `pnpm dev`
  - `pnpm build` (followed by `postbuild` running Pagefind)
  - `pnpm preview`
  - `pnpm lint`
  - `pnpm lint:fix`
- For type validation, use `pnpm astro check` when type safety changes are involved.

## Conventions
- Focus contributions on code, structure, and UI implementation quality; avoid rewriting article prose unless the task explicitly requests content edits.
- When proposing alternatives, prefer options with lower mental overhead, fewer moving parts, and easier long-term maintenance.
- Keep routing/content patterns aligned with existing collection schemas rather than introducing parallel data shapes.
- When touching styles, follow existing spacing, border, and glow treatment patterns already used in `src/styles/` and component CSS.
- Keep icon usage aligned with the existing `Icon` abstraction and `lucide` / `simple-icons` types.

## Pitfalls
- `pnpm lint` and `pnpm astro check` may currently report known pre-existing issues (see repo memory notes); do not broaden unrelated fixes unless asked.
- Frontmatter images and tag references are schema-validated in content collections; preserve valid paths and tag IDs when modifying MDX metadata.
- Giscus settings come from environment variables in `astro.config.ts`; avoid hardcoding comment config values.

## References
- Project overview and local usage: `README.md`
- Integration internals: `package/README.md`