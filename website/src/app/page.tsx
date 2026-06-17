export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-white/10 bg-[#660000]/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <p className="text-sm font-bold uppercase tracking-widest text-white">
            McKee Security & Audio Systems
          </p>
          <a
            href="tel:+17054572156"
            className="text-sm font-bold text-white hover:text-[#ec0000]"
          >
            (705) 457-2156
          </a>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-[#ec0000]">
          Vercel Edition
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
          Full home integration — rebuilt for speed
        </h1>
        <p className="mt-6 max-w-xl text-lg text-white/70">
          This is the new McKee Security site scaffold. Marketing pages, forms,
          and technician course content are being migrated from WordPress.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <a
            href="https://mckeesecurity.ca"
            className="rounded-xl bg-[#ec0000] px-8 py-3 font-bold text-white transition hover:bg-[#b20000]"
          >
            Visit live site
          </a>
          <a
            href="mailto:info@mckeesecurity.ca"
            className="rounded-xl border border-white/20 px-8 py-3 font-bold text-white transition hover:border-white/40"
          >
            info@mckeesecurity.ca
          </a>
        </div>
      </main>

      <footer className="border-t border-white/10 bg-[#262626] py-6 text-center text-sm text-white/50">
        Copyright 1994 © McKee Security & Audio Systems
      </footer>
    </div>
  );
}
