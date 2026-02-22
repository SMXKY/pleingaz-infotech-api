export const allPermissions = {
  users: {
    createUser: "can_create_user",
    readUser: "can_read_user",
    readAllUsers: "can_read_all_users",
    updateUser: "can_update_user",
    deleteUser: "can_delete_user",

    changeUserRole: "can_change_user_role",
    activateUser: "can_activate_user",
    terminateUser: "can_terminate_user",
    changeUserCredentials: "can_change_user_credentials",
    deactivateUser: "can_deactivate_user",
    reactivateUser: "can_reactivate_user",
    resendUserInvite: "can_resend_user_invite",
    restoreUser: "can_restore_user",

    readUserPayroll: "can_read_user_payroll",
    readAllUsersPayroll: "can_read_all_users_payroll",
    updateUserPayroll: "can_update_user_payroll",
    changeUserDepartment: "can_change_user_department",
  },
  departments: {
    createDepartment: "can_create_department",
    readDepartment: "can_read_department",
    readAllDepartments: "can_read_all_departments",
    updateDepartment: "can_update_department",
    deleteDepartment: "can_delete_department",
    restoreDepartment: "can_restore_department",
  },
  permissions: {
    readpermission: "can_read_permission",
    readAllpermissions: "can_read_all_permissions",
  },
  roles: {
    createRole: "can_create_role",
    readRole: "can_read_role",
    readAllRoles: "can_read_roles",
    updateRole: "can_update_role",
    deleteRole: "can_delete_role",
    restoreRole: "can_restore_role",
    disableRole: "can_disable_role",
    enableRole: "can_enable_role",
    assignPermissions: "can_assign_role_permissions",
  },
  activityLogs: {
    readActivityLog: "can_read_activityLog",
    readAllActivityLogs: "can_read_all_activityLogs",
  },
  adminConfigs: {
    readAdminConfig: "can_read_adminConfig",
    updateAdminConfig: "can_update_adminConfig",
  },
} as const;

export default allPermissions;
