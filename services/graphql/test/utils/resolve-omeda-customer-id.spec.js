const { describe, it } = require('mocha');
const { expect } = require('chai');
const resolveOmedaCustomerId = require('../../src/utils/resolve-omeda-customer-id');

const LIVE = '9130C2719701F5S';
const MERGED = '6466A3060334H6A';
const DEAD = '0240G4865912F6U';
const OTHER = '8353H2978223H9M';

/**
 * Stubs the api client's `customer` resource. `byId` maps an encrypted id to either a numeric
 * customer id, `null` (a hard 404 -- resolves empty rather than throwing), or an Error to throw.
 */
const clientWith = (byId) => {
  const calls = [];
  return {
    calls,
    apiClient: {
      resource: (name) => {
        if (name !== 'customer') throw new Error(`unexpected resource ${name}`);
        return {
          lookupByEncryptedId: async (params) => {
            calls.push(params);
            const result = byId[params.encryptedId];
            if (result instanceof Error) throw result;
            return { data: result == null ? {} : { Id: result } };
          },
        };
      },
    },
  };
};

const noticer = () => {
  const errors = [];
  return { errors, noticeError: (e) => errors.push(e) };
};

describe('utils/resolve-omeda-customer-id', () => {
  it('resolves a single live encrypted id, without reporting an error', async () => {
    const { apiClient, calls } = clientWith({ [LIVE]: 1105483508 });
    const { errors, noticeError } = noticer();

    const id = await resolveOmedaCustomerId({
      apiClient,
      encryptedCustomerIds: [LIVE],
      noticeError,
    });

    expect(id).to.equal(1105483508);
    expect(errors).to.have.lengthOf(0);
    // Merge-following must be requested, and a miss must not throw -- both are load-bearing.
    expect(calls).to.deep.equal([{
      encryptedId: LIVE,
      reQueryOnInactive: true,
      errorOnNotFound: false,
    }]);
  });

  it('follows a merge chain to the surviving customer', async () => {
    // `lookupByEncryptedId` recurses internally on the "valid but not active" 404, so a merged id
    // surfaces here as a successful response carrying the survivor's numeric id.
    const { apiClient } = clientWith({ [MERGED]: 1100158437 });
    const { errors, noticeError } = noticer();

    const id = await resolveOmedaCustomerId({
      apiClient,
      encryptedCustomerIds: [MERGED],
      noticeError,
    });

    expect(id).to.equal(1100158437);
    expect(errors).to.have.lengthOf(0);
  });

  it('uses the id when several candidates CONVERGE on one customer', async () => {
    // The common multi-id case, and the reason this takes a list: a member holds a stale id plus
    // the survivor's, and merge-following collapses both onto the same record. There is nothing to
    // choose, so the id is safe to use -- refusing here would strand ~a third of multi-id members
    // on email matching for no reason.
    const { apiClient, calls } = clientWith({ [MERGED]: 1100158437, [LIVE]: 1100158437 });
    const { errors, noticeError } = noticer();

    const id = await resolveOmedaCustomerId({
      apiClient,
      encryptedCustomerIds: [MERGED, LIVE],
      noticeError,
    });

    expect(id).to.equal(1100158437);
    expect(calls).to.have.lengthOf(2);
    expect(errors).to.have.lengthOf(0);
  });

  it('ignores dead candidates and uses the one live answer', async () => {
    // A dead id is not disqualifying -- it carries no claim about a write target.
    const { apiClient } = clientWith({ [DEAD]: null, [LIVE]: 1105483508 });
    const { errors, noticeError } = noticer();

    const id = await resolveOmedaCustomerId({
      apiClient,
      encryptedCustomerIds: [DEAD, LIVE],
      noticeError,
    });

    expect(id).to.equal(1105483508);
    expect(errors).to.have.lengthOf(0);
  });

  it('uses the live answer when a THIRD candidate is dead and two others converge', async () => {
    // Three ids, two resolving to the same active customer and one no longer resolving at all.
    // The dead id makes no claim about a write target, so the agreeing pair wins.
    const { apiClient } = clientWith({
      [LIVE]: 1105483508,
      [MERGED]: 1105483508,
      [DEAD]: null,
    });
    const { errors, noticeError } = noticer();

    const id = await resolveOmedaCustomerId({
      apiClient,
      encryptedCustomerIds: [LIVE, MERGED, DEAD],
      noticeError,
    });

    expect(id).to.equal(1105483508);
    expect(errors).to.have.lengthOf(0);
  });

  it('drops a malformed candidate without letting it veto a live sibling', async () => {
    // Not 15 characters, so it can never name a customer. Filtered before any call is made,
    // which is also what keeps it distinguishable from a transport failure.
    const { apiClient, calls } = clientWith({ [LIVE]: 1105483508 });
    const { errors, noticeError } = noticer();

    const id = await resolveOmedaCustomerId({
      apiClient,
      encryptedCustomerIds: ['too-short', LIVE],
      noticeError,
    });

    expect(id).to.equal(1105483508);
    expect(calls.map((c) => c.encryptedId)).to.deep.equal([LIVE]);
    expect(errors).to.have.lengthOf(1);
    expect(errors[0].message).to.contain('malformed');
  });

  it('REFUSES when a candidate errors, even if another resolved cleanly', async () => {
    // A real 404 resolves empty rather than throwing, so a throw means timeout/5xx/transport --
    // we do not know what that id points at, and it could be a second active customer. Using the
    // sibling's answer would be the exact guess this function exists to avoid.
    const { apiClient } = clientWith({
      [LIVE]: 1105483508,
      [OTHER]: new Error('socket hang up'),
    });
    const { errors, noticeError } = noticer();

    const id = await resolveOmedaCustomerId({
      apiClient,
      encryptedCustomerIds: [LIVE, OTHER],
      noticeError,
    });

    expect(id).to.equal(null);
    expect(errors.map((e) => e.message).join(' ')).to.contain('socket hang up');
    expect(errors.map((e) => e.message).join(' ')).to.contain('cannot rule out a second active customer');
  });

  it('falls back when the only candidate errors', async () => {
    const { apiClient } = clientWith({ [LIVE]: new Error('socket hang up') });
    const { errors, noticeError } = noticer();

    const id = await resolveOmedaCustomerId({
      apiClient,
      encryptedCustomerIds: [LIVE],
      noticeError,
    });

    expect(id).to.equal(null);
    expect(errors).to.have.lengthOf(2);
  });

  it('REFUSES when candidates resolve to different ACTIVE customers', async () => {
    // Two simultaneously-active records for one member: a genuine duplicate pair, not a merge.
    // Choosing would decide which record receives every future write, so fall back to email.
    // Measured Aug 2026: 27 of 40 sampled ambiguous members look like this.
    const { apiClient } = clientWith({ [LIVE]: 1105483508, [OTHER]: 1108476082 });
    const { errors, noticeError } = noticer();

    const id = await resolveOmedaCustomerId({
      apiClient,
      encryptedCustomerIds: [LIVE, OTHER],
      noticeError,
    });

    expect(id).to.equal(null);
    expect(errors).to.have.lengthOf(1);
    expect(errors[0].message).to.contain('are all active for the same member');
    // The report must name the customers, so the pairs needing an Omeda merge are identifiable.
    expect(errors[0].message).to.contain('1105483508');
    expect(errors[0].message).to.contain('1108476082');
  });

  it('falls back to email matching when no candidate is active', async () => {
    const { apiClient } = clientWith({ [DEAD]: null, [OTHER]: null });
    const { errors, noticeError } = noticer();

    const id = await resolveOmedaCustomerId({
      apiClient,
      encryptedCustomerIds: [DEAD, OTHER],
      noticeError,
    });

    expect(id).to.equal(null);
    expect(errors).to.have.lengthOf(1);
    expect(errors[0].message).to.contain('none are active');
  });

  it('dedupes identical candidates rather than treating them as ambiguous', async () => {
    const { apiClient, calls } = clientWith({ [LIVE]: 1105483508 });
    const { errors, noticeError } = noticer();

    const id = await resolveOmedaCustomerId({
      apiClient,
      encryptedCustomerIds: [LIVE, LIVE, LIVE],
      noticeError,
    });

    expect(id).to.equal(1105483508);
    expect(calls).to.have.lengthOf(1);
    expect(errors).to.have.lengthOf(0);
  });

  it('refuses more than four candidates rather than sampling an arbitrary subset', async () => {
    // Latency guard on the auth blocking path. Sampling would reintroduce the guess.
    const { apiClient, calls } = clientWith({});
    const { errors, noticeError } = noticer();

    const id = await resolveOmedaCustomerId({
      apiClient,
      encryptedCustomerIds: [LIVE, MERGED, DEAD, OTHER, '1234A5678901B2C'],
      noticeError,
    });

    expect(id).to.equal(null);
    expect(calls).to.have.lengthOf(0);
    expect(errors).to.have.lengthOf(1);
    expect(errors[0].message).to.contain('max 4');
  });

  it('returns null without an API call or an error report when no ids are supplied', async () => {
    const { apiClient, calls } = clientWith({});
    const { errors, noticeError } = noticer();

    const ids = await Promise.all([undefined, null, [], ['', null]].map((encryptedCustomerIds) => (
      resolveOmedaCustomerId({ apiClient, encryptedCustomerIds, noticeError })
    )));

    expect(ids).to.deep.equal([null, null, null, null]);
    expect(calls).to.have.lengthOf(0);
    // Holding no stored id is the common case, not a failure -- it must not create error noise.
    expect(errors).to.have.lengthOf(0);
  });
});
