// workaround to use httpprovider in different envs
const XHR2 = require('xhr2');

/**
 * InvalidResponseError helper for invalid errors.
 */
function invalidResponseError(result, host) {
  const message = !!result && !!result.error && !!result.error.message
    ? `${result.error.message}`
    : `Invalid JSON RPC response from host provider ${host}: ${JSON.stringify(result, null, 2)}`;
  return new Error(message);
}

/**
 * HttpProvider should be used to send rpc calls over http
 */
function HttpProvider(host, timeout) {
  if (!(this instanceof HttpProvider)) { throw new Error('the HttpProvider instance requires the "new" flag in order to function normally.'); }
  if (typeof host !== 'string') { throw new Error('the HttpProvider instance requires that the host be specified'); }

  const self = this;
  self.host = host;
  self.timeout = timeout || 0;
}

/**
 * Should be used to make async request
 *
 * @method sendAsync
 * @param {Object} payload
 * @param {Function} callback triggered on end with (err, result)
 */
HttpProvider.prototype.sendAsync = function(payload, callback) {
  const self = this;
  const request = new XHR2();

  request.timeout = self.timeout;
  request.open('POST', self.host, true);
  request.setRequestHeader('Content-Type', 'application/json');

  request.onreadystatechange = () => {
    if (request.readyState === 4 && request.timeout !== 1) {
      let result = request.responseText;
      let error = null;

      try {
        result = JSON.parse(result);
      } catch (jsonError) {
        error = invalidResponseError(request.responseText, self.host);
      }

      callback(error, result);
    }
  };

  request.ontimeout = () => {
    callback(
      `CONNECTION TIMEOUT: http request timeout after ${self.timeout} ms. (i.e. your connect has timed out for whatever reason, check your provider).`,
      null);
  };

  try {
    request.send(JSON.stringify(payload));
  } catch (error) {
    callback(`CONNECTION ERROR: Couldn't connect to node '${self.host}': ${JSON.stringify(error, null, 2)}`, null);
  }
};

module.exports = HttpProvider;
