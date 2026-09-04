"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  useEffect(() => {
    // After 2.8s, start fade-out of splash
    const fadeTimer = setTimeout(() => setSplashFading(true), 2800);
    // After 3.3s (fade duration = 500ms), remove splash entirely
    const removeTimer = setTimeout(() => setShowSplash(false), 3300);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  return (
    <>
      {/* Shared background - always visible */}
      <Background />

      {/* Splash intro overlay */}
      {showSplash && <SplashIntro fading={splashFading} />}

      {/* Main screen - always mounted, hidden behind splash */}
      <MainScreen />
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   BACKGROUND — Dark navy, circuit pattern, pulsing glow
   Same on every screen of the site.
   ───────────────────────────────────────────────────────── */
function Background() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-slate-900">
      {/* Circuit pattern overlay */}
      <div className="absolute inset-0 circuit-pattern opacity-70" />

      {/* Large pulsing glow - center */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600 blur-[120px] animate-pulse-slow pointer-events-none"
        aria-hidden="true"
      />

      {/* Secondary glow - top right */}
      <div
        className="absolute top-20 right-20 w-80 h-80 rounded-full bg-cyan-500 blur-[100px] opacity-15 pointer-events-none"
        aria-hidden="true"
      />

      {/* Secondary glow - bottom left */}
      <div
        className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-indigo-600 blur-[120px] opacity-15 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   SPLASH INTRO — Fade-in bg → logo drops → title → subtitle
   Shows for ~2.8s, then fades out and unmounts.
   ───────────────────────────────────────────────────────── */
function SplashIntro({ fading }) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Same background underneath (so no color flash) */}
      <div className="absolute inset-0 circuit-pattern opacity-70" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600 blur-[120px] animate-pulse-slow"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        {/* Logo with drop animation and glow */}
        <div className="relative mb-8 animate-drop-in">
          <div
            className="absolute inset-0 bg-cyan-400 blur-[60px] opacity-40 rounded-full scale-90"
            aria-hidden="true"
          />
          <Image
            src="/logo.png"
            alt="SMAct"
            width={200}
            height={200}
            priority
            className="relative z-10 drop-shadow-2xl"
          />
        </div>

        {/* Title with gradient */}
        <h1
          className="text-6xl md:text-7xl font-black tracking-tight gradient-text animate-fade-in"
          style={{ animationDelay: "0.6s", opacity: 0 }}
        >
          SMAct
        </h1>

        {/* Subtitle with slide-up */}
        <p
          className="mt-3 text-sm md:text-base uppercase tracking-[0.3em] text-cyan-300/80 font-semibold animate-slide-up"
          style={{ animationDelay: "1s", opacity: 0 }}
        >
          Activation Service
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN SCREEN — Welcome + 2 buttons
   Always mounted; splash sits above until it fades away.
   ───────────────────────────────────────────────────────── */
function MainScreen() {
  return (
    <main className="relative z-10 min-h-screen flex flex-col">
      {/* Header with small logo */}
      <header className="flex items-center gap-3 px-6 py-5">
        <Image
          src="/logo.png"
          alt="SMAct"
          width={44}
          height={44}
          className="drop-shadow-lg"
        />
        <div>
          <div className="text-lg font-bold gradient-text">SMAct</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400">
            Activation Service
          </div>
        </div>
      </header>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Καλωσορίσατε στο{" "}
            <span className="gradient-text">SMAct</span>
          </h1>
          <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-12">
            Υπηρεσία ενεργοποίησης του Service Manager Pro.
            Υπόβαλλε αίτηση για κωδικό ή αναζήτησε αίτηση που έχεις ήδη κάνει.
          </p>

          {/* Two buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch">
            {/* Primary button: Request key */}
            <button
              type="button"
              onClick={() => alert("Θα υλοποιηθεί στη Φάση 3.2")}
              className="group relative px-8 py-5 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold text-base shadow-lg shadow-blue-900/50 hover:shadow-xl hover:shadow-blue-900/70 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 min-w-[260px]"
            >
              <span className="flex items-center justify-center gap-3">
                <span className="text-2xl">🔑</span>
                <span>Αίτημα Κωδικού Ενεργοποίησης</span>
              </span>
            </button>

            {/* Secondary button: Search request */}
            <button
              type="button"
              onClick={() => alert("Θα υλοποιηθεί στη Φάση 3.3")}
              className="group relative px-8 py-5 rounded-2xl bg-slate-800/60 backdrop-blur-sm border-2 border-cyan-500/40 text-cyan-100 font-semibold text-base hover:bg-slate-800/80 hover:border-cyan-400/70 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 min-w-[260px]"
            >
              <span className="flex items-center justify-center gap-3">
                <span className="text-2xl">🔍</span>
                <span>Αναζήτηση Αίτησης</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-slate-500">
        SMAct · Χωρίς αποθήκευση προσωπικών δεδομένων
      </footer>
    </main>
  );
}
