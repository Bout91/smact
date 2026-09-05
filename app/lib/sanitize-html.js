// ─────────────────────────────────────────────────────────
// Simple HTML sanitizer για το rich text του admin.
//
// Επιτρέπει: <p>, <br>, <b>, <strong>, <i>, <em>, <u>,
//            <ul>, <ol>, <li>, <h2>, <h3>, <a href="http(s)">
//
// Απορρίπτει: <script>, <iframe>, on*=, javascript:, όλα τα υπόλοιπα tags & attributes
//
// Τρέχει server-side πριν το INSERT στη DB, οπότε το output είναι safe
// για rendering με dangerouslySetInnerHTML στον client.
// ─────────────────────────────────────────────────────────

const ALLOWED_TAGS = new Set([
  "p", "br", "b", "strong", "i", "em", "u",
  "ul", "ol", "li", "h2", "h3", "a",
]);

const ALLOWED_ATTRS = {
  a: ["href", "target", "rel"],
};

const SAFE_URL_RE = /^https?:\/\//i;

export function sanitizeHtml(input) {
  if (typeof input !== "string") return "";
  if (input.length > 50000) input = input.slice(0, 50000); // hard cap 50KB

  // 1) Αφαίρεσε ολόκληρα script/style/iframe blocks (και ό,τι υπάρχει μέσα)
  let s = input.replace(
    /<(script|style|iframe|object|embed|form|input|button|textarea|select|link|meta)\b[\s\S]*?<\/\1\s*>/gi,
    ""
  );
  // Αν έμειναν orphan opening tags από τα παραπάνω
  s = s.replace(
    /<\/?(script|style|iframe|object|embed|form|input|button|textarea|select|link|meta)\b[^>]*>/gi,
    ""
  );

  // 2) Επεξεργασία tag-by-tag με whitelist
  s = s.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, closing, tag, attrs) => {
    const lowerTag = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(lowerTag)) return "";

    // Closing tag
    if (closing === "/") return `</${lowerTag}>`;

    // Self-closing tags
    if (lowerTag === "br") return "<br />";

    // Attributes: μόνο τα επιτρεπόμενα ανά tag
    const allowed = ALLOWED_ATTRS[lowerTag] || [];
    let cleanAttrs = "";

    if (allowed.length > 0) {
      // Βρες κάθε attribute="value" ή attribute='value'
      const attrRe = /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*"([^"]*)"|([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*'([^']*)'/g;
      let m;
      while ((m = attrRe.exec(attrs)) !== null) {
        const attrName = (m[1] || m[3] || "").toLowerCase();
        const attrValue = m[2] !== undefined ? m[2] : m[4];
        if (!allowed.includes(attrName)) continue;

        // Ειδικά για href: μόνο http(s)
        if (attrName === "href") {
          if (!SAFE_URL_RE.test(attrValue)) continue;
        }
        // Ειδικά για target: μόνο _blank
        if (attrName === "target" && attrValue !== "_blank") continue;

        // Escape " στο value (αν και βγαίνει από regex με ", σπάνιο να έχει άλλα)
        const escaped = attrValue.replace(/"/g, "&quot;");
        cleanAttrs += ` ${attrName}="${escaped}"`;
      }

      // Για <a target="_blank">, πρόσθεσε rel="noopener noreferrer" ασφαλείας
      if (lowerTag === "a" && /target\s*=\s*"_blank"/i.test(cleanAttrs)) {
        if (!/\brel\s*=/i.test(cleanAttrs)) {
          cleanAttrs += ' rel="noopener noreferrer"';
        }
      }
    }

    return `<${lowerTag}${cleanAttrs}>`;
  });

  // 3) Αφαίρεσε τυχόν comments
  s = s.replace(/<!--[\s\S]*?-->/g, "");

  return s.trim();
}
