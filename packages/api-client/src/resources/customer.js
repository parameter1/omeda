const Joi = require('@parameter1/joi');
const { validateAsync } = require('@parameter1/joi/utils');
const { getAsObject } = require('@parameter1/utils');
const dayjs = require('../dayjs');
const ApiSetResponse = require('../response/set');
const BasicCustomerResponse = require('../response/customer/basic');
const CustomerBehaviorsResponse = require('../response/customer/behaviors');
const CustomerChangeLookupResponse = require('../response/customer/change-lookup');
const CustomerDemographicsResponse = require('../response/customer/demographics');
const CustomerEmailsResponse = require('../response/customer/emails');
const CustomerExternalIdsResponse = require('../response/customer/external-ids');
const CustomerPhoneNumbersResponse = require('../response/customer/phone-numbers');
const CustomerPostalAddressesResponse = require('../response/customer/postal-addresses');
const CustomerSubscriptionsResponse = require('../response/customer/subscriptions');
const AbstractResource = require('./abstract');

class CustomerResource extends AbstractResource {
  /**
   * This service returns a list of Customer Ids for Customers that were
   * changed within a given date range. The date range cannot exceed 90 days.
   *
   * @link https://www.omeda.com/knowledge-base/customer-change-lookup/
   * @param {object} params
   * @param {Date} params.startDate
   * @param {Date} params.endDate
   * @returns {Promise<CustomerChangeLookupResponse>}
   */
  async changeLookup(params = {}) {
    const { startDate, endDate } = await validateAsync(Joi.object({
      startDate: Joi.date().required(),
      endDate: Joi.date().required().default(() => new Date()),
    }).required(), params);
    const now = new Date();
    const format = 'MMDDYYYY_HHmm';
    const start = dayjs.tz(startDate, 'America/Chicago').format(format);
    const end = dayjs.tz(endDate > now ? now : endDate, 'America/Chicago').format(format);
    const endpoint = `customer/change/startdate/${start}/enddate/${end}/*`;
    const response = await this.client.get({ endpoint });
    return new CustomerChangeLookupResponse({ response });
  }

  /**
   * This API provides the ability look up customers using Email Address and an optional Product Id.
   * The response will include a list of customer records including the Customer Id(s)
   * and the Customer Lookup URL(s).
   *
   * @link https://main.omeda.com/knowledge-base/customer-lookup-by-email/
   * @param {object} params
   * @param {string} params.emailAddress The customer's email address.
   * @param {number} [params.productId] An optional product ID.
   * @param {number} [params.errorOnNotFound=false]  Whether to error when not found.
   * @returns {Promise<ApiSetResponse>} A Set of the found customer IDs.
   */
  async lookupByEmailAddress(params = {}) {
    const { emailAddress, productId, errorOnNotFound } = await validateAsync(Joi.object({
      emailAddress: this.schema.emailAddress.required(),
      productId: this.schema.productId,
      errorOnNotFound: Joi.boolean().default(false),
    }).required(), params);

    const endpoint = productId
      ? `customer/email/${emailAddress}/productid/${productId}/*`
      : `customer/email/${emailAddress}/*`;

    try {
      const response = await this.client.get({ endpoint, errorOnNotFound });
      const customerIds = response.getAsArray('Customers').map((customer) => customer.Id);
      return new ApiSetResponse({ data: customerIds, response });
    } catch (e) {
      if (e.status !== 300) throw e;
      // multiple choices. don't treat as error
      const customerIds = e.getAsArray('Customers').map((customer) => customer.Id);
      return new ApiSetResponse({ data: customerIds, response: e });
    }
  }

  /**
   * This API provides the ability look up a Customer by the Encrypted Customer id.
   * The response will include basic Customer information.
   *
   * @link https://main.omeda.com/knowledge-base/customer-lookup-by-encryptedcustomerid/
   * @param {object} params
   * @param {number} params.encryptedId
   * @param {number} [params.reQueryOnInactive=true]
   * @param {number} [params.errorOnNotFound=true]  Whether to error when not found.
   * @returns {Promise<BasicCustomerResponse>} The basic Customer properties
   */
  async lookupByEncryptedId(params = {}) {
    const { encryptedId, reQueryOnInactive, errorOnNotFound } = await validateAsync(Joi.object({
      encryptedId: this.schema.encryptedCustomerId.required(),
      reQueryOnInactive: Joi.boolean().default(true),
      errorOnNotFound: Joi.boolean().default(true),
    }).required(), params);
    const endpoint = `/customer/${encryptedId}/encrypted/*`;
    try {
      const response = await this.client.get({ endpoint, errorOnNotFound });
      return new BasicCustomerResponse({ response, resource: this });
    } catch (e) {
      // on inactive, re-query.
      if (reQueryOnInactive) {
        const inactive = /^customer id [a-z0-9]{15} is valid but not active.+please use ([a-z0-9]{15})/i.exec(e.message);
        if (inactive && inactive[1]) {
          return this.lookupByEncryptedId({ encryptedId: inactive[1], errorOnNotFound });
        }
      }
      throw e;
    }
  }

  /**
   * This API provides the ability look up a Customer by the Customer id.
   * The response will include basic Customer information.
   *
   * @link https://main.omeda.com/knowledge-base/customer-lookup-by-customer-id/
   * @param {object} params
   * @param {number} params.customerId
   * @param {number} [params.reQueryOnInactive=true]
   * @param {number} [params.errorOnNotFound=true]  Whether to error when not found.
   * @returns {Promise<BasicCustomerResponse>} The basic Customer properties
   */
  async lookupById(params = {}) {
    const { customerId, reQueryOnInactive, errorOnNotFound } = await validateAsync(Joi.object({
      customerId: this.schema.customerId.required(),
      reQueryOnInactive: Joi.boolean().default(true),
      errorOnNotFound: Joi.boolean().default(true),
    }).required(), params);
    const endpoint = `/customer/${customerId}/*`;
    try {
      const response = await this.client.get({ endpoint, errorOnNotFound });
      return new BasicCustomerResponse({ response, resource: this });
    } catch (e) {
      // on inactive, re-query.
      if (reQueryOnInactive) {
        const inactive = /^customer id \d+ is valid but not active.+please use (\d+)/i.exec(e.message);
        if (inactive && inactive[1]) {
          return this.lookupById({ customerId: parseInt(inactive[1], 10), errorOnNotFound });
        }
      }
      throw e;
    }
  }

  /**
   * This API provides the ability look up a Customer’s Behaviors by the Customer Id.
   * The response returns behavior information for the specified customer.
   * Behavior information can be requested for a specific behavior OR for behaviors
   * associated with a specific product OR all behaviors
   *
   * @link https://main.omeda.com/knowledge-base/behavior-lookup-by-customer-id/
   * @param {object} params
   * @param {number} params.customerId The customer ID to find behaviors for.
   * @param {number} [params.productId] An optional behavior ID to filter by.
   * @param {boolean} [params.errorOnNotFound=false] Whether to error when not found.
   * @returns {Promise<CustomerBehaviorsResponse>} The customer behaviors.
   */
  async lookupBehaviors(params = {}) {
    const { customerId, behaviorId, errorOnNotFound } = await validateAsync(Joi.object({
      customerId: this.schema.customerId.required(),
      behaviorId: this.schema.behaviorId,
      errorOnNotFound: Joi.boolean().default(false),
    }).required(), params);
    const endpoint = behaviorId
      ? `customer/${customerId}/behavior/${behaviorId}/*`
      : `customer/${customerId}/behavior/*`;
    const response = await this.client.get({ endpoint, errorOnNotFound });
    return new CustomerBehaviorsResponse({ response });
  }

  /**
   * This service returns all available customer demographics stored for a
   * given customer by using the Customer ID.
   *
   * @link https://main.omeda.com/knowledge-base/demographic-lookup-by-customer-id/
   * @param {object} params
   * @param {number} params.customerId The customer ID to find demographics for.
   * @param {boolean} [params.errorOnNotFound=false] Whether to error when not found.
   * @returns {Promise<CustomerDemographicsResponse>} The customer demographics.
   */
  async lookupDemographics(params = {}) {
    const { customerId, errorOnNotFound } = await validateAsync(Joi.object({
      customerId: this.schema.customerId.required(),
      errorOnNotFound: Joi.boolean().default(false),
    }).required(), params);
    const endpoint = `/customer/${customerId}/demographic/*`;
    const response = await this.client.get({ endpoint, errorOnNotFound });
    return new CustomerDemographicsResponse({ response });
  }

  /**
   * This API provides the ability look up a Customer’s Email Addresses by the Customer Id.
   * This service returns all active email address information stored for the given customer.
   *
   * @link https://main.omeda.com/knowledge-base/email-address-lookup-by-customer-id/
   * @param {object} params
   * @param {number} params.customerId The customer ID to find emails for.
   * @param {boolean} [params.errorOnNotFound=false] Whether to error when not found.
   * @returns {Promise<CustomerEmailsResponse>} The customer emails.
   */
  async lookupEmails(params = {}) {
    const { customerId, errorOnNotFound } = await validateAsync(Joi.object({
      customerId: this.schema.customerId.required(),
      errorOnNotFound: Joi.boolean().default(false),
    }).required(), params);
    const endpoint = `/customer/${customerId}/email/*`;
    const response = await this.client.get({ endpoint, errorOnNotFound });
    return new CustomerEmailsResponse({ response });
  }

  /**
   * This API provides the ability look up a Customer’s External Ids by the Customer Id.
   *
   * @link https://main.omeda.com/knowledge-base/external-id-lookup-by-customer-id/
   * @param {object} params
   * @param {number} params.customerId The customer ID to find external IDs for.
   * @param {boolean} [params.errorOnNotFound=false] Whether to error when not found.
   * @returns {Promise<CustomerExternalIdsResponse>} The customer external IDs.
   */
  async lookupExternalIds(params = {}) {
    const { customerId, errorOnNotFound } = await validateAsync(Joi.object({
      customerId: this.schema.customerId.required(),
      errorOnNotFound: Joi.boolean().default(false),
    }).required(), params);
    const endpoint = `/customer/${customerId}/externalid/*`;
    const response = await this.client.get({ endpoint, errorOnNotFound });
    return new CustomerExternalIdsResponse({ response });
  }

  /**
   * This API provides capabilities to retrieve the merge history for the requested Customer Id.
   *
   * @link https://main.omeda.com/knowledge-base/customer-merge-history-lookup/
   * @param {object} params
   * @param {number} params.customerId The customer ID to find history for.
   * @param {boolean} [params.errorOnNotFound=false] Whether to error when not found.
   * @returns {Promise<ApiSetResponse>} The customer merge history.
   */
  async lookupMergeHistory(params = {}) {
    const { customerId, errorOnNotFound } = await validateAsync(Joi.object({
      customerId: this.schema.customerId.required(),
      errorOnNotFound: Joi.boolean().default(false),
    }).required(), params);
    const endpoint = `/customer/${customerId}/mergehistory/*`;
    const response = await this.client.get({ endpoint, errorOnNotFound });
    const customerIds = response.getAsArray('CustomerMergeHistory').map((customer) => customer.Id);
    const r = new ApiSetResponse({ data: customerIds, response });
    r.customerId = customerId;
    return r;
  }

  /**
   * This API provides the ability look up all available Order History information
   * for a customer by the Customer id or for a specific product if the Product Id is included.
   *
   * @link https://main.omeda.com/knowledge-base/order-history-lookup-by-customer-id/
   * @param {object} params
   * @param {number} params.customerId The customer ID to find history for.
   * @param {number} [params.productId] An optional product ID to filter by.
   * @param {boolean} [params.errorOnNotFound=false] Whether to error when not found.
   * @returns {Promise<CustomerOrderHistoryResponse>} The customer order history.
   */
  async lookupOrderHistory(params = {}) {
    const { customerId, productId, errorOnNotFound } = await validateAsync(Joi.object({
      customerId: this.schema.customerId.required(),
      productId: this.schema.productId,
      errorOnNotFound: Joi.boolean().default(false),
    }).required(), params);
    const endpoint = productId
      ? `customer/${customerId}/orderhistory/product/${productId}/*`
      : `customer/${customerId}/orderhistory/*`;
    await this.client.get({ endpoint, errorOnNotFound });
    throw new Error('The Order History Lookup is not yet implemented.');
  }

  /**
   * This API provides the ability look up a Customer’s Phone Numbers by the Customer id.
   *
   * @link https://main.omeda.com/knowledge-base/phone-lookup-by-customer-id/
   * @param {object} params
   * @param {number} params.customerId The customer ID to find phone numbers for.
   * @param {boolean} [params.errorOnNotFound=false] Whether to error when not found.
   * @returns {Promise<CustomerPhoneNumbersResponse>} The customer phone numbers.
   */
  async lookupPhoneNumbers(params = {}) {
    const { customerId, errorOnNotFound } = await validateAsync(Joi.object({
      customerId: this.schema.customerId.required(),
      errorOnNotFound: Joi.boolean().default(false),
    }).required(), params);
    const endpoint = `/customer/${customerId}/phone/*`;
    const response = await this.client.get({ endpoint, errorOnNotFound });
    return new CustomerPhoneNumbersResponse({ response });
  }

  /**
   * This API provides the ability look up a Customer’s Address by the Customer Id.
   * The response will return all active addresses stored for a given customer.
   *
   * @link https://main.omeda.com/knowledge-base/postal-address-lookup-by-customer-id/
   * @param {object} params
   * @param {number} params.customerId The customer ID to find postal addresses for.
   * @param {boolean} [params.errorOnNotFound=false] Whether to error when not found.
   * @returns {Promise<CustomerPostalAddressesResponse>} The customer addresses.
   */
  async lookupPostalAddresses(params = {}) {
    const { customerId, errorOnNotFound } = await validateAsync(Joi.object({
      customerId: this.schema.customerId.required(),
      errorOnNotFound: Joi.boolean().default(false),
    }).required(), params);
    const endpoint = `/customer/${customerId}/address/*`;
    const response = await this.client.get({ endpoint, errorOnNotFound });
    return new CustomerPostalAddressesResponse({ response });
  }

  /**
   * This service returns all available subscription information stored
   * for a given Customer Id and optional Product Id.
   *
   * Note, this includes both current subscription and deactivated subscriptions.
   *
   * @link https://main.omeda.com/knowledge-base/subscription-lookup-by-customer-id/
   * @param {object} params
   * @param {number} params.customerId The customer ID to find subscriptions for.
   * @param {number} [params.productId] An optional product ID.
   * @param {boolean} [params.errorOnNotFound=false] Whether to error when not found.
   * @returns {Promise<CustomerSubscriptionsResponse>} The customer subscriptions.
   */
  async lookupSubscriptions(params = {}) {
    const { customerId, productId, errorOnNotFound } = await validateAsync(Joi.object({
      customerId: this.schema.customerId.required(),
      productId: this.schema.productId,
      errorOnNotFound: Joi.boolean().default(false),
    }).required(), params);
    const endpoint = productId
      ? `customer/${customerId}/subscription/product/${productId}/*`
      : `customer/${customerId}/subscription/*`;
    const response = await this.client.get({ endpoint, errorOnNotFound });
    return new CustomerSubscriptionsResponse({ response });
  }

  /**
   * @todo Validate/format the body object.
   * @todo Determine the response to return
   *
   * @param {object} params
   * @param {object} params.body
   * @param {string} [params.inputId] An input ID to use. Overrides the default.
   * @returns {Promise<object>}
   */
  async storeCustomerAndOrder(params = {}) {
    const { body, inputId } = await validateAsync(Joi.object({
      body: Joi.object().required(),
      inputId: this.schema.inputId,
    }).required(), params);
    const endpoint = '/storecustomerandorder/*';
    const response = await this.client.post({ endpoint, body, inputId });
    return {
      data: getAsObject(response, 'json.ResponseInfo.0'),
      response,
    };
  }
}

module.exports = CustomerResource;
