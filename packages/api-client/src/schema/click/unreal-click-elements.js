const load = require('../utils/from-four-col');

/**
 * @note changed `CustomerId` datatype from `string` to `integer`
 */
module.exports = load('click-unreal-click-elements', `
<table>
  <tbody>
    <tr>
      <th>Element Name</th>
      <th>Required ?</th>
      <th>Data Type</th>
      <th>Description</th>
    </tr>
    <tr>
      <td>UnrealClicks</td>
      <td>required</td>
      <td>string</td>
      <td>JSON element containing one or more UnrealClick (bot) Responses (see UnrealClick Reasons Returned below)</td>
    </tr>
    <tr>
      <td>FirstName</td>
      <td>required</td>
      <td>string</td>
      <td>first name</td>
    </tr>
    <tr>
      <td>LastName</td>
      <td>required</td>
      <td>string</td>
      <td>last name</td>
    </tr>
    <tr>
      <td>CustomerId</td>
      <td>required</td>
      <td>Integer</td>
      <td>Internal customer id (for use on certain databases)</td>
    </tr>
    <tr>
      <td>EncryptedCustomerId</td>
      <td>required</td>
      <td>string</td>
      <td>The Encrypted Customer Id for the customer</td>
    </tr>
    <tr>
      <td>EmailAddress</td>
      <td>required</td>
      <td>string</td>
      <td>Email address for which the click occurred</td>
    </tr>
    <tr>
      <td>Keyword</td>
      <td>optional</td>
      <td>string</td>
      <td>Keyword for the link which was clicked</td>
    </tr>
    <tr>
      <td>Category</td>
      <td>optional</td>
      <td>string</td>
      <td>Category for the link which was clicked</td>
    </tr>
    <tr>
      <td>CategoryValue</td>
      <td>optional</td>
      <td>string</td>
      <td>Category value for the link which was clicked</td>
    </tr>
  </tbody>
</table>
`);
