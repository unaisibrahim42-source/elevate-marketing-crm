"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: unknown) {
  await prisma.setting.upsert({
    where: { key },
    update: { value: JSON.stringify(value) },
    create: { key, value: JSON.stringify(value) },
  });
}

export async function updateGeneralSettingsAction(formData: FormData) {
  const user = await requireUser();
  await setSetting("agency_name", str(formData, "agency_name") ?? "Elevate Marketing");
  await setSetting("default_payment_terms_days", Number(str(formData, "default_payment_terms_days") ?? "14"));

  await logActivity({ userId: user.id, action: "UPDATE", entityType: "Setting", description: `${user.name} updated general settings` });
  revalidatePath("/crm/settings");
}

export async function updateDashboardPanelsAction(formData: FormData) {
  await requireUser();
  const panels = {
    activity: formData.get("panel_activity") === "on",
    deadlines: formData.get("panel_deadlines") === "on",
    clients: formData.get("panel_clients") === "on",
    finance: formData.get("panel_finance") === "on",
    feed: formData.get("panel_feed") === "on",
    news: formData.get("panel_news") === "on",
  };
  await setSetting("dashboard_panels", panels);
  revalidatePath("/crm/overview");
  revalidatePath("/crm/settings");
}

export async function addServicePackageAction(formData: FormData) {
  await requireUser();
  const name = str(formData, "name");
  if (!name) return;
  const current = await getSetting<string[]>("service_packages", []);
  await setSetting("service_packages", [...new Set([...current, name])]);
  revalidatePath("/crm/settings");
}

export async function removeServicePackageAction(name: string) {
  await requireUser();
  const current = await getSetting<string[]>("service_packages", []);
  await setSetting("service_packages", current.filter((s) => s !== name));
  revalidatePath("/crm/settings");
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const current = str(formData, "currentPassword");
  const next = str(formData, "newPassword");
  if (!current || !next) return { ok: false, error: "Fill in both fields." };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || !verifyPassword(current, dbUser.passwordHash)) {
    return { ok: false, error: "Current password is incorrect." };
  }
  if (next.length < 8) return { ok: false, error: "New password must be at least 8 characters." };

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(next) } });
  await logActivity({ userId: user.id, action: "UPDATE", entityType: "User", description: `${user.name} changed their password` });
  return { ok: true };
}
