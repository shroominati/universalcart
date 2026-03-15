"use client";

import { Shield, CheckCircle2, Clock, XCircle } from "lucide-react";
import { VerumClaim } from "@/lib/types";
import { CLAIM_TYPE_LABELS } from "@/lib/verum";

export default function VerumBadge({
  claim,
  compact = false,
}: {
  claim: VerumClaim;
  compact?: boolean;
}) {
  const statusConfig = {
    valid: {
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      label: "Verified",
    },
    pending: {
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      label: "Pending",
    },
    failed: {
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      label: "Failed",
    },
  };

  const config = statusConfig[claim.status];
  const StatusIcon = config.icon;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 rounded-md ${config.bg} px-2 py-0.5`}
      >
        <StatusIcon className={`h-3 w-3 ${config.color}`} />
        <span className={`text-[10px] font-semibold ${config.color}`}>
          {config.label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border ${config.border} ${config.bg} p-3`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-lg ${config.bg} p-1.5`}>
          <Shield className={`h-4 w-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white">
              {CLAIM_TYPE_LABELS[claim.type]}
            </span>
            <div className="flex items-center gap-1">
              <StatusIcon className={`h-3 w-3 ${config.color}`} />
              <span className={`text-[10px] font-semibold ${config.color}`}>
                {config.label}
              </span>
            </div>
          </div>
          <p className="mt-0.5 text-[11px] text-zinc-500 truncate">
            {claim.contentHash}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-600 truncate">
            Issuer: {claim.issuer}
          </p>
        </div>
      </div>
    </div>
  );
}
