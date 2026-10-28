import type { TableColumnsType } from "antd";
import { useMemo, useSyncExternalStore } from "react";

// Same-tab writes notify through this set; other tabs through the `storage` event.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	window.addEventListener("storage", listener);
	return () => {
		listeners.delete(listener);
		window.removeEventListener("storage", listener);
	};
}

function readStorage(key: string) {
	try {
		return window.localStorage.getItem(key);
	} catch {
		return null;
	}
}

function parseKeys(raw: string | null): string[] {
	if (!raw) return [];
	try {
		const value: unknown = JSON.parse(raw);
		return Array.isArray(value)
			? value.filter((item): item is string => typeof item === "string")
			: [];
	} catch {
		return [];
	}
}

export interface ColumnOption {
	key: string;
	label: string;
}

export interface ColumnVisibility {
	options: ColumnOption[];
	hidden: string[];
	setHidden: (keys: string[]) => void;
}

/**
 * Persists hidden columns per table in localStorage (`table:<tableKey>:hidden-columns`).
 * Only columns with a string `key` and a string `title` can be hidden; the actions column (no title) always stays.
 * The server render shows every column, then the stored choice applies after hydration.
 */
export function useColumnVisibility<T>(
	tableKey: string,
	columns: TableColumnsType<T>,
) {
	const storageKey = `table:${tableKey}:hidden-columns`;
	const raw = useSyncExternalStore(
		subscribe,
		() => readStorage(storageKey),
		() => null,
	);
	const hidden = useMemo(() => parseKeys(raw), [raw]);

	const options = useMemo(
		() =>
			columns.flatMap((column) =>
				typeof column.key === "string" && typeof column.title === "string"
					? [{ key: column.key, label: column.title }]
					: [],
			),
		[columns],
	);

	const visibleColumns = useMemo(
		() =>
			columns.filter(
				(column) =>
					typeof column.key !== "string" || !hidden.includes(column.key),
			),
		[columns, hidden],
	);

	const setHidden = (keys: string[]) => {
		try {
			window.localStorage.setItem(storageKey, JSON.stringify(keys));
		} catch {
			// Storage unavailable (private mode, quota): the choice just won't persist.
		}
		for (const listener of listeners) listener();
	};

	const visibility: ColumnVisibility = { options, hidden, setHidden };
	return { visibleColumns, visibility };
}
