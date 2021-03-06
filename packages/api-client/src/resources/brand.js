const AbstractResource = require('./abstract');
const BrandComprehensiveResponse = require('../response/brand/comp');
const BrandBehaviorLookupResponse = require('../response/brand/behavior/lookup');
const BrandBehaviorActionLookupResponse = require('../response/brand/behavior/lookup/action');
const BrandBehaviorAttributeLookupResponse = require('../response/brand/behavior/lookup/attribute');
const BrandBehaviorCategoryLookupResponse = require('../response/brand/behavior/lookup/category');

class BrandResource extends AbstractResource {
  /**
   * This API provides capabilities to retrieve information about a single brand, including
   * its defined products, demographics, deployment types, and other cross referencing information.
   * This service is useful for building your own data mapping service when reading or writing
   * from/to other Omeda services. Results from this API should be cached and then refreshed at an
   * interval by the user. This API is not intended to be hit real time by web traffic or otherwise
   * hit with a great frequency.
   *
   * @link https://main.omeda.com/knowledge-base/brand-comprehensive-lookup/
   * @returns {Promise<BrandComprehensiveResponse>} A Set of the found customer IDs.
   */
  async comprehensiveLookup() {
    const endpoint = 'comp/*';
    const response = await this.client.get({ endpoint });
    return new BrandComprehensiveResponse({ response, resource: this });
  }

  /**
   * The Behavior Lookup API provides the ability to retrieve behaviors and related data, such as
   * categories, actions, and attributes.
   *
   * @link https://training.omeda.com/knowledge-base/behavior-lookup/
   * @param {object} params
   * @returns {Promise<BrandBehaviorLookupResponse>}
   */
  async behaviorLookup() {
    const endpoint = 'behavior/*';
    const response = await this.client.get({ endpoint, errorOnNotFound: false });
    return new BrandBehaviorLookupResponse({ response, resource: this });
  }

  /**
   * The Behavior Action Lookup API provides the ability to retrieve behavior actions.
   *
   * @link https://training.omeda.com/knowledge-base/behavior-actions-lookup/
   * @param {object} params
   * @param {string} params.trackId
   * @returns {Promise<BrandBehaviorActionLookupResponse>}
   */
  async behaviorActionsLookup() {
    const endpoint = 'behavior/action/*';
    const response = await this.client.get({ endpoint, errorOnNotFound: false });
    return new BrandBehaviorActionLookupResponse({ response, resource: this });
  }

  /**
   * The Behavior Category Lookup API provides the ability to retrieve behavior actions.
   *
   * @link https://training.omeda.com/knowledge-base/behavior-actions-lookup/
   * @param {object} params
   * @param {string} params.trackId
   * @returns {Promise<BrandBehaviorCategoryLookupResponse>}
   */
  async behaviorCategoriesLookup() {
    const endpoint = 'behavior/category/*';
    const response = await this.client.get({ endpoint, errorOnNotFound: false });
    return new BrandBehaviorCategoryLookupResponse({ response, resource: this });
  }

  /**
   * The Behavior Attribute Lookup API provides the ability to retrieve behavior attributes.
   *
   * @link https://training.omeda.com/knowledge-base/api-store-behavior-attribute/
   * @note The behavior attribute lookup API is undocumented, and behavior is inferred
   *
   * @param {object} params
   * @param {string} params.trackId
   * @returns {Promise<BrandBehaviorAttributeLookupResponse>}
   */
  async behaviorAttributesLookup() {
    const endpoint = 'behavior/attribute/*';
    const response = await this.client.get({ endpoint, errorOnNotFound: false });
    return new BrandBehaviorAttributeLookupResponse({ response, resource: this });
  }
}

module.exports = BrandResource;
