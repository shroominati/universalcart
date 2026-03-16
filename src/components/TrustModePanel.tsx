"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  FlaskConical,
  Terminal,
  Radio,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import {
  getVerumMode,
  getVerumStatus,
  VERUM_MODE_DISPLAY,
} from "@/lib/verum";
import type {
  VerumMode,
  VerumProviderCapabilities,
  VerumStatusResult,
} from "@/lib/verum";

const modeConfig: Record<
  VerumMode,
  { icon: typeof Shield; color: string; bg: string; border: string; glow: string }
> = {
  mock: {
    icon: FlaskConical,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    glow: "shadow-amber-500/5",
  },
  cli: {
    icon: Terminal,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    glow: "shadow-emerald-500/5",
  },
  mcp: {
    icon: Radio,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    glow: "shadow-indigo-500/5",
  },
};

const capabilityLabels: Record<string, { label: string; desc: string }> = {
  generateClaims: {
    label: "Generate Claims",
    desc: "Produce ClaimEnvelopeV1 with typed content, did:key issuer, and Ed25519 signature",
  },
  verifyClaims: {
    label: "Verify Claims",
    desc: "Check Ed25519 signatures, content hashes, and dependency chain integrity (simulated in mock mode)",
  },
  inspectClaims: {
    label: "Inspect Claims",
    desc: "Read claim type, issuer, hash, signature, and upstream dependency graph",
  },
};

function CapabilityRow({
  capKey,
  enabled,
}: {
  capKey: string;
  enabled: boolean;
}) {
  const meta = capabilityLabels[capKey];
  if (!meta) return null;

  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${
          enabled ? "bg-emerald-500/10" : "bg-zinc-800"
        }`}
      >
        {enabled ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-zinc-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium ${
              enabled ? "text-zinc-200" : "text-zinc-500"
            }`}
          >
            {meta.label}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              enabled
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-zinc-800 text-zinc-600"
            }`}
          >
            {enabled ? "active" : "simulated"}
          </span>
        </div>
        <p className="text-[10px] text-zinc-600 mt-0.5">{meta.desc}</p>
      </div>
    </div>
  );
}

export default function TrustModePanel() {
  const [expanded, setExpanded] = useState(false);
  const configuredMode = getVerumMode();
  const [status, setStatus] = useState<VerumStatusResult | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const mode = status?.mode ?? configuredMode;
  const caps: VerumProviderCapabilities | null = status?.capabilities ?? null;
  const display = VERUM_MODE_DISPLAY[mode];
  const cfg = modeConfig[mode];
  const Icon = cfg.icon;

  useEffect(() => {
    let cancelled = false;

    void getVerumStatus()
      .then((nextStatus) => {
        if (!cancelled) {
          setStatus(nextStatus);
          setStatusError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatusError(
            error instanceof Error
              ? error.message
              : "Unable to load provider capabilities."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className={`rounded-2xl border ${cfg.border} ${cfg.bg} shadow-lg ${cfg.glow} overflow-hidden`}
    >
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${cfg.bg}`}
        >
          <Icon className={`h-5 w-5 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${cfg.color}`}>
              {display.label}
            </span>
            <span className="text-[10px] text-zinc-600">Trust Mode</span>
          </div>
          <p className="text-[11px] text-zinc-500 truncate">
            {display.description}
          </p>
        </div>
        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5 px-4 py-3">
              {/* Capabilities grid */}
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Provider Capabilities
              </h4>
              {caps ? (
                <div className="flex flex-col divide-y divide-white/5">
                  <CapabilityRow capKey="generateClaims" enabled={caps.generateClaims} />
                  <CapabilityRow capKey="verifyClaims" enabled={caps.verifyClaims} />
                  <CapabilityRow capKey="inspectClaims" enabled={caps.inspectClaims} />
                </div>
              ) : (
                <div className="rounded-xl border border-white/5 bg-zinc-900/60 px-3 py-4 text-[11px] text-zinc-500">
                  Loading provider capabilities from the server...
                </div>
              )}

              {/* Mode explanation */}
              <div className="mt-4 rounded-xl bg-zinc-900/60 border border-white/5 p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 flex-shrink-0 text-zinc-500 mt-0.5" />
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {statusError ?? caps?.explainMode ?? "Loading provider explanation..."}
                  </p>
                </div>
              </div>

              {/* Mode comparison hint */}
              <div className="mt-3 flex items-center gap-3 text-[10px] text-zinc-600">
                <div className="flex items-center gap-1">
                  <FlaskConical className="h-3 w-3 text-amber-400/40" />
                  <span>Mock</span>
                </div>
                <div className="flex items-center gap-1">
                  <Terminal className="h-3 w-3 text-emerald-400/40" />
                  <span>CLI</span>
                </div>
                <div className="flex items-center gap-1">
                  <Radio className="h-3 w-3 text-indigo-400/40" />
                  <span>MCP</span>
                </div>
                <span className="ml-auto">
                  Set via NEXT_PUBLIC_VERUM_MODE
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
