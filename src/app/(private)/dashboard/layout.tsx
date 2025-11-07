"use client";

import { useSyncUserFromThirdweb } from "@/hooks/useSyncUserFromThirdweb";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import TopUpModal from "@/components/modals/Topup";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSyncing } = useSyncUserFromThirdweb(); // sync Zustand on load

  if (isSyncing) {
    // While syncing user and wallet state, show loading indicator
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-neutral-400">
        Loading account...
      </div>
    );
  }

  return (
    <div className="flex bg-black text-white min-h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 sm:ml-[152px]">
        <Header />
        <TopUpModal />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
