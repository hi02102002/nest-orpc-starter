import { createAuth } from "@petshop/auth";
import { createDb } from "@petshop/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
