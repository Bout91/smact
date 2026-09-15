"use client";

// Φάση 13: Πολιτική Απορρήτου (Privacy Policy) — GDPR / Ν. 4624/2019 συμμόρφωση
// Σκοπός: ενημέρωση χρηστών ΠΡΙΝ υποβάλουν δεδομένα, όπως απαιτεί το άρθρο 13 GDPR.
// Περιεχόμενο: Data Controller, τι συλλέγεται, νομική βάση, κατοχή, τρίτοι,
// cookies, δικαιώματα χρηστών, επικοινωνία, ενημερώσεις.

import { useRouter } from "next/navigation";
import Image from "next/image";

const LAST_UPDATED = "15 Σεπτεμβρίου 2026";
const CONTROLLER_NAME = "Ν.Μ.";
const CONTROLLER_EMAIL = "nikosboutz24@hotmail.com";

export default function PrivacyPage() {
  const router = useRouter();

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
                Πολιτική Απορρήτου
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

        <div className="flex-1 flex justify-center px-6 pb-16">
          <div className="max-w-3xl w-full">
            <div className="bg-slate-800/70 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 md:p-10 shadow-2xl">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                Πολιτική Απορρήτου
              </h1>
              <p className="text-xs text-slate-400 mb-8">
                Τελευταία ενημέρωση: {LAST_UPDATED}
              </p>

              <div className="space-y-6 text-slate-200 leading-relaxed text-[15px]">
                <Section title="1. Ποιοι είμαστε (Υπεύθυνος Επεξεργασίας)">
                  <p>
                    Η ιστοσελίδα SMAct (smact.netlify.app) διαχειρίζεται
                    αιτήματα ενεργοποίησης και downloads για το πρόγραμμα
                    Service Manager Pro. Υπεύθυνος Επεξεργασίας κατά την
                    έννοια του Γενικού Κανονισμού Προστασίας Δεδομένων
                    (GDPR — Κανονισμός ΕΕ 2016/679) είναι:
                  </p>
                  <div className="mt-3 pl-4 border-l-2 border-cyan-500/50 text-slate-300">
                    <div>{CONTROLLER_NAME}</div>
                    <div>
                      Email επικοινωνίας:{" "}
                      <a
                        href={`mailto:${CONTROLLER_EMAIL}`}
                        className="text-cyan-400 hover:text-cyan-300 underline"
                      >
                        {CONTROLLER_EMAIL}
                      </a>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">
                    Η υπηρεσία λειτουργεί σε μη-εμπορική, μη-κερδοσκοπική
                    βάση. Δεν εμπορευόμαστε δεδομένα, δεν εμφανίζουμε
                    διαφημίσεις, δεν στέλνουμε newsletters.
                  </p>
                </Section>

                <Section title="2. Ποια δεδομένα συλλέγουμε">
                  <p>
                    Συλλέγουμε ΜΟΝΟ τα ελάχιστα δεδομένα που χρειάζονται
                    για τη λειτουργία της υπηρεσίας:
                  </p>
                  <ul className="mt-3 space-y-2 list-disc list-inside">
                    <li>
                      <strong>Machine-id:</strong> ένα τεχνικό αναγνωριστικό
                      του υπολογιστή σου (Windows registry UUID). Δεν
                      αποκαλύπτει το όνομα, τη διεύθυνση, ή το IP σου.
                    </li>
                    <li>
                      <strong>Pickup Code:</strong> ο κωδικός παραλαβής που
                      επιλέγεις εσύ και μας δίνεις για να ταυτίσουμε το
                      αίτημά σου.
                    </li>
                    <li>
                      <strong>Μονάδα &amp; Γραφείο</strong> (προαιρετικά):
                      εφόσον τα συμπληρώσεις. Μπορείς να τα αφήσεις κενά.
                    </li>
                    <li>
                      <strong>Download Key &amp; Activation Key:</strong>{" "}
                      τεχνικοί κωδικοί για ταυτοποίηση χρηστών.
                    </li>
                    <li>
                      <strong>Feedback κείμενο:</strong> ό,τι πληκτρολογήσεις
                      στη φόρμα σχολίων.
                    </li>
                    <li>
                      <strong>IP διεύθυνση:</strong> προσωρινά (10 λεπτά)
                      για rate limiting (προστασία από spam/bots). Δεν
                      αποθηκεύεται μόνιμα, δεν χρησιμοποιείται για
                      παρακολούθηση.
                    </li>
                  </ul>
                  <p className="mt-3 text-sm text-slate-400">
                    <strong>Δεν συλλέγουμε:</strong> ονοματεπώνυμο, email,
                    τηλέφωνο, διεύθυνση, φύλο, ηλικία, τραπεζικά στοιχεία,
                    στοιχεία πληρωμής, δεδομένα browser fingerprinting, cookies
                    παρακολούθησης.
                  </p>
                </Section>

                <Section title="3. Γιατί τα συλλέγουμε (Νομική Βάση)">
                  <p>
                    Επεξεργαζόμαστε τα παραπάνω δεδομένα βάσει:
                  </p>
                  <ul className="mt-3 space-y-2 list-disc list-inside">
                    <li>
                      <strong>Εκτέλεση σύμβασης</strong> (άρθρο 6§1β GDPR)
                      — για να παρέχουμε την υπηρεσία που ζήτησες
                      (activation code, download link).
                    </li>
                    <li>
                      <strong>Έννομο συμφέρον</strong> (άρθρο 6§1στ GDPR) —
                      για rate limiting και προστασία από κατάχρηση της
                      υπηρεσίας.
                    </li>
                    <li>
                      <strong>Συγκατάθεση</strong> (άρθρο 6§1α GDPR) —
                      όταν συμπληρώνεις τη φόρμα υποβολής, δίνεις ρητή
                      συγκατάθεση μέσω του σχετικού checkbox.
                    </li>
                  </ul>
                </Section>

                <Section title="4. Πόσο κρατάμε τα δεδομένα">
                  <p>
                    Όλες οι εγγραφές αιτημάτων διαγράφονται αυτόματα{" "}
                    <strong>μετά από 30 ημέρες</strong> από την υποβολή τους,
                    ανεξάρτητα από την κατάστασή τους (εκκρεμείς,
                    ολοκληρωμένες).
                  </p>
                  <p className="mt-3">
                    Τα IP addresses για rate limiting κρατούνται μόνο{" "}
                    <strong>10 λεπτά</strong>.
                  </p>
                  <p className="mt-3">
                    Το feedback κείμενο διατηρείται όσο χρειάζεται για τη
                    βελτίωση της υπηρεσίας (μέγιστο 12 μήνες).
                  </p>
                </Section>

                <Section title="5. Με ποιον μοιραζόμαστε τα δεδομένα">
                  <p>
                    <strong>Δεν πουλάμε</strong> και <strong>δεν
                    μοιραζόμαστε</strong> τα δεδομένα σου με τρίτους για
                    εμπορικούς σκοπούς. Για τη λειτουργία της υπηρεσίας
                    χρησιμοποιούμε τους εξής παρόχους υπηρεσιών (data
                    processors) που έχουν πρόσβαση σε τεχνικό επίπεδο:
                  </p>
                  <ul className="mt-3 space-y-2 list-disc list-inside">
                    <li>
                      <strong>Netlify Inc.</strong> (ΗΠΑ) — hosting της
                      ιστοσελίδας. Πιστοποίηση EU-US Data Privacy Framework.
                    </li>
                    <li>
                      <strong>Neon Inc.</strong> (ΕΕ, region Frankfurt) —
                      βάση δεδομένων. Δεδομένα αποθηκεύονται εντός ΕΕ.
                    </li>
                    <li>
                      <strong>Cloudflare Inc.</strong> (ΗΠΑ) — υπηρεσία
                      Turnstile για προστασία από bots. Πιστοποίηση EU-US
                      Data Privacy Framework.
                    </li>
                    <li>
                      <strong>ntfy.sh</strong> — υπηρεσία push notifications
                      για ενημέρωση διαχειριστή. Δεν μεταδίδεται προσωπικό
                      δεδομένο, μόνο ειδοποίηση «νέο αίτημα».
                    </li>
                  </ul>
                </Section>

                <Section title="6. Cookies">
                  <p>Η ιστοσελίδα χρησιμοποιεί ΜΟΝΟ τεχνικά cookies:</p>
                  <ul className="mt-3 space-y-2 list-disc list-inside">
                    <li>
                      <strong>Cloudflare Turnstile cookies</strong> (
                      <code className="text-cyan-300 text-xs">__cf_bm</code>,{" "}
                      <code className="text-cyan-300 text-xs">cf_clearance</code>)
                      — απαραίτητα για προστασία από κακόβουλα bots.
                    </li>
                    <li>
                      <strong>Admin session cookie</strong> — μόνο για τον
                      διαχειριστή, όχι για επισκέπτες.
                    </li>
                  </ul>
                  <p className="mt-3">
                    <strong>Δεν χρησιμοποιούμε:</strong> Google Analytics,
                    Facebook Pixel, cookies διαφήμισης, tracking cookies,
                    fingerprinting. Επειδή δεν έχουμε non-essential cookies,
                    δεν εμφανίζουμε cookie consent banner (σύμφωνα με το
                    ePrivacy Directive και Ν. 3471/2006).
                  </p>
                </Section>

                <Section title="7. Τα Δικαιώματά σου">
                  <p>Ως υποκείμενο δεδομένων έχεις τα εξής δικαιώματα:</p>
                  <ul className="mt-3 space-y-2 list-disc list-inside">
                    <li>
                      <strong>Πρόσβαση</strong> (άρθρο 15 GDPR) — να μάθεις
                      τι δεδομένα έχουμε για σένα.
                    </li>
                    <li>
                      <strong>Διόρθωση</strong> (άρθρο 16 GDPR).
                    </li>
                    <li>
                      <strong>Διαγραφή</strong> / «Δικαίωμα στη λήθη»
                      (άρθρο 17 GDPR).
                    </li>
                    <li>
                      <strong>Περιορισμός επεξεργασίας</strong> (άρθρο 18).
                    </li>
                    <li>
                      <strong>Φορητότητα δεδομένων</strong> (άρθρο 20).
                    </li>
                    <li>
                      <strong>Εναντίωση</strong> (άρθρο 21).
                    </li>
                    <li>
                      <strong>Ανάκληση συγκατάθεσης</strong> ανά πάσα στιγμή.
                    </li>
                  </ul>
                  <p className="mt-3">
                    Για την άσκηση οποιουδήποτε δικαιώματος, στείλε email
                    στο{" "}
                    <a
                      href={`mailto:${CONTROLLER_EMAIL}`}
                      className="text-cyan-400 hover:text-cyan-300 underline"
                    >
                      {CONTROLLER_EMAIL}
                    </a>{" "}
                    αναφέροντας το pickup code σου. Θα απαντήσουμε εντός
                    30 ημερών, χωρίς χρέωση.
                  </p>
                  <p className="mt-3">
                    Αν θεωρείς ότι παραβιάζουμε τα δικαιώματά σου, έχεις
                    δικαίωμα καταγγελίας στην Αρχή Προστασίας Δεδομένων
                    Προσωπικού Χαρακτήρα (ΑΠΔΠΧ):
                  </p>
                  <div className="mt-2 pl-4 border-l-2 border-slate-600 text-sm text-slate-400">
                    <div>Κηφισίας 1-3, Αθήνα, ΤΚ 11523</div>
                    <div>Τηλ: 210 6475 600</div>
                    <div>
                      <a
                        href="https://www.dpa.gr"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 underline"
                      >
                        www.dpa.gr
                      </a>
                    </div>
                  </div>
                </Section>

                <Section title="8. Ασφάλεια">
                  <p>
                    Όλες οι επικοινωνίες με την ιστοσελίδα είναι
                    κρυπτογραφημένες (HTTPS/TLS). Η βάση δεδομένων φιλοξενείται
                    σε server εντός ΕΕ (Frankfurt). Πρόσβαση στα δεδομένα έχει
                    μόνο ο διαχειριστής μέσω ασφαλούς πάνελ με κωδικό.
                  </p>
                </Section>

                <Section title="9. Ανήλικοι">
                  <p>
                    Η υπηρεσία απευθύνεται σε ενήλικες. Δεν συλλέγουμε
                    σκόπιμα δεδομένα από άτομα κάτω των 16 ετών.
                  </p>
                </Section>

                <Section title="10. Αλλαγές στην Πολιτική">
                  <p>
                    Ενδέχεται να ενημερώσουμε αυτή την Πολιτική κατά καιρούς.
                    Η τελευταία ημερομηνία ενημέρωσης φαίνεται στην κορυφή
                    της σελίδας. Για ουσιαστικές αλλαγές θα ζητήσουμε νέα
                    συγκατάθεση όπου απαιτείται.
                  </p>
                </Section>

                <Section title="11. Εφαρμοστέο Δίκαιο">
                  <p>
                    Η παρούσα Πολιτική διέπεται από το Ελληνικό δίκαιο και
                    τον GDPR. Αρμόδια για την επίλυση διαφορών είναι τα
                    Ελληνικά δικαστήρια.
                  </p>
                </Section>
              </div>
            </div>
          </div>
        </div>

        <SharedFooter />
      </main>
    </>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-lg md:text-xl font-bold text-cyan-300 mb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SharedFooter() {
  const router = useRouter();
  return (
    <footer className="px-6 py-5 text-center text-xs text-slate-500 border-t border-slate-800/50">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span>SMAct</span>
        <span className="text-slate-700">·</span>
        <button
          type="button"
          onClick={() => router.push("/privacy")}
          className="hover:text-cyan-400 transition-colors underline underline-offset-2"
        >
          Πολιτική Απορρήτου
        </button>
        <span className="text-slate-700">·</span>
        <button
          type="button"
          onClick={() => router.push("/terms")}
          className="hover:text-cyan-400 transition-colors underline underline-offset-2"
        >
          Όροι Χρήσης
        </button>
        <span className="text-slate-700">·</span>
        <span className="text-slate-600">
          Ελάχιστα δεδομένα, καμία διαφήμιση
        </span>
      </div>
    </footer>
  );
}

function Background() {
  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden bg-slate-900 pointer-events-none"
      aria-hidden="true"
    >
      <div className="absolute inset-0 circuit-pattern opacity-40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600 blur-[120px] opacity-20 animate-pulse-slow" />
    </div>
  );
}
