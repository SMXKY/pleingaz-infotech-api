import {
  PermissionAction,
  PermissionModule,
  PermissionSubmodule,
  PermissionRiskLevel,
} from "src/generated/prisma";

type PermissionSeed = {
  code: string;
  engName: string;
  frName: string;
  module: PermissionModule;
  submodule: PermissionSubmodule;
  action: PermissionAction;
  isWildcard?: boolean;
  riskLevel?: PermissionRiskLevel;
  description?: string;
};

export const permissions: PermissionSeed[] = [
  {
    code: "can_read_user",
    engName: "Read User",
    frName: "Lire un utilisateur",
    module: PermissionModule.USER_MANAGEMENT,
    submodule: PermissionSubmodule.USERS,
    action: PermissionAction.READ,
    riskLevel: PermissionRiskLevel.LOW,
  },
  {
    code: "can_read_all_users",
    engName: "Read All Users",
    frName: "Lire tous les utilisateurs",
    module: PermissionModule.USER_MANAGEMENT,
    submodule: PermissionSubmodule.USERS,
    action: PermissionAction.READ,
    riskLevel: PermissionRiskLevel.LOW,
  },
  {
    code: "can_update_user",
    engName: "Update User",
    frName: "Modifier un utilisateur",
    module: PermissionModule.USER_MANAGEMENT,
    submodule: PermissionSubmodule.USERS,
    action: PermissionAction.UPDATE,
    riskLevel: PermissionRiskLevel.MEDIUM,
  },
  {
    code: "can_delete_user",
    engName: "Delete User",
    frName: "Supprimer un utilisateur",
    module: PermissionModule.USER_MANAGEMENT,
    submodule: PermissionSubmodule.USERS,
    action: PermissionAction.DELETE,
    riskLevel: PermissionRiskLevel.HIGH,
  },
  {
    code: "can_create_user",
    engName: "Create User",
    frName: "Créer un utilisateur",
    module: PermissionModule.USER_MANAGEMENT,
    submodule: PermissionSubmodule.USERS,
    action: PermissionAction.CREATE,
    riskLevel: PermissionRiskLevel.MEDIUM,
  },
];
