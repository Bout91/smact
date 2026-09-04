"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Έλεγχος αν είσαι logged in: κάνουμε ένα προσποιητό GET στο /api/admin/list
// (αν πάρουμε 401, δείχνουμε login form)
async function checkAuth() {
  try {
    const res = await fetch("/api/admin/list?status=pending", {
      credentials: "include",
    });
    return res.status !== 401;
  } catch {
    return false;
  }
}

export default function AdminPage() {
  const [authState, setAuthState] = useState("checking");
  // authState: "checking" | "unauthed" | "authed"

  useEffect(() => {
    checkAuth().then((ok) => setAuthState(ok ? "authed" : "unauthed"));
  }, []);

  return (
    <>
      <Background />
      {authState === "checking" && <LoadingScreen />}
      {authState === "unauthed" && (
        <LoginScreen onSuccess={() => setAuthState("authed")} />
      )}
      {authState === "authed" && (
        <AdminDashboard onLogout={() => setAuthState("unauthed")} />
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   LOADING
   ───────────────────────────────────────────────────────── */
function LoadingScreen() {
  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center">
      <div className="text-slate-400 text-sm">Έλεγχος πρόσβασης...</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   LOGIN
   ───────────────────────────────────────────────────────── */
function LoginScreen({ onSuccess }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    if (!password) {
      setErrorMsg("Πληκτρολόγησε το password.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || "Λάθος password.");
        setSubmitting(false);
        return;
      }
      onSuccess();
    } catch {
      setErrorMsg("Σφάλμα δικτύου.");
      setSubmitting(false);
    }
  }

  return (
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
              Admin Panel
            </div>
          </div>
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          <form
            onSubmit={handleSubmit}
            className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 md:p-8 shadow-2xl"
          >
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 border-2 border-cyan-400/40 flex items-center justify-center">
                <span className="text-3xl">🔒</span>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white text-center mb-2">
              Admin Login
            </h1>
            <p className="text-slate-400 text-center text-sm mb-6">
              Πρόσβαση μόνο για διαχειριστή.
            </p>

            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-200 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-slate-900/70 border border-slate-600 rounded-xl text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-colors"
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
              className="w-full px-6 py-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-semibold shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? "Έλεγχος..." : "Σύνδεση"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

/* ─────────────────────────────────────────────────────────
   ADMIN DASHBOARD
   ───────────────────────────────────────────────────────── */
function AdminDashboard({ onLogout }) {
  const router = useRouter();
  const [tab, setTab] = useState("pending"); // "pending" | "ready"
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, ready: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [approveTarget, setApproveTarget] = useState(null); // request object
  const [deleteTarget, setDeleteTarget] = useState(null); // request object

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/admin/list?status=${tab}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Σφάλμα κατά τη φόρτωση.");
        setLoading(false);
        return;
      }
      setRequests(data.requests || []);
      setCounts(data.counts || { pending: 0, ready: 0 });
    } catch {
      setErrorMsg("Σφάλμα δικτύου.");
    } finally {
      setLoading(false);
    }
  }, [tab, onLogout]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    onLogout();
  }

  async function handleApproveConfirm(activationKey) {
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: approveTarget.id,
          activationKey,
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Σφάλμα κατά την έγκριση.");
        return;
      }
      setApproveTarget(null);
      await loadRequests();
    } catch {
      alert("Σφάλμα δικτύου.");
    }
  }

  async function handleDeleteConfirm() {
    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Σφάλμα κατά τη διαγραφή.");
        return;
      }
      setDeleteTarget(null);
      await loadRequests();
    } catch {
      alert("Σφάλμα δικτύου.");
    }
  }

  return (
    <>
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
                Admin Panel
              </div>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadRequests}
              title="Ανανέωση"
              className="px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-sm transition-colors"
            >
              ↻ Ανανέωση
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-sm transition-colors"
            >
              Αποσύνδεση
            </button>
          </div>
        </header>

        <div className="px-4 md:px-6 pb-12 max-w-4xl mx-auto w-full">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-slate-700/50">
            <TabButton
              active={tab === "pending"}
              onClick={() => setTab("pending")}
            >
              ⏳ Εκκρεμείς ({counts.pending})
            </TabButton>
            <TabButton
              active={tab === "ready"}
              onClick={() => setTab("ready")}
            >
              ✅ Ολοκληρωμένες ({counts.ready})
            </TabButton>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center text-slate-400 py-12">Φόρτωση...</div>
          ) : errorMsg ? (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200 text-sm">
              {errorMsg}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center text-slate-400 py-12">
              {tab === "pending"
                ? "Καμία εκκρεμής αίτηση."
                : "Καμία ολοκληρωμένη αίτηση."}
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  onApprove={() => setApproveTarget(r)}
                  onDelete={() => setDeleteTarget(r)}
                />
              ))}
            </div>
          )}
        </div>

        <footer className="px-6 py-4 text-center text-xs text-slate-500">
          SMAct Admin · {counts.pending + counts.ready} συνολικές αιτήσεις
        </footer>
      </main>

      {approveTarget && (
        <ApproveModal
          request={approveTarget}
          onClose={() => setApproveTarget(null)}
          onConfirm={handleApproveConfirm}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          request={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
        active
          ? "text-cyan-300 border-cyan-400"
          : "text-slate-400 border-transparent hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────
   REQUEST CARD
   ───────────────────────────────────────────────────────── */
function RequestCard({ request, onApprove, onDelete }) {
  const [copied, setCopied] = useState(false);

  const submittedAt = new Date(request.submittedAt).toLocaleString("el-GR");
  const readyAt = request.readyAt
    ? new Date(request.readyAt).toLocaleString("el-GR")
    : null;

  async function handleCopyMachineId() {
    try {
      await navigator.clipboard.writeText(request.machineId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  const isReady = request.status === "ready";

  return (
    <div
      className={`bg-slate-800/60 backdrop-blur-sm border rounded-xl p-4 md:p-5 ${
        isReady ? "border-emerald-500/30" : "border-amber-500/30"
      }`}
    >
      {/* Top row: status + date */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
            isReady
              ? "bg-emerald-500/20 text-emerald-200"
              : "bg-amber-500/20 text-amber-200"
          }`}
        >
          {isReady ? "✅ Ολοκληρωμένη" : "⏳ Εκκρεμής"}
        </span>
        <div className="text-xs text-slate-400 text-right">
          <div>Υποβλήθηκε: {submittedAt}</div>
          {readyAt && <div>Ετοιμάστηκε: {readyAt}</div>}
        </div>
      </div>

      {/* Machine ID (with copy button) */}
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
          Machine ID
        </div>
        <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2">
          <code className="flex-1 text-cyan-100 font-mono text-sm break-all">
            {request.machineId}
          </code>
          <button
            type="button"
            onClick={handleCopyMachineId}
            title="Αντιγραφή για να το βάλεις στο SM Key Signer"
            className="shrink-0 px-3 py-1.5 rounded-md bg-slate-700/70 hover:bg-slate-700 text-slate-100 text-xs font-semibold transition-colors flex items-center gap-1"
          >
            {copied ? (
              <>
                <span>✓</span>
                <span>OK</span>
              </>
            ) : (
              <>
                <span>📋</span>
                <span>Αντιγραφή</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pickup / unit / office */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
            Pickup Code
          </div>
          <div className="text-slate-200 font-mono text-sm">
            {request.pickupCode}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
            Μονάδα
          </div>
          <div className="text-slate-200 text-sm">
            {request.unit || <span className="text-slate-600">—</span>}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
            Γραφείο
          </div>
          <div className="text-slate-200 text-sm">
            {request.office || <span className="text-slate-600">—</span>}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        {!isReady && (
          <button
            type="button"
            onClick={onApprove}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-semibold text-sm shadow hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            ✓ Έγκριση
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className={`${
            isReady ? "flex-1" : ""
          } px-4 py-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-semibold text-sm transition-colors`}
        >
          🗑 Διαγραφή
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   APPROVE MODAL — paste key ή upload .txt
   ───────────────────────────────────────────────────────── */
function ApproveModal({ request, onClose, onConfirm }) {
  const [activationKey, setActivationKey] = useState("");
  const [fileError, setFileError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function extractKey(text) {
    // Ψάχνει "Activation Key:" (case-insensitive), παίρνει το base64 μετά
    const match = text.match(
      /Activation\s*Key\s*[:=]\s*([A-Za-z0-9+/=]+)/i
    );
    if (match) return match[1].trim();
    // Fallback: αν το αρχείο είναι σκέτο κλειδί
    const trimmed = text.trim();
    if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 20) {
      return trimmed;
    }
    return null;
  }

  async function handleFileChange(e) {
    setFileError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024) {
      setFileError("Το αρχείο είναι πολύ μεγάλο (>100KB).");
      return;
    }
    try {
      const text = await file.text();
      const key = extractKey(text);
      if (!key) {
        setFileError(
          "Δεν βρέθηκε Activation Key μέσα στο αρχείο. Βεβαιώσου ότι είναι το σωστό .txt."
        );
        return;
      }
      setActivationKey(key);
    } catch {
      setFileError("Δεν μπόρεσα να διαβάσω το αρχείο.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!activationKey.trim()) return;
    setSubmitting(true);
    await onConfirm(activationKey.trim());
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Έγκριση Αίτησης</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="mb-4 bg-slate-900/60 border border-slate-700 rounded-lg p-3 text-sm">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">
            Pickup Code
          </div>
          <div className="text-cyan-200 font-mono">{request.pickupCode}</div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* File upload */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Επιλογή 1: Ανέβασε το .txt από το SM Key Signer
            </label>
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={handleFileChange}
              className="w-full text-sm text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:text-cyan-200 file:font-semibold hover:file:bg-cyan-500/30 file:cursor-pointer cursor-pointer"
            />
            {fileError && (
              <p className="text-xs text-red-300 mt-1.5">{fileError}</p>
            )}
          </div>

          <div className="my-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500 uppercase tracking-widest">
              ή
            </span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Paste key */}
          <div className="mb-5">
            <label
              htmlFor="key"
              className="block text-sm font-semibold text-slate-200 mb-2"
            >
              Επιλογή 2: Επικόλλησε το κλειδί
            </label>
            <textarea
              id="key"
              value={activationKey}
              onChange={(e) => setActivationKey(e.target.value)}
              placeholder="Base64 κλειδί από SM Key Signer..."
              rows={4}
              className="w-full px-3 py-2 bg-slate-900/70 border border-slate-600 rounded-lg text-cyan-100 font-mono text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
              spellCheck="false"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Αν ανέβασες αρχείο, το κλειδί έχει εξαχθεί αυτόματα εδώ.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-white font-semibold text-sm transition-colors"
            >
              Άκυρο
            </button>
            <button
              type="submit"
              disabled={submitting || !activationKey.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? "Έγκριση..." : "Έγκριση"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   DELETE CONFIRMATION MODAL
   ───────────────────────────────────────────────────────── */
function DeleteModal({ request, onClose, onConfirm }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    await onConfirm();
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-800 border border-red-500/40 rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-red-500/20 border-2 border-red-400/60 flex items-center justify-center">
            <span className="text-2xl">🗑</span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-2">
          Διαγραφή Αίτησης;
        </h2>
        <p className="text-slate-300 text-center text-sm mb-4">
          Η αίτηση με Pickup Code{" "}
          <span className="text-cyan-200 font-mono font-semibold">
            {request.pickupCode}
          </span>{" "}
          θα διαγραφεί μόνιμα.
        </p>
        <p className="text-red-300 text-center text-xs mb-6">
          Δεν μπορεί να αναιρεθεί!
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-white font-semibold text-sm transition-colors"
          >
            Άκυρο
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm disabled:opacity-50 transition-all"
          >
            {submitting ? "Διαγραφή..." : "Διαγραφή"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   BACKGROUND (ίδιο)
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
