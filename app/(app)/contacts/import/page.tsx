import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { ContactImportWizard } from "@/components/contact-import-wizard";

export default async function ImportContactsPage() {
  const { orgId: clerkOrgId } = await auth();
  if (!clerkOrgId) return null;

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  if (!org) return null;

  const [workspaces, allTags] = await Promise.all([
    db.workspace.findMany({
      where: { organizationId: org.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true },
    }),
    db.tag.findMany({
      where: { organizationId: org.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/contacts" className="text-sm text-[#3D5775] hover:text-[#3D5775]">
          ← Contacts
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[#0F2540]">Import Contacts</h1>
        <p className="mt-1 text-sm text-[#3D5775]">
          Import your sphere, past clients, or lead lists from a CSV file.
        </p>
      </div>

      <div className="max-w-3xl">
        <ContactImportWizard workspaces={workspaces} allTags={allTags} />
      </div>
    </div>
  );
}
