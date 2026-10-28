# Modals and confirmations

Reference implementation: `apps/web/src/routes/_authed/admin/users/_components/user-form-modal.tsx`.

## Create / edit modal

- One component for both modes: `user?: T` prop; title "Thêm <thực thể>" / "Sửa <thực thể>", OK text "Tạo" / "Lưu", cancel "Huỷ".
- Props: `open`, the record (optional), `onClose`. The parent holds `useState<{ open: false } | { open: true; record?: T }>`.
- `Modal` props: `confirmLoading={isPending}`, `onOk={handleSubmit(onSubmit)}`, `onCancel={onClose}`, `destroyOnHidden`.
- Reset the form in an effect when `open` becomes true. Close only after the mutation succeeds; on error keep it open and show `message.error`.
- The mutation invalidates the list query; the modal doesn't refetch by hand.

## Destructive actions

- Delete/remove always behind `Popconfirm`: `title="Xoá <thực thể>?"`, a `description` that names the record and the consequence, `okText="Xoá"`, `cancelText="Huỷ"`, `okButtonProps={{ danger: true, loading }}`.
- The trigger is a `danger` button with the `Trash2` icon. Disable it (and the `Popconfirm`) when the action isn't allowed, e.g. deleting yourself.
- Bulk or irreversible operations that need more than one sentence use `modal.confirm` from `App.useApp()`, never the static `Modal.confirm`.

## Drawers

Use `Drawer` instead of `Modal` only for long forms or detail views (more than ~8 fields, or a sub-table). Same rules otherwise.
