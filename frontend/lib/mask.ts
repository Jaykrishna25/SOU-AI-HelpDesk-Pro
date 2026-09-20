/* ============================================================
   Masking for identifiers shown back to someone who has not yet
   proved they are the account holder.

   Pure, so the rule is unit tested. The point of a mask is to let
   the right person recognise their own address while telling the
   wrong person as little as possible - "does this look like your
   mailbox?" rather than "here is where to send the phishing mail".
   ============================================================ */

/**
 * a.student@silveroakuni.ac.in -> a*********@silveroakuni.ac.in
 *
 * The domain is kept whole: every account here is on a handful of
 * institutional domains, so hiding it protects nothing and costs the
 * recognition the mask exists to provide. A one-character local part is
 * still reduced to a single star rather than shown, which is the case a
 * naive slice(0,1) + stars gets wrong by revealing the whole thing.
 */
export function maskEmail(email?: string | null): string {
  const value = String(email || "").trim();
  const at = value.lastIndexOf("@");
  if (at < 1 || at === value.length - 1) return "";

  const local = value.slice(0, at);
  const domain = value.slice(at + 1);

  const shown = local.length > 2 ? local[0] : "";
  const stars = "*".repeat(Math.max(1, local.length - shown.length));
  return shown + stars + "@" + domain;
}
