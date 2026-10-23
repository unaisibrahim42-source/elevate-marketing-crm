import {
  LayoutGrid,
  Users,
  FolderKanban,
  ListChecks,
  FileText,
  Wallet,
  Contact,
  Handshake,
  Settings,
} from "lucide-react";

export const CRM_NAV = [
  { href: "/crm/overview", label: "Overview", icon: LayoutGrid },
  { href: "/crm/clients", label: "Clients", icon: Users },
  { href: "/crm/projects", label: "Projects", icon: FolderKanban },
  { href: "/crm/tasks", label: "Tasks", icon: ListChecks },
  { href: "/crm/documents", label: "Documents", icon: FileText },
  { href: "/crm/finance", label: "Finance", icon: Wallet },
  { href: "/crm/people", label: "People", icon: Contact },
  { href: "/crm/partners", label: "Partners", icon: Handshake },
  { href: "/crm/settings", label: "Settings", icon: Settings },
] as const;

export function pageTitleFor(pathname: string): string {
  const match = CRM_NAV.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  return match?.label ?? "Elevate CRM";
}
