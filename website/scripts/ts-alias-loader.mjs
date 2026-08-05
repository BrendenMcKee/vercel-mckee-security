// Lets the check scripts import the app's own TypeScript modules directly (Node
// strips the types itself). Two things Node does not do that the bundler does:
// resolve the `@/` alias, and resolve extensionless imports. Register with:
//   node --import ./scripts/register-ts-alias.mjs scripts/<name>.mjs

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = path.resolve(import.meta.dirname, "../src");

function firstExisting(base) {
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
  return candidates.find((candidate) => {
    try {
      return existsSync(candidate) && path.extname(candidate) !== "";
    } catch {
      return false;
    }
  });
}

export function resolve(specifier, context, next) {
  // Build-time guards only; outside a React server render they just throw.
  if (specifier === "server-only" || specifier === "client-only") {
    return { url: "data:text/javascript,export{}", shortCircuit: true };
  }

  if (specifier.startsWith("@/")) {
    const found = firstExisting(path.join(SRC, specifier.slice(2)));
    if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
  }

  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const found = firstExisting(path.resolve(parentDir, specifier));
    if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
  }

  return next(specifier, context);
}
