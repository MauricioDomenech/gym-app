---
name: Domingo also has incorrect cardio labels
description: Sunday CSVs across all phases have pre-cardio/post-cardio labels but plan_definicion.json shows domingo cardio is null
type: project
---

## Finding: Domingo Has Same Problem as Miercoles (April 2026)

When miercoles was corrected for having "pre-cardio" and "post-cardio" labels despite having no cardio assigned, the same issue was NOT detected for domingo.

**Evidence:**
- `plan_definicion.json` line 482: `"domingo": null`
- All 4 domingo CSVs (fase1, fase2, fase3, diet_break) have "Snack pre-cardio" and "Post-cardio" entries

**Also potentially affected:** Sabado has HIIT marked as `"opcional": true` — if the user doesn't always do it, the labels may also be misleading.

**Why:** The nutrition agent only fixed the specific day mentioned (miercoles) without checking for the same pattern across all days.

**How to apply:** When a systemic labeling issue is found, always check ALL days/phases for the same pattern before declaring it fixed.
