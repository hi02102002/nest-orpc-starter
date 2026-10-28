# Formatting: dates, money, numbers, statuses

## Dates

- Import dayjs from `@/lib/dayjs` (Vietnamese locale preloaded), never from `"dayjs"`.
- Date + time: `dayjs(value).format("DD/MM/YYYY HH:mm")`. Date only: `"DD/MM/YYYY"`.
- API values may be `Date` or ISO strings (CRUD rows are jsonified); `dayjs(value)` accepts both.

## Money and numbers

- Money: `new Intl.NumberFormat("vi-VN").format(value) + " ₫"`, right-aligned in tables (`align: "right"`). Totals in a table `summary` row labelled "Tổng cộng".
- Plain counts: `Intl.NumberFormat("vi-VN")` (thousands separator `.`).
- `InputNumber` for money: `min={0}`, `addonAfter="₫"`, `className="w-full"`, and a `formatter` that inserts `.` every three digits with a `parser` that strips them (see the antd `InputNumber` docs, "formatter").

## Statuses and roles

- Render as antd `Tag`, one fixed color per value, defined once next to the options list (e.g. `roleOptions`) and reused by the table and the filter.
- Current conventions: admin role `gold`; neutral/default values use a plain `Tag` without color.
