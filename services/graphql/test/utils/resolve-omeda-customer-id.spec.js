const { describe, it } = require('mocha');
const { expect } = require('chai');
const resolveOmedaCustomerId = require('../../src/utils/resolve-omeda-customer-id');

const ENCRYPTED = '9130C2719701F5S';
const SURVIVOR = '1108476082ABCDE';

/**
 * Stubs the api client's `customer` resource. `lookup` receives the params
 * `lookupByEncryptedId` was called with and returns (or throws) whatever the case needs.
 */
const clientWith = (lookup) => {
  const calls = [];
  return {
    calls,
    apiClient: {
      resource: (name) => {
        if (name !== 'customer') throw new Error(`unexpected resource ${name}`);
        return {
          lookupByEncryptedId: async (params) => {
            calls.push(params);
            return lookup(params);
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
  it('returns the numeric id for a live encrypted id, without reporting an error', async () => {
    const { apiClient, calls } = clientWith(() => ({ data: { Id: 1105483508 } }));
    const { errors, noticeError } = noticer();

    const id = await resolveOmedaCustomerId({
      apiClient,
      encryptedCustomerId: ENCRYPTED,
      noticeError,
    });

    expect(id).to.equal(1105483508);
    expect(errors).to.have.lengthOf(0);
    // Merge-following must be requested, and a miss must not throw -- both are load-bearing.
    expect(calls).to.deep.equal([{
      encryptedId: ENCRYPTED,
      reQueryOnInactive: true,
      errorOnNotFound: false,
    }]);
  });

  it('follows a merge chain to the surviving customer', async () => {
    // `lookupByEncryptedId` recurses internally on the "valid but not active" 404, so a merged id
    // surfaces here as a successful response carrying the survivor's numeric id.
    const { apiClient } = clientWith(({ encryptedId }) => {
      expect(encryptedId).to.equal(ENCRYPTED);
      return { data: { Id: 1100158437, EncryptedCustomerId: SURVIVOR } };
    });
    const { errors, noticeError } = noticer();

    const id = await resolveOmedaCustomerId({
      apiClient,
      encryptedCustomerId: ENCRYPTED,
      noticeError,
    });

    expect(id).to.equal(1100158437);
    expect(errors).to.have.lengthOf(0);
  });

  it('falls back to email matching on a hard 404 (empty success-shaped response)', async () => {
    // Under `errorOnNotFound: false` a genuine miss resolves with no `Id` rather than throwing.
    const { apiClient } = clientWith(() => ({ data: {} }));
    const { errors, noticeError } = noticer();

    const id = await resolveOmedaCustomerId({
      apiClient,
      encryptedCustomerId: ENCRYPTED,
      noticeError,
    });

    expect(id).to.equal(null);
    expect(errors).to.have.lengthOf(1);
    expect(errors[0].message).to.contain('not found');
  });

  it('falls back to email matching when validation rejects a malformed id', async () => {
    // Encrypted ids are exactly 15 characters, so Joi throws before any HTTP call is made.
    const { apiClient } = clientWith(() => {
      throw new Error('"encryptedId" length must be 15 characters long');
    });
    const { errors, noticeError } = noticer();

    const id = await resolveOmedaCustomerId({
      apiClient,
      encryptedCustomerId: 'too-short',
      noticeError,
    });

    expect(id).to.equal(null);
    expect(errors).to.have.lengthOf(1);
    expect(errors[0].message).to.contain('length must be 15');
  });

  it('falls back to email matching on any other API error', async () => {
    const { apiClient } = clientWith(() => { throw new Error('socket hang up'); });
    const { errors, noticeError } = noticer();

    const id = await resolveOmedaCustomerId({
      apiClient,
      encryptedCustomerId: ENCRYPTED,
      noticeError,
    });

    expect(id).to.equal(null);
    expect(errors).to.have.lengthOf(1);
    expect(errors[0].message).to.contain('socket hang up');
  });

  it('returns null without an API call or an error report when no id is stored', async () => {
    const { apiClient, calls } = clientWith(() => { throw new Error('should not be called'); });
    const { errors, noticeError } = noticer();

    const ids = await Promise.all([undefined, null, ''].map((encryptedCustomerId) => (
      resolveOmedaCustomerId({ apiClient, encryptedCustomerId, noticeError })
    )));
    expect(ids).to.deep.equal([null, null, null]);

    expect(calls).to.have.lengthOf(0);
    // Having no stored id is the common case, not a failure -- it must not create error noise.
    expect(errors).to.have.lengthOf(0);
  });
});
