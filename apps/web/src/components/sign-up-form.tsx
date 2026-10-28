import { useNavigate } from "@tanstack/react-router";
import { App, Button, Card, Form, Input, Space, Typography } from "antd";
import { Controller } from "react-hook-form";
import z from "zod";

import { useZodForm } from "@/hooks/use-zod-form";
import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

const signUpSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
	email: z.email("Invalid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignUpValues = z.infer<typeof signUpSchema>;

export default function SignUpForm({
	onSwitchToSignIn,
}: {
	onSwitchToSignIn: () => void;
}) {
	const { message } = App.useApp();
	const navigate = useNavigate({
		from: "/",
	});
	const { isPending } = authClient.useSession();

	const {
		control,
		handleSubmit,
		formState: { isSubmitting, isValid },
	} = useZodForm(signUpSchema, {
		defaultValues: {
			email: "",
			password: "",
			name: "",
		},
		mode: "onChange",
	});

	const onSubmit = async (value: SignUpValues) => {
		await authClient.signUp.email(
			{
				email: value.email,
				password: value.password,
				name: value.name,
			},
			{
				onSuccess: () => {
					navigate({
						to: "/dashboard",
					});
					message.success("Account created");
				},
				onError: (error) => {
					message.error(error.error.message || error.error.statusText);
				},
			},
		);
	};

	if (isPending) {
		return <Loader />;
	}

	return (
		<Card className="mx-auto w-full max-w-[460px] shadow-[0_24px_80px_rgb(70_40_20/12%)]">
			<Space orientation="vertical" size="large" style={{ width: "100%" }}>
				<div>
					<Typography.Title level={2} style={{ marginBottom: 4 }}>
						Create account
					</Typography.Title>
					<Typography.Text type="secondary">
						Start managing your petshop workspace.
					</Typography.Text>
				</div>
				<form onSubmit={handleSubmit(onSubmit)}>
					<Form component={false} layout="vertical">
						<Controller
							control={control}
							name="name"
							render={({ field, fieldState }) => (
								<Form.Item
									label="Name"
									htmlFor={field.name}
									validateStatus={fieldState.error ? "error" : undefined}
									help={fieldState.error?.message}
								>
									<Input {...field} autoComplete="name" id={field.name} />
								</Form.Item>
							)}
						/>
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
										autoComplete="new-password"
										id={field.name}
									/>
								</Form.Item>
							)}
						/>

						<Button
							block
							type="primary"
							htmlType="submit"
							disabled={!isValid}
							loading={isSubmitting}
						>
							Create account
						</Button>
					</Form>
				</form>

				<div style={{ textAlign: "center" }}>
					<Button type="link" onClick={onSwitchToSignIn}>
						Already have an account? Sign in
					</Button>
				</div>
			</Space>
		</Card>
	);
}
