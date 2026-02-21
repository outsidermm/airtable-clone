import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { BaseIconSidebar } from "~/app/_components/base/sidebar/base-icon-sidebar";
import { BaseContent } from "~/app/_components/base/base-content";
import { RecentBaseTracker } from "~/app/_components/base/header/recent-base-tracker";
import { BaseProvider } from "~/app/_components/base/base-context";

interface BasePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tableId?: string }>;
}

export default async function BasePage({ params, searchParams }: BasePageProps) {
  const session = await auth();
  const { id } = await params;
  const { tableId: tableIdParam } = await searchParams;

  if (!session?.user) {
    redirect("/login");
  }

  let base;
  try {
    base = await api.base.getById({ id });
  } catch {
    redirect("/dashboard");
  }

  const tables = base.airtableTables;
  const initialTable =
    (tableIdParam ? tables.find((t) => t.id === Number(tableIdParam)) : null) ??
    tables[0];

  if (!initialTable) {
    redirect("/dashboard");
  }

  return (
    <BaseProvider initialTableId={initialTable.id} baseId={id}>
      <div className="flex h-screen bg-white">
        <RecentBaseTracker baseId={base.id} baseName={base.name} />
        <BaseIconSidebar user={session.user} />

        <BaseContent
          baseId={id}
          tables={tables.map((t) => ({
            id: t.id,
            name: t.name,
            baseId: t.baseId,
          }))}
          base={{
            id: base.id,
            name: base.name,
            createdAt: base.createdAt,
            updatedAt: base.updatedAt,
            starred: base.starred,
            userId: base.userId,
          }}
        />
      </div>
    </BaseProvider>
  );
}
