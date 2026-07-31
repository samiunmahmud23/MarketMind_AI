/**
 * Personalize an email body/subject for a specific recipient.
 * Replaces {{first_name}}, {{name}}, {{company}}, {{email}} tokens.
 *
 * Uses a replacer function to avoid the special replacement-pattern
 * behavior of String.replace (where $&, $`, $', $1, $$ in the
 * replacement string are interpreted). A recipient named "John $mith"
 * or a company containing "$" would otherwise be mangled.
 *
 * This is a PURE function with no backend dependencies, so it's safe to
 * import from both server and client code.
 */
export function personalize(
  text: string,
  recipient: { name?: string | null; email: string; company?: string | null }
): string {
  const fullName = recipient.name?.trim() || "";
  const firstName = fullName.split(/\s+/)[0] || "";
  const company = recipient.company?.trim() || "";
  const safeFirstName = firstName || "there";
  const safeFullName = fullName || "there";
  const safeCompany = company || "your company";
  return text
    .replace(/\{\{first_name\}\}/gi, () => safeFirstName)
    .replace(/\{\{firstname\}\}/gi, () => safeFirstName)
    .replace(/\{\{name\}\}/gi, () => safeFullName)
    .replace(/\{\{full_name\}\}/gi, () => safeFullName)
    .replace(/\{\{company\}\}/gi, () => safeCompany)
    .replace(/\{\{email\}\}/gi, () => recipient.email);
}
