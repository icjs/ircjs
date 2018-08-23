const Irc = require('./irc');
const networkMap = require('./res/registry/network-map');
const abi = require('./res/registry/abi.json');

class MethodRegistry {

  constructor(opts = {}) {
    this.provider = opts.provider || new Irc.HttpProvider('https://mainnet.infura.io/irc-contract-registry');
    this.irc = new Irc(this.provider);
    const address = networkMap[opts.network || '1'];

    if (!address) {
      throw new Error('No method registry found on the requested network.');
    }

    this.registry = this.irc.contract(abi).at(address);
  }

  async lookup(bytes) {
    const result = await this.registry.entries(bytes);
    return result[0];
  }

  parse(signature) {
    let name = signature.match(/^.+(?=\()/)[0];
    name = name.charAt(0).toUpperCase() + name.slice(1).split(/(?=[A-Z])/).join(' ');
    const args = signature.match(/\(.+\)/)[0].slice(1, -1).split(',');

    return {
      name,
      args: args.map(arg => ({type: arg})),
    };
  }

}

module.exports = MethodRegistry;
