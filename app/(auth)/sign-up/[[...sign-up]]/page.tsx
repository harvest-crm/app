import { Wheat } from "lucide-react";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-50">
      <div className="flex items-center gap-2.5">
        <Wheat className="h-6 w-6 text-amber-500" />
        <span className="text-xl font-semibold tracking-tight text-slate-800">Harvest CRM</span>
      </div>
      <SignUp />
    </div>
  );
}
