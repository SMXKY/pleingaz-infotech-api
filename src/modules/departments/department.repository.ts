import prisma from "@models/index.model";
import { BaseRepository } from "src/base/BaseRepository";
import { Department } from "src/generated/prisma";

export class DepartmentRepository extends BaseRepository<Department> {
  protected modelName = "Department";

  async findByName(name: string): Promise<Department | null> {
    return this.model.findFirst({
      where: { name, deletedAt: null },
    });
  }

  async findActiveDepartments(): Promise<Department[]> {
    return this.model.findMany({
      where: { isActive: true, deletedAt: null },
    });
  }

  async findUsersInDepartment(id: string): Promise<number> {
    const users = await prisma.user.findMany({
      where: {
        departmentId: id,
      },
    });
    return users.length;
  }
}
