import { create, insert, search } from "@orama/orama";

/**
 * @param {Array<{ id: string | number, name: string, tag: string, content: string }>} documents
 */
export function buildVaultSearchIndex(documents) {
  const db = create({
    schema: {
      docId: "string",
      name: "string",
      tag: "string",
      content: "string",
    },
    components: {
      tokenizer: {
        tokenize: (raw, _language, prop) => {
          if (prop === "content" || prop === "name") {
            return String(raw)
              .toLowerCase()
              .split(/[\s\-_/.,;:!?()[\]{}]+/)
              .filter(Boolean);
          }
          return [String(raw).toLowerCase()];
        },
      },
    },
  });

  for (const d of documents) {
    insert(db, {
      docId: String(d.id),
      name: d.name,
      tag: d.tag,
      content: `${d.name} ${d.tag} ${d.content}`,
    });
  }

  return {
    /**
     * @param {string} term
     * @returns {Set<string> | null} null = no filter (empty query); otherwise docIds matching
     */
    matchingDocIds(term) {
      const t = term.trim();
      if (!t) return null;
      const res = search(db, {
        term: t,
        properties: ["content", "name"],
        limit: 500,
        tolerance: 1,
      });
      return new Set(res.hits.map((h) => h.document.docId));
    },
  };
}
