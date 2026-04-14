# Gyoza - Astro Blog Template

## Project Overview

Astro 4.6 static blog with React, Tailwind CSS, Jotai state, Framer Motion animations, and Swup page transitions. Chinese-language blog theme.

## Critical Commands

```bash
pnpm dev      # Dev server at localhost:4321
pnpm build    # astro check && astro build && pagefind --site dist
pnpm preview  # Preview production build
pnpm lint     # Format with Prettier (also runs on pre-commit)
pnpm new-post     # Scaffold new blog post (interactive)
pnpm new-friend   # Scaffold new friend link (interactive)
pnpm new-project  # Scaffold new project entry (interactive)
```

## Site Configuration

**All site config lives in `src/config.json`** — not package.json or environment variables.

Config sections: `site`, `author`, `hero`, `color`, `menus`, `posts`, `footer`, `waline`, `sponsor`, `analytics`

## Architecture

### Directory Structure
- `src/pages/` — Astro file-based routing (index, archives, posts/[...slug], rss.xml, etc.)
- `src/components/` — React/Astro UI components (header/, footer/, post/, comment/, provider/, ui/)
- `src/layouts/` — Layout.astro (base), PageLayout.astro, MarkdownLayout.astro
- `src/content/` — Astro content collections with config at `src/content/config.ts`
  - `posts/` — Blog post markdown files
  - `projects/` — Project showcase (YAML)
  - `friends/` — Friend links (YAML)
  - `spec/` — Documentation pages (markdown)
- `src/plugins/` — Custom remark/rehype plugins (reading time, spoilers, embeds, code highlighting, etc.)
- `src/store/` — Jotai atoms for global state
- `src/hooks/` — Custom React hooks
- `src/styles/` — Global CSS

### Tech Stack
- **Astro** 4.6 (static site generation)
- **React** 18 (interactive islands)
- **Tailwind CSS** 3.4 (dark mode via `selector: [data-theme="dark"]`)
- **Jotai** 2.x (state management)
- **Framer Motion** 11.x (animations)
- **Swup** (@swup/astro) for page transitions
- **Waline** 3.x for comments
- **Pagefind** for search index (runs post-build)
- **Shiki** for syntax highlighting (via @shikijs/rehype)
- **KaTeX** for math rendering

## Build Pipeline

`astro check` (type check) → `astro build` → `pagefind --site dist` (search index)

The `pagefind` step generates search at `dist/pagefind/`. Vite config marks `/pagefind/pagefind.js` as external.

## Content Schema

Posts schema includes: `title`, `date`, `lastMod`, `summary`, `cover`, `category`, `tags[]`, `comments`, `draft`, `sticky`

Post filename format: `slug.md` (kebab-case validated via `/^[a-z0-9]+(-[a-z0-9]+)*$/`)

## Git Hooks

- **commit-msg**: `commitlint --edit $1` (conventional commits)
- **pre-commit**: `lint-staged` → prettier --write on `*.{js,jsx,ts,tsx,astro,md,css,json}`

## Prettier Config

- Print width: 100
- No semicolons
- Single quotes
- `prettier-plugin-astro` for .astro files

## Path Aliases

`@/*` maps to `src/*` (configured in tsconfig.json paths)

## Adding Content

```bash
pnpm new-post     # Creates src/content/posts/{slug}.md with frontmatter
pnpm new-friend   # Creates src/content/friends/{name}.yaml
pnpm new-project  # Creates src/content/projects/{slug}.yaml
```

Filename validation: lowercase alphanumeric + single hyphens only.

## Dark Mode

Dark mode toggles `data-theme="dark"` on `<html>`. Theme state managed via Jotai atom in `src/store/theme.ts`.

## Custom Plugins

All registered in `astro.config.js`:
- remark: `remarkMath`, `remarkDirective`, `remarkEmbed`, `remarkSpoiler`, `remarkReadingTime`
- rehype: `rehypeHeadingIds`, `rehypeKatex`, `rehypeLink`, `rehypeImage`, `rehypeHeading`, `rehypeCodeBlock`, `rehypeCodeHighlight`, `rehypeTableBlock`
