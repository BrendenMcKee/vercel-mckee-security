"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { monitoringTiers, monitoringDisclaimer } from "@/lib/monitoring";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/utils";

function BoolIcon({ value }: { value: boolean }) {
  return value ? (
    <Check className="h-4 w-4 text-green-400" />
  ) : (
    <X className="h-4 w-4 text-white/25" />
  );
}

export function MonitoringTiers() {
  const [active, setActive] = useState(0);
  const tier = monitoringTiers[active];

  return (
    <section id="monitoring" className="scroll-mt-24 border-y border-white/5 bg-[#141414] py-10 md:py-12">
      <div className="mx-auto max-w-3xl px-6">
        <FadeIn>
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Monitoring Options
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">
              Flexible Monitoring Options
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/65">
              We strongly recommend cellular monitoring for reliable protection and Total Connect
              2.0 access.
            </p>
          </div>
        </FadeIn>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {monitoringTiers.map((t, i) => (
            <button
              key={t.tier}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-bold transition md:text-sm",
                active === i
                  ? "bg-primary text-white shadow-md shadow-primary/25"
                  : "bg-white/5 text-white/60 hover:text-white",
              )}
            >
              Tier {t.tier}
            </button>
          ))}
        </div>

        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 rounded-2xl border border-white/10 bg-[#1a1a1a] p-5 md:p-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-bold text-white md:text-xl">{tier.name}</h3>
            <p className="text-xl font-bold text-primary md:text-2xl">{tier.price}</p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              { label: "Landline required", value: tier.landlineRequired },
              { label: "Cellular communicator", value: tier.cellular },
              { label: "Total Connect 2.0 app", value: tier.totalConnect },
              { label: "Home automation", value: tier.homeAutomation },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-black/25 px-3 py-2.5"
              >
                <span className="text-sm text-white/70">{row.label}</span>
                <BoolIcon value={row.value} />
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-white/5 bg-black/30 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
              Requirements
            </p>
            <ul className="mt-1.5 space-y-1 text-sm text-white/70">
              {tier.requirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </motion.div>

        <p className="mx-auto mt-5 max-w-2xl text-center text-xs italic leading-relaxed text-white/40">
          {monitoringDisclaimer}
        </p>
      </div>
    </section>
  );
}
