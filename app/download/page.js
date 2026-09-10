"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Script from "next/script";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function DownloadPage() {
  const router = useRouter();

  const [contactMessage, setContactMessage] = useState("");
  const [contactDetails, setContactDetails] = useState("");

  // Key entry state
  const [downloadKey, setDownloadKey] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null); // { status, message, downloadUrl }

  // Feedback state — υποχρεωτικό ξεχωριστό key
  const [feedbackKey, setFeedbackKey] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  // Turnstile — μόνο για το download key check (feedback χωρίς captcha, Φάση 12d)
  const [tokenCheck, setTokenCheck] = useState("");
  const turnstileCheckRef = useRef(null);
  const widgetCheckIdRef = useRef(null);

  // Load public settings for contact message
  useEffect(() => {
    fetch("/api/settings/public", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setContactMessage(data.settings?.download_contact_message || "");
        setContactDetails(data.settings?.download_contact_details || "");
      })
      .catch(() => {});
  }, []);

  // Render Turnstile widgets
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;

    function tryRender() {
      if (cancelled) return;
      if (typeof window === "undefined" || !window.turnstile) {
        setTimeout(tryRender, 200);
        return;
      }
      if (turnstileCheckRef.current && !widgetCheckIdRef.current) {
        try {
          widgetCheckIdRef.current = window.turnstile.render(turnstileCheckRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            theme: "dark",
            language: "el",
            callback: (t) => setTokenCheck(t),
            "error-callback": () => setTokenCheck(""),
            "expired-callback": () => setTokenCheck(""),
          });
        } catch {}
      }
      // Φάση 12d: Feedback captcha αφαιρέθηκε — αντικαταστάθηκε με rate limit + key validation
    }

    tryRender();
    return () => {
      cancelled = true;
    };
  }, []);

  function resetTurnstileCheck() {
    setTokenCheck("");
    if (widgetCheckIdRef.current && window.turnstile) {
      try { window.turnstile.reset(widgetCheckIdRef.current); } catch {}
    }
  }

  async function handleCheck(e) {
    e.preventDefault();
    setResult(null);
    if (!downloadKey.trim()) return;
    if (TURNSTILE_SITE_KEY && !tokenCheck) {
      setResult({ status: "error", message: "Ολοκλήρωσε τον έλεγχο ασφαλείας (captcha)." });
      return;
    }
    setChecking(true);
    try {
      const res = await fetch("/api/download/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ downloadKey: downloadKey.trim(), turnstileToken: tokenCheck }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ status: "error", message: data.error || "Σφάλμα." });
      } else {
        setResult(data);
      }
      resetTurnstileCheck();
    } catch {
      setResult({ status: "error", message: "Σφάλμα δικτύου." });
      resetTurnstileCheck();
    } finally {
      setChecking(false);
    }
  }

  async function handleFeedback(e) {
    e.preventDefault();
    setFeedbackError("");
    if (!feedbackKey.trim()) {
      setFeedbackError("Πρέπει να καταχωρήσεις το Κλειδί Download που έχεις πάρει.");
      return;
    }
    if (!feedbackMsg.trim()) {
      setFeedbackError("Πρέπει να γράψεις κάποιο σχόλιο.");
      return;
    }
    setFeedbackSending(true);
    try {
      const res = await fetch("/api/download/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: feedbackMsg.trim(),
          associatedKey: feedbackKey.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedbackError(data.error || "Σφάλμα κατά την αποστολή.");
      } else {
        setFeedbackDone(true);
        setFeedbackMsg("");
      }
    } catch {
      setFeedbackError("Σφάλμα δικτύου.");
    } finally {
      setFeedbackSending(false);
    }
  }

  function resetFeedbackForm() {
    setFeedbackDone(false);
    setFeedbackMsg("");
    // Άφησε το feedbackKey γεμάτο — μπορεί να στείλει και δεύτερο σχόλιο
  }

  const defaultContactMsg = "Για download του Server & του Προγράμματος, παρακαλώ επικοινώνησε με τον Διαχειριστή.";

  return (
    <>
      {TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
        />
      )}

      <Background />

      <main className="relative z-10 min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-6 py-5">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Image src="/logo.png" alt="SMAct" width={44} height={44} className="drop-shadow-lg" />
            <div className="text-left">
              <div className="text-lg font-bold gradient-text">SMAct</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">
                Download Προγράμματος
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm text-slate-300 hover:text-white flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <span>←</span>
            <span>Επιστροφή</span>
          </button>
        </header>

        <div className="flex-1 flex items-start justify-center px-4 pb-12 pt-4">
          <div className="w-full max-w-2xl space-y-5">
            {/* Contact info card */}
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-5 md:p-6 backdrop-blur-md">
              <div className="flex items-start gap-3">
                <span className="text-3xl leading-none">📞</span>
                <div className="flex-1">
                  <h2 className="text-amber-100 font-semibold text-sm md:text-base mb-1">
                    Πώς παίρνεις το κλειδί
                  </h2>
                  <p className="text-amber-100/90 text-sm leading-relaxed">
                    {contactMessage || defaultContactMsg}
                    {contactDetails && (
                      <>
                        {" "}
                        <span className="font-semibold text-amber-200">{contactDetails}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Key entry card */}
            <form
              onSubmit={handleCheck}
              className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 md:p-8 shadow-2xl"
            >
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Καταχώρηση κλειδιού για Download
              </h1>
              <p className="text-slate-400 text-sm mb-6">
                Πληκτρολόγησε το κλειδί που σου έχει δώσει ο Διαχειριστής.
              </p>

              <div className="mb-5">
                <label htmlFor="dlkey" className="block text-sm font-semibold text-slate-200 mb-2">
                  Κλειδί Download <span className="text-red-400">*</span>
                </label>
                <input
                  id="dlkey"
                  type="text"
                  value={downloadKey}
                  onChange={(e) => setDownloadKey(e.target.value)}
                  placeholder="Το κλειδί που έλαβες"
                  className="w-full px-4 py-3 bg-slate-900/70 border border-slate-600 rounded-xl text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-colors"
                  autoComplete="off"
                  spellCheck="false"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Case-sensitive — τα κεφαλαία/μικρά μετράνε.
                </p>
              </div>

              {TURNSTILE_SITE_KEY && (
                <div className="mb-4">
                  <div ref={turnstileCheckRef} className="flex justify-center" />
                </div>
              )}

              <button
                type="submit"
                disabled={checking || !downloadKey.trim()}
                className="w-full px-6 py-4 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white font-semibold text-base shadow-lg shadow-orange-900/50 hover:shadow-xl hover:shadow-orange-900/70 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
              >
                {checking ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Έλεγχος...
                  </span>
                ) : (
                  "Έλεγχος / Καταχώρηση"
                )}
              </button>
            </form>

            {/* Result card */}
            {result && <ResultCard result={result} />}

            {/* Feedback / Bug report card */}
            <form
              onSubmit={handleFeedback}
              className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 md:p-8 shadow-xl"
            >
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <span>💬</span>
                <span>Σχόλια / Αναφορά Bug / Προτάσεις</span>
              </h2>
              <p className="text-slate-400 text-sm mb-5">
                <span className="text-amber-300 font-semibold">Μόνο όσοι έχουν εγκεκριμένο Κλειδί Download</span>{" "}
                μπορούν να στείλουν σχόλια. Καταχώρησε το κλειδί σου + το σχόλιό σου.
              </p>

              {feedbackDone ? (
                <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/40 rounded-lg">
                  <p className="text-emerald-100 text-sm">
                    ✓ Το σχόλιό σου εστάλη. Ευχαριστούμε!
                  </p>
                  <button
                    type="button"
                    onClick={resetFeedbackForm}
                    className="mt-2 text-xs text-emerald-300 hover:text-emerald-100 underline"
                  >
                    Στείλε άλλο σχόλιο
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Κλειδί Download <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={feedbackKey}
                      onChange={(e) => setFeedbackKey(e.target.value)}
                      placeholder="Το εγκεκριμένο κλειδί που έχεις πάρει"
                      className="w-full px-4 py-3 bg-slate-900/70 border border-slate-600 rounded-xl text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-colors"
                      autoComplete="off"
                      spellCheck="false"
                    />
                    <p className="text-xs text-slate-500 mt-1.5">
                      Θα ελεγχθεί από το σύστημα. Χωρίς έγκυρο κλειδί το σχόλιο δεν στέλνεται.
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Το σχόλιό σου <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={feedbackMsg}
                      onChange={(e) => setFeedbackMsg(e.target.value)}
                      rows={5}
                      maxLength={5000}
                      placeholder="Περιέγραψε το bug, την πρότασή σου ή οτιδήποτε θες να μοιραστείς..."
                      className="w-full px-4 py-3 bg-slate-900/70 border border-slate-600 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-colors resize-y"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {feedbackMsg.length}/5000 χαρακτήρες
                    </p>
                  </div>

                  {feedbackError && (
                    <div className="mb-4 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-sm text-red-200">{feedbackError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={feedbackSending || !feedbackMsg.trim() || !feedbackKey.trim()}
                    className="w-full px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {feedbackSending ? "Αποστολή..." : "📤 Αποστολή Σχολίου"}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>

        <footer className="px-6 py-4 text-center text-xs text-slate-500">
          SMAct · Χωρίς αποθήκευση προσωπικών δεδομένων
        </footer>
      </main>
    </>
  );
}

function ResultCard({ result }) {
  if (result.status === "ok") {
    return (
      <div className="bg-emerald-500/10 border-2 border-emerald-500/50 rounded-2xl p-6 md:p-8 shadow-2xl">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-bold text-white text-center mb-2">
          Το κλειδί σου είναι έγκυρο!
        </h3>
        <p className="text-emerald-100/90 text-center text-sm mb-5">
          Πάτα το κουμπί παρακάτω για να ανοίξει το Google Drive όπου βρίσκεται το αρχείο Setup.
        </p>
        <a
          href={result.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-6 py-4 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white font-semibold text-base shadow-lg shadow-emerald-900/50 hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
          ⬇ Λήψη Setup Προγράμματος
        </a>
        <p className="text-xs text-emerald-200/70 text-center mt-3">
          Στο Google Drive πάτα το κουμπί «Λήψη» (⬇) πάνω δεξιά.
          Αν βγει προειδοποίηση «Αδυναμία σάρωσης για ιούς», είναι απλά επειδή το αρχείο είναι μεγάλο —
          πάτα «Λήψη ούτως ή άλλως».
        </p>
      </div>
    );
  }

  const styleMap = {
    pending: {
      border: "border-amber-500/40",
      bg: "bg-amber-500/10",
      icon: "⏳",
      color: "text-amber-100",
      title: "Σε αναμονή έγκρισης",
    },
    used_up: {
      border: "border-slate-500/40",
      bg: "bg-slate-500/10",
      icon: "🔒",
      color: "text-slate-200",
      title: "Το κλειδί έχει χρησιμοποιηθεί",
    },
    rejected: {
      border: "border-red-500/40",
      bg: "bg-red-500/10",
      icon: "❌",
      color: "text-red-100",
      title: "Το κλειδί δεν είναι έγκυρο",
    },
    error: {
      border: "border-red-500/40",
      bg: "bg-red-500/10",
      icon: "⚠️",
      color: "text-red-100",
      title: "Σφάλμα",
    },
  };

  const s = styleMap[result.status] || styleMap.error;

  return (
    <div className={`${s.bg} ${s.border} border-2 rounded-2xl p-6 shadow-xl`}>
      <div className="flex items-start gap-3">
        <span className="text-3xl">{s.icon}</span>
        <div className="flex-1">
          <h3 className={`text-lg font-bold ${s.color} mb-1`}>{s.title}</h3>
          <p className={`text-sm ${s.color} opacity-90`}>
            {result.message || "Δοκίμασε ξανά ή επικοινώνησε με τον Διαχειριστή."}
          </p>
        </div>
      </div>
    </div>
  );
}

function Background() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-slate-900">
      <div className="absolute inset-0 circuit-pattern opacity-70" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-orange-600 blur-[120px] animate-pulse-slow opacity-30 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-20 right-20 w-80 h-80 rounded-full bg-amber-500 blur-[100px] opacity-15 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-red-500 blur-[120px] opacity-10 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
