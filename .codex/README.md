# Codex Local Assets

This folder contains the Codex-compatible version of the previous `.claude` setup.

## Agents

- `agents/fitness-coach.md`: training, hypertrophy, cardio, technique, and injury-aware exercise substitutions.
- `agents/nutrition-recomp-coach.md`: calories, macros, meal planning, supplementation, recomposition, refeeds, and diet breaks.
- `agents/abogado-del-diablo.md`: scientific adversarial review of fitness and nutrition claims.

Agent frontmatter is intentionally short (`name` and `description` only) to keep Codex loading stable.

## Skills

Skills live in `skills/<skill-name>/SKILL.md`. Their `description:` fields are short on purpose; detailed instructions remain in each file body.

## Agent Memory

The migrated Claude project memory lives in `agent-memory/`. Treat it as repo-local context for these profiles. Do not store secrets or transient task state there.
