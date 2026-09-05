"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MENU_STRUCTURE, featureKey } from "../lib/menu-structure";

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

function LoadingScreen() {
  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center">
      <div className="text-slate-400 text-sm">Έλεγχος πρόσβασης...</div>
    </div>
  );
}

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

function AdminDashboard({ onLogout }) {
  const router = useRouter();
  const [tab, setTab] = useState("pending"); // "pending" | "ready" | "history"
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, ready: 0, history: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // approveTarget: { request, machine } — approve modal για ΕΝΑ machine
  const [approveTarget, setApproveTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState(new Set());

  const loadRequests = useCallback(async () => {
    // Στο showcase tab δεν φορτώνουμε αιτήσεις
    if (tab === "showcase") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setSelectedIds(new Set());
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
      setCounts(data.counts || { pending: 0, ready: 0, history: 0 });
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
          requestId: approveTarget.request.id,
          machineRowId: approveTarget.machine.id,
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

  async function handleCleanupConfirm() {
    try {
      const res = await fetch("/api/admin/cleanup", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Σφάλμα κατά τον καθαρισμό.");
        return;
      }
      setCleanupOpen(false);
      const messages = [];
      if (data.deletedPending > 0)
        messages.push(
          `Διαγράφηκαν ${data.deletedPending} εκκρεμείς αιτήσεις.`
        );
      if (data.hiddenReady > 0)
        messages.push(
          `Αποσύρθηκαν ${data.hiddenReady} ολοκληρωμένες από το tab (παραμένουν στο Ιστορικό).`
        );
      alert(
        messages.length > 0
          ? messages.join("\n")
          : "Δεν βρέθηκαν αιτήσεις παλαιότερες των 30 ημερών."
      );
      await loadRequests();
    } catch {
      alert("Σφάλμα δικτύου.");
    }
  }

  async function handleBulkDeleteConfirm() {
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch("/api/admin/delete-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Σφάλμα κατά τη διαγραφή.");
        return;
      }
      setBulkDeleteOpen(false);
      alert(
        `Διαγράφηκαν ${data.deleted} αιτήσ${
          data.deleted === 1 ? "η" : "εις"
        } από το Ιστορικό.`
      );
      await loadRequests();
    } catch {
      alert("Σφάλμα δικτύου.");
    }
  }

  const isHistory = tab === "history";
  const allVisibleIds = useMemo(() => requests.map((r) => r.id), [requests]);
  const allSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedIds.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisibleIds));
    }
  }

  function toggleOne(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  return (
    <>
      <main className="relative z-10 min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-6 py-5 flex-wrap gap-3">
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

          <div className="flex items-center gap-2 flex-wrap">
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
              onClick={() => setCleanupOpen(true)}
              title="Καθαρισμός αιτήσεων παλαιότερων των 30 ημερών"
              className="px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-sm transition-colors"
            >
              🗓 Καθαρισμός
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
          <div className="flex gap-2 mb-6 border-b border-slate-700/50 flex-wrap">
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
            <TabButton
              active={tab === "history"}
              onClick={() => setTab("history")}
            >
              📚 Ιστορικό ({counts.history})
            </TabButton>
            <TabButton
              active={tab === "showcase"}
              onClick={() => setTab("showcase")}
            >
              📋 Ξενάγηση
            </TabButton>
          </div>

          {tab === "showcase" ? (
            <ShowcaseAdminPanel onUnauthorized={onLogout} />
          ) : (
            <>
              {isHistory && requests.length > 0 && (
                <div className="mb-4 flex items-center justify-between gap-3 flex-wrap px-3 py-2.5 bg-slate-800/40 border border-slate-700/40 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-200 select-none">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 accent-cyan-500 cursor-pointer"
                    />
                    <span>
                      {allSelected ? "Απεπιλογή όλων" : "Επιλογή όλων"}
                    </span>
                    <span className="text-slate-400">
                      ({selectedIds.size} επιλεγμένες)
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setBulkDeleteOpen(true)}
                    disabled={selectedIds.size === 0}
                    className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    🗑 Διαγραφή επιλεγμένων
                  </button>
                </div>
              )}

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
                    : tab === "ready"
                      ? "Καμία ολοκληρωμένη αίτηση."
                      : "Το Ιστορικό είναι άδειο."}
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((r) => (
                    <RequestCard
                      key={r.id}
                      request={r}
                      onApproveMachine={(machine) =>
                        setApproveTarget({ request: r, machine })
                      }
                      onDelete={() => setDeleteTarget(r)}
                      showCheckbox={isHistory}
                      checked={selectedIds.has(r.id)}
                      onToggleCheck={() => toggleOne(r.id)}
                      hideActions={isHistory}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <footer className="px-6 py-4 text-center text-xs text-slate-500">
          SMAct Admin · Ιστορικό {counts.history} αιτήσεις · Auto-cleanup 30
          ημερών
        </footer>
      </main>

      {approveTarget && (
        <ApproveModal
          request={approveTarget.request}
          machine={approveTarget.machine}
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

      {cleanupOpen && (
        <CleanupModal
          onClose={() => setCleanupOpen(false)}
          onConfirm={handleCleanupConfirm}
        />
      )}

      {bulkDeleteOpen && (
        <BulkDeleteModal
          count={selectedIds.size}
          onClose={() => setBulkDeleteOpen(false)}
          onConfirm={handleBulkDeleteConfirm}
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

function RequestCard({
  request,
  onApproveMachine,
  onDelete,
  showCheckbox,
  checked,
  onToggleCheck,
  hideActions,
}) {
  const submittedAt = new Date(request.submittedAt).toLocaleString("el-GR");
  const readyAt = request.readyAt
    ? new Date(request.readyAt).toLocaleString("el-GR")
    : null;

  const isReady = request.status === "ready";
  const machines = request.machines || [];
  const total = request.totalMachines ?? machines.length;
  const approved = request.approvedMachines ?? 0;
  const isPartial = !isReady && approved > 0;

  return (
    <div
      className={`bg-slate-800/60 backdrop-blur-sm border rounded-xl p-4 md:p-5 flex gap-3 ${
        isReady
          ? "border-emerald-500/30"
          : isPartial
            ? "border-cyan-500/30"
            : "border-amber-500/30"
      } ${checked ? "ring-2 ring-cyan-500/40" : ""}`}
    >
      {showCheckbox && (
        <div className="flex-shrink-0 pt-1">
          <input
            type="checkbox"
            checked={!!checked}
            onChange={onToggleCheck}
            className="w-5 h-5 accent-cyan-500 cursor-pointer"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                isReady
                  ? "bg-emerald-500/20 text-emerald-200"
                  : isPartial
                    ? "bg-cyan-500/20 text-cyan-200"
                    : "bg-amber-500/20 text-amber-200"
              }`}
            >
              {isReady
                ? "✅ Ολοκληρωμένη"
                : isPartial
                  ? "⏳ Μερική"
                  : "⏳ Εκκρεμής"}
            </span>
            <span className="text-xs text-slate-300 font-mono bg-slate-900/60 px-2 py-1 rounded-md">
              {approved} / {total} machine-ids
            </span>
          </div>
          <div className="text-xs text-slate-400 text-right">
            <div>Υποβλήθηκε: {submittedAt}</div>
            {readyAt && <div>Ετοιμάστηκε: {readyAt}</div>}
          </div>
        </div>

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

        {/* Machines list */}
        <div className="space-y-2 mb-4">
          {machines.map((m, idx) => (
            <MachineRow
              key={m.id}
              index={idx}
              machine={m}
              onApprove={() => onApproveMachine(m)}
              hideActions={hideActions}
            />
          ))}
        </div>

        {!hideActions && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onDelete}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-semibold text-sm transition-colors"
            >
              🗑 Διαγραφή αίτησης
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MachineRow({ index, machine, onApprove, hideActions }) {
  const [copied, setCopied] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const isReady = !!machine.activationKey;

  async function handleCopyMachineId() {
    try {
      await navigator.clipboard.writeText(machine.machineId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function handleCopyKey() {
    try {
      await navigator.clipboard.writeText(machine.activationKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {}
  }

  return (
    <div
      className={`rounded-lg border p-3 ${
        isReady
          ? "bg-emerald-500/5 border-emerald-500/20"
          : "bg-slate-900/40 border-slate-700/50"
      }`}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs text-slate-500 font-mono">#{index + 1}</span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
            isReady
              ? "bg-emerald-500/20 text-emerald-200"
              : "bg-amber-500/20 text-amber-200"
          }`}
        >
          {isReady ? "✅ Έτοιμο" : "⏳ Εκκρεμεί"}
        </span>
      </div>

      <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-700 rounded-md px-2.5 py-1.5 mb-2">
        <code className="flex-1 text-cyan-100 font-mono text-xs break-all">
          {machine.machineId}
        </code>
        <button
          type="button"
          onClick={handleCopyMachineId}
          title="Αντιγραφή Machine-id για SM Key Signer"
          className="shrink-0 px-2 py-1 rounded bg-slate-700/70 hover:bg-slate-700 text-slate-100 text-[10px] font-semibold transition-colors flex items-center gap-1"
        >
          {copied ? (
            <>
              <span>✓</span>
              <span>OK</span>
            </>
          ) : (
            <>
              <span>📋</span>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {isReady && (
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 flex items-center justify-between">
            <span>Activation Key</span>
            <button
              type="button"
              onClick={handleCopyKey}
              className="px-2 py-0.5 rounded bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold transition-colors"
            >
              {copiedKey ? "✓ OK" : "📋 Copy"}
            </button>
          </div>
          <div className="text-cyan-100 font-mono text-[10px] bg-slate-950/60 border border-emerald-500/30 rounded px-2 py-1 break-all max-h-16 overflow-y-auto">
            {machine.activationKey}
          </div>
        </div>
      )}

      {!hideActions && (
        <button
          type="button"
          onClick={onApprove}
          className={`w-full px-3 py-1.5 rounded-md font-semibold text-xs transition-all ${
            isReady
              ? "bg-slate-700/60 hover:bg-slate-700 text-slate-200"
              : "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white hover:scale-[1.01] active:scale-[0.99] shadow"
          }`}
        >
          {isReady ? "↻ Αντικατάσταση κλειδιού" : "✓ Έγκριση αυτού"}
        </button>
      )}
    </div>
  );
}

function ApproveModal({ request, machine, onClose, onConfirm }) {
  const [activationKey, setActivationKey] = useState("");
  const [fileError, setFileError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function extractKey(text) {
    const match = text.match(
      /Activation\s*Key\s*[:=]\s*([A-Za-z0-9+/=]+)/i
    );
    if (match) return match[1].trim();
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
          <h2 className="text-xl font-bold text-white">
            Έγκριση Machine-id
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="mb-3 bg-slate-900/60 border border-slate-700 rounded-lg p-3 text-sm">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">
            Pickup Code
          </div>
          <div className="text-cyan-200 font-mono">{request.pickupCode}</div>
        </div>

        <div className="mb-4 bg-slate-900/60 border border-slate-700 rounded-lg p-3">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">
            Machine-id προς έγκριση
          </div>
          <code className="block text-cyan-100 font-mono text-xs break-all">
            {machine.machineId}
          </code>
        </div>

        <form onSubmit={handleSubmit}>
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
        <p className="text-slate-300 text-center text-sm mb-2">
          Η αίτηση με Pickup Code{" "}
          <span className="text-cyan-200 font-mono font-semibold">
            {request.pickupCode}
          </span>{" "}
          θα διαγραφεί μόνιμα.
        </p>
        <p className="text-slate-400 text-center text-xs mb-4">
          (Θα διαγραφούν και τα {request.totalMachines || 0} machine-ids της.)
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

function BulkDeleteModal({ count, onClose, onConfirm }) {
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
          Διαγραφή {count} αιτήσεων από το Ιστορικό;
        </h2>
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

function CleanupModal({ onClose, onConfirm }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    await onConfirm();
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-800 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-cyan-500/20 border-2 border-cyan-400/60 flex items-center justify-center">
            <span className="text-2xl">🗓</span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-2">
          Καθαρισμός Παλιών Αιτήσεων;
        </h2>
        <p className="text-slate-300 text-center text-sm mb-4">
          Εκκρεμείς παλαιότερες των 30 ημερών θα{" "}
          <span className="text-red-300 font-semibold">διαγραφούν</span>.
          Ολοκληρωμένες παλαιότερες των 30 ημερών θα{" "}
          <span className="text-cyan-200 font-semibold">αποσυρθούν</span> από
          το tab «Ολοκληρωμένες» (παραμένουν στο Ιστορικό).
        </p>
        <p className="text-slate-400 text-center text-xs mb-6">
          Αυτό γίνεται αυτόματα κάθε μέρα στις 06:00 (Ελληνική ώρα).
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
            className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-semibold text-sm disabled:opacity-50 transition-all"
          >
            {submitting ? "Καθαρισμός..." : "Καθαρισμός τώρα"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Φάση 9: Ξενάγηση Admin Panel
// ─────────────────────────────────────────────────────────
function ShowcaseAdminPanel({ onUnauthorized }) {
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const loadFeatures = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/features");
      const data = await res.json();
      setFeatures(data.features || {});
    } catch {
      setErrorMsg("Σφάλμα κατά τη φόρτωση.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  async function handleSave(mainTabId, subTabId, descriptionHtml) {
    const res = await fetch("/api/admin/features/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mainTabId, subTabId, descriptionHtml }),
      credentials: "include",
    });
    if (res.status === 401) {
      onUnauthorized();
      return { ok: false };
    }
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error };
    // Update local state με το sanitized HTML που γύρισε ο server
    setFeatures((prev) => ({
      ...prev,
      [featureKey(mainTabId, subTabId)]: data.sanitizedHtml || "",
    }));
    return { ok: true };
  }

  const totalSubItems = MENU_STRUCTURE.reduce(
    (acc, m) => acc + m.subItems.length,
    0
  );
  const filledCount = Object.values(features).filter(
    (v) => v && v.trim().length > 0
  ).length;

  return (
    <>
      <div className="mb-4 px-3 py-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-indigo-100">
          <span className="font-semibold">
            {filledCount} / {totalSubItems}
          </span>{" "}
          υποκαρτέλες έχουν περιγραφή. Πάτα σε μία για να την επεξεργαστείς.
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Φόρτωση...</div>
      ) : errorMsg ? (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200 text-sm">
          {errorMsg}
        </div>
      ) : (
        <div className="space-y-3">
          {MENU_STRUCTURE.map((main) => (
            <MainTabSection
              key={main.id}
              main={main}
              features={features}
              onEdit={(sub) => setEditTarget({ main, sub })}
            />
          ))}
        </div>
      )}

      {editTarget && (
        <FeatureEditorModal
          main={editTarget.main}
          sub={editTarget.sub}
          initialHtml={
            features[featureKey(editTarget.main.id, editTarget.sub.id)] || ""
          }
          onClose={() => setEditTarget(null)}
          onSave={async (html) => {
            const result = await handleSave(
              editTarget.main.id,
              editTarget.sub.id,
              html
            );
            if (result.ok) setEditTarget(null);
            return result;
          }}
        />
      )}
    </>
  );
}

function MainTabSection({ main, features, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const filled = main.subItems.filter(
    (s) => (features[featureKey(main.id, s.id)] || "").trim().length > 0
  ).length;

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm uppercase tracking-wider">
            {main.label}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-900/60 text-slate-300 font-mono">
            {filled} / {main.subItems.length}
          </span>
        </div>
        <span
          className={`text-slate-400 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {expanded && (
        <div className="border-t border-slate-700/50 p-3 space-y-2">
          {main.subItems.map((sub) => {
            const html = features[featureKey(main.id, sub.id)] || "";
            const hasContent = html.trim().length > 0;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onEdit(sub)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-slate-900/40 hover:bg-slate-900/70 border border-slate-700/40 hover:border-cyan-500/40 text-left transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                      hasContent ? "bg-emerald-400" : "bg-slate-600"
                    }`}
                  />
                  <span className="text-slate-200 text-sm truncate">
                    {sub.label}
                  </span>
                </div>
                <span className="text-xs text-cyan-300 font-semibold flex-shrink-0">
                  {hasContent ? "Επεξεργασία" : "+ Προσθήκη"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FeatureEditorModal({ main, sub, initialHtml, onClose, onSave }) {
  const editorRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Set initial HTML στο mount ΜΟΝΟ (uncontrolled editor)
    if (editorRef.current) {
      editorRef.current.innerHTML = initialHtml || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(command, value = null) {
    editorRef.current?.focus();
    try {
      document.execCommand(command, false, value);
    } catch {}
  }

  function handleLink() {
    const url = window.prompt("Δώσε URL (πρέπει να ξεκινά με http:// ή https://):");
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      alert("Λάθος URL — πρέπει να ξεκινά με http:// ή https://");
      return;
    }
    exec("createLink", url);
  }

  function handleUnlink() {
    exec("unlink");
  }

  function handleHeading(tag) {
    // formatBlock παίρνει "H2", "H3", "P"
    exec("formatBlock", tag);
  }

  function handleClear() {
    if (!window.confirm("Καθαρισμός όλης της περιγραφής;")) return;
    if (editorRef.current) editorRef.current.innerHTML = "";
  }

  async function handleSubmit() {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    setSubmitting(true);
    setErrorMsg("");
    const result = await onSave(html);
    setSubmitting(false);
    if (!result.ok) {
      setErrorMsg(result.error || "Σφάλμα κατά την αποθήκευση.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 flex-shrink-0">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-indigo-300 mb-0.5 truncate">
              {main.label}
            </div>
            <h2 className="text-xl font-bold text-white truncate">
              {sub.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none flex-shrink-0 ml-2"
          >
            ×
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-700 flex-wrap flex-shrink-0">
          <ToolbarButton onClick={() => exec("bold")} title="Έντονα (Ctrl+B)">
            <b>B</b>
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("italic")} title="Πλάγια (Ctrl+I)">
            <i>I</i>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => exec("underline")}
            title="Υπογράμμιση (Ctrl+U)"
          >
            <u>U</u>
          </ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton
            onClick={() => handleHeading("H2")}
            title="Μεγάλος τίτλος"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            onClick={() => handleHeading("H3")}
            title="Μικρός τίτλος"
          >
            H3
          </ToolbarButton>
          <ToolbarButton
            onClick={() => handleHeading("P")}
            title="Κανονική παράγραφος"
          >
            P
          </ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton
            onClick={() => exec("insertUnorderedList")}
            title="Λίστα με κουκκίδες"
          >
            • Λίστα
          </ToolbarButton>
          <ToolbarButton
            onClick={() => exec("insertOrderedList")}
            title="Αριθμημένη λίστα"
          >
            1. Λίστα
          </ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton onClick={handleLink} title="Προσθήκη link">
            🔗 Link
          </ToolbarButton>
          <ToolbarButton onClick={handleUnlink} title="Αφαίρεση link">
            🔗✕
          </ToolbarButton>
          <ToolbarDivider />
          <ToolbarButton onClick={() => exec("undo")} title="Αναίρεση (Ctrl+Z)">
            ↶
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("redo")} title="Επανάληψη (Ctrl+Y)">
            ↷
          </ToolbarButton>
          <div className="flex-1" />
          <ToolbarButton
            onClick={handleClear}
            title="Καθαρισμός όλου του κειμένου"
            variant="danger"
          >
            🗑
          </ToolbarButton>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-4">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="admin-editor min-h-[280px] bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-base leading-relaxed focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            style={{ whiteSpace: "pre-wrap" }}
          />
          <p className="text-xs text-slate-500 mt-2">
            Tip: Γράψε ελεύθερα κείμενο. Χρησιμοποίησε την γραμμή εργαλείων για
            μορφοποίηση. Επιτρέπονται: έντονα, πλάγια, υπογράμμιση, τίτλοι,
            λίστες, links.
          </p>
        </div>

        {errorMsg && (
          <div className="mx-4 mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-200">{errorMsg}</p>
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex gap-3 px-4 py-3 border-t border-slate-700 flex-shrink-0">
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
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? "Αποθήκευση..." : "💾 Αποθήκευση"}
          </button>
        </div>

        <style jsx global>{`
          .admin-editor h2 {
            font-size: 1.5rem;
            font-weight: 700;
            margin: 1rem 0 0.5rem;
          }
          .admin-editor h3 {
            font-size: 1.15rem;
            font-weight: 700;
            margin: 0.75rem 0 0.4rem;
          }
          .admin-editor p {
            margin: 0.5rem 0;
          }
          .admin-editor ul,
          .admin-editor ol {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
          }
          .admin-editor ul {
            list-style: disc;
          }
          .admin-editor ol {
            list-style: decimal;
          }
          .admin-editor li {
            margin: 0.25rem 0;
          }
          .admin-editor a {
            color: #67e8f9;
            text-decoration: underline;
          }
          .admin-editor strong,
          .admin-editor b {
            font-weight: 700;
          }
          .admin-editor em,
          .admin-editor i {
            font-style: italic;
          }
          .admin-editor u {
            text-decoration: underline;
          }
        `}</style>
      </div>
    </div>
  );
}

function ToolbarButton({ children, onClick, title, variant }) {
  const variants = {
    default:
      "bg-slate-700/40 hover:bg-slate-700 text-slate-100 border-slate-600",
    danger:
      "bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30",
  };
  const style = variants[variant] || variants.default;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors ${style}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-slate-700 mx-1" />;
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
