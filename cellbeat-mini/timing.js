/* Cellbeat Mini uses the native game's sixteenth-note simulation tick. */
(function (root) {
  "use strict";

  var TICKS_PER_BEAT = 4;

  function intervalMilliseconds(bpm) {
    if (typeof bpm !== "number" || !isFinite(bpm) || bpm <= 0) {
      throw new RangeError("Tempo must be a finite positive number.");
    }
    return 60000 / (bpm * TICKS_PER_BEAT);
  }

  function createClock(onTick, timers) {
    if (typeof onTick !== "function") {
      throw new TypeError("The clock needs a tick callback.");
    }
    timers = timers || {
      setInterval: function (callback, delay) { return root.setInterval(callback, delay); },
      clearInterval: function (id) { root.clearInterval(id); }
    };
    var timerId = null;
    var delay = null;

    function stop() {
      if (timerId !== null) {
        timers.clearInterval(timerId);
        timerId = null;
      }
    }

    function start(bpm) {
      var nextDelay = intervalMilliseconds(bpm);
      stop();
      timerId = timers.setInterval(onTick, nextDelay);
      delay = nextDelay;
    }

    function setTempo(bpm) {
      var nextDelay = intervalMilliseconds(bpm);
      if (timerId !== null && nextDelay !== delay) {
        stop();
        timerId = timers.setInterval(onTick, nextDelay);
      }
      delay = nextDelay;
    }

    return {start: start, stop: stop, setTempo: setTempo};
  }

  root.CellbeatMiniTiming = {
    ticksPerBeat: TICKS_PER_BEAT,
    intervalMilliseconds: intervalMilliseconds,
    createClock: createClock
  };
}(this));
