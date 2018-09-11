const ENS = require('../');
const HttpProvider = require('ethjs-provider-http');
let ens;

// For MetaMask or Mist compatibility:
/** @namespace window.webu */
window.addEventListener('load', function() {
  if (typeof window.webu !== 'undefined') {
    console.log('webu browser detected, using.');
    webu.version.getNetwork(function(err, network) {
      if (err) {
        return resultField.innerText = 'There was a problem: ' + err.message;
      }
      ens = new ENS({provider: webu.currentProvider, network: network});
    });
  } else {
    console.log('no webu browser detected, using infura.');
    const provider = new HttpProvider('http://112.74.96.198/');
    ens = new ENS({provider, network: '1'});
  }

});

searchButton.addEventListener('click', function() {
  console.log('clicked button.');
  const query = lookupField.value;
  console.log('querying for ' + query);
  ens.lookup(query)
     .then((address) => {
       console.log('ens returned ' + address);
       resultField.innerText = address;
     })
     .catch((reason) => {
       console.log('ens failed!');
       console.error(reason);
       resultField.innerText = 'There was a problem: ' + reason.message;
     });

});
