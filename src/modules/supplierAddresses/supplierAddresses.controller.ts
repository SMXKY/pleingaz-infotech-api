import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { SupplierAddressService } from "./supplierAddresses.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { SupplierAddress } from "src/generated/prisma";
import { AppError } from "@utils/AppError.util";
import {
  addSupplierAddressSchema,
  updateSupplierAddressSchema,
} from "./supplierAddresses.schema";
import { catchAsync } from "@utils/catchAsync.util";

export class SupplierAddressController extends BaseController<SupplierAddress> {
  protected service: SupplierAddressService;

  constructor() {
    super();
    this.service = new SupplierAddressService();
  }

  listAddresses = catchAsync(
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

      const addresses = await this.service.listAddresses(
        supplierId as string,
        ctx
      );
      appResponder(StatusCodes.OK, addresses, res);
    }
  );

  addAddress = catchAsync(
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

      const validation = addSupplierAddressSchema.safeParse(req.body);
      if (!validation.success) {
        const message = validation.error.issues[0].message;
        throw new AppError(message, StatusCodes.BAD_REQUEST);
      }

      const address = await this.service.addAddress(
        supplierId as string,
        validation.data,
        ctx
      );
      appResponder(StatusCodes.CREATED, address, res);
    }
  );

  updateAddress = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { supplierId, addressId } = req.params;
      const ctx = this.getContext(req, res);

      if (!supplierId || !addressId) {
        return next(
          new AppError(
            "error.validation.invalid_supplier_id_or_address_id",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const validation = updateSupplierAddressSchema.safeParse(req.body);
      if (!validation.success) {
        const message = validation.error.issues[0].message;
        throw new AppError(message, StatusCodes.BAD_REQUEST);
      }

      const address = await this.service.updateAddress(
        supplierId as string,
        addressId as string,
        validation.data,
        ctx
      );
      appResponder(StatusCodes.OK, address, res);
    }
  );

  setDefault = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { supplierId, addressId } = req.params;
      const ctx = this.getContext(req, res);

      if (!supplierId || !addressId) {
        return next(
          new AppError(
            "error.validation.invalid_supplier_id_or_address_id",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const address = await this.service.setDefault(
        supplierId as string,
        addressId as string,
        ctx
      );
      appResponder(StatusCodes.OK, address, res);
    }
  );

  deleteAddress = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { supplierId, addressId } = req.params;
      const ctx = this.getContext(req, res);

      if (!supplierId || !addressId) {
        return next(
          new AppError(
            "error.validation.invalid_supplier_id_or_address_id",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const address = await this.service.deleteAddress(
        supplierId as string,
        addressId as string,
        ctx
      );
      appResponder(StatusCodes.OK, address, res);
    }
  );
}
