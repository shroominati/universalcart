"use client";

import { VerumClaim } from "@/lib/types";
import { CLAIM_TYPE_LABELS, CLAIM_TYPE_DESCRIPTIONS } from "@/lib/verum";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Shield,
  Link as LinkIcon,
} from "lucide-react";
import { motion } from "framer-motion";

export default function OrderTimeline({ claims }: { claims: VerumClaim[] }) {
  return (
    <div className="relative">
      <div className="absolute left-[19px] top-0 h-full w-px bg-gradient-to-b from-indigo-500/40 via-indigo-500/20 to-transparent" />

      <div className="flex flex-col gap-4">
        {claims.map((claim, i) => {
          const StatusIcon =
            claim.status === "valid"
              ? CheckCircle2
              : claim.status === "pending"
                ? Clock
                : XCircle;

          const statusColor =
            claim.status === "valid"
              ? "text-emerald-400"
              : claim.status === "pending"
                ? "text-amber-400"
                : "text-red-400";

          return (
            <motion.div
              key={claim.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative flex gap-4 pl-0"
            >
              <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-900">
                <Shield className={`h-4 w-4 ${statusColor}`} />
              </div>

              <div className="flex-1 rounded-xl border border-white/[0.06] bg-zinc-900/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {CLAIM_TYPE_LABELS[claim.type]}
                    </span>
                    <StatusIcon className={`h-3.5 w-3.5 ${statusColor}`} />
                  </div>
                  <span className="text-[11px] text-zinc-600">
                    {new Date(claim.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="mt-1 text-xs text-zinc-400">
                  {CLAIM_TYPE_DESCRIPTIONS[claim.type]}
                </p>

                <div className="mt-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <Shield className="h-3 w-3" />
                    <span className="truncate">
                      Issuer: {claim.issuer}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <LinkIcon className="h-3 w-3" />
                    <span className="truncate font-mono">
                      {claim.contentHash}
                    </span>
                  </div>
                  {claim.envelope &&
                    claim.envelope.dependencies.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                        <LinkIcon className="h-3 w-3" />
                        <span>
                          Depends on {claim.envelope.dependencies.length}{" "}
                          upstream claim
                          {claim.envelope.dependencies.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
