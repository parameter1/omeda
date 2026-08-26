/**
 * Resolves the caller's stored *encrypted* Omeda customer ids to the one canonical, currently
 * active numeric customer id — but **only when they agree**. `rapidCustomerIdentification` then
 * sends it as SCAO's `OmedaCustomerId`, bypassing Omeda's heuristic identity resolution.
 *
 * ## Why this exists
 *
 * SCAO matched on email alone mints duplicate customers whenever it cannot confidently match.
 * Measured on athleticbusiness (Aug 2026): 8 of 11 duplicates were created at the *exact second*
 * of a progressive-profile submit, and 7 of 8 were empty shells — no name, no company, no address.
 * That is what Omeda writes when the payload carries an email and nothing else to match on. The
 * progressive-profile audience is identified-but-not-authenticated members created seconds earlier
 * from an email link, whose IdentityX record is email-only by construction, so their payload can
 * never carry contact fields. Their encrypted customer id, however, is already stored — written
 * within a second of member creation, well before the submit. Sending it is the only identifying
 * data those payloads can carry.
 *
 * ## Why it takes a list, and why convergence is the rule
 *
 * IdentityX external-id storage appends, so a member accumulates ids over time and can hold several
 * for one brand. Those arrive in two flavours, and they need opposite treatment:
 *
 * - **Merged pairs.** Omeda merges duplicates routinely; the stale id then resolves *to the
 *   survivor*, because `lookupByEncryptedId` recurses on the "customer id X is valid but not
 *   active … please use Y" 404, transitively. Every id in such a set converges on one answer, so
 *   there is nothing to choose and the id is safe to use. Measured: ~32% of ambiguous members.
 * - **Live duplicate pairs.** Both records are simultaneously *active* — not a merge, but two real
 *   customers, typically the good record plus a shell this very bug minted. Measured: 27 of 40
 *   sampled. Here any choice is a guess, and the guess decides which record receives every future
 *   write, so we refuse and let email matching continue exactly as it does today.
 *
 * Hence: resolve all candidates, ignore the ones that are *conclusively* dead, and use the result
 * **only if the survivors agree on a single customer**.
 *
 * ## "Conclusively dead" is narrower than "did not resolve"
 *
 * A candidate is safe to ignore only when it is known to name no active customer. Two do:
 *
 * - **Malformed** — not 15 characters, so it can never be a customer id. Filtered before any call
 *   (this is also what Joi would reject inside `lookupByEncryptedId`).
 * - **Not found** — under `errorOnNotFound: false` a genuine 404 resolves *successfully* with an
 *   empty body, so an absent `data.Id` is a definitive answer, not a failure.
 *
 * An **error** is neither. Because a real 404 does not throw here, a throw means a timeout, a 5xx
 * or a transport failure — i.e. *we do not know what that id points at*. It could be a second
 * active customer. Ignoring it and using a sibling's answer would be precisely the guess this
 * function exists to avoid, so an unresolved-by-error candidate aborts the whole resolution and
 * falls back to email matching. The cost of being wrong here is asymmetric: falling back loses a
 * little determinism for one identification, while guessing writes the member onto a record that
 * may not be theirs, permanently.
 *
 * **Do not "just use the newest".** It is both unknowable and wrong. Unknowable because the
 * stored array's order is not creation order — measured 13 matching vs 14 differing, and
 * `$setUnion` does not guarantee ordering, so position carries no information. Wrong because when
 * creation order *is* determined, the older record is the richer one 9 times to 2 among divergent
 * pairs: the newest id is the empty shell just minted, the oldest is the member's real customer.
 *
 * **Deliberately uncached.** The api client this runs against is built with no cache, and it must
 * stay that way here: a cached pre-merge record would return exactly the stale id this resolution
 * exists to replace.
 *
 * ## Failure is never fatal
 *
 * Every failure mode returns `null`, and `null` means the caller sends today's email-only body. A
 * stale, merged, malformed or unknown id must never break identification — this mutation sits on
 * the blocking path of authentication on every fleet site. The modes: Joi rejects a malformed
 * value before any HTTP call (encrypted ids are exactly 15 characters); a hard 404 under
 * `errorOnNotFound: false` resolves *successfully* with an empty response, so an absent `data.Id`
 * is the signal, matching the guard `customerByEncryptedId` already uses; and any other API error.
 *
 * @param {object} params
 * @param {object} params.apiClient The Omeda API client.
 * @param {string[]} [params.encryptedCustomerIds] Candidate encrypted ids for this customer.
 * @param {function} params.noticeError Error reporter (New Relic's `noticeError`).
 * @returns {Promise<number|null>} The agreed numeric customer id, or `null` to fall back to email.
 */

/**
 * Latency guard. Each candidate is one live Omeda GET, and this runs on the blocking path of
 * authentication. Beyond this the set is refused outright rather than sampled: resolving an
 * arbitrary subset would reintroduce exactly the guess this function exists to avoid. Members
 * holding more than four ids for one brand are vanishingly rare (one on abmedia, two on allured).
 */
const MAX_CANDIDATES = 4;

/** Omeda encrypted customer ids are exactly this long; see the api client's attribute schema. */
const ENCRYPTED_ID_LENGTH = 15;

module.exports = async ({ apiClient, encryptedCustomerIds, noticeError } = {}) => {
  const supplied = [...new Set((encryptedCustomerIds || [])
    .filter((id) => id)
    .map((id) => `${id}`.trim()))];
  // Not an error: most callers have no stored id yet.
  if (!supplied.length) return null;

  // Malformed values can never name a customer, so they carry no claim about a write target and
  // are dropped rather than allowed to veto a sibling. Mirrors the api client's own
  // `encryptedCustomerId` rule (trimmed, exactly 15 chars) -- doing it here keeps a validation
  // throw from being indistinguishable from a transport failure below.
  const candidates = supplied.filter((id) => id.length === ENCRYPTED_ID_LENGTH);
  if (candidates.length !== supplied.length) {
    noticeError(new Error(`Ignoring ${supplied.length - candidates.length} malformed encrypted customer id(s): ${supplied.filter((id) => id.length !== ENCRYPTED_ID_LENGTH).join(', ')}.`));
  }
  if (!candidates.length) return null;

  if (candidates.length > MAX_CANDIDATES) {
    noticeError(new Error(`Refusing to resolve an Omeda customer from ${candidates.length} candidate encrypted ids (max ${MAX_CANDIDATES}). Falling back to email matching.`));
    return null;
  }

  const resource = apiClient.resource('customer');
  const settled = await Promise.all(candidates.map(async (encryptedId) => {
    try {
      const response = await resource.lookupByEncryptedId({
        encryptedId,
        // Follow merge chains to the surviving record. This is what makes a stale id usable.
        reQueryOnInactive: true,
        // A genuine miss must resolve empty, not throw -- "not found" is an answer, not a failure.
        errorOnNotFound: false,
      });
      const id = (response && response.data ? response.data.Id : null) || null;
      return id ? { state: 'active', id } : { state: 'dead' };
    } catch (e) {
      noticeError(new Error(`Unable to resolve Omeda customer from encrypted id ${encryptedId}: ${e.message}.`));
      return { state: 'unknown' };
    }
  }));

  // We do not know what an errored candidate points at, and it could be a second active customer.
  // Refuse rather than let a sibling's answer stand in for it.
  if (settled.some(({ state }) => state === 'unknown')) {
    noticeError(new Error(`Could not resolve every candidate encrypted id (${candidates.join(', ')}); cannot rule out a second active customer. Falling back to email matching.`));
    return null;
  }

  // Conclusively-dead ids are ignored, not disqualifying: a merged-away or unknown id alongside a
  // live one leaves exactly one real answer.
  const resolved = [...new Set(settled.filter((r) => r.state === 'active').map((r) => r.id))];

  if (!resolved.length) {
    noticeError(new Error(`Unable to resolve an Omeda customer from ${candidates.length} encrypted id(s): none are active. Falling back to email matching.`));
    return null;
  }

  if (resolved.length > 1) {
    // Two or more simultaneously-active customers for one member. Choosing would decide which
    // record receives every future write, so refuse -- email matching continues as it does today.
    // These are the pairs that need merging in Omeda; this is the signal that says which.
    noticeError(new Error(`Omeda customer ids ${resolved.join(', ')} are all active for the same member (encrypted ids ${candidates.join(', ')}); cannot choose a write target. Falling back to email matching.`));
    return null;
  }

  return resolved[0];
};
