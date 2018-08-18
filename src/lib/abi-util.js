/*
Primary Attribution
Richard Moore <ricmoo@me.com>
https://github.com/ethers-io

Note, Richard is a god of ether gods. Follow and respect him, and use Ethers.io!
*/

const BN = require('bn.js');
const numberToBN = require('number-to-bn');
const Util = require('../util');

function hexOrBuffer(valueInput, name) {
  var value = valueInput;
  if (!Buffer.isBuffer(value)) {
    if (!Util.isHexString(value)) {
      const error = new Error(name ? (`invalid ${name}`) : 'invalid hex or buffer, must be a prefixed alphanumeric even length hex string');
      error.reason = 'invalid hex string, hex must be prefixed and alphanumeric (e.g. 0x023..)';
      error.value = value;
      throw error;
    }

    value = value.substring(2);
    if (value.length % 2) { value = `0${value}`; }
    value = new Buffer(value, 'hex');
  }

  return value;
}

// getKeys([{a: 1, b: 2}, {a: 3, b: 4}], 'a') => [1, 3]
function getKeys(params, key, allowEmpty) {
  var result = [];

  if (!Array.isArray(params)) { throw new Error(`while getting keys, invalid params value ${JSON.stringify(params)}`); }

  for (var i = 0; i < params.length; i++) {
    var value = params[i][key];
    if (allowEmpty && !value) {
      value = '';
    } else if (typeof(value) !== 'string') {
      throw new Error('while getKeys found invalid ABI data structure, type value not string');
    }
    result.push(value);
  }

  return result;
}

function coderNumber(size, signed) {
  return {
    encode: function encodeNumber(valueInput) {
      var value = valueInput;

      if (typeof value === 'object'
        && value.toString
        && (value.toTwos || value.dividedToIntegerBy)) {
        value = (value.toString(10)).split('.')[0];
      }

      if (typeof value === 'string' || typeof value === 'number') {
        value = String(value).split('.')[0];
      }

      value = numberToBN(value);
      value = value.toTwos(size * 8).maskn(size * 8);
      if (signed) {
        value = value.fromTwos(size * 8).toTwos(256);
      }
      return value.toArrayLike(Buffer, 'be', 32);
    },
    decode: function decodeNumber(data, offset) {
      var junkLength = 32 - size;
      var value = new BN(data.slice(offset + junkLength, offset + 32));
      if (signed) {
        value = value.fromTwos(size * 8);
      } else {
        value = value.maskn(size * 8);
      }
      return {
        consumed: 32,
        value: new BN(value.toString(10)),
      };
    },
  };
}
const uint256Coder = coderNumber(32, false);

const coderBoolean = {
  encode: function encodeBoolean(value) {
    return uint256Coder.encode(value ? 1 : 0);
  },
  decode: function decodeBoolean(data, offset) {
    var result = uint256Coder.decode(data, offset);
    return {
      consumed: result.consumed,
      value: !result.value.isZero(),
    };
  },
};

function coderFixedBytes(length) {
  return {
    encode: function encodeFixedBytes(valueInput) {
      var value = valueInput;
      value = hexOrBuffer(value);

      if (value.length === 32) { return value; }

      var result = new Buffer(32);
      result.fill(0);
      value.copy(result);
      return result;
    },
    decode: function decodeFixedBytes(data, offset) {
      if (data.length !== 0 && data.length < offset + 32) { throw new Error(`while decoding fixed bytes, invalid bytes data length: ${length}`); }

      return {
        consumed: 32,
        value: `0x${data.slice(offset, offset + length).toString('hex')}`,
      };
    },
  };
}

const coderAddress = {
  encode: function encodeAddress(valueInput) {
    var value = valueInput;
    var result = new Buffer(32);
    if (!Util.isHexString(value, 20)) { throw new Error('while encoding address, invalid address value, not alphanumeric 20 byte hex string'); }
    value = hexOrBuffer(value);
    result.fill(0);
    value.copy(result, 12);
    return result;
  },
  decode: function decodeAddress(data, offset) {
    if (data.length === 0) {
      return {
        consumed: 32,
        value: '0x',
      };
    }
    if (data.length !== 0 && data.length < offset + 32) { throw new Error(`while decoding address data, invalid address data, invalid byte length ${data.length}`); }
    return {
      consumed: 32,
      value: `0x${data.slice(offset + 12, offset + 32).toString('hex')}`,
    };
  },
};

function encodeDynamicBytesHelper(value) {
  var dataLength = parseInt(32 * Math.ceil(value.length / 32));
  var padding = new Buffer(dataLength - value.length);
  padding.fill(0);

  return Buffer.concat([
    uint256Coder.encode(value.length),
    value,
    padding,
  ]);
}

function decodeDynamicBytesHelper(data, offset) {
  if (data.length !== 0 && data.length < offset + 32) { throw new Error(`while decoding dynamic bytes data, invalid bytes length: ${data.length} should be less than ${offset + 32}`); }

  var length = uint256Coder.decode(data, offset).value;
  length = length.toNumber();
  if (data.length !== 0 && data.length < offset + 32 + length) { throw new Error(`while decoding dynamic bytes data, invalid bytes length: ${data.length} should be less than ${offset + 32 + length}`); }

  return {
    consumed: parseInt(32 + 32 * Math.ceil(length / 32), 10),
    value: data.slice(offset + 32, offset + 32 + length),
  };
}

const coderDynamicBytes = {
  encode: function encodeDynamicBytes(value) {
    return encodeDynamicBytesHelper(hexOrBuffer(value));
  },
  decode: function decodeDynamicBytes(data, offset) {
    var result = decodeDynamicBytesHelper(data, offset);
    result.value = `0x${result.value.toString('hex')}`;
    return result;
  },
  dynamic: true,
};

const coderString = {
  encode: function encodeString(value) {
    return encodeDynamicBytesHelper(new Buffer(value, 'utf8'));
  },
  decode: function decodeString(data, offset) {
    var result = decodeDynamicBytesHelper(data, offset);
    result.value = result.value.toString('utf8');
    return result;
  },
  dynamic: true,
};

function coderArray(coder, lengthInput) {
  return {
    encode: function encodeArray(value) {
      var result = new Buffer(0);
      var length = lengthInput;

      if (!Array.isArray(value)) { throw new Error('while encoding array, invalid array data, not type Object (Array)'); }

      if (length === -1) {
        length = value.length;
        result = uint256Coder.encode(length);
      }

      if (length !== value.length) { throw new Error(`while encoding array, size mismatch array length ${length} does not equal ${value.length}`); }

      value.forEach((resultValue) => {
        result = Buffer.concat([
          result,
          coder.encode(resultValue),
        ]);
      });

      return result;
    },
    decode: function decodeArray(data, offsetInput) {
      var length = lengthInput;
      var offset = offsetInput;
      // @TODO:
      // if (data.length < offset + length * 32) { throw new Error('invalid array'); }

      var consumed = 0;
      var decodeResult;

      if (length === -1) {
        decodeResult = uint256Coder.decode(data, offset);
        length = decodeResult.value.toNumber();
        consumed += decodeResult.consumed;
        offset += decodeResult.consumed;
      }

      var value = [];

      for (var i = 0; i < length; i++) {
        const loopResult = coder.decode(data, offset);
        consumed += loopResult.consumed;
        offset += loopResult.consumed;
        value.push(loopResult.value);
      }

      return {
        consumed,
        value,
      };
    },
    dynamic: (lengthInput === -1),
  };
}

// Break the type up into [staticType][staticArray]*[dynamicArray]? | [dynamicType] and
// build the coder up from its parts
const paramTypePart = new RegExp(/^((u?int|bytes)([0-9]*)|(address|bool|string)|(\[([0-9]*)\]))/);

function getParamCoder(typeInput) {
  var type = typeInput;
  var coder = null;
  const invalidTypeErrorMessage = `while getting param coder (getParamCoder) type value ${JSON.stringify(type)} is either invalid or unsupported by ethjs-abi.`;

  while (type) {
    var part = type.match(paramTypePart);
    if (!part) { throw new Error(invalidTypeErrorMessage); }
    type = type.substring(part[0].length);

    var prefix = (part[2] || part[4] || part[5]);
    switch (prefix) {
      case 'int': case 'uint':
        if (coder) { throw new Error(invalidTypeErrorMessage); }
        var intSize = parseInt(part[3] || 256);
        if (intSize === 0 || intSize > 256 || (intSize % 8) !== 0) {
          throw new Error(`while getting param coder for type ${type}, invalid ${prefix}<N> width: ${type}`);
        }

        coder = coderNumber(intSize / 8, (prefix === 'int'));
        break;

      case 'bool':
        if (coder) { throw new Error(invalidTypeErrorMessage); }
        coder = coderBoolean;
        break;

      case 'string':
        if (coder) { throw new Error(invalidTypeErrorMessage); }
        coder = coderString;
        break;

      case 'bytes':
        if (coder) { throw new Error(invalidTypeErrorMessage); }
        if (part[3]) {
          var size = parseInt(part[3]);
          if (size === 0 || size > 32) {
            throw new Error(`while getting param coder for prefix bytes, invalid type ${type}, size ${size} should be 0 or greater than 32`);
          }
          coder = coderFixedBytes(size);
        } else {
          coder = coderDynamicBytes;
        }
        break;

      case 'address':
        if (coder) { throw new Error(invalidTypeErrorMessage); }
        coder = coderAddress;
        break;

      case '[]':
        if (!coder || coder.dynamic) { throw new Error(invalidTypeErrorMessage); }
        coder = coderArray(coder, -1);
        break;

      // "[0-9+]"
      default:
        if (!coder || coder.dynamic) { throw new Error(invalidTypeErrorMessage); }
        var defaultSize = parseInt(part[6]);
        coder = coderArray(coder, defaultSize);
    }
  }

  if (!coder) { throw new Error(invalidTypeErrorMessage); }
  return coder;
}

module.exports = {
  hexOrBuffer,
  getKeys,
  numberToBN,
  coderNumber,
  uint256Coder,
  coderBoolean,
  coderFixedBytes,
  coderAddress,
  coderDynamicBytes,
  coderString,
  coderArray,
  paramTypePart,
  getParamCoder,
};
