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
} as const;

export default allPermissions;
