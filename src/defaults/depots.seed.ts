import { prisma } from "src";
import { DepotCategory, DepotType } from "src/generated/prisma";

const defaultDepots = [
  {
    code: "DPT-DLA-01",
    name: "Dépôt Principal Douala",
    type: DepotType.WAREHOUSE,
    category: DepotCategory.PRIMARY_HUB,
    description:
      "Dépôt principal de stockage et remplissage GPL - Zone Littoral (SCDP)",
    addressLine1: null,
    addressLine2: null,
    city: "Douala",
    region: "Littoral",
    country: "Cameroun",
    longitude: null,
    latitude: null,
    contactName: null,
    contactTitle: null,
    contactPhoneNumber: null,
    contactEmail: null,
    hasPortAccess: true,
    storageCapacityTons: null,
    tankCount: null,
    supportedProductTypes: [
      "GPL_BULK",
      "GPL_B50",
      "GPL_B13",
      "GPL_B6",
      "GPL_B450",
      "GPL_B230",
    ],
    transitDaysFromMain: 0,
    isActive: true,
  },
  {
    code: "DPT-YDE-01",
    name: "Dépôt Principal Yaoundé",
    type: DepotType.WAREHOUSE,
    category: DepotCategory.PRIMARY_HUB,
    description:
      "Dépôt principal de stockage et distribution GPL - Zone Centre",
    addressLine1: null,
    addressLine2: null,
    city: "Yaoundé",
    region: "Centre",
    country: "Cameroun",
    longitude: null,
    latitude: null,
    contactName: null,
    contactTitle: null,
    contactPhoneNumber: null,
    contactEmail: null,
    hasPortAccess: false,
    storageCapacityTons: null,
    tankCount: null,
    supportedProductTypes: [
      "GPL_BULK",
      "GPL_B50",
      "GPL_B13",
      "GPL_B6",
      "GPL_B450",
      "GPL_B230",
    ],
    transitDaysFromMain: null,
    isActive: true,
  },
  {
    code: "DPT-KBI-01",
    name: "Point de Remplissage Kribi (SNH)",
    type: DepotType.DEPOT,
    category: DepotCategory.INLAND_DISTRIBUTION,
    description:
      "Point de remplissage GPL auprès de la SNH à Kribi. Le fournisseur donne un reçu à présenter à la SNH.",
    addressLine1: null,
    addressLine2: null,
    city: "Kribi",
    region: "Sud",
    country: "Cameroun",
    longitude: null,
    latitude: null,
    contactName: null,
    contactTitle: null,
    contactPhoneNumber: null,
    contactEmail: null,
    hasPortAccess: true,
    storageCapacityTons: null,
    tankCount: null,
    supportedProductTypes: ["GPL_BULK"],
    transitDaysFromMain: null,
    isActive: true,
  },
  {
    code: "DPT-DLA-02",
    name: "Point de Remplissage Douala (SCDP)",
    type: DepotType.DEPOT,
    category: DepotCategory.INLAND_DISTRIBUTION,
    description:
      "Point de remplissage GPL auprès de la SCDP à Douala. Le gaz est rempli avant l'émission du reçu.",
    addressLine1: null,
    addressLine2: null,
    city: "Douala",
    region: "Littoral",
    country: "Cameroun",
    longitude: null,
    latitude: null,
    contactName: null,
    contactTitle: null,
    contactPhoneNumber: null,
    contactEmail: null,
    hasPortAccess: true,
    storageCapacityTons: null,
    tankCount: null,
    supportedProductTypes: ["GPL_BULK"],
    transitDaysFromMain: 0,
    isActive: true,
  },
];
const seedDepots = async () => {
  console.log("🌱 Seeding Depots...");

  let created = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    for (const depots of defaultDepots) {
      const exists = await tx.exploitationDepot.findUnique({
        where: { name: depots.name },
      });

      if (exists) {
        skipped++;
        continue;
      }

      await tx.exploitationDepot.create({ data: depots });
      created++;
    }
  });

  console.log(`✅ Depots seeded: ${created} created, ${skipped} skipped`);
};

export default seedDepots;
