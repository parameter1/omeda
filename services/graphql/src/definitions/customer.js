const { gql } = require('apollo-server-express');

module.exports = gql`

extend type Query {
  "Finds all customers that have changed for the provided date range."
  changedCustomers(input: ChangedCustomersQueryInput!): [ChangedCustomer!]!
  "Finds a single customer by customer ID."
  customerById(input: CustomerByIdQueryInput!): Customer
  "Finds a single customer by encrypted customer ID."
  customerByEncryptedId(input: CustomerByEncryptedIdQueryInput!): Customer
  "Finds all customers by the provided email address."
  customersByEmailAddress(input: CustomersByEmailAddressQueryInput!): [Customer!]!
}

extend type Mutation {
  "Rapidly identifies (upserts) user data into an Omeda customer."
  rapidCustomerIdentification(input: RapidCustomerIdentificationMutationInput!): RapidCustomerIdentification!
}

enum RequestedVersionEnum {
  B
  D
  P
}

type ChangedCustomer {
  id: Int! @apiValue
  dateChanged: DateTime! @apiValue
  createdDate: DateTime! @apiValue
  customerStatusCode: CustomerChangeStatusCode! @codeOrType(instance: "CustomerChangeStatusCode", path: "CustomerStatusId")

  customer: Customer!
}

type Customer {
  id: Int! @apiValue
  readerId: String @apiValue
  encryptedCustomerId: String! @apiValue
  salutation: String @apiValue
  firstName: String @apiValue
  middleName: String @apiValue
  lastName: String @apiValue
  suffix: String @apiValue
  title: String @apiValue
  gender: String @apiValue
  promoCode: String @apiValue
  originalPromoCode: String @apiValue
  signUpDate: DateTime @apiValue
  changedDate: DateTime @apiValue
  createdDate: DateTime @apiValue(path: "OriginalCreatedDate")
  statusCode: CustomerStatusCode @codeOrType(instance: "CustomerStatusCode")
  mergeCode: CustomerMergeCode! @codeOrType(instance: "CustomerMergeCode")

  behaviors(input: CustomerBehaviorsInput = {}): [CustomerBehavior!]!
  demographics(input: CustomerDemographicsInput = {}): [CustomerDemographic!]!
  emailAddresses: [CustomerEmailAddress!]!
  externalIds(input: CustomerExternalIdsInput = {}): [CustomerExternalId!]!
  phoneNumbers: [CustomerPhoneNumber!]!
  postalAddresses: [CustomerPostalAddress!]!
  subscriptions: [CustomerSubscription!]!

  primaryEmailAddress: CustomerEmailAddress
  primaryPhoneNumber: CustomerPhoneNumber
  primaryFaxNumber: CustomerPhoneNumber
  primaryMobileNumber: CustomerPhoneNumber
  primaryPostalAddress: CustomerPostalAddress

  companyName: String

  "Customer IDs that were merged into this customer."
  mergeHistory: [Int!]!
}

type CustomerBehavior {
  id: Int! @apiValue(path: "BehaviorId")
  occurrences: CustomerBehaviorOccurrence!
  behavior: Behavior!
}

type CustomerBehaviorOccurrence {
  first: DateTime!
  last: DateTime!
  count: Int!
}

type CustomerDemographic {
  id: BigInt! @apiValue
  demographic: Demographic!
  demographicId: Int! @apiValue
  demographicType: DemographicType! @codeOrType(instance: "DemographicType")
  demographicAge: Int @apiValue
  "The demographic value object. Only applicable when \`valueId\` is present."
  value: DemographicValue
  valueId: Int @apiValue
  valueText: String @apiValue
  valueDate: DateTime @apiValue
  writeInDesc: String @apiValue
  alternateId: String @apiValue
  changedDate: DateTime @apiValue
}

type CustomerEmailAddress {
  id: BigInt! @apiValue
  contactType: EmailAddressContactType! @codeOrType(instance: "EmailContactType", path: "EmailContactType")
  emailAddress: String!
  changedDate: DateTime! @apiValue
  statusCode: ContactTypeStatusCode @codeOrType(instance: "ContactTypeStatusCode")
  hashedEmailAddress: String @apiValue
  optInStatus: [CustomerEmailAddressOptInStatus!]!
}

type CustomerEmailAddressOptInStatus {
  brand: String! @apiValue
  deploymentTypeId: Int! @apiValue
  deploymentType: DeploymentType!
  status: CustomerEmailAddressOptInStatusValue! @codeOrType(instance: "EmailAddressOptInStatus")
  source: String @apiValue
  createdDate: DateTime @apiValue
  changedDate: DateTime @apiValue
}

type CustomerExternalId {
  id: String! @apiValue
  namespace: String! @apiValue
}

type CustomerPhoneNumber {
  id: BigInt! @apiValue
  contactType: PhoneNumberContactType! @codeOrType(instance: "PhoneContactType", path: "PhoneContactType")
  phoneNumber: String! @apiValue
  extension: String @apiValue
  changedDate: DateTime! @apiValue
  statusCode: ContactTypeStatusCode @codeOrType(instance: "ContactTypeStatusCode")
}

type CustomerPostalAddress {
  id: BigInt! @apiValue
  contactType: PostalAddressContactType! @codeOrType(instance: "AddressContactType", path: "AddressContactType")
  company: String @apiValue
  street: String @apiValue
  apartmentMailStop: String @apiValue
  extraAddress: String @apiValue
  city: String @apiValue
  regionCode: String @apiValue
  region: String @apiValue
  postalCode: String @apiValue
  countryCode: String @apiValue
  country: String @apiValue
  changedDate: DateTime! @apiValue
  statusCode: ContactTypeStatusCode @codeOrType(instance: "ContactTypeStatusCode")
}

type CustomerSubscription {
  id: BigInt! @apiValue
  product: Product!
  changedDate: DateTime! @apiValue
  receive: Boolean! @apiValue
}

type RapidCustomerIdentification {
  id: Int @apiValue(path: "CustomerId")
  encryptedCustomerId: String @apiValue
  customer: Customer
  orderId: Int @apiValue
  transactionId: Int! @apiValue
}

input ChangedCustomersQueryInput {
  "The start date for returning changed customers."
  startDate: DateTime!
  "The end date for returning changed customers."
  endDate: DateTime!
}

input CustomerByIdQueryInput {
  "The customer ID to lookup."
  id: Int!
  "Whether to fetch the newly activated customer if the provided ID is inactive."
  reQueryOnInactive: Boolean = true
  "Whether to error when the customer is not found."
  errorOnNotFound: Boolean = true
}

input CustomerByEncryptedIdQueryInput {
  "The encrypted customer ID to lookup."
  id: String!
  "Whether to error when the customer is not found."
  errorOnNotFound: Boolean = true
}

input CustomersByEmailAddressQueryInput {
  "The email address to lookup."
  emailAddress: String!
  "An (optional) product ID to filter the response by."
  productId: Int
}

input CustomerBehaviorsInput {
  "Filters the customer behaviors by one or more Behavior IDs. An empty value will return all customer behaviors."
  behaviorIds: [Int!]! = []
}

input CustomerDemographicsInput {
  "Filters the customer demographics by one or more demographic IDs. An empty value will return all customer demographics."
  demographicIds: [Int!] = []
  "Filters the customer demographics by one or more demographic types. An empty value will return all customer demographics."
  demographicTypes: [DemographicTypeEnum!] = []
}

input CustomerExternalIdsInput {
  "External identifier namespaces to exclude from the results."
  excludeNamespaces: [String!]! = []
}

input RapidCustomerIdentificationMutationInput {
  "The product ID to associate with this rapid identification."
  productId: Int!
  "The customer's email address."
  email: String!
  "First name of customer, up to 100 characters long"
  firstName: String
  "Last name of customer, up to 100 characters long"
  lastName: String
  "Job title, up to 100 characters long"
  title: String
  "The customer's company name."
  companyName: String
  "The customer's street address."
  streetAddress: String
  "The customer's extra address info (apartment/suite/mail stop)."
  extraAddress: String
  "The customer's city."
  city: String
  "3-character country code"
  countryCode: String
  "For country_code=’USA’ or ‘CAN’, this must be the 2-character US state or Canadian code used by the postal service. Omeda also has region codes for other countries of the world"
  regionCode: String
  "ZIP code or postal code."
  postalCode: String
  "The customer's primary phone number."
  phoneNumber: String
  "The customer's fax number."
  faxNumber: String
  "The customer's mobile number."
  mobileNumber: String
  "DEPRECATED: Use the \`deploymentTypes\` input instead. Deployment types to assign to the customer. Assumes an opt-in value of true."
  deploymentTypeIds: [Int!] = []

  "Deployment types to assign to, or unassign from, the customer, with opt in/out status."
  deploymentTypes: [RapidCustomerIdentificationDeploymentTypeInput] = []

  "Product subscriptions to assign to the customer."
  subscriptions: [RapidCustomerIdentificationSubscriptionInput] = []

  "Demographics to assign to the customer."
  demographics: [RapidCustomerIdentificationDemographicInput!] = []

  "Behaviors to assign to the customer."
  behaviors: [RapidCustomerIdentificationBehaviorInput!]! = []

  "An optional promo code for tracking the identification acquisition source."
  promoCode: String
  "An optional input ID to use when identifying."
  inputId: Int
}

input RapidCustomerIdentificationDeploymentTypeInput {
  "The deployment type ID to assign"
  id: Int!
  "Whether the customer opted-in."
  optedIn: Boolean!
}

input RapidCustomerIdentificationSubscriptionInput {
  "The product id to subscribe to"
  id: Int!
  "Whether the customer should receive this subscription."
  receive: Boolean!
  "Which print version is requested - B (Both), D (Digital) or P (Print)"
  requestedVersion: RequestedVersionEnum
}

input RapidCustomerIdentificationDemographicInput {
  "The OmedaDemographic ID to set."
  id: Int!
  "The OmedaDemographicValue IDs to set."
  values: [String!]!
  "“Other” text description, only applicable to demographic values with value type of “Other”."
  writeInValue: String
}

input RapidCustomerIdentificationBehaviorInput {
  "The Omeda Behavior ID to assign."
  id: Int!
  "The date the behavior occurred."
  date: DateTime
  "An array of pre-defined key-values to send with the behavior."
  attributes: [RapidCustomerIdentificationBehaviorAttributeInput!]! = []
}

"Input for asisgning a behavior attribute. Id and one of valueId or value must be present."
input RapidCustomerIdentificationBehaviorAttributeInput {
  "The Omeda BehaviorAttributeTypeId to assign."
  id: Int!
  "The Omeda BehaviorAttribute DefinedValue ID to assign."
  valueId: Int
  "The value to assign (for non-pre-defined attributes)."
  value: String
}

`;
