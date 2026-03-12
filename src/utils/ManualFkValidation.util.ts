import { prisma } from "src";
import { Prisma } from "src/generated/prisma";
import { StatusCodes } from "http-status-codes";
import { AppError } from "./AppError.util";

export type RefTable =
  | "gasPurchaseOrder"
  | "gasBottlePurchaseOrder"
  | "accessoryPurchaseOrder"
  | "supplier"
  | "exploitationDepot"
  | "user";

interface TableConfig {
  prismaModel: Prisma.ModelName;
  hasSoftDelete: boolean;
  softDeleteField?: string;
}

const TABLE_CONFIG: Record<RefTable, TableConfig> = {
  gasPurchaseOrder: {
    prismaModel: "GasPurchaseOrder",
    hasSoftDelete: true,
    softDeleteField: "deletedAt",
  },
  gasBottlePurchaseOrder: {
    prismaModel: "GasBottlePurchaseOrder",
    hasSoftDelete: true,
    softDeleteField: "deletedAt",
  },
  accessoryPurchaseOrder: {
    prismaModel: "AccessoryPurchaseOrder",
    hasSoftDelete: true,
    softDeleteField: "deletedAt",
  },
  supplier: {
    prismaModel: "Supplier",
    hasSoftDelete: true,
    softDeleteField: "deletedAt",
  },
  exploitationDepot: {
    prismaModel: "ExploitationDepot",
    hasSoftDelete: false,
  },
  user: {
    prismaModel: "User",
    hasSoftDelete: true,
    softDeleteField: "deletedAt",
  },
};

export interface FkReference {
  refTable: RefTable;
  recordId: string;
  context?: string;
}

interface ValidationOptions {
  excludeSoftDeleted?: boolean;
  failFast?: boolean;
}

class ManualFkValidator {
  static isValidRefTable(refTable: string): refTable is RefTable {
    return refTable in TABLE_CONFIG;
  }

  static assertValidRefTable(refTable: string): asserts refTable is RefTable {
    if (!this.isValidRefTable(refTable)) {
      throw new AppError(
        "error.manualfk.invalid_ref_table",
        StatusCodes.INTERNAL_SERVER_ERROR,
        { refTable, supportedTables: Object.keys(TABLE_CONFIG) }
      );
    }
  }

  static async exists(
    refTable: RefTable,
    recordId: string,
    options: Pick<ValidationOptions, "excludeSoftDeleted"> = {}
  ): Promise<boolean> {
    const { excludeSoftDeleted = true } = options;
    const config = TABLE_CONFIG[refTable];

    if (!config) {
      return false;
    }

    try {
      const delegate = prisma[refTable] as unknown as {
        findUnique: (args: {
          where: { id: string };
          select: Record<string, boolean>;
        }) => Promise<Record<string, unknown> | null>;
      };

      const selectFields: Record<string, boolean> = { id: true };
      if (config.hasSoftDelete && config.softDeleteField) {
        selectFields[config.softDeleteField] = true;
      }

      const record = await delegate.findUnique({
        where: { id: recordId },
        select: selectFields,
      });

      if (!record) {
        return false;
      }

      if (
        excludeSoftDeleted &&
        config.hasSoftDelete &&
        config.softDeleteField &&
        record[config.softDeleteField] !== null
      ) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  static async assertExists(
    refTable: RefTable,
    recordId: string,
    options: Pick<ValidationOptions, "excludeSoftDeleted"> & {
      context?: string;
    } = {}
  ): Promise<void> {
    const { context, ...validationOptions } = options;
    const exists = await this.exists(refTable, recordId, validationOptions);

    if (!exists) {
      throw new AppError(
        "error.manualfk.record_not_found",
        StatusCodes.NOT_FOUND,
        {
          refTable,
          recordId,
          ...(context && { context }),
        }
      );
    }
  }

  static async assertAllExist(
    references: FkReference[],
    options: ValidationOptions = {}
  ): Promise<void> {
    const { excludeSoftDeleted = true, failFast = false } = options;

    if (references.length === 0) {
      return;
    }

    const errors: Array<{
      refTable: RefTable;
      recordId: string;
      context?: string;
    }> = [];

    if (!failFast) {
      const results = await Promise.all(
        references.map(async (ref) => {
          const exists = await this.exists(ref.refTable, ref.recordId, {
            excludeSoftDeleted,
          });
          return { ...ref, exists };
        })
      );

      for (const result of results) {
        if (!result.exists) {
          errors.push({
            refTable: result.refTable,
            recordId: result.recordId,
            context: result.context,
          });
        }
      }
    } else {
      for (const ref of references) {
        const exists = await this.exists(ref.refTable, ref.recordId, {
          excludeSoftDeleted,
        });
        if (!exists) {
          throw new AppError(
            "error.manualfk.record_not_found",
            StatusCodes.NOT_FOUND,
            {
              refTable: ref.refTable,
              recordId: ref.recordId,
              ...(ref.context && { context: ref.context }),
            }
          );
        }
      }
    }

    if (errors.length > 0) {
      throw new AppError(
        "error.manualfk.multiple_records_not_found",
        StatusCodes.NOT_FOUND,
        {
          count: errors.length,
          references: errors,
        }
      );
    }
  }

  static async assertValidAndExists(
    refTable: string,
    recordId: string,
    options: Pick<ValidationOptions, "excludeSoftDeleted"> & {
      context?: string;
    } = {}
  ): Promise<void> {
    this.assertValidRefTable(refTable);
    await this.assertExists(refTable, recordId, options);
  }

  static async checkMultiple(
    references: FkReference[],
    options: Pick<ValidationOptions, "excludeSoftDeleted"> = {}
  ): Promise<{
    valid: FkReference[];
    invalid: FkReference[];
  }> {
    const results = await Promise.all(
      references.map(async (ref) => ({
        ref,
        exists: await this.exists(ref.refTable, ref.recordId, options),
      }))
    );

    return {
      valid: results.filter((r) => r.exists).map((r) => r.ref),
      invalid: results.filter((r) => !r.exists).map((r) => r.ref),
    };
  }
}

export default ManualFkValidator;

export class OrphanDetector {
  static async findOrphans(): Promise<{
    approvals: Array<{ id: string; refTable: string; recordId: string }>;
    invoices: Array<{ id: string; refTable: string; orderId: string }>;
    documents: Array<{ id: string; refTable: string; recordId: string }>;
  }> {
    const [approvals, invoices, documents] = await Promise.all([
      this.findOrphanedApprovals(),
      this.findOrphanedInvoices(),
      this.findOrphanedDocuments(),
    ]);

    return { approvals, invoices, documents };
  }

  private static async findOrphanedApprovals(): Promise<
    Array<{ id: string; refTable: string; recordId: string }>
  > {
    const approvals = await prisma.approval.findMany({
      select: { id: true, refTable: true, recordId: true },
    });

    const orphans: Array<{ id: string; refTable: string; recordId: string }> =
      [];

    for (const approval of approvals) {
      if (!ManualFkValidator.isValidRefTable(approval.refTable)) {
        orphans.push(approval);
        continue;
      }

      const exists = await ManualFkValidator.exists(
        approval.refTable,
        approval.recordId,
        { excludeSoftDeleted: false }
      );

      if (!exists) {
        orphans.push(approval);
      }
    }

    return orphans;
  }

  private static async findOrphanedInvoices(): Promise<
    Array<{ id: string; refTable: string; orderId: string }>
  > {
    const invoices = await prisma.exploitationInvoice.findMany({
      where: { deletedAt: null },
      select: { id: true, refTable: true, orderId: true },
    });

    const orphans: Array<{ id: string; refTable: string; orderId: string }> =
      [];

    for (const invoice of invoices) {
      if (!ManualFkValidator.isValidRefTable(invoice.refTable)) {
        orphans.push(invoice);
        continue;
      }

      const exists = await ManualFkValidator.exists(
        invoice.refTable,
        invoice.orderId,
        { excludeSoftDeleted: false }
      );

      if (!exists) {
        orphans.push(invoice);
      }
    }

    return orphans;
  }

  private static async findOrphanedDocuments(): Promise<
    Array<{ id: string; refTable: string; recordId: string }>
  > {
    const documents = await prisma.exploitationDocument.findMany({
      select: { id: true, refTable: true, recordId: true },
    });

    const orphans: Array<{ id: string; refTable: string; recordId: string }> =
      [];

    for (const doc of documents) {
      if (!ManualFkValidator.isValidRefTable(doc.refTable)) {
        orphans.push(doc);
        continue;
      }

      const exists = await ManualFkValidator.exists(
        doc.refTable,
        doc.recordId,
        {
          excludeSoftDeleted: false,
        }
      );

      if (!exists) {
        orphans.push(doc);
      }
    }

    return orphans;
  }

  static async cleanup(dryRun: boolean = true): Promise<{
    dryRun: boolean;
    approvals: { count: number; ids: string[] };
    invoices: { count: number; ids: string[] };
    documents: { count: number; ids: string[] };
  }> {
    const orphans = await this.findOrphans();

    const result = {
      dryRun,
      approvals: {
        count: orphans.approvals.length,
        ids: orphans.approvals.map((a) => a.id),
      },
      invoices: {
        count: orphans.invoices.length,
        ids: orphans.invoices.map((i) => i.id),
      },
      documents: {
        count: orphans.documents.length,
        ids: orphans.documents.map((d) => d.id),
      },
    };

    if (dryRun) {
      return result;
    }

    const hasOrphans =
      result.approvals.count > 0 ||
      result.invoices.count > 0 ||
      result.documents.count > 0;

    if (!hasOrphans) {
      return result;
    }

    await prisma.$transaction(async (tx) => {
      if (result.approvals.ids.length > 0) {
        await tx.approvalStep.deleteMany({
          where: { approvalId: { in: result.approvals.ids } },
        });
        await tx.approval.deleteMany({
          where: { id: { in: result.approvals.ids } },
        });
      }

      if (result.invoices.ids.length > 0) {
        await tx.exploitationInvoice.updateMany({
          where: { id: { in: result.invoices.ids } },
          data: { deletedAt: new Date() },
        });
      }

      if (result.documents.ids.length > 0) {
        await tx.exploitationDocument.deleteMany({
          where: { id: { in: result.documents.ids } },
        });
      }
    });

    return result;
  }
}
