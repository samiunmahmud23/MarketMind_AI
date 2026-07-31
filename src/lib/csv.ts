/**
 * Lightweight CSV parser tuned for email-list uploads.
 * Handles quoted fields, commas inside quotes, and flexible column detection.
 * Extracts and validates email addresses, deduplicates, and maps common name/company columns.
 */

export interface ParsedRecipient {
  email: string;
  name?: string;
  company?: string;
  notes?: string;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

export function parseCsv(input: string): ParsedRecipient[] {
  if (!input || !input.trim()) return [];
  // Strip UTF-8 BOM if present (Excel exports often include it, which
  // breaks header detection because the first column name starts with \uFEFF).
  const cleaned = input.replace(/^\uFEFF/, "");
  const rows = parseRows(cleaned);
  if (rows.length === 0) return [];

  // Detect header
  const first = rows[0].map((c) => c.toLowerCase().trim());
  const headerKeywords = ["email", "name", "company", "first", "last", "business", "organisation", "organization", "notes", "phone"];
  const hasHeader = first.some((c) =>
    headerKeywords.some((k) => c.includes(k))
  );

  let startIdx = 0;
  let headers: string[] = [];
  if (hasHeader) {
    headers = first;
    startIdx = 1;
  }

  const emailCol = headers.findIndex((h) => h.includes("email") || h.includes("mail") || h.includes("e-mail"));
  const nameCol = headers.findIndex((h) => h.includes("name") && !h.includes("company") && !h.includes("business"));
  const firstCol = headers.findIndex((h) => h.includes("first"));
  const lastCol = headers.findIndex((h) => h.includes("last"));
  const companyCol = headers.findIndex((h) => h.includes("company") || h.includes("business") || h.includes("organisation") || h.includes("organization"));
  const notesCol = headers.findIndex((h) => h.includes("notes") || h.includes("note") || h.includes("phone"));

  const seen = new Set<string>();
  const recipients: ParsedRecipient[] = [];

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    let email = "";
    let name: string | undefined;
    let company: string | undefined;
    let notes: string | undefined;

    if (emailCol >= 0 && row[emailCol]) {
      email = row[emailCol].trim();
    } else {
      // find first cell matching email regex
      for (const cell of row) {
        const m = cell.match(EMAIL_RE);
        if (m) {
          email = m[0];
          break;
        }
      }
    }

    // Validate email
    if (!email || !EMAIL_RE.test(email)) {
      // If the row has any email-like substring, extract it
      const m = row.join(" ").match(EMAIL_RE);
      if (m) email = m[0];
      else continue;
    }
    email = email.toLowerCase();

    if (nameCol >= 0) name = row[nameCol]?.trim() || undefined;
    else if (firstCol >= 0 || lastCol >= 0) {
      const f = firstCol >= 0 ? row[firstCol]?.trim() : "";
      const l = lastCol >= 0 ? row[lastCol]?.trim() : "";
      name = [f, l].filter(Boolean).join(" ") || undefined;
    }
    if (companyCol >= 0) company = row[companyCol]?.trim() || undefined;
    if (notesCol >= 0) notes = row[notesCol]?.trim() || undefined;

    if (seen.has(email)) continue;
    seen.add(email);
    recipients.push({ email, name, company, notes });
  }

  return recipients;
}

function parseRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const c = input[i];

    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        cell += c;
        i++;
        continue;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (c === ",") {
        row.push(cell);
        cell = "";
        i++;
        continue;
      } else if (c === "\n") {
        row.push(cell);
        cell = "";
        rows.push(row);
        row = [];
        i++;
        continue;
      } else if (c === "\r") {
        // handle \r\n
        i++;
        continue;
      } else if ((c === ";" || c === "\t") && cell === "" && row.length === 0) {
        // Tolerate ; or tab as a delimiter ONLY in the very first cell of the
        // row — this lets us auto-detect semicolon/tab-separated files (common
        // in European Excel exports) without splitting unquoted content that
        // legitimately contains those characters.
        row.push(cell);
        cell = "";
        i++;
        continue;
      } else {
        cell += c;
        i++;
        continue;
      }
    }
  }
  // last cell
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Quick stats for a parsed list */
export function listStats(recipients: ParsedRecipient[]) {
  return {
    total: recipients.length,
    withName: recipients.filter((r) => r.name).length,
    withCompany: recipients.filter((r) => r.company).length,
  };
}
