const { gql } = require('apollo-server-express');

module.exports = gql`

extend type Query {
  emailDeploymentById(input: EmailDeploymentByIdQueryInput!): EmailDeployment
  "Returns the deployment text or HTML content for the provided track ID and split number. If the track ID, split or content is not found, the query will return null."
  emailDeploymentContentById(input: QueryEmailDeploymentContentByIdInput!): String
  searchEmailClicks(input: SearchEmailClicksQueryInput!): EmailDeploymentClicks
  searchEmailDeployments(input: SearchEmailDeploymentsQueryInput = {}): [EmailDeploymentListItem!]!
}

enum EmailDeploymentContentTypeEnum {
  HTML
  TEXT
}

type EmailDeployment {
  id: String! @apiValue(path: "TrackId")
  "Number of emails that have been successfully sent to email inboxes."
  sentCount: Int! @apiValue
  "If the deployment has been sent, the date the deployment was sent."
  sentDate: DateTime @apiValue
  "The user-entered name of the deployment, designated when the deployment was created."
  deploymentName: String! @apiValue
  "The number of unique email accounts that opened this deployment."
  uniqueOpens: Int! @apiValue
  "The number of splits for this deployment."
  splitCount: Int! @apiValue
  "The number of emails that were not accepted into recipient email inboxes after the 72-hour retry period."
  bounceCount: Int! @apiValue
  "The date the deployment was approved for scheduling. For Omail API generated deployments, this date will be the date that the user made the Deployment Schedule API call."
  approvalDate: DateTime @apiValue
  "The number of unique email addresses that clicked on this deployment."
  uniqueClicks: Int! @apiValue
  "The number of email addresses that are currently in retry status. Emails that ‘bounce’ (are not accepted by the recipients ISP) will be retried for a 72 hour period."
  retryCount: Int! @apiValue
  "Split information for the deployment. Each deployment can have one or many splits, each of which has its own email information such as Subject, From, Html content, and Text content."
  splits: [EmailDeploymentSplit!]! @apiValue(as: ARRAY)
  "The total number of email inboxes that opened the deployment."
  totalOpens: Int! @apiValue
  "The Omail account userId that is authorized to edit the deployment."
  ownerUserId: String! @apiValue
  "The number of emails that are currently in ‘sending’ status. They are in the process of being delivered."
  sendingCount: Int! @apiValue
  "The Final Approver for the deployment. This is specified when the deployment is created."
  finalApproverUserId: String @apiValue
  "Whether links are tracked."
  trackLinks: Boolean @apiValue
  "An array of objects that hold a list of the links that were tracked with total click counts and unique click counts etc."
  linkTracking: [EmailDeploymentLinkTracking!]! @apiValue(as: ARRAY)
  "The Campaign Id specified when the deployment was created, an empty string if none was specified."
  campaignId: String @apiValue
  "The date the deployment has been scheduled to send."
  scheduledDate: DateTime @apiValue
  "The date the deployment has been originally requested to be sent"
  requestedDate: DateTime @apiValue
  "Whether to track opens."
  trackOpens: Boolean @apiValue
  "Optional user-specified text that is set when the deployment is created."
  notes: String @apiValue
  "The current status of the deployment."
  status: DeploymentStatus! @codeOrType(instance: "DeploymentStatus")
  "Total number of clicks registered for this deployment."
  totalClicks: Int! @apiValue
  "The tracking number used to identify the deployment."
  trackId: String! @apiValue
  "The Omail account UserId or service that created the deployment."
  createdBy: String! @apiValue
  "The date the deployment was created."
  createdDate: DateTime! @apiValue
  "The number of recipients being deployed to."
  recipientCount: Int @apiValue
  "Whether the deployment is filtered."
  isFiltered: Boolean @apiValue
  "An array of objects that hold information regarding changes that have been made to the deployment."
  modificationHistory: [EmailDeploymentModificationHistory!]! @apiValue(as: ARRAY)
  "An array of json objects. Each object contains deployment tester information: First Name, Last Name, and Email Address."
  testers: [EmailDeploymentTester!]! @apiValue(as: ARRAY)
  "The Deployment Type Identifier in the Omail system. "
  deploymentTypeId: Int! @apiValue
  "The Deployment Type description in the Omail system."
  deploymentTypeDescription: String! @apiValue
  "The deployment designation."
  deploymentDesignation: DeploymentDesignation @codeOrType(instance: "DeploymentDesignation")
  "Whether the deployment is set to re-execute an assigned OnQ query, when applicable."
  reloadOnqQueryBeforeFinalDeployment: Boolean @apiValue
  "8 characters billing category if assigned to deployment"
  billingCategoryCode: String @apiValue

  "The deployment type object."
  deploymentType: DeploymentType!
}

type EmailDeploymentSplit {
  "The ‘From’ email address, specified when the deployment content was created."
  fromEmail: String! @apiValue
  "The SpamAssassin spam score calculated for the deployment text content. Example: ‘1.2’. Value will be 0.0 if no text content is present."
  textSpamScore: Float @apiValue
  "The subject of the email, specified when the deployment content was created."
  subject: String! @apiValue
  "The ‘From’ name, specified when the deployment content was created."
  fromName: String! @apiValue
  "The name of the recipient file used when the deployment was created."
  recipientList: String @apiValue
  "The name of the OnQ query used for the deployment."
  queryName: String @apiValue
  "The name of the OnQ output criteria used when using an OnQ query for the deployment audience, otherwise ‘Default’."
  outputCriteria: String @apiValue
  "The SpamAssassin spam score calculated for the deployment Html content. Example: ‘1.2’. Value will be 0.0 if no Html content is present."
  htmlSpamScore: Float @apiValue
  "The split number: 1, 2, etc… depending on how many splits the deployment has."
  sequence: Int! @apiValue
}

type EmailDeploymentLinkTracking {
  "The category of the link."
  category: String @apiValue
  "Description value for the link category."
  categoryValue: String @apiValue
  "String array of keywords for the link."
  keywords: [String!]! @apiValue(as: ARRAY)
  "Name of the link."
  linkName: String @apiValue
  "Tag name of the link."
  linkTag: String @apiValue
  "Url of the link."
  linkUrl: String! @apiValue
  "HTML or TEXT, indicating which message body type the link belongs to."
  messageType: String @apiValue
  "Whether the link is tracked."
  tracked: Boolean! @apiValue
  "Whether webtracking is used."
  webTracking: Boolean! @apiValue
  "Number of total unique clicks for the link."
  uniqueClickCount: Int! @apiValue
  "Number of total clicks for the link."
  clickCount: Int! @apiValue
}

type EmailDeploymentModificationHistory {
  "The description of the change made."
  changeDescription: String @apiValue
  "The Omail account UserId that made the change."
  changedBy: String @apiValue
  "The date the change was made."
  changedDate: DateTime! @apiValue
}

type EmailDeploymentTester {
  "The first name of the tester."
  firstName: String @apiValue
  "The last name of the tester."
  lastName: String @apiValue
  "The email address of the tester."
  emailAddress: String! @apiValue
}

type EmailDeploymentClicks {
  id: String! @apiValue(path: "TrackId")
  deploymentName: String! @apiValue
  sentDate: DateTime! @apiValue
  trackId: String! @apiValue
  splits: [EmailDeploymentClickSplit!]! @apiValue(path: "splits", as: ARRAY)
}

type EmailDeploymentClickSplit {
  split: String! @apiValue
  subjectLine: String! @apiValue
  links: [EmailDeploymentClickLink!]! @apiValue(path: "links", as: ARRAY)
}

type EmailDeploymentClickLink {
  totalClicks: Int! @apiValue
  linkURL: String! @apiValue
  clicks: [EmailDeploymentClickInfo!]! @apiValue(path: "clicks", as: ARRAY)
  unrealClicks: [EmailDeploymentUnrealClickInfo!]! @apiValue(path: "unrealClicks", as: ARRAY)
}

type EmailDeploymentUnrealClickInfo {
  firstName: String @apiValue
  lastName: String @apiValue
  customerId: Int @apiValue
  encryptedCustomerId: String @apiValue
  emailAddress: String! @apiValue
  keyword: String @apiValue
  category: String @apiValue
  categoryValue: String @apiValue
  reasons: [EmailDeploymentUnrealClickReason!]! @apiValue(path: "UnrealClicks", as: ARRAY)
}

type EmailDeploymentUnrealClickReason {
  numberOfUnrealClicks: Int! @apiValue
  clickDate: DateTime! @apiValue
  reason: Int! @apiValue
}

type EmailDeploymentClickInfo {
  numberOfClicks: Int! @apiValue
  clickDate: DateTime! @apiValue
  firstName: String @apiValue
  lastName: String @apiValue
  customerId: Int @apiValue
  encryptedCustomerId: String @apiValue
  emailAddress: String! @apiValue
  keyword: String @apiValue
  category: String @apiValue
  categoryValue: String @apiValue
}

type EmailDeploymentListItem {
  id: String! @apiValue(path: "TrackId")
  createdBy: String! @apiValue
  createdDate: DateTime! @apiValue
  deploymentDesignation: DeploymentDesignation @codeOrType(instance: "DeploymentDesignation")
  deploymentName: String! @apiValue
  deploymentTypeId: Int! @apiValue
  deploymentTypeDescription: String! @apiValue
  deployment: EmailDeployment!
  finalApprover: String @apiValue
  owner: String! @apiValue
  scheduledDate: DateTime @apiValue
  sentDate: DateTime @apiValue
  status: DeploymentStatus! @codeOrType(instance: "DeploymentStatus")
  trackId: String! @apiValue
}

input EmailDeploymentByIdQueryInput {
  "The email deployment track ID to lookup."
  trackId: String!
}

"""
Dates are only precise to the _minute_ (seconds and milliseconds will be ignored/truncated).
The end date is _exclusive_ meaning if a click occured on the exact end date, it will _not_ be included.
"""
input SearchEmailClicksQueryInput {
  "Text match for deployment name. Required if \`trackId\` is not present."
  deploymentName: String
  "Text match for deployment trackId. Required if \`deploymentName\` is not present."
  trackId: String
  "Deployments have been clicked after this date. Required if \`endDate\` is present."
  startDate: DateTime
  "Deployments have been clicked prior to this date. Required if \`startDate\` is present"
  endDate: DateTime
}

"""
Dates are only precise to the _minute_ (seconds and milliseconds will be ignored/truncated).
"""
input SearchEmailDeploymentsQueryInput {
  "Deployments have been sent after this date."
  deploymentDateStart: DateTime
  "Deployments have been sent prior to this date."
  deploymentDateEnd: DateTime
  "An array of Deployment Designations."
  deploymentDesignations: [DeploymentDesignationEnum!] = []
  "Text match for deployment name."
  deploymentName: String
  "The deployment type ID you wish to filter the results by."
  deploymentTypeId: Int
  "Text match for user. Matches both the deployment Owner and the deployment creator. In the case of API deployments, the owner and the creator will be the same user."
  enteredByOrAssignedTo: String
  "Maximum number of deployments returned."
  numResults: Int = 50
  "An array of internal Omail deployment statuses."
  statuses: [DeploymentStatusSearchEnum!] = []
  "Text match for deployment trackId."
  trackId: String
}

input QueryEmailDeploymentContentByIdInput {
  "The email deployment track ID to retrieve content for."
  trackId: String!
  "The split number to lookup."
  splitNumber: Int!
  "The content type to retrieve."
  contentType: EmailDeploymentContentTypeEnum!
}

`;
