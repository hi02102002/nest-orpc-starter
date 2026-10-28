import { App, Form, Input, Modal, Select } from "antd";
import { useEffect } from "react";
import z from "zod";

import { FormField } from "@/components/form/form-field";
import { MIN_PASSWORD } from "@/constants/auth";
import { useZodForm } from "@/hooks/use-zod-form";

import {
	type AdminUser,
	type UserFormValues,
	type UserRole,
	useCreateUser,
	useUpdateUser,
} from "../_hooks/use-admin-users";

const baseSchema = z.object({
	name: z.string().trim().min(1, "Vui lòng nhập tên"),
	email: z.email("Email không hợp lệ"),
	role: z.enum(["admin", "user"]),
});

const createSchema = baseSchema.extend({
	password: z
		.string()
		.min(MIN_PASSWORD, `Mật khẩu tối thiểu ${MIN_PASSWORD} ký tự`),
});

const editSchema = baseSchema.extend({
	password: z
		.string()
		.refine(
			(value) => value === "" || value.length >= MIN_PASSWORD,
			`Mật khẩu tối thiểu ${MIN_PASSWORD} ký tự`,
		)
		.transform((value) => value || undefined),
});

export const roleOptions: { value: UserRole; label: string }[] = [
	{ value: "user", label: "Người dùng" },
	{ value: "admin", label: "Quản trị viên" },
];

interface UserFormModalProps {
	open: boolean;
	user?: AdminUser;
	isSelf?: boolean;
	onClose: () => void;
}

export function UserFormModal({
	open,
	user,
	isSelf,
	onClose,
}: UserFormModalProps) {
	const { message } = App.useApp();
	const createUser = useCreateUser();
	const updateUser = useUpdateUser();
	const isEdit = Boolean(user);

	const { control, handleSubmit, reset } = useZodForm<
		z.input<typeof editSchema>,
		UserFormValues
	>(isEdit ? editSchema : createSchema, {
		defaultValues: { name: "", email: "", role: "user", password: "" },
	});

	useEffect(() => {
		if (!open) return;
		reset({
			name: user?.name ?? "",
			email: user?.email ?? "",
			role: user?.role === "admin" ? "admin" : "user",
			password: "",
		});
	}, [open, user, reset]);

	const pending = createUser.isPending || updateUser.isPending;

	const onSubmit = async (values: UserFormValues) => {
		try {
			if (user) {
				await updateUser.mutateAsync({ userId: user.id, values });
				message.success("Đã cập nhật người dùng");
			} else {
				await createUser.mutateAsync(values);
				message.success("Đã tạo người dùng");
			}
			onClose();
		} catch (error) {
			message.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
		}
	};

	return (
		<Modal
			open={open}
			title={isEdit ? "Sửa người dùng" : "Thêm người dùng"}
			okText={isEdit ? "Lưu" : "Tạo"}
			cancelText="Huỷ"
			confirmLoading={pending}
			onOk={handleSubmit(onSubmit)}
			onCancel={onClose}
			destroyOnHidden
		>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					handleSubmit(onSubmit)();
				}}
				noValidate
			>
				<Form component={false} layout="vertical">
					<FormField control={control} name="name" label="Tên" required>
						{(field) => (
							<Input {...field} placeholder="Nhập tên" autoComplete="off" />
						)}
					</FormField>
					<FormField control={control} name="email" label="Email" required>
						{(field) => (
							<Input
								{...field}
								type="email"
								placeholder="Nhập email"
								autoComplete="off"
							/>
						)}
					</FormField>
					<FormField
						control={control}
						name="role"
						label="Vai trò"
						required
						extra={
							isSelf ? "Bạn không thể tự đổi vai trò của mình." : undefined
						}
					>
						{(field) => (
							<Select
								{...field}
								options={roleOptions}
								placeholder="Chọn vai trò"
								disabled={isSelf}
							/>
						)}
					</FormField>
					<FormField
						control={control}
						name="password"
						label={isEdit ? "Mật khẩu mới" : "Mật khẩu"}
						required={!isEdit}
						help={isEdit ? "Để trống nếu không đổi mật khẩu." : undefined}
					>
						{(field) => (
							<Input.Password
								{...field}
								placeholder={
									isEdit
										? "Nhập mật khẩu mới"
										: `Tối thiểu ${MIN_PASSWORD} ký tự`
								}
								autoComplete="new-password"
							/>
						)}
					</FormField>
					<button type="submit" hidden />
				</Form>
			</form>
		</Modal>
	);
}
