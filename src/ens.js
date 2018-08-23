// External Deps
const IrcQuery = require('./query');
const IrcContract = require('./contract');
const namehash = require('./lib/ensNameHash');

// ABIs
const registryAbi = require('./res/ens/registry.json');
const resolverAbi = require('./res/ens/resolver.json');

// var (
// MainnetGenesisHash = common.HexToHash("0xf29c3da3e1710517cbb3a555ab20981ec2c9abacbbcb914ab91e8c23edfbf4d0")
// TestnetGenesisHash = common.HexToHash("0x389d168191585e7a14b01a654c02058053abf3ca3d167efb69a51dec86d9cfbc")
// )
// Map network to known ENS registries
const networkMap = require('./res/ens/network-map');
const emptyHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
const emptyAddr = '0x0000000000000000000000000000000000000000';

const NotFoundError = new Error('ENS name not defined.');
const BadCharacterError = new Error('Illegal Character for ENS.');

class IrcEns {
  static get networkMap() {return networkMap;} ;
  static get namehash() {return namehash}

  constructor(opts = {}) {
    const {provider, network} = opts;
    let {registryAddress} = opts;

    // Validations
    if (!provider) {
      throw new Error('The IrcJsENS Constructor requires a provider.');
    }

    // Requires EITHER a network or a registryAddress
    if (!network && !registryAddress) {
      throw new Error('The IrcJsENS Constructor requires a network or registry address.');
    }

    this.provider = provider;
    this.irc = new IrcQuery(this.provider);
    this.contract = new IrcContract(this.irc);

    // Link to Registry
    this.Registry = this.contract(registryAbi);
    if (!registryAddress && network) {
      registryAddress = networkMap[network];
    }
    this.registry = this.Registry.at(registryAddress);

    // Create Resolver class
    this.Resolver = this.contract(resolverAbi);
  }

  lookup(name = '') {
    return IrcEns.getNamehash(name)
                 .then((node) => {
                 if (node === emptyHash) {
                   return Promise.reject(NotFoundError);
                 }
                 return this.resolveAddressForNode(node);
               });
  }

  static getNamehash(name) {
    try {
      return Promise.resolve(namehash.hash(name));
    } catch (e) {
      return Promise.reject(BadCharacterError);
    }
  }

  getOwner(name = '') {
    return IrcEns.getNamehash(name)
                 .then(node => this.getOwnerForNode(node));
  }

  getOwnerForNode(node) {
    if (node === emptyHash) {
      return Promise.reject(NotFoundError);
    }
    return this.registry.owner(node)
               .then((result) => {
                 const ownerAddress = result[0];
                 if (ownerAddress === emptyAddr) {
                   throw NotFoundError;
                 }

                 return ownerAddress;
               });
  }

  getResolver(name = '') {
    return IrcEns.getNamehash(name)
                 .then(node => this.getResolverForNode(node));
  }

  getResolverAddress(name = '') {
    return IrcEns.getNamehash(name)
                 .then(node => this.getResolverAddressForNode(node));
  }

  getResolverForNode(node) {
    if (!node.startsWith('0x')) {
      node = `0x${node}`;
    }

    return this.getResolverAddressForNode(node)
               .then((resolverAddress) => {
                 return this.Resolver.at(resolverAddress);
               });
  }

  getResolverAddressForNode(node) {
    return this.registry.resolver(node)
               .then((result) => {
                 const resolverAddress = result[0];
                 if (resolverAddress === emptyAddr) {
                   throw NotFoundError;
                 }
                 return resolverAddress;
               });
  }

  resolveAddressForNode(node) {
    return this.getResolverForNode(node)
               .then((resolver) => {
                 return resolver.addr(node);
               })
               .then(result => result[0]);
  }

  reverse(address) {
    if (!address) {
      return Promise.reject(new Error('Must supply an address to reverse lookup.'));
    }

    if (address.startsWith('0x')) {
      address = address.slice(2);
    }

    const name = `${address.toLowerCase()}.addr.reverse`;
    const node = IrcEns.namehash(name);
    return IrcEns.getNamehash(name)
                 .then(node => this.getResolverForNode(node))
                 .then(resolver => resolver.name(node))
                 .then(results => results[0]);
  }
}

module.exports = IrcEns;