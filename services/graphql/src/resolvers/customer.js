const { UserInputError } = require('apollo-server-express');
const { get, getAsArray } = require('@parameter1/utils');
const newrelic = require('../newrelic');
const dayjs = require('../dayjs');

const noticeError = newrelic.noticeError.bind(newrelic);

// const upsertCustomerData = async ({ id, encrypted = false, response }, { repos, loaders }) => {
const upsertCustomerData = async () => {
  // if (!response.data || !response.data.Id) return null;
  // store customer record in local db.
  // const { Id } = response.data;

  // const getDataFromLoader = async (key) => {
  //   const r = await loaders[key].load(Id);
  //   return r ? r.data : [];
  // };

  // const [
  //   Addresses,
  //   CustomerDemographics,
  //   EmailAddresses,
  //   MergeHistory, // @todo should merged records be whiped from local?
  //   Phones,
  //   Subscriptions,
  // ] = await Promise.all([
  //   getDataFromLoader('customerPostalAddresses'),
  //   getDataFromLoader('customerDemographics'),
  //   getDataFromLoader('customerEmails'),
  //   getDataFromLoader('mergeHistory'),
  //   getDataFromLoader('customerPhoneNumbers'),
  //   getDataFromLoader('customerSubscriptions'),
  // ]);

  // const record = {
  //   ...response.data,
  //   Addresses,
  //   CustomerDemographics,
  //   EmailAddresses,
  //   MergeHistory,
  //   Phones,
  //   Subscriptions,
  // };

  // return repos.customer.upsert({ id, encrypted, record });
};

module.exports = {
  /**
   *
   */
  ChangedCustomer: {
    /**
     *
     */
    async customer({ Id }, _, { apiClient }) {
      const response = await apiClient.resource('customer').lookupById({
        customerId: Id,
      });
      return response.data;
    },
  },

  /**
   *
   */
  Customer: {
    /**
     *
     */
    async behaviors({ Id }, { input }, { loaders }) {
      const {
        behaviorIds,
      } = input;
      const response = await loaders.customerBehaviors.load(Id);
      const data = response ? response.data : [];
      const filtered = data.filter((item) => {
        if (behaviorIds.length && !behaviorIds.includes(item.BehaviorId)) return false;
        return true;
      });

      // ensure the behaviors still exist within Omeda
      const ids = filtered.map(({ BehaviorId }) => BehaviorId);
      const found = await loaders.brandBehaviors.loadMany(ids);
      const foundMap = found.filter((v) => v).reduce((set, doc) => {
        set.add(doc.data.Id);
        return set;
      }, new Set());
      return filtered.filter(({ BehaviorId }) => foundMap.has(BehaviorId));
    },
    /**
     *
     */
    async companyName({ Id }, _, { loaders }) {
      const response = await loaders.customerPostalAddresses.load(Id);
      return response ? response.getCompanyName() : null;
    },

    /**
     *
     */
    async demographics({ Id }, { input }, { loaders }) {
      const { demographicIds, demographicTypes } = input;
      const response = await loaders.customerDemographics.load(Id);
      const data = response ? response.data : [];
      const filtered = data.filter((demo) => {
        if (demographicIds.length && !demographicIds.includes(demo.DemographicId)) {
          return false;
        }
        if (demographicTypes.length && !demographicTypes.includes(demo.DemographicType)) {
          return false;
        }
        return true;
      });

      // ensure the demographics still exist within Omeda
      const ids = filtered.map(({ DemographicId }) => DemographicId);
      const found = await loaders.brandDemographics.loadMany(ids);
      const foundMap = found.filter((v) => v).reduce((set, doc) => {
        set.add(doc.data.Id);
        return set;
      }, new Set());
      return filtered.filter(({ DemographicId }) => foundMap.has(DemographicId));
    },

    /**
     *
     */
    async emailAddresses({ Id }, _, { loaders }) {
      const response = await loaders.customerEmails.load(Id);
      return response ? response.data : [];
    },

    /**
     *
     */
    async externalIds({ Id }, { input }, { loaders }) {
      const response = await loaders.customerExternalIds.load(Id);
      const excludeNamespaces = input.excludeNamespaces.reduce((set, ns) => {
        set.add(ns);
        return set;
      }, new Set());
      return response ? response.data.filter(({ Namespace }) => {
        if (excludeNamespaces.has(Namespace)) return false;
        return true;
      }) : [];
    },

    /**
     *
     */
    async mergeHistory({ Id }, _, { loaders }) {
      const response = await loaders.customerMergeHistory.load(Id);
      return response ? response.data : [];
    },

    /**
     *
     */
    async phoneNumbers({ Id }, _, { loaders }) {
      const response = await loaders.customerPhoneNumbers.load(Id);
      return response ? response.data : [];
    },

    /**
     *
     */
    async postalAddresses({ Id }, _, { loaders }) {
      const response = await loaders.customerPostalAddresses.load(Id);
      return response ? response.data : [];
    },

    /**
     *
     */
    async primaryEmailAddress({ Id }, _, { loaders }) {
      const response = await loaders.customerEmails.load(Id);
      return response ? response.getPrimary() : null;
    },

    /**
     *
     */
    async primaryFaxNumber({ Id }, _, { loaders }) {
      const response = await loaders.customerPhoneNumbers.load(Id);
      return response ? response.getPrimaryFax() : null;
    },

    /**
     *
     */
    async primaryMobileNumber({ Id }, _, { loaders }) {
      const response = await loaders.customerPhoneNumbers.load(Id);
      return response ? response.getPrimaryMobile() : null;
    },

    /**
     *
     */
    async primaryPhoneNumber({ Id }, _, { loaders }) {
      const response = await loaders.customerPhoneNumbers.load(Id);
      return response ? response.getPrimary() : null;
    },

    /**
     *
     */
    async primaryPostalAddress({ Id }, _, { loaders }) {
      const response = await loaders.customerPostalAddresses.load(Id);
      return response ? response.getPrimary() : null;
    },

    /**
     *
     */
    async subscriptions({ Id }, _, { loaders }) {
      const response = await loaders.customerSubscriptions.load(Id);
      const subscriptions = response ? response.data : [];
      const productIds = subscriptions.reduce((set, { ProductId }) => {
        set.add(ProductId);
        return set;
      }, new Set());
      const verifedProductIds = await (async () => {
        if (!productIds.size) return new Set();
        const products = await loaders.brandProducts.loadMany([...productIds]);
        return products.reduce((set, product) => {
          if (!product) return set;
          set.add(product.data.Id);
          return set;
        }, new Set());
      })();

      // some customer records have orphaned subscriptions that reference products
      // that no longer exist. as such, filter these.
      return subscriptions.filter(({ ProductId }) => verifedProductIds.has(ProductId));
    },
  },

  /**
   *
   */
  CustomerBehavior: {
    /**
     *
     */
    behavior: async ({ BehaviorId }, _, { loaders }) => {
      const r = await loaders.brandBehaviors.load(BehaviorId);
      return r ? r.data : null;
    },
    /**
     *
     */
    occurrences: (doc) => ({
      first: doc.FirstOccurrenceDate,
      last: doc.LastOccurrenceDate,
      count: doc.NumberOfOccurrences,
    }),
  },

  /**
   *
   */
  CustomerDemographic: {
    /**
     *
     */
    async demographic({ DemographicId }, _, { loaders }) {
      const r = await loaders.brandDemographics.load(DemographicId);
      return r ? r.data : null;
    },

    /**
     *
     */
    async value({ DemographicId, ValueId }, _, { loaders }) {
      const r = await loaders.brandDemographics.load(DemographicId);
      const values = getAsArray(r, 'data.DemographicValues');
      return values.find((value) => value.Id === ValueId);
    },
  },

  /**
   *
   */
  CustomerEmailAddress: {
    /**
     *
     */
    emailAddress({ EmailAddress }) {
      return EmailAddress.trim().toLowerCase();
    },

    /**
     *
     */
    async optInStatus({ EmailAddress }, _, { loaders }) {
      const r = await loaders.emailAddressOptInStatus.load(EmailAddress);
      return r ? r.data : [];
    },
  },

  /**
   *
   */
  CustomerEmailAddressOptInStatus: {
    /**
     *
     */
    async deploymentType({ DeploymentTypeId }, _, { loaders }) {
      const doc = await loaders.brandDeploymentTypes.load(DeploymentTypeId);
      return get(doc, 'data');
    },
  },

  /**
   *
   */
  CustomerSubscription: {
    /**
     *
     */
    async product({ ProductId }, _, { loaders }) {
      const r = await loaders.brandProducts.load(ProductId);
      return r ? r.data : null;
    },
  },

  /**
   *
   */
  RapidCustomerIdentification: {
    /**
     *
     */
    async customer({ CustomerId }, _, { apiClient }) {
      if (!CustomerId) return null;
      const response = await apiClient.resource('customer').lookupById({
        customerId: CustomerId,
      });
      return response.data;
    },
  },

  /**
   *
   */
  Mutation: {
    /**
     *
     */
    async rapidCustomerIdentification(_, { input }, { apiClient, repos }) {
      const {
        email,
        phoneNumber,
        mobileNumber,
        faxNumber,
        firstName,
        lastName,
        title,
        companyName,
        streetAddress,
        extraAddress,
        city,
        regionCode,
        countryCode,
        postalCode,
        demographics,
        subscriptions,
        behaviors,
      } = input;

      const promoCode = input.promoCode ? input.promoCode.trim() : null;
      if (promoCode && promoCode.length > 50) throw new UserInputError('The promo code must be 50 characters or fewer.');
      const productMap = new Map([[input.productId, true]]);

      const deploymentTypeIdMap = input.deploymentTypeIds.reduce((map, id) => {
        map.set(id, true);
        return map;
      }, new Map());

      const deploymentTypeOptInMap = input.deploymentTypes.reduce((map, type) => {
        map.set(type.id, type.optedIn);
        return map;
      }, deploymentTypeIdMap);

      // Append newsletter product subscriptions for each opted-in email deployment
      const deploymentTypeIds = [...deploymentTypeOptInMap.keys()];
      if (deploymentTypeIds.length) {
        const cursor = await repos.brandProduct.find({
          query: {
            'data.DeploymentTypeId': { $in: deploymentTypeIds },
            'data.ProductType': 2, // only newsletters can be subscribed to in this manner
          },
          options: { projection: { 'data.Id': 1, 'data.DeploymentTypeId': 1 } },
        });
        await cursor.forEach((doc) => {
          const { Id, DeploymentTypeId } = doc.data;
          const optedIn = deploymentTypeOptInMap.get(DeploymentTypeId);
          if (optedIn == null) return;
          productMap.set(Id, optedIn);
        });
      }

      const subscriptionMap = new Map();
      subscriptions.forEach(({ id, receive }) => {
        subscriptionMap.set(id, receive);
        // Append explicitly provided product subscriptions, if not already present.
        if (!productMap.has(id)) productMap.set(id, receive);
      });

      // Set deployment opt-ins for supplied newsletter product subscriptions
      if (subscriptionMap.size) {
        const cursor = await repos.brandProduct.find({
          query: { 'data.Id': { $in: [...subscriptionMap.keys()] }, 'data.ProductType': 2 },
          options: { projection: { 'data.Id': 1, 'data.DeploymentTypeId': 1 } },
        });
        await cursor.forEach((doc) => {
          const { Id, DeploymentTypeId } = doc.data;
          if (!subscriptionMap.has(Id)) return;
          const receive = subscriptionMap.get(Id);
          // Set the status, if not already present. Used when sending opt-in/out below.
          if (deploymentTypeOptInMap.has(DeploymentTypeId)) return;
          deploymentTypeOptInMap.set(DeploymentTypeId, receive);
        });
      }

      const hasAddress = companyName || regionCode || countryCode || postalCode
        || streetAddress || city || extraAddress;

      const phones = [];
      if (phoneNumber) phones.push({ Number: phoneNumber, PhoneContactType: 200 });
      if (mobileNumber) phones.push({ Number: mobileNumber, PhoneContactType: 230 });
      if (faxNumber) phones.push({ Number: faxNumber, PhoneContactType: 240 });
      const body = {
        RunProcessor: 1,
        Products: [...productMap].map(([OmedaProductId, Receive]) => {
          const product = subscriptions.find((obj) => obj.id === OmedaProductId);
          return ({
            OmedaProductId,
            Receive: Number(Receive),
            ...(product && product.requestedVersion && {
              RequestedVersion: product.requestedVersion,
            }),
          });
        }),
        Emails: [{ EmailAddress: email }],
        ...(phones.length && { Phones: phones }),
        ...(firstName && { FirstName: firstName }),
        ...(lastName && { LastName: lastName }),
        ...(title && { Title: title }),
        ...(hasAddress && {
          Addresses: [
            {
              ...(companyName && { Company: companyName }),
              ...(streetAddress && { Street: streetAddress }),
              ...(extraAddress && { ApartmentMailStop: extraAddress }),
              ...(city && { City: city }),
              ...(regionCode && { RegionCode: regionCode }),
              ...(countryCode && { CountryCode: countryCode }),
              ...(postalCode && { PostalCode: postalCode }),
            },
          ],
        }),
        ...(demographics.length && {
          CustomerDemographics: demographics.map((demo) => ({
            OmedaDemographicId: demo.id,
            OmedaDemographicValue: demo.values,
            ...(demo.writeInValue && { WriteInDesc: demo.writeInValue }),
          })),
        }),
        ...(behaviors.length && {
          CustomerBehaviors: behaviors.map(({ id, date, attributes }) => ({
            BehaviorId: id,
            BehaviorDate: dayjs(date || new Date()).format('YYYY-MM-DD HH:mm:ss'),
            ...(attributes.length && {
              BehaviorAttributes: attributes.map((attr) => {
                if (!attr.valueId && !attr.value) throw new UserInputError('One of `valueId` or `value` must be specified for behavior attribute!');
                if (attr.valueId && attr.value) throw new UserInputError('Only one of `valueId` and `value` can be specified for behavior attribute!');
                return {
                  BehaviorAttributeTypeId: attr.id,
                  ...(attr.valueId && { BehaviorAttributeValueId: attr.valueId }),
                  ...(attr.value && { BehaviorAttributeValue: attr.value }),
                };
              }),
            }),
          })),
        }),
        ...(promoCode && { PromoCode: promoCode }),
      };
      const [response] = await Promise.all([
        apiClient.resource('customer').storeCustomerAndOrder({
          body,
          inputId: input.inputId,
        }),
        (async () => {
          if (!deploymentTypeOptInMap.size) return null;
          const optInIds = [];
          const optOutIds = [];
          deploymentTypeOptInMap.forEach((optedIn, id) => {
            if (optedIn) {
              optInIds.push(id);
            } else {
              optOutIds.push(id);
            }
          });
          const emailResource = apiClient.resource('email');
          return Promise.all([
            // opt-ins
            optInIds.length ? emailResource.optInEmailAddress({
              emailAddress: email,
              deploymentTypeIds: optInIds,
              deleteOptOut: true,
            }) : Promise.resolve(),
            // opt-outs
            optOutIds.length ? emailResource.optOutEmailAddress({
              emailAddress: email,
              deploymentTypeIds: optOutIds,
            }) : Promise.resolve(),
          ]);
        })(),
      ]);
      return response.data;
    },
  },

  /**
   *
   */
  Query: {
    /**
     *
     */
    async changedCustomers(_, { input }, { apiClient }) {
      const { startDate, endDate } = input;
      const response = await apiClient.resource('customer').changeLookup({
        startDate,
        endDate,
      });
      return response.data;
    },

    /**
     *
     */
    async customerById(_, { input }, { apiClient, loaders, repos }) {
      const { id, reQueryOnInactive, errorOnNotFound } = input;
      const response = await apiClient.resource('customer').lookupById({
        customerId: id,
        reQueryOnInactive,
        errorOnNotFound,
      });
      if (!response.data.Id) return null;
      // store customer record in local db.
      upsertCustomerData({ id, encrypted: false, response }, { repos, loaders }).catch(noticeError);
      return response.data;
    },

    /**
     *
     */
    async customerByEncryptedId(_, { input }, { apiClient, loaders, repos }) {
      const { id, errorOnNotFound } = input;
      const response = await apiClient.resource('customer').lookupByEncryptedId({
        encryptedId: id,
        errorOnNotFound,
      });

      if (!response.data.Id) return null;
      // store customer record in local db.
      upsertCustomerData({ id, encrypted: true, response }, { repos, loaders }).catch(noticeError);
      return response.data;
    },

    /**
     *
     */
    async customersByEmailAddress(_, { input }, { apiClient, loaders, repos }) {
      const { emailAddress, productId } = input;
      const { data } = await apiClient.resource('customer').lookupByEmailAddress({
        emailAddress,
        productId,
      });
      if (!data.size) return [];
      const customerIds = [...data];
      return Promise.all(customerIds.map(async (customerId) => {
        const response = await apiClient.resource('customer').lookupById({
          customerId,
          reQueryOnInactive: true,
        });
        // store customer record in local db.
        upsertCustomerData({
          id: customerId,
          encrypted: false,
          response,
        }, { repos, loaders }).catch(noticeError);
        return response.data;
      }));
    },
  },
};
