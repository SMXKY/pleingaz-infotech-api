import { BaseController } from "src/base/BaseController";
import { PermissionOverrideService } from "./permissionOverride.service";
import { PermissionOverride } from "src/generated/prisma";

export class PermissionOverrideController extends BaseController<PermissionOverride> {
  protected service: PermissionOverrideService;

  constructor() {
    super();
    this.service = new PermissionOverrideService();
  }
}
