import type { Session } from "@petshop/auth";
import type { Database } from "@petshop/db";

export type Context = {
  session: Session | null;
  db: Database;
};
