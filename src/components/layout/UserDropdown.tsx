"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveWallet, useDisconnect } from "thirdweb/react";
import { useUser } from "@/hooks/useUser";
import { CaretUpDown, Gear } from "@phosphor-icons/react";
import { toast } from "react-toastify";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { disconnect } = useDisconnect();
  const wallet = useActiveWallet();
  const { clearUser, email, username, profile_image } = useUser();

  const handleLogout = async () => {
    try {
      // 1. Disconnect wallet
      if (wallet) await disconnect(wallet);

      // 2. Clear Zustand store
      clearUser();

      // 3. Remove auth cookie
      await fetch("/api/auth/session", { method: "DELETE" });

      // 4. Redirect to Sign-in page
      router.push("/signin");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed");
    } finally {
      setIsOpen(false);
    }
  };

  const displayName = username || email?.split("@")[0] || "User";

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 bg-[#191919] rounded-[16px] hover:bg-[#232323] transition-colors"
      >
        {profile_image ? (
          <img
            src={profile_image}
            alt="Profile"
            className="w-6 h-6 rounded-full object-cover border border-[#5D5D5D]"
          />
        ) : (
          <div className="w-6 h-6 rounded-full border border-[#5D5D5D] bg-gradient-to-br from-blue-400 to-blue-600" />
        )}

        <span className="font-archivo text-sm text-[#C1C1C1] truncate max-w-[100px]">
          {displayName}
        </span>

        <CaretUpDown
          size={18}
          weight="regular"
          className={`text-[#5D5D5D] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 bg-[#191919] border border-[#2B2B2B] rounded-[12px] shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-[#2B2B2B]">
            <p className="font-archivo text-sm font-medium text-[#F5F5F5]">
              {displayName}
            </p>
            <p className="font-archivo text-xs text-[#8F8F8F]">{email}</p>
          </div>

          <button
            onClick={() => {
              router.push("/dashboard/settings");
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left font-archivo text-sm text-[#C1C1C1] hover:bg-[#232323] transition-colors"
          >
            <Gear size={18} weight="regular" />
            Account Settings
          </button>

          <button
            onClick={() => {
              router.push("/dashboard/settings?modal=profile");
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left font-archivo text-sm text-[#C1C1C1] hover:bg-[#232323] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="7"
                r="4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Profile
          </button>

          <div className="border-t border-[#2B2B2B]" />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-left font-archivo text-sm text-red-400 hover:bg-[#232323] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5m0 0l-5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
