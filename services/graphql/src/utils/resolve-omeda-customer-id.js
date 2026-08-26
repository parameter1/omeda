/**
 * Resolves a stored *encrypted* Omeda customer id to the canonical, currently-active numeric
 * customer id, so `rapidCustomerIdentification` can send `OmedaCustomerId` on the Save Customer
 * and Order body and bypass Omeda's heuristic identity resolution entirely.
 *
 * ## Why this exists
 *
 * SCAO matched on email alone mints duplicate customers whenever it cannot confidently match.
 * Measured on athleticbusiness (Aug 2026): 8 of 11 duplicates were created at the *exact second*
 * of a progressive-profile submit, and 7 of 8 were empty shells — no name, no company, no address.
 * That is what Omeda writes when the payload carries an email and nothing else to match on. The
 * progressive-profile audience is identified-but-not-authenticated members created seconds earlier
 * from an email link, whose IdentityX record is email-only by construction, so their payload can
 * never carry contact fields. Their *encrypted customer id*, however, is already stored — written
 * within a second of member creation, well before the submit. Sending it is the only identifying
 * data those payloads can carry.
 *
 * ## Why it resolves rather than trusting the stored value
 *
 * Omeda merges duplicate customers routinely, so a stored id may point at a record that has been
 * merged away. `lookupByEncryptedId` already follows those chains — it recurses on the
 * "customer id X is valid but not active ... please use Y" 404, transitively, and the client
 * force-throws that 404 shape regardless of `errorOnNotFound`. So one live lookup yields the
 * surviving record's numeric id.
 *
 * **Deliberately uncached.** The api client this runs against is built with no cache, and it must
 * stay that way here: a cached pre-merge record would return exactly the stale id this resolution
 * exists to replace.
 *
 * ## Failure is never fatal
 *
 * Every failure mode returns `null`, and a `null` return means the caller sends today's email-only
 * body. A stale, merged, malformed or unknown id must never break identification — the mutation
 * sits on the blocking path of authentication on every fleet site. The three modes:
 *
 * - **Joi rejects the value** before any HTTP call (encrypted ids are exactly 15 characters), which
 *   is how a truncated or garbage stored id surfaces.
 * - **A hard 404 under `errorOnNotFound: false`** resolves successfully with an empty, success-
 *   shaped response, so the absence of `data.Id` is the signal — the same guard the
 *   `customerByEncryptedId` query already uses.
 * - **Any other API error** — timeout, 5xx, auth.
 *
 * @param {object} params
 * @param {object} params.apiClient The Omeda API client.
 * @param {string} [params.encryptedCustomerId] The stored encrypted customer id, if any.
 * @param {function} params.noticeError Error reporter (New Relic's `noticeError`).
 * @returns {Promise<number|null>} The canonical numeric customer id, or `null` to fall back.
 */
module.exports = async ({ apiClient, encryptedCustomerId, noticeError } = {}) => {
  // Not an error: the vast majority of callers simply have no stored id yet.
  if (!encryptedCustomerId) return null;

  try {
    const response = await apiClient.resource('customer').lookupByEncryptedId({
      encryptedId: encryptedCustomerId,
      // Follow merge chains to the surviving record. This is the whole point.
      reQueryOnInactive: true,
      // Do not throw on a genuine miss -- an unknown id must fall back, not fail the mutation.
      errorOnNotFound: false,
    });

    const id = response && response.data ? response.data.Id : null;
    if (!id) {
      noticeError(new Error(`Unable to resolve Omeda customer from encrypted id ${encryptedCustomerId}: not found. Falling back to email matching.`));
      return null;
    }
    return id;
  } catch (e) {
    noticeError(new Error(`Unable to resolve Omeda customer from encrypted id ${encryptedCustomerId}: ${e.message}. Falling back to email matching.`));
    return null;
  }
};
