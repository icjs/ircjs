const rlp = require('rlp');
const elliptic = require('elliptic');
const keccak256 = require('js-sha3').keccak_256;
const secp256k1 = new (elliptic.ec)('secp256k1');
const stripHexPrefix = require('./utils').stripHexPrefix;
const toBN = require('./utils').toBN;

function stripZeros(buffer) {
  let i;
  for (i = 0; i < buffer.length; i++) {
    if (buffer[i] !== 0) { break; }
  }
  return (i > 0) ? buffer.slice(i) : buffer;
}

function padToEven(str) {
  return str.length % 2 ? `0${str}` : str;
}

function bnToBuffer(bn) {
  return stripZeros(Buffer.from(padToEven(bn.toString(16)), 'hex'));
}

const transactionFields = [
  {name: 'nonce', maxLength: 32, number: true},
  {name: 'gasPrice', maxLength: 32, number: true},
  {name: 'gasLimit', maxLength: 32, number: true},
  {name: 'to', length: 20},
  {name: 'value', maxLength: 32, number: true},
  {name: 'data'},
];

/**
 * ECDSA public key recovery from a rawTransaction
 *
 * @method recover
 * @param {String|Buffer} rawTx either a hex string or buffer instance
 * @param {Number} v
 * @param {Buffer} r
 * @param {Buffer} s
 * @return {Buffer} publicKey
 */

function recover(rawTx, v, r, s) {
  const rawTransaction = typeof(rawTx) === 'string' ? Buffer.from(stripHexPrefix(rawTx), 'hex') : rawTx;
  const signedTransaction = rlp.decode(rawTransaction);
  const raw = [];

  transactionFields.forEach((fieldInfo, fieldIndex) => {
    raw[fieldIndex] = signedTransaction[fieldIndex];
  });

  const publicKey = secp256k1.recoverPubKey(Buffer.from(keccak256(rlp.encode(raw)), 'hex'), {r, s}, v - 27);
  return (Buffer.from(publicKey.encode('hex', false), 'hex')).slice(1);
}

/**
 * Will sign a raw transaction and return it either as a serlized hex string or raw tx object.
 *
 * @method sign
 * @param {Object} transaction a valid transaction object
 * @param {String} privateKey a valid 32 byte prefixed hex string private key
 * @param {Boolean} toObject **Optional**
 * @returns {String|Object} output either a serilized hex string or signed tx object
 */

function sign(transaction, privateKey, toObject) {
  if (typeof privateKey !== 'string') {
    throw new Error('private key input must be a string');
  }
  if (typeof transaction !== 'object' || transaction === null) {
    throw new Error(`transaction input must be a type 'object', got '${typeof(transaction)}'`);
  }
  if (!privateKey.match(/^(0x)[0-9a-fA-F]{64}$/)) {
    throw new Error('invalid private key value, private key must be a prefixed hexified 32 byte string.');
  }

  const raw = [];

  transactionFields.forEach((fieldInfo) => {
    let value = Buffer.alloc(0);

    // shim for field name gas
    const txKey = (fieldInfo.name === 'gasLimit' && transaction.gas) ? 'gas' : fieldInfo.name;

    if (typeof transaction[txKey] !== 'undefined') {
      if (fieldInfo.number === true) {
        value = bnToBuffer(toBN(transaction[txKey]));
      } else {
        value = Buffer.from(padToEven(stripHexPrefix(transaction[txKey])), 'hex');
      }
    }

    // Fixed-width field
    if (fieldInfo.length && value.length !== fieldInfo.length && value.length > 0) {
      throw new Error(
        `while signing raw transaction, invalid '${fieldInfo.name}', invalid length should be '${fieldInfo.length}' got '${value.length}'`);
    }

    // Variable-width (with a maximum)
    if (fieldInfo.maxLength) {
      value = stripZeros(value);
      if (value.length > fieldInfo.maxLength) {
        throw new Error(
          `while signing raw transaction, invalid '${fieldInfo.name}' length, the max length is '${fieldInfo.maxLength}', got '${value.length}'`);
      }
    }

    raw.push(value);
  });

  // private key is not stored in memory
  const signature = secp256k1.keyFromPrivate(Buffer.from(privateKey.slice(2), 'hex')).
                              sign(Buffer.from(keccak256(rlp.encode(raw)), 'hex'), {canonical: true});

  raw.push(Buffer.from([27 + signature.recoveryParam]));
  raw.push(bnToBuffer(signature.r));
  raw.push(bnToBuffer(signature.s));

  return toObject ? raw : `0x${rlp.encode(raw).toString('hex')}`;
}

module.exports = {
  sign,
  recover,
};
