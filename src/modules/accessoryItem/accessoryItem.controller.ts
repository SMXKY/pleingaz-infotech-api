import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { AccessoryItemService } from "./accessoryItem.service";
import { AccessoryItem } from "src/generated/prisma";

export class AccessoryItemController extends BaseController<AccessoryItem> {
  protected service: AccessoryItemService;

  constructor() {
    super();
    this.service = new AccessoryItemService();
  }
}
