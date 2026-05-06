import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-stone-50">
      <div className="flex items-center gap-2.5">
        <Logo size={28} />
        <span className="text-xl font-semibold tracking-tight text-stone-800">Covenant CRM</span>
      </div>
      <SignUp />
    </div>
  );
}
