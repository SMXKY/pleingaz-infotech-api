import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { PaymentService } from "./payment.service";
import { PaymentRecord } from "src/generated/prisma";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { AppError } from "@utils/AppError.util";

export class PaymentController extends BaseController<PaymentRecord> {
  protected service: PaymentService;

  constructor() {
    super();
    this.service = new PaymentService();
  }

  private extractId(req: Request, param: string = "id"): string {
    const rawId = req.params[param];
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

  recordPayment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const payment = await this.service.recordPayment(req.body, ctx);
      appResponder(StatusCodes.CREATED, this.serialize(payment), res);
    } catch (error) {
      next(error);
    }
  };

  // POST /api/v1/payments/:paymentId/reverse
  reversePayment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const paymentId = this.extractId(req, "paymentId");
      const reversal = await this.service.reversePayment(
        paymentId,
        req.body || {},
        ctx
      );
      appResponder(StatusCodes.CREATED, this.serialize(reversal), res);
    } catch (error) {
      next(error);
    }
  };

  // POST /api/v1/payments/:paymentId/correct
  correctPayment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const paymentId = this.extractId(req, "paymentId");
      const result = await this.service.correctPayment(
        paymentId,
        req.body,
        ctx
      );
      appResponder(
        StatusCodes.CREATED,
        {
          reversal: this.serialize(result.reversal),
          corrected: this.serialize(result.corrected),
        },
        res
      );
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/v1/payments/:paymentId/notes
  updateNotes = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const paymentId = this.extractId(req, "paymentId");
      const payment = await this.service.updatePaymentNotes(
        paymentId,
        req.body,
        ctx
      );
      appResponder(StatusCodes.OK, this.serialize(payment), res);
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/payments/by-order/:orderId
  getByOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const orderId = this.extractId(req, "orderId");
      const refTable = this.extractId(req, "refTable");
      const payments = await this.service.getPaymentsByOrder(
        orderId,
        refTable,
        ctx
      );
      appResponder(
        StatusCodes.OK,
        payments.map((p) => this.serialize(p)),
        res
      );
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/payments/:paymentId
  getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const paymentId = this.extractId(req, "paymentId");
      const payment = await this.service.getPaymentById(paymentId, ctx);
      appResponder(StatusCodes.OK, this.serialize(payment), res);
    } catch (error) {
      next(error);
    }
  };

  // ─── Serialize Decimal/BigInt for JSON response ───────────────────────────
  private serialize(record: any): any {
    if (record === null || record === undefined) return record;
    if (Array.isArray(record)) return record.map((r) => this.serialize(r));

    if (typeof record === "object") {
      // Check for Prisma Decimal
      if (record.constructor && record.constructor.name === "Decimal") {
        return record.toString();
      }

      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(record)) {
        if (typeof value === "bigint") {
          result[key] = value.toString();
        } else if (
          value !== null &&
          typeof value === "object" &&
          (value as any).constructor?.name === "Decimal"
        ) {
          result[key] = (value as any).toString();
        } else if (value instanceof Date) {
          result[key] = value.toISOString();
        } else if (Array.isArray(value)) {
          result[key] = value.map((v) => this.serialize(v));
        } else if (value !== null && typeof value === "object") {
          result[key] = this.serialize(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    }

    if (typeof record === "bigint") return record.toString();
    return record;
  }
}
