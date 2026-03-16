import { BaseService } from "src/base/BaseService";
import { GasBottleTypeRepository } from "./gasBottleType.repository";
import {
  updateBottleTypeSchema,
  UpdateBottleTypeInput,
} from "./gasBottleType.schema";
import { GasBottleType } from "src/generated/prisma";

export class GasBottleTypeService extends BaseService<
  GasBottleType,
  any,
  UpdateBottleTypeInput
> {
  protected repository: GasBottleTypeRepository;
  protected tableName = "gas_bottle_types";
  protected createSchema = null as any;
  protected updateSchema = updateBottleTypeSchema;

  constructor() {
    super();
    this.repository = new GasBottleTypeRepository();
  }
}
