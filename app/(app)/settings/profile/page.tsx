import { UserProfile } from "@clerk/nextjs";

export default function ProfilePage() {
  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Profile</h1>
      <UserProfile
        appearance={{
          elements: {
            card: "shadow-none border rounded-lg",
            navbar: "hidden",
            pageScrollBox: "p-0",
          },
        }}
      />
    </div>
  );
}
