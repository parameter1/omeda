const { asArray } = require('@parameter1/utils');
const build = require('../../schema/utils/build');
const schema = require('../../schema/click/link-elements');

const ClickEntity = require('./click');
const UnrealClickEntity = require('./unreal-click');

const builder = ({ name, value }) => {
  if (name === 'clicks') {
    return asArray(value).map((obj) => new ClickEntity(obj));
  }
  if (name === 'unrealClicks') {
    return asArray(value).map((obj) => new UnrealClickEntity(obj));
  }
  return null;
};

class LinkClickEntity {
  constructor(obj) {
    Object.assign(this, build({ schema, obj, builder }));
  }
}

module.exports = LinkClickEntity;
