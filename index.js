const EventEmitter = require('events');
const PCF8574 = require('pcf8574').PCF8574;

class PCF8574Cluster extends EventEmitter {
  constructor(i2cBus, addresses, initialStates) {
    super();

    if (!Array.isArray(addresses)) {
      throw new Error('Addresses has to be an array');
    }

    if (!Array.isArray(initialStates)) {
      throw new Error('Initial states has to be an array');
    }

    if (addresses.length != initialStates.length) {
      throw new Error('Addresses and InitialStates should have same length');
    }

    this._pcf_instances = [];

    this._expander_pins_count = 8;
    this._expanders_count = addresses.length;
    this._total_pins_count =
      this._expander_pins_count * this._expanders_count;

    addresses.forEach((address, i) => {
      let pcf = new PCF8574(i2cBus, address, initialStates[i]);

      pcf.on('input', (data) => {
        data.expander_pin = data.pin;
        data.expander_index = i;
        data.pin =
          this._getPinByExpanderPinAndIndex(i, data.expander_pin);

        this.emit('input', data);
      });

      this._pcf_instances.push(pcf);
    });
  }

  //index starts from 1-x
  enableInterrupt(index, pin) {
    if (index < 1 || index > this._expanders_count) {
      throw new Error('Expander index out of range');
    }

    return this._pcf_instances[index - 1].enableInterrupt(pin);
  }

  disableInterrupt() {
    this._pcf_instances.forEach(pcf => {
      pcf.disableInterrupt();
    });
  }

  inputPin(pin, inverted) {
    if (pin < 1 || pin > this._total_pins_count) {
      throw new Error('Pin out of range');
    }

    let expander = this._getExpander(pin);

    return this._pcf_instances[expander.index]
      .inputPin(expander.pin, inverted);
  }

  outputPin(pin, inverted, initialValue) {
    if (pin < 1 || pin > this._total_pins_count) {
      throw new Error('Pin out of range');
    }

    let expander = this._getExpander(pin);

    return this._pcf_instances[expander.index]
      .outputPin(expander.pin, inverted, initialValue);
  }

  setPin(pin, value) {
    if (pin < 1 || pin > this._total_pins_count) {
      throw new Error('Pin out of range');
    }

    let expander = this._getExpander(pin);

    return this._pcf_instances[expander.index]
      .setPin(expander.pin, value);
  }

  getPinValue(pin) {
    if (pin < 1 || pin > this._total_pins_count) {
      throw new Error('Pin out of range');
    }

    let expander = this._getExpander(pin);

    return this._pcf_instances[expander.index]
      .getPinValue(expander.pin);
  }

  setAllPins(value) {
    let promises = [];

    this._pcf_instances.forEach(pcf => {
      promises.push(pcf.setAllPins(value));
    });

    return Promise.all(promises);
  }

  removeAllListeners() {
    this._pcf_instances.forEach(pcf => {
      pcf.removeAllListeners();
    });
  }


  //function name ???
  _getPinByExpanderPinAndIndex(index, pin) {
    pin += 1;

    return (index === 0) ? pin : ((index * this._expander_pins_count) + pin);
  }

  _getExpanderIndex(pin) {
    return Math.ceil(pin / this._expander_pins_count) - 1;
  }

  _getExpanderPin(index, pin) {
    return (pin - (index  * this._expander_pins_count)) - 1;
  }

  _getExpander(pin) {
    let index = this._getExpanderIndex(pin);
    let expanderPin = this._getExpanderPin(index, pin);

    return { index: index, pin: expanderPin };
  }
}

module.exports = PCF8574Cluster;

