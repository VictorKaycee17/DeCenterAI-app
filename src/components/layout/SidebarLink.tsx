import { ReactNode } from "react";
import Link from "next/link";

interface NavItem {
  name: string;
  href: string;
  icon: ReactNode;
}

export default function SidebarLink({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`flex flex-col items-center py-2 px-9 gap-2 cursor-pointer transition-colors ${
        isActive ? "bg-[#191919]" : "hover:bg-[#191919]/50"
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 flex items-center justify-center">
          {item.icon}
        </div>
        <span
          className={`text-base font-normal leading-6 ${
            isActive ? "text-[#F5F5F5]" : "text-[#5D5D5D]"
          }`}
        >
          {item.name}
        </span>
      </div>
    </Link>
  );
}
