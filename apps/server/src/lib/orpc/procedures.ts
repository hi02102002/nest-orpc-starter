import { contract } from "@app/api-contract";
import { implement } from "@orpc/server";

import { requireAuth } from "./middlewares/require-auth.middleware";

export const pub = implement(contract);

export const authed = pub.use(requireAuth);
