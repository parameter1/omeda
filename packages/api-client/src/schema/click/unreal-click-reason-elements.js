const load = require('../utils/from-four-col');

/**
 * @note changed `ClickDate` datatype from `string` to `date`
 * @note changed `Reason` datatype from `string` to `integer`
 */
module.exports = load('click-unreal-click-reason-elements', `
<table>
  <tbody>
    <tr>
      <th>Element Name</th>
      <th>Required ?</th>
      <th>Data Type</th>
      <th>Description</th>
    </tr>
    <tr>
      <td>NumberOfUnrealClicks</td>
      <td>required</td>
      <td>Integer</td>
      <td>Number of the times that this customer (bot) clicked the link</td>
    </tr>
    <tr>
      <td>ClickDate</td>
      <td>required</td>
      <td>date</td>
      <td>Date and time which the customer (bot) clicked the link</td>
    </tr>
    <tr>
      <td>Reason</td>
      <td>required</td>
      <td>Integer</td>
      <td>Code for unreal click reason (see UnrealClick Reason Codes Legend below)</td>
    </tr>
  </tbody>
</table>
`);
