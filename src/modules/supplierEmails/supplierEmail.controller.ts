import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { OrderEmailService } from "./supplierEmail.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { OrderEmail } from "src/generated/prisma";
import { catchAsync } from "@utils/catchAsync.util";

export class OrderEmailController extends BaseController<OrderEmail> {
  protected service: OrderEmailService;

  constructor() {
    super();
    this.service = new OrderEmailService();
  }

  createOrderEmail = catchAsync(async (req: Request, res: Response) => {
    const ctx = this.getContext(req, res);
    const result = await this.service.createOrderEmail(req.body, ctx);
    appResponder(StatusCodes.OK, result, res);
  });
}
