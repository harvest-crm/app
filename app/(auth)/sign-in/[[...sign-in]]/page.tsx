import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-50">
      <div className="flex items-center gap-2.5">
        <Logo size={28} />
        <span className="text-xl font-semibold tracking-tight text-slate-800">Covenant CRM</span>
      </div>
      <SignIn />
    </div>
  );
}
