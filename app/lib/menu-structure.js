// ─────────────────────────────────────────────────────────
// Source of truth για την πλαϊνή μπάρα του Service Manager Pro.
// Αντιγραφή από renderer.js → menuStructure (γρ. ~1045-1200).
//
// Χρησιμοποιείται από:
//   • /showcase page — για rendering του accordion
//   • /admin (tab Ξενάγηση) — για τη λίστα υποκαρτελών προς editing
// ─────────────────────────────────────────────────────────

export const MENU_STRUCTURE = [
  {
    id: "office1",
    label: "1ο Γραφείο",
    icon: "Briefcase",
    subItems: [
      { id: "protocol",           label: "Πρωτόκολλο & Σχέδιο",  icon: "BookOpen" },
      { id: "roster",             label: "Δυναμολόγιο",           icon: "ClipboardList" },
      { id: "personnel",          label: "Στελέχη & Προφίλ",      icon: "Users" },
      { id: "exemptions",         label: "Έλεγχος Απαλλαγών",     icon: "CheckSquare" },
      { id: "leave_balance",      label: "Υπόλοιπα Αδειών",       icon: "Briefcase" },
      { id: "network_settings",   label: "Ρυθμίσεις Δικτύου",     icon: "Globe" },
      { id: "office1_printables", label: "Εκτυπωτικά",            icon: "Printer" },
      { id: "office1_settings",   label: "Ρυθμίσεις",             icon: "Settings" },
    ],
  },
  {
    id: "office23",
    label: "2ο-3ο Γραφείο",
    icon: "Globe",
    subItems: [
      { id: "office23_maps",     label: "Χάρτες",                     icon: "Globe" },
      { id: "office23_regs",     label: "Κανονισμοί",                 icon: "BookOpen" },
      { id: "office23_rvxp",     label: "ΡΒΧΠ",                       icon: "ShieldAlert" },
      { id: "office23_missions", label: "Αποστολές",                  icon: "FileText" },
      { id: "office23_passes",   label: "Δελτία Εισόδου & Διπλώματα", icon: "ClipboardList" },
      { id: "office23_print",    label: "Εκτυπωτικά",                 icon: "Printer" },
    ],
  },
  {
    id: "office4",
    label: "4ο Γραφείο",
    icon: "Briefcase",
    subItems: [
      { id: "expenses_incoming",   label: "Εισερχόμενες Δαπάνες",     icon: "List" },
      { id: "expenses_reports",    label: "Εκθέσεις Απαιτ. Δαπανών",  icon: "ClipboardList" },
      { id: "immobility",          label: "Ακινησία Υλικών",          icon: "ShieldAlert" },
      { id: "health_exam",         label: "Ετήσια Υγειονομική Εξέταση", icon: "Activity" },
      { id: "expenses_printables", label: "Εκτυπωτικά",               icon: "Printer" },
      { id: "office4_settings",    label: "Ρυθμίσεις",                icon: "Settings" },
    ],
  },
  {
    id: "material",
    label: "Δχση Υλικού",
    icon: "Briefcase",
    subItems: [
      { id: "mat_controlled",       label: "Βιβλίο Ελεγχομένων",       icon: "BookOpen" },
      { id: "mat_ammo",             label: "Παρακολούθηση Πυρομαχικών", icon: "ShieldAlert" },
      { id: "mat_warehouse_supply", label: "Αποστολή Συμπληρώσεως",    icon: "RefreshCw" },
      { id: "mat_orders",           label: "Παρακολούθηση Αιτήσεων",   icon: "List" },
      { id: "mat_photo",            label: "Φωτογραφικό Υλικό",        icon: "Camera" },
      { id: "mat_pou",              label: "Π.Ο.Υ.",                   icon: "ClipboardList" },
      { id: "mat_pou_materials",    label: "Π.Ο.Υ. Υλικών",            icon: "Grid" },
      { id: "mat_print",            label: "Εκτυπωτικά",               icon: "Printer" },
    ],
  },
  {
    id: "warehouses",
    label: "Αποθήκες Μονάδας",
    icon: "Package",
    subItems: [
      { id: "warehouses_list",      label: "Λίστα Αποθηκών",             icon: "Package" },
      { id: "warehouses_layout",    label: "Κάτοψη & Ράφια",             icon: "Grid" },
      { id: "warehouses_summary",   label: "Συγκεντρωτικός",             icon: "ClipboardList" },
      { id: "warehouses_protocols", label: "Πρωτόκολλα Παράδοσης-Παραλαβής", icon: "FileText" },
      { id: "warehouses_108",       label: "Χρεωστικά 108",              icon: "FileText" },
      { id: "warehouses_print",     label: "Εκτυπωτικά",                 icon: "Printer" },
      { id: "warehouses_settings",  label: "Ρυθμίσεις",                  icon: "Settings" },
    ],
  },
  {
    id: "periodic",
    label: "Περιοδικές Καταστάσεις",
    icon: "Calendar",
    subItems: [
      { id: "periodic_reports", label: "Λίστα Καταστάσεων", icon: "List" },
    ],
  },
  {
    id: "cases",
    label: "Υποθέσεις - Ροή Αλληλογραφίας",
    icon: "FolderOpen",
    subItems: [
      { id: "cases_list",     label: "Οι Υποθέσεις μου",   icon: "FolderOpen" },
      { id: "cases_inbox",    label: "Εισερχόμενα Αιτήματα", icon: "Inbox" },
      { id: "cases_archived", label: "Αρχειοθετημένες",     icon: "Archive" },
      { id: "cases_settings", label: "Ρυθμίσεις",           icon: "Settings" },
    ],
  },
  {
    id: "networks",
    label: "Δίκτυα & Επαφές",
    icon: "Globe",
    subItems: [
      { id: "networks_calendar",   label: "Ημερολόγιο Επαφών", icon: "Calendar" },
      { id: "networks_todb",       label: "ΤΟΔΒ",              icon: "List" },
      { id: "networks_printables", label: "Εκτυπωτικά",        icon: "Printer" },
    ],
  },
  {
    id: "services",
    label: "Υπηρεσίες",
    icon: "Shield",
    subItems: [
      { id: "dashboard",           label: "Επισκόπηση",       icon: "Grid" },
      { id: "services_matrix",     label: "Πίνακας Υπηρεσιών", icon: "Calendar" },
      { id: "generator",           label: "Όρια Υπηρεσιών",    icon: "Shield" },
      { id: "services_printables", label: "Εκτυπωτικά",        icon: "Printer" },
      { id: "services_settings",   label: "Ρυθμίσεις",         icon: "Settings" },
    ],
  },
  {
    id: "kepik",
    label: "ΚΕΠΙΚ",
    icon: "Droplet",
    subItems: [
      { id: "kepik_form",       label: "Φόρμα Αναφοράς Βλάβης", icon: "Edit" },
      { id: "kepik_status",     label: "Κατάσταση Βλαβών",       icon: "List" },
      { id: "kepik_settings",   label: "Ρυθμίσεις",              icon: "Settings" },
      { id: "kepik_printables", label: "Εκτυπωτικά",             icon: "Printer" },
    ],
  },
  {
    id: "mil",
    label: "Εγκαταστάτων / Υπόγειο Καλώδιο",
    icon: "Globe",
    subItems: [
      { id: "mil_map",           label: "Χάρτης",         icon: "Grid" },
      { id: "mil_network",       label: "Υπόγειο Δίκτυο", icon: "Globe" },
      { id: "mil_active_faults", label: "Ενεργές Βλάβες", icon: "ShieldAlert" },
      { id: "mil_works",         label: "Εργασίες",       icon: "Edit" },
      { id: "mil_history",       label: "Ιστορικό",       icon: "Clock" },
      { id: "mil_inventory",     label: "Αποθήκη",        icon: "Briefcase" },
      { id: "mil_settings",      label: "Ρυθμίσεις",      icon: "Settings" },
      { id: "mil_save",          label: "Αποθήκευση",     icon: "Save" },
    ],
  },
  {
    id: "drones",
    label: "Μη Επανδρωμένα Αεροσκάφη",
    icon: "Plane",
    subItems: [
      { id: "drone_operators",   label: "Χειριστές",         icon: "Users" },
      { id: "drones_registry",   label: "Αεροσκάφη",         icon: "Plane" },
      { id: "drone_flights",     label: "Ημερολόγιο Πτήσεων", icon: "Calendar" },
      { id: "drone_printables",  label: "Εκτυπωτικά",         icon: "Printer" },
      { id: "drone_settings",    label: "Ρυθμίσεις",          icon: "Settings" },
    ],
  },
];

// Helper: επιστρέφει όλες τις υποκαρτέλες σε flat λίστα με context του parent
export function getAllSubItems() {
  const out = [];
  for (const main of MENU_STRUCTURE) {
    for (const sub of main.subItems) {
      out.push({
        mainTabId: main.id,
        mainTabLabel: main.label,
        subTabId: sub.id,
        subTabLabel: sub.label,
        icon: sub.icon,
      });
    }
  }
  return out;
}

// Helper: key για DB lookup (main_tab_id + sub_tab_id)
export function featureKey(mainTabId, subTabId) {
  return `${mainTabId}::${subTabId}`;
}
