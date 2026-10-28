import { implement } from "@orpc/server";
import { contract } from "@petshop/api-contract";

import { requireAuth } from "./middlewares/require-auth.middleware";

export const pub = implement(contract);

export const authed = pub.use(requireAuth);
