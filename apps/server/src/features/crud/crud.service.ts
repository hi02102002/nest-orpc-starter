import { type CrudResources, crudResources } from "@app/api-contract";
import { type CrudEngine, createCrudEngine } from "@app/crud/server";
import type { Database } from "@app/db";
import { Inject, Injectable } from "@nestjs/common";
import { getDrizzleToken } from "@nestjs/drizzle";

import {
	type CrudContext,
	crudPolicies,
	isAuthenticated,
} from "./crud.policies";
import { crudTables } from "./crud.tables";

@Injectable()
export class CrudService {
	readonly engine: CrudEngine<CrudResources, CrudContext>;

	constructor(@Inject(getDrizzleToken()) db: Database) {
		this.engine = createCrudEngine({
			db,
			resources: crudResources,
			tables: crudTables,
			policies: crudPolicies,
			isAuthenticated,
		});
	}
}
