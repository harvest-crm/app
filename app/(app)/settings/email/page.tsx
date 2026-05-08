import type { Metadata } from "next";
import { Mail, CheckCircle2, Clock } from "lucide-react";

export const metadata: Metadata = { title: "Email Settings" };

export default function EmailSettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#0F2540" }}>Email Settings</h1>
        <p className="mt-1 text-sm" style={{ color: "#3D5775" }}>
          Choose how Covenant sends emails on your behalf.
        </p>
      </div>

      <div className="max-w-2xl space-y-4">
        {/* Mailto: (active) */}
        <div className="rounded-xl border-2 p-5" style={{ borderColor: "#1F8A8A", background: "#fff" }}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" style={{ color: "#1F8A8A" }} />
              <h2 className="text-base font-semibold" style={{ color: "#0F2540" }}>
                Mail app handoff (mailto:)
              </h2>
            </div>
            <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ background: "#E2F0EE", color: "#1F8A8A" }}>
              <CheckCircle2 className="h-3 w-3" />
              Active
            </span>
          </div>

          <p className="mb-3 text-sm" style={{ color: "#3D5775" }}>
            Compose in Covenant, click &ldquo;Open in mail app&rdquo; to send through whatever email client you have
            installed (Apple Mail, Outlook, Gmail web, etc.). Activity logging happens via a quick
            confirmation prompt.
          </p>

          <ul className="space-y-1">
            {[
              "Works with any email provider",
              "No setup required",
              "Sends from your existing email address",
            ].map((pro) => (
              <li key={pro} className="flex items-center gap-2 text-xs" style={{ color: "#3D5775" }}>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#10B981" }} />
                {pro}
              </li>
            ))}
          </ul>

          <p className="mt-2 text-xs" style={{ color: "#3D5775" }}>
            Note: Requires one click to confirm the send was completed before logging.
          </p>
        </div>

        {/* Gmail OAuth (coming soon) */}
        <SendModeCard
          title="Gmail (OAuth)"
          description="Connect your Google Workspace or Gmail account. Covenant sends directly through your account and auto-logs every send. Replies sync back to the contact timeline."
        />

        {/* Microsoft 365 (coming soon) */}
        <SendModeCard
          title="Microsoft 365 / Outlook (OAuth)"
          description="Connect your Microsoft 365 or Outlook.com account. Covenant sends directly through your account and auto-logs every send."
        />
      </div>
    </div>
  );
}

function SendModeCard({
  title, description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border p-5 opacity-75" style={{ borderColor: "#E8DFC8", background: "#fff" }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" style={{ color: "#3D5775" }} />
          <h2 className="text-base font-semibold" style={{ color: "#0F2540" }}>{title}</h2>
        </div>
        <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ background: "#F5EFE0", color: "#3D5775" }}>
          <Clock className="h-3 w-3" />
          Coming soon
        </span>
      </div>

      <p className="mb-4 text-sm" style={{ color: "#3D5775" }}>{description}</p>

      <button type="button" disabled
        className="rounded-md border px-4 py-2 text-sm font-medium opacity-40 cursor-not-allowed"
        style={{ borderColor: "#E8DFC8", color: "#3D5775" }}>
        Coming soon
      </button>
    </div>
  );
}
