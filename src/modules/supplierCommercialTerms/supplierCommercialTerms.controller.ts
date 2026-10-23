import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { SupplierCommercialTermsService } from "./supplierCormercialTerms.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { SupplierCommercialTerms } from "src/generated/prisma";
import { AppError } from "@utils/AppError.util";
import { updateSupplierCommercialTermsSchema } from "./supplierCormercialTerms.schema";
import { catchAsync } from "@utils/catchAsync.util";

export class SupplierCommercialTermsController extends BaseController<SupplierCommercialTerms> {
  protected service: SupplierCommercialTermsService;

  constructor() {
    super();
    this.service = new SupplierCommercialTermsService();
  }

  getCommercialTerms = catchAsync(
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

      const terms = await this.service.getCommercialTerms(
        supplierId as string,
        ctx
      );
      appResponder(StatusCodes.OK, terms, res);
    }
  );

  updateCommercialTerms = catchAsync(
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

      const validation = updateSupplierCommercialTermsSchema.safeParse(
        req.body
      );
      if (!validation.success) {
        const message = validation.error.issues[0].message;
        throw new AppError(message, StatusCodes.BAD_REQUEST);
      }

      const terms = await this.service.updateCommercialTerms(
        supplierId as string,
        validation.data,
        ctx
      );
      appResponder(StatusCodes.OK, terms, res);
    }
  );
}
