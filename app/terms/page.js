"use client";

// Φάση 13: Όροι Χρήσης (Terms & Conditions)
// Σκοπός: νομική προστασία του Υπευθύνου από αξιώσεις χρηστών, ορισμός
// επιτρεπόμενης χρήσης, disclaimer of warranties, limitation of liability.

import { useRouter } from "next/navigation";
import Image from "next/image";

const LAST_UPDATED = "15 Σεπτεμβρίου 2026";
const CONTROLLER_NAME = "Ν.Μ.";
const CONTROLLER_EMAIL = "nikosboutz24@hotmail.com";

export default function TermsPage() {
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
                Όροι Χρήσης
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
                Όροι Χρήσης
              </h1>
              <p className="text-xs text-slate-400 mb-8">
                Τελευταία ενημέρωση: {LAST_UPDATED}
              </p>

              <div className="space-y-6 text-slate-200 leading-relaxed text-[15px]">
                <Section title="1. Αποδοχή Όρων">
                  <p>
                    Χρησιμοποιώντας την ιστοσελίδα smact.netlify.app
                    («SMAct», «η Υπηρεσία»), συμφωνείς ρητά με τους
                    παρόντες Όρους Χρήσης. Αν δεν συμφωνείς με οποιονδήποτε
                    όρο, παρακαλούμε μη χρησιμοποιήσεις την Υπηρεσία.
                  </p>
                </Section>

                <Section title="2. Περιγραφή της Υπηρεσίας">
                  <p>
                    Η SMAct είναι μια <strong>δωρεάν, μη-εμπορική</strong>{" "}
                    υπηρεσία διανομής και ενεργοποίησης του λογισμικού
                    Service Manager Pro. Επιτρέπει:
                  </p>
                  <ul className="mt-3 space-y-1 list-disc list-inside">
                    <li>Λήψη (download) του προγράμματος με έγκυρο κλειδί</li>
                    <li>Υποβολή αιτήματος για κωδικό ενεργοποίησης</li>
                    <li>Αναζήτηση κατάστασης υφιστάμενου αιτήματος</li>
                    <li>Αποστολή σχολίων/feedback</li>
                  </ul>
                  <p className="mt-3">
                    Η Υπηρεσία παρέχεται από ιδιώτη σε μη-κερδοσκοπική
                    βάση. Δεν εμφανίζει διαφημίσεις, δεν χρεώνει τους
                    χρήστες, δεν μεταπωλεί δεδομένα.
                  </p>
                </Section>

                <Section title="3. Χρήστες">
                  <p>
                    Η Υπηρεσία απευθύνεται σε ενήλικες που έχουν λάβει
                    Download Key ή αριθμό πρόσκλησης από τον Υπεύθυνο ή
                    εξουσιοδοτημένο διανομέα. Δεν είναι ανοιχτή προς το
                    ευρύ κοινό.
                  </p>
                </Section>

                <Section title="4. Αποδεκτή Χρήση">
                  <p>Αποδέχεσαι να χρησιμοποιείς την Υπηρεσία ΜΟΝΟ για:</p>
                  <ul className="mt-3 space-y-1 list-disc list-inside">
                    <li>Νόμιμη λήψη του Service Manager Pro</li>
                    <li>
                      Υποβολή γνήσιου αιτήματος ενεργοποίησης για τον δικό
                      σου υπολογιστή
                    </li>
                    <li>Αναζήτηση δικών σου αιτημάτων</li>
                    <li>Αποστολή εποικοδομητικού feedback</li>
                  </ul>
                </Section>

                <Section title="5. Απαγορευμένες Ενέργειες">
                  <p>Ρητά ΑΠΑΓΟΡΕΥΕΤΑΙ:</p>
                  <ul className="mt-3 space-y-1 list-disc list-inside">
                    <li>
                      Χρήση bots, scrapers, ή αυτοματοποιημένων εργαλείων για
                      μαζική υποβολή αιτημάτων
                    </li>
                    <li>
                      Απόπειρα παράκαμψης του captcha, του rate limiting, ή
                      άλλων μέτρων ασφαλείας
                    </li>
                    <li>
                      Reverse engineering, decompilation, disassembly του
                      λογισμικού ή της ιστοσελίδας
                    </li>
                    <li>
                      Αναδιανομή, μεταπώληση, ή εμπορική εκμετάλλευση του
                      λογισμικού χωρίς ρητή άδεια
                    </li>
                    <li>
                      Υποβολή ψευδών ή παραπλανητικών στοιχείων
                    </li>
                    <li>
                      Χρήση της Υπηρεσίας για παράνομες, καταχρηστικές, ή
                      επιβλαβείς δραστηριότητες
                    </li>
                    <li>
                      Απόπειρα πρόσβασης σε αιτήματα τρίτων προσώπων
                    </li>
                    <li>
                      Αποστολή υβριστικού, απειλητικού, ή παράνομου
                      περιεχομένου μέσω του feedback
                    </li>
                  </ul>
                  <p className="mt-3">
                    Ο Υπεύθυνος διατηρεί το δικαίωμα να διακόψει την
                    πρόσβαση οποιουδήποτε χρήστη παραβιάζει τους παρόντες
                    όρους, χωρίς προειδοποίηση και χωρίς επιστροφή.
                  </p>
                </Section>

                <Section title="6. Feedback / Σχόλια">
                  <p>
                    Στέλνοντας feedback μέσω της φόρμας, αποδέχεσαι ότι:
                  </p>
                  <ul className="mt-3 space-y-1 list-disc list-inside">
                    <li>Το περιεχόμενο θα διαβαστεί από τον Υπεύθυνο</li>
                    <li>
                      Μπορεί να χρησιμοποιηθεί για βελτίωση της Υπηρεσίας
                      ή του λογισμικού
                    </li>
                    <li>
                      Δεν θα δημοσιευτεί ονομαστικά χωρίς τη ρητή σου
                      συγκατάθεση
                    </li>
                    <li>
                      Δεν δικαιούσαι αμοιβή ή αναγνώριση για ιδέες που
                      υποβάλλεις
                    </li>
                  </ul>
                </Section>

                <Section title="7. Πνευματικά Δικαιώματα">
                  <p>
                    Όλο το περιεχόμενο της ιστοσελίδας (σχεδιασμός, κείμενα,
                    logo, εικόνες, κώδικας) καθώς και το λογισμικό Service
                    Manager Pro προστατεύονται από την Ελληνική και Ευρωπαϊκή
                    νομοθεσία περί πνευματικής ιδιοκτησίας. Απαγορεύεται η
                    αντιγραφή, αναδημοσίευση ή τροποποίηση χωρίς ρητή
                    γραπτή άδεια του Υπευθύνου.
                  </p>
                </Section>

                <Section title="8. Αποποίηση Εγγυήσεων (Disclaimer)">
                  <p className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-slate-100">
                    Η Υπηρεσία και το λογισμικό παρέχονται{" "}
                    <strong>«ΩΣ ΕΧΟΥΝ» (AS-IS)</strong>, χωρίς καμία ρητή ή
                    σιωπηρή εγγύηση. Ο Υπεύθυνος δεν εγγυάται ότι:
                  </p>
                  <ul className="mt-3 space-y-1 list-disc list-inside">
                    <li>
                      Η Υπηρεσία θα λειτουργεί αδιάλειπτα, χωρίς σφάλματα,
                      χωρίς διακοπές
                    </li>
                    <li>Τα αιτήματα θα εγκρίνονται εντός συγκεκριμένου χρόνου</li>
                    <li>
                      Το λογισμικό είναι κατάλληλο για συγκεκριμένο σκοπό
                    </li>
                    <li>
                      Το λογισμικό είναι απαλλαγμένο από bugs, εσφαλμένες
                      συμπεριφορές, ή απώλεια δεδομένων
                    </li>
                  </ul>
                  <p className="mt-3">
                    Η χρήση γίνεται με δική σου αποκλειστική ευθύνη. Πριν
                    την εγκατάσταση σε παραγωγικό περιβάλλον, δοκίμασε σε
                    test environment και κράτα backup.
                  </p>
                </Section>

                <Section title="9. Περιορισμός Ευθύνης">
                  <p>
                    Ο Υπεύθυνος <strong>δεν φέρει ευθύνη</strong> για
                    οποιαδήποτε άμεση, έμμεση, τυχαία, ή επακόλουθη ζημιά
                    προκύψει από τη χρήση ή αδυναμία χρήσης της Υπηρεσίας
                    ή του λογισμικού, συμπεριλαμβανομένων ενδεικτικά:
                  </p>
                  <ul className="mt-3 space-y-1 list-disc list-inside">
                    <li>Απώλεια δεδομένων</li>
                    <li>Απώλεια εργασίας/χρόνου</li>
                    <li>Διακοπή λειτουργίας υπολογιστή</li>
                    <li>Οικονομική ζημία</li>
                    <li>Ζημιά σε τρίτους</li>
                  </ul>
                  <p className="mt-3">
                    Η μέγιστη ευθύνη του Υπευθύνου σε κάθε περίπτωση
                    περιορίζεται στο ποσό που έχει καταβάλει ο χρήστης για
                    την Υπηρεσία, το οποίο, δεδομένου ότι η Υπηρεσία είναι
                    δωρεάν, ισούται με μηδέν (0€).
                  </p>
                </Section>

                <Section title="10. Ενημέρωση Όρων">
                  <p>
                    Ο Υπεύθυνος διατηρεί το δικαίωμα να τροποποιήσει τους
                    παρόντες Όρους ανά πάσα στιγμή. Η τελευταία ημερομηνία
                    ενημέρωσης φαίνεται στην κορυφή της σελίδας. Η
                    συνεχιζόμενη χρήση της Υπηρεσίας μετά από αλλαγή
                    συνιστά αποδοχή των νέων Όρων.
                  </p>
                </Section>

                <Section title="11. Διακοπή Υπηρεσίας">
                  <p>
                    Η Υπηρεσία μπορεί να διακοπεί ή να τερματιστεί οποιαδήποτε
                    στιγμή, με ή χωρίς προειδοποίηση, κατά την απόλυτη
                    κρίση του Υπευθύνου. Ο Υπεύθυνος δεν φέρει ευθύνη έναντι
                    χρηστών ή τρίτων για τη διακοπή.
                  </p>
                </Section>

                <Section title="12. Επικοινωνία">
                  <p>Για οποιοδήποτε ερώτημα σχετικά με τους παρόντες Όρους:</p>
                  <div className="mt-3 pl-4 border-l-2 border-cyan-500/50 text-slate-300">
                    <div>{CONTROLLER_NAME}</div>
                    <div>
                      Email:{" "}
                      <a
                        href={`mailto:${CONTROLLER_EMAIL}`}
                        className="text-cyan-400 hover:text-cyan-300 underline"
                      >
                        {CONTROLLER_EMAIL}
                      </a>
                    </div>
                  </div>
                </Section>

                <Section title="13. Εφαρμοστέο Δίκαιο & Δωσιδικία">
                  <p>
                    Οι παρόντες Όροι διέπονται από το Ελληνικό δίκαιο. Για
                    οποιαδήποτε διαφορά προκύψει από τη χρήση της Υπηρεσίας,
                    αποκλειστική δικαιοδοσία έχουν τα δικαστήρια της Αθήνας,
                    Ελλάδας.
                  </p>
                </Section>

                <Section title="14. Ακυρότητα Όρων">
                  <p>
                    Αν οποιοσδήποτε όρος κριθεί άκυρος ή ανεφάρμοστος από
                    δικαστήριο, οι υπόλοιποι όροι παραμένουν σε πλήρη ισχύ.
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
