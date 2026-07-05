// Reproduce a Google-sized (chunked) session cookie against production.
// Google OAuth sessions carry large user_metadata; @supabase/ssr splits the
// auth cookie into .0/.1 chunks past ~3180 bytes. This checks the server
// handles chunked session cookies on /admin-dashboard.
// Run: node --env-file=.env.local scripts/chunked-cookie-check.mjs [baseUrl]

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const baseUrl = process.argv[2] ?? "https://mckeesecurity.ca";
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stamp = Date.now();
const email = `chunk-check-${stamp}@example.com`;
const password = randomBytes(24).toString("base64url");
let userId = null;

try {
  // Big user_metadata to mimic a Google identity payload and force chunking.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: "Chunk Check",
      avatar_url: `https://lh3.googleusercontent.com/a/${"x".repeat(120)}`,
      picture: `https://lh3.googleusercontent.com/a/${"x".repeat(120)}`,
      iss: "https://accounts.google.com",
      provider_id: "1".repeat(21),
      padding: "p".repeat(2600),
    },
  });
  if (error) throw error;
  userId = data.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    user_id: userId,
    first_name: "Chunk",
    last_name: "Check",
    email,
    role: "admin",
    status: "active",
  });
  if (profileError) throw profileError;

  const jar = new Map();
  const ssr = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach((c) => jar.set(c.name, c.value)),
    },
  });
  const { error: signInError } = await ssr.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  console.log("cookies set:", [...jar.keys()].join(", "));
  const cookieHeader = [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
  console.log("cookie header bytes:", Buffer.byteLength(cookieHeader));

  for (const path of ["/user-dashboard", "/admin-dashboard"]) {
    const res = await fetch(`${baseUrl}${path}`, { headers: { cookie: cookieHeader } });
    const html = await res.text();
    const signedIn = html.includes("Chunk") || html.includes("Admin Dashboard");
    console.log(`${path} -> ${res.status} ${signedIn ? "(session recognized)" : "(NO session)"}`);
  }
} finally {
  if (userId) {
    await admin.from("profiles").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
    console.log("cleanup done");
  }
}
