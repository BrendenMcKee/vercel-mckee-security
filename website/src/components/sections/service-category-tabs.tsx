"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { serviceCategories } from "@/lib/services";
import { cn } from "@/lib/utils";

export function ServiceCategoryTabs() {
  type CategoryId = (typeof serviceCategories)[number]["id"];
  const [active, setActive] = useState<CategoryId>(serviceCategories[0].id);

  const current = serviceCategories.find((c) => c.id === active)!;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap justify-center gap-2">
        {serviceCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActive(cat.id)}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition",
              active === cat.id
                ? "bg-primary text-white shadow-lg shadow-primary/30"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.ul
          key={active}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3 }}
          className="mt-8 space-y-3 rounded-2xl border border-white/10 bg-surface-elevated/40 p-8"
        >
          {current.items.map((item, i) => (
            <motion.li
              key={item}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-3 text-white/80"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {item}
            </motion.li>
          ))}
        </motion.ul>
      </AnimatePresence>
    </div>
  );
}
