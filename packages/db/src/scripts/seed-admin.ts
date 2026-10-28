import "varlock/auto-load";

import { eq } from "drizzle-orm";

import { createDb } from "../index";
import { user } from "../schema/auth";

// Promotes an existing user to admin: pnpm db:seed-admin <email>
const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
	console.error("Usage: pnpm db:seed-admin <email>");
	process.exit(1);
}

const db = createDb({ DATABASE_URL: process.env.DATABASE_URL ?? "" });

try {
	const [updated] = await db
		.update(user)
		.set({ role: "admin" })
		.where(eq(user.email, email))
		.returning({ id: user.id, email: user.email });

	if (!updated) {
		console.error(`No user with email "${email}". Sign up first, then rerun.`);
		process.exitCode = 1;
	} else {
		console.log(`${updated.email} is now an admin.`);
	}
} finally {
	await db.$client.end();
}
