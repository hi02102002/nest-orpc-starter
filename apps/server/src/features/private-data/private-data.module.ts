import { Module } from "@nestjs/common";

import { PrivateDataController } from "./private-data.controller";

@Module({
	controllers: [PrivateDataController],
})
export class PrivateDataModule {}
