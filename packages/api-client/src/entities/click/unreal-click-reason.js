const build = require('../../schema/utils/build');
const schema = require('../../schema/click/unreal-click-reason-elements');

class UnrealClickReasonEntity {
  constructor(obj) {
    Object.assign(this, build({ schema, obj }));
  }
}

module.exports = UnrealClickReasonEntity;
