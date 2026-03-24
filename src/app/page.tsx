import Link from "next/link";

const TIERS = [
  { name: "Clean", score: "1–4", color: "var(--tier-clean)", bg: "var(--tier-clean-light)", desc: "No significant concern" },
  { name: "Watch", score: "4–6", color: "var(--tier-watch)", bg: "var(--tier-watch-light)", desc: "Some evidence of concern" },
  { name: "Caution", score: "6–8", color: "var(--tier-caution)", bg: "var(--tier-caution-light)", desc: "Meaningful concern, consider swapping" },
  { name: "Avoid", score: "8–10", color: "var(--tier-avoid)", bg: "var(--tier-avoid-light)", desc: "Strong evidence of harm" },
];

const FEATURES = [
  {
    icon: "🧬",
    title: "Evidence-based scoring",
    body: "Each product gets a score from 1–10 derived from peer-reviewed studies, IARC classifications, and regulatory bans across 20+ jurisdictions. No opinions — only citable sources.",
  },
  {
    icon: "👤",
    title: "Personal health profile",
    body: "Tell us your conditions and sensitivities once. clarvn applies condition-specific ingredient modifiers so the score reflects your body, not just an average.",
  },
  {
    icon: "🔄",
    title: "Cleaner alternatives",
    body: "When a product scores Caution or Avoid, clarvn surfaces real, widely-available alternatives with lower ingredient concern profiles.",
  },
  {
    icon: "🔒",
    title: "Your data stays yours",
    body: "Your health profile is stored only on your device. It never leaves your browser. clarvn computes your personal score locally — no server ever sees your conditions.",
  },
];

const STEPS = [
  { step: "01", title: "Search any product", body: "Type the name of any grocery, snack, or household product. clarvn looks it up in our scored database of 400+ products." },
  { step: "02", title: "See the score", body: "Get an instant ingredient safety score. Each score links to the studies and regulatory actions behind it." },
  { step: "03", title: "Find better options", body: "Swap out Caution or Avoid products with cleaner alternatives we've already scored for you." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--surface)] flex flex-col">
      {/* Nav */}
      <nav className="bg-white border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-base text-[var(--ink)]" style={{ fontFamily: "var(--font-serif)" }}>
          clar<span className="text-[var(--teal)] italic">vn</span>
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium bg-[var(--teal)] text-white px-4 py-2 rounded-[var(--radius)] hover:bg-[var(--teal-dark)] transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 text-center max-w-2xl mx-auto">
        <p className="section-eyebrow mb-4">Ingredient safety, made readable</p>
        <h1
          className="text-5xl sm:text-6xl text-[var(--ink)] leading-[1.1] mb-6"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Know what&rsquo;s really<br />
          <span className="text-[var(--teal)] italic">in your food.</span>
        </h1>
        <p className="text-lg text-[var(--ink-3)] mb-10 max-w-lg mx-auto">
          clarvn scores grocery products 1–10 based on ingredient safety evidence from peer-reviewed research and regulatory databases across 20 countries. Personalised to your health profile.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center bg-[var(--teal)] text-white font-semibold text-sm px-8 py-3.5 rounded-[var(--radius-lg)] hover:bg-[var(--teal-dark)] transition-colors"
          >
            Create free account
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center bg-white text-[var(--ink)] font-semibold text-sm px-8 py-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Score tiers */}
      <section className="px-6 py-14 max-w-3xl mx-auto w-full">
        <p className="section-eyebrow text-center mb-3">Four clear tiers</p>
        <h2
          className="text-2xl text-center text-[var(--ink)] mb-8"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Simple scores, transparent evidence
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className="rounded-[var(--radius-lg)] p-4 flex flex-col items-center text-center gap-2"
              style={{ background: t.bg }}
            >
              <span
                className="text-2xl font-bold"
                style={{ fontFamily: "var(--font-serif)", color: t.color }}
              >
                {t.score}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: t.color }}>
                {t.name}
              </span>
              <p className="text-xs text-[var(--ink-3)] leading-snug">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-14 bg-white">
        <div className="max-w-3xl mx-auto">
          <p className="section-eyebrow text-center mb-3">How it works</p>
          <h2
            className="text-2xl text-center text-[var(--ink)] mb-10"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Three steps to a cleaner cart
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div key={s.step} className="flex flex-col gap-3">
                <span
                  className="text-4xl font-bold text-[var(--surface-3)]"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {s.step}
                </span>
                <h3 className="font-semibold text-[var(--ink)] text-sm">{s.title}</h3>
                <p className="text-sm text-[var(--ink-3)] leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-14 max-w-3xl mx-auto w-full">
        <p className="section-eyebrow text-center mb-3">Built with care</p>
        <h2
          className="text-2xl text-center text-[var(--ink)] mb-10"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          What makes clarvn different
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-[var(--radius-xl)] border border-[var(--border)] p-6 flex flex-col gap-3"
            >
              <span className="text-2xl">{f.icon}</span>
              <h3 className="font-semibold text-[var(--ink)] text-sm">{f.title}</h3>
              <p className="text-sm text-[var(--ink-3)] leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Transparency note */}
      <section className="px-6 py-10 bg-white">
        <div className="max-w-xl mx-auto text-center">
          <div className="callout teal inline-block text-left max-w-lg">
            <div>
              <p className="text-xs font-semibold text-[var(--teal-dark)] uppercase tracking-wide mb-1">How scores are calculated</p>
              <p className="text-sm text-[var(--ink-2)] leading-relaxed">
                Every score is computed from three weighted dimensions: harm evidence (40%), regulatory consensus across 20+ jurisdictions (35%), and avoidance priority (25%). All citations are traceable to published studies or official regulatory actions. Scores are AI-generated and reviewed periodically — they are not a substitute for medical advice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <h2
          className="text-3xl text-[var(--ink)] mb-4"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Start reading labels differently.
        </h2>
        <p className="text-sm text-[var(--ink-3)] mb-8">Free to use. No credit card required.</p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center bg-[var(--teal)] text-white font-semibold text-sm px-8 py-3.5 rounded-[var(--radius-lg)] hover:bg-[var(--teal-dark)] transition-colors"
        >
          Create free account
        </Link>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-[var(--ink)] text-white px-6 py-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-semibold text-sm" style={{ fontFamily: "var(--font-serif)" }}>
            clar<span className="text-[var(--teal-mid)] italic">vn</span>
          </span>
          <p className="text-xs text-white/40">
            Scores are AI-generated from peer-reviewed evidence. Not medical advice. &copy; {new Date().getFullYear()} clarvn.
          </p>
        </div>
      </footer>
    </div>
  );
}
