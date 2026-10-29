# Feedback: toasts, loading, empty and error states

## Toasts

- Always `const { message, modal, notification } = App.useApp()`. Never the static `message.success(...)` import: it ignores the theme and breaks under SSR.
- Success, past tense with "Đã": "Đã tạo người dùng", "Đã cập nhật …", "Đã xoá …", "Đã đăng xuất".
- Errors: show the API's message when there is one (`error instanceof Error ? error.message : "Có lỗi xảy ra"`). Don't swallow errors silently.
- A toast the user can trigger repeatedly (submitting the login form, retrying an action) gets a fixed `key` (`message.error({ key: "sign-in-error", content })`), so it replaces the previous one instead of stacking. `AntdProvider` also caps toasts at `maxCount: 3`.

## Loading

- Tables: `loading={isFetching}` with `placeholderData: keepPreviousData` on the query, so pages don't flash empty.
- Buttons that trigger a mutation: `loading={isPending}` (or `confirmLoading` on a modal).
- Session-dependent UI (user menu): `Skeleton.Button active` while pending.

## Empty and error states

- Empty table: antd's default empty state is fine; don't add a second one.
- Query error on a page: a `Typography.Text type="danger"` line above the table with `error.message`.
- Route-level errors and unknown URLs are handled by `ErrorPage` / `NotFoundPage` (`src/components/error-pages.tsx`, registered as router defaults). Don't build per-page 404/500 screens; throw or let the loader fail.
