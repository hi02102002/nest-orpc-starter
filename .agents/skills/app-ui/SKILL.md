---

name: app-ui
description: "UI conventions for apps/web (antd + Tailwind, Vietnamese UI). Use this skill whenever a task adds or changes any screen, form, field, table/list page, modal, confirm dialog, toast/message, empty/error state, or date/money formatting in apps/web, even a single input. It routes to small sub-skills (forms, tables, modals, feedback, formatting) that every page must follow so the UI stays consistent: required fields show a red asterisk, every input has a placeholder, list pages share one layout with column hiding and 'Bỏ lọc'."
---

# App UI

Rules for every screen in `apps/web`. Read this page, then **only the sub-skill(s) the task touches**:

| Task touches                                                                | Read                                                 |
| --------------------------------------------------------------------------- | ---------------------------------------------------- |
| Any form or input (create/edit modal, login, settings, filters with inputs) | [references/forms.md](references/forms.md)           |
| A page whose main content is a table / list                                 | [references/tables.md](references/tables.md)         |
| A modal, drawer or confirm step                                             | [references/modals.md](references/modals.md)         |
| Success/error toasts, loading, empty and error states                       | [references/feedback.md](references/feedback.md)     |
| Showing dates, money, numbers, statuses                                     | [references/formatting.md](references/formatting.md) |

For antd API details use the `antd` / `ant-design` skills; this skill only says **how this app uses them**.

## Rules for every screen

- **Vietnamese UI text**, sentence case: "Thêm người dùng", "Lưu", "Huỷ", "Xoá". Code, keys and comments stay English.
- **antd first, Tailwind for layout.** Use antd components for controls and feedback; use Tailwind classes only for spacing/sizing/layout (`w-44`, `max-w-md`, `m-0!`). Don't restyle antd internals with arbitrary colors.
- **Icons:** `lucide-react`, `size={16}` in buttons (`14` in `size="small"` buttons). No `@ant-design/icons`.
- **Shared components before new ones:** `src/components/form/*`, `src/components/data-table/*`, `src/components/error-pages.tsx`. If a shared component can't do something, extend it instead of copying its markup into a page.
- **Placement:** page-only pieces next to the route in `_components/` and `_hooks/`; shared ones in `src/features/<feature>/` or `src/components/` (see AGENTS.md "Web code placement").
- **Theme:** colors, radius and font come from the antd theme in `src/components/antd-provider.tsx` (font: Inter via `--font-sans` in `src/index.css`). Don't hard-code fonts or brand colors in pages.

## Before finishing

- [ ] Followed every sub-skill the task touched
- [ ] `pnpm --filter web check-types` and `pnpm exec biome check apps/web` pass
