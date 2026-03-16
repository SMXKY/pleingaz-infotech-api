import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { AccessoryCategoryService } from "./accessoryCategory.service";
import { AccessoryCategory } from "src/generated/prisma";

export class AccessoryCategoryController extends BaseController<AccessoryCategory> {
  protected service: AccessoryCategoryService;

  constructor() {
    super();
    this.service = new AccessoryCategoryService();
  }
}
