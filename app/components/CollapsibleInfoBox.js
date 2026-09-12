"use client";

// ─────────────────────────────────────────────────────────
// CollapsibleInfoBox — Φάση 12i (Π5)
//
// Επαναχρησιμοποιήσιμο info-box με αριθμημένα βήματα (timeline),
// που ο χρήστης μπορεί να αναπτύξει ή να ελαχιστοποιήσει.
//
// Χρήση:
//   <CollapsibleInfoBox
//     title="⏱ Πώς θα κυλήσει η διαδικασία (πάτα για λεπτομέρειες)"
//     steps={[
//       "Πρώτο βήμα...",
//       "Δεύτερο βήμα...",
//       "Τρίτο βήμα...",
//     ]}
//   />
//
// Props:
//   title      : string    — τίτλος που φαίνεται πάντα
//   steps      : string[]  — τα βήματα (list-decimal)
//   defaultOpen: boolean   — αν ξεκινά ανοιχτό (default: false)
//   accent     : "cyan"|"amber"|"emerald"|"blue" — χρώμα του τίτλου/κύκλου
// ─────────────────────────────────────────────────────────

import { useState } from "react";

const ACCENT_CLASSES = {
  cyan:    { title: "text-cyan-400",    num: "bg-cyan-500/15 text-cyan-300" },
  amber:   { title: "text-amber-400",   num: "bg-amber-500/15 text-amber-300" },
  emerald: { title: "text-emerald-400", num: "bg-emerald-500/15 text-emerald-300" },
  blue:    { title: "text-blue-400",    num: "bg-blue-500/15 text-blue-300" },
};

export default function CollapsibleInfoBox({
  title,
  steps = [],
  defaultOpen = false,
  accent = "cyan",
}) {
  const [open, setOpen] = useState(defaultOpen);
  const classes = ACCENT_CLASSES[accent] || ACCENT_CLASSES.cyan;

  return (
    <div className="mb-5 bg-slate-900/40 border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-800/40 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
        aria-expanded={open}
      >
        <span className={`text-xs uppercase tracking-widest font-semibold ${classes.title}`}>
          {title}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-700/40 animate-fade-in-quick">
          <ol className="text-sm text-slate-300 space-y-2.5">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 items-start leading-relaxed">
                <span
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${classes.num}`}
                >
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in-quick {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        :global(.animate-fade-in-quick) {
          animation: fade-in-quick 180ms ease-out;
        }
      `}</style>
    </div>
  );
}
