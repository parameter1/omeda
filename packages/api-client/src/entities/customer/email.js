const build = require('../../schema/utils/build');
const schema = require('../../schema/customer/email-elements');

class CustomerEmailEntity {
  constructor(obj) {
    Object.assign(this, build({ schema, obj }));
  }
}

module.exports = CustomerEmailEntity;
