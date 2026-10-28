import { createFileRoute } from "@tanstack/react-router";
import { App, Button, Card, Checkbox, Form, Input, Typography } from "antd";
import z from "zod";

import { FormField } from "@/components/form/form-field";
import { MIN_PASSWORD } from "@/constants/auth";
import { useZodForm } from "@/hooks/use-zod-form";
import { authClient } from "@/lib/auth-client";

const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
		newPassword: z
			.string()
			.min(MIN_PASSWORD, `Mật khẩu tối thiểu ${MIN_PASSWORD} ký tự`),
		confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu mới"),
		revokeOtherSessions: z.boolean(),
	})
	.refine((values) => values.newPassword === values.confirmPassword, {
		path: ["confirmPassword"],
		message: "Mật khẩu nhập lại không khớp",
	})
	.refine((values) => values.newPassword !== values.currentPassword, {
		path: ["newPassword"],
		message: "Mật khẩu mới phải khác mật khẩu hiện tại",
	});

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

const defaultValues: ChangePasswordValues = {
	currentPassword: "",
	newPassword: "",
	confirmPassword: "",
	revokeOtherSessions: true,
};

export const Route = createFileRoute("/_authed/account/password/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { message } = App.useApp();
	const {
		control,
		handleSubmit,
		reset,
		setError,
		formState: { isSubmitting },
	} = useZodForm(changePasswordSchema, { defaultValues });

	const onSubmit = async (values: ChangePasswordValues) => {
		const { error } = await authClient.changePassword({
			currentPassword: values.currentPassword,
			newPassword: values.newPassword,
			revokeOtherSessions: values.revokeOtherSessions,
		});

		if (error) {
			if (error.code === "INVALID_PASSWORD") {
				setError("currentPassword", {
					message: "Mật khẩu hiện tại không đúng",
				});
				return;
			}
			message.error(error.message || error.statusText);
			return;
		}

		reset(defaultValues);
		message.success("Đã đổi mật khẩu");
	};

	return (
		<div className="flex max-w-lg flex-col gap-4">
			<Typography.Title level={4} className="m-0!">
				Đổi mật khẩu
			</Typography.Title>
			<Card>
				<form onSubmit={handleSubmit(onSubmit)} noValidate>
					<Form component={false} layout="vertical">
						<FormField
							control={control}
							name="currentPassword"
							label="Mật khẩu hiện tại"
							required
						>
							{(field) => (
								<Input.Password
									{...field}
									placeholder="Nhập mật khẩu hiện tại"
									autoComplete="current-password"
								/>
							)}
						</FormField>
						<FormField
							control={control}
							name="newPassword"
							label="Mật khẩu mới"
							required
						>
							{(field) => (
								<Input.Password
									{...field}
									placeholder={`Tối thiểu ${MIN_PASSWORD} ký tự`}
									autoComplete="new-password"
								/>
							)}
						</FormField>
						<FormField
							control={control}
							name="confirmPassword"
							label="Nhập lại mật khẩu mới"
							required
						>
							{(field) => (
								<Input.Password
									{...field}
									placeholder="Nhập lại mật khẩu mới"
									autoComplete="new-password"
								/>
							)}
						</FormField>
						<FormField
							control={control}
							name="revokeOtherSessions"
							label={null}
						>
							{({ value, onChange, ...field }) => (
								<Checkbox
									{...field}
									checked={value}
									onChange={(event) => onChange(event.target.checked)}
								>
									Đăng xuất khỏi các thiết bị khác
								</Checkbox>
							)}
						</FormField>
						<Button type="primary" htmlType="submit" loading={isSubmitting}>
							Đổi mật khẩu
						</Button>
					</Form>
				</form>
			</Card>
		</div>
	);
}
