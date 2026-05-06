import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8" style={{ background: "#F5EFE0" }}>
      <div className="flex items-center gap-2.5">
        <Logo size={28} />
        <span className="text-xl font-semibold tracking-tight" style={{ color: "#0F2540" }}>Covenant CRM</span>
      </div>
      <SignIn />
    </div>
  );
}
