export const allPermissions = {
  users: {
    createUser: "human_resources.can_create_user",
    readUser: "human_resources.can_read_user",
    readAllUsers: "human_resources.can_read_all_users",
    updateUser: "human_resources.can_update_user",
    deleteUser: "human_resources.can_delete_user",

    changeUserRole: "human_resources.can_change_user_role",
    activateUser: "human_resources.can_activate_user",
    terminateUser: "human_resources.can_terminate_user",
    changeUserCredentials: "human_resources.can_change_user_credentials",
    deactivateUser: "human_resources.can_deactivate_user",
    reactivateUser: "human_resources.can_reactivate_user",
    resendUserInvite: "human_resources.can_resend_user_invite",
    restoreUser: "human_resources.can_restore_user",

    readUserPayroll: "human_resources.can_read_user_payroll",
    readAllUsersPayroll: "human_resources.can_read_all_users_payroll",
    updateUserPayroll: "accounting.can_update_user_payroll",
    changeUserDepartment: "human_resources.can_change_user_department",
    revokeUserRole: "human_resources.can_suspend_user",
    reinstateUser: "human_resources.can_reinstate_user",
  },
  departments: {
    createDepartment: "human_resources.can_create_department",
    readDepartment: "human_resources.can_read_department",
    readAllDepartments: "human_resources.can_read_all_departments",
    updateDepartment: "human_resources.can_update_department",
    deleteDepartment: "human_resources.can_delete_department",
    restoreDepartment: "human_resources.can_restore_department",
  },
  permissions: {
    readpermission: "human_resources.can_read_permission",
    readAllpermissions: "human_resources.can_read_all_permissions",
    createPermissionOverride: "human_resources.can_create_permission_override",
    revokePermissionOverride: "human_resources.can_revoke_permission_override",
  },
  roles: {
    createRole: "human_resources.can_create_role",
    readRole: "human_resources.can_read_role",
    readAllRoles: "human_resources.can_read_roles",
    updateRole: "human_resources.can_update_role",
    deleteRole: "human_resources.can_delete_role",
    restoreRole: "human_resources.can_restore_role",
    disableRole: "human_resources.can_disable_role",
    enableRole: "human_resources.can_enable_role",
    assignPermissions: "human_resources.can_assign_role_permissions",
    createRoleOverride: "human_resources.can_create_role_override",
    revokeRoleOverride: "human_resources.can_revoke_role_override",
  },
  activityLogs: {
    readActivityLog: "admin.can_read_activityLog",
    readAllActivityLogs: "admin.can_read_all_activityLogs",
  },
  adminConfigs: {
    readAdminConfig: "admin.can_read_adminConfig",
    updateAdminConfig: "admin.can_update_adminConfig",
  },
  permissionOverrides: {
    readPermissionOverride: "human_resources.can_read_permission_override",
    readAllPermissionOverrides:
      "human_resources.can_read_all_permission_overrides",
  },
  financeSettings: {
    readFinanceSettings: "finance.can_read_finance_settings",
    updateFinanceSettings: "finance.can_update_finance_settings",
  },
  suppliers: {
    createSupplier: "suppliers.can_create_supplier",
    readSupplier: "suppliers.can_read_supplier",
    readAllSuppliers: "suppliers.can_read_suppliers",
    updateSupplier: "suppliers.can_update_supplier",
    deleteSupplier: "suppliers.can_delete_supplier",
  },
  exploitationDepots: {
    createDepot: "exploitation_depots.can_create_depot",
    readDepot: "exploitation_depots.can_read_depot",
    readAllDepots: "exploitation_depots.can_read_depots",
    updateDepot: "exploitation_depots.can_update_depot",
    deleteDepot: "exploitation_depots.can_delete_depot",
  },
  exploitationDrivers: {
    createDriver: "exploitation_drivers.can_create_driver",
    readDriver: "exploitation_drivers.can_read_driver",
    readAllDrivers: "exploitation_drivers.can_read_drivers",
    updateDriver: "exploitation_drivers.can_update_driver",
    deleteDriver: "exploitation_drivers.can_delete_driver",
  },
  exploitationTankers: {
    createTanker: "exploitation_tankers.can_create_tanker",
    readTanker: "exploitation_tankers.can_read_tanker",
    readAllTankers: "exploitation_tankers.can_read_tankers",
    updateTanker: "exploitation_tankers.can_update_tanker",
    deleteTanker: "exploitation_tankers.can_delete_tanker",
  },
  gasBottleTypes: {
    readBottleType: "exploitation_bottle_types.can_read_bottle_type",
    readAllBottleTypes: "exploitation_bottle_types.can_read_bottle_types",
    updateBottleType: "exploitation_bottle_types.can_update_bottle_type",
  },
  accessoryCategories: {
    readAllAccessoryCategories:
      "exploitation_accessory_categories.can_read_accessory_categories",
  },
  accessoryItems: {
    createAccessoryItem:
      "exploitation_accessory_items.can_create_accessory_item",
    readAccessoryItem: "exploitation_accessory_items.can_read_accessory_item",
    readAllAccessoryItems:
      "exploitation_accessory_items.can_read_accessory_items",
    updateAccessoryItem:
      "exploitation_accessory_items.can_update_accessory_item",
    deleteAccessoryItem:
      "exploitation_accessory_items.can_delete_accessory_item",
  },
  gasPurchaseOrders: {
    createOrder: "gas_purchase_orders.can_create_order",
    readOrder: "gas_purchase_orders.can_read_order",
    readAllOrders: "gas_purchase_orders.can_read_orders",
    updateOrder: "gas_purchase_orders.can_update_order",
    deleteOrder: "gas_purchase_orders.can_delete_order",
    submitOrder: "gas_purchase_orders.can_submit_order",
    approveOrder: "gas_purchase_orders.can_approve_order",
  },
  approvals: {
    readApproval: "approvals.can_read_approval",
    decideApproval: "approvals.can_decide_approval",
  },
  payments: {
    recordPayment: "payments.can_record_payment",
    readPayment: "payments.can_read_payment",
    readAllPayments: "payments.can_read_payments",
    reversePayment: "payments.can_reverse_payment",
    correctPayment: "payments.can_correct_payment",
    updatePaymentNotes: "payments.can_update_payment_notes",
  },
  exploitationDocuments: {
    uploadDocument: "exploitation_documents.can_upload_document",
    readAllDocuments: "exploitation_documents.can_read_documents",
    deleteDocument: "exploitation_documents.can_delete_document",
  },
  exploitationOrderEmails: {
    sendEmail: "exploitation_order_emails.can_send_email",
    readAllEmails: "exploitation_order_emails.can_read_emails",
    readOneEmail: "exploitation_order_emails.can_read_email",
  },
  gasBottlePurchaseOrders: {
    createOrder: "gas_bottle_purchase_orders.can_create_order",
    readOrder: "gas_bottle_purchase_orders.can_read_order",
    readAllOrders: "gas_bottle_purchase_orders.can_read_orders",
    updateOrder: "gas_bottle_purchase_orders.can_update_order",
    deleteOrder: "gas_bottle_purchase_orders.can_delete_order",
  },
  accessoryPurchaseOrders: {
    createOrder: "accessory_purchase_orders.can_create_order",
    readOrder: "accessory_purchase_orders.can_read_order",
    readAllOrders: "accessory_purchase_orders.can_read_orders",
    updateOrder: "accessory_purchase_orders.can_update_order",
    deleteOrder: "accessory_purchase_orders.can_delete_order",
  },
  exploitationInvoices: {
    createInvoice: "exploitation_invoices:create",
    readAllInvoices: "exploitation_invoices:read_all",
    readInvoice: "exploitation_invoices:read",
    readInvoicesByOrder: "exploitation_invoices:read_by_order",
    updateInvoice: "exploitation_invoices:update",
    deleteInvoice: "exploitation_invoices:delete",
    recordPayment: "exploitation_invoices:record_payment",
    markOverdue: "exploitation_invoices:mark_overdue",
  },
} as const;

export default allPermissions;
