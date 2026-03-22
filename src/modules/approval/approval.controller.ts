import { Request, Response, NextFunction } from "express";
import { ApprovalService } from "./approval.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { AppError } from "@utils/AppError.util";
import { ServiceContext } from "@appTypes/base.types";
import { BaseController } from "src/base/BaseController";
import { Approval } from "src/generated/prisma";

export class ApprovalController extends BaseController<Approval> {
  protected service: ApprovalService;

  constructor() {
    super();
    this.service = new ApprovalService();
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

  getMyApprovals = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const options = this.parseFindManyOptions(req);
      const approvals = await this.service.getMyApprovals(ctx, options);
      appResponder(StatusCodes.OK, approvals, res);
    } catch (error) {
      next(error);
    }
  };

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
