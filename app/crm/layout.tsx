import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Elevate Marketing CRM",
  description: "Internal client, project and finance management for Elevate Marketing.",
};

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
