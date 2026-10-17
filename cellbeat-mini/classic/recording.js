/* Robot-triggered musical takes and mono PCM WAV export. No microphone input. */
(function (root) {
  "use strict";
  var MAX_SECONDS = 120;
  function create() {
    var active = null;
    function capture(kind, index, now, effects) {
      if (active && now - active.start < MAX_SECONDS) {
        var event = {time:Math.max(0, now - active.start)}; event[kind] = index;
        if (effects) { event.effects = {chorus:!!effects.chorus,echo:!!effects.echo}; }
        active.events.push(event);
      }
    }
    return {
      start: function (now) { if (active) { return false; } active = {start: now, events: []}; return true; },
      tone: function (note, now, effects) {
        capture("note", note, now, effects);
      },
      sample: function (index, now, effects) { root.CellbeatMiniSamples.duration(index); capture("sample",index,now,effects); },
      stop: function (now) {
        if (!active) { return null; }
        var take = {duration: Math.min(MAX_SECONDS, Math.max(0.01, now - active.start)), events: active.events}; active = null; return take;
      },
      recording: function () { return !!active; },
      elapsed: function (now) { return active ? Math.max(0, now - active.start) : 0; }
    };
  }
  function wav(samples, sampleRate) {
    var buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer), i;
    function text(offset, value) { for (var k = 0; k < value.length; k++) { view.setUint8(offset + k, value.charCodeAt(k)); } }
    text(0, "RIFF"); view.setUint32(4, buffer.byteLength - 8, true); text(8, "WAVE"); text(12, "fmt ");
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, "data"); view.setUint32(40, samples.length * 2, true);
    for (i = 0; i < samples.length; i++) { var s = Math.max(-1, Math.min(1, samples[i])); view.setInt16(44 + i * 2, Math.round(s * (s < 0 ? 32768 : 32767)), true); }
    return buffer;
  }
  function render(take, OfflineContext, ready, failed) {
    var context = null, completed = false;
    function finish(success, value) {
      if (completed) { return; } completed = true;
      try { if (context) { root.CellbeatMiniAudio.stopOutput(context); } }
      catch (e) { if (success) { success = false; value = e; } }
      if (success) { ready(value); } else { failed(value); }
    }
    function error(e) { finish(false, e); }
    function done(buffer) {
      if (completed) { return; }
      var bytes;
      try { bytes = wav(buffer.getChannelData(0), sampleRate); } catch (e) { error(e); return; }
      finish(true, bytes);
    }
    try {
      if (!OfflineContext) { throw new Error("WAV rendering is unavailable in this browser."); }
      if (!take || !take.events.length) { throw new Error("This take contains no sounds."); }
      var tail = take.events.some(function (e) { return e.effects && e.effects.echo; }) ? 2.5 : take.events.some(function (e) { return e.effects && e.effects.chorus; }) ? 0.22 : 0.18;
      take.events.forEach(function (e) { if (e.sample !== undefined) { tail = Math.max(tail, root.CellbeatMiniSamples.duration(e.sample) + (e.effects && e.effects.echo ? 2.5 : e.effects && e.effects.chorus ? 0.04 : 0)); } });
      var sampleRate = 44100, duration = Math.min(MAX_SECONDS + tail, take.duration + tail);
      context = new OfflineContext(1, Math.ceil(duration * sampleRate), sampleRate);
      take.events.forEach(function (e) { if (e.sample !== undefined) { root.CellbeatMiniAudio.scheduleSample(context, e.sample, e.time, e.effects); } else { root.CellbeatMiniAudio.scheduleNote(context, e.note, e.time, e.effects); } });
      context.oncomplete = function (event) { done(event.renderedBuffer); };
      var pending = context.startRendering();
      if (pending && typeof pending.then === "function") { pending.then(done, error); }
    } catch (e) { error(e); }
  }
  root.CellbeatMiniRecording = {create: create, wav: wav, render: render, maxSeconds: MAX_SECONDS};
}(this));
