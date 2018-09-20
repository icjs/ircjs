const BN = require('bn.js');
const keccak256 = require('js-sha3').keccak_256;

/**
 * Pads a `String` to have an even length
 * @param {String} value
 * @return {String} output
 */
function padToEven(value) {
  if (typeof value !== 'string') {
    throw new Error(`value must be string, is currently ${typeof value}.`);
  }
  if (value.length % 2 !== 0) {
    value = `0${value}`;
  }
  return value;
}

/**
 * Converts a `Number` into a hex `String`
 * @param {Number} i
 * @return {String}
 */
function intToHex(i) {
  const hex = i.toString(16);
  return `0x${hex}`;
}

/**
 * Converts an `Number` to a `Buffer`
 * @param {Number} i
 * @return {Buffer}
 */
function toBuffer(i) {
  const hex = intToHex(i);
  return Buffer.from(padToEven(hex.slice(2)), 'hex');
}

/**
 * Get the binary size of a string
 * @param {String} str
 * @return {Number}
 */
function getBinarySize(str) {
  if (typeof str !== 'string') {
    throw new Error(`while getting binary size, method getBinarySize requires input 'str' to be type String, got '${typeof str}'.`);
  }

  return Buffer.byteLength(str, 'utf8');
}

/**
 * Returns TRUE if the first specified array contains all elements
 * from the second one. FALSE otherwise.
 *
 * @param {array} superset
 * @param {array} subset
 * @param some
 * @returns {boolean}
 */
function arrayContainsArray(superset, subset, some) {
  if (Array.isArray(superset) !== true) { throw new Error(`method arrayContainsArray requires input 'superset' to be an array got type '${typeof superset}'`); }
  if (Array.isArray(subset) !== true) { throw new Error(`method arrayContainsArray requires input 'subset' to be an array got type '${typeof subset}'`); }

  return subset[Boolean(some) && 'some' || 'every']((value) => (superset.indexOf(value) >= 0));
}

/**
 * Should be called to get utf8 from it's hex representation
 *
 * @method toUtf8
 * @param {String} hex String in hex
 * @returns {String} ascii string representation of hex value
 */
function toUtf8(hex) {
  const bufferValue = Buffer.from(padToEven(stripHexPrefix(hex).replace(/^0+|0+$/g, '')), 'hex');

  return bufferValue.toString('utf8');
}

/**
 * Should be called to get ascii from it's hex representation
 *
 * @method toAscii
 * @param {String} hex string in hex
 * @returns {String} ascii string representation of hex value
 */
function toAscii(hex) {
  let str = '';
  let i = 0, l = hex.length;

  if (hex.substring(0, 2) === '0x') {
    i = 2;
  }

  for (; i < l; i += 2) {
    const code = parseInt(hex.substr(i, 2), 16);
    str += String.fromCharCode(code);
  }

  return str;
}

/**
 * Should be called to get hex representation (prefixed by 0x) of utf8 string
 *
 * @method fromUtf8
 * @param {String} stringValue
 * @returns {String} hex representation of input string
 */
function fromUtf8(stringValue) {
  const str = Buffer.from(stringValue, 'utf8');
  return `0x${padToEven(str.toString('hex')).replace(/^0+|0+$/g, '')}`;
}

/**
 * Should be called to get hex representation (prefixed by 0x) of ascii string
 *
 * @method fromAscii
 * @param {String} stringValue
 * @returns {String} hex representation of input string
 */
function fromAscii(stringValue) {
  let hex = '';
  for (let i = 0; i < stringValue.length; i++) {
    const code = stringValue.charCodeAt(i);
    const n = code.toString(16);
    hex += n.length < 2 ? `0${n}` : n;
  }
  return `0x${hex}`;
}

/**
 * getKeys([{a: 1, b: 2}, {a: 3, b: 4}], 'a') => [1, 3]
 *
 * @method getKeys get specific key from inner object array of objects
 * @param {String} params
 * @param {String} key
 * @param {Boolean} allowEmpty
 * @returns {Array} output just a simple array of output keys
 */
function getKeys(params, key, allowEmpty) {
  if (!Array.isArray(params)) {
    throw new Error(`method getKeys expecting type Array as 'params' input, got '${typeof params}'`);
  }
  if (typeof key !== 'string') {
    throw new Error(`method getKeys expecting type String for input 'key' got '${typeof key}'.`);
  }

  const result = [];
  for (let i = 0; i < params.length; i++) {
    let value = params[i][key];
    if (allowEmpty && !value) {
      value = '';
    } else if (typeof value !== 'string') {
      throw new Error('invalid abi');
    }
    result.push(value);
  }
  return result;
}

/**
 *
 * @param {String|Buffer} valueInput
 * @returns {Buffer}
 */
function hexToBuffer(valueInput) {
  let value = valueInput;
  if (!Buffer.isBuffer(value)) {
    if (!isHexString(value, null)) {
      const error = new Error('invalid hex or buffer, must be a prefixed alphanumeric even length hex string');
      error.reason = 'invalid hex string, hex must be prefixed and alphanumeric (e.g. 0x023..)';
      error.value = value;
      throw error;
    }

    value = value.substring(2);
    if (value.length % 2 !== 0) {
      value = `0${value}`;
    }
    value = Buffer.from(value, 'hex');
  }
  return value;
}

/**
 * Is the string a hex string.
 *
 * @method check if string is hex string of specific length
 * @param {String} value
 * @param {Number} length
 * @returns {Boolean} output the string is a hex string
 */
function isHexString(value, length) {
  if (typeof(value) !== 'string' || !value.match(/^0x[0-9A-Fa-f]*$/)) {
    return false;
  }
  return !(length && value.length !== 2 + 2 * length);
}

/**
 * Returns a `Boolean` on whether or not the a `String` starts with '0x'
 * @param {String} str the string input value
 * @return {Boolean} a boolean if it is or is not hex prefixed
 * @throws if the str input is not a string
 */
function isHexPrefixed(str) {
  if (typeof str !== 'string') {
    throw new Error(`value must be type string, is currently type ${typeof str}.`);
  }
  return str.slice(0, 2) === '0x';
}

/**
 * Removes '0x' from a given `String` if present
 * @param {String} str the string value
 * @return {String|Object} a string by pass if necessary
 */
function stripHexPrefix(str) {
  if (typeof str !== 'string') {
    return str;
  }
  return isHexPrefixed(str) ? str.slice(2) : str;
}

/**
 * Returns a BN object, converts a number value to a BN
 * @param {String|Number|Object} `arg` input a string number, hex string number, number, BigNumber or BN object
 * @return {BN} `output` BN object of the number
 * @throws if the argument is not an array, object that isn't a bignumber, not a string number or number
 */
function toBN(arg) {
  if (typeof arg === 'string' || typeof arg === 'number') {
    const formattedString = String(arg).toLowerCase().trim();
    const isHexPrefixed = formattedString.substr(0, 2) === '0x' || formattedString.substr(0, 3) === '-0x';
    let multiplier = new BN(1);
    let stringArg = stripHexPrefix(formattedString);
    if (stringArg.substr(0, 1) === '-') {
      stringArg = stripHexPrefix(stringArg.slice(1));
      multiplier = new BN(-1, 10);
    }
    stringArg = stringArg === '' ? '0' : stringArg;

    if ((!stringArg.match(/^-?[0-9]+$/) && stringArg.match(/^[0-9A-Fa-f]+$/))
      || stringArg.match(/^[a-fA-F]+$/)
      || (isHexPrefixed === true && stringArg.match(/^[0-9A-Fa-f]+$/))) {
      return new BN(stringArg, 16).mul(multiplier);
    }

    if ((stringArg.match(/^-?[0-9]+$/) || stringArg === '') && isHexPrefixed === false) {
      return new BN(stringArg, 10).mul(multiplier);
    }
  } else if (typeof arg === 'object' && arg.toString && (!arg.pop && !arg.push)) {
    if (arg.toString(10).match(/^-?[0-9]+$/) && (arg.mul || arg.dividedToIntegerBy)) {
      return new BN(arg.toString(10), 10);
    }
  }

  throw new Error('[number-to-bn] while converting number ' + JSON.stringify(arg) + ' to BN.js instance, error: invalid number value. Value must be an integer, hex string, BN or BigNumber instance. Note, decimals are not supported.');
}

/**
 * Pops the last element of args if which typeof function
 * @param {Array} args
 * @returns {boolean|Array}
 */
popCallback = (args) => typeof args[args.length - 1] === 'function' && args.pop();

module.exports = {
  keccak256,
  arrayContainsArray,
  getBinarySize,
  BN,
  toBN,
  toBuffer,
  isHexString,
  hexToBuffer,
  isHexPrefixed,
  stripHexPrefix,
  padToEven,
  intToHex,
  fromAscii,
  fromUtf8,
  toAscii,
  toUtf8,
  getKeys,
  popCallback,
};
