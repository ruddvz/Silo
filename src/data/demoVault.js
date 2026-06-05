export const SEED_DOCS = [
  { id: 1, name: "passport_scan.pdf", tag: "Identity", kind: "pdf", date: "Mar 12, 2024", size: "2.1 MB", source: "demo", createdAt: "2024-03-12T12:00:00.000Z" },
  { id: 2, name: "drivers_license.pdf", tag: "Identity", kind: "pdf", date: "Jan 08, 2024", size: "980 KB", source: "demo", createdAt: "2024-01-08T12:00:00.000Z" },
  { id: 11, name: "sincard.pdf", tag: "Identity", kind: "pdf", date: "May 01, 2023", size: "150 KB", source: "demo", createdAt: "2023-05-01T12:00:00.000Z" },
  { id: 3, name: "hydro_bill_feb.pdf", tag: "Utilities", kind: "pdf", date: "Feb 28, 2024", size: "340 KB", source: "demo", createdAt: "2024-02-28T12:00:00.000Z" },
  { id: 8, name: "hydro_bill_jan.pdf", tag: "Utilities", kind: "pdf", date: "Jan 29, 2024", size: "310 KB", source: "demo", createdAt: "2024-01-29T12:00:00.000Z" },
  { id: 4, name: "lease_agreement.pdf", tag: "Housing", kind: "pdf", date: "Sep 01, 2023", size: "4.8 MB", source: "demo", createdAt: "2023-09-01T12:00:00.000Z" },
  { id: 12, name: "lease_renewal_2024.pdf", tag: "Housing", kind: "pdf", date: "Mar 15, 2024", size: "3.1 MB", source: "demo", createdAt: "2024-03-15T12:00:00.000Z" },
  { id: 5, name: "t4_2023.pdf", tag: "Tax", kind: "pdf", date: "Feb 20, 2024", size: "1.2 MB", source: "demo", createdAt: "2024-02-20T12:00:00.000Z" },
  { id: 9, name: "bank_statement_mar.pdf", tag: "Finance", kind: "pdf", date: "Mar 31, 2024", size: "890 KB", source: "demo", createdAt: "2024-03-31T12:00:00.000Z" },
  { id: 10, name: "void_cheque.pdf", tag: "Finance", kind: "pdf", date: "Nov 10, 2023", size: "220 KB", source: "demo", createdAt: "2023-11-10T12:00:00.000Z" },
  { id: 6, name: "insurance_auto.pdf", tag: "Insurance", kind: "pdf", date: "Jan 15, 2024", size: "2.6 MB", source: "demo", createdAt: "2024-01-15T12:00:00.000Z" },
  { id: 7, name: "college_diploma.pdf", tag: "Education", kind: "pdf", date: "Jun 15, 2022", size: "5.3 MB", source: "demo", createdAt: "2022-06-15T12:00:00.000Z" },
  {
    id: 20,
    name: "WhatsApp — rent reminder.txt",
    tag: "Moments",
    kind: "text",
    date: "Apr 02, 2024",
    size: "420 B",
    source: "demo",
    createdAt: "2024-04-02T18:30:00.000Z",
  },
];

export const DEMO_INDEX_BOOST = {
  1: "passport travel identity citizenship",
  2: "driver license driving permit identification",
  11: "social insurance national identity card",
  3: "hydro electricity utility bill power",
  8: "hydro electricity utility bill power",
  4: "lease rent housing apartment landlord",
  12: "lease renewal housing rent",
  5: "income tax t4 employment earnings",
  9: "bank account statement finance",
  10: "cheque checking account void finance",
  6: "auto vehicle car insurance policy",
  7: "university college degree diploma education",
  20: "whatsapp message forwarded note self chat reminder landlord rent due april",
};

export const DEMO_TEXT_BODY = {
  20: "Hey — reminder rent is due April 5. E-transfer to the usual address. Thx!",
};

/** Demo vault is opt-in only — never mixed with real local data in production builds. */
export function isDemoDataEnabled() {
  return import.meta.env.VITE_ENABLE_DEMO_DATA === "true";
}

export function getInitialDemoDocs() {
  if (!isDemoDataEnabled()) return [];
  return SEED_DOCS.map((d) => ({ ...d, kind: d.kind || "pdf" }));
}

export function getInitialDemoContentById() {
  if (!isDemoDataEnabled()) return {};
  const o = {};
  for (const d of SEED_DOCS) {
    if (d.kind === "text" && DEMO_TEXT_BODY[d.id]) o[d.id] = DEMO_TEXT_BODY[d.id];
    else {
      o[d.id] = `${String(d.name).replace(/\.(pdf|txt)$/i, "").replace(/_/g, " ")} ${d.tag} ${DEMO_INDEX_BOOST[d.id] || ""}`;
    }
  }
  return o;
}
