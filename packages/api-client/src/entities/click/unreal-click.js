const { asArray } = require('@parameter1/utils');
const build = require('../../schema/utils/build');
const schema = require('../../schema/click/unreal-click-elements');

const UnrealClickReasonEntity = require('./unreal-click-reason');

const builder = ({ name, value }) => {
  if (name === 'UnrealClicks') {
    return asArray(value).map((obj) => new UnrealClickReasonEntity(obj));
  }
  return null;
};

class UnrealClickEntity {
  constructor(obj) {
    Object.assign(this, build({ schema, obj, builder }));
  }
}

module.exports = UnrealClickEntity;
