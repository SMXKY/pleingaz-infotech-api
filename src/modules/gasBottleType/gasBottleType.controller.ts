import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { GasBottleTypeService } from "./gasBottleType.service";
import { GasBottleType } from "src/generated/prisma";

export class GasBottleTypeController extends BaseController<GasBottleType> {
  protected service: GasBottleTypeService;

  constructor() {
    super();
    this.service = new GasBottleTypeService();
  }
}
