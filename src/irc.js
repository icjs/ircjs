const IrcQuery = require('./query');
const IrcFilter = require('./filter');
const IrcContract = require('./contract');
const HttpProvider = require('./provider');
const abi = require('./abi');
const unit = require('./unit');
const keccak256 = require('js-sha3').keccak_256;
const BN = require('bn.js');
const utils = require('./util');
const getTxSuccess = require('./lib/getTxSuccess');

module.exports = Irc;

/**
 * Returns the ethjs Irc instance.
 *
 * @method Irc
 * @param {Object} cprovider the webu standard provider object
 * @param {Object} options the Irc options object
 * @returns {Object} eth Irc object instance
 * @throws if the new flag is not used in construction
 */

function Irc(cprovider, options) {
  if (!(this instanceof Irc)) { throw new Error('the Irc object requires you construct it with the "new" flag.'); }
  const self = this;
  self.options = options || {};
  const query = new IrcQuery(cprovider, self.options.query);
  Object.keys(Object.getPrototypeOf(query)).forEach((methodName) => {
    self[methodName] = (...args) => query[methodName].apply(query, args);
  });
  self.filter = new IrcFilter(query, self.options.query);
  self.contract = new IrcContract(query, self.options.query);
  self.currentProvider = query.rpc.currentProvider;
  self.setProvider = query.setProvider;
  self.getTxSuccess = getTxSuccess(self);
}

Irc.BN = BN;
Irc.isAddress = (val) => utils.isHexString(val, 20);
Irc.keccak256 = (val) => `0x${keccak256(val)}`;
Irc.Buffer = Buffer;
Irc.isHexString = utils.isHexString;
Irc.fromWei = unit.fromWei;
Irc.toWei = unit.toWei;
Irc.toBN = utils.toBN;
Irc.abi = abi;
Irc.fromAscii = utils.fromAscii;
Irc.toAscii = utils.toAscii;
Irc.fromUtf8 = utils.fromUtf8;
Irc.toUtf8 = utils.toUtf8;
Irc.HttpProvider = HttpProvider;
