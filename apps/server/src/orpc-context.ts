import type { IncomingHttpHeaders } from "node:http";
import type { ExecutionContext } from "@nestjs/common";
import type { Session } from "@petshop/auth";
import type { Database } from "@petshop/db";
import { fromNodeHeaders } from "better-auth/node";
import { identifyUser } from "evlog/better-auth";
import { useLogger } from "evlog/nestjs";

import { auth, db } from "./services";

declare module "@orpc/server" {
	interface DefaultInitialContext {
		db: Database;
		session: Session | null;
	}
}

export async function createORPCContext(context: ExecutionContext) {
	const request = context
		.switchToHttp()
		.getRequest<{ headers: IncomingHttpHeaders }>();
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(request.headers),
	});

	if (session) {
		identifyUser(useLogger(), session, {
			fields: ["id"],
			session: false,
		});
	}

	return { db, session };
}
