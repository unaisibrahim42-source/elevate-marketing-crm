import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const seedPassword = process.env.CRM_SEED_PASSWORD || "ChangeMe123!";

  const partnersData = [
    {
      name: "Unais",
      email: "unais@elevatecreativemedia.co.uk",
      role: "Co-Founder",
      shareholdingPct: 34,
    },
    {
      name: "Jamal",
      email: "jamal@elevatecreativemedia.co.uk",
      role: "Co-Founder",
      shareholdingPct: 33,
    },
    {
      name: "Sazid",
      email: "sazid@elevatecreativemedia.co.uk",
      role: "Co-Founder",
      shareholdingPct: 33,
    },
  ];

  for (const p of partnersData) {
    const existingUser = await prisma.user.findUnique({ where: { email: p.email } });
    const user =
      existingUser ??
      (await prisma.user.create({
        data: {
          name: p.name,
          email: p.email,
          passwordHash: hashPassword(seedPassword),
          role: "PARTNER",
          jobTitle: p.role,
        },
      }));

    await prisma.partner.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        name: p.name,
        role: p.role,
        shareholdingPct: p.shareholdingPct,
        profitSharePct: p.shareholdingPct,
      },
    });
  }

  const settingDefaults: Record<string, unknown> = {
    agency_name: "Elevate Marketing",
    agency_logo_url: "/crm-logo.png",
    currency: "GBP",
    date_format: "DD/MM/YYYY",
    default_payment_terms_days: 14,
    dashboard_panels: {
      activity: true,
      deadlines: true,
      clients: true,
      finance: true,
      feed: true,
      news: true,
    },
  };

  for (const [key, value] of Object.entries(settingDefaults)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: JSON.stringify(value) },
    });
  }

  console.log("Seeded 3 partner accounts (Unais, Jamal, Sazid).");
  console.log(`Default password for all seeded accounts: ${seedPassword}`);
  console.log("Change this after first login in /crm/settings.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
