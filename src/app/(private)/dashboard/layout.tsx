"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { useSyncUserFromThirdweb } from "@/hooks/useSyncUserFromThirdweb";
import { ThirdwebConnectButton } from "@/components/auth/ThirdwebConnectButton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated } = useUser();
  const { isSyncing } = useSyncUserFromThirdweb(); // sync Zustand on load

  useEffect(() => {
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
    <div className="min-h-screen bg-black text-white">
      {/* Hidden button to ensure Thirdweb context hydration */}
      <span className="hidden">
        <ThirdwebConnectButton />
      </span>
      {children}
    </div>
  );
}
