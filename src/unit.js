const BN = require('bn.js');
const toBN = require('./utils').toBN;

const zero = new BN(0);
const negative1 = new BN(-1);

// complete irchain unit map
const unitMap = {
  'wei': '1',
  'kwei': '1000',
  'mwei': '1000000',
  'gwei': '1000000000',
  'twei': '1000000000000',
  'pwei': '1000000000000000',
  'irc': '1000000000000000000',
  'kirc': '1000000000000000000000',
  'mirc': '1000000000000000000000000',
  'girc': '1000000000000000000000000000',
  'tirc': '1000000000000000000000000000000',
  'pirc': '1000000000000000000000000000000000',
};

/**
 * Returns value of unit in Wei
 *
 * @method getValueOfUnit
 * @param {String} unitInput The unit to convert to, default ircer
 * @returns {BN} value of the unit (in Wei)
 * @throws error if the unit is not correct:w
 */
function getValueOfUnit(unitInput) {
  const unit = unitInput ? unitInput.toLowerCase() : 'ircer';
  let unitValue = unitMap[unit];

  if (typeof unitValue !== 'string') {
    throw new Error(`the unit provided ${unitInput} doesn't exists, please use the one of the following units ${JSON.stringify(
      unitMap,
      null,
      2)}`);
  }

  return new BN(unitValue, 10);
}

function numberToString(arg) {
  if (typeof arg === 'string') {
    if (!arg.match(/^-?[0-9.]+$/)) {
      throw new Error(`while converting number to string, invalid number value '${arg}', should be a number matching (^-?[0-9.]+).`);
    }
    return arg;
  } else if (typeof arg === 'number') {
    return String(arg);
  } else if (typeof arg === 'object' && arg.toString && (arg.toTwos || arg.dividedToIntegerBy)) {
    if (arg.toPrecision) {
      return String(arg.toPrecision());
    } else {
      return arg.toString(10);
    }
  }
  throw new Error(`while converting number to string, invalid number value '${arg}' type ${typeof arg}.`);
}

function fromWei(weiInput, unit, optionsInput) {
  let wei = toBN(weiInput);
  const negative = wei.lt(zero);
  const base = getValueOfUnit(unit);
  const baseLength = unitMap[unit].length - 1 || 1;
  const options = optionsInput || {};

  if (negative) {
    wei = wei.mul(negative1);
  }

  let fraction = wei.mod(base).toString(10);

  while (fraction.length < baseLength) {
    fraction = `0${fraction}`;
  }

  if (!options.pad) {
    fraction = fraction.match(/^([0-9]*[1-9]|0)(0*)/)[1];
  }

  let whole = wei.div(base).toString(10);

  if (options.commify) {
    whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  let value = `${whole}${fraction === '0' ? '' : `.${fraction}`}`;

  if (negative) {
    value = `-${value}`;
  }

  return value;
}

function toWei(ircerInput, unit) {
  let ircer = numberToString(ircerInput);
  const base = getValueOfUnit(unit);
  const baseLength = unitMap[unit].length - 1 || 1;

  // Is it negative?
  const negative = (ircer.substring(0, 1) === '-');
  if (negative) {
    ircer = ircer.substring(1);
  }

  if (ircer === '.') { throw new Error(`while converting number ${ircerInput} to wei, invalid value`); }

  // Split it into a whole and fractional part
  const comps = ircer.split('.');
  if (comps.length > 2) { throw new Error(`while converting number ${ircerInput} to wei,  too many decimal points`); }

  let whole = comps[0], fraction = comps[1];

  if (!whole) { whole = '0'; }
  if (!fraction) { fraction = '0'; }
  if (fraction.length > baseLength) { throw new Error(`while converting number ${ircerInput} to wei, too many decimal places`); }

  while (fraction.length < baseLength) {
    fraction += '0';
  }

  whole = new BN(whole);
  fraction = new BN(fraction);
  let wei = (whole.mul(base)).add(fraction);

  if (negative) {
    wei = wei.mul(negative1);
  }

  return new BN(wei.toString(10), 10);
}

module.exports = {
  unitMap,
  numberToString,
  getValueOfUnit,
  fromWei,
  toWei,
};
