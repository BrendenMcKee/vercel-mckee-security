"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { monitoringTiers, monitoringDisclaimer } from "@/lib/monitoring";
import { FadeIn } from "@/components/motion/fade-in";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

function BoolIcon({ value }: { value: boolean }) {
  return value ? (
    <Check className="h-5 w-5 text-green-400" />
  ) : (
    <X className="h-5 w-5 text-white/25" />
  );
}

export function MonitoringTiers() {
  const [active, setActive] = useState(0);
  const tier = monitoringTiers[active];

  return (
    <section id="monitoring" className="scroll-mt-24 bg-surface py-20">
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn>
          <SectionHeading
            eyebrow="Monitoring Options"
            title="Flexible Monitoring Options"
            description="We strongly recommend cellular monitoring for comprehensive protection and Total Connect 2.0 access."
          />
        </FadeIn>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {monitoringTiers.map((t, i) => (
            <button
              key={t.tier}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "rounded-xl px-5 py-3 text-sm font-bold transition",
                active === i
                  ? "bg-primary text-white shadow-lg shadow-primary/30"
                  : "bg-white/5 text-white/60 hover:text-white",
              )}
            >
              Tier {t.tier}
            </button>
          ))}
        </div>

        <motion.div
          key={active}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mt-8 max-w-2xl rounded-2xl border border-white/10 bg-surface-elevated p-8"
        >
          <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
          <p className="mt-2 text-3xl font-bold text-primary">{tier.price}</p>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-white/70">Landline required</span>
              <BoolIcon value={tier.landlineRequired} />
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-white/70">Cellular communicator</span>
              <BoolIcon value={tier.cellular} />
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-white/70">Total Connect 2.0 app</span>
              <BoolIcon value={tier.totalConnect} />
            </div>
            <div className="flex items-center justify-between pb-3">
              <span className="text-white/70">Home automation</span>
              <BoolIcon value={tier.homeAutomation} />
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-black/30 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white/50">
              Requirements
            </p>
            <ul className="mt-2 space-y-1 text-sm text-white/70">
              {tier.requirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </motion.div>

        <div className="mt-8 hidden lg:block">
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-surface-elevated text-white/50">
                <tr>
                  <th className="p-4">Feature</th>
                  {monitoringTiers.map((t) => (
                    <th key={t.tier} className="p-4 text-center">
                      Tier {t.tier}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Landline required", key: "landlineRequired" as const },
                  { label: "Cellular", key: "cellular" as const },
                  { label: "Total Connect 2.0", key: "totalConnect" as const },
                  { label: "Home automation", key: "homeAutomation" as const },
                ].map((row) => (
                  <tr key={row.key} className="border-t border-white/5">
                    <td className="p-4 text-white/70">{row.label}</td>
                    {monitoringTiers.map((t) => (
                      <td key={t.tier} className="p-4 text-center">
                        <span className="inline-flex justify-center">
                          <BoolIcon value={t[row.key]} />
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-sm italic text-white/45">
          {monitoringDisclaimer}
        </p>
      </div>
    </section>
  );
}
