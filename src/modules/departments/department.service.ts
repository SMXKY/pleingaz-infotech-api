import { BaseService } from "src/base/BaseService";
import { DepartmentRepository } from "./department.repository";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from "./department.schema";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { ServiceContext } from "@appTypes/base.types";
import { Department } from "src/generated/prisma";

export class DepartmentService extends BaseService<
  Department,
  CreateDepartmentInput,
  UpdateDepartmentInput
> {
  protected repository: DepartmentRepository;
  protected tableName = "departments";
  protected createSchema = createDepartmentSchema;
  protected updateSchema = updateDepartmentSchema;

  constructor() {
    super();
    this.repository = new DepartmentRepository();
  }

  protected async beforeCreate(
    data: CreateDepartmentInput,
    ctx: ServiceContext
  ): Promise<CreateDepartmentInput> {
    return data;
  }

  protected async beforeUpdate(
    id: string,
    data: UpdateDepartmentInput,
    ctx: ServiceContext
  ): Promise<UpdateDepartmentInput> {
    return data;
  }

  protected async beforeDelete(id: string, ctx: ServiceContext): Promise<void> {
    const numberOfUsers = await this.repository.findUsersInDepartment(id);
    if (numberOfUsers && numberOfUsers > 0) {
      throw new AppError("error.department.has_users", StatusCodes.BAD_REQUEST);
    }
  }

  async findByName(name: string): Promise<Department | null> {
    return this.repository.findByName(name);
  }

  async findActiveDepartments(ctx: ServiceContext): Promise<Department[]> {
    return this.repository.findActiveDepartments();
  }

  async delete(
    id: string,
    ctx: ServiceContext,
    soft: boolean = true
  ): Promise<Department> {
    if (soft) {
      return this.repository.softDelete(id, ["name", "code"]);
    }
    return this.repository.delete(id);
  }
}
