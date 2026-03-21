import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { SupplierService } from "./supplier.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { Supplier } from "src/generated/prisma";
import { AppError } from "@utils/AppError.util";
import { createSupplierSchema, updateSupplierSchema } from "./supplier.schema";
import { catchAsync } from "@utils/catchAsync.util";

export class SupplierController extends BaseController<Supplier> {
  protected service: SupplierService;

  constructor() {
    super();
    this.service = new SupplierService();
  }

  createSupplier = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const ctx = this.getContext(req, res);
      const validation = createSupplierSchema.safeParse(req.body);

      if (!validation.success) {
        const message = validation.error.issues[0].message;
        throw new AppError(message, StatusCodes.BAD_REQUEST);
      }

      const supplier = await this.service.createSupplier(validation.data, ctx);
      appResponder(StatusCodes.CREATED, supplier, res);
    }
  );

  findActive = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const suppliers = await this.service.findActiveSuppliers(ctx);
      appResponder(StatusCodes.OK, suppliers, res);
    } catch (error) {
      next(error);
    }
  };

  findWithOrders = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      if (!req.params.id) {
        return next(
          new AppError(
            "error.validation.invalid_supplier_id",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const { id } = req.params;
      const supplier = await this.service.getSupplierWithOrders(id as string);
      appResponder(StatusCodes.OK, supplier, res);
    }
  );

  getPerformance = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      if (!req.params.id) {
        return next(
          new AppError(
            "error.validation.invalid_supplier_id",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const { id } = req.params;
      const result = await this.service.getSupplierPerformance(id as string);
      appResponder(StatusCodes.OK, result, res);
    }
  );

  getAllPerformance = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const result = await this.service.getAllSuppliersPerformance();
      appResponder(StatusCodes.OK, result, res);
    }
  );
}
