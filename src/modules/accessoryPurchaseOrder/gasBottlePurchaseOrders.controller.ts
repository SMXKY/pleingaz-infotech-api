import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { GasBottlePurchaseOrderService } from "./gasBottlePurchaseOrders.service";
import { GasBottlePurchaseOrder } from "src/generated/prisma";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { AppError } from "@utils/AppError.util";

export class GasBottlePurchaseOrderController extends BaseController<GasBottlePurchaseOrder> {
  protected service: GasBottlePurchaseOrderService;

  constructor() {
    super();
    this.service = new GasBottlePurchaseOrderService();
  }

  private extractId(req: Request): string {
    const rawId = req.params.id;
    let id: string | undefined;

    if (Array.isArray(rawId)) {
      id = typeof rawId[0] === "string" ? rawId[0] : undefined;
    } else if (typeof rawId === "string") {
      id = rawId;
    }

    if (!id) {
      throw new AppError(
        "error.validation.id_required",
        StatusCodes.BAD_REQUEST
      );
    }

    return id;
  }

  createOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const order = await this.service.create(req.body, ctx);
      appResponder(StatusCodes.CREATED, order as object, res);
    } catch (error) {
      next(error);
    }
  };

  getOrderSummary = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const id = this.extractId(req);
      const order = await this.service.getOrderSummary(id, ctx);
      appResponder(StatusCodes.OK, order as object, res);
    } catch (error) {
      next(error);
    }
  };

  cancelOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const id = this.extractId(req);
      const order = await this.service.cancelOrder(id, ctx);
      appResponder(StatusCodes.OK, order as object, res);
    } catch (error) {
      next(error);
    }
  };
}
