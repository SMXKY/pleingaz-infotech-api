import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { SupplierContactService } from "./supplierContacts.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { SupplierContact } from "src/generated/prisma";
import { AppError } from "@utils/AppError.util";
import {
  addSupplierContactSchema,
  updateSupplierContactSchema,
} from "./supplierContacts.schema";
import { catchAsync } from "@utils/catchAsync.util";

export class SupplierContactController extends BaseController<SupplierContact> {
  protected service: SupplierContactService;

  constructor() {
    super();
    this.service = new SupplierContactService();
  }

  listContacts = catchAsync(
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

      const contacts = await this.service.listContacts(
        supplierId as string,
        ctx
      );
      appResponder(StatusCodes.OK, contacts, res);
    }
  );

  addContact = catchAsync(
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

      const validation = addSupplierContactSchema.safeParse(req.body);
      if (!validation.success) {
        const message = validation.error.issues[0].message;
        throw new AppError(message, StatusCodes.BAD_REQUEST);
      }

      const contact = await this.service.addContact(
        supplierId as string,
        validation.data,
        ctx
      );
      appResponder(StatusCodes.CREATED, contact, res);
    }
  );

  updateContact = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { supplierId, contactId } = req.params;
      const ctx = this.getContext(req, res);

      if (!supplierId || !contactId) {
        return next(
          new AppError(
            "error.validation.invalid_supplier_id_or_contact_id",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const validation = updateSupplierContactSchema.safeParse(req.body);
      if (!validation.success) {
        const message = validation.error.issues[0].message;
        throw new AppError(message, StatusCodes.BAD_REQUEST);
      }

      const contact = await this.service.updateContact(
        supplierId as string,
        contactId as string,
        validation.data,
        ctx
      );
      appResponder(StatusCodes.OK, contact, res);
    }
  );

  setPrimary = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { supplierId, contactId } = req.params;
      const ctx = this.getContext(req, res);

      if (!supplierId || !contactId) {
        return next(
          new AppError(
            "error.validation.invalid_supplier_id_or_contact_id",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const contact = await this.service.setPrimary(
        supplierId as string,
        contactId as string,
        ctx
      );
      appResponder(StatusCodes.OK, contact, res);
    }
  );

  deleteContact = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { supplierId, contactId } = req.params;
      const ctx = this.getContext(req, res);

      if (!supplierId || !contactId) {
        return next(
          new AppError(
            "error.validation.invalid_supplier_id_or_contact_id",
            StatusCodes.BAD_REQUEST
          )
        );
      }

      const contact = await this.service.deleteContact(
        supplierId as string,
        contactId as string,
        ctx
      );
      appResponder(StatusCodes.OK, contact, res);
    }
  );
}
