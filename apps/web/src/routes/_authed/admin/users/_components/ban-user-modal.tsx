import { App, Form, Input, Modal, Select, Typography } from "antd";
import { useEffect } from "react";
import z from "zod";

import { FormField } from "@/components/form/form-field";
import { useZodForm } from "@/hooks/use-zod-form";

import { type AdminUser, useBanUser } from "../_hooks/use-admin-users";

const DAY = 24 * 60 * 60;

const durationOptions = [
	{ value: "1d", label: "1 ngày", seconds: DAY },
	{ value: "7d", label: "7 ngày", seconds: 7 * DAY },
	{ value: "30d", label: "30 ngày", seconds: 30 * DAY },
	{ value: "permanent", label: "Vĩnh viễn", seconds: undefined },
] as const;

type Duration = (typeof durationOptions)[number]["value"];

const schema = z.object({
	duration: z.enum(["1d", "7d", "30d", "permanent"], "Vui lòng chọn thời hạn"),
	reason: z
		.string()
		.trim()
		.max(500, "Lý do tối đa 500 ký tự")
		.transform((value) => value || undefined),
});

interface BanUserModalProps {
	open: boolean;
	user?: AdminUser;
	onClose: () => void;
}

export function BanUserModal({ open, user, onClose }: BanUserModalProps) {
	const { message } = App.useApp();
	const banUser = useBanUser();

	const { control, handleSubmit, reset } = useZodForm<
		z.input<typeof schema>,
		z.output<typeof schema>
	>(schema, { defaultValues: { duration: "7d", reason: "" } });

	useEffect(() => {
		if (open) reset({ duration: "7d", reason: "" });
	}, [open, reset]);

	const onSubmit = async (values: z.output<typeof schema>) => {
		if (!user) return;
		try {
			await banUser.mutateAsync({
				userId: user.id,
				banReason: values.reason,
				banExpiresIn: durationOptions.find(
					(option) => option.value === values.duration,
				)?.seconds,
			});
			message.success("Đã khoá tài khoản");
			onClose();
		} catch (error) {
			message.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
		}
	};

	return (
		<Modal
			open={open}
			title="Khoá tài khoản"
			okText="Khoá"
			cancelText="Huỷ"
			okButtonProps={{ danger: true }}
			confirmLoading={banUser.isPending}
			onOk={handleSubmit(onSubmit)}
			onCancel={onClose}
			destroyOnHidden
		>
			<Typography.Paragraph type="secondary">
				{user?.email} sẽ bị đăng xuất khỏi mọi thiết bị và không thể đăng nhập
				cho đến khi hết hạn hoặc được mở khoá.
			</Typography.Paragraph>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					handleSubmit(onSubmit)();
				}}
				noValidate
			>
				<Form component={false} layout="vertical">
					<FormField
						control={control}
						name="duration"
						label="Thời hạn"
						required
					>
						{(field) => (
							<Select<Duration>
								{...field}
								options={durationOptions.map(({ value, label }) => ({
									value,
									label,
								}))}
								placeholder="Chọn thời hạn"
							/>
						)}
					</FormField>
					<FormField control={control} name="reason" label="Lý do">
						{(field) => (
							<Input.TextArea
								{...field}
								placeholder="Nhập lý do…"
								autoSize={{ minRows: 3 }}
								maxLength={500}
							/>
						)}
					</FormField>
					<button type="submit" hidden />
				</Form>
			</form>
		</Modal>
	);
}
