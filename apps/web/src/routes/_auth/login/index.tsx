import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { App, Button, Form, Input } from "antd";
import { Controller } from "react-hook-form";
import z from "zod";

import { useZodForm } from "@/hooks/use-zod-form";
import { authClient } from "@/lib/auth-client";

const signInSchema = z.object({
	email: z.email("Email không hợp lệ"),
	password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

type SignInValues = z.infer<typeof signInSchema>;

export const Route = createFileRoute("/_auth/login/")({
	validateSearch: z.object({
		redirect: z.string().optional(),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const { redirect } = Route.useSearch();

	const { message } = App.useApp();
	const navigate = useNavigate();

	const {
		control,
		handleSubmit,
		formState: { isSubmitting },
	} = useZodForm(signInSchema, {
		defaultValues: {
			email: "",
			password: "",
		},
	});

	const onSubmit = async (value: SignInValues) => {
		await authClient.signIn.email(
			{
				email: value.email,
				password: value.password,
			},
			{
				onSuccess: () => {
					if (redirect?.startsWith("/") && !redirect.startsWith("//")) {
						navigate({ href: redirect });
					} else {
						navigate({ to: "/" });
					}
					message.success("Đăng nhập thành công");
				},
				onError: (error) => {
					message.error(error.error.message || error.error.statusText);
				},
			},
		);
	};

	return (
		<div className="w-full max-w-[432px] bg-white px-6 pt-8 pb-6 shadow-[0_24px_80px_rgb(0_0_0/25%)] [&_.ant-form-item]:mb-4!">
			<div className="mb-8 text-center text-4xl leading-none font-semibold tracking-[0.02em] text-[#a50e3a] uppercase">
				Petshop
			</div>
			<form onSubmit={handleSubmit(onSubmit)} noValidate>
				<Form component={false} layout="vertical">
					<Controller
						control={control}
						name="email"
						render={({ field, fieldState }) => (
							<Form.Item
								label="Email"
								htmlFor={field.name}
								validateStatus={fieldState.error ? "error" : undefined}
								help={fieldState.error?.message}
							>
								<Input
									{...field}
									autoComplete="email"
									id={field.name}
									type="email"
								/>
							</Form.Item>
						)}
					/>
					<Controller
						control={control}
						name="password"
						render={({ field, fieldState }) => (
							<Form.Item
								label="Password"
								htmlFor={field.name}
								validateStatus={fieldState.error ? "error" : undefined}
								help={fieldState.error?.message}
							>
								<Input.Password
									{...field}
									autoComplete="current-password"
									id={field.name}
								/>
							</Form.Item>
						)}
					/>

					<Button block type="primary" htmlType="submit" loading={isSubmitting}>
						Đăng nhập
					</Button>
				</Form>
			</form>
		</div>
	);
}
