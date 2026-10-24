import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// Fixed, shared credentials for the three partner accounts — set
// unconditionally on every seed run (every deploy) so these always work,
// by design, for this small shared-login setup.
const PARTNER_PASSWORD = "ElevateMarketing.co.uk";

async function main() {
  const partnersData = [
    {
      name: "Unais",
      username: "Unaiselevate",
      email: "unais@elevatecreativemedia.co.uk",
      role: "Co-Founder",
      shareholdingPct: 34,
    },
    {
      name: "Jamal",
      username: "Jamalelevate",
      email: "jamal@elevatecreativemedia.co.uk",
      role: "Co-Founder",
      shareholdingPct: 33,
    },
    {
      name: "Sazid",
      username: "Sazidelevate",
      email: "sazid@elevatecreativemedia.co.uk",
      role: "Co-Founder",
      shareholdingPct: 33,
    },
  ];

  for (const p of partnersData) {
    const passwordHash = hashPassword(PARTNER_PASSWORD);

    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: { username: p.username, passwordHash },
      create: {
        name: p.name,
        username: p.username,
        email: p.email,
        passwordHash,
        role: "PARTNER",
        jobTitle: p.role,
      },
    });

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

  console.log("Synced 3 partner accounts (Unaiselevate, Jamalelevate, Sazidelevate).");
  console.log(`Shared password for all three: ${PARTNER_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
