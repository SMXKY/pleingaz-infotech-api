import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { GasPurchaseOrderService } from "./gasPurchaseOrder.service";
import { GasPurchaseOrder } from "src/generated/prisma";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { AppError } from "@utils/AppError.util";

export class GasPurchaseOrderController extends BaseController<GasPurchaseOrder> {
  protected service: GasPurchaseOrderService;

  constructor() {
    super();
    this.service = new GasPurchaseOrderService();
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

  // Step 1: Create draft order
  createDraft = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const order = await this.service.createDraftOrder(req.body, ctx);
      appResponder(StatusCodes.CREATED, order as object, res);
    } catch (error) {
      next(error);
    }
  };

  // Step 2: Assign tankers
  assignTankers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const id = this.extractId(req);
      const order = await this.service.assignTankers(id, req.body, ctx);
      appResponder(StatusCodes.OK, order as object, res);
    } catch (error) {
      next(error);
    }
  };

  // Step 3: Add line items + supplier
  addLineItems = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const id = this.extractId(req);
      const order = await this.service.addLineItems(id, req.body, ctx);
      appResponder(StatusCodes.OK, order as object, res);
    } catch (error) {
      next(error);
    }
  };

  // Step 4: Get full order summary
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

  // Submit for approval
  submitForApproval = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const id = this.extractId(req);
      const order = await this.service.submitForApproval(id, ctx);
      appResponder(StatusCodes.OK, order as object, res);
    } catch (error) {
      next(error);
    }
  };

  // Approve or reject
  approveOrReject = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const id = this.extractId(req);

      const { action, notes } = req.body;

      if (!action || !["APPROVED", "REJECTED"].includes(action)) {
        throw new AppError(
          "error.gas_order.invalid_approval_action",
          StatusCodes.BAD_REQUEST
        );
      }

      const order = await this.service.approveOrReject(
        id,
        action,
        notes,
        ctx
      );
      appResponder(StatusCodes.OK, order as object, res);
    } catch (error) {
      next(error);
    }
  };
}
