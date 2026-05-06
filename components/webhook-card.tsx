"use client";

import { useState, useTransition } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { regenerateWebhookToken } from "@/app/actions/workspaces";

type Props = {
  workspaceId: string;
  initialToken: string;
  appUrl: string;
};

export function WebhookCard({ workspaceId, initialToken, appUrl }: Props) {
  const [token,     setToken]     = useState(initialToken);
  const [copied,    setCopied]    = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition]  = useTransition();

  const webhookUrl = `${appUrl}/api/lead-capture/${token}`;
  const curlSample = `curl -X POST ${webhookUrl} \\
     -H "Content-Type: application/json" \\
     -d '{"firstName":"Jane","email":"jane@example.com","source":"Website"}'`;

  function copyUrl() {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleRegenerate() {
    startTransition(async () => {
      const result = await regenerateWebhookToken(workspaceId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setToken(result.token);
        setConfirming(false);
        toast.success("Webhook token regenerated — update any forms using the old URL");
      }
    });
  }

  return (
    <div className="mt-8 rounded-xl border bg-white p-6">
      <h2 className="mb-1 text-sm font-semibold text-stone-800">Lead Capture Webhook</h2>
      <p className="mb-4 text-sm text-stone-500">
        POST leads to this URL from any website form, MLS, or integration. No auth required — the token is the key.
      </p>

      {/* URL row */}
      <div className="flex items-center gap-2 rounded-lg border bg-stone-50 px-3 py-2.5">
        <code className="min-w-0 flex-1 break-all text-xs text-stone-700">{webhookUrl}</code>
        <button
          type="button"
          onClick={copyUrl}
          className="shrink-0 rounded p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-600"
          title="Copy URL"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      {/* Sample curl */}
      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-medium text-stone-500 hover:text-stone-700">
          Sample curl command
        </summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-stone-900 p-3 text-xs text-stone-300">
          {curlSample}
        </pre>
      </details>

      {/* Regenerate */}
      <div className="mt-4 border-t pt-4">
        {confirming ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-stone-600">
              This will break any forms using the current URL. Continue?
            </p>
            <button
              onClick={handleRegenerate}
              disabled={pending}
              className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {pending ? "Regenerating…" : "Yes, regenerate"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="text-sm text-stone-400 hover:text-stone-600"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate token
          </button>
        )}
      </div>
    </div>
  );
}
