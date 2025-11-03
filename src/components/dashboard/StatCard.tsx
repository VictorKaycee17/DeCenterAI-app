"use client";

import React from "react";

interface Detail {
  label: string;
  value: string;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  details: Detail[];
  status?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  details,
  status,
}: StatCardProps) {
  const isHealthy = status?.toLowerCase() === "ok";

  return (
    <div className="flex flex-col gap-3 p-6 border border-[#232323] rounded-[20px] bg-[#050505] transition hover:bg-[#0B0B0B]">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-bold text-[#F5F5F5]">{title}</h4>
        {icon}
      </div>

      <div
        className={`text-2xl font-bold ${
          status
            ? isHealthy
              ? "text-green-400"
              : "text-red-400"
            : "text-[#F5F5F5]"
        }`}
      >
        {value}
      </div>

      <div className="h-px bg-[#494949]" />

      <div className="flex flex-col gap-2">
        {details.map((d, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-sm text-[#C1C1C1]"
          >
            <span>{d.label}</span>
            <span>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
