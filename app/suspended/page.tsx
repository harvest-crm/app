import { Logo } from "@/components/logo";

export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: "#F5EFE0" }}>
      <div className="w-full max-w-md rounded-2xl border bg-white px-8 py-10 text-center"
        style={{ borderColor: "#E8DFC8" }}>
        <div className="mb-6 flex justify-center">
          <Logo size={36} />
        </div>
        <h1 className="mb-2 text-xl font-semibold" style={{ color: "#0F2540" }}>
          Account Suspended
        </h1>
        <p className="mb-6 text-sm" style={{ color: "#3D5775" }}>
          Your organization&rsquo;s access to Covenant CRM has been temporarily suspended.
          Your data is safe and preserved.
        </p>
        <p className="text-sm" style={{ color: "#3D5775" }}>
          To restore access, contact us at{" "}
          <a href="mailto:support@covenantcrm.com" className="font-medium hover:underline"
            style={{ color: "#1F8A8A" }}>
            support@covenantcrm.com
          </a>
        </p>
      </div>
    </div>
  );
}
