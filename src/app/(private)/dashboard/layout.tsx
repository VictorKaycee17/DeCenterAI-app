"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { useSyncUserFromThirdweb } from "@/hooks/useSyncUserFromThirdweb";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated } = useUser();
  const { isSyncing } = useSyncUserFromThirdweb(); // sync Zustand on load

  useEffect(() => {
    console.debug(isSyncing, isAuthenticated);

    if (!isSyncing && !isAuthenticated) {
      router.push("/signin");
    }
  }, [isSyncing, isAuthenticated]);

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
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
