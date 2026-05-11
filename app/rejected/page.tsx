import { SignOutButton } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export default function RejectedPage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: "#F5EFE0" }}
    >
      <div
        className="w-full max-w-md rounded-2xl border bg-white px-8 py-10 text-center"
        style={{ borderColor: "#E8DFC8" }}
      >
        <div className="mb-6 flex justify-center">
          <Logo size={36} />
        </div>
        <h1 className="mb-2 text-xl font-medium" style={{ color: "#0F2540" }}>
          Access not granted
        </h1>
        <p className="mb-8 text-sm leading-relaxed" style={{ color: "#3D5775" }}>
          Thanks for your interest in Covenant CRM. We are not able to grant
          access at this time.
        </p>
        <SignOutButton redirectUrl="/sign-in">
          <button
            className="rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-[#F5EFE0]"
            style={{ borderColor: "#E8DFC8", color: "#3D5775" }}
          >
            Sign out
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
