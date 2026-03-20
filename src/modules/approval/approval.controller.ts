import { Request, Response, NextFunction } from "express";
import { ApprovalService } from "./approval.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { AppError } from "@utils/AppError.util";
import { ServiceContext } from "@appTypes/base.types";

export class ApprovalController {
  private service: ApprovalService;

  constructor() {
    this.service = new ApprovalService();
  }

  private getContext(req: Request, res: Response): ServiceContext {
    return {
      req,
      userId: res.locals.user?.id,
      userEmail: res.locals.user?.email,
      requestId: req.headers["x-request-id"] as string,
    };
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

  // Get approval by ID
  getApproval = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const id = this.extractId(req);
      const approval = await this.service.getApprovalById(id, ctx);
      appResponder(StatusCodes.OK, approval as object, res);
    } catch (error) {
      next(error);
    }
  };

  // Get approval by record ID (query param: ?recordId=xxx&entityType=GAS_ORDER)
  getApprovalByRecord = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const recordId = req.query.recordId as string;
      const entityType = req.query.entityType as string;

      if (!recordId || !entityType) {
        throw new AppError(
          "error.approval.record_id_and_entity_type_required",
          StatusCodes.BAD_REQUEST
        );
      }

      const approval = await this.service.getApprovalByRecord(
        recordId,
        entityType,
        ctx
      );
      appResponder(StatusCodes.OK, approval as object, res);
    } catch (error) {
      next(error);
    }
  };

  // Approve or reject — POST /approvals/:id/decide
  approveOrReject = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const id = this.extractId(req);
      const approval = await this.service.approveOrReject(id, req.body, ctx);
      appResponder(StatusCodes.OK, approval as object, res);
    } catch (error) {
      next(error);
    }
  };
}
