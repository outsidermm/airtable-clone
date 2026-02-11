import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { BaseIconSidebar } from "~/app/_components/base-icon-sidebar";
import { BaseSidebar } from "~/app/_components/base-sidebar";
import { BaseHeader } from "~/app/_components/base-header";
import { GridView } from "~/app/_components/grid-view";

interface BasePageProps {
  params: Promise<{ id: string }>;
}

export default async function BasePage({ params }: BasePageProps) {
  const session = await auth();
  const { id } = await params;

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  // TODO: Fetch base data from tRPC
  const mockBase = {
    id,
    name: "Untitled Base",
    icon: "📊",
  };

  const mockColumns = [
    { id: "1", name: "Name", type: "text", width: 250 },
    { id: "2", name: "Notes", type: "text", width: 200 },
    { id: "3", name: "Assignee", type: "text", width: 150 },
    { id: "4", name: "Status", type: "text", width: 150 },
    { id: "5", name: "Attachments", type: "text", width: 200 },
  ];

  const mockRows = [
    { id: "1", cells: {} },
    { id: "2", cells: {} },
    { id: "3", cells: {} },
  ];

  return (
    <div className="flex h-screen bg-white">
      {/* Icon Sidebar */}
      <BaseIconSidebar />

      {/* Table/View Sidebar */}
      <BaseSidebar baseId={id} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <BaseHeader base={mockBase} user={session.user} />

        {/* Grid View */}
        <div className="flex-1 overflow-auto">
          <GridView columns={mockColumns} rows={mockRows} />
        </div>
      </div>
    </div>
  );
}
