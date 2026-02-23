export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Pliengaz - Infotech API",
    version: "1.0.0",
    description: `
# Pliengaz – Infotech API

Backend API for the **Pliengaz ERP system**, built for INFOTECH S.A., a gas distribution company in Cameroon.

---

## Global Request Headers

Every request to this API can (or must) include the following headers. Understanding them is critical for correct integration.

---

### \`x-lang\` — Language Preference

**Optional** | Default: \`FR\`

Controls the language of all human-readable response messages (errors, labels, notifications). Does **not** affect data fields like names or descriptions stored in the database.

| Value | Language |
|-------|----------|
| \`FR\`  | French (default) |
| \`ENG\` | English |

If the header is missing or contains an invalid value, the API silently falls back to \`FR\`.

> **Frontend tip:** Set this once globally in your Axios/Fetch interceptor based on the user's locale setting. Do not send it per-request manually.

---

### \`x-currency\` — Currency Preference

**Optional** | Default: \`FCFA\`

Controls how monetary values are formatted and returned in responses. The API stores all amounts internally in **FCFA** and converts on the fly when this header is set.

| Value  | Currency                  |
|--------|---------------------------|
| \`FCFA\` | Central African Franc (default) |
| \`USD\`  | US Dollar                 |
| \`EUR\`  | Euro                      |

Conversion rates are applied server-side. The response will include the currency context so the frontend knows how to label amounts.

> **Frontend tip:** Mirror the user's currency preference (stored in their profile or localStorage) and send it with every request via interceptor.

---

### \`Authorization\` — Bearer Token (JWT)

**Required on all protected routes**

Authentication is handled via **JWT (JSON Web Token)**. After a successful login, the server returns an \`accessToken\`. Include it in every subsequent request as a Bearer token.

\`\`\`
Authorization: Bearer <accessToken>
\`\`\`

**Token behavior:**
- Tokens are short-lived (expiry defined server-side).
- When a token expires, the API returns \`401 Unauthorized\`.
- A \`refreshToken\` is issued at login and should be used to obtain a new \`accessToken\` without re-authenticating.
- Refresh tokens are rotated on each use — store the latest one.

**Role-based access:**  
The JWT payload contains the authenticated user's role and permissions. Protected routes validate these server-side — sending a valid token is not enough if the user lacks the required permission for that endpoint. The API returns \`403 Forbidden\` in that case.

> **Frontend tip:** Set up a response interceptor that catches \`401\` responses, attempts a silent token refresh, and retries the original request. If refresh also fails, redirect to login.

---

## Error Response Format

All errors follow a consistent shape:

\`\`\`json
{
  "success": false,
  "message": "Human-readable error message (language from x-lang header)",
  "code": "ERROR_CODE_CONSTANT",
  "statusCode": 403
}
\`\`\`

| Field       | Description |
|-------------|-------------|
| \`success\`   | Always \`false\` on error |
| \`message\`   | Localized message based on \`x-lang\` header |
| \`code\`      | Machine-readable constant — use this for frontend logic, not \`message\` |
| \`statusCode\`| Mirrors the HTTP status code |

> **Frontend tip:** Always branch your error handling on \`code\`, never on \`message\` — messages can change or be translated, codes are stable.
    `,
  },
  servers: [
    {
      url: "",
      description: "Local server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "JWT access token obtained from the `/auth/login` endpoint. Include as `Authorization: Bearer <token>` on all protected routes. Returns 401 when expired — use the refresh token endpoint to renew.",
      },
    },
    parameters: {
      XLangHeader: {
        in: "header",
        name: "x-lang",
        schema: { type: "string", enum: ["ENG", "FR"] },
        required: false,
        description:
          "Language preference for response messages. Defaults to `FR` if not provided or invalid. Set globally via request interceptor.",
        example: "ENG",
      },
      XCurrencyHeader: {
        in: "header",
        name: "x-currency",
        schema: { type: "string", enum: ["USD", "EUR", "FCFA"] },
        required: false,
        description:
          "Currency preference for monetary values in responses. Defaults to `FCFA` if not provided. All values are stored in FCFA and converted server-side.",
        example: "EUR",
      },
      // ─── Reusable query params for all list endpoints ───────────────────
      PageParam: {
        in: "query",
        name: "page",
        schema: { type: "integer", default: 1, minimum: 1 },
        required: false,
        description: "Page number for pagination. Defaults to 1.",
      },
      LimitParam: {
        in: "query",
        name: "limit",
        schema: { type: "integer", default: 20, minimum: 1, maximum: 100 },
        required: false,
        description: "Number of records per page. Defaults to 20.",
      },
      SortByParam: {
        in: "query",
        name: "sortBy",
        schema: { type: "string", default: "createdAt" },
        required: false,
        description: "Field name to sort results by. Defaults to `createdAt`.",
      },
      SortOrderParam: {
        in: "query",
        name: "sortOrder",
        schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
        required: false,
        description: "Sort direction. Defaults to `desc`.",
      },
      IncludeParam: {
        in: "query",
        name: "include",
        schema: { type: "string" },
        required: false,
        description:
          "Comma-separated list of relations to eager-load. Example: `?include=role,department`. Only valid relation names for the resource are accepted.",
        example: "role,department",
      },
      HardDeleteParam: {
        in: "query",
        name: "hard",
        schema: { type: "boolean", default: false },
        required: false,
        description:
          "When `true`, performs a permanent (hard) delete. Default is soft delete: sets `deletedAt` timestamp, preserves the record, frees unique constraints by appending `_deleted_<timestamp>` to unique fields. Hard delete completely removes the record from the database and cannot be undone.",
      },
      IdParam: {
        in: "path",
        name: "id",
        schema: { type: "string", format: "uuid" },
        required: true,
        description: "UUID of the target resource.",
        example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      },
    },
    schemas: {
      // ─── Global reusable types ───────────────────────────────────────────

      PaginationMeta: {
        type: "object",
        description:
          "Pagination metadata returned on all list endpoints. Always present alongside the `data` array.",
        properties: {
          total: {
            type: "integer",
            description:
              "Total number of records matching the current filters (across all pages).",
            example: 42,
          },
          page: {
            type: "integer",
            description: "Current page number.",
            example: 1,
          },
          limit: {
            type: "integer",
            description: "Number of records per page as requested.",
            example: 20,
          },
          totalPages: {
            type: "integer",
            description: "Total number of pages based on `total` and `limit`.",
            example: 3,
          },
          hasNextPage: {
            type: "boolean",
            description: "Whether there is a next page available.",
            example: true,
          },
          hasPrevPage: {
            type: "boolean",
            description: "Whether there is a previous page available.",
            example: false,
          },
        },
        required: [
          "total",
          "page",
          "limit",
          "totalPages",
          "hasNextPage",
          "hasPrevPage",
        ],
      },

      ErrorResponse: {
        type: "object",
        description:
          "Standard error envelope returned on all 4xx/5xx responses. The `message` field is localized via `x-lang`. Always use `status` for programmatic error handling, never `message`.",
        properties: {
          ok: {
            type: "boolean",
            example: false,
            description: "Always `false` on error responses.",
          },
          status: {
            type: "string",
            enum: ["fail", "error"],
            description:
              "`fail` for 4xx client errors (bad input, unauthorized, not found). `error` for 5xx server errors.",
            example: "fail",
          },
          message: {
            type: "string",
            description:
              "Localized, human-readable error message. Language depends on the `x-lang` request header. **Do not use this field for logic** — it may change. Use `status` and the HTTP status code instead.",
            example: "Ce département contient des utilisateurs actifs.",
          },
        },
        required: ["ok", "status", "message"],
      },

      // ─── Department ──────────────────────────────────────────────────────

      Department: {
        type: "object",
        description: `
A Department represents an organizational unit within INFOTECH S.A. (e.g. Sales, Accounting, Logistics).
Every User must belong to exactly one Department.

**System records:** Some departments are seeded as \`isSystem: true\`. These cannot be modified or deleted — any attempt returns \`403 Forbidden\`.

**Soft delete behavior:** Deleting a department sets \`deletedAt\` and appends \`_deleted_<timestamp>\` to both \`name\` and \`code\` so those values can be reused immediately. The record is recoverable via the restore endpoint.

**Constraint:** A department cannot be deleted if it has active users assigned to it. The API returns \`400\` with a localized message if you attempt this.
        `,
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "Unique identifier. UUID v4, auto-generated.",
            example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          },
          name: {
            type: "string",
            description:
              "Full department name. Must be unique across all non-deleted departments. Min 2 characters.",
            example: "Comptabilité",
          },
          code: {
            type: "string",
            description:
              "Short department code. Always stored in UPPERCASE. Must be unique. 2–10 characters. Used for display in compact views.",
            example: "COMPTA",
          },
          isSystem: {
            type: "boolean",
            nullable: true,
            description:
              "If `true`, this department was seeded by the system and is immutable. Create/update/delete operations on system records return `403`.",
            example: false,
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "ISO 8601 timestamp of when the record was created.",
            example: "2024-01-15T08:30:00.000Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            description: "ISO 8601 timestamp of the last update.",
            example: "2024-06-01T14:22:00.000Z",
          },
        },
        required: ["id", "name", "code", "createdAt", "updatedAt"],
      },

      CreateDepartmentInput: {
        type: "object",
        description:
          "Request body for creating a new department. Validated via Zod before hitting the database.",
        properties: {
          name: {
            type: "string",
            minLength: 2,
            description:
              "Department name. Trimmed automatically. Must be unique.",
            example: "Ressources Humaines",
          },
          code: {
            type: "string",
            minLength: 2,
            maxLength: 10,
            description:
              "Short code. Automatically converted to UPPERCASE and trimmed. Must be unique. Max 10 characters.",
            example: "RH",
          },
        },
        required: ["name", "code"],
      },

      UpdateDepartmentInput: {
        type: "object",
        description:
          "Request body for updating a department. All fields are optional — only send fields you want to change. Same validation rules as create apply to each field provided.",
        properties: {
          name: {
            type: "string",
            minLength: 2,
            description: "New department name. Trimmed automatically.",
            example: "Direction Générale",
          },
          code: {
            type: "string",
            minLength: 2,
            maxLength: 10,
            description:
              "New department code. Automatically UPPERCASED and trimmed.",
            example: "DG",
          },
        },
      },

      // ─── Role ────────────────────────────────────────────────────────────

      Role: {
        type: "object",
        description: `
A Role defines a job function or access tier within INFOTECH S.A. Every User must have exactly one Role.
The Role determines the base permission set the user operates with.

**How permissions work:**
A role's effective permissions come from \`RolePermission\` records linking the role to individual \`Permission\` entries.
On top of that, individual users can have \`PermissionOverride\` records that grant or revoke specific permissions
regardless of their role. The final permission set the system checks is: role permissions + granted overrides − revoked overrides.

**Permission cache:** When a role's permissions change (assign, disable, enable, delete), the permission cache is
automatically invalidated for **all users currently holding that role** so changes take effect immediately without requiring re-login.

**System records:** Roles with \`isSystem: true\` are seeded by the system and cannot be modified, disabled, or deleted.

**Soft delete:** Deleting a role appends \`_deleted_<timestamp>\` to \`name\` to free the unique constraint.
A role with active users assigned cannot be deleted — reassign users first.
        `,
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "UUID v4, auto-generated.",
            example: "c3d4e5f6-a7b8-9012-cdef-123456789012",
          },
          name: {
            type: "string",
            description: "Unique role name. Min 2 characters.",
            example: "Comptable Senior",
          },
          description: {
            type: "string",
            description: "Human-readable explanation of what this role is for.",
            example: "Manages all accounting operations and financial reports.",
          },
          isActive: {
            type: "boolean",
            description:
              "Whether the role is active. Inactive roles still exist but users holding them effectively lose all permissions derived from the role. Use disable/enable endpoints to toggle — do not set this via the update endpoint directly.",
            example: true,
          },
          isSystem: {
            type: "boolean",
            nullable: true,
            description:
              "If `true`, this role is immutable. All write operations return `403`.",
            example: false,
          },
          createdAt: {
            type: "string",
            format: "date-time",
            example: "2024-01-15T08:30:00.000Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            example: "2024-06-01T14:22:00.000Z",
          },
        },
        required: [
          "id",
          "name",
          "description",
          "isActive",
          "createdAt",
          "updatedAt",
        ],
      },

      RoleWithPermissions: {
        type: "object",
        description:
          "A Role object with its full `rolePermissions` relation included, each containing the full `Permission` record.",
        allOf: [
          { $ref: "#/components/schemas/Role" },
          {
            type: "object",
            properties: {
              rolePermissions: {
                type: "array",
                description:
                  "All active permissions assigned to this role via RolePermission join records.",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    roleId: { type: "string", format: "uuid" },
                    permissionId: { type: "string", format: "uuid" },
                    permission: { $ref: "#/components/schemas/Permission" },
                    createdAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        ],
      },

      Permission: {
        type: "object",
        description: `
A granular permission tied to a specific module, submodule, and action within the ERP.

**Code format:** \`MODULE.SUBMODULE.ACTION\` — e.g. \`ACCOUNTING.SUPPLIER_INVOICES.READ\`.

**Wildcard permissions:** If \`isWildcard\` is true, this permission covers all actions within its module/submodule. The permission resolution engine in \`getUserPermissions\` expands wildcards — e.g. \`ACCOUNTING.*\` resolves to every permission whose code starts with \`ACCOUNTING.\`.

**Implies:** A permission can imply other permissions via the \`PermissionImplies\` relation (e.g. \`APPROVE\` might imply \`READ\`). Implied permissions are automatically granted when the parent is granted. The frontend does not need to handle implication chains — they are fully expanded server-side.

**Risk levels:** \`LOW\`, \`MEDIUM\`, \`HIGH\`, \`CRITICAL\`. Use in UI to show warnings or confirmation dialogs before granting HIGH/CRITICAL permissions. Permissions are seeded and rarely change at runtime.

**Module/Submodule structure:**
\`\`\`
EXPLOITATION       → GAS_ORDERS, SUPPLIER_MANAGEMENT, SAFETY_CAPS_JOINTS
LOGISTICS          → VEHICLE_INSPECTION, FUEL_MANAGEMENT, DRIVER_DOCUMENTS, TRANSPORT_RECEIPTS, POCKET_ALLOWANCE
SALES              → TRANSACTIONS, WAREHOUSE_STOCK, DISCOUNTS, CASH_RECONCILIATION, AGENCIES
FILLING_PRODUCTION → TANK_MANAGEMENT, BOTTLE_TRACKING, PRODUCTION_RECORDS, STOCK_RECONCILIATION
ACCOUNTING         → SUPPLIER_INVOICES, CUSTOMER_INVOICES, CASH_BANK, PAYROLL, FIXED_ASSETS, TAX_DECLARATIONS, FINANCIAL_REPORTS
HUMAN_RESOURCES    → ATTENDANCE, RECRUITMENT, SALARY_MANAGEMENT, LEAVE_PERMISSION, MISSIONS
LEGAL              → MAIL_MANAGEMENT, INSURANCE, ACCIDENTS, DEBT_RECOVERY, CONTRACTS, COMPLAINTS, CONVOCATIONS
MAINTENANCE_TECHNICAL → FAULT_DECLARATION, MAINTENANCE_WORKFLOW, TECHNICIAN_ASSIGNMENT, SPARE_PARTS, MAINTENANCE_REPORTS
RESEARCH_DEVELOPMENT  → PROJECTS, PROJECT_MONITORING, INVESTMENT_ANALYSIS
ADMIN              → USERS, ROLES, PERMISSIONS, SYSTEM_CONFIG, AUDIT_LOGS
USER_MANAGEMENT    → (user-level controls)
\`\`\`

**Available actions:** \`CREATE\`, \`READ\`, \`UPDATE\`, \`DELETE\`, \`APPROVE\`, \`REJECT\`, \`EXPORT\`, \`IMPORT\`
        `,
        properties: {
          id: { type: "string", format: "uuid" },
          code: {
            type: "string",
            description:
              "Unique machine-readable identifier. Format: `MODULE.SUBMODULE.ACTION`.",
            example: "ACCOUNTING.SUPPLIER_INVOICES.CREATE",
          },
          engName: {
            type: "string",
            description: "English display name.",
            example: "Create Supplier Invoice",
          },
          frName: {
            type: "string",
            description: "French display name.",
            example: "Créer une facture fournisseur",
          },
          description: {
            type: "string",
            nullable: true,
            description:
              "Optional longer explanation of what this permission controls.",
          },
          module: {
            type: "string",
            enum: [
              "EXPLOITATION",
              "LOGISTICS",
              "SALES",
              "FILLING_PRODUCTION",
              "ACCOUNTING",
              "HUMAN_RESOURCES",
              "LEGAL",
              "MAINTENANCE_TECHNICAL",
              "RESEARCH_DEVELOPMENT",
              "ADMIN",
              "USER_MANAGEMENT",
            ],
            description:
              "Top-level business module this permission belongs to.",
          },
          submodule: {
            type: "string",
            description: "Functional area within the module.",
            example: "SUPPLIER_INVOICES",
          },
          action: {
            type: "string",
            enum: [
              "CREATE",
              "READ",
              "UPDATE",
              "DELETE",
              "APPROVE",
              "REJECT",
              "EXPORT",
              "IMPORT",
            ],
            description: "The operation this permission grants.",
          },
          riskLevel: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            description:
              "Sensitivity level. Use in UI to show warnings before granting HIGH or CRITICAL permissions.",
            example: "MEDIUM",
          },
          isWildcard: {
            type: "boolean",
            description:
              "If true, grants all matching actions via prefix expansion during permission resolution.",
            example: false,
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        required: [
          "id",
          "code",
          "engName",
          "frName",
          "module",
          "submodule",
          "action",
          "riskLevel",
          "isWildcard",
        ],
      },

      CreatePermissionInput: {
        type: "object",
        description: `
Creates a new permission record. Permissions are typically seeded at system setup and rarely created at runtime — they represent the fixed capabilities of the ERP.

**\`code\`** is the machine-readable identifier used in all permission checks. It must follow the \`MODULE.SUBMODULE.ACTION\` convention but is not auto-generated — you supply it explicitly.

**Wildcard permissions** (set \`isWildcard: true\`) should have a \`code\` ending in \`.*\` or just \`*\`, e.g. \`ACCOUNTING.*\`. The permission engine will expand these at resolution time.
        `,
        properties: {
          engName: {
            type: "string",
            minLength: 1,
            description: "English name for UI display.",
            example: "Approve Supplier Invoice",
          },
          frName: {
            type: "string",
            minLength: 1,
            description: "French name for UI display.",
            example: "Approuver une facture fournisseur",
          },
          code: {
            type: "string",
            minLength: 1,
            description:
              "Unique code. Format: `MODULE.SUBMODULE.ACTION`. Must be globally unique.",
            example: "ACCOUNTING.SUPPLIER_INVOICES.APPROVE",
          },
          description: {
            type: "string",
            description:
              "Optional explanation of what this permission controls.",
          },
          module: {
            type: "string",
            enum: [
              "EXPLOITATION",
              "LOGISTICS",
              "SALES",
              "FILLING_PRODUCTION",
              "ACCOUNTING",
              "HUMAN_RESOURCES",
              "LEGAL",
              "MAINTENANCE_TECHNICAL",
              "RESEARCH_DEVELOPMENT",
              "ADMIN",
              "USER_MANAGEMENT",
            ],
          },
          submodule: {
            type: "string",
            enum: [
              "GAS_ORDERS",
              "SUPPLIER_MANAGEMENT",
              "SAFETY_CAPS_JOINTS",
              "VEHICLE_INSPECTION",
              "FUEL_MANAGEMENT",
              "DRIVER_DOCUMENTS",
              "TRANSPORT_RECEIPTS",
              "POCKET_ALLOWANCE",
              "TRANSACTIONS",
              "WAREHOUSE_STOCK",
              "DISCOUNTS",
              "CASH_RECONCILIATION",
              "AGENCIES",
              "TANK_MANAGEMENT",
              "BOTTLE_TRACKING",
              "PRODUCTION_RECORDS",
              "STOCK_RECONCILIATION",
              "SUPPLIER_INVOICES",
              "CUSTOMER_INVOICES",
              "CASH_BANK",
              "PAYROLL",
              "FIXED_ASSETS",
              "TAX_DECLARATIONS",
              "FINANCIAL_REPORTS",
              "ATTENDANCE",
              "RECRUITMENT",
              "SALARY_MANAGEMENT",
              "LEAVE_PERMISSION",
              "MISSIONS",
              "MAIL_MANAGEMENT",
              "INSURANCE",
              "ACCIDENTS",
              "DEBT_RECOVERY",
              "CONTRACTS",
              "COMPLAINTS",
              "CONVOCATIONS",
              "FAULT_DECLARATION",
              "MAINTENANCE_WORKFLOW",
              "TECHNICIAN_ASSIGNMENT",
              "SPARE_PARTS",
              "MAINTENANCE_REPORTS",
              "PROJECTS",
              "PROJECT_MONITORING",
              "INVESTMENT_ANALYSIS",
              "USERS",
              "ROLES",
              "PERMISSIONS",
              "SYSTEM_CONFIG",
              "AUDIT_LOGS",
            ],
          },
          action: {
            type: "string",
            enum: [
              "CREATE",
              "READ",
              "UPDATE",
              "DELETE",
              "APPROVE",
              "REJECT",
              "EXPORT",
              "IMPORT",
            ],
          },
          isWildcard: {
            type: "boolean",
            default: false,
            description:
              "Set to `true` for wildcard permissions. Code should end with `.*`.",
          },
          riskLevel: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            default: "LOW",
          },
        },
        required: [
          "engName",
          "frName",
          "code",
          "module",
          "submodule",
          "action",
        ],
      },

      UpdatePermissionInput: {
        type: "object",
        description:
          "Updates a permission record. All fields optional. Changing `code` will affect all existing `RolePermission` and `PermissionOverride` records that reference it by code string — update with care.",
        properties: {
          engName: { type: "string", minLength: 1 },
          frName: { type: "string", minLength: 1 },
          code: {
            type: "string",
            minLength: 1,
            description:
              "⚠️ Changing this may break permission checks if not updated consistently.",
          },
          description: { type: "string" },
          module: {
            type: "string",
            enum: [
              "EXPLOITATION",
              "LOGISTICS",
              "SALES",
              "FILLING_PRODUCTION",
              "ACCOUNTING",
              "HUMAN_RESOURCES",
              "LEGAL",
              "MAINTENANCE_TECHNICAL",
              "RESEARCH_DEVELOPMENT",
              "ADMIN",
              "USER_MANAGEMENT",
            ],
          },
          submodule: { type: "string" },
          action: {
            type: "string",
            enum: [
              "CREATE",
              "READ",
              "UPDATE",
              "DELETE",
              "APPROVE",
              "REJECT",
              "EXPORT",
              "IMPORT",
            ],
          },
          isWildcard: { type: "boolean" },
          riskLevel: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
          },
        },
      },

      PermissionOverrideInput: {
        type: "object",
        description: `
Grants a specific permission directly to a user, bypassing their role.

This is an **upsert** — if a soft-deleted or expired override already exists for this \`userId\`/\`permissionId\` pair, it is reactivated rather than creating a duplicate. If an active (non-expired, non-deleted) override already exists, the endpoint returns \`409\`.

**Constraints:**
- User must exist, not be deleted, not be a system user.
- User must be \`ACTIVE\` (not \`TERMINATED\` or \`SUSPENDED\`).
- Permission must exist and not be deleted.

Permission cache is invalidated immediately on success — the user's next authenticated request will reflect the new permission.

To undo, use \`PATCH /api/v1/permissions/revoke-override\`.
        `,
        properties: {
          userId: {
            type: "string",
            format: "uuid",
            description: "Target user to receive the permission.",
          },
          permissionId: {
            type: "string",
            format: "uuid",
            description: "Permission to grant.",
          },
          reason: {
            type: "string",
            minLength: 10,
            maxLength: 255,
            description: "Mandatory justification (10–255 chars).",
            example: "Granted temporary read access for external audit.",
          },
          expiresAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            description:
              "Optional expiry. If omitted, override is permanent. When set, `isTemporary` is automatically `true`.",
            example: "2025-06-30T23:59:59.000Z",
          },
        },
        required: ["userId", "permissionId", "reason"],
      },

      RevokePermissionOverrideInput: {
        type: "object",
        description: `
Revokes an active permission override for a user.

Looks up the active (non-deleted, non-expired, \`isGranted: true\`) override by \`userId\` + \`permissionId\`. Sets \`isGranted: false\` and soft-deletes it (\`deletedAt\`).

Returns \`404\` if no matching active override is found.

Permission cache is invalidated immediately — the user loses the permission on their next request.
        `,
        properties: {
          userId: { type: "string", format: "uuid" },
          permissionId: { type: "string", format: "uuid" },
        },
        required: ["userId", "permissionId"],
      },

      CreateRoleInput: {
        type: "object",
        description: "Request body for creating a new role.",
        properties: {
          name: {
            type: "string",
            minLength: 2,
            description: "Unique role name.",
            example: "Responsable Logistique",
          },
          description: {
            type: "string",
            minLength: 1,
            description: "What this role does / who it's for.",
            example:
              "Oversees all logistics operations including transport and fuel.",
          },
          isActive: {
            type: "boolean",
            default: true,
            description: "Whether the role starts active. Defaults to `true`.",
          },
        },
        required: ["name", "description"],
      },

      UpdateRoleInput: {
        type: "object",
        description:
          "All fields optional. Only include what you want to change. Same validation rules apply.",
        properties: {
          name: { type: "string", minLength: 2, example: "Chef Comptable" },
          description: { type: "string", minLength: 1 },
          isActive: {
            type: "boolean",
            description:
              "Prefer using the dedicated `/disable` and `/enable` endpoints to toggle this, as they handle cache invalidation correctly.",
          },
        },
      },

      AssignRolePermissionInput: {
        type: "object",
        description: `
Body for bulk-assigning permissions to a role.

This is an **upsert operation** — if a permission was previously revoked (soft-deleted from \`RolePermission\`), it gets restored.
Permissions already active are left unchanged. This does **not** remove existing permissions — it only adds.

After assignment, the permission cache is invalidated for all users currently holding this role.
        `,
        properties: {
          roleId: {
            type: "string",
            format: "uuid",
            description: "The role to assign permissions to.",
            example: "c3d4e5f6-a7b8-9012-cdef-123456789012",
          },
          permissionIds: {
            type: "array",
            minItems: 1,
            description:
              "Array of permission UUIDs to assign. All must exist and be non-deleted. If any ID is invalid, the entire operation fails.",
            items: { type: "string", format: "uuid" },
            example: ["p1a2b3c4-...", "p2b3c4d5-..."],
          },
        },
        required: ["roleId", "permissionIds"],
      },

      RoleOverrideInput: {
        type: "object",
        description: `
Grants a specific role to a user **temporarily or permanently, in addition to their base role**.

This creates a \`RoleOverride\` record. The user gains all permissions of the override role on top of their existing role's permissions.

**One active override per user/role pair:** If an active non-expired override already exists for this userId/roleId combination, the API returns \`409 Conflict\`. Expired overrides are cleaned up automatically before creating a new one.

**Constraints:**
- The user must be \`ACTIVE\` (not \`TERMINATED\` or \`SUSPENDED\`).
- The target role must be active and non-deleted.
- The user cannot be granted their own base role as an override.
- System users are immutable.
        `,
        properties: {
          roleId: {
            type: "string",
            format: "uuid",
            description: "The role to grant as an override.",
            example: "c3d4e5f6-a7b8-9012-cdef-123456789012",
          },
          userId: {
            type: "string",
            format: "uuid",
            description: "The user receiving the override.",
            example: "u1a2b3c4-d5e6-7890-abcd-ef1234567890",
          },
          reason: {
            type: "string",
            minLength: 10,
            maxLength: 255,
            description:
              "Mandatory justification for the override. Stored in the audit trail.",
            example:
              "Temporarily covering for the Head of Accounting during their leave.",
          },
          expiresAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            description:
              "When the override expires. If omitted, the override is permanent until manually revoked.",
            example: "2025-03-01T00:00:00.000Z",
          },
        },
        required: ["roleId", "userId", "reason"],
      },

      RevokeRoleOverrideInput: {
        type: "object",
        description:
          "Body for revoking an active role override. Identifies the override by userId + roleId combination.",
        properties: {
          userId: {
            type: "string",
            format: "uuid",
            description: "The user whose override is being revoked.",
          },
          roleId: {
            type: "string",
            format: "uuid",
            description: "The role override to revoke.",
          },
        },
        required: ["userId", "roleId"],
      },

      AssignUserRoleInput: {
        type: "object",
        description: `
Permanently reassigns a user's base role.

Unlike role overrides (which are additive and temporary), this changes the user's primary role.
The user's previous role permissions are removed and replaced with the new role's permissions.
Permission cache is invalidated immediately.

**Constraints:**
- User must be \`ACTIVE\` (not \`TERMINATED\`).
- Target role must be active.
- User must not already have the target role.
- System users are immutable.
        `,
        properties: {
          roleId: {
            type: "string",
            format: "uuid",
            description: "The new role to assign to the user.",
          },
          userId: {
            type: "string",
            format: "uuid",
            description: "The user to reassign.",
          },
        },
        required: ["roleId", "userId"],
      },

      MessageResponse: {
        type: "object",
        description:
          "Simple success response for operations that don't return a full resource (enable, disable, assign, revoke, etc.).",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Localized success message.",
                example: "Rôle désactivé avec succès.",
              },
            },
          },
        },
      },

      // ─── User ────────────────────────────────────────────────────────────

      User: {
        type: "object",
        description: `
A User represents an employee of INFOTECH S.A. registered in the ERP system.

**Fields omitted from all responses (Prisma-level global omit):**
\`password\`, \`passwordConfirm\`, \`passwordChangedAt\`, \`failedLoginAttempts\`, \`lockedUntil\`, \`deletedAt\`.
These are **never returned by any endpoint** — the omission is enforced at the database client level, not at the controller level.

**Status lifecycle:**
- \`ACTIVE\` → normal operating state.
- \`SUSPENDED\` → account suspended by admin (e.g. disciplinary action). All permission overrides are also revoked. User cannot log in.
- \`TERMINATED\` → employee no longer works at INFOTECH. Cannot log in, cannot be modified. Soft-deleting a user is different from terminating them.

**Temporary deactivation:** Separate from status — a user can be \`ACTIVE\` but have a \`deactivatedUntil\` date set, which blocks login until that date passes.

**employeeId format:** Auto-generated on creation. Format: \`{companyPrefix}-{YY}{MM}-{NNNN}\`. Example: \`INF-2501-0042\`.

**Authentication:** Users log in with \`username\` or \`email\` + \`password\`. New users receive a setup token via email to create their credentials before their first login.

**Permission resolution:** See \`GET /api/v1/users/me\` response — the login response includes a \`permissions\` array with the user's fully-resolved permission codes (role + overrides + wildcards + implications, all computed server-side).
        `,
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "UUID v4, auto-generated.",
            example: "u1a2b3c4-d5e6-7890-abcd-ef1234567890",
          },
          email: {
            type: "string",
            format: "email",
            description: "Unique. Used for login and system emails.",
            example: "jean.dupont@infotech.cm",
          },
          username: {
            type: "string",
            nullable: true,
            description:
              "Unique. Set by the user during account setup. 3–30 chars, alphanumeric + underscore only. Used for login.",
            example: "jean_dupont",
          },
          name: { type: "string", description: "First name.", example: "Jean" },
          surname: {
            type: "string",
            description: "Last name / family name.",
            example: "Dupont",
          },
          employeeId: {
            type: "string",
            description:
              "Auto-generated unique employee identifier. Format: `{PREFIX}-{YYMM}-{NNNN}`.",
            example: "INF-2501-0042",
          },
          nationalIdNumber: {
            type: "string",
            description:
              "National ID card number. Unique. Required at creation.",
            example: "123456789",
          },
          phoneNumber: {
            type: "string",
            nullable: true,
            description: "Unique. Optional.",
            example: "+237 6XX XXX XXX",
          },
          status: {
            type: "string",
            enum: ["ACTIVE", "SUSPENDED", "TERMINATED"],
            description:
              "Current employment/account status. See model description for lifecycle details.",
            example: "ACTIVE",
          },
          suspensionReason: {
            type: "string",
            nullable: true,
            description:
              "Mandatory reason provided when suspending a user. Null when not suspended.",
            example: "Violation of company policy section 4.2.",
          },
          gender: {
            type: "string",
            enum: ["M", "F"],
            default: "M",
            example: "M",
          },
          dob: {
            type: "string",
            format: "date",
            nullable: true,
            description: "Date of birth. Date only (no time).",
            example: "1990-05-15",
          },
          address: {
            type: "string",
            nullable: true,
            example: "Quartier Bastos, Yaoundé",
          },
          profilePictureUrl: {
            type: "string",
            nullable: true,
            description:
              "FTP-served URL of the user's profile picture. Transformed to a public URL before returning — do not store the raw internal path.",
            example: "https://ftp.infotech.cm/profile/abc123.jpg",
          },
          isEmailVerified: {
            type: "boolean",
            description: "Set to `true` after successful account setup.",
            example: true,
          },
          hireDate: {
            type: "string",
            format: "date",
            description: "Date the employee was hired. Date only.",
            example: "2023-01-10",
          },
          deactivatedUntil: {
            type: "string",
            format: "date-time",
            nullable: true,
            description:
              "If set and in the future, login is blocked even though status is ACTIVE. Cleared by the reactivate endpoint.",
            example: "2025-02-01T00:00:00.000Z",
          },
          lastLoggedInAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Timestamp of last successful login.",
            example: "2024-12-01T09:30:00.000Z",
          },
          emergencyContactName: { type: "string", nullable: true },
          emergencyContactPhoneNumber: { type: "string", nullable: true },
          departmentId: { type: "string", format: "uuid" },
          roleId: { type: "string", format: "uuid" },
          isSystem: {
            type: "boolean",
            nullable: true,
            description:
              "System users are immutable. All write operations return `403`.",
            example: false,
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          department: {
            description: "Always included in findById and findMany responses.",
            allOf: [{ $ref: "#/components/schemas/Department" }],
          },
          role: {
            description: "Always included in findById and findMany responses.",
            allOf: [{ $ref: "#/components/schemas/Role" }],
          },
        },
        required: [
          "id",
          "email",
          "name",
          "surname",
          "employeeId",
          "nationalIdNumber",
          "status",
          "gender",
          "hireDate",
          "departmentId",
          "roleId",
          "isEmailVerified",
          "createdAt",
          "updatedAt",
        ],
      },

      LoginInput: {
        type: "object",
        description:
          "Credentials for logging in. Accepts either `username` or `email` as the `login` field.",
        properties: {
          login: {
            type: "string",
            description: "The user's `username` or `email` address.",
            example: "jean_dupont",
          },
          password: {
            type: "string",
            format: "password",
            description: "The user's password.",
            example: "MyP@ssw0rd!",
          },
        },
        required: ["login", "password"],
      },

      LoginResponse: {
        type: "object",
        description: `
Returned on successful login. Contains the authenticated user's full profile, resolved permissions, preferences, and a signed JWT.

**Important fields:**
- \`token\`: JWT signed with RS256. Include as \`Authorization: Bearer <token>\` on all subsequent requests. Expiry is set via \`JWT_EXPIRES_IN\` environment variable.
- \`permissions\`: Fully-resolved array of permission codes. These are computed server-side from: role permissions + role overrides + permission overrides (granted/revoked) + wildcard expansion + implication expansion. **Cache this on the frontend** — it's expensive to compute. It's also included in the response so you don't need to make a separate call.
- \`preferences\`: User's language and currency preferences. Use to initialize the \`x-lang\` and \`x-currency\` headers for all subsequent requests.

**Login failure cases:**
- Wrong credentials → \`401\`
- Account not yet set up (no password) → \`401\`
- Account status not ACTIVE → \`403\`
- Account temporarily deactivated → \`403\`
- Account locked after too many failed attempts → \`403\` with \`minutes\` remaining in the error meta

**Lockout behavior:** After \`MAX_LOGIN_ATTEMPTS\` consecutive failures, the account is locked for \`ACCOUNT_LOGIN_WAIT_TIME_HOURS\` hours. Failed attempt count resets on successful login.
        `,
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              token: {
                type: "string",
                description:
                  "JWT access token. No refresh token — re-login when expired.",
                example: "eyJhbGciOiJIUzI1NiJ9...",
              },
              user: {
                allOf: [
                  { $ref: "#/components/schemas/User" },
                  {
                    type: "object",
                    properties: {
                      permissions: {
                        type: "array",
                        items: { type: "string" },
                        description:
                          "Fully-resolved permission codes for this user. Format: `MODULE.SUBMODULE.ACTION`.",
                        example: [
                          "ACCOUNTING.SUPPLIER_INVOICES.READ",
                          "ACCOUNTING.SUPPLIER_INVOICES.CREATE",
                        ],
                      },
                      preferences: {
                        type: "object",
                        properties: {
                          language: { type: "string", enum: ["FR", "ENG"] },
                          currency: {
                            type: "string",
                            enum: ["FCFA", "EUR", "USD"],
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },

      CreateUserInput: {
        type: "object",
        description: `
Creates a new employee account.

After creation:
1. An \`employeeId\` is auto-generated (\`{PREFIX}-{YYMM}-{NNNN}\`).
2. A \`UserPreference\` record is created with defaults (FR / FCFA).
3. A \`PASSWORD_SETUP\` token is generated and emailed to the new employee.
4. The employee uses that token at \`POST /setup-account\` to create their username and password.
5. Until setup is complete, the user's status is effectively inactive — they cannot log in.

**Note:** \`email\` must be unique. Duplicate email returns \`409\`.
        `,
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "Must be unique. The setup invitation is sent here.",
            example: "alice.martin@infotech.cm",
          },
          name: { type: "string", minLength: 1, example: "Alice" },
          surname: { type: "string", minLength: 1, example: "Martin" },
          nationalIdNumber: {
            type: "string",
            minLength: 1,
            description: "National ID number. Must be unique.",
            example: "987654321",
          },
          phoneNumber: {
            type: "string",
            description: "Optional. Must be unique if provided.",
            example: "+237 6XX XXX XXX",
          },
          dob: {
            type: "string",
            format: "date",
            nullable: true,
            description: "Date of birth. Optional.",
            example: "1995-08-22",
          },
          gender: { type: "string", enum: ["M", "F"], default: "M" },
          address: {
            type: "string",
            description: "Optional.",
            example: "Rue de la Paix, Douala",
          },
          emergencyContactName: { type: "string", description: "Optional." },
          emergencyContactPhoneNumber: {
            type: "string",
            description: "Optional.",
          },
          hireDate: {
            type: "string",
            format: "date",
            description: "Required. Must be a valid date.",
            example: "2025-01-15",
          },
          baseSalaryInCFA: {
            type: "integer",
            description: "Optional. Base salary in FCFA.",
            example: 250000,
          },
          bankName: {
            type: "string",
            description: "Optional.",
            example: "Afriland First Bank",
          },
          cnpsNumber: {
            type: "string",
            description: "Optional. CNPS social security number.",
            example: "CNP-123456",
          },
          taxId: {
            type: "string",
            description: "Optional. Tax identification number.",
            example: "TAX-789012",
          },
          departmentId: {
            type: "string",
            format: "uuid",
            description: "Must exist and not be deleted.",
            example: "dept-uuid-here",
          },
          roleId: {
            type: "string",
            format: "uuid",
            description: "Must exist and not be deleted.",
            example: "role-uuid-here",
          },
        },
        required: [
          "email",
          "name",
          "surname",
          "nationalIdNumber",
          "hireDate",
          "departmentId",
          "roleId",
        ],
      },

      SetupAccountInput: {
        type: "object",
        description: `
Used by new employees to set their credentials for the first time.

The \`token\` is received via email after admin creates their account (or resends an invite).
Token is single-use, time-limited, and type-checked (\`PASSWORD_SETUP\` only).

On success: username and password are set, \`isEmailVerified\` becomes \`true\`, user status becomes \`ACTIVE\`.

**Password requirements:** Min 8 chars, max 128, must contain: uppercase, lowercase, number, special character.
**Username requirements:** 3–30 chars, alphanumeric + underscore only (\`^[a-zA-Z0-9_]+$\`). Must be unique.
        `,
        properties: {
          token: {
            type: "string",
            description:
              "Raw token from the setup email link. Not the hashed version.",
            example: "abc123def456...",
          },
          username: {
            type: "string",
            minLength: 3,
            maxLength: 30,
            pattern: "^[a-zA-Z0-9_]+$",
            example: "alice_martin",
          },
          password: {
            type: "string",
            format: "password",
            minLength: 8,
            maxLength: 128,
            example: "S3cur3P@ssword!",
          },
          confirmPassword: {
            type: "string",
            format: "password",
            description: "Must exactly match `password`.",
            example: "S3cur3P@ssword!",
          },
        },
        required: ["token", "username", "password", "confirmPassword"],
      },

      ForgotPasswordInput: {
        type: "object",
        description: `
Initiates the password reset flow. Sends a reset link to the email if found and active.

**Always returns \`200\`** even if the email doesn't exist — this prevents user enumeration attacks.
Previous active reset tokens for the same user are invalidated before a new one is created.
The reset link directs the user to \`{frontEndUrl}/reset-password?token=<raw_token>\`.
        `,
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "jean.dupont@infotech.cm",
          },
        },
        required: ["email"],
      },

      ResetPasswordInput: {
        type: "object",
        description: `
Completes the password reset flow using the token from the email.

Token is single-use (\`usedAt\` is set on success), time-limited, and type-checked (\`PASSWORD_RESET\` only).
Returns \`400\` if token is invalid, already used, or expired.

Same password rules apply: 8–128 chars, uppercase, lowercase, number, special character.
        `,
        properties: {
          token: {
            type: "string",
            description: "Raw token from the reset email link.",
            example: "xyz789abc...",
          },
          password: {
            type: "string",
            format: "password",
            minLength: 8,
            maxLength: 128,
            example: "N3wS3cur3P@ss!",
          },
          confirmPassword: {
            type: "string",
            format: "password",
            description: "Must match `password`.",
            example: "N3wS3cur3P@ss!",
          },
        },
        required: ["token", "password", "confirmPassword"],
      },

      ChangePasswordInput: {
        type: "object",
        description: `
Allows an authenticated user to change their own password.

Requires the current password for verification. Returns \`401\` if current password is incorrect.
Same password strength rules apply to \`newPassword\`.
        `,
        properties: {
          currentPassword: {
            type: "string",
            format: "password",
            description: "The user's current password.",
            example: "OldP@ssw0rd!",
          },
          newPassword: {
            type: "string",
            format: "password",
            minLength: 8,
            maxLength: 128,
            example: "N3wS3cur3P@ss!",
          },
          confirmPassword: {
            type: "string",
            format: "password",
            description: "Must match `newPassword`.",
            example: "N3wS3cur3P@ss!",
          },
        },
        required: ["currentPassword", "newPassword", "confirmPassword"],
      },

      ChangeUserCredentialsInput: {
        type: "object",
        description: `
Admin operation to forcefully change another user's email, username, and password simultaneously.

**Permission required:** \`USER_MANAGEMENT.USERS.ADMIN\`

All three credentials are updated atomically. Both new email and new username must be unique.
Returns \`409\` if email or username already exists.
The operation is logged with \`operation: CHANGE_USER_CREDENTIALS\`.
        `,
        properties: {
          userId: {
            type: "string",
            minLength: 1,
            description: "ID of the target user.",
            example: "u1a2b3c4-...",
          },
          email: {
            type: "string",
            format: "email",
            description: "New email. Must be unique.",
            example: "new.email@infotech.cm",
          },
          username: {
            type: "string",
            minLength: 3,
            maxLength: 30,
            pattern: "^[a-zA-Z0-9_]+$",
            description: "New username. Must be unique.",
            example: "new_username",
          },
          password: {
            type: "string",
            format: "password",
            minLength: 8,
            maxLength: 128,
            example: "N3wAdm1nP@ss!",
          },
          confirmPassword: {
            type: "string",
            format: "password",
            description: "Must match `password`.",
            example: "N3wAdm1nP@ss!",
          },
        },
        required: [
          "userId",
          "email",
          "username",
          "password",
          "confirmPassword",
        ],
      },

      UpdateMeInput: {
        type: "object",
        description: `
Allows an authenticated user to update their own profile information and preferences.

All fields are optional. Only include what you want to change.
Preferences (\`language\` and \`currency\`) are upserted — if no preference record exists, it's created.
Updating preferences also invalidates the permission cache (since preferences affect header defaults).

**Fields NOT updatable via this endpoint:** email, username, password, employeeId, status, roleId, departmentId, hireDate. Use the dedicated admin endpoints for those.
        `,
        properties: {
          name: { type: "string", minLength: 1, example: "Jean-Pierre" },
          surname: { type: "string", minLength: 1, example: "Dupont" },
          nationalIdNumber: {
            type: "string",
            minLength: 1,
            example: "123456789",
          },
          phoneNumber: { type: "string", example: "+237 6XX XXX XXX" },
          address: { type: "string", example: "Nouvelle adresse, Yaoundé" },
          emergencyContactName: { type: "string" },
          emergencyContactPhoneNumber: { type: "string" },
          preferences: {
            type: "object",
            description:
              "User language and currency preferences. Both optional.",
            properties: {
              language: { type: "string", enum: ["FR", "ENG"] },
              currency: { type: "string", enum: ["FCFA", "EUR", "USD"] },
            },
          },
        },
      },

      UpdateUserInput: {
        type: "object",
        description:
          "Admin endpoint to update another user's profile fields. All fields optional. Does not allow changing sensitive fields like email, password, roleId, departmentId — use dedicated endpoints for those.",
        properties: {
          name: { type: "string", minLength: 1 },
          surname: { type: "string", minLength: 1 },
          phoneNumber: { type: "string" },
          dob: { type: "string", format: "date" },
          gender: { type: "string", enum: ["M", "F"] },
          address: { type: "string" },
          emergencyContactName: { type: "string" },
          emergencyContactPhoneNumber: { type: "string" },
          hireDate: { type: "string", format: "date" },
        },
      },

      DeactivateUserInput: {
        type: "object",
        description: `
Temporarily deactivates a user account until a specified future date.

The user's \`status\` stays \`ACTIVE\` but \`deactivatedUntil\` is set. Login is blocked until that date.
The \`date\` must be in the future. Returns \`400\` if it's in the past.
Returns \`409\` if the user is already deactivated or terminated.
System users are immutable.
        `,
        properties: {
          userId: {
            type: "string",
            format: "uuid",
            description: "Target user ID.",
          },
          date: {
            type: "string",
            format: "date-time",
            description:
              "Future datetime until which the account is deactivated.",
            example: "2025-03-01T00:00:00.000Z",
          },
        },
        required: ["userId", "date"],
      },

      SuspendUserInput: {
        type: "object",
        description: `
Suspends a user account for disciplinary or administrative reasons.

Sets \`status: SUSPENDED\` and records the \`suspensionReason\`.
**Also revokes all active \`PermissionOverride\` records** for the user atomically in the same transaction.
Permission cache is invalidated. A suspension notification email is sent to the user in their preferred language.

\`suspensionReason\` is required, 10–255 characters.
Returns \`409\` if already suspended or terminated. System users return \`403\`.
        `,
        properties: {
          userId: {
            type: "string",
            format: "uuid",
            description: "Target user ID.",
          },
          suspensionReason: {
            type: "string",
            minLength: 10,
            maxLength: 255,
            description:
              "Mandatory justification. Stored and emailed to the user.",
            example: "Repeated violation of data access policies.",
          },
        },
        required: ["userId", "suspensionReason"],
      },

      UserPayrollData: {
        type: "object",
        description: `
Sensitive payroll fields from the User record. Returned by payroll-specific endpoints only.
These fields are **never included** in standard \`GET /users\` or \`GET /users/:id\` responses.

Access to payroll data is protected by separate high-risk permissions and all reads are logged with \`category: SENSITIVE_READ\`.
        `,
        properties: {
          baseSalaryInCFA: {
            type: "integer",
            nullable: true,
            description: "Base monthly salary in FCFA.",
            example: 350000,
          },
          bankName: {
            type: "string",
            nullable: true,
            example: "Afriland First Bank",
          },
          cnpsNumber: {
            type: "string",
            nullable: true,
            description: "CNPS social security registration number.",
            example: "CNP-123456",
          },
          taxId: {
            type: "string",
            nullable: true,
            description: "Tax identification number.",
            example: "TAX-789012",
          },
        },
      },

      UpdateUserPayrollDataInput: {
        type: "object",
        description: `
Updates payroll data for a target user. Requires **re-authentication** — the caller must provide their own \`login\` (username or email) and \`password\` in the request body.

This is a high-security endpoint. The re-auth check goes through the full login validation: checks account status, lockout, and temporary deactivation. Failed auth attempts increment the caller's failed login counter.

All payroll reads/writes are logged with \`category: SENSITIVE_READ\` or \`WRITE\`.
        `,
        properties: {
          userId: {
            type: "string",
            description: "Target user ID whose payroll is being updated.",
            example: "u1a2b3c4-...",
          },
          baseSalaryInCFA: { type: "integer", minimum: 1, example: 400000 },
          bankName: { type: "string", example: "SCB Cameroun" },
          cnpsNumber: { type: "string", example: "CNP-654321" },
          taxId: { type: "string", example: "TAX-210987" },
          login: {
            type: "string",
            description:
              "Caller's own username or email for re-authentication.",
            example: "admin_user",
          },
          password: {
            type: "string",
            format: "password",
            description: "Caller's own password for re-authentication.",
            example: "MyP@ssw0rd!",
          },
        },
        required: [
          "userId",
          "baseSalaryInCFA",
          "bankName",
          "cnpsNumber",
          "taxId",
          "login",
          "password",
        ],
      },

      // ─── ActivityLog ─────────────────────────────────────────────────────

      ActivityLog: {
        type: "object",
        description: `
An immutable audit trail record created automatically on every significant operation.

**Never created manually** — logs are generated internally by \`BaseService\` on every CREATE, UPDATE, DELETE, AUTH, and sensitive READ.

**Key design note:** \`ActivityLog\` has no soft-delete filter — the repository overrides \`buildWhereClause\` to omit \`deletedAt: null\`, so all logs are always returned regardless of any deletion state.

\`category: SENSITIVE_READ\` is used for payroll access — filter on this for compliance reporting.
\`requestId\` correlates to the \`x-request-id\` request header for tracing a log back to a specific HTTP request.
        `,
        properties: {
          id: { type: "string", format: "uuid" },
          userId: {
            type: "string",
            format: "uuid",
            nullable: true,
            description:
              "Actor's user ID. Null for system-initiated operations.",
          },
          userEmail: {
            type: "string",
            nullable: true,
            description: "Actor's email at time of action.",
          },
          operation: {
            type: "string",
            enum: [
              "CREATE",
              "READ",
              "UPDATE",
              "DELETE",
              "AUTH",
              "FORGOT_PASSWORD",
              "RESET_PASSWORD",
              "CHANGE_PASSWORD",
              "CHANGE_USER_CREDENTIALS",
            ],
            example: "UPDATE",
          },
          category: {
            type: "string",
            enum: ["WRITE", "READ", "SENSITIVE_READ"],
            description:
              "`WRITE` for mutations, `READ` for standard reads, `SENSITIVE_READ` for payroll and confidential data.",
            example: "WRITE",
          },
          tableName: {
            type: "string",
            description: "Database table the operation targeted.",
            example: "users",
          },
          recordId: {
            type: "string",
            description: "ID of the record operated on.",
            example: "u1a2b3c4-...",
          },
          previousState: {
            type: "object",
            nullable: true,
            description:
              "JSON snapshot before the operation. Null for CREATE and AUTH.",
          },
          newState: {
            type: "object",
            nullable: true,
            description: "JSON snapshot after the operation. Null for DELETE.",
          },
          changedFields: {
            type: "array",
            items: { type: "string" },
            description: "Field names that changed. Empty for CREATE/DELETE.",
            example: ["status", "roleId"],
          },
          ipAddress: { type: "string", nullable: true },
          userAgent: { type: "string", nullable: true },
          requestId: {
            type: "string",
            nullable: true,
            description: "Correlates to `x-request-id` header.",
          },
          metadata: { type: "object", nullable: true },
          status: {
            type: "string",
            enum: ["SUCCESS", "FAILED"],
            example: "SUCCESS",
          },
          failureReason: { type: "string", nullable: true },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "Logs are never updated — only created.",
          },
        },
        required: [
          "id",
          "operation",
          "category",
          "tableName",
          "recordId",
          "status",
          "createdAt",
        ],
      },

      // ─── AdminConfig ──────────────────────────────────────────────────────

      AdminConfig: {
        type: "object",
        description: `
Singleton system configuration record for INFOTECH S.A. There is exactly **one** AdminConfig row in the database, with \`id: "MAIN"\`.

Controls company branding, contact info, and the \`companyPrefix\` used when auto-generating employee IDs (\`{PREFIX}-{YYMM}-{NNNN}\`).

**No CREATE endpoint** — the record is seeded at setup. Only GET and PATCH are exposed.

⚠️ Changing \`companyPrefix\` affects all future employee ID generation. Existing IDs are not retroactively updated.
        `,
        properties: {
          id: {
            type: "string",
            enum: ["MAIN"],
            description: "Always `MAIN`.",
            example: "MAIN",
          },
          companyEmail: {
            type: "string",
            format: "email",
            example: "contact@infotech.cm",
          },
          supportEmail: {
            type: "string",
            format: "email",
            description:
              "Shown in all system-sent emails (setup, reset, suspension).",
            example: "support@infotech.cm",
          },
          companyPhoneNumber: {
            type: "string",
            description: "8–20 chars.",
            example: "+237 2XX XXX XXX",
          },
          companyPrefix: {
            type: "string",
            description:
              "2–10 chars. Used in employee ID generation. Default: `INF`.",
            example: "INF",
          },
          logoUrl: {
            type: "string",
            nullable: true,
            description:
              "Used in email templates. Falls back to `{baseUrl}/assets/logo.png` if null.",
            example: "https://cdn.infotech.cm/logo.png",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        required: [
          "id",
          "companyEmail",
          "supportEmail",
          "companyPhoneNumber",
          "companyPrefix",
          "createdAt",
          "updatedAt",
        ],
      },

      UpdateAdminConfigInput: {
        type: "object",
        description:
          "All fields optional. Changing `companyPrefix` affects all future employee ID generation.",
        properties: {
          companyEmail: { type: "string", format: "email" },
          supportEmail: { type: "string", format: "email" },
          companyPhoneNumber: { type: "string", minLength: 8, maxLength: 20 },
          companyPrefix: {
            type: "string",
            minLength: 2,
            maxLength: 10,
            description: "⚠️ Changing this affects future employee IDs only.",
          },
          logoUrl: {
            type: "string",
            format: "uri",
            nullable: true,
            description: "Set to `null` to remove custom logo and use default.",
          },
        },
      },

      // ─── PermissionOverride ───────────────────────────────────────────────

      PermissionOverride: {
        type: "object",
        description: `
A user-level override that grants or revokes a specific permission for a specific user, independent of their role.

**Permission resolution order (from \`getUserPermissions\`):**
1. Role permissions (from base role + active role overrides)
2. Apply \`PermissionOverride\` records: \`isGranted: true\` adds, \`isGranted: false\` removes — even if the role grants it
3. Expand wildcards and implications

**Suspension side effect:** When a user is suspended, all their active \`PermissionOverride\` records are soft-deleted atomically. They are **not restored** on reinstatement.

**Uniqueness:** One active override per \`userId\`/\`permissionId\` pair.
        `,
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          permissionId: { type: "string", format: "uuid" },
          createdById: {
            type: "string",
            format: "uuid",
            description: "Admin who created this override.",
          },
          isGranted: {
            type: "boolean",
            description:
              "`true` = grant even if role doesn't have it. `false` = revoke even if role grants it.",
            example: true,
          },
          isTemporary: {
            type: "boolean",
            description:
              "Informational. Actual expiry controlled by `expiresAt`.",
            example: false,
          },
          expiresAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            description:
              "Null = permanent. Expired overrides remain in DB but are ignored during permission resolution.",
            example: "2025-06-01T00:00:00.000Z",
          },
          reason: {
            type: "string",
            description: "Mandatory justification. 10–255 chars.",
            example: "Temporary read access granted for Q1 audit.",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          permission: {
            description: "Eager-loaded when `?include=permission` is passed.",
            allOf: [{ $ref: "#/components/schemas/Permission" }],
          },
        },
        required: [
          "id",
          "userId",
          "permissionId",
          "createdById",
          "isGranted",
          "isTemporary",
          "reason",
          "createdAt",
          "updatedAt",
        ],
      },

      CreatePermissionOverrideInput: {
        type: "object",
        description:
          "Creates a permission override. `userId` + `permissionId` must be unique among active (non-deleted) overrides.",
        properties: {
          userId: { type: "string", format: "uuid" },
          permissionId: { type: "string", format: "uuid" },
          createdById: { type: "string", format: "uuid" },
          isGranted: {
            type: "boolean",
            default: true,
            description: "`true` to grant, `false` to explicitly revoke.",
          },
          isTemporary: { type: "boolean", default: false },
          expiresAt: { type: "string", format: "date-time", nullable: true },
          reason: {
            type: "string",
            minLength: 10,
            maxLength: 255,
            example: "Granted for audit review period.",
          },
        },
        required: ["userId", "permissionId", "createdById", "reason"],
      },

      // ─── RolePermission ───────────────────────────────────────────────────

      RolePermission: {
        type: "object",
        description: `
Join record linking a \`Role\` to a \`Permission\`. This is how roles get their permission sets.

**Prefer \`POST /api/v1/roles/assign-permissions\`** for adding permissions to roles — it handles bulk upserts and cache invalidation automatically. This endpoint is for direct record inspection and individual removal only.

**Soft-deleting a \`RolePermission\` removes that permission from the role**, but does NOT automatically invalidate the permission cache for users holding that role. Use the assign-permissions endpoint for managed operations.

\`@@unique([roleId, permissionId])\` — each permission can only be assigned to a role once.
        `,
        properties: {
          id: { type: "string", format: "uuid" },
          roleId: { type: "string", format: "uuid" },
          permissionId: { type: "string", format: "uuid" },
          createdById: {
            type: "string",
            format: "uuid",
            description: "Admin who assigned this permission to the role.",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          role: {
            description: "Eager-loaded when `?include=role`.",
            allOf: [{ $ref: "#/components/schemas/Role" }],
          },
          permission: {
            description: "Eager-loaded when `?include=permission`.",
            allOf: [{ $ref: "#/components/schemas/Permission" }],
          },
        },
        required: [
          "id",
          "roleId",
          "permissionId",
          "createdById",
          "createdAt",
          "updatedAt",
        ],
      },
      // Global security: applied to all routes unless overridden (e.g. login endpoint)
      security: [{ BearerAuth: [] }],
      paths: {
        // ════════════════════════════════════════════════════════════
        // ROLES  —  /api/v1/roles
        // Permission module: ADMIN > ROLES
        // All routes require a valid JWT (BearerAuth).
        // ════════════════════════════════════════════════════════════

        "/api/v1/roles": {
          get: {
            tags: ["Roles"],
            summary: "List all roles (paginated)",
            description: `
Returns a paginated list of all **active (non-deleted)** roles.

**Permission required:** \`ADMIN.ROLES.READ_ALL\`

Supports the same filtering pattern as all list endpoints — any non-reserved query param becomes a filter.
String values use case-insensitive \`contains\`. Boolean values (like \`isActive\`) use exact match.

Example: \`?isActive=true\` returns only active roles. \`?name=compta\` filters by name.
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
              { $ref: "#/components/parameters/PageParam" },
              { $ref: "#/components/parameters/LimitParam" },
              { $ref: "#/components/parameters/SortByParam" },
              { $ref: "#/components/parameters/SortOrderParam" },
              { $ref: "#/components/parameters/IncludeParam" },
              {
                in: "query",
                name: "name",
                schema: { type: "string" },
                required: false,
                description: "Filter by role name (case-insensitive contains).",
              },
              {
                in: "query",
                name: "isActive",
                schema: { type: "boolean" },
                required: false,
                description: "Filter by active status.",
              },
            ],
            responses: {
              "200": {
                description: "Paginated list of roles.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Role" },
                        },
                        meta: { $ref: "#/components/schemas/PaginationMeta" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
          post: {
            tags: ["Roles"],
            summary: "Create a new role",
            description: `
Creates a new role. Starts with **no permissions** — use \`POST /assign-permissions\` after creation to attach them.

**Permission required:** \`ADMIN.ROLES.CREATE\`

\`name\` must be unique across non-deleted roles. Returns \`409\` on conflict.
Audit: full new state logged with \`operation: CREATE\`.
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CreateRoleInput" },
                  example: {
                    name: "Responsable Logistique",
                    description:
                      "Oversees transport, fuel, and vehicle operations.",
                    isActive: true,
                  },
                },
              },
            },
            responses: {
              "201": {
                description: "Role created.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/Role" },
                      },
                    },
                  },
                },
              },
              "400": {
                description: "Validation failed.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "409": {
                description: "Role name already exists.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/roles/active": {
          get: {
            tags: ["Roles"],
            summary: "List all active roles (no pagination)",
            description: `
Returns a flat array of all roles where \`isActive: true\` and \`deletedAt\` is null. No pagination.

**Permission required:** \`ADMIN.ROLES.READ_ALL\`

Use this for **dropdowns and select inputs** (e.g. assigning a role to a new user). For admin tables, use the paginated \`GET /\` endpoint.
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            responses: {
              "200": {
                description: "All active roles.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Role" },
                        },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/roles/deleted": {
          get: {
            tags: ["Roles"],
            summary: "List soft-deleted roles (paginated)",
            description: `
Paginated list of soft-deleted roles, sorted by \`deletedAt\` descending by default.

**Permission required:** \`ADMIN.ROLES.RESTORE\`

\`name\` will have a \`_deleted_<timestamp>\` suffix. Strip it after restoring via a PATCH update.
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
              { $ref: "#/components/parameters/PageParam" },
              { $ref: "#/components/parameters/LimitParam" },
              { $ref: "#/components/parameters/SortOrderParam" },
            ],
            responses: {
              "200": {
                description: "Paginated deleted roles.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Role" },
                        },
                        meta: { $ref: "#/components/schemas/PaginationMeta" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/roles/assign-permissions": {
          post: {
            tags: ["Roles"],
            summary: "Assign permissions to a role (bulk upsert)",
            description: `
Bulk-assigns one or more permissions to a role. This is **additive and idempotent** — it does not remove existing permissions.

**Permission required:** \`ADMIN.ROLES.ASSIGN_PERMISSIONS\`

- Validates role exists, is not a system role, and is active.
- All \`permissionIds\` must exist — if **any** ID is invalid, the **entire operation fails**.
- Each permission is upserted: created if new, restored if previously soft-deleted.
- **Permission cache is immediately invalidated for all users holding this role.**

To remove permissions, use \`DELETE /api/v1/role-permissions/:id\`.
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AssignRolePermissionInput",
                  },
                  example: {
                    roleId: "c3d4e5f6-a7b8-9012-cdef-123456789012",
                    permissionIds: ["p1a2b3c4-d5e6-7890-abcd-ef1234567890"],
                  },
                },
              },
            },
            responses: {
              "201": {
                description: "Permissions assigned.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description: "Empty array or invalid UUIDs.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions or system role.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "Role or one/more permission IDs not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "409": {
                description: "Role is inactive — activate it first.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/roles/override": {
          post: {
            tags: ["Roles"],
            summary: "Grant a role override to a user",
            description: `
Grants a user an **additional role on top of their base role**, optionally with an expiry.

**Permission required:** \`ADMIN.ROLES.CREATE_ROLE_OVERRIDE\`

Creates a \`RoleOverride\` record. The user gains the union of their base role permissions + override role permissions.
Does **not** change the user's \`roleId\`. Common use: temporary elevated access while covering for an absent colleague.

Expired overrides for the same userId/roleId are cleaned up before creating a new one.
Permission cache invalidated immediately for the affected user.

**Constraints:** User must be ACTIVE, role must be active, user can't be granted their own base role as override, system users are immutable.
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RoleOverrideInput" },
                  example: {
                    roleId: "c3d4e5f6-a7b8-9012-cdef-123456789012",
                    userId: "u1a2b3c4-d5e6-7890-abcd-ef1234567890",
                    reason:
                      "Covering for Head of Accounting during annual leave.",
                    expiresAt: "2025-03-01T00:00:00.000Z",
                  },
                },
              },
            },
            responses: {
              "201": {
                description: "Role override granted.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description: "Validation failed.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions or system record.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "User or role not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "409": {
                description:
                  "Active override already exists, user is TERMINATED/SUSPENDED, role is inactive, or user already holds this as base role.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/roles/revoke-override": {
          patch: {
            tags: ["Roles"],
            summary: "Revoke an active role override",
            description: `
Revokes an active \`RoleOverride\` for a userId/roleId pair — sets \`isGranted: false\` and soft-deletes the record.

**Permission required:** \`ADMIN.ROLES.REVOKE_ROLE_OVERRIDE\`

Identified by body \`userId\` + \`roleId\` (not by override ID). Returns \`404\` if no active non-expired override found.
Permission cache invalidated immediately.
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/RevokeRoleOverrideInput",
                  },
                  example: {
                    userId: "u1a2b3c4-d5e6-7890-abcd-ef1234567890",
                    roleId: "c3d4e5f6-a7b8-9012-cdef-123456789012",
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Override revoked.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description: "`userId` or `roleId` missing.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "No active override found for this userId/roleId.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/roles/disable/{id}": {
          patch: {
            tags: ["Roles"],
            summary: "Disable a role",
            description: `
Sets \`isActive: false\`. Users holding this role lose all permissions derived from it immediately.
Individual \`PermissionOverride\` grants still apply.

**Permission required:** \`ADMIN.ROLES.DISABLE\`

Permission cache is invalidated for all affected users. Returns \`409\` if already disabled. System roles return \`403\`.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            responses: {
              "200": {
                description: "Role disabled.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions or system role.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "Role not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "409": {
                description: "Role is already disabled.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/roles/enable/{id}": {
          patch: {
            tags: ["Roles"],
            summary: "Enable a role",
            description: `
Sets \`isActive: true\`. Affected users immediately regain all permissions from this role.
Permission cache invalidated for all affected users.

**Permission required:** \`ADMIN.ROLES.ENABLE\`

Returns \`409\` if already active. System roles return \`403\`.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            responses: {
              "200": {
                description: "Role enabled.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions or system role.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "Role not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "409": {
                description: "Role is already active.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/roles/{id}": {
          get: {
            tags: ["Roles"],
            summary: "Get a role by ID",
            description: `
Fetches a single non-deleted role by UUID.

**Permission required:** \`ADMIN.ROLES.READ\`

Use \`GET /:id/permissions\` if you need the role with its full permission list attached.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
              { $ref: "#/components/parameters/IncludeParam" },
            ],
            responses: {
              "200": {
                description: "Role found.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/Role" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "Role not found or soft-deleted.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },

          patch: {
            tags: ["Roles"],
            summary: "Update a role",
            description: `
Partially updates a role. All fields optional.

**Permission required:** \`ADMIN.ROLES.UPDATE\`

⚠️ **Prefer \`/disable\` and \`/enable\`** for toggling \`isActive\` — those endpoints handle permission cache invalidation. Updating \`isActive\` directly via PATCH does **not** invalidate the cache.

System roles return \`403\`. Duplicate names return \`409\`.
Audit: \`previousState\`, \`newState\`, and \`changedFields\` all recorded.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UpdateRoleInput" },
                  example: { description: "Updated description." },
                },
              },
            },
            responses: {
              "200": {
                description: "Role updated.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/Role" },
                      },
                    },
                  },
                },
              },
              "400": {
                description: "Validation failed.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions or system record.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "Role not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "409": {
                description: "Name conflict.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },

          delete: {
            tags: ["Roles"],
            summary: "Delete a role (soft or hard)",
            description: `
Soft-deletes by default. Pass \`?hard=true\` for permanent deletion.

**Permission required:** \`ADMIN.ROLES.DELETE\`

**Constraint:** Role must have zero active users. Check \`GET /api/v1/users?roleId=<id>\` first.
Soft delete appends \`_deleted_<timestamp>\` to \`name\`. System roles return \`403\`.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/HardDeleteParam" },
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            responses: {
              "200": {
                description: "Role deleted.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description: "Role has active users assigned.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions or system record.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "Role not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/roles/{id}/permissions": {
          get: {
            tags: ["Roles"],
            summary: "Get a role with its full permission list",
            description: `
Returns the role with its \`rolePermissions\` fully included — each entry contains the complete \`Permission\` object.

**Permission required:** \`ADMIN.ROLES.READ_ALL\`

Use this when building a role management UI where you need to display/edit which permissions a role has.
Note: the response shape wraps the role in a \`{ role }\` object key (not \`data\` directly).
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            responses: {
              "200": {
                description: "Role with permissions.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "object",
                          properties: {
                            role: {
                              $ref: "#/components/schemas/RoleWithPermissions",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "Role not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/roles/{id}/restore": {
          patch: {
            tags: ["Roles"],
            summary: "Restore a soft-deleted role",
            description: `
Restores a soft-deleted role by nulling \`deletedAt\`.

**Permission required:** \`ADMIN.ROLES.RESTORE\`

The \`_deleted_<timestamp>\` suffix on \`name\` is **not** removed automatically — send a \`PATCH /:id\` after restoring to rename it.
Returns \`404\` if the role doesn't exist or isn't deleted.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            responses: {
              "200": {
                description: "Role restored.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/Role" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "Role not found or not in a deleted state.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        // ════════════════════════════════════════════════════════════
        // DEPARTMENTS  —  /api/v1/departments
        // Required permission module: ADMIN > DEPARTMENTS
        // All routes require a valid JWT (BearerAuth).
        // ════════════════════════════════════════════════════════════

        "/api/v1/departments": {
          get: {
            tags: ["Departments"],
            summary: "List all departments (paginated)",
            description: `
Returns a paginated list of all **active (non-deleted)** departments.

**Permission required:** \`ADMIN.DEPARTMENTS.READ_ALL\`

**Filtering:** Any query parameter not reserved for pagination/sorting is treated as a filter field.
String values use case-insensitive \`contains\` matching. UUID values use exact match.

Example: \`?name=compta\` returns all departments whose name contains "compta" (case-insensitive).

**Soft-deleted records are excluded** from this endpoint. Use \`GET /deleted\` to see them.
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
              { $ref: "#/components/parameters/PageParam" },
              { $ref: "#/components/parameters/LimitParam" },
              { $ref: "#/components/parameters/SortByParam" },
              { $ref: "#/components/parameters/SortOrderParam" },
              { $ref: "#/components/parameters/IncludeParam" },
              {
                in: "query",
                name: "name",
                schema: { type: "string" },
                required: false,
                description:
                  "Filter by department name (case-insensitive contains).",
                example: "compta",
              },
              {
                in: "query",
                name: "code",
                schema: { type: "string" },
                required: false,
                description:
                  "Filter by department code (case-insensitive contains).",
                example: "RH",
              },
            ],
            responses: {
              "200": {
                description: "Paginated list of departments.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Department" },
                        },
                        meta: { $ref: "#/components/schemas/PaginationMeta" },
                      },
                    },
                    example: {
                      success: true,
                      data: [
                        {
                          id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                          name: "Comptabilité",
                          code: "COMPTA",
                          isSystem: false,
                          createdAt: "2024-01-15T08:30:00.000Z",
                          updatedAt: "2024-06-01T14:22:00.000Z",
                        },
                      ],
                      meta: {
                        total: 8,
                        page: 1,
                        limit: 20,
                        totalPages: 1,
                        hasNextPage: false,
                        hasPrevPage: false,
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT token.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description:
                  "Authenticated user lacks the required permission.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },

          post: {
            tags: ["Departments"],
            summary: "Create a new department",
            description: `
Creates a new department. Both \`name\` and \`code\` must be unique across non-deleted departments.

**Permission required:** \`ADMIN.DEPARTMENTS.CREATE\`

**Automatic transforms:**
- \`name\` is trimmed of whitespace.
- \`code\` is trimmed and converted to UPPERCASE automatically — you can send lowercase.

**Uniqueness:** If \`name\` or \`code\` already exists, the API returns \`409 Conflict\`.

**Audit:** This action is automatically logged in \`ActivityLog\` with \`operation: CREATE\` and the full new state.
        `,
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/CreateDepartmentInput",
                  },
                  example: {
                    name: "Ressources Humaines",
                    code: "rh",
                  },
                },
              },
            },
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            responses: {
              "201": {
                description: "Department created successfully.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/Department" },
                      },
                    },
                    example: {
                      success: true,
                      data: {
                        id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
                        name: "Ressources Humaines",
                        code: "RH",
                        isSystem: false,
                        createdAt: "2024-07-01T10:00:00.000Z",
                        updatedAt: "2024-07-01T10:00:00.000Z",
                      },
                    },
                  },
                },
              },
              "400": {
                description:
                  "Validation failed. `name` or `code` too short, or a required field is missing.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                    example: {
                      ok: false,
                      status: "fail",
                      message: "Le code du département est trop court.",
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "409": {
                description:
                  "A department with the same `name` or `code` already exists.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                    example: {
                      ok: false,
                      status: "fail",
                      message: "Un département avec ce code existe déjà.",
                    },
                  },
                },
              },
            },
          },
        },

        "/api/v1/departments/active": {
          get: {
            tags: ["Departments"],
            summary: "List all active departments (no pagination)",
            description: `
Returns a flat array of all departments that are **not soft-deleted**. No pagination — returns everything in one call.

**Permission required:** \`ADMIN.DEPARTMENTS.READ_ALL\`

This endpoint is intended for use in **dropdowns, select inputs, and form fields** where you need the full department list without paginating. Do not use it for admin tables — use \`GET /api/v1/departments\` with pagination instead.
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            responses: {
              "200": {
                description: "Full list of active departments.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Department" },
                        },
                      },
                    },
                    example: {
                      success: true,
                      data: [
                        {
                          id: "a1b2c3d4-...",
                          name: "Comptabilité",
                          code: "COMPTA",
                          isSystem: false,
                          createdAt: "2024-01-15T08:30:00.000Z",
                          updatedAt: "2024-06-01T14:22:00.000Z",
                        },
                        {
                          id: "b2c3d4e5-...",
                          name: "Ressources Humaines",
                          code: "RH",
                          isSystem: false,
                          createdAt: "2024-01-15T08:30:00.000Z",
                          updatedAt: "2024-06-01T14:22:00.000Z",
                        },
                      ],
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/departments/deleted": {
          get: {
            tags: ["Departments"],
            summary: "List soft-deleted departments (paginated)",
            description: `
Returns a paginated list of departments that have been **soft-deleted** (i.e. have a non-null \`deletedAt\`).

**Permission required:** \`ADMIN.DEPARTMENTS.RESTORE\`

Useful for admin trash/recovery views. Records here can be restored via \`PATCH /:id/restore\`.

Note: \`name\` and \`code\` will have a \`_deleted_<timestamp>\` suffix appended (this frees up uniqueness so a new department with the same name can be created). The restore operation **does not** strip this suffix — handle display accordingly or strip it on the frontend before showing it to the user.
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
              { $ref: "#/components/parameters/PageParam" },
              { $ref: "#/components/parameters/LimitParam" },
              {
                in: "query",
                name: "sortBy",
                schema: { type: "string", default: "deletedAt" },
                required: false,
                description:
                  "Field to sort by. Defaults to `deletedAt` (most recently deleted first).",
              },
              { $ref: "#/components/parameters/SortOrderParam" },
            ],
            responses: {
              "200": {
                description: "Paginated list of soft-deleted departments.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Department" },
                        },
                        meta: { $ref: "#/components/schemas/PaginationMeta" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/departments/{id}": {
          get: {
            tags: ["Departments"],
            summary: "Get a department by ID",
            description: `
Fetches a single active (non-deleted) department by its UUID.

**Permission required:** \`ADMIN.DEPARTMENTS.READ\`

Returns \`404\` if the department does not exist or has been soft-deleted. Use \`GET /deleted/{id}\` to fetch a deleted record.

Use \`?include=users\` to eager-load the users belonging to this department.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
              { $ref: "#/components/parameters/IncludeParam" },
            ],
            responses: {
              "200": {
                description: "Department found.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/Department" },
                      },
                    },
                  },
                },
              },
              "400": {
                description: "Invalid or missing `id` path parameter.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "Department not found or is soft-deleted.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },

          patch: {
            tags: ["Departments"],
            summary: "Update a department",
            description: `
Partially updates a department. All body fields are optional — only include what you want to change.

**Permission required:** \`ADMIN.DEPARTMENTS.UPDATE\`

**System records:** Departments with \`isSystem: true\` cannot be updated. Returns \`403\`.

**Audit:** The full \`previousState\` and \`newState\` are recorded in \`ActivityLog\`, along with the list of \`changedFields\`.

Same validation rules as creation apply: \`name\` min 2 chars, \`code\` 2–10 chars and auto-UPPERCASED.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/UpdateDepartmentInput",
                  },
                  example: { name: "Direction Générale", code: "dg" },
                },
              },
            },
            responses: {
              "200": {
                description: "Department updated successfully.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/Department" },
                      },
                    },
                  },
                },
              },
              "400": {
                description: "Validation failed.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions or system record.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "Department not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "409": {
                description: "Name or code conflict with existing department.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },

          delete: {
            tags: ["Departments"],
            summary: "Delete a department (soft or hard)",
            description: `
Deletes a department. By default performs a **soft delete**: sets \`deletedAt\` to now and appends \`_deleted_<timestamp>\` to \`name\` and \`code\` to free those unique values.

Pass \`?hard=true\` to permanently remove the record. **This cannot be undone.**

**Permission required:** \`ADMIN.DEPARTMENTS.DELETE\`

**Constraint:** The department must have **zero active users**. If any users are currently assigned to this department, the API returns \`400\` and does nothing. Reassign or remove users first.

**System records:** Departments with \`isSystem: true\` cannot be deleted. Returns \`403\`.

**Audit:** The \`previousState\` of the record is saved to \`ActivityLog\` before deletion.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/HardDeleteParam" },
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            responses: {
              "200": {
                description: "Department deleted successfully.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "object",
                          properties: {
                            message: {
                              type: "string",
                              example: "Ressource supprimée avec succès.",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              "400": {
                description:
                  "Department has active users assigned to it. Reassign them before deleting.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions or system record.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "Department not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/departments/{id}/restore": {
          patch: {
            tags: ["Departments"],
            summary: "Restore a soft-deleted department",
            description: `
Restores a soft-deleted department by setting \`deletedAt\` back to \`null\`.

**Permission required:** \`ADMIN.DEPARTMENTS.RESTORE\`

**Important:** The restore operation does **not** strip the \`_deleted_<timestamp>\` suffix from \`name\` or \`code\`. After restoring, you should immediately send a \`PATCH /:id\` to rename the department back to its intended values if needed.

**System records:** System departments cannot be restored via this endpoint (they shouldn't be deleteable in the first place).

Returns \`404\` if the record does not exist at all, or if it is not currently in a deleted state.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            responses: {
              "200": {
                description: "Department restored successfully.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/Department" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "Department not found or not in a deleted state.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        // ════════════════════════════════════════════════════════════
        // USERS  —  /api/v1/users
        // This module covers: Auth (login, forgot/reset password, setup),
        // Employee CRUD, self-service (me), account lifecycle management,
        // payroll data, and user credential admin operations.
        // ════════════════════════════════════════════════════════════

        // ── Public auth routes (no JWT required) ─────────────────────────────

        "/api/v1/users/login": {
          post: {
            tags: ["Users – Auth"],
            summary: "Login",
            security: [],
            description: `
Authenticates a user with \`username\` or \`email\` + \`password\`.

**Public route — no JWT required.**

**Login logic:**
1. Looks up user by \`username\` OR \`email\` (whichever is provided as \`login\`).
2. Checks the account is not locked (\`lockedUntil\`), has a password set, and status is \`ACTIVE\`.
3. Checks \`deactivatedUntil\` is not in the future.
4. Verifies password with argon2. On wrong password: increments \`failedLoginAttempts\`. After \`MAX_LOGIN_ATTEMPTS\` failures, account is locked for \`ACCOUNT_LOGIN_WAIT_TIME_HOURS\` hours.
5. On success: resets failed attempts, updates \`lastLoggedInAt\`, computes permissions, fetches preferences, returns user + token.

**Returned token:** Short-lived JWT signed with \`JWT_SECRET\`. Expiry controlled by \`JWT_EXPIRES_IN\`. There is **no refresh token** — the user must re-login when it expires.

**Permissions array:** Fully resolved server-side. Cache this on the frontend for permission checks. Includes wildcard expansion and permission implications.

> **Frontend tip:** After login, store \`token\` and initialize \`x-lang\` from \`preferences.language\` and \`x-currency\` from \`preferences.currency\` for all subsequent requests.
        `,
            parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/LoginInput" },
                  example: { login: "jean_dupont", password: "MyP@ssw0rd!" },
                },
              },
            },
            responses: {
              "200": {
                description: "Login successful.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/LoginResponse" },
                  },
                },
              },
              "400": {
                description: "Missing `login` or `password` field.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description:
                  "Wrong credentials, or account has no password set yet (not yet set up).",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description:
                  "Account not active, temporarily deactivated, or locked. The error message is localized. For lockout, a `minutes` field may be present in the error context.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/forgot-password": {
          post: {
            tags: ["Users – Auth"],
            summary: "Forgot password — request reset link",
            security: [],
            description: `
Triggers the password reset flow. Sends a reset link to the provided email.

**Public route — no JWT required.**

**Always returns \`200\`** regardless of whether the email exists — prevents user enumeration.

Flow:
1. Looks up user by email.
2. If not found, or account not ACTIVE, or no password set → silently returns \`200\`.
3. Invalidates any existing active reset tokens for this user.
4. Creates a new \`PASSWORD_RESET\` token and sends it via email.
5. Email is localized based on the user's stored language preference.

The reset link directs to \`{frontEndUrl}/reset-password?token=<rawToken>\`.
Token expires after \`RESET_PASSWORD_LIMIT_HOURS\` hours.
        `,
            parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ForgotPasswordInput" },
                  example: { email: "jean.dupont@infotech.cm" },
                },
              },
            },
            responses: {
              "200": {
                description:
                  "Always returned — even if email not found. Reset link sent if applicable.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description: "Missing or invalid email field.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/reset-password": {
          post: {
            tags: ["Users – Auth"],
            summary: "Reset password using token",
            security: [],
            description: `
Completes the password reset using the token from the email link.

**Public route — no JWT required.**

Token validation: must exist, not be used (\`usedAt\` null), not be expired, and be of type \`PASSWORD_RESET\`.
On success: password is updated (argon2 hashed), \`passwordChangedAt\` is set, token is marked as used.

Same password strength rules: 8–128 chars, uppercase + lowercase + number + special char.
        `,
            parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ResetPasswordInput" },
                  example: {
                    token: "raw-token-from-email",
                    password: "N3wS3cur3P@ss!",
                    confirmPassword: "N3wS3cur3P@ss!",
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Password reset successfully.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description:
                  "Token invalid, already used, expired, or wrong type. Passwords don't match or fail strength requirements.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/setup-account": {
          post: {
            tags: ["Users – Auth"],
            summary:
              "Setup account credentials (new employee first-time setup)",
            security: [],
            description: `
Allows a newly created employee to set their username and password for the first time.

**Public route — no JWT required.**

The \`token\` is received via the invitation email sent when an admin creates the account (or re-sends the invite).

Token validation: must exist, not be used, not be expired, and be of type \`PASSWORD_SETUP\`.

On success:
- \`username\` and \`password\` are saved (password is argon2-hashed).
- \`isEmailVerified\` is set to \`true\`.
- \`status\` is set to \`ACTIVE\`.
- Token is marked as used (cannot be reused).

**Username rules:** 3–30 chars, only \`[a-zA-Z0-9_]\`. Must be globally unique.
**Password rules:** 8–128 chars, requires uppercase + lowercase + digit + special char.

After setup, the user can log in immediately via \`POST /login\`.
        `,
            parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SetupAccountInput" },
                  example: {
                    token: "raw-setup-token-from-email",
                    username: "alice_martin",
                    password: "S3cur3P@ssword!",
                    confirmPassword: "S3cur3P@ssword!",
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Account setup complete. User can now log in.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description:
                  "Token invalid/used/expired, username taken, or password fails validation.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "409": {
                description: "Username already taken.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        // ── Self-service (authenticated user, their own data) ─────────────────

        "/api/v1/users/me": {
          get: {
            tags: ["Users – Me"],
            summary: "Get my profile",
            description: `
Returns the authenticated user's own profile from \`res.locals.user\` — populated by the \`protect\` middleware on every authenticated request.

No database call is made — this is the user object hydrated at middleware time.
The response includes the full user object as set during login (with department, role, and permissions if they were included at login time).
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            responses: {
              "200": {
                description: "Authenticated user's profile.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },

          patch: {
            tags: ["Users – Me"],
            summary: "Update my profile",
            description: `
Allows the authenticated user to update their own personal information and preferences.

All fields are optional. Only the fields provided are updated.

**Preferences** (\`language\`, \`currency\`) are upserted in the same transaction — if no preference record exists yet, it is created.

**Not allowed via this endpoint:** email, username, password, status, roleId, departmentId, hireDate — all require admin endpoints.

After update, the permission cache is invalidated for this user.
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UpdateMeInput" },
                  example: {
                    name: "Jean-Pierre",
                    preferences: { language: "ENG", currency: "EUR" },
                  },
                },
              },
            },
            responses: {
              "200": {
                description:
                  "Profile updated. Returns updated user with preferences.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          allOf: [
                            { $ref: "#/components/schemas/User" },
                            {
                              type: "object",
                              properties: {
                                preferences: {
                                  type: "object",
                                  properties: {
                                    language: { type: "string" },
                                    currency: { type: "string" },
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
              "400": {
                description: "Validation failed.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/me/profile-picture": {
          patch: {
            tags: ["Users – Me"],
            summary: "Update my profile picture",
            description: `
Uploads a new profile picture for the authenticated user via **multipart/form-data**.

**File field name:** \`img\` (max 1 file).
**Accepted formats:** \`.png\`, \`.jpg\`, \`.jpeg\`.
**Max size:** 20MB.

Flow:
1. File is uploaded to FTP storage.
2. Old profile picture (if any) is deleted from FTP.
3. \`profilePictureUrl\` is updated in DB.
4. Returns the transformed public URL.

The returned \`url\` is FTP-transformed and ready to use directly as an \`<img src>\` value.
        `,
            parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
            requestBody: {
              required: true,
              content: {
                "multipart/form-data": {
                  schema: {
                    type: "object",
                    properties: {
                      img: {
                        type: "string",
                        format: "binary",
                        description:
                          "Profile picture file. PNG, JPG, or JPEG. Max 20MB.",
                      },
                    },
                    required: ["img"],
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Profile picture updated.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "object",
                          properties: {
                            url: {
                              type: "string",
                              description:
                                "Public URL of the new profile picture.",
                              example:
                                "https://ftp.infotech.cm/profile/abc123.jpg",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              "400": {
                description:
                  "No file provided, wrong format, or file too large.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/change-password": {
          patch: {
            tags: ["Users – Me"],
            summary: "Change my password",
            description: `
Allows the authenticated user to change their own password.

Requires the current password for verification — returns \`401\` if incorrect.
Same password strength rules apply to \`newPassword\`.
\`confirmPassword\` must exactly match \`newPassword\`.
        `,
            parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ChangePasswordInput" },
                  example: {
                    currentPassword: "OldP@ssw0rd!",
                    newPassword: "N3wS3cur3P@ss!",
                    confirmPassword: "N3wS3cur3P@ss!",
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Password changed.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description: "Validation failed (password too weak, mismatch).",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Current password incorrect.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        // ── Payroll routes ────────────────────────────────────────────────────

        "/api/v1/users/payroll/me": {
          get: {
            tags: ["Users – Payroll"],
            summary: "Get my own payroll data",
            description: `
Returns the authenticated user's own sensitive payroll fields: \`baseSalaryInCFA\`, \`bankName\`, \`cnpsNumber\`, \`taxId\`.

These fields are **excluded from all standard user responses**. This is the only way a user can see their own payroll data.

All reads are logged with \`category: SENSITIVE_READ\` in \`ActivityLog\`.

Returns \`403\` if the user is TERMINATED.
        `,
            parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
            responses: {
              "200": {
                description: "Payroll data returned.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/UserPayrollData" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "User is TERMINATED.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/payroll": {
          get: {
            tags: ["Users – Payroll"],
            summary: "Get all users' payroll data (paginated)",
            description: `
Returns paginated payroll data for all users. Only returns the payroll-specific fields — not the full user profile.

**Permission required:** \`HUMAN_RESOURCES.SALARY_MANAGEMENT.READ\` (or equivalent)

All reads logged with \`category: SENSITIVE_READ\`.

Supports standard pagination and filter query params. Returned fields per user: \`id\`, \`email\`, \`username\`, \`name\`, \`surname\`, \`employeeId\`, \`phoneNumber\`, \`gender\`, \`address\`, \`hireDate\`, \`baseSalaryInCFA\`, \`bankName\`, \`cnpsNumber\`, \`taxId\`.
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/PageParam" },
              { $ref: "#/components/parameters/LimitParam" },
              { $ref: "#/components/parameters/SortByParam" },
              { $ref: "#/components/parameters/SortOrderParam" },
            ],
            responses: {
              "200": {
                description: "Paginated payroll data.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "object",
                          properties: {
                            users: {
                              type: "array",
                              items: {
                                $ref: "#/components/schemas/UserPayrollData",
                              },
                            },
                            meta: {
                              $ref: "#/components/schemas/PaginationMeta",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },

          patch: {
            tags: ["Users – Payroll"],
            summary: "Update a user's payroll data (requires re-auth)",
            description: `
Updates payroll fields for a target user. **Requires re-authentication** — the caller must provide their own login credentials in the request body alongside the payroll changes.

**Permission required:** \`HUMAN_RESOURCES.SALARY_MANAGEMENT.UPDATE\`

This double-auth pattern is intentional for sensitive data. The re-auth goes through full login validation including lockout checking. Failed auth increments the caller's \`failedLoginAttempts\`.

Only the payroll fields provided are updated (partial update). The target user must be non-terminated.
All writes logged with \`category: WRITE\` and the specific changed fields.
        `,
            parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/UpdateUserPayrollDataInput",
                  },
                  example: {
                    userId: "u1a2b3c4-...",
                    baseSalaryInCFA: 400000,
                    bankName: "SCB Cameroun",
                    cnpsNumber: "CNP-654321",
                    taxId: "TAX-210987",
                    login: "admin_user",
                    password: "MyP@ssw0rd!",
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Payroll data updated.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/UserPayrollData" },
                      },
                    },
                  },
                },
              },
              "400": {
                description: "Validation failed.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Re-authentication failed — wrong credentials.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description:
                  "Caller account not active, locked, or insufficient permissions. Target user is terminated.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "Target user not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/payroll/{id}": {
          get: {
            tags: ["Users – Payroll"],
            summary: "Get a specific user's payroll data",
            description: `
Returns payroll fields for a specific user by UUID.

**Permission required:** \`HUMAN_RESOURCES.SALARY_MANAGEMENT.READ\`

Returns \`403\` if the target user is TERMINATED. All reads logged with \`category: SENSITIVE_READ\`.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
            ],
            responses: {
              "200": {
                description: "Payroll data returned.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/UserPayrollData" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions or user is TERMINATED.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "User not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        // ── Employee CRUD ─────────────────────────────────────────────────────

        "/api/v1/users": {
          get: {
            tags: ["Users – Admin"],
            summary: "List all users (paginated)",
            description: `
Returns a paginated list of all active (non-deleted) users. Always includes \`department\` and \`role\` relations.

**Permission required:** \`USER_MANAGEMENT.USERS.READ_ALL\`

Standard filters apply — any non-reserved query param becomes a filter. String values use case-insensitive \`contains\`. UUID values use exact match.

Example filters: \`?status=ACTIVE\`, \`?roleId=<uuid>\`, \`?departmentId=<uuid>\`, \`?name=jean\`.

**Fields never returned:** \`password\`, \`passwordConfirm\`, \`passwordChangedAt\`, \`failedLoginAttempts\`, \`lockedUntil\`, \`deletedAt\` — omitted at the Prisma client level.
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
              { $ref: "#/components/parameters/PageParam" },
              { $ref: "#/components/parameters/LimitParam" },
              { $ref: "#/components/parameters/SortByParam" },
              { $ref: "#/components/parameters/SortOrderParam" },
              {
                in: "query",
                name: "status",
                schema: {
                  type: "string",
                  enum: ["ACTIVE", "SUSPENDED", "TERMINATED"],
                },
                required: false,
                description: "Filter by account status.",
              },
              {
                in: "query",
                name: "roleId",
                schema: { type: "string", format: "uuid" },
                required: false,
                description: "Filter by role UUID (exact match).",
              },
              {
                in: "query",
                name: "departmentId",
                schema: { type: "string", format: "uuid" },
                required: false,
                description: "Filter by department UUID (exact match).",
              },
              {
                in: "query",
                name: "name",
                schema: { type: "string" },
                required: false,
                description:
                  "Filter by first name (case-insensitive contains).",
              },
              {
                in: "query",
                name: "surname",
                schema: { type: "string" },
                required: false,
                description: "Filter by last name (case-insensitive contains).",
              },
            ],
            responses: {
              "200": {
                description: "Paginated user list.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/User" },
                        },
                        meta: { $ref: "#/components/schemas/PaginationMeta" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },

          post: {
            tags: ["Users – Admin"],
            summary: "Create a new employee",
            description: `
Creates a new employee account and triggers the onboarding flow.

**Permission required:** \`USER_MANAGEMENT.USERS.CREATE\`

**What happens on creation (atomic transaction):**
1. User record created with auto-generated \`employeeId\`.
2. \`UserPreference\` record created (defaults: \`FR\` / \`FCFA\`).
3. A \`PASSWORD_SETUP\` token is generated (SHA256 hashed for storage, raw sent by email).
4. Welcome email sent to the new employee's address with a setup link.
5. ActivityLog entry created inside the transaction.

**Email cannot fail silently** — if the email service is down, the operation may still succeed but the employee won't receive the setup link. Use \`POST /resend-invite/:userId\` to resend.

**Validation:**
- \`email\` must be unique (409 on conflict).
- \`departmentId\` and \`roleId\` must both exist.
- All fields are Zod-validated before the transaction begins.

**The response does NOT include the full user schema** — it returns a subset: \`id\`, \`email\`, \`name\`, \`surname\`, \`employeeId\`, \`status\`, \`department\`, \`role\`, etc. It never includes password or payroll fields.
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CreateUserInput" },
                  example: {
                    email: "alice.martin@infotech.cm",
                    name: "Alice",
                    surname: "Martin",
                    nationalIdNumber: "987654321",
                    hireDate: "2025-01-15",
                    departmentId: "dept-uuid-here",
                    roleId: "role-uuid-here",
                    gender: "F",
                    baseSalaryInCFA: 250000,
                  },
                },
              },
            },
            responses: {
              "201": {
                description: "Employee created. Setup email sent.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
              "400": {
                description:
                  "Validation failed, or roleId/departmentId don't exist.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "409": {
                description: "Email already exists.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/active": {
          get: {
            tags: ["Users – Admin"],
            summary: "List all active users (flat, no pagination)",
            description: `
Returns a flat array of all users with \`status: ACTIVE\` and no \`deletedAt\`.

**Permission required:** \`USER_MANAGEMENT.USERS.READ_ALL\`

Use for dropdowns or selectors where you need the full active user list. For tables, use the paginated \`GET /\`.
        `,
            parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
            responses: {
              "200": {
                description: "All active users.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/User" },
                        },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/terminated": {
          get: {
            tags: ["Users – Admin"],
            summary: "List all terminated users (flat)",
            description: `
Returns a flat array of all users with \`status: TERMINATED\`.

**Permission required:** \`USER_MANAGEMENT.USERS.READ_ALL\`
        `,
            parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
            responses: {
              "200": {
                description: "Terminated users.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/User" },
                        },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/change-role": {
          patch: {
            tags: ["Users – Admin"],
            summary: "Change a user's base role",
            description: `
Permanently reassigns a user's primary \`roleId\`.

**Permission required:** \`USER_MANAGEMENT.USERS.CHANGE_ROLE\`

**Constraints:**
- User must not be TERMINATED.
- User must not already have the target role.
- System users return \`403\`.

Permission cache is invalidated for the user.

**This is different from a role override** — this changes the base role permanently. For temporary or additive role grants, use \`POST /api/v1/roles/override\`.
        `,
            parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AssignUserRoleInput" },
                  example: { userId: "u1a2b3c4-...", roleId: "r2b3c4d5-..." },
                },
              },
            },
            responses: {
              "200": {
                description: "Role changed.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description:
                  "Missing body fields, user already has this role, or user is TERMINATED.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions or system user.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "User or role not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/change-department": {
          patch: {
            tags: ["Users – Admin"],
            summary: "Change a user's department",
            description: `
Moves a user to a different department.

**Permission required:** \`USER_MANAGEMENT.USERS.CHANGE_DEPARTMENT\`

User must not be TERMINATED, must not already be in the target department, and system users return \`403\`.
Both \`userId\` and \`departmentId\` must exist.
        `,
            parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      userId: { type: "string", format: "uuid" },
                      departmentId: { type: "string", format: "uuid" },
                    },
                    required: ["userId", "departmentId"],
                  },
                  example: {
                    userId: "u1a2b3c4-...",
                    departmentId: "dept-uuid-here",
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Department changed.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description:
                  "User already in this department or is TERMINATED.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions or system user.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "User or department not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/activate/{userId}": {
          patch: {
            tags: ["Users – Admin"],
            summary: "Activate a user account",
            description: `
Sets \`status: ACTIVE\` on a user who is not already active (e.g. reactivating a TERMINATED account).

**Permission required:** \`USER_MANAGEMENT.USERS.ACTIVATE\`

Returns \`400\` if account is already ACTIVE.

> Note: This is for status activation. For clearing a temporary deactivation (\`deactivatedUntil\`), use \`PATCH /reactivate/:id\` instead.
        `,
            parameters: [
              {
                in: "path",
                name: "userId",
                schema: { type: "string", format: "uuid" },
                required: true,
                description: "UUID of the user to activate.",
              },
              { $ref: "#/components/parameters/XLangHeader" },
            ],
            responses: {
              "200": {
                description: "Account activated.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description: "Account already active.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "User not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/terminate/{userId}": {
          patch: {
            tags: ["Users – Admin"],
            summary: "Terminate an employee",
            description: `
Sets \`status: TERMINATED\`. The employee can no longer log in and most write operations on their record will be blocked.

**Permission required:** \`USER_MANAGEMENT.USERS.TERMINATE\`

Returns \`400\` if already terminated.

This is **not** a soft delete — the record stays visible and queryable. For soft-deleting (hiding the record entirely), use \`DELETE /:id\`.
        `,
            parameters: [
              {
                in: "path",
                name: "userId",
                schema: { type: "string", format: "uuid" },
                required: true,
                description: "UUID of the user to terminate.",
              },
              { $ref: "#/components/parameters/XLangHeader" },
            ],
            responses: {
              "200": {
                description: "Employee terminated.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description: "Already terminated.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "User not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/change-credentials": {
          patch: {
            tags: ["Users – Admin"],
            summary: "Change a user's login credentials (admin)",
            description: `
Admin operation to forcefully reset another user's \`email\`, \`username\`, and \`password\` simultaneously.

**Permission required:** \`USER_MANAGEMENT.USERS.ADMIN\` (high-privilege)

All three are updated atomically. Both new email and username must be unique across all users.
Logged with \`operation: CHANGE_USER_CREDENTIALS\` — the previous email and username are recorded.

This is the **admin override** path. For a user changing their own password, use \`PATCH /change-password\`.
        `,
            parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ChangeUserCredentialsInput",
                  },
                  example: {
                    userId: "u1a2b3c4-...",
                    email: "new.email@infotech.cm",
                    username: "new_username",
                    password: "N3wAdm1nP@ss!",
                    confirmPassword: "N3wAdm1nP@ss!",
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Credentials updated.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description: "Validation failed or user is TERMINATED.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "User not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "409": {
                description: "Email or username already taken.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/deactivate": {
          post: {
            tags: ["Users – Admin"],
            summary: "Temporarily deactivate a user",
            description: `
Sets a future \`deactivatedUntil\` date on a user. Login is blocked from now until that date, even though \`status\` stays \`ACTIVE\`.

**Permission required:** \`USER_MANAGEMENT.USERS.DEACTIVATE\`

**Constraints:**
- \`date\` must be in the future.
- User must not be TERMINATED or already temporarily deactivated.
- System users are immutable.

To cancel a deactivation before its date, use \`PATCH /reactivate/:id\`.
        `,
            parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/DeactivateUserInput" },
                  example: {
                    userId: "u1a2b3c4-...",
                    date: "2025-03-01T00:00:00.000Z",
                  },
                },
              },
            },
            responses: {
              "201": {
                description: "Account deactivated until specified date.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description: "Date is not in the future, or validation failed.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions or system user.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "User not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "409": {
                description: "User already deactivated or terminated.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/reactivate/{id}": {
          patch: {
            tags: ["Users – Admin"],
            summary: "Reactivate a temporarily deactivated user",
            description: `
Clears \`deactivatedUntil\` (sets it to null), immediately re-enabling login for a temporarily deactivated user.

**Permission required:** \`USER_MANAGEMENT.USERS.REACTIVATE\`

Returns \`409\` if the user is not currently in a temporary deactivation (i.e. \`deactivatedUntil\` is null or already past).
Returns \`409\` if TERMINATED.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
            ],
            responses: {
              "201": {
                description: "Account reactivated.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions or system user.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "User not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "409": {
                description:
                  "User is not temporarily deactivated, or is TERMINATED.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/resend-invite/{userId}": {
          post: {
            tags: ["Users – Admin"],
            summary: "Resend account setup invitation email",
            description: `
Generates a new \`PASSWORD_SETUP\` token and resends the setup email to the user.

**Permission required:** \`USER_MANAGEMENT.USERS.RESEND_INVITE\`

**Constraints:**
- User must not be ACTIVE with a password already set (i.e. only works for users who haven't completed setup yet).
- Returns \`409\` if a valid (non-expired, unused) setup token already exists — wait for it to expire first or it may already be in the user's inbox.

New token expires in 24 hours.
        `,
            parameters: [
              {
                in: "path",
                name: "userId",
                schema: { type: "string", format: "uuid" },
                required: true,
                description: "UUID of the user to re-invite.",
              },
              { $ref: "#/components/parameters/XLangHeader" },
            ],
            responses: {
              "200": {
                description: "Invite email sent.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description:
                  "User already has an active account (status ACTIVE + password set).",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "User not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "409": {
                description:
                  "A valid setup token already exists for this user.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/suspend": {
          patch: {
            tags: ["Users – Admin"],
            summary: "Suspend a user (disciplinary)",
            description: `
Suspends a user account for disciplinary or administrative reasons.

**Permission required:** \`USER_MANAGEMENT.USERS.SUSPEND\`

**What happens in one atomic transaction:**
1. \`status\` → \`SUSPENDED\`.
2. \`suspensionReason\` is stored.
3. All active \`PermissionOverride\` records for this user are soft-deleted.

Permission cache is invalidated. A suspension notification email is sent in the user's preferred language.

\`suspensionReason\` is mandatory (10–255 chars). Returns \`409\` if already suspended or terminated.
System users return \`403\`.

To undo: use \`PATCH /reinstate/:id\`.
        `,
            parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuspendUserInput" },
                  example: {
                    userId: "u1a2b3c4-...",
                    suspensionReason:
                      "Unauthorized access to confidential financial records.",
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "User suspended. Email sent.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description: "Suspension reason invalid length.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions or system user.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "User not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "409": {
                description: "User already suspended or terminated.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/reinstate/{id}": {
          patch: {
            tags: ["Users – Admin"],
            summary: "Reinstate a suspended user",
            description: `
Lifts a suspension: sets \`status: ACTIVE\` and clears \`suspensionReason\`.

**Permission required:** \`USER_MANAGEMENT.USERS.REINSTATE\`

Permission cache invalidated. A reinstatement notification email is sent in the user's preferred language.

Returns \`400\` if user is not suspended (or is TERMINATED). System users return \`403\`.

Note: This does **not** restore the permission overrides that were revoked during suspension — those are gone. The user starts fresh with only their role-based permissions.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
            ],
            responses: {
              "200": {
                description: "User reinstated. Email sent.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description: "User is not suspended or is TERMINATED.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions or system user.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "User not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/{id}": {
          get: {
            tags: ["Users – Admin"],
            summary: "Get a user by ID",
            description: `
Returns a single non-deleted user by UUID. Always includes \`department\` and \`role\` relations.

**Permission required:** \`USER_MANAGEMENT.USERS.READ\`

Returns \`404\` if soft-deleted. Standard omitted fields apply (password, etc.).
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
            ],
            responses: {
              "200": {
                description: "User found.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "User not found or soft-deleted.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },

          patch: {
            tags: ["Users – Admin"],
            summary: "Update a user's profile (admin)",
            description: `
Admin endpoint to update basic profile fields of any user. All fields optional.

**Permission required:** \`USER_MANAGEMENT.USERS.UPDATE\`

Does not allow changing: email, username, password, status, roleId, departmentId. Use dedicated endpoints for those.
Audit: previousState, newState, and changedFields all recorded.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/UpdateUserInput" },
                  example: {
                    address: "New address, Douala",
                    emergencyContactName: "Marie Dupont",
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "User updated.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
              "400": {
                description: "Validation failed.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions or system user.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "User not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },

          delete: {
            tags: ["Users – Admin"],
            summary: "Delete a user (soft or hard)",
            description: `
Soft-deletes by default. Pass \`?hard=true\` for permanent deletion.

**Permission required:** \`USER_MANAGEMENT.USERS.DELETE\`

Soft delete appends \`_deleted_<timestamp>\` to: \`email\`, \`username\`, \`employeeId\`, \`nationalIdNumber\`, \`phoneNumber\` — freeing all unique constraints immediately so the same data can be used again.

System users return \`403\`.

**Note: Deletion ≠ Termination.** Terminating sets a status. Deleting hides the record. You may want to terminate first, then delete.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/HardDeleteParam" },
              { $ref: "#/components/parameters/XLangHeader" },
            ],
            responses: {
              "200": {
                description: "User deleted.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions or system user.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "User not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/users/{id}/restore": {
          patch: {
            tags: ["Users – Admin"],
            summary: "Restore a soft-deleted user",
            description: `
Restores a soft-deleted user by nulling \`deletedAt\`.

**Permission required:** \`USER_MANAGEMENT.USERS.RESTORE\`

The \`_deleted_<timestamp>\` suffixes on unique fields (email, username, etc.) are **not** removed automatically — send a \`PATCH /:id\` and \`PATCH /change-credentials\` after to restore them to the intended values.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
            ],
            responses: {
              "200": {
                description: "User restored.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "User not found or not deleted.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        // ════════════════════════════════════════════════════════════
        // ════════════════════════════════════════════════════════════
        // PERMISSIONS  —  /api/v1/permissions
        // Granular ERP capability records. Typically seeded — not
        // created at runtime. Includes override grant/revoke flows.
        // ════════════════════════════════════════════════════════════

        "/api/v1/permissions": {
          get: {
            tags: ["Permissions"],
            summary: "List permissions (paginated)",
            description: `
Returns a paginated list of all active (non-deleted) permissions.

**Permission required:** \`ADMIN.PERMISSIONS.READ\`

Permissions are the atomic capability records that make up the ERP's access control system. They are typically seeded at system setup — runtime creation is rare.

Useful filters:
- \`?module=ACCOUNTING\` — all permissions in the Accounting module
- \`?submodule=SUPPLIER_INVOICES\` — all actions for a specific submodule
- \`?action=APPROVE\` — all approve permissions across modules
- \`?riskLevel=CRITICAL\` — only critical permissions
- \`?isWildcard=true\` — only wildcard permissions

> **Frontend tip:** Fetch the full permission list once and cache it client-side to build permission assignment UIs (checkboxes, group-by-module views). The list changes infrequently.
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
              { $ref: "#/components/parameters/PageParam" },
              { $ref: "#/components/parameters/LimitParam" },
              { $ref: "#/components/parameters/SortByParam" },
              { $ref: "#/components/parameters/SortOrderParam" },
              {
                in: "query",
                name: "module",
                schema: {
                  type: "string",
                  enum: [
                    "EXPLOITATION",
                    "LOGISTICS",
                    "SALES",
                    "FILLING_PRODUCTION",
                    "ACCOUNTING",
                    "HUMAN_RESOURCES",
                    "LEGAL",
                    "MAINTENANCE_TECHNICAL",
                    "RESEARCH_DEVELOPMENT",
                    "ADMIN",
                    "USER_MANAGEMENT",
                  ],
                },
                required: false,
                description: "Filter by top-level module.",
              },
              {
                in: "query",
                name: "submodule",
                schema: { type: "string" },
                required: false,
                description: "Filter by submodule (exact match).",
                example: "SUPPLIER_INVOICES",
              },
              {
                in: "query",
                name: "action",
                schema: {
                  type: "string",
                  enum: [
                    "CREATE",
                    "READ",
                    "UPDATE",
                    "DELETE",
                    "APPROVE",
                    "REJECT",
                    "EXPORT",
                    "IMPORT",
                  ],
                },
                required: false,
                description: "Filter by action type.",
              },
              {
                in: "query",
                name: "riskLevel",
                schema: {
                  type: "string",
                  enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
                },
                required: false,
                description: "Filter by risk level.",
              },
              {
                in: "query",
                name: "isWildcard",
                schema: { type: "boolean" },
                required: false,
                description: "Filter wildcard vs. specific permissions.",
              },
            ],
            responses: {
              "200": {
                description: "Paginated permissions list.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Permission" },
                        },
                        meta: { $ref: "#/components/schemas/PaginationMeta" },
                      },
                    },
                    example: {
                      success: true,
                      data: [
                        {
                          id: "perm-uuid-1",
                          code: "ACCOUNTING.SUPPLIER_INVOICES.READ",
                          engName: "Read Supplier Invoices",
                          frName: "Lire les factures fournisseurs",
                          module: "ACCOUNTING",
                          submodule: "SUPPLIER_INVOICES",
                          action: "READ",
                          riskLevel: "LOW",
                          isWildcard: false,
                        },
                        {
                          id: "perm-uuid-2",
                          code: "ACCOUNTING.SUPPLIER_INVOICES.APPROVE",
                          engName: "Approve Supplier Invoices",
                          frName: "Approuver les factures fournisseurs",
                          module: "ACCOUNTING",
                          submodule: "SUPPLIER_INVOICES",
                          action: "APPROVE",
                          riskLevel: "HIGH",
                          isWildcard: false,
                        },
                      ],
                      meta: {
                        total: 87,
                        page: 1,
                        limit: 20,
                        totalPages: 5,
                        hasNextPage: true,
                        hasPrevPage: false,
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/permissions/wild": {
          get: {
            tags: ["Permissions"],
            summary: "List wildcard permissions (flat)",
            description: `
Returns a flat array of all active permissions where \`isWildcard: true\`.

**Permission required:** \`ADMIN.PERMISSIONS.READ_ALL\`

Wildcard permissions expand to match all permission codes with the same prefix during resolution in \`getUserPermissions\`. Useful for building UI that shows "grant all" shortcuts per module or submodule.

Example wildcards: \`ACCOUNTING.*\` (all accounting actions), \`*\` (superadmin, all permissions).
        `,
            parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
            responses: {
              "200": {
                description: "All wildcard permissions.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Permission" },
                        },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/permissions/override": {
          post: {
            tags: ["Permissions"],
            summary: "Grant a permission override to a user",
            description: `
Directly grants a specific permission to a user, overriding their role's permission set.

**Permission required:** \`ADMIN.PERMISSIONS.CREATE_OVERRIDE\`

**This is an upsert** — if a previous override exists for the same \`userId\`/\`permissionId\` pair but was soft-deleted or expired, it is reactivated with the new \`reason\` and \`expiresAt\` instead of creating a duplicate. The \`@@unique([userId, permissionId])\` constraint is the key here.

If an **active** override (non-deleted, non-expired, \`isGranted: true\`) already exists, returns \`409\` — revoke it first before re-granting.

**User constraints:**
- Must exist and not be soft-deleted.
- Must not be a system user.
- Must be \`ACTIVE\` — terminated and suspended users cannot receive overrides.

**Permission cache** for the target user is invalidated immediately on success.

**Expiry behavior:** If \`expiresAt\` is provided, \`isTemporary\` is set to \`true\` automatically. Expired overrides are ignored during permission resolution but remain in the DB — they are not auto-deleted.

> **Frontend tip:** After granting, you don't need to force the user to re-login — the next request they make will pick up the updated permissions from the refreshed cache.
        `,
            parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/PermissionOverrideInput",
                  },
                  example: {
                    userId: "u1a2b3c4-d5e6-7890-abcd-ef1234567890",
                    permissionId: "perm-uuid-here",
                    reason:
                      "Granted temporary access for Q1 2025 external audit review.",
                    expiresAt: "2025-03-31T23:59:59.000Z",
                  },
                },
              },
            },
            responses: {
              "201": {
                description: "Override granted. Permission cache invalidated.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description:
                  "Validation failed — missing fields or reason outside 10–255 char range.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description:
                  "Insufficient permissions or target is a system user.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "User or permission not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "409": {
                description:
                  "An active override already exists for this user/permission pair. Revoke it first.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/permissions/revoke-override": {
          patch: {
            tags: ["Permissions"],
            summary: "Revoke a permission override from a user",
            description: `
Revokes an active permission override by \`userId\` + \`permissionId\`.

**Permission required:** \`ADMIN.PERMISSIONS.REVOKE_OVERRIDE\`

Looks up the first active override matching: \`userId\`, \`permissionId\`, \`isGranted: true\`, \`deletedAt: null\`, not expired.

On success: sets \`isGranted: false\` and \`deletedAt: now()\` on the override record. Permission cache for the target user is invalidated immediately.

Returns \`404\` if no matching active override is found (either it was already revoked, never existed, or expired).

> **Note:** This only revokes overrides created via \`POST /override\`. Overrides revoked during user suspension (\`PATCH /users/suspend\`) are not restored here — they are permanently gone.
        `,
            parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/RevokePermissionOverrideInput",
                  },
                  example: {
                    userId: "u1a2b3c4-d5e6-7890-abcd-ef1234567890",
                    permissionId: "perm-uuid-here",
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Override revoked. Permission cache invalidated.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/MessageResponse" },
                  },
                },
              },
              "400": {
                description: "Missing `userId` or `permissionId` in body.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description:
                  "No active override found for this user/permission pair.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/permissions/{id}": {
          get: {
            tags: ["Permissions"],
            summary: "Get a permission by ID",
            description: `
Fetches a single permission by UUID.

**Permission required:** \`ADMIN.PERMISSIONS.READ_ALL\`

Returns \`404\` if the permission is soft-deleted.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
            ],
            responses: {
              "200": {
                description: "Permission found.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/Permission" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "Permission not found or soft-deleted.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        // ════════════════════════════════════════════════════════════
        // ACTIVITY LOGS  —  /api/v1/activity-logs
        // Read-only. All writes are system-generated.
        // Permission module: ADMIN > AUDIT_LOGS
        // ════════════════════════════════════════════════════════════

        "/api/v1/activity-logs": {
          get: {
            tags: ["Activity Logs"],
            summary: "List activity logs (paginated)",
            description: `
Returns a paginated list of audit log entries. Unlike all other list endpoints, **soft-deleted records are NOT excluded** — the repository overrides the standard \`buildWhereClause\` to omit the \`deletedAt: null\` filter, so all logs are always visible.

**Permission required:** \`ADMIN.AUDIT_LOGS.READ\`

Standard filters apply on all fields. Useful filter combinations:
- \`?operation=AUTH\` — all login events
- \`?category=SENSITIVE_READ\` — all payroll/confidential data access
- \`?tableName=users\` — all operations on the users table
- \`?userId=<uuid>\` — all actions by a specific user
- \`?status=FAILED\` — failed operations only

Logs are sorted by \`createdAt\` descending by default (most recent first).
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/PageParam" },
              { $ref: "#/components/parameters/LimitParam" },
              { $ref: "#/components/parameters/SortByParam" },
              { $ref: "#/components/parameters/SortOrderParam" },
              {
                in: "query",
                name: "operation",
                schema: {
                  type: "string",
                  enum: [
                    "CREATE",
                    "READ",
                    "UPDATE",
                    "DELETE",
                    "AUTH",
                    "FORGOT_PASSWORD",
                    "RESET_PASSWORD",
                    "CHANGE_PASSWORD",
                    "CHANGE_USER_CREDENTIALS",
                  ],
                },
                required: false,
                description: "Filter by operation type.",
              },
              {
                in: "query",
                name: "category",
                schema: {
                  type: "string",
                  enum: ["WRITE", "READ", "SENSITIVE_READ"],
                },
                required: false,
                description: "Filter by log category.",
              },
              {
                in: "query",
                name: "tableName",
                schema: { type: "string" },
                required: false,
                description:
                  "Filter by target table name (case-insensitive contains).",
                example: "users",
              },
              {
                in: "query",
                name: "userId",
                schema: { type: "string", format: "uuid" },
                required: false,
                description: "Filter by actor user ID.",
              },
              {
                in: "query",
                name: "status",
                schema: { type: "string", enum: ["SUCCESS", "FAILED"] },
                required: false,
                description: "Filter by operation outcome.",
              },
            ],
            responses: {
              "200": {
                description: "Paginated activity logs.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/ActivityLog" },
                        },
                        meta: { $ref: "#/components/schemas/PaginationMeta" },
                      },
                    },
                    example: {
                      success: true,
                      data: [
                        {
                          id: "log-uuid",
                          userId: "u1a2b3c4-...",
                          userEmail: "admin@infotech.cm",
                          operation: "UPDATE",
                          category: "WRITE",
                          tableName: "users",
                          recordId: "u2b3c4d5-...",
                          previousState: { status: "ACTIVE" },
                          newState: { status: "SUSPENDED" },
                          changedFields: ["status", "suspensionReason"],
                          status: "SUCCESS",
                          createdAt: "2025-01-15T10:30:00.000Z",
                        },
                      ],
                      meta: {
                        total: 1520,
                        page: 1,
                        limit: 20,
                        totalPages: 76,
                        hasNextPage: true,
                        hasPrevPage: false,
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/activity-logs/{id}": {
          get: {
            tags: ["Activity Logs"],
            summary: "Get a single activity log by ID",
            description: `
Fetches a single audit log entry by UUID.

**Permission required:** \`ADMIN.AUDIT_LOGS.READ_ALL\`

Useful for drilling into a specific operation to see full \`previousState\` and \`newState\` JSON.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
            ],
            responses: {
              "200": {
                description: "Log entry found.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/ActivityLog" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "Log entry not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        // ════════════════════════════════════════════════════════════
        // ADMIN CONFIG  —  /api/v1/admin-config
        // Singleton. No create. GET and PATCH only.
        // Permission module: ADMIN > SYSTEM_CONFIG
        // ════════════════════════════════════════════════════════════

        "/api/v1/admin-config": {
          get: {
            tags: ["Admin Config"],
            summary: "List admin config (returns the singleton record)",
            description: `
Returns the paginated list of \`AdminConfig\` records — in practice, this always returns exactly one record (the \`MAIN\` singleton).

**Permission required:** \`ADMIN.SYSTEM_CONFIG.READ\`

You can also use \`GET /api/v1/admin-config/MAIN\` to fetch it directly by ID.
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/PageParam" },
              { $ref: "#/components/parameters/LimitParam" },
            ],
            responses: {
              "200": {
                description: "Admin config.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "array",
                          items: { $ref: "#/components/schemas/AdminConfig" },
                        },
                        meta: { $ref: "#/components/schemas/PaginationMeta" },
                      },
                    },
                    example: {
                      success: true,
                      data: [
                        {
                          id: "MAIN",
                          companyEmail: "contact@infotech.cm",
                          supportEmail: "support@infotech.cm",
                          companyPhoneNumber: "+237 2XX XXX XXX",
                          companyPrefix: "INF",
                          logoUrl: null,
                          createdAt: "2024-01-01T00:00:00.000Z",
                          updatedAt: "2024-06-01T00:00:00.000Z",
                        },
                      ],
                      meta: {
                        total: 1,
                        page: 1,
                        limit: 20,
                        totalPages: 1,
                        hasNextPage: false,
                        hasPrevPage: false,
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/admin-config/{id}": {
          get: {
            tags: ["Admin Config"],
            summary: "Get admin config by ID",
            description: `
Fetches the \`AdminConfig\` record by its ID. Use \`MAIN\` as the ID since that is the only valid value.

**Permission required:** \`ADMIN.SYSTEM_CONFIG.READ\`

Example: \`GET /api/v1/admin-config/MAIN\`
        `,
            parameters: [
              {
                in: "path",
                name: "id",
                schema: { type: "string", enum: ["MAIN"] },
                required: true,
                description: "Always `MAIN` — the only valid value.",
                example: "MAIN",
              },
              { $ref: "#/components/parameters/XLangHeader" },
            ],
            responses: {
              "200": {
                description: "Admin config record.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/AdminConfig" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description:
                  "Config not found (should not happen in normal operation).",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },

          patch: {
            tags: ["Admin Config"],
            summary: "Update admin config",
            description: `
Updates the \`AdminConfig\` singleton. All fields are optional — only include what you want to change.

**Permission required:** \`ADMIN.SYSTEM_CONFIG.UPDATE\`

⚠️ **Changing \`companyPrefix\`** will affect all future auto-generated employee IDs. Existing IDs are not changed.

**Changing \`logoUrl\`** affects all future system-sent emails (account setup, password reset, suspension notices).

Audit: \`previousState\` and \`newState\` are recorded in \`ActivityLog\`.
        `,
            parameters: [
              {
                in: "path",
                name: "id",
                schema: { type: "string", enum: ["MAIN"] },
                required: true,
                example: "MAIN",
              },
              { $ref: "#/components/parameters/XLangHeader" },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/UpdateAdminConfigInput",
                  },
                  example: {
                    supportEmail: "newteam@infotech.cm",
                    logoUrl: "https://cdn.infotech.cm/logo-v2.png",
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Config updated.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/AdminConfig" },
                      },
                    },
                  },
                },
              },
              "400": {
                description:
                  "Validation failed (invalid email format, URL, or out-of-range length).",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        // ════════════════════════════════════════════════════════════
        // PERMISSION OVERRIDES  —  /api/v1/permission-overrides
        // Read-only listing. Creates happen via user management flows.
        // Permission module: ADMIN > PERMISSIONS
        // ════════════════════════════════════════════════════════════

        "/api/v1/permission-overrides": {
          get: {
            tags: ["Permission Overrides"],
            summary: "List permission overrides (paginated)",
            description: `
Returns a paginated list of \`PermissionOverride\` records — user-level grants and revocations.

**Permission required:** \`ADMIN.PERMISSIONS.READ_ALL\`

Useful filter combinations:
- \`?userId=<uuid>\` — all overrides for a specific user
- \`?isGranted=true\` — only grants
- \`?isGranted=false\` — only revocations
- \`?permissionId=<uuid>\` — all users with a specific permission overridden

Use \`?include=permission\` to include full permission details in each record.

**Note:** This shows active (non-deleted) overrides. Suspended users' overrides are soft-deleted and won't appear here.
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/PageParam" },
              { $ref: "#/components/parameters/LimitParam" },
              { $ref: "#/components/parameters/SortByParam" },
              { $ref: "#/components/parameters/SortOrderParam" },
              { $ref: "#/components/parameters/IncludeParam" },
              {
                in: "query",
                name: "userId",
                schema: { type: "string", format: "uuid" },
                required: false,
                description: "Filter by user ID.",
              },
              {
                in: "query",
                name: "permissionId",
                schema: { type: "string", format: "uuid" },
                required: false,
                description: "Filter by permission ID.",
              },
              {
                in: "query",
                name: "isGranted",
                schema: { type: "boolean" },
                required: false,
                description: "Filter by grant/revoke status.",
              },
            ],
            responses: {
              "200": {
                description: "Paginated list of permission overrides.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "array",
                          items: {
                            $ref: "#/components/schemas/PermissionOverride",
                          },
                        },
                        meta: { $ref: "#/components/schemas/PaginationMeta" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/permission-overrides/{id}": {
          get: {
            tags: ["Permission Overrides"],
            summary: "Get a permission override by ID",
            description: `
Fetches a single \`PermissionOverride\` record.

**Permission required:** \`ADMIN.PERMISSIONS.READ\`

Use \`?include=permission\` to include the full \`Permission\` object in the response.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/IncludeParam" },
            ],
            responses: {
              "200": {
                description: "Override found.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          $ref: "#/components/schemas/PermissionOverride",
                        },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "Override not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        // ════════════════════════════════════════════════════════════
        // ROLE PERMISSIONS  —  /api/v1/role-permissions
        // Read-only listing. Writes via POST /api/v1/roles/assign-permissions.
        // Permission module: ADMIN > PERMISSIONS
        // ════════════════════════════════════════════════════════════

        "/api/v1/role-permissions": {
          get: {
            tags: ["Role Permissions"],
            summary: "List role permissions (paginated)",
            description: `
Returns a paginated list of \`RolePermission\` join records — the mappings between roles and their assigned permissions.

**Permission required:** \`ADMIN.PERMISSIONS.READ_ALL\`

> **For adding permissions to roles**, use \`POST /api/v1/roles/assign-permissions\` — it handles bulk upserts and cache invalidation. This endpoint is for inspection only.

Useful filter combinations:
- \`?roleId=<uuid>\` — all permissions assigned to a specific role
- \`?permissionId=<uuid>\` — all roles that have a specific permission

Use \`?include=role,permission\` to include full related records.
        `,
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/PageParam" },
              { $ref: "#/components/parameters/LimitParam" },
              { $ref: "#/components/parameters/SortByParam" },
              { $ref: "#/components/parameters/SortOrderParam" },
              { $ref: "#/components/parameters/IncludeParam" },
              {
                in: "query",
                name: "roleId",
                schema: { type: "string", format: "uuid" },
                required: false,
                description: "Filter by role ID.",
              },
              {
                in: "query",
                name: "permissionId",
                schema: { type: "string", format: "uuid" },
                required: false,
                description: "Filter by permission ID.",
              },
            ],
            responses: {
              "200": {
                description: "Paginated list of role-permission assignments.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: {
                          type: "array",
                          items: {
                            $ref: "#/components/schemas/RolePermission",
                          },
                        },
                        meta: { $ref: "#/components/schemas/PaginationMeta" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        "/api/v1/role-permissions/{id}": {
          get: {
            tags: ["Role Permissions"],
            summary: "Get a role permission record by ID",
            description: `
Fetches a single \`RolePermission\` record.

**Permission required:** \`ADMIN.PERMISSIONS.READ\`

Use \`?include=role,permission\` to include the full \`Role\` and \`Permission\` objects.
        `,
            parameters: [
              { $ref: "#/components/parameters/IdParam" },
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/IncludeParam" },
            ],
            responses: {
              "200": {
                description: "Record found.",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                        data: { $ref: "#/components/schemas/RolePermission" },
                      },
                    },
                  },
                },
              },
              "401": {
                description: "Missing or invalid JWT.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "403": {
                description: "Insufficient permissions.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
              "404": {
                description: "Record not found.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/ErrorResponse" },
                  },
                },
              },
            },
          },
        },

        // ════════════════════════════════════════════════════════════
        // SYSTEM
        // ════════════════════════════════════════════════════════════
        // ════════════════════════════════════════════════════════════
        // SYSTEM
        // ════════════════════════════════════════════════════════════

        "/": {
          get: {
            summary: "Health check",
            description:
              "Use this endpoint to verify the server is up and to test your global header configuration (x-lang, x-currency). No authentication required.",
            security: [],
            tags: ["System"],
            parameters: [
              { $ref: "#/components/parameters/XLangHeader" },
              { $ref: "#/components/parameters/XCurrencyHeader" },
            ],
            responses: {
              "200": {
                description: "Server is up and running.",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: { type: "string" },
                    },
                    example: ["Pliengaz - Infotech Server is up and running."],
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
