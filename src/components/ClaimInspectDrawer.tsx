"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Shield,
  FlaskConical,
  Terminal,
  Radio,
  Hash,
  User,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  Copy,
  Check,
} from "lucide-react";
import type { VerumClaim } from "@/lib/types";
import type { ClaimInspectionResult, VerumMode } from "@/lib/verum";
import {
  inspectClaim,
  getVerumMode,
  VERUM_MODE_DISPLAY,
  CLAIM_TYPE_LABELS,
  CLAIM_TYPE_DESCRIPTIONS,
} from "@/lib/verum";

const modeIcons: Record<VerumMode, typeof Shield> = {
  mock: FlaskConical,
  cli: Terminal,
  mcp: Radio,
};

const modeColors: Record<VerumMode, { text: string; bg: string; border: string }> = {
  mock: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  cli: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  mcp: { text: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-1 rounded p-0.5 text-zinc-600 transition-colors hover:text-zinc-400"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

function InspectRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Shield;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800/80">
        <Icon className="h-4 w-4 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}

export default function ClaimInspectDrawer({
  claim,
  onClose,
}: {
  claim: VerumClaim | null;
  onClose: () => void;
}) {
  const [inspection, setInspection] = useState<ClaimInspectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const mode = getVerumMode();
  const mc = modeColors[mode];
  const ModeIcon = modeIcons[mode];

  useEffect(() => {
    if (!claim) {
      setInspection(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    inspectClaim(claim).then((result) => {
      if (!cancelled) {
        setInspection(result);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [claim]);

  return (
    <AnimatePresence>
      {claim && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-[60] flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-zinc-950"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10">
                  <FileSearch className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Claim Inspector</h2>
                  <p className="text-[11px] text-zinc-500">
                    {CLAIM_TYPE_LABELS[claim.type]}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Trust Mode Indicator */}
              <div className={`mb-5 rounded-xl border ${mc.border} ${mc.bg} p-3`}>
                <div className="flex items-center gap-2">
                  <ModeIcon className={`h-4 w-4 ${mc.text}`} />
                  <span className={`text-xs font-semibold ${mc.text}`}>
                    {VERUM_MODE_DISPLAY[mode].label}
                  </span>
                  {inspection && (
                    <span className="ml-auto text-[10px] text-zinc-500">
                      result mode: {inspection.mode}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-zinc-500 leading-relaxed">
                  {VERUM_MODE_DISPLAY[mode].description}
                </p>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="h-8 w-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500"
                  />
                  <span className="text-xs text-zinc-500">Inspecting claim...</span>
                </div>
              ) : (
                <>
                  {/* Claim Type */}
                  <InspectRow icon={Shield} label="Claim Type">
                    <p className="text-sm font-semibold text-white">
                      {CLAIM_TYPE_LABELS[claim.type]}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-400 leading-relaxed">
                      {CLAIM_TYPE_DESCRIPTIONS[claim.type]}
                    </p>
                    <span className="mt-1 inline-block rounded bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                      {claim.type}
                    </span>
                  </InspectRow>

                  {/* Issuer */}
                  <InspectRow icon={User} label="Issuer">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs text-zinc-300 truncate">
                        {claim.issuer}
                      </span>
                      <CopyButton text={claim.issuer} />
                    </div>
                    {claim.issuer.startsWith("did:key:") && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
                        <Shield className="h-2.5 w-2.5" />
                        did:key method
                      </span>
                    )}
                  </InspectRow>

                  {/* Content Hash */}
                  <InspectRow icon={Hash} label="Content Hash">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs text-zinc-300 break-all">
                        {claim.contentHash}
                      </span>
                      <CopyButton text={claim.contentHash} />
                    </div>
                    {claim.envelope && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
                        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400/60" />
                        SHA-256
                        {mode === "mock" ? " (simulated)" : ""}
                      </span>
                    )}
                  </InspectRow>

                  {/* Signature */}
                  {claim.envelope && (
                    <InspectRow icon={Shield} label="Signature">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs text-zinc-300 break-all">
                          {claim.envelope.signature}
                        </span>
                        <CopyButton text={claim.envelope.signature} />
                      </div>
                      <span className="mt-1 inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
                        Ed25519
                        {mode === "mock" ? " (simulated)" : ""}
                      </span>
                    </InspectRow>
                  )}

                  {/* Dependencies */}
                  <InspectRow icon={GitBranch} label="Dependencies">
                    {(claim.envelope?.dependencies.length ?? 0) === 0 ? (
                      <p className="text-xs text-zinc-500 italic">
                        Root claim — no upstream dependencies
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {claim.envelope!.dependencies.map((dep, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-lg bg-zinc-800/50 px-2.5 py-1.5"
                          >
                            <GitBranch className="h-3 w-3 flex-shrink-0 text-indigo-400/60" />
                            <span className="font-mono text-[11px] text-zinc-400 truncate">
                              {dep}
                            </span>
                            <CopyButton text={dep} />
                          </div>
                        ))}
                      </div>
                    )}
                  </InspectRow>

                  {/* Verification Status */}
                  <InspectRow icon={CheckCircle2} label="Verification Status">
                    <div className="flex items-center gap-2">
                      {claim.status === "valid" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      )}
                      <span
                        className={`text-sm font-semibold ${
                          claim.status === "valid"
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }`}
                      >
                        {inspection?.verificationStatus ?? claim.status}
                      </span>
                    </div>
                  </InspectRow>

                  {/* Envelope Metadata */}
                  {claim.envelope && (
                    <InspectRow icon={FileSearch} label="Envelope">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">Version</span>
                          <span className="font-mono text-[11px] text-zinc-300">
                            {claim.envelope.version}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">Issued At</span>
                          <span className="text-[11px] text-zinc-300">
                            {new Date(claim.envelope.issuedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">Claim ID</span>
                          <span className="font-mono text-[11px] text-zinc-300">
                            {claim.id}
                          </span>
                        </div>
                      </div>
                    </InspectRow>
                  )}

                  {/* Degradation Warnings */}
                  {inspection && inspection.warnings.length > 0 && (
                    <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-300">
                          Degradation Notices
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {inspection.warnings.map((w, i) => (
                          <p
                            key={i}
                            className="text-[11px] text-amber-200/70 leading-relaxed"
                          >
                            {w}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 px-5 py-3">
              <div className="flex items-center justify-between text-[10px] text-zinc-600">
                <span>UniversalCart Claim Inspector</span>
                <span className={mc.text}>
                  {VERUM_MODE_DISPLAY[mode].label}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
