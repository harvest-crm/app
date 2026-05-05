import { ContactForm } from "@/components/contact-form";

export default function NewContactPage() {
  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">New Contact</h1>
      <ContactForm />
    </div>
  );
}
