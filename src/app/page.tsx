import Link from "next/link";

export default function Landing() {
  return (
    <main>
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="font-bold text-lg text-brand-700">SwasthBook</div>
          <nav className="flex gap-3 items-center text-sm">
            <a href="#features" className="text-slate-600 hover:text-slate-900">Features</a>
            <a href="#pricing" className="text-slate-600 hover:text-slate-900">Pricing</a>
            <Link href="/demo" className="text-slate-600 hover:text-slate-900">WhatsApp Demo</Link>
            <Link href="/login" className="btn-primary">Login</Link>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Turn WhatsApp Into Your Hospital's Digital Receptionist.
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Let patients find doctors, check fees, see available slots and book appointments directly through WhatsApp.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <Link href="/demo" className="btn-primary text-base px-6 py-3">Try WhatsApp Demo</Link>
            <Link href="/login" className="btn-ghost text-base px-6 py-3">Book a Demo</Link>
          </div>
        </div>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-6">
        {[
          ["WhatsApp-first booking", "Patients book in Hindi, English or Hinglish. AI never invents doctors, fees or slots - everything comes from your live schedule."],
          ["Multi-branch clinics", "Doctors, departments, schedules and fees per branch. Every tenant's data is fully isolated."],
          ["Human handoff", "Staff can take over any AI conversation and hand it back when done."],
          ["Smart slot engine", "Slots generated from doctor schedules, breaks and leaves. Double booking impossible."],
          ["Dashboards for everyone", "Super Admin, Org Admin, Doctor and Receptionist each get their own view."],
          ["Subscription plans", "Sell plans with doctor, branch and appointment limits enforced automatically."],
        ].map(([t, d]) => (
          <div key={t} className="card"><h3 className="font-semibold">{t}</h3><p className="text-sm text-slate-600 mt-2">{d}</p></div>
        ))}
      </section>

      <section id="pricing" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center">Simple pricing for every size</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {[
            ["STARTER", "₹999/mo", "5 doctors, 1 branch, 500 appointments/month"],
            ["PRO", "₹2,499/mo", "25 doctors, 5 branches, WhatsApp AI, analytics"],
            ["BUSINESS", "₹4,999/mo", "200 doctors, 20 branches, everything unlimited-ish"],
          ].map(([n, p, f]) => (
            <div key={n} className="card text-center">
              <h3 className="font-bold">{n}</h3>
              <div className="text-3xl font-bold text-brand-700 mt-2">{p}</div>
              <p className="text-sm text-slate-600 mt-2">{f}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t bg-white py-8 text-center text-sm text-slate-500">
        SwasthBook - Appointment + Communication + Clinic Management
      </footer>
    </main>
  );
}
