import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import {
	createContext,
	type PropsWithChildren,
	useContext,
	useState,
} from "react";
import { createStore, type StoreApi, useStore } from "zustand";

const SIDEBAR_COOKIE = "sidebar_collapsed";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const getSidebarCollapsed = createIsomorphicFn()
	.client(() =>
		document.cookie
			.split("; ")
			.some((cookie) => cookie === `${SIDEBAR_COOKIE}=true`),
	)
	.server(() => getCookie(SIDEBAR_COOKIE) === "true");

function writeSidebarCookie(collapsed: boolean) {
	// biome-ignore lint/suspicious/noDocumentCookie: plain cookie so SSR can read it
	document.cookie = `${SIDEBAR_COOKIE}=${collapsed}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`;
}

interface SidebarState {
	collapsed: boolean;
	isMobile: boolean;
	mobileOpen: boolean;
	setCollapsed: (collapsed: boolean) => void;
	setIsMobile: (isMobile: boolean) => void;
}

function createSidebarStore(collapsed: boolean) {
	return createStore<SidebarState>()((set, get) => ({
		collapsed,
		isMobile: false,
		mobileOpen: false,
		setCollapsed: (collapsed) => {
			if (get().isMobile) {
				set({ mobileOpen: !collapsed });
				return;
			}
			writeSidebarCookie(collapsed);
			set({ collapsed });
		},
		setIsMobile: (isMobile) => set({ isMobile, mobileOpen: false }),
	}));
}

const SidebarStoreContext = createContext<StoreApi<SidebarState> | null>(null);

interface SidebarStoreProviderProps extends PropsWithChildren {
	initialCollapsed: boolean;
}

export function SidebarStoreProvider({
	initialCollapsed,
	children,
}: SidebarStoreProviderProps) {
	const [store] = useState(() => createSidebarStore(initialCollapsed));

	return (
		<SidebarStoreContext.Provider value={store}>
			{children}
		</SidebarStoreContext.Provider>
	);
}

export function useSidebarStore<T>(selector: (state: SidebarState) => T): T {
	const store = useContext(SidebarStoreContext);
	if (!store) {
		throw new Error("useSidebarStore must be used within SidebarStoreProvider");
	}
	return useStore(store, selector);
}

export function useSidebarCollapsed() {
	return useSidebarStore((state) =>
		state.isMobile ? !state.mobileOpen : state.collapsed,
	);
}
