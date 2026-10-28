# Table pages

Every list page uses the same shared building blocks so pages don't drift. Reference implementation: `apps/web/src/routes/_authed/admin/users/index.tsx`.

## Building blocks (`src/components/data-table/`)

| Component / hook                         | Use                                                                                                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ListPage`                               | Page shell. Props: `title`, `actions`, `filters`, `onResetFilters`, `filtersActive`, `children` (the table).                                                                                  |
| `useColumnVisibility(tableKey, columns)` | Returns `{ visibleColumns, visibility }`. Hidden keys persist in localStorage as `table:<tableKey>:hidden-columns`.                                                                           |
| `ColumnVisibilityButton`                 | The "Ẩn cột (n)" popover. Pass `visibility`; optional `extra` for page-level toggles (e.g. an "Ẩn số tiền (***)" `Switch`) shown above the column list.                                       |
| `ButtonFilter`                           | Only for workflow statuses where seeing every state at a glance matters (e.g. invoice Nháp / Chờ thanh toán / Hoàn thành). Use a `Select` for everything else (roles, categories, customers). |

Don't re-implement any of these inside a page. If a page needs something they can't do, extend the shared component.

## Layout (top to bottom, never reorder)

1. **Title**: `ListPage title="Quản lý <thực thể>"` (Vietnamese, `Typography.Title level={4}`).
2. **Actions row, right-aligned**: primary action first (`type="primary"`, lucide icon, e.g. `Plus` "Thêm …"), then secondary actions (Export, …), and **`ColumnVisibilityButton` always last**.
3. **Filters row, right-aligned, wraps**: search (`Space.Compact`: optional field `Select` + `Input` + search icon `Button`), then filter `Select`s (`allowClear`, placeholder "Tất cả …"), then `ButtonFilter`s for statuses, then date ranges. `ListPage` puts the **"Bỏ lọc"** button first (left of the filters) and renders it **only while `filtersActive` is true**; never show it disabled.
4. **Table**: `size="small"`, `showSorterTooltip={false}`, `scroll={{ x: "max-content" }}`, `rowKey="id"`, server-side `pagination` with `showSizeChanger` and `showTotal={(total) => \`${total} <thực thể>\`}`. Use `summary` for a "Tổng cộng" row when there are money columns.

No `Card` around the page; `AppLayout` already provides the padding.

## Columns

- Every data column has a stable string `key` and a string `title`; that's what makes it hideable. The key is stored in users' browsers, so don't rename keys casually.
- The actions column has `key: "actions"`, **no title** (so it can't be hidden), `align: "right"`, small buttons (`Sửa`, `Xoá` inside `Popconfirm`).
- Pass `visibleColumns` (not `columns`) to `Table`.
- `tableKey` is unique per table, kebab-case, e.g. `"admin-users"`, `"sales-invoices"`.
- Dates: `dayjs(value).format("DD/MM/YYYY HH:mm")` from `@/lib/dayjs`. Money: right-aligned, `Intl.NumberFormat("vi-VN")` with `₫`.

## State

- Filters, search, sort and pagination live in the **URL**: a zod `validateSearch` schema with `.catch()` defaults, `Route.useSearch()`, and `navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })`. Any filter change resets `page` to 1.
- Free-text search: local input state + `useDebounceFn` (300 ms) to write the URL; Enter or the search button applies immediately (`cancel()` the debounce first).
- `filtersActive` is true when any filter differs from its default. `onResetFilters` cancels pending debounces, clears the local search text and resets every filter in one `navigate` (keep `pageSize` and sort).
- Hidden columns live only in localStorage, through `useColumnVisibility`. Never put them in the URL or the database.
- Data comes from TanStack Query with `placeholderData: keepPreviousData`; mutations invalidate the list key.

## File placement

Page-only pieces go next to the route in `_components/`, `_hooks/` (see AGENTS.md "Web code placement"); the shared blocks above stay in `src/components/data-table/`.

## Checklist

- [ ] `ListPage` with title, actions (ColumnVisibilityButton last), filters, `onResetFilters` + `filtersActive`
- [ ] `useColumnVisibility` with a unique `tableKey`; `Table` gets `visibleColumns`
- [ ] Every data column: string `key` + string `title`; actions column without title
- [ ] Filters/sort/page in the URL with defaults; search debounced; "Bỏ lọc" resets them all
- [ ] Vietnamese UI text; `pnpm --filter web check-types` and `pnpm exec biome check apps/web` pass
