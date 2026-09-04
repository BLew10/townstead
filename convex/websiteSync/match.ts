/**
 * Deciding whether an advertiser is already on the website.
 *
 * Kept pure and separate because getting this wrong is expensive in a way the
 * other pieces are not. An earlier attempt at the same problem matched on
 * company name alone and quietly collapsed four State Farm agents, three
 * Edward Jones advisers and three Mathnasium franchises onto one business
 * apiece — the sort of mistake nobody notices until an invoice goes to the
 * wrong person. So a name is only trusted when it is unique on both sides, and
 * anything less becomes a new profile rather than a guess.
 */

import type { ProfileRow } from "./website";

export type MatchDecision =
  | { action: "update"; id: string; how: "link" | "email" | "name" }
  | { action: "create"; how: "new" };

export interface Candidates {
  byContactId: ProfileRow[];
  byEmail: ProfileRow[];
  byName: ProfileRow[];
}

/** A row already tied to a different contact must never be taken over. */
function unclaimed(row: ProfileRow, contactId: string): boolean {
  const claim = row.townstead_contact_id;
  return !claim || claim === contactId;
}

export function chooseProfile(
  contactId: string,
  candidates: Candidates
): MatchDecision {
  // Already linked. This is the only match that stays true no matter how the
  // company is renamed or who the contact email belongs to now.
  const linked = candidates.byContactId[0];
  if (linked) return { action: "update", id: linked.id, how: "link" };

  // An email address identifies one business. Two rows sharing one means the
  // website has a duplicate of its own, which is not this sync's to resolve.
  const emails = candidates.byEmail.filter((r) => unclaimed(r, contactId));
  if (candidates.byEmail.length === 1 && emails.length === 1) {
    return { action: "update", id: emails[0].id, how: "email" };
  }

  // A name only counts when exactly one business on the website carries it.
  const names = candidates.byName.filter((r) => unclaimed(r, contactId));
  if (candidates.byName.length === 1 && names.length === 1) {
    return { action: "update", id: names[0].id, how: "name" };
  }

  return { action: "create", how: "new" };
}
