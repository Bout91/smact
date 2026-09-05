"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MENU_STRUCTURE, featureKey } from "../lib/menu-structure";

// ─────────────────────────────────────────────────────────
// Inline Lucide-style icons (viewBox 0 0 24 24, stroke currentColor, strokeWidth 2)
// Μόνο τα icons που χρησιμοποιεί το menu-structure.
// ─────────────────────────────────────────────────────────
const ICONS = {
  Briefcase: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>
  ),
  Globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  BookOpen: (
    <>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </>
  ),
  ClipboardList: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </>
  ),
  Users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  CheckSquare: (
    <>
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>
  ),
  Printer: (
    <>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </>
  ),
  Settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  ShieldAlert: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </>
  ),
  Shield: (
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  ),
  FileText: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </>
  ),
  List: (
    <>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </>
  ),
  Package: (
    <>
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </>
  ),
  Grid: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </>
  ),
  Calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  FolderOpen: (
    <path d="M6 14l1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" />
  ),
  Inbox: (
    <>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  ),
  Archive: (
    <>
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </>
  ),
  Droplet: (
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  ),
  Plane: (
    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  ),
  RefreshCw: (
    <>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </>
  ),
  Camera: (
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  Activity: (
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  ),
  Edit: (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  ),
  Clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  Save: (
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </>
  ),
};

function Icon({ name, size = 18, className = "" }) {
  const path = ICONS[name] || ICONS.Briefcase;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

function ChevronDown({ size = 14, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
export default function ShowcasePage() {
  const router = useRouter();

  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);

  // openMain: ID της κύριας που είναι expanded (μία μόνο τη φορά, όπως στο πρόγραμμα)
  const [openMain, setOpenMain] = useState(null);
  // selected: { mainTabId, subTabId } — τι έχει επιλεγεί για display δεξιά
  const [selected, setSelected] = useState(null);

  const descriptionRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/features")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setFeatures(data.features || {});
        setLoading(false);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function toggleMain(mainId) {
    setOpenMain((prev) => (prev === mainId ? null : mainId));
  }

  function pickSub(mainTabId, subTabId) {
    setSelected({ mainTabId, subTabId });
    // Στο mobile: scroll στο description panel
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setTimeout(() => {
        descriptionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }

  const selectedData = useMemo(() => {
    if (!selected) return null;
    const main = MENU_STRUCTURE.find((m) => m.id === selected.mainTabId);
    if (!main) return null;
    const sub = main.subItems.find((s) => s.id === selected.subTabId);
    if (!sub) return null;
    const html = features[featureKey(selected.mainTabId, selected.subTabId)] || "";
    return { main, sub, html };
  }, [selected, features]);

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
                Ξενάγηση Προγράμματος
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

        <div className="flex-1 px-4 md:px-6 pb-12">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Τί προσφέρει το{" "}
                <span className="gradient-text">Service Manager Pro</span>
              </h1>
              <p className="text-slate-400 text-sm md:text-base">
                Πάτα μια κύρια καρτέλα για να δεις τις υποκαρτέλες της.
                Επίλεξε υποκαρτέλα για να δεις τι κάνει.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
              {/* Sidebar */}
              <aside className="w-full md:w-[300px] md:sticky md:top-6 flex-shrink-0">
                <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-2 shadow-xl">
                  {MENU_STRUCTURE.map((main) => {
                    const isOpen = openMain === main.id;
                    return (
                      <div key={main.id} className="mb-1">
                        <button
                          type="button"
                          onClick={() => toggleMain(main.id)}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${
                            isOpen
                              ? "bg-indigo-500/20 text-white"
                              : "text-slate-200 hover:bg-slate-700/40"
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              name={main.icon}
                              size={18}
                              className="flex-shrink-0 text-indigo-300"
                            />
                            <span className="font-semibold text-xs uppercase tracking-wider leading-tight">
                              {main.label}
                            </span>
                          </span>
                          <ChevronDown
                            className={`flex-shrink-0 text-slate-400 transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {isOpen && (
                          <div className="mt-1 ml-2 border-l border-slate-700/60 pl-1 space-y-0.5">
                            {main.subItems.map((sub) => {
                              const isSelected =
                                selected?.mainTabId === main.id &&
                                selected?.subTabId === sub.id;
                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => pickSub(main.id, sub.id)}
                                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left text-sm transition-colors ${
                                    isSelected
                                      ? "bg-cyan-500/20 text-cyan-100"
                                      : "text-slate-300 hover:bg-slate-700/30 hover:text-white"
                                  }`}
                                >
                                  <Icon
                                    name={sub.icon}
                                    size={14}
                                    className="flex-shrink-0 text-slate-400"
                                  />
                                  <span className="truncate">{sub.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </aside>

              {/* Description panel */}
              <section
                ref={descriptionRef}
                className="flex-1 w-full min-w-0"
              >
                <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 md:p-8 shadow-xl min-h-[400px]">
                  {loading ? (
                    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                      Φόρτωση περιεχομένου...
                    </div>
                  ) : !selectedData ? (
                    <WelcomePanel />
                  ) : (
                    <FeaturePanel data={selectedData} />
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>

        <footer className="px-6 py-4 text-center text-xs text-slate-500">
          SMAct · Χωρίς αποθήκευση προσωπικών δεδομένων
        </footer>
      </main>
    </>
  );
}

function WelcomePanel() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-indigo-500/20 border-2 border-indigo-400/40 flex items-center justify-center mb-4">
        <span className="text-4xl">✨</span>
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
        Καλωσόρισες στην Ξενάγηση
      </h2>
      <p className="text-slate-400 text-sm max-w-md">
        Το Service Manager Pro είναι μια ολοκληρωμένη πλατφόρμα διαχείρισης
        Μονάδας. Πάτα οποιαδήποτε κύρια καρτέλα αριστερά για να δεις τις
        υποκαρτέλες, και επίλεξε μια υποκαρτέλα για να μάθεις τι κάνει.
      </p>
    </div>
  );
}

function FeaturePanel({ data }) {
  const { main, sub, html } = data;

  return (
    <article>
      <div className="mb-6 pb-4 border-b border-slate-700/50">
        <div className="text-xs uppercase tracking-widest text-indigo-300 mb-1">
          {main.label}
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <span className="text-cyan-300">
            <Icon name={sub.icon} size={28} />
          </span>
          {sub.label}
        </h2>
      </div>

      {html && html.trim().length > 0 ? (
        <div
          className="showcase-content text-slate-200 text-base leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className="text-slate-500 text-sm italic py-8 text-center">
          Δεν έχει προστεθεί περιγραφή για αυτή την υποκαρτέλα ακόμα.
        </div>
      )}

      <style jsx>{`
        .showcase-content :global(p) {
          margin: 0.75rem 0;
        }
        .showcase-content :global(h2) {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 1.5rem 0 0.75rem;
          color: #e2e8f0;
        }
        .showcase-content :global(h3) {
          font-size: 1.15rem;
          font-weight: 700;
          margin: 1.25rem 0 0.5rem;
          color: #e2e8f0;
        }
        .showcase-content :global(ul),
        .showcase-content :global(ol) {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
        }
        .showcase-content :global(ul) {
          list-style: disc;
        }
        .showcase-content :global(ol) {
          list-style: decimal;
        }
        .showcase-content :global(li) {
          margin: 0.35rem 0;
        }
        .showcase-content :global(a) {
          color: #67e8f9;
          text-decoration: underline;
        }
        .showcase-content :global(a:hover) {
          color: #a5f3fc;
        }
        .showcase-content :global(strong),
        .showcase-content :global(b) {
          color: #fff;
          font-weight: 700;
        }
        .showcase-content :global(em),
        .showcase-content :global(i) {
          font-style: italic;
        }
        .showcase-content :global(u) {
          text-decoration: underline;
        }
      `}</style>
    </article>
  );
}

function Background() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-slate-900">
      <div className="absolute inset-0 circuit-pattern opacity-70" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600 blur-[120px] animate-pulse-slow pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-20 right-20 w-80 h-80 rounded-full bg-purple-500 blur-[100px] opacity-15 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-indigo-600 blur-[120px] opacity-15 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
