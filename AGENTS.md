# Repository Guidelines

## Project Structure & Module Organization

This is a Vite + React + TypeScript gym tracking app. Main code lives in `src/`, with `src/App.tsx` selecting the active phase. Phase-specific code is grouped under `src/phases/definicion`, `src/phases/maintenance`, and `src/phases/volume`; keep new phase features inside the matching folder. Shared UI, services, and types belong in `src/shared/`, while global contexts live in `src/contexts/`.

Static workout and nutrition data lives in `src/assets/data/`. Exercise images are in `public/images/`. Supabase and database work is split between `src/shared/services/`, `api/database.ts`, and SQL files in `database/`.

## Build, Test, and Development Commands

- `npm run dev`: start the Vite development server.
- `npm run server`: run the local Express server from `server.js`.
- `npm run dev:full`: run Express and Vite together.
- `npm run build`: type-check with `tsc -b` and create the production Vite build.
- `npm run build:api`: type-check the API project with `tsconfig.api.json`.
- `npm run lint`: run ESLint.
- `npm run sync-data`: synchronize local data with `sync-data.js`.
- `npm run build:sync`: synchronize data, then build the app.

## Coding Style & Naming Conventions

Use TypeScript and React functional components. Components use PascalCase, for example `PhaseSelector.tsx`; hooks use `useSomething`; services use camelCase filenames such as `databaseService.ts`. Prefer phase-local types, services, and utilities before adding shared abstractions.

The codebase uses semicolons and two-space JSX indentation. Keep imports explicit and relative to the owning module unless an existing alias is already in use. Run `npm run lint` before handing off changes.

## Testing Guidelines

No automated test runner is configured yet. For now, validate changes with `npm run lint`, `npm run build`, and focused manual checks in the relevant phase. If adding tests, colocate them near the code under test as `*.test.ts` or `*.test.tsx`, and add the npm script in `package.json`.

## Commit & Pull Request Guidelines

Recent commits use short Spanish summaries such as `Correcciones`, `Mejoras`, and `Actualización semanal`. Keep messages concise and action-oriented; include the affected phase when helpful, for example `Definicion: corregir pesos diarios`.

Pull requests should include a brief description, touched phase or data files, verification commands, and screenshots for visible UI changes. Link relevant issues or notes, and call out database migrations or environment changes.

## Security & Configuration Tips

Do not commit secrets or Supabase credentials. Keep environment values in local `.env` files or deployment settings. Review SQL in `database/` before applying it, and document migration order in the PR.

## Codex Agents & Skills

Use the repo-local Codex assets migrated from `.claude`:

- `.codex/agents/fitness-coach.md`: training, hypertrophy, cardio, technique, injuries, deloads, and routine design.
- `.codex/agents/nutrition-recomp-coach.md`: calories, macros, meal plans, supplementation, body recomposition, refeeds, diet breaks, and progress analysis.
- `.codex/agents/abogado-del-diablo.md`: adversarial scientific review for fitness and nutrition claims. Use it after significant recommendations from the other two agents.
- `.codex/skills/*/SKILL.md`: domain procedures used by those agents. Keep `description:` frontmatter short to avoid Codex skill-loading budget issues.
- `.codex/agent-memory/`: migrated project memory from Claude. Treat it as project context; update only when explicitly useful and never store secrets.

Default to Spanish for user-facing responses in this repository.

After changing `.codex/agents` or `.codex/skills`, restart the Codex session so updated metadata and instructions are reloaded.
