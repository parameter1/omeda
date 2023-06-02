const load = require('../utils/from-four-col');

/**
 * @note `Clicks` was renamed to `clicks` due to the actual response body.
 * @note `UnrealClicks` was renamed to `unrealClicks` due to the actual response body.
 */
module.exports = load('click-link-elements', `
<table>
  <tbody>
    <tr>
      <th>Element Name</th>
      <th>Required ?</th>
      <th>Data Type</th>
      <th>Description</th>
    </tr>
    <tr>
      <td>TotalClicks</td>
      <td>required</td>
      <td>Integer</td>
      <td>Sum of all of the NumberOfClicks returned in the Clicks array (see Click Elements Returned below)</td>
    </tr>
    <tr>
      <td>LinkURL</td>
      <td>required</td>
      <td>string</td>
      <td>The URL of the link that was clicked</td>
    </tr>
    <tr>
      <td>clicks</td>
      <td>required</td>
      <td>string</td>
      <td>JSON element containing one or more Click elements (see Click Elements Returned below)</td>
    </tr>
    <tr>
      <td>TotalUnrealClicks</td>
      <td>required</td>
      <td>Integer</td>
      <td>Sum of all of the NumberOfUnrealClicks (bot clicks) returned in the unrealClicks array (see<strong> </strong>UnrealClick Elements Returned below)</td>
    </tr>
    <tr>
      <td>unrealClicks</td>
      <td>required</td>
      <td>string</td>
      <td>JSON element containing one or more unrealClick (bot clicks) elements (see UnrealClick Elements Returned<strong> </strong>below)</td>
    </tr>
  </tbody>
</table>
`);
