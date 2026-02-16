import { prisma } from "src";

const defaultRoles = [
  {
    name: "Directeur Général (CEO)",
    description:
      "Chief Executive Officer - Approbations finales et accès complet au système",
    isSystem: true,
  },
  {
    name: "Chef d’Exploitation (Chief of Exploitation)",
    description:
      "Responsable du département Exploitation - Gestion des achats et approvisionnements en gaz",
    isSystem: true,
  },
  {
    name: "Responsable Logistique (Logistics Manager)",
    description:
      "Chef de la logistique - Gestion des véhicules et du transport",
    isSystem: true,
  },
  {
    name: "Agent Logistique (Logistics Officer)",
    description:
      "Personnel logistique - Inspection des véhicules et livraisons",
    isSystem: true,
  },
  {
    name: "Responsable Commercial (Sales Manager)",
    description: "Chef des ventes - Gestion des opérations commerciales",
    isSystem: true,
  },
  {
    name: "Commercial (Sales Personnel)",
    description:
      "Personnel de vente - Opérations de vente au détail et en gros",
    isSystem: true,
  },
  {
    name: "Caissier (Cashier)",
    description:
      "Gestion des transactions en espèces et rapprochement quotidien",
    isSystem: true,
  },
  {
    name: "Sous-Caissier (Sub-Cashier)",
    description: "Caissier au niveau dépôt - Rapporte au caissier principal",
    isSystem: true,
  },
  {
    name: "Superviseur de Remplissage (Filling Supervisor)",
    description: "Supervision des opérations de remplissage et de production",
    isSystem: true,
  },
  {
    name: "Opérateur de Remplissage (Filling Operator)",
    description:
      "Opération des équipements de remplissage et suivi des bouteilles",
    isSystem: true,
  },
  {
    name: "Comptable (Accountant)",
    description: "Gestion financière, facturation, paie et conformité",
    isSystem: true,
  },
  {
    name: "Responsable RH (HR Manager)",
    description: "Chef des ressources humaines - Gestion du personnel",
    isSystem: true,
  },
  {
    name: "Agent RH (HR Officer)",
    description: "Personnel RH - Présences, recrutement, autorisations",
    isSystem: true,
  },
  {
    name: "Juriste (Legal Officer)",
    description:
      "Affaires juridiques, assurances, gestion du courrier et contrats",
    isSystem: true,
  },
  {
    name: "Responsable Maintenance (Maintenance Manager)",
    description:
      "Chef de la maintenance - Supervision des équipements et aspects techniques",
    isSystem: true,
  },
  {
    name: "Technicien (Technician)",
    description:
      "Personnel technique - Exécution des réparations et maintenances",
    isSystem: true,
  },
  {
    name: "Agent R&D (R&D Officer)",
    description: "Recherche et Développement - Création et suivi des projets",
    isSystem: true,
  },
  {
    name: "Administrateur Système (System Admin)",
    description:
      "Administration du système - Gestion des utilisateurs et configuration",
    isSystem: true,
  },
];

const seedRoles = async () => {
  console.log("🌱 Seeding roles...");

  let created = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    for (const role of defaultRoles) {
      const exists = await tx.role.findUnique({
        where: { name: role.name },
      });

      if (exists) {
        skipped++;
        continue;
      }

      await tx.role.create({ data: role });
      created++;
    }
  });

  console.log(`✅ Roles seeded: ${created} created, ${skipped} skipped`);
};

export default seedRoles;
