const promiseToCallback = require('promise-to-callback');

module.exports = IrcRPC;

/**
 * Constructs the IrcRPC instance
 *
 * @method IrcRPC
 * @param {Object} cprovider the irc rpc provider web3 standard..
 * @param {Object} options the options, if any
 * @returns {Object} ircrpc instance
 */
function IrcRPC(cprovider, options) {
  const self = this;
  const optionsObject = options || {};

  if (!(this instanceof IrcRPC)) {
    throw new Error('the IrcRPC object requires the "new" flag in order to function normally.');
  }

  self.options = Object.assign({
    jsonSpace: optionsObject.jsonSpace || 0,
    max: optionsObject.max || 9999999999999,
  });
  self.idCounter = Math.floor(Math.random() * self.options.max);
  self.setProvider = (provider) => {
    if (typeof provider !== 'object') {
      throw new Error(`the IrcRPC object requires that the first input 'provider' must be an object, got '${typeof provider}'.`);
    }

    self.currentProvider = provider;
  };
  self.setProvider(cprovider);
}

/**
 * The main send async method
 *
 * @method sendAsync
 * @param {Object} payload the rpc payload object
 * @param {Function} callback the async standard callback
 * @callback {Object|Array|Boolean|String} vary result instance output
 */
IrcRPC.prototype.sendAsync = function sendAsync(payload, callback) {
  const self = this;
  self.idCounter = self.idCounter % self.options.max;
  const parsedPayload = createPayload(payload, self.idCounter++);

  const promise = new Promise((resolve, reject) => {
    self.currentProvider.sendAsync(parsedPayload, (err, response) => {
      const responseObject = response || {};

      if (err || responseObject.error) {
        const payloadErrorMessage = `${(responseObject.error && 'rpc' || '')} error with payload ${JSON.stringify(
          parsedPayload,
          null,
          self.options.jsonSpace)} ${err ? String(err) : (JSON.stringify(responseObject.error, null, self.options.jsonSpace))}`;
        const payloadError = new Error(payloadErrorMessage);
        payloadError.value = (err || responseObject.error);
        reject(payloadError);
        return;
      }
      resolve(responseObject.result);
    });
  });

  if (callback) {
    // connect promise resolve handlers to callback
    return promiseToCallback(promise)(callback);
  }

  // only return promise if no callback specified
  return promise;
};

/**
 * A simple create payload method
 *
 * @method createPayload
 * @param {Object} data the rpc payload data
 * @param {String} id the rpc data payload ID
 * @returns {Object} payload the completed payload object
 */
function createPayload(data, id) {
  return Object.assign({}, {
    id,
    jsonrpc: '2.0',
    params: [],
  }, data);
}
