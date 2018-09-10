const IrcEns = require('./ens');
const IrcQuery = require('./query');
const IrcFilter = require('./filter');
const IrcContract = require('./contract');
const HttpProvider = require('./provider');
const abi = require('./abi');
const account = require('./account');
const format = require('./format');
const schema = require('./schema');
const signer = require('./signer');
const unit = require('./unit');
const utils = require('./utils');
const scanLink = require('./scan-link');
const keccak256 = require('js-sha3').keccak_256;
const BN = require('bn.js');
const getTxSuccess = require('./lib/get-tx-success');

module.exports = Irc;

/**
 * Returns the ircjs Irc instance.
 *
 * @method Irc
 * @param {Object} provider the webu standard provider object
 * @param {Object} options the Irc options object
 * @returns {Object} irc Irc object instance
 * @throws if the new flag is not used in construction
 */

function Irc(provider, options) {
  if (!(this instanceof Irc)) { throw new Error('the Irc object requires you construct it with the "new" flag.'); }
  const self = this;
  self.options = options || {};
  const query = new IrcQuery(provider, self.options.query);
  Object.keys(Object.getPrototypeOf(query)).forEach(
    method => self[method] = query[method].bind(query));
  self.filter = new IrcFilter(query);
  self.contract = abi => (new IrcContract(query))(abi); // parentheses for helping IDE to type inference
  self.currentProvider = query.rpc.currentProvider;
  self.setProvider = query.setProvider;
  self.getTxSuccess = getTxSuccess(self);
}

Irc.abi = abi;
Irc.account = account;
Irc.format = format;
Irc.schema = schema;
Irc.signer = signer;
Irc.scanLink = scanLink;
Irc.HttpProvider = HttpProvider;
Irc.Contract = IrcContract;
Irc.Query = IrcQuery;
Irc.ENS = IrcEns;
Irc.isAddress = (val) => utils.isHexString(val, 20);
Irc.keccak256 = (val) => `0x${keccak256(val)}`;
Irc.BN = BN;
Irc.Buffer = Buffer;
Irc.isHexString = utils.isHexString;
Irc.fromWei = unit.fromWei;
Irc.toWei = unit.toWei;
Irc.toBN = utils.toBN;
Irc.fromAscii = utils.fromAscii;
Irc.toAscii = utils.toAscii;
Irc.fromUtf8 = utils.fromUtf8;
Irc.toUtf8 = utils.toUtf8;
