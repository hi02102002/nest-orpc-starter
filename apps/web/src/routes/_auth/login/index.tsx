import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { App, Button, Form, Input } from "antd";
import z from "zod";

import { FormField } from "@/components/form/form-field";
import { useZodForm } from "@/hooks/use-zod-form";
import { authClient } from "@/lib/auth-client";
import { sessionQueryKey } from "@/lib/session";

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
	const queryClient = useQueryClient();

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
					// Otherwise the root beforeLoad keeps the cached "signed out" session.
					queryClient.removeQueries({ queryKey: sessionQueryKey });
					if (redirect?.startsWith("/") && !redirect.startsWith("//")) {
						navigate({ href: redirect });
					} else {
						navigate({ to: "/" });
					}
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
				Starter
			</div>
			<form onSubmit={handleSubmit(onSubmit)} noValidate>
				<Form component={false} layout="vertical">
					<FormField control={control} name="email" label="Email" required>
						{(field) => (
							<Input
								{...field}
								type="email"
								placeholder="Nhập email"
								autoComplete="email"
							/>
						)}
					</FormField>
					<FormField
						control={control}
						name="password"
						label="Mật khẩu"
						required
					>
						{(field) => (
							<Input.Password
								{...field}
								placeholder="Nhập mật khẩu"
								autoComplete="current-password"
							/>
						)}
					</FormField>

					<Button block type="primary" htmlType="submit" loading={isSubmitting}>
						Đăng nhập
					</Button>
				</Form>
			</form>
		</div>
	);
}
