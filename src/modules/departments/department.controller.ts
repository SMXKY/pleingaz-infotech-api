import { Request, Response, NextFunction } from "express";
import { BaseController } from "src/base/BaseController";
import { DepartmentService } from "./department.service";
import { appResponder } from "@utils/appResponder.util";
import { StatusCodes } from "http-status-codes";
import { Department } from "src/generated/prisma";

export class DepartmentController extends BaseController<Department> {
  protected service: DepartmentService;

  constructor() {
    super();
    this.service = new DepartmentService();
  }

  findActive = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const ctx = this.getContext(req, res);
      const roles = await this.service.findActiveDepartments(ctx);
      appResponder(StatusCodes.OK, roles, res);
    } catch (error) {
      next(error);
    }
  };
}
