import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { SupplierPaymentMethodService } from "./supplierPaymentMethods.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { SupplierPaymentMethod } from "src/generated/prisma";
import { AppError } from "@utils/AppError.util";
import {
  addSupplierPaymentMethodSchema,
  updateSupplierPaymentMethodSchema,
} from "./supplierPaymentMethods.schema";
import { catchAsync } from "@utils/catchAsync.util";

export class SupplierPaymentMethodController extends BaseController<SupplierPaymentMethod> {
  protected service: SupplierPaymentMethodService;

  constructor() {
    super();
    this.service = new SupplierPaymentMethodService();
  }

  listPaymentMethods = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { supplierId } = req.params;
      const ctx = this.getContext(req, res);

      if (!supplierId) {
        return next(
          new AppError(
            "error.validation.invalid_supplier_id",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const methods = await this.service.listPaymentMethods(
        supplierId as string,
        ctx
      );
      appResponder(StatusCodes.OK, methods, res);
    }
  );

  addPaymentMethod = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { supplierId } = req.params;
      const ctx = this.getContext(req, res);

      const validation = addSupplierPaymentMethodSchema.safeParse(req.body);
      if (!validation.success) {
        const message = validation.error.issues[0].message;
        throw new AppError(message, StatusCodes.BAD_REQUEST);
      }

      if (!supplierId) {
        return next(
          new AppError(
            "error.validation.invalid_supplier_id",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const method = await this.service.addPaymentMethod(
        supplierId as string,
        validation.data,
        ctx
      );
      appResponder(StatusCodes.CREATED, method, res);
    }
  );

  updatePaymentMethod = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { supplierId, methodId } = req.params;
      const ctx = this.getContext(req, res);

      if (!supplierId || !methodId) {
        return next(
          new AppError(
            "error.validation.invalid_supplier_id_or_method_id",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const validation = updateSupplierPaymentMethodSchema.safeParse(req.body);
      if (!validation.success) {
        const message = validation.error.issues[0].message;
        throw new AppError(message, StatusCodes.BAD_REQUEST);
      }

      const method = await this.service.updatePaymentMethod(
        supplierId as string,
        methodId as string,
        validation.data,
        ctx
      );
      appResponder(StatusCodes.OK, method, res);
    }
  );

  setDefault = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { supplierId, methodId } = req.params;
      const ctx = this.getContext(req, res);

      if (!supplierId || !methodId) {
        return next(
          new AppError(
            "error.validation.invalid_supplier_id_or_method_id",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const method = await this.service.setDefault(
        supplierId as string,
        methodId as string,
        ctx
      );
      appResponder(StatusCodes.OK, method, res);
    }
  );

  deletePaymentMethod = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { supplierId, methodId } = req.params;
      const ctx = this.getContext(req, res);

      if (!supplierId || !methodId) {
        return next(
          new AppError(
            "error.validation.invalid_supplier_id_or_method_id",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const method = await this.service.deletePaymentMethod(
        supplierId as string,
        methodId as string,
        ctx
      );
      appResponder(StatusCodes.OK, method, res);
    }
  );
}
