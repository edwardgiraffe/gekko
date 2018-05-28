var log = require('../core/log');
var _ = require('lodash');

// Let's create our own strat
var strat = {};

// Prepare everything our method needs
strat.init = function() {
  this.input = 'candle';
  this.requiredHistory = this.tradingAdvisor.historySize;
  this.addTalibIndicator('atr', 'atr', {
    optInTimePeriod: this.requiredHistory,
  });

  this.atr = 0;
  this.N = 0;
  this.previousN = 0;
  this.previousCandle = null;
  this.unit = 0;
  this.positionSize = 0;
  this.positionOn = false;
  this.entry = 0;

  this.S1 = [];

  this.updateCount = 0;
};

// What happens on every new candle?
strat.update = function(candle) {
  this.updateCount++;

  this.S1.push(candle.high);

  if (this.S1.length > this.requiredHistory) {
    this.S1.shift();
  }

  this.S1_max_previous = this.S1_max;
  this.S1_max = _.max(this.S1);

  this.open = candle.open;
  this.high = candle.high;
  this.low = candle.low;
  this.close = candle.close;
};

// For debugging purposes.
strat.log = function() {
  log.debug(`
    OHLC: O: ${this.open} H: ${this.high} L: ${this.low} C: ${this.close}
       N: ${this.N}
     ATR: ${this.atr}
    Unit: ${this.unit}
     Pos: ${this.positionSize}
      S1: ${this.S1_max}
      On? ${this.positionOn}
   Entry: ${this.entry}
      SL: ${this.stopLoss}
   Count: ${this.updateCount}  
  `);
};

// Based on the newly calculated
// information, check if we should
// update or not.
strat.check = function(candle) {
  if (this.previousCandle) {
    this.atr = this.talibIndicators.atr.result.outReal;

    this.N =
      ((this.requiredHistory - 1) * this.previousN + this.atr) /
      this.requiredHistory;

    let price = this.candle.close;

    // if position = on, check for stop-loss or unit increase
    // if position = off, check for entry
    if (this.positionOn) {
      // If price drops below stoploss, get out (market order close)
      if (candle.low <= this.stopLoss) {
        log.debug('GET OUT!!');
        this.positionOn = false;
        this.unit = 0;
        this.positionSize = 0;
        this.entry = 0;
        this.advice('short');
      }
      // If price exceeds entry + 2N, increase stoploss to entry.
      else if (candle.close > this.entry + 2 * this.N) {
        log.debug('CRANK IT UP, FUCKERS!');
        this.stopLoss = this.entry * 1.5;
        this.entry = this.entry + 2 * this.N;
        this.positionSize += this.unit;
        // this.advice('add unit/increase leverage');
      }
    } else if (this.S1_max > this.S1_max_previous) {
      log.debug("IT'S ON!!!");
      this.unit =
        this.settings.positionPercent * (this.settings.accountSize * this.N);
      this.positionSize = this.unit;
      this.positionOn = true;
      this.entry = this.S1_max;
      this.stopLoss = candle.low - 1.5 * this.N;
      this.advice('long');
    }
  }
  this.previousN = this.N;
  this.previousCandle = candle;
};

module.exports = strat;
