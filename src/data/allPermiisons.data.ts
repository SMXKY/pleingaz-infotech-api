export const allPermissions = {
  users: {
    createUser: "can_create_user",
    readUser: "can_read_user",
    readAllUsers: "can_read_all_users",
    updateUser: "can_update_user",
    deleteUser: "can_delete_user",
  },
} as const;

export default allPermissions;
