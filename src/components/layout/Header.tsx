"use client";

import { useRouter } from "next/navigation";
import { useActiveWallet, useDisconnect } from "thirdweb/react";
import { useUser } from "@/hooks/useUser";
import { ThirdwebConnectButton } from "../auth/ThirdwebConnectButton";
import { useSidebarState } from "@/hooks/useSidebarState";
import UserDropdown from "./UserDropdown";

export default function Header() {
  const router = useRouter();
  const { disconnect } = useDisconnect();
  const wallet = useActiveWallet();
  const { clearUser } = useUser();
  const { toggleSidebar } = useSidebarState();

  return (
    <header className="flex items-center justify-between sm:justify-end h-[88px] bg-[#050505] border-b border-[#191919] px-4 sm:px-6">
      {/* Mobile menu toggle */}
      <button
        aria-label="Toggle sidebar"
        onClick={toggleSidebar}
        className="sm:hidden text-[#C1C1C1] hover:text-white"
      >
        {/* Hamburger Icon */}
        <svg
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      <h1 className="sm:hidden text-lg font-medium text-[#F5F5F5]">
        DeCenter AI
      </h1>
      <div className="flex items-center gap-3 justify-end">
        {/* Notification Bell */}
        {/* <button
          aria-label="Notifications"
          className="p-2 hover:bg-[#191919] rounded-lg transition-colors"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5D5D5D"
            strokeWidth="1.5"
          >
            <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2z" />
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          </svg>
        </button> */}

        {/* User Drop Down */}
        <UserDropdown />
        {/* Sign Out Button */}
        {/* <button
          onClick={handleSignOut}
          className="rounded-md bg-[#191919] px-4 py-2 text-sm text-[#C1C1C1] hover:bg-[#2B2B2B] transition"
        >
          Sign Out
        </button> */}

        {/* Hidden button to ensure Thirdweb context hydration */}
        <span className="hidden">
          <ThirdwebConnectButton />
        </span>
      </div>
    </header>
  );
}
