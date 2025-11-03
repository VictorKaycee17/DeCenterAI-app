"use client";

import { usePathname } from "next/navigation";
import SidebarLink from "./SidebarLink";
import {
  IconAPIs,
  IconDashbaord,
  IconPlayground,
  IconSettings,
} from "@/components/ui/icons";
import Link from "next/link";
import { useSidebarState } from "@/hooks/useSidebarState";
import { motion, AnimatePresence } from "framer-motion";

const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: <IconDashbaord /> },
  { name: "APIs", href: "/dashboard/agents", icon: <IconAPIs /> },
  {
    name: "Playground",
    href: "/dashboard/playground",
    icon: <IconPlayground />,
  },
  { name: "Settings", href: "/dashboard/settings", icon: <IconSettings /> },
];

export default function Sidebar() {
  const path = usePathname();
  const { isOpen, closeSidebar } = useSidebarState();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden sm:flex flex-col w-[152px] bg-[#050505] h-screen fixed left-0 top-0 border-r border-[#191919]">
        {/* Logo */}
        <div className="flex items-center justify-center h-[88px] border-b border-[#191919]">
          <Link href="/">
            <img src="/logo_top.svg" alt="Decenter AI" className="w-[120px]" />
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex flex-col flex-1 py-10 gap-6 overflow-y-auto">
          {navigationItems.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              isActive={path === item.href}
            />
          ))}
        </nav>

        {/* ===== Footer Section ===== */}
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 border-t border-[#191919] text-xs text-[#5D5D5D]">
          <a
            href="https://docs.ideomind.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#8F8F8F] hover:text-[#C1C1C1] transition-colors"
          >
            API Documentation
          </a>
          <p className="text-[11px] text-[#5D5D5D]">© 2025 DeCenter AI</p>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSidebar}
            />

            {/* Sliding Drawer */}
            <motion.aside
              className="fixed top-0 left-0 w-[220px] bg-[#0A0A0A] h-screen z-50 border-r border-[#191919] flex flex-col"
              initial={{ x: -220 }}
              animate={{ x: 0 }}
              exit={{ x: -220 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <div className="flex items-center justify-between h-[64px] border-b border-[#191919] px-4">
                <Link href="/" onClick={closeSidebar}>
                  <img
                    src="/logo_top.svg"
                    alt="Decenter AI"
                    className="w-[100px]"
                  />
                </Link>
                <button
                  onClick={closeSidebar}
                  className="text-[#C1C1C1] hover:text-white"
                >
                  ✕
                </button>
              </div>

              <nav className="flex flex-col flex-1 p-6 gap-4">
                {navigationItems.map((item) => (
                  <SidebarLink
                    key={item.href}
                    item={item}
                    isActive={path === item.href}
                  />
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
