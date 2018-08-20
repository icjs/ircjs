const keccak = require('js-sha3').keccak_256;
const uts46 = require('idna-uts46-hx');

function namehash(name) {
  let i, node = '';
  for (i = 0; i < 32; i++) {
    node += '00';
  }

  name = normalize(name);

  if (name) {
    const labels = name.split('.');

    for (i = labels.length - 1; i >= 0; i--) {
      const labelSha = keccak(labels[i]);
      node = keccak(new Buffer(node + labelSha, 'hex'));
    }
  }

  return '0x' + node;
}

function normalize(name) {
  return name ? uts46.toAscii(name, {useStd3ASCII: true, transitional: false}) : name;
}

exports.hash = namehash;
exports.normalize = normalize;