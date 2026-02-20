type ImplicationSeed = {
  permission: string;
  implies: string[];
};

export const implicationSeeds: ImplicationSeed[] = [
  {
    permission: "can_read_all_users",
    implies: ["can_read_user"],
  },
  {
    permission: "can_delete_user",
    implies: ["can_read_user", "can_read_all_users"],
  },
  {
    permission: "can_update_user",
    implies: ["can_read_user", "can_read_all_users"],
  },
];
