const coder = require('./lib/abi-coder');
const uint256Coder = coder.uint256Coder;
const getParamCoder = coder.getParamCoder;
const util = require('./utils');
const stdTokenAbi = require('./res/ir-std-token-abi')['ir-token'];

const state = {
  savedABIs: stdTokenAbi,
  signatureIDs: {},
};

stdTokenAbi.forEach((method) => {
  if (method.name) {
    const signatureId = method.type === 'event' ? eventSignature(method) : encodeSignature(method);
    state.signatureIDs[signatureId.slice(2)] = method;
  }
});

/// Encodes

function encodeParams(types, values) {
  if (types.length !== values.length) {
    throw new Error(`while encoding params, Your contract requires ${types.length} types (arguments), and you passed in ${values.length}`);
  }

  const parts = [];

  types.forEach(function(type, index) {
    const coder = getParamCoder(type);
    parts.push({dynamic: coder.dynamic, value: coder.encode(values[index])});
  });

  function alignSize(size) {
    return parseInt(32 * Math.ceil(size / 32));
  }

  let staticSize = 0, dynamicSize = 0;
  parts.forEach(function(part) {
    if (part.dynamic) {
      staticSize += 32;
      dynamicSize += alignSize(part.value.length);
    } else {
      staticSize += alignSize(part.value.length);
    }
  });

  let offset = 0, dynamicOffset = staticSize;
  const data = Buffer.alloc(staticSize + dynamicSize);

  parts.forEach(function(part) {
    if (part.dynamic) {
      uint256Coder.encode(dynamicOffset).copy(data, offset);
      offset += 32;

      part.value.copy(data, dynamicOffset);
      dynamicOffset += alignSize(part.value.length);
    } else {
      part.value.copy(data, offset);
      offset += alignSize(part.value.length);
    }
  });

  return '0x' + data.toString('hex');
}

// create an encoded method signature from an ABI object
function encodeSignature(method) {
  const signature = `${method.name}(${util.getKeys(method.inputs, 'type').join(',')})`;
  return '0x' + util.keccak256(signature).slice(0, 8);
}

function eventSignature(method) {
  const signature = `${method.name}(${util.getKeys(method.inputs, 'type').join(',')})`;
  return '0x' + util.keccak256(signature);
}

// encode method ABI object with values in an array, output bytecode
function encodeMethod(method, values) {
  const paramsEncoded = encodeParams(util.getKeys(method.inputs, 'type'), values).substring(2);
  return encodeSignature(method) + paramsEncoded;
}

// decode method data bytecode, from method ABI object
function encodeEvent(eventObject, values) {
  return encodeMethod(eventObject, values);
}

/// Decodes

// decode bytecode data from output names and types
function decodeParams(names, types, data) {
  // Names is optional, so shift over all the parameters if not provided
  if (arguments.length < 3) {
    data = types;
    types = names;
    names = [];
  }

  data = util.hexToBuffer(data);

  let offset = 0;

  return [...types.keys()].map(index => {
    const coder = getParamCoder(types[index]);
    let result;

    if (coder.dynamic) {
      const dynamicOffset = uint256Coder.decode(data, offset);
      result = coder.decode(data, dynamicOffset.value.toNumber());
      offset += dynamicOffset.consumed;
    } else {
      result = coder.decode(data, offset);
      offset += result.consumed;
    }

    return {
      name: names[index],
      value: result.value,
      type: types[index],
    };
  });
}

// decode method data bytecode, from method ABI object
/** @namespace method.inputs */
function decodeMethod(data) {
  const method = state.signatureIDs[data.slice(2, 10)];
  const inputNames = util.getKeys(method.inputs, 'name', true);
  const inputTypes = util.getKeys(method.inputs, 'type');
  return {
    name: method.name,
    params: decodeParams(inputNames, inputTypes, data),
  };
}

/** @namespace method.outputs */
function decodeCall(method, data) {
  // const method = state.signatureIDs[data.slice(2, 10)];
  const outputNames = util.getKeys(method.outputs, 'name', true);
  const outputTypes = util.getKeys(method.outputs, 'type');
  return decodeParams(outputNames, outputTypes, data);
}

// decode method data bytecode, from method ABI object
function decodeEvent(data, topics) {
  const eventObject = this.state.signatureIDs[data];
  const nonIndexed = eventObject.inputs.filter((input) => !input.indexed);
  const nonIndexedNames = util.getKeys(nonIndexed, 'name', true);
  const nonIndexedTypes = util.getKeys(nonIndexed, 'type');
  const event = decodeParams(nonIndexedNames, nonIndexedTypes, data);
  const topicOffset = eventObject.anonymous ? 0 : 1;

  eventObject.inputs.filter((input) => input.indexed).map((input, i) => {
    const topic = Buffer.from(topics[i + topicOffset].slice(2), 'hex');
    const coder = getParamCoder(input.type);
    event[input.name] = coder.decode(topic, 0).value;
  });
  event._eventName = eventObject.name;
  return event;
}

module.exports = {
  stdTokenAbi,
  encodeParams,
  encodeMethod,
  encodeEvent,
  decodeParams,
  decodeMethod,
  decodeCall,
  decodeEvent,
};
