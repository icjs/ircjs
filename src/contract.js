const abi = require('./abi');
const IrcFilter = require('./filter');
const getKeys = require('./utils').getKeys;
const keccak256 = require('js-sha3').keccak_256;
const promiseToCallback = require('promise-to-callback');

module.exports = IrcContract;

function IrcContract(query) {
  return function contractFactory(contractABI, contractBytecode, contractDefaultTxObject) {
    // validate params
    if (!Array.isArray(contractABI)) { throw new Error(`Contract ABI must be type Array, got type ${typeof contractABI}`); }
    if (typeof contractBytecode !== 'undefined' && typeof contractBytecode !== 'string') { throw new Error(`Contract bytecode must be type String, got type ${typeof contractBytecode}`); }
    if (typeof contractDefaultTxObject !== 'undefined' && typeof contractDefaultTxObject !== 'object') { throw new Error(`Contract default tx object must be type Object, got type ${typeof contractABI}`); }

    // build contract object
    const output = {};
    output.at = function contractAtAddress(address) {
      return new Contract({
        address,
        query,
        contractBytecode,
        contractDefaultTxObject,
        contractABI,
      });
    };
    output.new = function newContract() {
      let providedTxObject = {};
      let newMethodCallback = null;
      const newMethodArgs = [].slice.call(arguments);
      if (typeof newMethodArgs[newMethodArgs.length - 1] === 'function') newMethodCallback = newMethodArgs.pop();
      if (hasTransactionObject(newMethodArgs)) providedTxObject = newMethodArgs.pop();
      const constructorMethod = getConstructorFromABI(contractABI);
      const assembleTxObject = Object.assign({}, contractDefaultTxObject, providedTxObject);

      // set contract deploy bytecode
      if (contractBytecode) {
        assembleTxObject.data = contractBytecode;
      }

      // append encoded constructor arguments
      if (constructorMethod) {
        const constructorBytecode = abi.encodeParams(getKeys(constructorMethod.inputs, 'type'), newMethodArgs).substring(2);
        assembleTxObject.data = `${assembleTxObject.data}${constructorBytecode}`;
      }

      return newMethodCallback ? query.sendTransaction(assembleTxObject, newMethodCallback) : query.sendTransaction(assembleTxObject);
    };

    return output;
  };
}

function Contract(opts = {}) {
  const self = this;
  self.abi = opts.contractABI || [];
  self.query = opts.query;
  self.address = opts.address || '0x';
  self.bytecode = opts.contractBytecode || '0x';
  self.defaultTxObject = opts.contractDefaultTxObject || {};
  self.filters = new IrcFilter(self.query);

  getCallableMethodsFromABI(self.abi).forEach((methodObject) => {
    if (methodObject.type === 'function') {
      self[methodObject.name] = createContractFunction(methodObject);
    } else if (methodObject.type === 'event') {
      self[methodObject.name] = createContractEvent(methodObject);
    }
  });

  function createContractEvent(methodObject) {
    return function contractEvent() {
      const methodArgs = [].slice.call(arguments);

      const filterInputTypes = getKeys(methodObject.inputs, 'type', false);
      const filterTopic = `0x${keccak256(`${methodObject.name}(${filterInputTypes.join(',')})`)}`;
      const filterTopics = [filterTopic];
      const argsObject = Object.assign({}, methodArgs[0]) || {};

      const defaultFilterObject = Object.assign({}, (methodArgs[0] || {}), {
        to: self.address,
        topics: filterTopics,
      });
      const filterOpts = Object.assign({}, argsObject, {
        decoder: (logData) => abi.decodeEvent(methodObject, logData, filterTopics),
        defaultFilterObject,
      });

      return new self.filters.Filter(filterOpts);
    };
  }

  function createContractFunction(methodObject) {
    return function contractFunction() {
      let methodCallback;
      const methodArgs = [].slice.call(arguments);
      if (typeof methodArgs[methodArgs.length - 1] === 'function') {
        methodCallback = methodArgs.pop();
      }

      const promise = performCall({methodObject, methodArgs});

      if (methodCallback) {
        return promiseToCallback(promise)(methodCallback);
      }

      return promise;
    };
  }

  async function performCall({methodObject, methodArgs}) {
    let queryMethod = 'call';
    let providedTxObject = {};

    if (hasTransactionObject(methodArgs)) providedTxObject = methodArgs.pop();
    const methodTxObject = Object.assign({},
      self.defaultTxObject,
      providedTxObject, {
        to: self.address,
      });
    methodTxObject.data = abi.encodeMethod(methodObject, methodArgs);

    if (methodObject.constant === false) {
      queryMethod = 'sendTransaction';
    }

    const queryResult = await self.query[queryMethod](methodTxObject);

    if (queryMethod === 'call') {
      // queryMethod is 'call', result is returned value
      try {
        return abi.decodeMethod(methodObject, queryResult);
      } catch (decodeFormattingError) {
        throw new Error(`while formatting incoming raw call data ${JSON.stringify(queryResult)} ${decodeFormattingError}`);
      }
    }
    // queryMethod is 'sendTransaction', result is txHash
    return queryResult;
  }
}

const txObjectProperties = ['from', 'to', 'data', 'value', 'gasPrice', 'gas'];

const hasTransactionObject = function(args) {
  // bad/empty args: bad
  if (!Array.isArray(args) || args.length === 0) {
    return false;
  }
  const lastArg = args[args.length - 1];
  // missing or non-object: bad
  if (!lastArg) return false;
  if (typeof lastArg !== 'object') {
    return false;
  }
  // empty object: good
  if (Object.keys(lastArg).length === 0) {
    return true;
  }
  // txParams object: good
  const keys = Object.keys(lastArg);
  const hasMatchingKeys = txObjectProperties.some((value) => keys.includes(value));
  if (hasMatchingKeys) {
    return true;
  }
  // no match
  return false;
};

const getConstructorFromABI = function(contractABI) {
  return contractABI.filter((json) => (json.type === 'constructor'))[0];
};

const getCallableMethodsFromABI = function(contractABI) {
  return contractABI.filter((json) => ((json.type === 'function' || json.type === 'event') && json.name.length > 0));
};