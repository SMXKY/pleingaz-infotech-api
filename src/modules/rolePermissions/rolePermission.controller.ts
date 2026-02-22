import { BaseController } from "src/base/BaseController";
import { RolePermissionService } from "./rolePermission.service";
import { RolePermission } from "src/generated/prisma";

export class RolePermissionController extends BaseController<RolePermission> {
  protected service: RolePermissionService;

  constructor() {
    super();
    this.service = new RolePermissionService();
  }
}
