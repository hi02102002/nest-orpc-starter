import { runGenerateCrud } from "./generate-crud";

const [command, ...arguments_] = process.argv.slice(2);

async function main(): Promise<void> {
	if (command === "generate:crud") {
		await runGenerateCrud(arguments_);
		return;
	}

	console.log(`CLI

Usage:
  pnpm generate:crud [feature] [--fields "name:string,..."]

Commands:
  generate:crud  Generate a Drizzle + oRPC + NestJS CRUD feature
`);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
