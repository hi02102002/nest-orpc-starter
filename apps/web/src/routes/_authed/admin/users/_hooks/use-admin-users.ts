import {
	keepPreviousData,
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";

export type UserRole = "admin" | "user";

export interface AdminUsersSearch {
	page: number;
	pageSize: number;
	search?: string;
	searchField: "email" | "name";
	role?: UserRole;
	sortBy: "createdAt" | "name" | "email";
	sortDirection: "asc" | "desc";
}

export interface UserFormValues {
	name: string;
	email: string;
	role: UserRole;
	password?: string;
}

const adminUsersKey = ["admin", "users"] as const;

async function unwrap<T>(
	promise: Promise<{
		data: T | null;
		error: { message?: string; statusText: string } | null;
	}>,
): Promise<T> {
	const { data, error } = await promise;
	if (error) throw new Error(error.message || error.statusText);
	return data as T;
}

export const adminUsersQueryOptions = (search: AdminUsersSearch) =>
	queryOptions({
		queryKey: [...adminUsersKey, search],
		queryFn: () =>
			unwrap(
				authClient.admin.listUsers({
					query: {
						limit: search.pageSize,
						offset: (search.page - 1) * search.pageSize,
						sortBy: search.sortBy,
						sortDirection: search.sortDirection,
						...(search.search && {
							searchValue: search.search,
							searchField: search.searchField,
							searchOperator: "contains",
						}),
						...(search.role && {
							filterField: "role",
							filterValue: search.role,
							filterOperator: "eq",
						}),
					},
				}),
			),
		placeholderData: keepPreviousData,
	});

export type AdminUser = Awaited<
	ReturnType<NonNullable<ReturnType<typeof adminUsersQueryOptions>["queryFn"]>>
>["users"][number];

function useInvalidateUsers() {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: adminUsersKey });
}

export function useCreateUser() {
	const invalidate = useInvalidateUsers();
	return useMutation({
		mutationFn: ({ password, ...values }: UserFormValues) =>
			unwrap(authClient.admin.createUser({ ...values, password })),
		onSuccess: invalidate,
	});
}

export function useUpdateUser() {
	const invalidate = useInvalidateUsers();
	return useMutation({
		mutationFn: async ({
			userId,
			values: { password, ...data },
		}: {
			userId: string;
			values: UserFormValues;
		}) => {
			await unwrap(authClient.admin.updateUser({ userId, data }));
			if (password) {
				await unwrap(
					authClient.admin.setUserPassword({ userId, newPassword: password }),
				);
			}
		},
		onSuccess: invalidate,
	});
}

export function useRemoveUser() {
	const invalidate = useInvalidateUsers();
	return useMutation({
		mutationFn: (userId: string) =>
			unwrap(authClient.admin.removeUser({ userId })),
		onSuccess: invalidate,
	});
}
