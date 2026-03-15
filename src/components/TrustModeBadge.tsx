"use client";

import { Shield, FlaskConical, Terminal, Radio } from "lucide-react";
import { getVerumMode, VERUM_MODE_DISPLAY } from "@/lib/verum";
import type { VerumMode } from "@/lib/verum";

const modeConfig: Record<
  VerumMode,
  { icon: typeof Shield; color: string; bg: string; border: string }
> = {
  mock: {
    icon: FlaskConical,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  cli: {
    icon: Terminal,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  mcp: {
    icon: Radio,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
  },
};

export default function TrustModeBadge({
  compact = false,
}: {
  compact?: boolean;
}) {
  const mode = getVerumMode();
  const display = VERUM_MODE_DISPLAY[mode];
  const cfg = modeConfig[mode];
  const Icon = cfg.icon;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-lg ${cfg.bg} border ${cfg.border} px-2.5 py-1.5`}
      >
        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
        <span className={`text-xs font-semibold ${cfg.color}`}>
          {display.label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${cfg.color}`} />
        <span className={`text-xs font-semibold ${cfg.color}`}>
          {display.label}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-zinc-500 leading-relaxed">
        {display.description}
      </p>
    </div>
  );
}
