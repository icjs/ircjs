const format = require('./format');
const IrcRPC = require('./rpc');
const promiseToCallback = require('promise-to-callback');
const HttpProvider = require('./provider');

module.exports = IrcQuery;

class IrcQuery {
  constructor(provider, options) {
    options = options || {};
    provider = provider || HttpProvider('http:///localhost:8545/');
    this.options = Object.assign({
      debug: options.debug || false,
      logger: options.logger || console,
      jsonSpace: options.jsonSpace || 0,
    });
    this.rpc = new IrcRPC(provider, {});
    this.setProvider = this.rpc.setProvider;
  }

  log(message) {
    this.options.debug && this.options.logger.log(message);
  };
}

Object.keys(format.schema.methods).forEach((rpcMethod) => {
  Object.defineProperty(IrcQuery.prototype, rpcMethod.replace('irc_', ''), {
    enumerable: true,
    value: generateFnFor(rpcMethod),
  });
});

function generateFnFor(rpcMethod) {
  return function outputMethod() {
    const args = [].slice.call(arguments);
    const callback = utils.popCallback(args);
    const promise = performCall.call(this, args, rpcMethod);

    // if callback provided, convert promise to callback
    if (callback) {
      return promiseToCallback(promise)(callback);
    }

    // only return promise if no callback provided
    return promise;
  };
}

async function performCall(args, rpcMethod) {
  const protoMethod = rpcMethod.replace('irc_', '');
  const methodObj = format.schema.methods[rpcMethod];
  const self = this;
  const stringify = data => JSON.stringify(data, null, self.options.jsonSpace);

  // validate arg length
  if (args.length < methodObj[2]) {
    throw new Error(`'${protoMethod}' requires at least ${methodObj[2]} input.`);
  }
  if (args.length > methodObj[0].length) {
    throw new Error(`'${protoMethod}' requires at most ${methodObj[0].length} params.`);
  }

  // set default block
  if (methodObj[3] && args.length < methodObj[3]) {
    args.push('latest');
  }

  // format inputs
  let inputs = null;
  try {
    inputs = format.formatInputs(rpcMethod, args);
  } catch (err) {
    throw new Error(`while formatting inputs '${stringify(args)}' for method '${protoMethod}', ${err}`);
  }

  // perform rpc call
  const result = await self.rpc.sendAsync({method: rpcMethod, params: inputs}, null);
  // format result
  try {
    return format.formatOutputs(rpcMethod, result);
  } catch (err) {
    throw new Error(`while formatting outputs '${stringify(result)}' for method '${protoMethod}', ${err}`);
  }
}