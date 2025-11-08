"use client";

import { useRouter } from "next/navigation";
import { useActiveWallet, useDisconnect, useActiveAccount } from "thirdweb/react";
import { useUser } from "@/hooks/useUser";
import { ThirdwebConnectButton } from "../auth/ThirdwebConnectButton";
import { useSidebarState } from "@/hooks/useSidebarState";
import UserDropdown from "./UserDropdown";
import { ArrowFatLinesUpIcon} from "@phosphor-icons/react";
import { useTopUpModalState } from "@/hooks/useTopUpModalState";
import { activeChain, activeChainConfig, hederaTestnet, getChainConfigById } from "@/utils/chains";

export default function Header() {
  const router = useRouter();
  const { disconnect } = useDisconnect();
  const wallet = useActiveWallet();
  const { clearUser } = useUser();
  const { toggleSidebar } = useSidebarState();
  const { toggleModal, isOpen: isTopUpModalOpen } = useTopUpModalState();

  // Show Hedera when TopUp modal is open (payment context), otherwise show Somnia
  const displayChain = isTopUpModalOpen ? hederaTestnet : activeChain;
  const displayChainConfig = isTopUpModalOpen ? getChainConfigById(hederaTestnet.id) : activeChainConfig;

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
        {/* Current Chain Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#191919] border border-[#2B2B2B] rounded-lg">
          <div className={`w-2 h-2 rounded-full animate-pulse ${isTopUpModalOpen ? 'bg-blue-500' : 'bg-green-500'}`}></div>
          <span className="text-xs text-[#C1C1C1] font-medium">
            {displayChainConfig?.name}
          </span>
          <span className="text-xs text-[#5D5D5D]">
            (Chain ID: {displayChain.id})
          </span>
          {isTopUpModalOpen && (
            <span className="text-xs text-blue-400 font-medium">
              • Payment
            </span>
          )}
        </div>

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

          <button
            onClick={toggleModal}
            className="border-1 border-[#5D5D5D] text-sm cursor-pointer px-2 gap-2 text-[#F5F5F5]  flex items-center p-1 ">
              <ArrowFatLinesUpIcon size={22} />

              Top up</button>

        {/* Wallet Connect Button */}
        <div className="flex items-center">
          <ThirdwebConnectButton />
        </div>

        {/* User Drop Down */}
        <UserDropdown />
      </div>
    </header>
  );
}
