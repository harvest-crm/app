import type { Metadata } from "next";
export const metadata: Metadata = { title: "Profile" };

import { UserProfile } from "@clerk/nextjs";

export default function ProfilePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[#0F2540]">Profile</h1>
      <p className="mb-6 mt-1 text-sm text-[#3D5775]">Manage your name, avatar, and connected accounts.</p>
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
