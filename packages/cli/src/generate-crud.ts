import { spawnSync } from "node:child_process";
import {
	access,
	mkdir,
	readFile,
	rename,
	unlink,
	writeFile,
} from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import prompts from "prompts";

type FieldType = "boolean" | "integer" | "number" | "string";

interface Field {
	name: string;
	optional: boolean;
	type: FieldType;
}

interface Options {
	dryRun: boolean;
	entity?: string;
	feature?: string;
	fields?: string;
	help: boolean;
	root?: string;
}

interface Change {
	content: string;
	original: null | string;
	path: string;
}

const HELP = `Generate a contract-first CRUD feature.

Usage:
  pnpm generate:crud [plural-feature] [options]

Interactive:
  pnpm generate:crud

Non-interactive:
  pnpm generate:crud products --fields "name:string,price:number,stock:integer,isActive:boolean"

Options:
  --entity <singular-name>  Override the inferred singular entity name
  --fields <fields>         Skip field prompts; supported: string, number, integer, boolean
                            Add ? after a type to make a field optional
  --dry-run                 Show affected files without writing them
  --help                    Show this help

Generated layers:
  packages/db/src/schema/<feature>.ts
  packages/api-contract/src/<feature>.contract.ts
  apps/server/src/features/<feature>/{service,controller,module}.ts
`;

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(scriptDirectory, "../../..");

function parseOptions(argv: string[]): Options {
	const options: Options = { dryRun: false, help: false };

	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];
		if (!argument) continue;

		if (argument === "--help" || argument === "-h") {
			options.help = true;
			continue;
		}

		if (argument === "--dry-run") {
			options.dryRun = true;
			continue;
		}

		if (argument.startsWith("--fields=")) {
			options.fields = argument.slice("--fields=".length);
			continue;
		}

		if (argument.startsWith("--entity=")) {
			options.entity = argument.slice("--entity=".length);
			continue;
		}

		if (argument.startsWith("--root=")) {
			options.root = argument.slice("--root=".length);
			continue;
		}

		if (
			argument === "--fields" ||
			argument === "--entity" ||
			argument === "--root"
		) {
			const value = argv[index + 1];
			if (!value || value.startsWith("--")) {
				throw new Error(`Missing value for ${argument}`);
			}

			if (argument === "--fields") options.fields = value;
			if (argument === "--entity") options.entity = value;
			if (argument === "--root") options.root = value;
			index += 1;
			continue;
		}

		if (argument.startsWith("-")) {
			throw new Error(`Unknown option: ${argument}`);
		}

		if (options.feature) {
			throw new Error(`Unexpected argument: ${argument}`);
		}

		options.feature = argument;
	}

	return options;
}

function assertKebabCase(value: string, label: string): void {
	if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)) {
		throw new Error(`${label} must use kebab-case (for example: order-items)`);
	}
}

function toCamelCase(value: string): string {
	return value.replace(/-([a-z0-9])/g, (_, character: string) =>
		character.toUpperCase(),
	);
}

function toPascalCase(value: string): string {
	const camelCase = toCamelCase(value);
	return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

function toSnakeCase(value: string): string {
	return value
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.replaceAll("-", "_")
		.toLowerCase();
}

function singularize(value: string): string {
	if (value.endsWith("ies") && value.length > 3)
		return `${value.slice(0, -3)}y`;
	if (/(ches|shes|ses|xes|zes)$/.test(value)) return value.slice(0, -2);
	if (value.endsWith("s") && !value.endsWith("ss")) return value.slice(0, -1);
	return value;
}

function parseFields(value: string): Field[] {
	const supportedTypes = new Set<FieldType>([
		"boolean",
		"integer",
		"number",
		"string",
	]);
	const names = new Set<string>();
	const fields = value.split(",").map((entry) => entry.trim());

	if (fields.length === 0 || fields.some((entry) => entry.length === 0)) {
		throw new Error("--fields must contain at least one field");
	}

	return fields.map((entry) => {
		const match =
			/^([a-z][A-Za-z0-9]*):(string|number|integer|boolean)(\?)?$/.exec(entry);
		if (!match) {
			throw new Error(
				`Invalid field "${entry}". Expected name:type or name:type?`,
			);
		}

		const name = match[1];
		const rawType = match[2];
		const optionalMarker = match[3];
		if (!name || !rawType) throw new Error(`Could not parse field: ${entry}`);
		if (names.has(name)) throw new Error(`Duplicate field: ${name}`);
		if (["createdAt", "id", "updatedAt"].includes(name)) {
			throw new Error(
				`${name} is generated automatically and cannot be declared`,
			);
		}
		if (!supportedTypes.has(rawType as FieldType)) {
			throw new Error(`Unsupported type: ${rawType}`);
		}

		names.add(name);
		return {
			name,
			optional: optionalMarker === "?",
			type: rawType as FieldType,
		};
	});
}

function fieldNameValidation(
	value: string,
	existingNames: Set<string>,
): true | string {
	if (!/^[a-z][A-Za-z0-9]*$/.test(value)) {
		return "Use camelCase, for example: isActive";
	}
	if (["createdAt", "id", "updatedAt"].includes(value)) {
		return `${value} is generated automatically`;
	}
	if (existingNames.has(value)) return `${value} already exists`;
	return true;
}

async function collectInteractiveFields(): Promise<string> {
	const fields: string[] = [];
	const names = new Set<string>();
	let addAnother = true;

	while (addAnother) {
		const fieldAnswer = await prompts(
			[
				{
					type: "text",
					name: "name",
					message: "Field name",
					validate: (value: string) => fieldNameValidation(value, names),
				},
				{
					type: "select",
					name: "type",
					message: "Field type",
					choices: [
						{ title: "String", value: "string" },
						{ title: "Number", value: "number" },
						{ title: "Integer", value: "integer" },
						{ title: "Boolean", value: "boolean" },
					],
				},
				{
					type: "confirm",
					name: "optional",
					message: "Optional?",
					initial: false,
				},
			],
			{
				onCancel: () => {
					throw new Error("CRUD generation cancelled");
				},
			},
		);

		const name = fieldAnswer.name as string | undefined;
		const type = fieldAnswer.type as FieldType | undefined;
		if (!name || !type) throw new Error("CRUD generation cancelled");

		names.add(name);
		fields.push(`${name}:${type}${fieldAnswer.optional ? "?" : ""}`);

		const nextAnswer = await prompts(
			{
				type: "confirm",
				name: "addAnother",
				message: "Add another field?",
				initial: true,
			},
			{
				onCancel: () => {
					throw new Error("CRUD generation cancelled");
				},
			},
		);
		addAnother = nextAnswer.addAnother === true;
	}

	return fields.join(",");
}

async function completeOptions(options: Options): Promise<Options> {
	if (options.feature && options.fields) return options;
	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		throw new Error(
			"Interactive input requires a terminal. Pass a feature and --fields in non-interactive environments.",
		);
	}

	if (!options.feature) {
		const answer = await prompts(
			{
				type: "text",
				name: "feature",
				message: "Plural feature name",
				validate: (value: string) =>
					/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)
						? true
						: "Use kebab-case, for example: order-items",
			},
			{
				onCancel: () => {
					throw new Error("CRUD generation cancelled");
				},
			},
		);
		if (!answer.feature) throw new Error("CRUD generation cancelled");
		options.feature = answer.feature as string;
	}

	if (!options.fields) options.fields = await collectInteractiveFields();
	return options;
}

function drizzleColumn(field: Field): string {
	const columnName = toSnakeCase(field.name);
	const builders: Record<FieldType, string> = {
		boolean: `boolean("${columnName}")`,
		integer: `integer("${columnName}")`,
		number: `doublePrecision("${columnName}")`,
		string: `text("${columnName}")`,
	};
	const required = field.optional ? "" : ".notNull()";
	return `\t${field.name}: ${builders[field.type]}${required},`;
}

function zodSchema(field: Field, mode: "create" | "entity" | "update"): string {
	const schemas: Record<FieldType, string> = {
		boolean: "z.boolean()",
		integer: "z.number().int()",
		number: "z.number()",
		string: "z.string().min(1)",
	};
	let schema = schemas[field.type];

	if (mode === "entity" && field.optional) schema += ".nullable()";
	if (mode === "update" || (mode === "create" && field.optional))
		schema += ".optional()";

	return `\t${field.name}: ${schema},`;
}

function renderSchema(
	feature: string,
	featureCamel: string,
	fields: Field[],
): string {
	const imports = new Set(["pgTable", "timestamp", "uuid"]);
	const importByType: Record<FieldType, string> = {
		boolean: "boolean",
		integer: "integer",
		number: "doublePrecision",
		string: "text",
	};
	for (const field of fields) imports.add(importByType[field.type]);
	const sortedImports = [...imports].sort();
	const importBlock =
		sortedImports.length > 4
			? `import {\n${sortedImports.map((name) => `\t${name},`).join("\n")}\n} from "drizzle-orm/pg-core";`
			: `import { ${sortedImports.join(", ")} } from "drizzle-orm/pg-core";`;

	return `${importBlock}

export const ${featureCamel} = pgTable("${toSnakeCase(feature)}", {
	id: uuid("id").defaultRandom().primaryKey(),
${fields.map(drizzleColumn).join("\n")}
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
`;
}

function renderContract(
	feature: string,
	featureCamel: string,
	entityCamel: string,
	entityPascal: string,
	fields: Field[],
): string {
	const entityFields = fields
		.map((field) => zodSchema(field, "entity"))
		.join("\n");
	const createFields = fields
		.map((field) => zodSchema(field, "create"))
		.join("\n");
	const updateFields = fields
		.map((field) => zodSchema(field, "update"))
		.join("\n");

	return `import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { z } from "zod";

const ${entityCamel}Schema = z.object({
	id: z.uuid(),
${entityFields}
	createdAt: z.date(),
	updatedAt: z.date(),
});

const create${entityPascal}InputSchema = z.object({
${createFields}
});

const update${entityPascal}InputSchema = z.object({
	id: z.uuid(),
${updateFields}
});

export const ${featureCamel}Contract = {
	list: oc
		.meta(
			openapi({
				method: "GET",
				path: "/api/${feature}",
				tags: ["${entityPascal}"],
			}),
		)
		.input(
			z.object({
				page: z.coerce.number().int().min(1).default(1),
				limit: z.coerce.number().int().min(1).max(100).default(20),
			}),
		)
		.output(
			z.object({
				items: z.array(${entityCamel}Schema),
				meta: z.object({
					page: z.number().int(),
					limit: z.number().int(),
					total: z.number().int(),
					totalPages: z.number().int(),
				}),
			}),
		),
	getAll: oc
		.meta(
			openapi({
				method: "GET",
				path: "/api/${feature}/all",
				tags: ["${entityPascal}"],
			}),
		)
		.output(z.array(${entityCamel}Schema)),
	get: oc
		.meta(
			openapi({
				method: "GET",
				path: "/api/${feature}/{id}",
				tags: ["${entityPascal}"],
			}),
		)
		.input(z.object({ id: z.uuid() }))
		.output(${entityCamel}Schema),
	create: oc
		.meta(
			openapi({
				method: "POST",
				path: "/api/${feature}",
				successStatus: 201,
				tags: ["${entityPascal}"],
			}),
		)
		.input(create${entityPascal}InputSchema)
		.output(${entityCamel}Schema),
	update: oc
		.meta(
			openapi({
				method: "PATCH",
				path: "/api/${feature}/{id}",
				tags: ["${entityPascal}"],
			}),
		)
		.input(update${entityPascal}InputSchema)
		.output(${entityCamel}Schema),
	remove: oc
		.meta(
			openapi({
				method: "DELETE",
				path: "/api/${feature}/{id}",
				tags: ["${entityPascal}"],
			}),
		)
		.input(z.object({ id: z.uuid() }))
		.output(z.object({ id: z.uuid() })),
};
`;
}

function renderService(
	feature: string,
	featureCamel: string,
	featurePascal: string,
): string {
	return `import { Inject, Injectable } from "@nestjs/common";
import { getDrizzleToken } from "@nestjs/drizzle";
import type { InferContractRouterInputs } from "@orpc/contract";
import type { contract } from "@petshop/api-contract";
import type { Database } from "@petshop/db";
import { ${featureCamel} } from "@petshop/db/schema/${feature}";
import { count, desc, eq } from "drizzle-orm";

type ${featurePascal}Inputs = InferContractRouterInputs<
	typeof contract.${featureCamel}
>;

@Injectable()
export class ${featurePascal}Service {
	constructor(@Inject(getDrizzleToken()) private readonly db: Database) {}

	async list(page: number, limit: number) {
		const offset = (page - 1) * limit;
		const [items, totalRows] = await Promise.all([
			this.db
				.select()
				.from(${featureCamel})
				.orderBy(desc(${featureCamel}.createdAt))
				.limit(limit)
				.offset(offset),
			this.db.select({ value: count() }).from(${featureCamel}),
		]);
		const total = totalRows[0]?.value ?? 0;

		return {
			items,
			meta: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	getAll() {
		return this.db
			.select()
			.from(${featureCamel})
			.orderBy(desc(${featureCamel}.createdAt));
	}

	async get(id: string) {
		const [item] = await this.db
			.select()
			.from(${featureCamel})
			.where(eq(${featureCamel}.id, id))
			.limit(1);
		return item;
	}

	async create(input: ${featurePascal}Inputs["create"]) {
		const [item] = await this.db
			.insert(${featureCamel})
			.values(input)
			.returning();
		if (!item) throw new Error("Failed to create ${featureCamel}");
		return item;
	}

	async update({ id, ...input }: ${featurePascal}Inputs["update"]) {
		const [item] = await this.db
			.update(${featureCamel})
			.set({ ...input, updatedAt: new Date() })
			.where(eq(${featureCamel}.id, id))
			.returning();
		return item;
	}

	async remove(id: string) {
		const [item] = await this.db
			.delete(${featureCamel})
			.where(eq(${featureCamel}.id, id))
			.returning({ id: ${featureCamel}.id });
		return item;
	}
}
`;
}

function renderController(
	feature: string,
	featureCamel: string,
	featurePascal: string,
): string {
	return `import { Controller } from "@nestjs/common";
import { Implement } from "@orpc/nest";
import { implement, ORPCError } from "@orpc/server";
import { contract } from "@petshop/api-contract";

// biome-ignore lint/style/useImportType: NestJS needs the runtime class for dependency injection metadata.
import { ${featurePascal}Service } from "./${feature}.service";

@Controller()
export class ${featurePascal}Controller {
	constructor(
		private readonly ${featureCamel}Service: ${featurePascal}Service,
	) {}

	@Implement(contract.${featureCamel}.list)
	list() {
		return implement(contract.${featureCamel}.list).handler(({ input }) =>
			this.${featureCamel}Service.list(input.page, input.limit),
		);
	}

	@Implement(contract.${featureCamel}.getAll)
	getAll() {
		return implement(contract.${featureCamel}.getAll).handler(() =>
			this.${featureCamel}Service.getAll(),
		);
	}

	@Implement(contract.${featureCamel}.get)
	get() {
		return implement(contract.${featureCamel}.get).handler(
			async ({ input }) => {
				const item = await this.${featureCamel}Service.get(input.id);
				if (!item) {
					throw new ORPCError("NOT_FOUND");
				}
				return item;
			},
		);
	}

	@Implement(contract.${featureCamel}.create)
	create() {
		return implement(contract.${featureCamel}.create).handler(({ input }) =>
			this.${featureCamel}Service.create(input),
		);
	}

	@Implement(contract.${featureCamel}.update)
	update() {
		return implement(contract.${featureCamel}.update).handler(
			async ({ input }) => {
				const item = await this.${featureCamel}Service.update(input);
				if (!item) {
					throw new ORPCError("NOT_FOUND");
				}
				return item;
			},
		);
	}

	@Implement(contract.${featureCamel}.remove)
	remove() {
		return implement(contract.${featureCamel}.remove).handler(
			async ({ input }) => {
				const item = await this.${featureCamel}Service.remove(input.id);
				if (!item) {
					throw new ORPCError("NOT_FOUND");
				}
				return item;
			},
		);
	}
}
`;
}

function renderModule(feature: string, featurePascal: string): string {
	return `import { Module } from "@nestjs/common";

import { ${featurePascal}Controller } from "./${feature}.controller";
import { ${featurePascal}Service } from "./${feature}.service";

@Module({
	controllers: [${featurePascal}Controller],
	providers: [${featurePascal}Service],
})
export class ${featurePascal}Module {}
`;
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

function insertBefore(
	content: string,
	marker: string,
	addition: string,
	file: string,
): string {
	const index = content.indexOf(marker);
	if (index === -1)
		throw new Error(`Could not find integration marker in ${file}: ${marker}`);
	return `${content.slice(0, index)}${addition}${content.slice(index)}`;
}

function addSortedRelativeImport(
	content: string,
	importLine: string,
	anchor: string,
	file: string,
): string {
	const relativeImportPattern = /^import .* from "\.\.?\/[^"]+";\n?/gm;
	const imports = [...content.matchAll(relativeImportPattern)].map((match) =>
		match[0].trim(),
	);
	imports.push(importLine);
	imports.sort((left, right) => {
		const leftSource = left.match(/from "([^"]+)"/)?.[1] ?? left;
		const rightSource = right.match(/from "([^"]+)"/)?.[1] ?? right;
		return leftSource.localeCompare(rightSource);
	});

	const withoutRelativeImports = content
		.replace(relativeImportPattern, "")
		.replace(/\n{3,}/g, "\n\n");
	return insertBefore(
		withoutRelativeImports,
		anchor,
		`\n${imports.join("\n")}\n`,
		file,
	);
}

async function buildChanges(
	options: Options,
): Promise<{ changes: Change[]; root: string }> {
	if (!options.feature) throw new Error("Missing feature name");
	if (!options.fields) throw new Error("Missing --fields");

	assertKebabCase(options.feature, "Feature name");
	const entity = options.entity ?? singularize(options.feature);
	assertKebabCase(entity, "Entity name");

	const fields = parseFields(options.fields);
	const root = resolve(options.root ?? defaultRoot);
	const feature = options.feature;
	const featureCamel = toCamelCase(feature);
	const featurePascal = toPascalCase(feature);
	const entityCamel = toCamelCase(entity);
	const entityPascal = toPascalCase(entity);

	const schemaPath = resolve(root, `packages/db/src/schema/${feature}.ts`);
	const contractPath = resolve(
		root,
		`packages/api-contract/src/${feature}.contract.ts`,
	);
	const featureDirectory = resolve(root, `apps/server/src/features/${feature}`);
	const servicePath = resolve(featureDirectory, `${feature}.service.ts`);
	const controllerPath = resolve(featureDirectory, `${feature}.controller.ts`);
	const modulePath = resolve(featureDirectory, `${feature}.module.ts`);
	const newFiles = [
		schemaPath,
		contractPath,
		servicePath,
		controllerPath,
		modulePath,
	];

	for (const path of newFiles) {
		if (await pathExists(path)) {
			throw new Error(
				`Refusing to overwrite existing file: ${relative(root, path)}`,
			);
		}
	}

	const dbIndexPath = resolve(root, "packages/db/src/schema/index.ts");
	const contractIndexPath = resolve(root, "packages/api-contract/src/index.ts");
	const appModulePath = resolve(root, "apps/server/src/app.module.ts");
	const [dbIndex, contractIndex, appModule] = await Promise.all([
		readFile(dbIndexPath, "utf8"),
		readFile(contractIndexPath, "utf8"),
		readFile(appModulePath, "utf8"),
	]);

	const dbExport = `export * from "./${feature}";`;
	const contractImport = `import { ${featureCamel}Contract } from "./${feature}.contract";`;
	const contractProperty = `\t${featureCamel}: ${featureCamel}Contract,\n`;
	const moduleImport = `import { ${featurePascal}Module } from "./features/${feature}/${feature}.module";`;
	const moduleEntry = `\t\t${featurePascal}Module,\n`;

	if (dbIndex.includes(dbExport))
		throw new Error(`${feature} is already exported from the DB schema`);
	if (
		contractIndex.includes(contractImport) ||
		contractIndex.includes(contractProperty.trim())
	) {
		throw new Error(`${feature} is already registered in the API contract`);
	}
	if (
		appModule.includes(moduleImport.trim()) ||
		appModule.includes(moduleEntry.trim())
	) {
		throw new Error(`${feature} is already registered in AppModule`);
	}

	const dbExportPattern = /^export \* from "[^"]+";\n?/gm;
	const sortedDbExports = [...dbIndex.matchAll(dbExportPattern)]
		.map((match) => match[0].trim())
		.concat(dbExport)
		.sort();
	const remainingDbIndex = dbIndex
		.replace(dbExportPattern, "")
		.replace(/^export \{\};\n?/gm, "")
		.trim();
	const nextDbIndex = `${sortedDbExports.join("\n")}\n${remainingDbIndex ? `${remainingDbIndex}\n` : ""}`;
	let nextContractIndex = addSortedRelativeImport(
		contractIndex,
		contractImport,
		"\nexport const contract = {",
		"packages/api-contract/src/index.ts",
	);
	nextContractIndex = insertBefore(
		nextContractIndex,
		"};\n\nexport type AppRouterClient",
		contractProperty,
		"packages/api-contract/src/index.ts",
	);
	let nextAppModule = addSortedRelativeImport(
		appModule,
		moduleImport,
		"\n@Module",
		"apps/server/src/app.module.ts",
	);
	nextAppModule = insertBefore(
		nextAppModule,
		"\t],\n})\nexport class AppModule",
		moduleEntry,
		"apps/server/src/app.module.ts",
	);

	return {
		root,
		changes: [
			{
				path: schemaPath,
				content: renderSchema(feature, featureCamel, fields),
				original: null,
			},
			{
				path: contractPath,
				content: renderContract(
					feature,
					featureCamel,
					entityCamel,
					entityPascal,
					fields,
				),
				original: null,
			},
			{
				path: servicePath,
				content: renderService(feature, featureCamel, featurePascal),
				original: null,
			},
			{
				path: controllerPath,
				content: renderController(feature, featureCamel, featurePascal),
				original: null,
			},
			{
				path: modulePath,
				content: renderModule(feature, featurePascal),
				original: null,
			},
			{ path: dbIndexPath, content: nextDbIndex, original: dbIndex },
			{
				path: contractIndexPath,
				content: nextContractIndex,
				original: contractIndex,
			},
			{ path: appModulePath, content: nextAppModule, original: appModule },
		],
	};
}

async function writeAtomically(path: string, content: string): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const temporaryPath = `${path}.tmp-${process.pid}`;
	await writeFile(temporaryPath, content, "utf8");
	await rename(temporaryPath, path);
}

async function applyChanges(changes: Change[]): Promise<void> {
	const applied: Change[] = [];

	try {
		for (const change of changes) {
			await writeAtomically(change.path, change.content);
			applied.push(change);
		}
	} catch (error) {
		for (const change of applied.reverse()) {
			if (change.original === null) {
				await unlink(change.path).catch(() => undefined);
			} else {
				await writeAtomically(change.path, change.original);
			}
		}
		throw error;
	}
}

async function formatChanges(root: string, changes: Change[]): Promise<void> {
	const biomePath = resolve(root, "node_modules/.bin/biome");
	if (!(await pathExists(biomePath))) {
		console.warn("Biome was not found; generated files were not formatted.");
		return;
	}

	const files = changes
		.map((change) => change.path)
		.filter((path) => path.endsWith(".ts"));
	const result = spawnSync(biomePath, ["format", "--write", ...files], {
		cwd: root,
		stdio: "inherit",
	});
	if (result.error) throw result.error;
	if (result.status !== 0) {
		throw new Error(`Biome formatting failed with exit code ${result.status}`);
	}
}

export async function runGenerateCrud(argv: string[]): Promise<void> {
	const parsedOptions = parseOptions(argv);
	if (parsedOptions.help) {
		console.log(HELP);
		return;
	}
	const options = await completeOptions(parsedOptions);

	const { changes, root } = await buildChanges(options);
	console.log(
		options.dryRun
			? "Dry run - no files were changed:"
			: "Generated CRUD feature:",
	);
	for (const change of changes) console.log(`  ${relative(root, change.path)}`);

	if (options.dryRun) return;
	await applyChanges(changes);
	await formatChanges(root, changes);
	console.log("\nNext steps:");
	console.log("  pnpm db:generate");
	console.log("  pnpm db:migrate");
	console.log("  pnpm check-types");
}
