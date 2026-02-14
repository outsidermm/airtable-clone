import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  const bases = await api.base.getAll();

  return <DashboardClient user={session.user} initialBases={bases} />;
}
