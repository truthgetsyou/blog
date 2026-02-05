# AGENTS.md

## Design Principles Prompt (from repo owner)

When working on this blog, follow these principles:

1. Simplicity first.
   - Write the minimum code that solves the request.
   - No speculative features, no premature abstractions, no unnecessary configurability.
   - If something feels overengineered, simplify it.

2. Visual style.
   - Keep the design minimal, monotone, clean, and professional.
   - Use one font family across the site; use weights (not extra fonts) for hierarchy.
   - Keep UI chrome subtle and quiet.

3. Layout intent.
   - Sidebar is for folders and outline.
   - Note panel should use available width with only small surrounding spacing.
   - Note panel background should stay white; sidebar panels should be grey.

4. Interaction details.
   - Keep separators visually consistent.
   - If a separator has a larger drag hit area, keep the visible line centered in that area.
   - Folder rows should be fully clickable (not text-only hit targets).
   - Keep collapse behavior predictable (do not auto-expand everything unexpectedly).

5. Controls and icons.
   - Prefer minimal icon usage.
   - Avoid decorative effects like heavy shadows on floating controls.

6. Content model.
   - Markdown notes live in `contents/`.
   - The blog should prioritize markdown reading and navigation clarity.

## Simplicity Guardrails

Use these checks before shipping any change:

- Build only what was asked; stop when the request is solved.
- Prefer direct code over abstractions when logic is single-use.
- Do not add optional configuration unless explicitly requested.
- Do not add fallback paths for scenarios that cannot happen in this app.
- Remove indirection that does not improve readability.
- If a rewrite can make the same behavior meaningfully shorter and clearer, rewrite it.
