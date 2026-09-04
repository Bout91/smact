"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFading(true), 2800);
    const removeTimer = setTimeout(() => setShowSplash(false), 3300);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  return (
    <>
      <Background />
      {showSplash && <SplashIntro fading={splashFading} />}
      <MainScreen />
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   BACKGROUND — Dark navy, circuit pattern, pulsing glow
   ───────────────────────────────────────────────────────── */
function Background() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-slate-900">
      <div className="absolute inset-0 circuit-pattern opacity-70" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600 blur-[120px] animate-pulse-slow pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-20 right-20 w-80 h-80 rounded-full bg-cyan-500 blur-[100px] opacity-15 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-indigo-600 blur-[120px] opacity-15 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   SPLASH INTRO
   ───────────────────────────────────────────────────────── */
function SplashIntro({ fading }) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 circuit-pattern opacity-70" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600 blur-[120px] animate-pulse-slow"
        aria-hidden="true"
      />
      <div className="relative z-10 flex flex-col items-center text-center px-4">
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
        <h1
          className="text-6xl md:text-7xl font-black tracking-tight gradient-text animate-fade-in"
          style={{ animationDelay: "0.6s", opacity: 0 }}
        >
          SMAct
        </h1>
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
   ───────────────────────────────────────────────────────── */
function MainScreen() {
  const router = useRouter();

  return (
    <main className="relative z-10 min-h-screen flex flex-col">
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

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Καλωσορίσατε στο <span className="gradient-text">SMAct</span>
          </h1>
          <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-12">
            Υπηρεσία ενεργοποίησης του Service Manager Pro. Υπόβαλλε αίτηση για
            κωδικό ή αναζήτησε αίτηση που έχεις ήδη κάνει.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch">
            <button
              type="button"
              onClick={() => router.push("/request")}
              className="group relative px-8 py-5 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold text-base shadow-lg shadow-blue-900/50 hover:shadow-xl hover:shadow-blue-900/70 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 min-w-[260px]"
            >
              <span className="flex items-center justify-center gap-3">
                <span className="text-2xl">🔑</span>
                <span>Αίτημα Κωδικού Ενεργοποίησης</span>
              </span>
            </button>

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

      <footer className="px-6 py-4 text-center text-xs text-slate-500">
        SMAct · Χωρίς αποθήκευση προσωπικών δεδομένων
      </footer>
    </main>
  );
}
