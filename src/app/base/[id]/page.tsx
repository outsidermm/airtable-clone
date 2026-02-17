import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { BaseIconSidebar } from "~/app/_components/base/sidebar/base-icon-sidebar";
import { BaseContent } from "~/app/_components/base/base-content";
import { RecentBaseTracker } from "~/app/_components/base/header/recent-base-tracker";
import { BaseProvider } from "~/app/_components/base/base-context";

interface BasePageProps {
  params: Promise<{ id: string }>;
}

export default async function BasePage({ params }: BasePageProps) {
  const session = await auth();
  const { id } = await params;

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
  const firstTable = tables[0];

  if (!firstTable) {
    redirect("/dashboard");
  }

  return (
    <BaseProvider initialTableId={firstTable.id}>
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
          initialTableId={firstTable.id}
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
