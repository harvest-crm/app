import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-0 px-4 pt-12 pb-16" style={{ background: "#F5EFE0" }}>
      <div
        className="w-full max-w-md rounded-2xl border bg-white px-8 py-8"
        style={{ borderColor: "#E8DFC8" }}
      >
        <div className="mb-6 flex items-center gap-2.5">
          <Logo size={28} />
          <span className="text-xl font-semibold tracking-tight" style={{ color: "#0F2540" }}>Covenant CRM</span>
        </div>
        <SignUp />
      </div>
    </div>
  );
}
