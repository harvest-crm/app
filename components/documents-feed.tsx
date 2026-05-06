"use client";

import { useState } from "react";
import { UploadDocument } from "@/components/upload-document";
import { DocumentList } from "@/components/document-list";
import type { SerializedDocument } from "@/app/actions/documents";

type Props = {
  initialDocuments: SerializedDocument[];
  contactId?: string;
  dealId?: string;
};

export function DocumentsFeed({ initialDocuments, contactId, dealId }: Props) {
  const [documents, setDocuments] = useState<SerializedDocument[]>(initialDocuments);

  return (
    <div className="space-y-4">
      <UploadDocument
        contactId={contactId}
        dealId={dealId}
        onUploaded={(doc) => setDocuments((prev) => [doc, ...prev])}
      />
      <DocumentList
        documents={documents}
        onDeleted={(id) => setDocuments((prev) => prev.filter((d) => d.id !== id))}
      />
    </div>
  );
}
