"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession, destroySession } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/crm/overview");

  if (!username || !password) {
    redirect(`/crm/login?error=missing&next=${encodeURIComponent(next)}`);
  }

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    redirect(`/crm/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  await createSession(user.id);
  redirect(next.startsWith("/crm") ? next : "/crm/overview");
}

export async function logoutAction() {
  await destroySession();
  redirect("/crm/login");
}
