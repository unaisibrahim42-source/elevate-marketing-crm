import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import CrmShell from "@/components/crm/CrmShell";
import { generateReminderNotifications } from "@/lib/reminders";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/crm/login");

  await generateReminderNotifications();

  const notifications = await prisma.notification.findMany({
    where: { OR: [{ userId: user.id }, { userId: null }] },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const unreadCount = await prisma.notification.count({
    where: { OR: [{ userId: user.id }, { userId: null }], read: false },
  });

  return (
    <CrmShell
      user={{ name: user.name, jobTitle: user.jobTitle, role: user.role }}
      notifications={notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      }))}
      unreadCount={unreadCount}
    >
      {children}
    </CrmShell>
  );
}
