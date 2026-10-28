# Forms

Reference implementations: `apps/web/src/routes/_authed/admin/users/_components/user-form-modal.tsx`, `apps/web/src/routes/_auth/login/index.tsx`.

## Stack

- **react-hook-form + zod** through `useZodForm(schema, { defaultValues })` (`@/hooks/use-zod-form`). Every field gets a default value (`""` for text) so inputs are always controlled.
- **Layout:** `<form onSubmit={handleSubmit(onSubmit)} noValidate>` wrapping `<Form component={false} layout="vertical">`. Don't use antd's own `Form` state (`Form.useForm`, `rules`, `name` on `Form.Item`).
- **Fields:** always `FormField` (`@/components/form/form-field`). Never hand-write `Controller` + `Form.Item` in a page.

```tsx
<FormField control={control} name="email" label="Email" required>
	{(field) => (
		<Input
			{...field}
			type="email"
			placeholder="Nhập email"
			autoComplete="email"
		/>
	)}
</FormField>;
```

`FormField` wires `label`, `htmlFor`/`id`, error status and message, `help` and `extra`. Spread `field` onto the input; don't add `id` yourself.

## Required fields: red asterisk

- Pass `required` on every field the schema doesn't allow to be empty. `required` only draws the asterisk; the **zod schema is the source of truth** and must reject the empty value (`z.string().trim().min(1, "Vui lòng nhập …")`, `z.email(…)`, `z.enum(…)`).
- Optional fields: no `required`, and the schema accepts empty (`.optional()`, or `""` transformed to `undefined`).
- When a field is required only in one mode, compute it: `required={!isEdit}` for a password that's mandatory on create and optional on edit.

## Placeholders: every input has one

| Control                            | Placeholder                                                                |
| ---------------------------------- | -------------------------------------------------------------------------- |
| Text / email / number `Input`      | "Nhập <tên trường viết thường>": "Nhập tên", "Nhập email", "Nhập số lượng" |
| `Input.Password`                   | "Nhập mật khẩu"; with a rule, say it: "Tối thiểu 8 ký tự"                  |
| `Select`, `TreeSelect`, `Cascader` | "Chọn <trường>": "Chọn vai trò", "Chọn khách hàng"                         |
| `DatePicker` / `RangePicker`       | "Chọn ngày" / `["Từ ngày", "Đến ngày"]`                                    |
| `Input.TextArea`                   | "Nhập <trường>…" plus `autoSize={{ minRows: 3 }}`                          |
| Search box in a filter bar         | "Tìm theo <trường>": "Tìm theo email"                                      |

Placeholders are hints, never the label: the label stays even when a placeholder exists.

## Messages and hints

- Validation messages in Vietnamese, specific: "Vui lòng nhập tên", "Email không hợp lệ", "Mật khẩu tối thiểu 8 ký tự".
- Persistent hints go in `help` (shown under the field, replaced by the error while invalid), e.g. "Để trống nếu không đổi mật khẩu.". Context that should stay visible even with an error goes in `extra`.
- Disabled fields explain why in `extra` ("Bạn không thể tự đổi vai trò của mình.").

## Inputs

- `autoComplete`: `email`, `current-password`, `new-password`, `name`; `off` for admin forms editing someone else.
- Selects: `options` array with `{ value, label }`, typed values (`{ value: UserRole; label: string }[]`).
- Numbers/money: `InputNumber` with `className="w-full"`, `min`, and the `vi-VN` formatter from [formatting.md](formatting.md).

## Submit

- In a modal: the modal's OK button submits (`onOk={handleSubmit(onSubmit)}`, `confirmLoading={isPending}`), plus `<button type="submit" hidden />` inside the form so Enter submits. See [modals.md](modals.md).
- On a page: one primary `Button htmlType="submit" loading={isSubmitting}`.
- Errors from the API go to `message.error(error.message)`; success to `message.success("Đã …")`. See [feedback.md](feedback.md).
- Reset the form when the modal opens (`reset(...)` in an effect keyed on `open`) so it never shows stale values.

## Checklist

- [ ] Every field uses `FormField`
- [ ] `required` on exactly the fields the schema requires
- [ ] Every input has a Vietnamese placeholder per the table above
- [ ] Vietnamese validation messages; hints in `help` / `extra`
