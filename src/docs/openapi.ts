/**
 * Pliengaz - Infotech API OpenAPI 3.0 Specification
 *
 * This specification is designed to render correctly in Swagger UI.
 * All special characters have been replaced with standard ASCII.
 */

export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Pliengaz - Infotech API",
    version: "1.0.0",
    description:
      'Backend API for the Pliengaz ERP system, built for INFOTECH S.A., a gas distribution company in Cameroon.\n\n## Global Request Headers\n\nEvery request to this API can (or must) include the following headers.\n\n### x-lang - Language Preference\n\n**Optional** | Default: FR\n\nControls the language of all human-readable response messages. Does not affect data fields stored in the database.\n\n| Value | Language |\n|-------|----------|\n| FR | French (default) |\n| ENG | English |\n\n### x-currency - Currency Preference\n\n**Optional** | Default: FCFA\n\nControls how monetary values are formatted. The API stores all amounts in FCFA and converts when this header is set.\n\n| Value | Currency |\n|-------|----------|\n| FCFA | Central African Franc (default) |\n| USD | US Dollar |\n| EUR | Euro |\n\n### Authorization - Bearer Token (JWT)\n\n**Required on all protected routes**\n\nAfter a successful login, include the token in every request:\n\n```\nAuthorization: Bearer <accessToken>\n```\n\n## Error Response Format\n\nAll errors follow this shape:\n\n```json\n{\n  "success": false,\n  "message": "Human-readable error message",\n  "code": "ERROR_CODE_CONSTANT",\n  "statusCode": 403\n}\n```',
  },
  servers: [
    {
      url: "",
      description: "Local server",
    },
  ],
  security: [
    {
      BearerAuth: [],
    },
  ],
  tags: [
    { name: "System", description: "Health check and system status" },
    { name: "Users - Auth", description: "Authentication endpoints" },
    {
      name: "Users - Me",
      description: "Self-service endpoints for authenticated user",
    },
    { name: "Users - Payroll", description: "Payroll data management" },
    { name: "Users - Admin", description: "User administration" },
    { name: "Roles", description: "Role management" },
    { name: "Departments", description: "Department management" },
    { name: "Permissions", description: "Permission management" },
    {
      name: "Permission Overrides",
      description: "User-level permission overrides",
    },
    { name: "Role Permissions", description: "Role-permission mappings" },
    { name: "Activity Logs", description: "Audit trail" },
    { name: "Admin Config", description: "System configuration" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT access token obtained from /auth/login endpoint",
      },
    },
    parameters: {
      XLangHeader: {
        in: "header",
        name: "x-lang",
        schema: { type: "string", enum: ["ENG", "FR"] },
        required: false,
        description:
          "Language preference for response messages. Defaults to FR.",
        example: "ENG",
      },
      XCurrencyHeader: {
        in: "header",
        name: "x-currency",
        schema: { type: "string", enum: ["USD", "EUR", "FCFA"] },
        required: false,
        description:
          "Currency preference for monetary values. Defaults to FCFA.",
        example: "EUR",
      },
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
        description: "Field name to sort results by. Defaults to createdAt.",
      },
      SortOrderParam: {
        in: "query",
        name: "sortOrder",
        schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
        required: false,
        description: "Sort direction. Defaults to desc.",
      },
      IncludeParam: {
        in: "query",
        name: "include",
        schema: { type: "string" },
        required: false,
        description:
          "Comma-separated list of relations to include. Example: role,department",
        example: "role,department",
      },
      HardDeleteParam: {
        in: "query",
        name: "hard",
        schema: { type: "boolean", default: false },
        required: false,
        description:
          "When true, performs permanent delete. Default is soft delete.",
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
      PaginationMeta: {
        type: "object",
        description: "Pagination metadata returned on all list endpoints.",
        properties: {
          total: {
            type: "integer",
            description: "Total records matching filters.",
            example: 42,
          },
          page: {
            type: "integer",
            description: "Current page number.",
            example: 1,
          },
          limit: {
            type: "integer",
            description: "Records per page.",
            example: 20,
          },
          totalPages: {
            type: "integer",
            description: "Total pages available.",
            example: 3,
          },
          hasNextPage: {
            type: "boolean",
            description: "Whether next page exists.",
            example: true,
          },
          hasPrevPage: {
            type: "boolean",
            description: "Whether previous page exists.",
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
        description: "Standard error envelope for all 4xx/5xx responses.",
        properties: {
          ok: {
            type: "boolean",
            example: false,
            description: "Always false on error.",
          },
          status: {
            type: "string",
            enum: ["fail", "error"],
            description: "fail for 4xx, error for 5xx.",
            example: "fail",
          },
          message: {
            type: "string",
            description: "Localized error message based on x-lang header.",
            example: "Ce departement contient des utilisateurs actifs.",
          },
        },
        required: ["ok", "status", "message"],
      },
      Department: {
        type: "object",
        description:
          "An organizational unit within INFOTECH S.A. Every User must belong to exactly one Department.",
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "Unique identifier.",
            example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          },
          name: {
            type: "string",
            description:
              "Full department name. Must be unique. Min 2 characters.",
            example: "Comptabilite",
          },
          code: {
            type: "string",
            description:
              "Short code. Always stored in UPPERCASE. Must be unique. 2-10 characters.",
            example: "COMPTA",
          },
          isSystem: {
            type: "boolean",
            nullable: true,
            description: "If true, this department is immutable.",
            example: false,
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "ISO 8601 timestamp of creation.",
            example: "2024-01-15T08:30:00.000Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            description: "ISO 8601 timestamp of last update.",
            example: "2024-06-01T14:22:00.000Z",
          },
        },
        required: ["id", "name", "code", "createdAt", "updatedAt"],
      },
      CreateDepartmentInput: {
        type: "object",
        description: "Request body for creating a new department.",
        properties: {
          name: {
            type: "string",
            minLength: 2,
            description: "Department name. Must be unique.",
            example: "Ressources Humaines",
          },
          code: {
            type: "string",
            minLength: 2,
            maxLength: 10,
            description: "Short code. Auto-converted to UPPERCASE.",
            example: "RH",
          },
        },
        required: ["name", "code"],
      },
      UpdateDepartmentInput: {
        type: "object",
        description:
          "Request body for updating a department. All fields optional.",
        properties: {
          name: {
            type: "string",
            minLength: 2,
            description: "New department name.",
            example: "Direction Generale",
          },
          code: {
            type: "string",
            minLength: 2,
            maxLength: 10,
            description: "New department code.",
            example: "DG",
          },
        },
      },
      Role: {
        type: "object",
        description:
          "Defines a job function or access tier. Every User must have exactly one Role.",
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
            description: "Human-readable explanation.",
            example: "Manages all accounting operations.",
          },
          isActive: {
            type: "boolean",
            description: "Whether the role is active.",
            example: true,
          },
          isSystem: {
            type: "boolean",
            nullable: true,
            description: "If true, this role is immutable.",
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
      Permission: {
        type: "object",
        description:
          "A granular permission tied to a specific module, submodule, and action. Code format: MODULE.SUBMODULE.ACTION",
        properties: {
          id: { type: "string", format: "uuid" },
          code: {
            type: "string",
            description: "Unique machine-readable identifier.",
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
            example: "Creer une facture fournisseur",
          },
          description: {
            type: "string",
            nullable: true,
            description: "Optional explanation.",
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
            description: "Top-level business module.",
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
            description: "Sensitivity level.",
            example: "MEDIUM",
          },
          isWildcard: {
            type: "boolean",
            description:
              "If true, grants all matching actions via prefix expansion.",
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
            description: "What this role does.",
            example: "Oversees all logistics operations.",
          },
          isActive: {
            type: "boolean",
            default: true,
            description: "Whether the role starts active.",
          },
        },
        required: ["name", "description"],
      },
      UpdateRoleInput: {
        type: "object",
        description:
          "All fields optional. Only include what you want to change.",
        properties: {
          name: { type: "string", minLength: 2, example: "Chef Comptable" },
          description: { type: "string", minLength: 1 },
          isActive: {
            type: "boolean",
            description:
              "Prefer using /disable and /enable endpoints to toggle this.",
          },
        },
      },
      AssignRolePermissionInput: {
        type: "object",
        description:
          "Body for bulk-assigning permissions to a role. This is additive and idempotent.",
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
            description: "Array of permission UUIDs to assign.",
            items: { type: "string", format: "uuid" },
            example: ["p1a2b3c4-d5e6-7890-abcd-ef1234567890"],
          },
        },
        required: ["roleId", "permissionIds"],
      },
      RoleOverrideInput: {
        type: "object",
        description:
          "Grants a specific role to a user temporarily or permanently, in addition to their base role.",
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
            description: "Mandatory justification.",
            example: "Covering for Head of Accounting.",
          },
          expiresAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "When the override expires. Null for permanent.",
            example: "2025-03-01T00:00:00.000Z",
          },
        },
        required: ["roleId", "userId", "reason"],
      },
      RevokeRoleOverrideInput: {
        type: "object",
        description: "Body for revoking an active role override.",
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
      PermissionOverrideInput: {
        type: "object",
        description:
          "Grants a specific permission directly to a user, bypassing their role.",
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
            description: "Mandatory justification (10-255 chars).",
            example: "Granted temporary read access for audit.",
          },
          expiresAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Optional expiry. If omitted, override is permanent.",
            example: "2025-06-30T23:59:59.000Z",
          },
        },
        required: ["userId", "permissionId", "reason"],
      },
      RevokePermissionOverrideInput: {
        type: "object",
        description: "Revokes an active permission override for a user.",
        properties: {
          userId: { type: "string", format: "uuid" },
          permissionId: { type: "string", format: "uuid" },
        },
        required: ["userId", "permissionId"],
      },
      AssignUserRoleInput: {
        type: "object",
        description: "Permanently reassigns a user's base role.",
        properties: {
          roleId: {
            type: "string",
            format: "uuid",
            description: "The new role to assign.",
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
          "Simple success response for operations that do not return a full resource.",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Localized success message.",
                example: "Role desactive avec succes.",
              },
            },
          },
        },
      },
      User: {
        type: "object",
        description:
          "An employee of INFOTECH S.A. registered in the ERP system. Sensitive fields (password, etc.) are never returned.",
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
            description: "Unique. 3-30 chars, alphanumeric + underscore only.",
            example: "jean_dupont",
          },
          name: { type: "string", description: "First name.", example: "Jean" },
          surname: {
            type: "string",
            description: "Last name.",
            example: "Dupont",
          },
          employeeId: {
            type: "string",
            description: "Auto-generated. Format: PREFIX-YYMM-NNNN.",
            example: "INF-2501-0042",
          },
          nationalIdNumber: {
            type: "string",
            description: "National ID card number. Unique.",
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
            description: "Current account status.",
            example: "ACTIVE",
          },
          suspensionReason: {
            type: "string",
            nullable: true,
            description: "Reason for suspension. Null when not suspended.",
            example: "Violation of company policy.",
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
            description: "Date of birth.",
            example: "1990-05-15",
          },
          address: {
            type: "string",
            nullable: true,
            example: "Quartier Bastos, Yaounde",
          },
          profilePictureUrl: {
            type: "string",
            nullable: true,
            description: "URL of profile picture.",
            example: "https://ftp.infotech.cm/profile/abc123.jpg",
          },
          isEmailVerified: {
            type: "boolean",
            description: "True after successful account setup.",
            example: true,
          },
          hireDate: {
            type: "string",
            format: "date",
            description: "Date the employee was hired.",
            example: "2023-01-10",
          },
          deactivatedUntil: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "If set and in future, login is blocked.",
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
            description: "System users are immutable.",
            example: false,
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          department: { $ref: "#/components/schemas/Department" },
          role: { $ref: "#/components/schemas/Role" },
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
          "Credentials for logging in. Accepts either username or email as the login field.",
        properties: {
          login: {
            type: "string",
            description: "Username or email address.",
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
        description:
          "Returned on successful login. Contains user profile, permissions, and JWT token.",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              token: {
                type: "string",
                description: "JWT access token.",
                example: "eyJhbGciOiJIUzI1NiJ9...",
              },
              user: { $ref: "#/components/schemas/User" },
            },
          },
        },
      },
      CreateUserInput: {
        type: "object",
        description:
          "Creates a new employee account. A setup email is sent to the new employee.",
        properties: {
          email: {
            type: "string",
            format: "email",
            description: "Must be unique.",
            example: "alice.martin@infotech.cm",
          },
          name: { type: "string", minLength: 1, example: "Alice" },
          surname: { type: "string", minLength: 1, example: "Martin" },
          nationalIdNumber: {
            type: "string",
            minLength: 1,
            description: "Must be unique.",
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
            description: "Required.",
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
            description: "Must exist.",
            example: "dept-uuid-here",
          },
          roleId: {
            type: "string",
            format: "uuid",
            description: "Must exist.",
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
        description:
          "Used by new employees to set their credentials for the first time.",
        properties: {
          token: {
            type: "string",
            description: "Raw token from the setup email.",
            example: "abc123def456",
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
            description: "Must match password.",
            example: "S3cur3P@ssword!",
          },
        },
        required: ["token", "username", "password", "confirmPassword"],
      },
      ForgotPasswordInput: {
        type: "object",
        description:
          "Initiates password reset. Always returns 200 even if email does not exist.",
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
        description: "Completes password reset using token from email.",
        properties: {
          token: {
            type: "string",
            description: "Raw token from reset email.",
            example: "xyz789abc",
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
            description: "Must match password.",
            example: "N3wS3cur3P@ss!",
          },
        },
        required: ["token", "password", "confirmPassword"],
      },
      ChangePasswordInput: {
        type: "object",
        description: "Allows authenticated user to change their own password.",
        properties: {
          currentPassword: {
            type: "string",
            format: "password",
            description: "Current password.",
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
            description: "Must match newPassword.",
            example: "N3wS3cur3P@ss!",
          },
        },
        required: ["currentPassword", "newPassword", "confirmPassword"],
      },
      UpdateMeInput: {
        type: "object",
        description:
          "Allows authenticated user to update their own profile and preferences.",
        properties: {
          name: { type: "string", minLength: 1, example: "Jean-Pierre" },
          surname: { type: "string", minLength: 1, example: "Dupont" },
          nationalIdNumber: {
            type: "string",
            minLength: 1,
            example: "123456789",
          },
          phoneNumber: { type: "string", example: "+237 6XX XXX XXX" },
          address: { type: "string", example: "Nouvelle adresse, Yaounde" },
          emergencyContactName: { type: "string" },
          emergencyContactPhoneNumber: { type: "string" },
          preferences: {
            type: "object",
            description: "User language and currency preferences.",
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
          "Admin endpoint to update another user's profile fields. All fields optional.",
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
        description:
          "Temporarily deactivates a user account until a specified date.",
        properties: {
          userId: {
            type: "string",
            format: "uuid",
            description: "Target user ID.",
          },
          date: {
            type: "string",
            format: "date-time",
            description: "Future date until which account is deactivated.",
            example: "2025-03-01T00:00:00.000Z",
          },
        },
        required: ["userId", "date"],
      },
      SuspendUserInput: {
        type: "object",
        description: "Suspends a user account for disciplinary reasons.",
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
            description: "Mandatory justification.",
            example: "Repeated violation of data access policies.",
          },
        },
        required: ["userId", "suspensionReason"],
      },
      ChangeUserCredentialsInput: {
        type: "object",
        description:
          "Admin operation to change another user's email, username, and password.",
        properties: {
          userId: {
            type: "string",
            minLength: 1,
            description: "Target user ID.",
            example: "u1a2b3c4",
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
            description: "Must match password.",
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
      UserPayrollData: {
        type: "object",
        description:
          "Sensitive payroll fields. Returned by payroll-specific endpoints only.",
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
            description: "CNPS social security number.",
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
        description:
          "Updates payroll data for a target user. Requires re-authentication.",
        properties: {
          userId: {
            type: "string",
            description: "Target user ID.",
            example: "u1a2b3c4",
          },
          baseSalaryInCFA: { type: "integer", minimum: 1, example: 400000 },
          bankName: { type: "string", example: "SCB Cameroun" },
          cnpsNumber: { type: "string", example: "CNP-654321" },
          taxId: { type: "string", example: "TAX-210987" },
          login: {
            type: "string",
            description: "Caller's username or email for re-authentication.",
            example: "admin_user",
          },
          password: {
            type: "string",
            format: "password",
            description: "Caller's password for re-authentication.",
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
      ActivityLog: {
        type: "object",
        description:
          "An immutable audit trail record created automatically on every significant operation.",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: {
            type: "string",
            format: "uuid",
            nullable: true,
            description: "Actor's user ID. Null for system operations.",
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
              "WRITE for mutations, READ for standard reads, SENSITIVE_READ for payroll data.",
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
            example: "u1a2b3c4",
          },
          previousState: {
            type: "object",
            nullable: true,
            description: "JSON snapshot before operation. Null for CREATE.",
          },
          newState: {
            type: "object",
            nullable: true,
            description: "JSON snapshot after operation. Null for DELETE.",
          },
          changedFields: {
            type: "array",
            items: { type: "string" },
            description: "Field names that changed.",
            example: ["status", "roleId"],
          },
          ipAddress: { type: "string", nullable: true },
          userAgent: { type: "string", nullable: true },
          requestId: {
            type: "string",
            nullable: true,
            description: "Correlates to x-request-id header.",
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
            description: "Logs are never updated, only created.",
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
      AdminConfig: {
        type: "object",
        description:
          "Singleton system configuration record. There is exactly one AdminConfig row with id: MAIN.",
        properties: {
          id: {
            type: "string",
            enum: ["MAIN"],
            description: "Always MAIN.",
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
            description: "Shown in system-sent emails.",
            example: "support@infotech.cm",
          },
          companyPhoneNumber: {
            type: "string",
            description: "8-20 chars.",
            example: "+237 2XX XXX XXX",
          },
          companyPrefix: {
            type: "string",
            description: "2-10 chars. Used in employee ID generation.",
            example: "INF",
          },
          logoUrl: {
            type: "string",
            nullable: true,
            description: "Used in email templates.",
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
          "All fields optional. Changing companyPrefix affects future employee ID generation.",
        properties: {
          companyEmail: { type: "string", format: "email" },
          supportEmail: { type: "string", format: "email" },
          companyPhoneNumber: { type: "string", minLength: 8, maxLength: 20 },
          companyPrefix: {
            type: "string",
            minLength: 2,
            maxLength: 10,
            description:
              "Warning: Changing this affects future employee IDs only.",
          },
          logoUrl: {
            type: "string",
            format: "uri",
            nullable: true,
            description: "Set to null to remove custom logo.",
          },
        },
      },
      PermissionOverride: {
        type: "object",
        description:
          "A user-level override that grants or revokes a specific permission independent of their role.",
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
            description: "true = grant, false = revoke.",
            example: true,
          },
          isTemporary: {
            type: "boolean",
            description:
              "Informational. Actual expiry controlled by expiresAt.",
            example: false,
          },
          expiresAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Null = permanent.",
            example: "2025-06-01T00:00:00.000Z",
          },
          reason: {
            type: "string",
            description: "Mandatory justification. 10-255 chars.",
            example: "Temporary read access for Q1 audit.",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          permission: { $ref: "#/components/schemas/Permission" },
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
      RolePermission: {
        type: "object",
        description: "Join record linking a Role to a Permission.",
        properties: {
          id: { type: "string", format: "uuid" },
          roleId: { type: "string", format: "uuid" },
          permissionId: { type: "string", format: "uuid" },
          createdById: {
            type: "string",
            format: "uuid",
            description: "Admin who assigned this permission.",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          role: { $ref: "#/components/schemas/Role" },
          permission: { $ref: "#/components/schemas/Permission" },
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
    },
  },
  paths: {
    "/": {
      get: {
        summary: "Health check",
        description: "Use this endpoint to verify the server is up.",
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
                schema: { type: "array", items: { type: "string" } },
                example: ["Pliengaz - Infotech Server is up and running."],
              },
            },
          },
        },
      },
    },
    "/api/v1/users/login": {
      post: {
        tags: ["Users - Auth"],
        summary: "Login",
        security: [],
        description:
          "Authenticates a user with username or email + password. Returns JWT token and user profile with permissions.",
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
            description: "Missing login or password field.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": {
            description: "Wrong credentials or account not set up.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "403": {
            description: "Account not active, deactivated, or locked.",
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
        tags: ["Users - Auth"],
        summary: "Forgot password - request reset link",
        security: [],
        description:
          "Triggers password reset flow. Always returns 200 to prevent user enumeration.",
        parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ForgotPasswordInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Always returned. Reset link sent if email exists.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          "400": {
            description: "Missing or invalid email.",
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
        tags: ["Users - Auth"],
        summary: "Reset password using token",
        security: [],
        description: "Completes password reset using token from email.",
        parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ResetPasswordInput" },
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
              "Token invalid, used, expired, or passwords do not match.",
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
        tags: ["Users - Auth"],
        summary: "Setup account credentials (new employee)",
        security: [],
        description:
          "Allows new employee to set username and password for the first time.",
        parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SetupAccountInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Account setup complete.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          "400": {
            description: "Token invalid or password validation failed.",
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
    "/api/v1/users/me": {
      get: {
        tags: ["Users - Me"],
        summary: "Get my profile",
        description: "Returns the authenticated user's profile.",
        parameters: [
          { $ref: "#/components/parameters/XLangHeader" },
          { $ref: "#/components/parameters/XCurrencyHeader" },
        ],
        responses: {
          "200": {
            description: "User profile.",
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
        tags: ["Users - Me"],
        summary: "Update my profile",
        description:
          "Allows authenticated user to update their own profile and preferences.",
        parameters: [
          { $ref: "#/components/parameters/XLangHeader" },
          { $ref: "#/components/parameters/XCurrencyHeader" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateMeInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Profile updated.",
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
        },
      },
    },
    "/api/v1/users/me/profile-picture": {
      patch: {
        tags: ["Users - Me"],
        summary: "Update my profile picture",
        description:
          "Uploads a new profile picture. Accepts PNG, JPG, JPEG. Max 20MB.",
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
                    description: "Profile picture file.",
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
                          example: "https://ftp.infotech.cm/profile/abc123.jpg",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "No file, wrong format, or too large.",
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
        tags: ["Users - Me"],
        summary: "Change my password",
        description: "Allows authenticated user to change their own password.",
        parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChangePasswordInput" },
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
            description: "Password too weak or mismatch.",
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
    "/api/v1/users/payroll/me": {
      get: {
        tags: ["Users - Payroll"],
        summary: "Get my own payroll data",
        description: "Returns authenticated user's sensitive payroll fields.",
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
        tags: ["Users - Payroll"],
        summary: "Get all users payroll data (paginated)",
        description:
          "Returns paginated payroll data for all users. Permission required: HUMAN_RESOURCES.SALARY_MANAGEMENT.READ",
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
                        meta: { $ref: "#/components/schemas/PaginationMeta" },
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
        tags: ["Users - Payroll"],
        summary: "Update a user payroll data (requires re-auth)",
        description:
          "Updates payroll fields. Requires re-authentication with caller's own credentials.",
        parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateUserPayrollDataInput",
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
            description: "Re-authentication failed.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "403": {
            description: "Insufficient permissions or target terminated.",
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
        tags: ["Users - Payroll"],
        summary: "Get a specific user payroll data",
        description: "Returns payroll fields for a specific user.",
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
            description: "Insufficient permissions or user TERMINATED.",
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
    "/api/v1/users": {
      get: {
        tags: ["Users - Admin"],
        summary: "List all users (paginated)",
        description:
          "Returns paginated list of all active users. Permission required: USER_MANAGEMENT.USERS.READ_ALL",
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
            description: "Filter by role UUID.",
          },
          {
            in: "query",
            name: "departmentId",
            schema: { type: "string", format: "uuid" },
            required: false,
            description: "Filter by department UUID.",
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
        tags: ["Users - Admin"],
        summary: "Create a new employee",
        description:
          "Creates new employee account and sends setup email. Permission required: USER_MANAGEMENT.USERS.CREATE",
        parameters: [
          { $ref: "#/components/parameters/XLangHeader" },
          { $ref: "#/components/parameters/XCurrencyHeader" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateUserInput" },
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
        tags: ["Users - Admin"],
        summary: "List all active users (flat)",
        description: "Returns flat array of all users with status: ACTIVE.",
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
        tags: ["Users - Admin"],
        summary: "List all terminated users (flat)",
        description: "Returns flat array of all users with status: TERMINATED.",
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
        tags: ["Users - Admin"],
        summary: "Change a user base role",
        description: "Permanently reassigns a user's primary roleId.",
        parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AssignUserRoleInput" },
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
            description: "User already has this role or is TERMINATED.",
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
        tags: ["Users - Admin"],
        summary: "Change a user department",
        description: "Moves a user to a different department.",
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
            description: "User already in this department or TERMINATED.",
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
        tags: ["Users - Admin"],
        summary: "Activate a user account",
        description: "Sets status: ACTIVE on a user who is not already active.",
        parameters: [
          {
            in: "path",
            name: "userId",
            schema: { type: "string", format: "uuid" },
            required: true,
            description: "UUID of user to activate.",
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
        tags: ["Users - Admin"],
        summary: "Terminate an employee",
        description: "Sets status: TERMINATED. Employee can no longer log in.",
        parameters: [
          {
            in: "path",
            name: "userId",
            schema: { type: "string", format: "uuid" },
            required: true,
            description: "UUID of user to terminate.",
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
        tags: ["Users - Admin"],
        summary: "Change a user login credentials (admin)",
        description:
          "Admin operation to reset another user's email, username, and password.",
        parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ChangeUserCredentialsInput",
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
            description: "Validation failed or user TERMINATED.",
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
        tags: ["Users - Admin"],
        summary: "Temporarily deactivate a user",
        description:
          "Sets a future deactivatedUntil date. Login is blocked until that date.",
        parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DeactivateUserInput" },
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
            description: "Date is not in the future.",
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
        tags: ["Users - Admin"],
        summary: "Reactivate a temporarily deactivated user",
        description: "Clears deactivatedUntil, immediately re-enabling login.",
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
              "User is not temporarily deactivated or is TERMINATED.",
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
        tags: ["Users - Admin"],
        summary: "Resend account setup invitation email",
        description:
          "Generates a new PASSWORD_SETUP token and resends the setup email.",
        parameters: [
          {
            in: "path",
            name: "userId",
            schema: { type: "string", format: "uuid" },
            required: true,
            description: "UUID of user to re-invite.",
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
            description: "User already has an active account.",
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
            description: "A valid setup token already exists.",
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
        tags: ["Users - Admin"],
        summary: "Suspend a user (disciplinary)",
        description:
          "Suspends a user account. Also revokes all active PermissionOverride records.",
        parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SuspendUserInput" },
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
        tags: ["Users - Admin"],
        summary: "Reinstate a suspended user",
        description:
          "Lifts a suspension by setting status: ACTIVE and clearing suspensionReason.",
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
    "/api/v1/users/{id}": {
      get: {
        tags: ["Users - Admin"],
        summary: "Get a user by ID",
        description: "Returns a single non-deleted user by UUID.",
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
        tags: ["Users - Admin"],
        summary: "Update a user profile (admin)",
        description:
          "Admin endpoint to update basic profile fields of any user.",
        parameters: [
          { $ref: "#/components/parameters/IdParam" },
          { $ref: "#/components/parameters/XLangHeader" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateUserInput" },
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
      delete: {
        tags: ["Users - Admin"],
        summary: "Delete a user (soft or hard)",
        description:
          "Soft-deletes by default. Pass ?hard=true for permanent deletion.",
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
    "/api/v1/users/{id}/restore": {
      patch: {
        tags: ["Users - Admin"],
        summary: "Restore a soft-deleted user",
        description: "Restores a soft-deleted user by nulling deletedAt.",
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
    "/api/v1/roles": {
      get: {
        tags: ["Roles"],
        summary: "List all roles (paginated)",
        description:
          "Returns paginated list of all active (non-deleted) roles.",
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
            description: "Filter by role name.",
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
        description:
          "Creates a new role. Starts with no permissions - use POST /assign-permissions after.",
        parameters: [
          { $ref: "#/components/parameters/XLangHeader" },
          { $ref: "#/components/parameters/XCurrencyHeader" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateRoleInput" },
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
        description:
          "Returns flat array of all roles where isActive: true. Use for dropdowns.",
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
        description: "Paginated list of soft-deleted roles.",
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
        description:
          "Bulk-assigns permissions to a role. Additive and idempotent.",
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
            description: "Role or permission IDs not found.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "409": {
            description: "Role is inactive - activate it first.",
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
        description:
          "Grants user an additional role on top of their base role, optionally with expiry.",
        parameters: [
          { $ref: "#/components/parameters/XLangHeader" },
          { $ref: "#/components/parameters/XCurrencyHeader" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RoleOverrideInput" },
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
            description: "Insufficient permissions.",
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
            description: "Active override already exists.",
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
        description: "Revokes an active RoleOverride for a userId/roleId pair.",
        parameters: [
          { $ref: "#/components/parameters/XLangHeader" },
          { $ref: "#/components/parameters/XCurrencyHeader" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RevokeRoleOverrideInput" },
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
            description: "Missing userId or roleId.",
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
            description: "No active override found.",
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
        description:
          "Sets isActive: false. Users lose permissions derived from this role.",
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
        description: "Sets isActive: true. Affected users regain permissions.",
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
        description: "Fetches a single non-deleted role by UUID.",
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
        description: "Partially updates a role. All fields optional.",
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
        description:
          "Soft-deletes by default. Pass ?hard=true for permanent deletion. Role must have zero active users.",
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
        description:
          "Returns the role with its rolePermissions fully included.",
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
                        role: { $ref: "#/components/schemas/Role" },
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
        description: "Restores a soft-deleted role by nulling deletedAt.",
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
            description: "Role not found or not deleted.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/departments": {
      get: {
        tags: ["Departments"],
        summary: "List all departments (paginated)",
        description:
          "Returns paginated list of all active (non-deleted) departments.",
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
            description: "Filter by department name.",
          },
          {
            in: "query",
            name: "code",
            schema: { type: "string" },
            required: false,
            description: "Filter by department code.",
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
        tags: ["Departments"],
        summary: "Create a new department",
        description: "Creates a new department. Name and code must be unique.",
        parameters: [
          { $ref: "#/components/parameters/XLangHeader" },
          { $ref: "#/components/parameters/XCurrencyHeader" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateDepartmentInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Department created.",
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
            description: "Insufficient permissions.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "409": {
            description: "Name or code already exists.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
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
        description:
          "Returns flat array of all departments that are not soft-deleted. Use for dropdowns.",
        parameters: [
          { $ref: "#/components/parameters/XLangHeader" },
          { $ref: "#/components/parameters/XCurrencyHeader" },
        ],
        responses: {
          "200": {
            description: "All active departments.",
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
        description: "Paginated list of soft-deleted departments.",
        parameters: [
          { $ref: "#/components/parameters/XLangHeader" },
          { $ref: "#/components/parameters/XCurrencyHeader" },
          { $ref: "#/components/parameters/PageParam" },
          { $ref: "#/components/parameters/LimitParam" },
          { $ref: "#/components/parameters/SortOrderParam" },
        ],
        responses: {
          "200": {
            description: "Paginated deleted departments.",
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
        description:
          "Fetches a single active (non-deleted) department by UUID.",
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
            description: "Invalid id parameter.",
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
            description: "Department not found or soft-deleted.",
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
        description:
          "Partially updates a department. All body fields are optional.",
        parameters: [
          { $ref: "#/components/parameters/IdParam" },
          { $ref: "#/components/parameters/XLangHeader" },
          { $ref: "#/components/parameters/XCurrencyHeader" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateDepartmentInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Department updated.",
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
            description: "Name or code conflict.",
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
        description:
          "Soft-deletes by default. Pass ?hard=true for permanent deletion. Department must have zero active users.",
        parameters: [
          { $ref: "#/components/parameters/IdParam" },
          { $ref: "#/components/parameters/HardDeleteParam" },
          { $ref: "#/components/parameters/XLangHeader" },
          { $ref: "#/components/parameters/XCurrencyHeader" },
        ],
        responses: {
          "200": {
            description: "Department deleted.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          "400": {
            description: "Department has active users assigned.",
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
        description:
          "Restores a soft-deleted department by setting deletedAt to null.",
        parameters: [
          { $ref: "#/components/parameters/IdParam" },
          { $ref: "#/components/parameters/XLangHeader" },
          { $ref: "#/components/parameters/XCurrencyHeader" },
        ],
        responses: {
          "200": {
            description: "Department restored.",
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
            description: "Department not found or not deleted.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/permissions": {
      get: {
        tags: ["Permissions"],
        summary: "List permissions (paginated)",
        description:
          "Returns paginated list of all active (non-deleted) permissions.",
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
            description: "Filter by module.",
          },
          {
            in: "query",
            name: "submodule",
            schema: { type: "string" },
            required: false,
            description: "Filter by submodule.",
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
            description: "Filter wildcard vs specific permissions.",
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
        description:
          "Returns flat array of all active permissions where isWildcard: true.",
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
        description:
          "Directly grants a specific permission to a user, overriding their role's permission set.",
        parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PermissionOverrideInput" },
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
            description: "Insufficient permissions or target is system user.",
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
            description: "Active override already exists.",
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
        description:
          "Revokes an active permission override by userId + permissionId.",
        parameters: [{ $ref: "#/components/parameters/XLangHeader" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RevokePermissionOverrideInput",
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
            description: "Missing userId or permissionId.",
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
            description: "No active override found.",
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
        description: "Fetches a single permission by UUID.",
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
    "/api/v1/activity-logs": {
      get: {
        tags: ["Activity Logs"],
        summary: "List activity logs (paginated)",
        description:
          "Returns paginated list of audit log entries. Unlike other endpoints, soft-deleted records are NOT excluded.",
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
            description: "Filter by target table name.",
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
        description: "Fetches a single audit log entry by UUID.",
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
    "/api/v1/admin-config": {
      get: {
        tags: ["Admin Config"],
        summary: "List admin config (returns singleton record)",
        description:
          "Returns the paginated list of AdminConfig records. In practice, always returns one record (MAIN).",
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
        description:
          "Fetches the AdminConfig record by ID. Use MAIN as the ID.",
        parameters: [
          {
            in: "path",
            name: "id",
            schema: { type: "string", enum: ["MAIN"] },
            required: true,
            description: "Always MAIN.",
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
            description: "Config not found.",
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
        description:
          "Updates the AdminConfig singleton. All fields are optional. Warning: Changing companyPrefix affects future employee IDs.",
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
              schema: { $ref: "#/components/schemas/UpdateAdminConfigInput" },
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
        },
      },
    },
    "/api/v1/permission-overrides": {
      get: {
        tags: ["Permission Overrides"],
        summary: "List permission overrides (paginated)",
        description: "Returns paginated list of PermissionOverride records.",
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
        description: "Fetches a single PermissionOverride record.",
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
                    data: { $ref: "#/components/schemas/PermissionOverride" },
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
    "/api/v1/role-permissions": {
      get: {
        tags: ["Role Permissions"],
        summary: "List role permissions (paginated)",
        description:
          "Returns paginated list of RolePermission join records. For adding permissions to roles, use POST /api/v1/roles/assign-permissions.",
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
                      items: { $ref: "#/components/schemas/RolePermission" },
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
        description: "Fetches a single RolePermission record.",
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
  },
};
