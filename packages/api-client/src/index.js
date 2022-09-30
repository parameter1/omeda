const { cleanPath } = require('@parameter1/utils');
const fetch = require('node-fetch');
const { ApiClientJSONResponse, ApiClientTextResponse } = require('./response/client');
const { ApiResponseJSONError, ApiResponseTextError } = require('./response/error');
const BrandResource = require('./resources/brand');
const CustomerResource = require('./resources/customer');
const EmailResource = require('./resources/email');
const pkg = require('../package.json');

const buildApiError = ({
  contentType,
  responseBody,
  fetchResponse,
  time,
} = {}) => {
  switch (contentType) {
    case 'json':
      return new ApiResponseJSONError({ json: responseBody, fetchResponse, time });
    case 'text':
      return new ApiResponseTextError({ text: responseBody, fetchResponse, time });
    default:
      throw new Error(`Unsupported response content type encountered: ${contentType}`);
  }
};

const buildApiResponse = ({
  contentType,
  responseBody,
  fetchResponse,
  time,
} = {}) => {
  switch (contentType) {
    case 'json':
      return new ApiClientJSONResponse({ json: responseBody || {}, fetchResponse, time });
    case 'text':
      return new ApiClientTextResponse({ text: responseBody || '', fetchResponse, time });
    default:
      throw new Error(`Unsupported response content type encountered: ${contentType}`);
  }
};

class OmedaApiClient {
  /**
   *
   * @param {object} params
   * @param {string} params.appId The Omeda API app ID. Required.
   * @param {string} params.brand The brand abbreviation. Required.
   * @param {string} [params.clientAbbrev] The client abbreviation. Required for certain API calls.
   * @param {string} [params.inputId] The Omeda API input ID. Required when doing write calls.
   * @param {string} [params.useStaging=false] Whether to use the staging API.
   * @param {OmedaApiCacheInterface} [params.cache] A response cache implementation.
   * @param {function} [params.requestLogger] A function to call on API requests.
   */
  constructor({
    appId,
    brand,
    clientAbbrev,
    inputId,
    useStaging = false,
    cache,
    requestLogger,
  } = {}) {
    if (!appId) throw new Error('The Omeda API App ID is required.');
    if (!brand) throw new Error('The Omeda brand abbreviation is required.');
    this.appId = appId;
    this.brand = brand;
    this.clientAbbrev = clientAbbrev;
    this.inputId = inputId;
    this.useStaging = useStaging;

    this.cache = cache;
    this.resources = {
      brand: new BrandResource({ client: this }),
      customer: new CustomerResource({ client: this }),
      email: new EmailResource({ client: this }),
    };
    this.requestLogger = requestLogger;
  }

  /**
   * Returns an API resource for the provided name.
   *
   * @param {*} name The resource name, e.g. `customer` or `brand`
   */
  resource(name) {
    const resource = this.resources[name];
    if (!resource) throw new Error(`No API resource found for '${name}'`);
    return resource;
  }

  /**
   * Gets the API environment. Either staging or production.
   *
   * @returns {string}
   */
  get environment() {
    return this.useStaging ? 'staging' : 'production';
  }

  /**
   * Gets the API host name.
   *
   * @returns {string}
   */
  get host() {
    const root = this.environment === 'staging' ? 'omedastaging' : 'omeda';
    return `ows.${root}.com`;
  }

  /**
   * Gets the root API URL.
   *
   * @returns {string}
   */
  get url() {
    return `https://${this.host}`;
  }

  /**
   * Generates a brand API URL for the provided endpoint.
   *
   * @param {string} endpoint
   * @returns {string}
   */
  brandUrl(endpoint) {
    return `${this.url}/webservices/rest/brand/${this.brand}/${cleanPath(endpoint)}`;
  }

  /**
   * Generates a client API URL for the provided endpoint.
   *
   * @param {string} endpoint
   * @returns {string}
   */
  clientUrl(endpoint) {
    const { clientAbbrev } = this;
    if (!clientAbbrev) throw new Error('Unable to perform operation: no client abbreviation was set on the API client.');
    return `${this.url}/webservices/rest/client/${clientAbbrev}/${cleanPath(endpoint)}`;
  }

  /**
   * Performs a GET request against the brand API.
   *
   * @param {object} params
   * @param {string} params.endpoint The brand API endpoint
   * @param {boolean} [params.errorOnNotFound=true] Whether to error when a 404 is encountered
   * @param {boolean} [params.useClientUrl=false] Whether to use the client API URL.
   * @returns {Promise<ApiClientResponse>}
   */
  async get({
    endpoint,
    errorOnNotFound = true,
    useClientUrl = false,
    cache = true,
    ttl,
  } = {}) {
    const shouldCache = Boolean(cache && this.cache);
    if (!shouldCache) {
      return this.request({
        method: 'GET',
        endpoint,
        errorOnNotFound,
        useClientUrl,
      });
    }

    const start = process.hrtime();
    const cacheKey = this.buildCacheKey({ endpoint, ttl });
    const parsed = await this.cache.get(cacheKey);

    if (parsed) {
      const time = OmedaApiClient.calculateTime(start);
      return buildApiResponse({
        contentType: parsed.contentType,
        responseBody: parsed.body,
        fromCache: true,
        time,
      });
    }

    const response = await this.request({
      method: 'GET',
      endpoint,
      errorOnNotFound,
      useClientUrl,
    });
    await this.cache.set(cacheKey, response.getBody(), ttl, response.contentType);
    return response;
  }

  /**
   * Performs a POST request against the brand API.
   *
   * @param {object} params
   * @param {string} params.endpoint The brand API endpoint
   * @param {object} params.body The body/payload to send with the request.
   * @param {string} [params.inputId] An input ID to use. Overrides the default.
   * @param {boolean} [params.useClientUrl=false] Whether to use the client API URL.
   * @returns {Promise<ApiClientResponse>}
   */
  async post({
    endpoint,
    body,
    inputId,
    useClientUrl = false,
  } = {}) {
    return this.request({
      method: 'POST',
      endpoint,
      body,
      inputId,
      useClientUrl,
    });
  }

  /**
   * Performs a request against the brand API.
   *
   * @param {object} params
   * @param {string} params.method The request method, e.g. GET or POST
   * @param {string} params.endpoint The brand API endpoint
   * @param {object} [params.body] The request body object
   * @param {string} [params.inputId] An input ID to use. Overrides the default.
   * @param {boolean} [params.errorOnNotFound=true] Whether to error when a 404 is encountered
   * @param {boolean} [params.useClientUrl=false] Whether to use the client API URL.
   * @returns {Promise<ApiClientResponse>}
   */
  async request({
    method,
    endpoint,
    body,
    inputId,
    errorOnNotFound = true,
    useClientUrl = false,
  } = {}) {
    const start = process.hrtime();
    if (!endpoint) throw new Error('An API endpoint is required.');
    const url = useClientUrl ? this.clientUrl(endpoint) : this.brandUrl(endpoint);

    const iid = inputId || this.inputId;
    const params = {
      method,
      headers: {
        'x-omeda-appid': this.appId,
        'user-agent': `${pkg.name} v${pkg.version} (+${pkg.homepage})`,
        ...(iid && { 'x-omeda-inputid': iid }),
        ...(body && { 'content-type': 'application/json' }),
      },
      ...(body && { body: JSON.stringify(body) }),
    };

    const { requestLogger } = this;
    if (typeof requestLogger === 'function') {
      requestLogger({
        endpoint: cleanPath(endpoint),
        url,
        params,
        brand: this.brand,
        clientAbbrev: this.clientAbbrev,
        useStaging: this.useStaging,
      });
    }

    const response = await fetch(url, params);
    const { responseBody, contentType } = await OmedaApiClient.parseResponseBody(response);
    const time = OmedaApiClient.calculateTime(start);
    if (response.ok) {
      return buildApiResponse({
        contentType,
        responseBody,
        fetchResponse: response,
        time,
      });
    }

    if (response.status === 404) {
      const notFoundError = buildApiError({
        contentType,
        responseBody,
        fetchResponse: response,
        time,
      });
      if (/valid but not active/.test(notFoundError.message)) {
        // when an inactive response is found, force throw (regardless of `errorOnNotFound` setting)
        // so that the error can be handled directly by the calling method
        throw notFoundError;
      }
    }

    if (errorOnNotFound === false && response.status === 404) {
      return buildApiResponse({ contentType, fetchResponse: response, time });
    }
    throw buildApiError({
      contentType,
      responseBody,
      fetchResponse: response,
      time,
    });
  }

  /**
   * Builds a cache key for the provided operation and endpoint.
   *
   * @param {object} params
   * @param {string} params.endpoint
   * @param {string} [params.operation=brand]
   * @param {number} [params.ttl]
   * @returns
   */
  buildCacheKey({ endpoint, operation = 'brand', ttl } = {}) {
    return this.cache.buildKey({
      environment: this.environment,
      brand: this.brand,
      operation,
      endpoint,
      ttl,
    });
  }

  /**
   * Calculates operation time, in milliseconds, for a provided hrtime start value.
   *
   * @param {*} start
   */
  static calculateTime(start) {
    const [secs, ns] = process.hrtime(start);
    return (secs * 1000) + (ns / 1000000);
  }

  /**
   * Attempts to parse the response body into either JSON or text.
   *
   * @param {FetchResponse} response
   * @returns {object}
   */
  static async parseResponseBody(response) {
    const body = await response.text();
    const type = response.headers.get('content-type');
    if (/^application\/json/i.test(type)) {
      return { contentType: 'json', responseBody: OmedaApiClient.parseJSON(body) };
    }
    if (/^text\//i.test(type)) {
      return { contentType: 'text', responseBody: body };
    }
    throw new Error(`Unsupported API response content type encountered: ${type}`);
  }

  /**
   * Parses a JSON string. If a parse error is encountered,
   * the original body is appended to the error.
   *
   * @param {string} body
   * @returns {object}
   */
  static parseJSON(body) {
    try {
      return JSON.parse(body);
    } catch (e) {
      const err = new Error(`Unable to parse JSON response body: ${e.message}`);
      err.body = body;
      err.originalError = e;
      throw err;
    }
  }
}

module.exports = OmedaApiClient;
