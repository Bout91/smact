"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SearchPage() {
  const router = useRouter();

  const [pickupCode, setPickupCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    setErrorMsg("");
    setResult(null);

    if (!pickupCode.trim()) {
      setErrorMsg("Πληκτρολόγησε το Pickup Code σου για αναζήτηση.");
      return;
    }

    setSearching(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickupCode: pickupCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(
          data.error || "Σφάλμα κατά την αναζήτηση. Δοκίμασε ξανά σε λίγο."
        );
        setSearching(false);
        return;
      }

      setResult({ ...data, pickupCode: pickupCode.trim() });
    } catch (err) {
      setErrorMsg("Σφάλμα δικτύου. Έλεγξε τη σύνδεσή σου και δοκίμασε ξανά.");
    } finally {
      setSearching(false);
    }
  }

  function handleReset() {
    setResult(null);
    setPickupCode("");
    setErrorMsg("");
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
            {!result ? (
              <SearchCard
                pickupCode={pickupCode}
                setPickupCode={setPickupCode}
                onSearch={handleSearch}
                searching={searching}
                errorMsg={errorMsg}
              />
            ) : result.status === "ready" ? (
              <ReadyCard result={result} onReset={handleReset} />
            ) : result.status === "pending" ? (
              <PendingCard result={result} onReset={handleReset} />
            ) : (
              <NotFoundCard result={result} onReset={handleReset} />
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

function SearchCard({
  pickupCode,
  setPickupCode,
  onSearch,
  searching,
  errorMsg,
}) {
  return (
    <form
      onSubmit={onSearch}
      className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 md:p-8 shadow-2xl"
    >
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
        Αναζήτηση Αίτησης
      </h1>
      <p className="text-slate-400 text-sm mb-6">
        Πληκτρολόγησε το Pickup Code που είχες επιλέξει όταν υπέβαλλες την
        αίτηση.
      </p>

      <div className="mb-5">
        <label
          htmlFor="pickupCode"
          className="block text-sm font-semibold text-slate-200 mb-2"
        >
          Pickup Code <span className="text-red-400">*</span>
        </label>
        <input
          id="pickupCode"
          type="text"
          value={pickupCode}
          onChange={(e) => setPickupCode(e.target.value)}
          placeholder="Το Pickup Code σου"
          className="w-full px-4 py-3 bg-slate-900/70 border border-slate-600 rounded-xl text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-colors"
          autoComplete="off"
          spellCheck="false"
          autoFocus
        />
        <p className="text-xs text-slate-500 mt-1.5">
          Το Pickup Code είναι case-sensitive (τα κεφαλαία/μικρά μετράνε).
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-200">{errorMsg}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={searching}
        className="w-full px-6 py-4 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-semibold text-base shadow-lg shadow-cyan-900/50 hover:shadow-xl hover:shadow-cyan-900/70 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
      >
        {searching ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Αναζήτηση...
          </span>
        ) : (
          "Αναζήτηση Αίτησης"
        )}
      </button>
    </form>
  );
}

function ReadyCard({ result, onReset }) {
  const [copied, setCopied] = useState(false);

  const readyAt = result.readyAt
    ? new Date(result.readyAt).toLocaleString("el-GR")
    : "";

  const fileContent = buildActivationFileContent({
    machineId: result.machineId,
    pickupCode: result.pickupCode,
    activationKey: result.activationKey,
    readyAt: result.readyAt,
  });

  async function handleCopyKey() {
    try {
      await navigator.clipboard.writeText(result.activationKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function handleDownload() {
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smact-activation-${result.pickupCode}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        Το κλειδί σου είναι έτοιμο!
      </h1>
      {readyAt && (
        <p className="text-slate-400 text-center text-sm mb-6">
          Ετοιμάστηκε στις: <span className="text-slate-200">{readyAt}</span>
        </p>
      )}

      <button
        type="button"
        onClick={handleDownload}
        className="w-full mb-4 px-6 py-4 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold text-base shadow-lg shadow-blue-900/50 hover:shadow-xl hover:shadow-blue-900/70 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
      >
        <span className="flex items-center justify-center gap-3">
          <span className="text-2xl">⬇</span>
          <span>Κατέβασε το αρχείο ενεργοποίησης</span>
        </span>
      </button>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
            Ή αντίγραψε το κλειδί απευθείας
          </div>
          <button
            type="button"
            onClick={handleCopyKey}
            className="px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <span>✓</span>
                <span>Αντιγράφηκε</span>
              </>
            ) : (
              <>
                <span>📋</span>
                <span>Αντιγραφή</span>
              </>
            )}
          </button>
        </div>
        <textarea
          readOnly
          value={result.activationKey || ""}
          onFocus={(e) => e.target.select()}
          className="w-full h-28 px-3 py-2.5 bg-slate-900/70 border border-cyan-500/40 rounded-lg text-cyan-100 font-mono text-xs resize-none focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
        />
      </div>

      <div className="mb-6 bg-slate-900/40 border border-slate-700/50 rounded-lg p-4">
        <div className="text-xs uppercase tracking-widest text-cyan-400 mb-2 font-semibold">
          Οδηγίες ενεργοποίησης
        </div>
        <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
          <li>Άνοιξε το Service Manager Pro στον υπολογιστή σου.</li>
          <li>
            Πήγαινε στη{" "}
            <span className="text-cyan-300">Διαχείριση Srv Manager</span>.
          </li>
          <li>
            Στο πεδίο «Επικόλλησε το κλειδί ενεργοποίησης εδώ...» κάνε paste το
            κλειδί (ή άνοιξε το .txt με σημειωματάριο και αντίγραψέ το).
          </li>
          <li>Πάτα «Ενεργοποίηση». Τέλος!</li>
        </ol>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="w-full px-6 py-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-white font-semibold transition-colors"
      >
        Νέα αναζήτηση
      </button>
    </div>
  );
}

function PendingCard({ result, onReset }) {
  const submittedAt = result.submittedAt
    ? new Date(result.submittedAt).toLocaleString("el-GR")
    : "";

  return (
    <div className="bg-slate-800/60 backdrop-blur-md border border-amber-500/30 rounded-2xl p-6 md:p-8 shadow-2xl">
      <div className="flex justify-center mb-4">
        <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400/60 flex items-center justify-center">
          <span className="text-4xl">⏳</span>
        </div>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-white text-center mb-2">
        Η αίτησή σου εκκρεμεί
      </h1>
      <p className="text-slate-300 text-center text-sm mb-6">
        Το κλειδί σου δεν έχει ετοιμαστεί ακόμα.
      </p>

      {submittedAt && (
        <div className="mb-5 bg-slate-900/40 border border-slate-700/50 rounded-lg p-4 text-center">
          <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">
            Υποβλήθηκε
          </div>
          <div className="text-slate-100 text-sm">{submittedAt}</div>
        </div>
      )}

      <div className="mb-6 flex items-start gap-2 px-3 py-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
        <span className="text-cyan-400 text-lg leading-none mt-0.5">ℹ️</span>
        <p className="text-sm text-cyan-100/90 leading-snug">
          Ο διαχειριστής θα ετοιμάσει το κλειδί σύντομα. Δοκίμασε ξανά σε
          λίγες ώρες.
        </p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="w-full px-6 py-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-white font-semibold transition-colors"
      >
        Νέα αναζήτηση
      </button>
    </div>
  );
}

function NotFoundCard({ result, onReset }) {
  const router = useRouter();

  return (
    <div className="bg-slate-800/60 backdrop-blur-md border border-red-500/30 rounded-2xl p-6 md:p-8 shadow-2xl">
      <div className="flex justify-center mb-4">
        <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-400/60 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-red-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-white text-center mb-2">
        Δεν βρέθηκε αίτηση
      </h1>
      <p className="text-slate-300 text-center text-sm mb-6">
        Δεν υπάρχει αίτηση με αυτό το Pickup Code.
      </p>

      <div className="mb-6 bg-slate-900/40 border border-slate-700/50 rounded-lg p-4">
        <div className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-semibold">
          Πιθανές αιτίες
        </div>
        <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
          <li>Έγραψες λάθος τους χαρακτήρες (κεφαλαία/μικρά μετράνε).</li>
          <li>Δεν έχεις υποβάλλει αίτηση ακόμα.</li>
          <li>Η αίτησή σου έχει περάσει τις 30 ημέρες και έχει διαγραφεί.</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onReset}
          className="flex-1 px-6 py-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-white font-semibold transition-colors"
        >
          Δοκίμασε ξανά
        </button>
        <button
          type="button"
          onClick={() => router.push("/request")}
          className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold transition-colors"
        >
          Νέα αίτηση
        </button>
      </div>
    </div>
  );
}

function buildActivationFileContent({
  machineId,
  pickupCode,
  activationKey,
  readyAt,
}) {
  const dateStr = readyAt
    ? new Date(readyAt).toLocaleString("el-GR")
    : new Date().toLocaleString("el-GR");
  return [
    "=== SMAct Activation File ===",
    "",
    `Machine ID: ${machineId || "(unknown)"}`,
    `Pickup Code: ${pickupCode || "(unknown)"}`,
    `Activation Key: ${activationKey || ""}`,
    "",
    `Ετοιμάστηκε: ${dateStr}`,
    "",
    "Οδηγίες: Ανοίξτε το Service Manager Pro,",
    "πηγαίνετε στη Διαχείριση Srv Manager,",
    "και επικολλήστε το Activation Key στο πεδίο ενεργοποίησης.",
    "",
  ].join("\n");
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
