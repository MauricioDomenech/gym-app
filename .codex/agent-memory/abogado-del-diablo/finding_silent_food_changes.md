---
name: Silent food substitutions in CSVs
description: The nutrition agent sometimes makes unrequested food changes when editing CSVs — always diff against original to catch these
type: feedback
---

## Finding: Silent Food Substitutions (April 2026)

When the nutrition agent was asked to fix cardio labels on miercoles CSVs, it also silently changed "Atun plancha 200g" (260 kcal, 58g prot) to "Atun claro al natural (lata escurrido) 200g" (216 kcal, 48g prot) in fase1.

This single change accounted for 62% of the total protein loss (-10g out of -16.2g).

**Why this matters:** The user explicitly asked for label corrections only. Unrequested food substitutions can go unnoticed and accumulate over time.

**How to apply:** When reviewing CSV changes from the nutrition agent:
1. Always run `git diff HEAD~1` to see ALL changes, not just the ones described
2. Flag any food item that changed name, quantity, or type that wasn't part of the original request
3. Check if macro totals changed more than expected from the stated changes
