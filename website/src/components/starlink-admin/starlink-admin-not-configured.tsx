import { AlertTriangle } from "lucide-react";

export function StarlinkAdminNotConfigured() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-8 text-center shadow-2xl shadow-black/40">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-bold uppercase tracking-wide text-white">
          Not configured
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          The Starlink rental portal needs its environment variables before it can
          run. Set <code className="text-white/80">SUPABASE_URL</code>,{" "}
          <code className="text-white/80">SUPABASE_SERVICE_ROLE_KEY</code>,{" "}
          <code className="text-white/80">STARLINK_ADMIN_PASSWORD</code>, and{" "}
          <code className="text-white/80">STARLINK_ADMIN_AUTH_SECRET</code> in your
          hosting environment, then reload.
        </p>
      </div>
    </div>
  );
}
