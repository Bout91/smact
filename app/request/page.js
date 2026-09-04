"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const PICKUP_CODE_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const PICKUP_CODE_LENGTH = 10;

function generateRandomPickupCode() {
  const array = new Uint32Array(PICKUP_CODE_LENGTH);
  crypto.getRandomValues(array);
  let result = "";
  for (let i = 0; i < PICKUP_CODE_LENGTH; i++) {
    result += PICKUP_CODE_CHARS.charAt(array[i] % PICKUP_CODE_CHARS.length);
  }
  return result;
}

export default function RequestPage() {
  const router = useRouter();

  const [machineId, setMachineId] = useState("");
  const [pickupCode, setPickupCode] = useState("");
  const [unit, setUnit] = useState("");
  const [office, setOffice] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  function handleRandomize() {
    setPickupCode(generateRandomPickupCode());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!machineId.trim()) {
      setErrorMsg("Το πεδίο Machine-id είναι υποχρεωτικό.");
      return;
    }
    if (!pickupCode.trim()) {
      setErrorMsg("Το πεδίο Pickup Code είναι υποχρεωτικό.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: machineId.trim(),
          pickupCode: pickupCode.trim(),
          unit: unit.trim(),
          office: office.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(
          data.error || "Σφάλμα κατά την υποβολή. Δοκίμασε ξανά σε λίγο."
        );
        setSubmitting(false);
        return;
      }

      setSubmittedData({
        pickupCode: pickupCode.trim(),
        submittedAt: data.submittedAt,
      });
      setSubmitted(true);
    } catch (err) {
      setErrorMsg("Σφάλμα δικτύου. Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Background />

      <main className="relative z-10 min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-6 py-5">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/logo.png"
              alt="SMAct"
              width={44}
              height={44}
              className="drop-shadow-lg"
            />
            <div className="text-left">
              <div className="text-lg font-bold gradient-text">SMAct</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">
                Activation Service
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
          <div className="w-full max-w-xl">
            {submitted ? (
              <SuccessCard
                pickupCode={submittedData.pickupCode}
                onBackHome={() => router.push("/")}
              />
            ) : (
              <FormCard
                machineId={machineId}
                setMachineId={setMachineId}
                pickupCode={pickupCode}
                setPickupCode={setPickupCode}
                unit={unit}
                setUnit={setUnit}
                office={office}
                setOffice={setOffice}
                onRandomize={handleRandomize}
                onSubmit={handleSubmit}
                submitting={submitting}
                errorMsg={errorMsg}
              />
            )}
          </div>
        </div>

        <footer className="px-6 py-4 text-center text-xs text-slate-500">
          SMAct · Χωρίς αποθήκευση προσωπικών δεδομένων
        </footer>
      </main>
    </>
  );
}

function FormCard({
  machineId,
  setMachineId,
  pickupCode,
  setPickupCode,
  unit,
  setUnit,
  office,
  setOffice,
  onRandomize,
  onSubmit,
  submitting,
  errorMsg,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 md:p-8 shadow-2xl"
    >
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
        Αίτημα Κωδικού Ενεργοποίησης
      </h1>
      <p className="text-slate-400 text-sm mb-6">
        Συμπλήρωσε τα παρακάτω πεδία για να υποβάλλεις αίτηση.
      </p>

      <div className="mb-5">
        <label
          htmlFor="machineId"
          className="block text-sm font-semibold text-slate-200 mb-2"
        >
          Machine-id <span className="text-red-400">*</span>
        </label>
        <input
          id="machineId"
          type="text"
          value={machineId}
          onChange={(e) => setMachineId(e.target.value)}
          placeholder="π.χ. 49408922-6ea1-488f-8293-6d37cdb97a2d"
          className="w-full px-4 py-3 bg-slate-900/70 border border-slate-600 rounded-xl text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-colors"
          autoComplete="off"
          spellCheck="false"
        />
        <p className="text-xs text-slate-500 mt-1.5">
          Αντίγραψέ το από το Service Manager Pro (Διαχείριση Srv Manager →
          Machine ID).
        </p>
      </div>

      <div className="mb-3">
        <label
          htmlFor="pickupCode"
          className="block text-sm font-semibold text-slate-200 mb-2"
        >
          Pickup Code <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            id="pickupCode"
            type="text"
            value={pickupCode}
            onChange={(e) => setPickupCode(e.target.value)}
            placeholder="Δικός σου κωδικός ή πάτα το 🎲"
            className="w-full px-4 py-3 pr-14 bg-slate-900/70 border border-slate-600 rounded-xl text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-colors"
            autoComplete="off"
            spellCheck="false"
          />
          <button
            type="button"
            onClick={onRandomize}
            title="Δημιουργία τυχαίου Pickup Code (10 χαρακτήρες)"
            aria-label="Δημιουργία τυχαίου κωδικού"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg text-2xl hover:bg-slate-700/60 active:scale-95 transition-all"
          >
            🎲
          </button>
        </div>
      </div>

      <div className="mb-5 flex items-start gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <span className="text-amber-400 text-lg leading-none mt-0.5">⚠️</span>
        <p className="text-sm text-amber-100/90 leading-snug">
          <span className="font-semibold">Φύλαξε το</span> — ώστε να μπορείς να
          αναζητήσεις την Αίτηση σου!
        </p>
      </div>

      <div className="mb-5">
        <label
          htmlFor="unit"
          className="block text-sm font-semibold text-slate-200 mb-2"
        >
          Μονάδα{" "}
          <span className="text-slate-500 font-normal text-xs">
            (προαιρετικό)
          </span>
        </label>
        <input
          id="unit"
          type="text"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="π.χ. 15 ΛΔΒ"
          className="w-full px-4 py-3 bg-slate-900/70 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-colors"
          autoComplete="off"
        />
      </div>

      <div className="mb-6">
        <label
          htmlFor="office"
          className="block text-sm font-semibold text-slate-200 mb-2"
        >
          Γραφείο{" "}
          <span className="text-slate-500 font-normal text-xs">
            (προαιρετικό)
          </span>
        </label>
        <input
          id="office"
          type="text"
          value={office}
          onChange={(e) => setOffice(e.target.value)}
          placeholder="π.χ. 1ο Γραφείο"
          className="w-full px-4 py-3 bg-slate-900/70 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-colors"
          autoComplete="off"
        />
      </div>

      {errorMsg && (
        <div className="mb-4 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-200">{errorMsg}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-6 py-4 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold text-base shadow-lg shadow-blue-900/50 hover:shadow-xl hover:shadow-blue-900/70 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Υποβολή...
          </span>
        ) : (
          "Υποβολή Αίτησης"
        )}
      </button>
    </form>
  );
}

function SuccessCard({ pickupCode, onBackHome }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pickupCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="bg-slate-800/60 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-6 md:p-8 shadow-2xl">
      <div className="flex justify-center mb-4">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400/60 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-emerald-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-white text-center mb-2">
        Η αίτησή σου καταχωρήθηκε
      </h1>
      <p className="text-slate-300 text-center text-sm mb-6">
        Θα ειδοποιηθώ αμέσως και θα ετοιμάσω το κλειδί ενεργοποίησης.
      </p>

      <div className="mb-5">
        <div className="text-xs uppercase tracking-widest text-slate-400 mb-2 text-center">
          Το Pickup Code σου
        </div>
        <div className="flex items-center justify-center gap-2 bg-slate-900/70 border border-cyan-500/40 rounded-xl px-4 py-4">
          <code className="text-xl md:text-2xl font-mono font-bold gradient-text tracking-wider break-all text-center">
            {pickupCode}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            title="Αντιγραφή"
            className="ml-2 shrink-0 px-3 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-sm transition-colors"
          >
            {copied ? "✓" : "📋"}
          </button>
        </div>
      </div>

      <div className="mb-6 flex items-start gap-2 px-3 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <span className="text-amber-400 text-lg leading-none mt-0.5">⚠️</span>
        <p className="text-sm text-amber-100/90 leading-snug">
          <span className="font-semibold">Φύλαξε το Pickup Code σου</span> —
          ώστε να μπορείς να αναζητήσεις την Αίτηση σου! Δεν υπάρχει τρόπος
          ανάκτησης αν το χάσεις.
        </p>
      </div>

      <div className="mb-6 bg-slate-900/40 border border-slate-700/50 rounded-lg p-4">
        <div className="text-xs uppercase tracking-widest text-cyan-400 mb-2 font-semibold">
          Τι κάνεις τώρα
        </div>
        <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
          <li>Περίμενε λίγες ώρες να ετοιμαστεί το κλειδί σου.</li>
          <li>
            Επίστρεψε εδώ και πάτα{" "}
            <span className="text-cyan-300 font-semibold">
              Αναζήτηση Αίτησης
            </span>
            .
          </li>
          <li>
            Χρησιμοποίησε το Pickup Code σου για να κατεβάσεις το αρχείο{" "}
            <code className="text-cyan-300 font-mono text-xs">.txt</code>.
          </li>
        </ol>
      </div>

      <button
        type="button"
        onClick={onBackHome}
        className="w-full px-6 py-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-white font-semibold transition-colors"
      >
        Επιστροφή στην αρχική
      </button>
    </div>
  );
}

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
