prefixForNetwork = network => {
  const net = parseInt(network);
  let prefix;
  switch (net) {
    case 1: // main net
      prefix = 'scan.';
      break;
    case 3: // test net
      prefix = 'p51';
      break;
    default:
      prefix = '';
  }
  return prefix;
};

module.exports.createAccountLink = (address, network) => {
  const net = parseInt(network);
  const prefix = prefixForNetwork(net);
  return `https://${prefix}irchain.io/address/${address}`;
};

module.exports.createExplorerLink = (hash, network) => {
  const net = parseInt(network);
  const prefix = prefixForNetwork(net);
  return `https://${prefix}irchain.io/tx/${hash}`;
};
