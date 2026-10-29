import { i18n, locales, type TranslationDictionary } from "@better-auth/i18n";
import type { BetterAuthPlugin } from "better-auth";

const adminVi: TranslationDictionary = {
	FAILED_TO_CREATE_USER: "Không thể tạo người dùng",
	YOU_CANNOT_BAN_YOURSELF: "Bạn không thể tự khoá tài khoản của mình",
	YOU_CANNOT_REMOVE_YOURSELF: "Bạn không thể tự xoá tài khoản của mình",
	YOU_CANNOT_IMPERSONATE_ADMINS: "Bạn không thể đăng nhập thay quản trị viên",
	YOU_ARE_NOT_ALLOWED_TO_CHANGE_USERS_ROLE:
		"Bạn không có quyền đổi vai trò người dùng",
	YOU_ARE_NOT_ALLOWED_TO_CREATE_USERS: "Bạn không có quyền tạo người dùng",
	YOU_ARE_NOT_ALLOWED_TO_LIST_USERS:
		"Bạn không có quyền xem danh sách người dùng",
	YOU_ARE_NOT_ALLOWED_TO_LIST_USERS_SESSIONS:
		"Bạn không có quyền xem phiên đăng nhập của người dùng",
	YOU_ARE_NOT_ALLOWED_TO_BAN_USERS: "Bạn không có quyền khoá tài khoản",
	YOU_ARE_NOT_ALLOWED_TO_IMPERSONATE_USERS:
		"Bạn không có quyền đăng nhập thay người dùng",
	YOU_ARE_NOT_ALLOWED_TO_REVOKE_USERS_SESSIONS:
		"Bạn không có quyền thu hồi phiên đăng nhập",
	YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS: "Bạn không có quyền xoá người dùng",
	YOU_ARE_NOT_ALLOWED_TO_SET_USERS_PASSWORD:
		"Bạn không có quyền đặt mật khẩu cho người dùng",
	YOU_ARE_NOT_ALLOWED_TO_GET_USER: "Bạn không có quyền xem người dùng",
	YOU_ARE_NOT_ALLOWED_TO_UPDATE_USERS: "Bạn không có quyền cập nhật người dùng",
	YOU_ARE_NOT_ALLOWED_TO_SET_USERS_EMAIL:
		"Bạn không có quyền đổi email người dùng",
	YOU_ARE_NOT_ALLOWED_TO_SET_NON_EXISTENT_VALUE: "Vai trò không tồn tại",
	NO_DATA_TO_UPDATE: "Không có dữ liệu để cập nhật",
	INVALID_ROLE_TYPE: "Vai trò không hợp lệ",
	PASSWORD_CANNOT_BE_UPDATED_VIA_UPDATE_USER:
		"Không thể đổi mật khẩu qua cập nhật người dùng",
};

export const viI18n: BetterAuthPlugin = i18n({
	translations: { vi: { ...locales.vi, ...adminVi } },
	defaultLocale: "vi",
});
