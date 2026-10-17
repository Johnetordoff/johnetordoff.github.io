/* Cellbeat Mini tracker UI. Runtime dependencies: browser APIs and local modules. */
(function () {
  "use strict";
  var C = CellbeatMiniComposer, A = CellbeatMiniAudio, R = CellbeatMiniRecording;
  var edits = CellbeatMiniHistory.create();
  var bank = A.notes(), samples = CellbeatMiniSamples.list(), world = C.ensembleDemo(), activeGrid = 1, tool = "tone", note = 0, sample = 0, selected = null, pending = null, selectedRobot = 1;
  var audio = null, running = false, cells = [], takes = [], recorder = R.create(), wavUrl = null, rendering = false, wavGeneration = 0;
  var openGeneration = 0, pendingReader = null, deleteTarget = null, programTarget = null, programHoverKey = null, gridSignature = "", robotSignature = "", markers = {1: null}, lastNotes = {}, flow = {};
  var arrows = ["↑", "→", "↓", "←"];
  var names = {inspect: "? Program", tone: "Tone", sample: "Sample", right: "↻ Turn", left: "↺ Turn", "reflect-vertical": "↕ Flip", "reflect-horizontal": "↔ Flip", "face-up": "↑ Face", "face-right": "→ Face", "face-down": "↓ Face", "face-left": "← Face", "mute-toggle": "MUTE Toggle", "record-start": "● REC", "record-stop": "■ END", portal: "▦ Portal", robot: "Place Robot", "new-robot": "+ New Robot", empty: "Erase"};
  function el(id) { return document.getElementById(id); }
  function hex(n) { return (n < 16 ? "0" : "") + n.toString(16).toUpperCase(); }
  function syncControls() { var b = C.bot(world, selectedRobot); el("direction").value = String(b.home.dir); el("robotSpeed").value = String(b.speed); el("chorus").checked = world.effects.chorus; el("tapeEcho").checked = world.effects.echo; }
  function message(text, error) { el("message").textContent = text; el("message").dataset.error = String(!!error); }
  function options(select, values, chosen) {
    select.textContent = ""; values.forEach(function (v) { var o = document.createElement("option"); o.value = String(v.value); o.textContent = v.text; select.appendChild(o); });
    select.value = String(chosen);
  }
  function rules() {
    var n = Number(el("ruleN").value);
    if (!isFinite(n) || Math.floor(n) !== n || n < 1 || n > 64) { throw new Error("N must be a whole number from 1 to 64."); }
    return {mode: el("ruleMode").value, n: n};
  }
  function selectTool(value) {
    closeProgram();
    programHoverKey = null;
    tool = value; if (tool !== "portal") { pending = null; }
    el("grid").dataset.programming = String(tool === "inspect");
    el("programToolBtn").classList.toggle("active", tool === "inspect"); el("programToolBtn").setAttribute("aria-pressed", String(tool === "inspect"));
    el("toolText").textContent = names[tool];
    Array.prototype.forEach.call(el("tools").children, function (b) { b.classList.toggle("active", b.dataset.tool === tool); b.setAttribute("aria-pressed", String(b.dataset.tool === tool)); });
  }
  function selectNote(value) {
    note = value; selectTool("tone");
    Array.prototype.forEach.call(el("palette").children, function (b) { b.classList.toggle("active", Number(b.dataset.note) === note); b.setAttribute("aria-pressed", String(Number(b.dataset.note) === note)); });
  }
  function sampleSelection() { Array.prototype.forEach.call(el("samplePalette").children, function (b) { b.classList.toggle("active", Number(b.dataset.sample) === sample); b.setAttribute("aria-pressed", String(Number(b.dataset.sample) === sample)); }); }
  function selectSample(value) { sample = value; selectTool("sample"); sampleSelection(); }
  function renderGrids() {
    var signature = world.grids.map(function (g) { return g.id; }).join(",");
    if (signature !== gridSignature) {
      options(el("gridSelect"), world.grids.map(function (g) { return {value: g.id, text: "Grid " + g.id}; }), activeGrid); gridSignature = signature;
    } else if (el("gridSelect").value !== String(activeGrid)) { el("gridSelect").value = String(activeGrid); }
    el("deleteGridBtn").disabled = world.grids.length === 1;
  }
  function renderCells() {
    var g = C.grid(world, activeGrid);
    cells.forEach(function (b, i) {
      var c = g.cells[i], destination = c.type === "portal" ? C.partner(world, g.id, i) : null;
      b.dataset.type = c.type; b.style.setProperty("--note", c.type === "sample" ? samples[c.note].color : bank[c.note].color);
      b.dataset.broken = String(c.type === "portal" && !destination);
      b.dataset.exhausted = String(c.mode === "first" && c.count >= c.n);
      b.dataset.selected = String(!!selected && selected.gridId === activeGrid && selected.x === i % 8 && selected.y === Math.floor(i / 8));
      var symbol = c.type === "tone" ? bank[c.note].name : c.type === "sample" ? samples[c.note].label : c.type === "empty" ? "·" : c.type === "portal" ? (destination ? "▦" : "✹") : names[c.type].split(" ")[0];
      b.children[0].textContent = symbol;
      b.children[1].textContent = C.ruleLabel(c);
      b.children[2].textContent = c.type === "portal" ? (destination ? "G" + destination.gridId : "BROKEN") : "";
      b.setAttribute("aria-label", "Grid " + activeGrid + ", column " + (i % 8 + 1) + ", row " + (Math.floor(i / 8) + 1) + ", " + (c.type === "tone" ? bank[c.note].name : c.type === "sample" ? samples[c.note].name + " sample" : c.type) + ", " + c.mode + " " + c.n + ", visits " + c.count + (c.type === "portal" ? destination ? ", to grid " + destination.gridId : ", broken portal" : ""));
    });
    if (!markers[1]) { markers[1] = el("agent"); }
    Object.keys(markers).forEach(function (id) { if (markers[id]) { markers[id].hidden = true; } });
    var list = C.robots(world), signature = list.map(function (b) { return b.id; }).join(",");
    Object.keys(markers).forEach(function (id) { if (!list.some(function (b) { return b.id === Number(id); })) { markers[id].remove(); delete markers[id]; delete lastNotes[id]; delete flow[id]; } });
    el("deleteRobotBtn").disabled = selectedRobot === 1;
    Array.prototype.forEach.call(el("tools").children, function (b) { if (b.dataset.tool === "new-robot") { b.disabled = list.length >= 8 || world.nextRobotId >= 1000000000; } });
    if (signature !== robotSignature) {
      options(el("robotSelect"), list.map(function (b) { return {value: b.id, text: "Robot " + hex(b.id)}; }), selectedRobot);
      el("channels").textContent = "";
      list.forEach(function (b) {
        var row = document.createElement("tr"); row.dataset.robot = b.id;
        for (var n = 0; n < 6; n++) { row.appendChild(document.createElement("td")); }
        var button = document.createElement("button"); button.type = "button"; button.className = "channel-btn"; button.textContent = "R" + hex(b.id);
        button.addEventListener("click", function () { chooseRobot(b.id); }); row.children[0].appendChild(button); el("channels").appendChild(row);
      }); robotSignature = signature;
    }
    list.forEach(function (b, index) {
      if (!markers[b.id]) { var marker = document.createElement("div"); marker.className = "agent"; marker.setAttribute("aria-hidden", "true"); el("gridWrap").appendChild(marker); markers[b.id] = marker; }
      var robot = b.pose, marker = markers[b.id]; marker.hidden = robot.gridId !== activeGrid; marker.dataset.robot = hex(b.id); marker.dataset.dir = robot.dir;
      if (!marker.hidden) { CellbeatMiniView.positionMarker(marker, el("gridWrap"), cells[robot.y * 8 + robot.x]); }
      var row = el("channels").children[index]; row.children[1].textContent = hex(robot.gridId); row.children[2].textContent = hex(robot.x) + ":" + hex(robot.y) + arrows[robot.dir];
      var muted = C.isMuted(world, b.id);
      row.children[3].textContent = muted ? "---" : lastNotes[b.id] || "---"; row.children[4].textContent = muted ? "MUTE" : flow[b.id] || "READY"; row.dataset.selected = String(b.id === selectedRobot);
      row.children[4].setAttribute("aria-label", (muted ? "Muted, " : "Unmuted, ") + (flow[b.id] || "READY"));
      row.children[5].textContent = hex(b.speed) + ":" + hex(b.counter); row.children[5].setAttribute("aria-label", b.speed + " ticks per move, elapsed phase " + b.counter);
    });
    updateProgram();
    var robot = C.bot(world, selectedRobot).pose;
    el("posText").textContent = "R" + hex(selectedRobot) + " / G" + hex(robot.gridId) + " / " + hex(robot.x) + ":" + hex(robot.y) + arrows[robot.dir];
    el("stepText").textContent = ("0000" + world.step).slice(-4);
  }
  function updateEdits() { el("undoCellBtn").disabled = !edits.canUndo(); el("redoCellBtn").disabled = !edits.canRedo(); }
  function cellEdit(next) { edits.record(world, next); world = next; updateEdits(); }
  function restoreEdit(backward) {
    if (backward ? !edits.canUndo() : !edits.canRedo()) { return; }
    try {
      stop(); var restored = backward ? edits.undo(world) : edits.redo(world); world = restored.world;
      activeGrid = restored.gridId; el("followRobot").checked = false; clearSelection(); flow = {}; render();
      message((backward ? "Undid" : "Redid") + " cell edit. Playback stopped; robot positions and phases kept. Tap Play to continue.");
    } catch (error) { message("Could not restore edit: " + error.message, true); }
  }
  function render() { renderGrids(); renderCells(); updateEdits(); }
  function chooseRobot(id) { selectedRobot = id; activeGrid = C.bot(world, id).pose.gridId; el("robotSelect").value = String(id); el("followRobot").checked = true; syncControls(); render(); }
  function inspect(p) {
    selected = p; var c = C.grid(world, p.gridId).cells[p.y * 8 + p.x];
    el("selectedText").textContent = "G" + p.gridId + " " + p.x + "," + p.y;
    el("ruleMode").value = c.mode; el("ruleN").value = String(c.n);
    if (c.type === "tone") { note = c.note; Array.prototype.forEach.call(el("palette").children, function (b) { b.classList.toggle("active", Number(b.dataset.note) === note); b.setAttribute("aria-pressed", String(Number(b.dataset.note) === note)); }); }
    if (c.type === "sample") { sample = c.note; sampleSelection(); }
    el("applyCellBtn").disabled = c.type === "empty"; renderCells();
  }
  function programConfig(c) { return JSON.stringify([c.type,c.note,c.mode,c.n,c.pair]); }
  function closeProgram() { programTarget = null; el("programDialog").close(); }
  function updateProgram() {
    if (!programTarget) { return; }
    var g = C.grid(world, programTarget.point.gridId), c = g && g.cells[programTarget.point.y * 8 + programTarget.point.x];
    if (!c || programConfig(c) !== programTarget.config) { closeProgram(); return; }
    el("programProgress").textContent = "Visits: " + c.count + " / next gate: " + (C.ruleLabel(c) || "1 / every visit");
  }
  function showProgram(p) {
    if (programTarget) { return; }
    inspect(p); var c = C.grid(world,p.gridId).cells[p.y * 8 + p.x];
    if (c.type === "empty") { message("Paint a tone, rotator or other tool first, then use ? Program on it."); return; }
    cancelDelete(); el("followRobot").checked = false;
    programTarget = {point:p,config:programConfig(c)};
    el("programTitle").textContent = "Program " + names[c.type] + " / Grid " + p.gridId + " / " + hex(p.x) + ":" + hex(p.y);
    el("programMode").value = c.mode; el("programN").value = String(c.n); el("programError").textContent = "";
    var bumper = ["right","left","reflect-vertical","reflect-horizontal"].indexOf(c.type) >= 0;
    el("programHelp").textContent = (bumper ? "This bumper counts approaches, before the robot turns; it need not enter this box. " : "This tool counts successful arrivals, not timing waits or blocked attempts. ") + "First N, then off releases a route after N uses; Every Nth and Skip every Nth repeat. Apply rearms this cell and stops playback. Cancel keeps the pattern and playback.";
    updateProgram(); el("programDialog").showModal(); el("programMode").focus();
  }
  function applyProgram(event) {
    event.preventDefault();
    try {
      if (!programTarget) { throw new Error("Select a cell with ? Program first."); }
      var p = programTarget.point, g = C.grid(world,p.gridId), c = g && g.cells[p.y * 8 + p.x];
      if (!c || programConfig(c) !== programTarget.config) { throw new Error("The cell changed; open its programming again."); }
      var n = Number(el("programN").value);
      // cell() defaults falsy n to 1; user input must be validated explicitly.
      if (!isFinite(n) || Math.floor(n) !== n || n < 1 || n > 64) { throw new Error("N must be a whole number from 1 to 64."); }
      var value = C.cell(c.type,c.note,el("programMode").value,n,c.pair);
      var next = C.paint(world,p.gridId,p.x,p.y,value);
      stop(); cellEdit(next); closeProgram(); activeGrid = p.gridId; inspect(p); render();
      message("Cell programmed and rearmed. Tap Play to continue; Undo cells restores its previous rule.");
    } catch (error) { el("programError").textContent = error.message; }
  }
  function clickCell(x, y) {
    try {
      var p = {gridId: activeGrid, x: x, y: y};
      if (tool === "inspect") { showProgram(p); return; }
      if (tool === "robot" || tool === "new-robot") {
        var adding = tool === "new-robot", next = adding ? C.addRobot(world, activeGrid, x, y, Number(el("direction").value), Number(el("robotSpeed").value)) : C.placeRobot(world, activeGrid, x, y, Number(el("direction").value), selectedRobot);
        stop(); world = next; clearSelection();
        if (adding) { selectedRobot = world.nextRobotId - 1; chooseRobot(selectedRobot); selectTool("robot"); }
        message(adding ? "Added R" + hex(selectedRobot) + " at phase zero. Tap Play; Place Robot now edits this start." : "Robot start placed. Reset returns here and rearms the counters.");
      } else if (tool === "portal") {
        var rule = rules();
        if (!pending) {
          cellEdit(C.paint(world, activeGrid, x, y, C.cell("portal"))); pending = {point: p, rule: rule};
          message("First portal placed on Grid " + activeGrid + ". Select a grid and tap the partner cell.");
        } else {
          cellEdit(C.pair(world, pending.point, p, pending.rule.mode, pending.rule.n)); pending = null;
          message("Portals paired. The robot keeps its heading after a jump.");
        }
      } else {
        rule = tool === "empty" ? {mode: "always", n: 1} : rules();
        cellEdit(C.paint(world, activeGrid, x, y, tool === "empty" ? C.cell("empty") : C.cell(tool, tool === "sample" ? sample : note, rule.mode, rule.n)));
        selected = p; el("selectedText").textContent = "G" + activeGrid + " " + x + "," + y; el("applyCellBtn").disabled = tool === "empty";
      }
      renderCells();
    } catch (error) { message(error.message, true); }
  }
  function currentTime() { return audio ? audio.currentTime : 0; }
  function selectedTake() { return takes[Number(el("takeSelect").value)] || null; }
  function clearWavDownload() {
    wavGeneration++;
    var link = el("wavDownload"); link.hidden = true; link.removeAttribute("href"); link.removeAttribute("download"); link.textContent = "";
    if (wavUrl) { URL.revokeObjectURL(wavUrl); wavUrl = null; }
  }
  function finishTake() {
    var take = recorder.stop(currentTime()); if (!take) { return; }
    takes.push(take); if (takes.length > 16) { takes.shift(); }
    clearWavDownload();
    options(el("takeSelect"), takes.map(function (t, i) { return {value: i, text: "Take " + (i + 1) + " / " + t.duration.toFixed(1) + "s / " + t.events.length + " sounds"}; }), takes.length - 1);
    el("takeSelect").disabled = false; el("saveWavBtn").disabled = rendering; updateRecording();
    message(take.events.length ? "Take finished. Render WAV, then tap Save song .wav." : "Take finished without sounds. Add tones or samples between REC and END.");
  }
  function updateRecording() {
    el("recordStatus").dataset.recording = String(recorder.recording());
    el("recordStatus").textContent = recorder.recording() ? "REC " + recorder.elapsed(currentTime()).toFixed(1) + "s" : takes.length ? "take ready" : "idle";
  }
  function audioState(state) {
    el("audioState").textContent = state === "running" ? "audio ready" : "tap Play for audio";
    if (running && state !== "running") { stop(); message("Audio paused. Tap Play to resume."); }
  }
  function audioFailed(error) { stop(); el("audioState").textContent = "audio unavailable"; message("Could not start audio: " + error.message + ". Tap Play to retry.", true); }
  function initAudio(ready, failed) {
    try {
      A.configurePlaybackSession(navigator);
      if (!audio || audio.state === "closed") { audio = new (window.AudioContext || window.webkitAudioContext)(); var instance = audio; audio.onstatechange = function () { if (audio === instance) { audioState(instance.state); } }; }
      return A.resumeForPlay(audio, audioState, failed, ready);
    } catch (error) { failed(error); return false; }
  }
  var clock = CellbeatMiniTiming.createClock(tick);
  var gate = A.createPlaybackGate(initAudio, function () { clock.start(Number(el("bpm").value)); }, function () { clock.stop(); finishTake(); A.stopOutput(audio); },
    function (state) { running = state === "playing"; el("stateText").textContent = state; el("playBtn").textContent = state === "stopped" ? "▶ Play" : "■ Stop"; }, audioFailed);
  function stop() { gate.stop(); }
  function tick() {
    try {
      var frame = C.step(world); world = frame.world;
      frame.events.forEach(function (event) {
        if (event.type === "move") { flow[event.robotId] = event.blocked ? "BLOCK" : event.waiting ? "WAIT" : "RUN"; }
        if (event.type === "teleport") { flow[event.robotId] = "PORT"; }
        if (event.type === "face") { flow[event.robotId] = "FACE"; }
        if (event.type === "mute-toggle") { delete lastNotes[event.robotId]; }
        if (event.type === "record-start") { if (recorder.start(currentTime())) { message("Recording started by the robot."); } }
        if (event.type === "record-stop") { finishTake(); }
        if (event.type === "tone" && !C.isMuted(world, event.robotId) && A.playNote(audio, event.note, world.effects)) { recorder.tone(event.note, currentTime(), world.effects); el("noteText").textContent = bank[event.note].name; lastNotes[event.robotId] = bank[event.note].name; }
        if (event.type === "sample" && !C.isMuted(world, event.robotId) && A.playSample(audio, event.note, world.effects)) { recorder.sample(event.note, currentTime(), world.effects); el("noteText").textContent = samples[event.note].label; lastNotes[event.robotId] = samples[event.note].label; }
        if (event.type === "broken-portal") { message("Broken portal on Grid " + event.gridId + ". Pair it with a new endpoint.", true); }
      });
      if (recorder.recording() && recorder.elapsed(currentTime()) >= R.maxSeconds) { finishTake(); message("Two-minute take limit reached. The song is ready to save."); }
      if (el("followRobot").checked) { activeGrid = C.bot(world, selectedRobot).pose.gridId; }
      render(); updateRecording();
    } catch (error) { stop(); message(error.message, true); }
  }
  function cancelDelete() { deleteTarget = null; el("deleteDialog").close(); }
  function startDelete(kind, id) {
    if (kind === "robot" && id === 1) { return; }
    deleteTarget = {kind:kind,id:id};
    el("deleteTitle").textContent = (kind === "grid" ? "Delete Grid " + id : "Remove Robot R" + hex(id)) + "?";
    el("deleteDescription").textContent = kind === "grid" ? "This removes the grid. Its partner portals will become broken. Type yes to confirm." : "This removes only this robot. Pattern cells and other robot starts remain. Robot 01 is kept. Type yes to confirm.";
    el("confirmDeleteBtn").textContent = kind === "grid" ? "Delete grid" : "Remove robot";
    el("deleteAnswer").value = ""; el("deleteError").textContent = ""; el("deleteDialog").showModal(); el("deleteAnswer").focus();
  }
  function clearSelection() { closeProgram(); selected = null; pending = null; el("selectedText").textContent = "new cells"; el("applyCellBtn").disabled = true; cancelDelete(); }
  function loadDemo() {
    stop(); world = C.ensembleDemo(); edits.clear(); activeGrid = 1; selectedRobot = 1; lastNotes = {}; flow = {}; clearSelection(); el("followRobot").checked = true;
    syncControls(); render(); message("Three parts launch in two ticks. First-use rotators release them back to Grid 01, then portals send them to a different part. Use ? Program on a rotator."); gate.play();
  }
  function download(data, mime, filename) {
    var url = URL.createObjectURL(new Blob([data], {type: mime})), link = document.createElement("a");
    link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }
  function savePattern() {
    try { download(CellbeatMiniSession.stringify(world, Number(el("bpm").value)), "application/json", "Cellbeat-Mini-pattern.json"); message("Pattern download started. Save WAV separately for the audio."); }
    catch (error) { message("Could not save: " + error.message, true); }
  }
  function openPattern() {
    var file = el("patternFile").files[0]; el("patternFile").value = ""; if (!file) { return; }
    var generation = ++openGeneration;
    if (pendingReader && pendingReader.readyState === 1) { pendingReader.abort(); } pendingReader = null;
    if (file.size > CellbeatMiniSession.maxBytes) { message("File exceeds 2 MiB. Current pattern kept.", true); return; }
    var reader = new FileReader(); pendingReader = reader;
    reader.onload = function () {
      if (generation !== openGeneration) { return; } pendingReader = null;
      try {
        var restored = CellbeatMiniSession.parse(reader.result), next = restored.world || C.fromLegacy(restored.state);
        stop(); world = next; edits.clear(); activeGrid = world.robot.gridId; selectedRobot = 1; lastNotes = {}; flow = {}; clearSelection(); syncControls();
        el("bpm").value = String(restored.bpm); el("bpmText").textContent = restored.bpm + " BPM"; clock.setTempo(restored.bpm);
        render(); message("Pattern opened with playback stopped.");
      } catch (error) { message("Could not open: " + error.message + " Current pattern kept.", true); }
    };
    reader.onerror = function () { if (generation === openGeneration) { pendingReader = null; message("Could not read the file. Current pattern kept.", true); } };
    reader.readAsText(file);
  }
  function renderWav() {
    var take = selectedTake(); if (!take || rendering) { return; }
    var filename = (el("songName").value.replace(/[^A-Za-z0-9_.-]/g, "_") || "Cellbeat-Mini-song") + ".wav";
    clearWavDownload(); var generation = wavGeneration;
    rendering = true; el("saveWavBtn").disabled = true; message("Rendering this take…");
    function finishRender() {
      rendering = false; el("saveWavBtn").disabled = !selectedTake();
      // Identity matters: the bounded take list can reuse a numeric index.
      if (generation !== wavGeneration || selectedTake() !== take) {
        message("Take or name changed. Render WAV again for the current selection."); return false;
      }
      return true;
    }
    R.render(take, window.OfflineAudioContext || window.webkitOfflineAudioContext, function (bytes) {
      if (!finishRender()) { return; }
      try {
        wavUrl = URL.createObjectURL(new Blob([bytes], {type: "audio/wav"}));
        var link = el("wavDownload"); link.href = wavUrl; link.download = filename; link.textContent = "Save " + filename; link.hidden = false;
        message("WAV ready. Tap Save song .wav to download this take.");
      } catch (error) { clearWavDownload(); message("Could not prepare WAV download: " + error.message, true); }
    }, function (error) { if (finishRender()) { message("Could not render WAV: " + error.message, true); } });
  }
  for (var i = 0; i < 48; i++) { (function (index) {
    var b = document.createElement("button"); b.className = "cell"; b.type = "button";
    ["symbol", "gate-code", "portal-grid"].forEach(function (name) { var span = document.createElement("span"); span.className = name; b.appendChild(span); });
    b.addEventListener("click", function () { clickCell(index % 8, Math.floor(index / 8)); }); el("grid").appendChild(b); cells.push(b);
    b.addEventListener("pointerenter", function (event) {
      if (tool !== "inspect" || event.pointerType !== "mouse" || programTarget) { return; }
      var key = activeGrid + ":" + index;
      // Closing a top-layer dialog can re-enter the same cell under the mouse.
      // Require a different hover target or an explicit click before reopening.
      if (programHoverKey === key) { return; } programHoverKey = key;
      showProgram({gridId:activeGrid,x:index % 8,y:Math.floor(index / 8)});
    });
  }(i)); }
  bank.forEach(function (n, index) { var b = document.createElement("button"); b.type = "button"; b.className = "note"; b.dataset.note = index; b.style.setProperty("--note", n.color); b.textContent = hex(index) + " " + n.name; b.setAttribute("aria-label", "Paint " + n.name); b.addEventListener("click", function () { selectNote(index); }); el("palette").appendChild(b); });
  samples.forEach(function (s, index) { var b = document.createElement("button"); b.type = "button"; b.className = "note"; b.dataset.sample = index; b.style.setProperty("--note", s.color); b.textContent = hex(index + 12) + " " + s.name; b.setAttribute("aria-label", "Paint " + s.name + " sample"); b.addEventListener("click", function () { selectSample(index); }); el("samplePalette").appendChild(b); });
  Object.keys(names).forEach(function (type) { var b = document.createElement("button"); b.type = "button"; b.className = "btn"; b.dataset.tool = type; b.textContent = names[type]; b.addEventListener("click", function () { selectTool(type); }); el("tools").appendChild(b); });
  el("playBtn").addEventListener("click", function () { gate.toggle(); }); el("demoBtn").addEventListener("click", loadDemo);
  el("resetBtn").addEventListener("click", function () { stop(); world = C.reset(world); edits.clear(); clearSelection(); activeGrid = C.bot(world, selectedRobot).pose.gridId; lastNotes = {}; flow = {}; render(); message("All robots and counters reset. Tap Play for another take."); });
  el("bpm").addEventListener("input", function () { el("bpmText").textContent = el("bpm").value + " BPM"; clock.setTempo(Number(el("bpm").value)); });
  el("direction").addEventListener("change", function () { try { stop(); var home = C.bot(world, selectedRobot).home; world = C.placeRobot(world, home.gridId, home.x, home.y, Number(el("direction").value), selectedRobot); activeGrid = home.gridId; render(); } catch (error) { syncControls(); message(error.message, true); } });
  el("robotSpeed").addEventListener("change", function () {
    try {
      var speed = Number(el("robotSpeed").value), next = C.setSpeed(world, selectedRobot, speed), changed = speed !== C.bot(world, selectedRobot).speed;
      if (changed) { stop(); flow[selectedRobot] = "READY"; }
      world = next; syncControls(); render(); message("R" + hex(selectedRobot) + ": one move every " + speed + " ticks. " + (changed ? "Tap Play to continue." : "Rate and phase unchanged."));
    } catch (error) { syncControls(); message(error.message, true); }
  });
  el("robotSelect").addEventListener("change", function () { chooseRobot(Number(el("robotSelect").value)); });
  ["chorus", "tapeEcho"].forEach(function (id) { el(id).addEventListener("change", function () { world.effects = {chorus: el("chorus").checked, echo: el("tapeEcho").checked}; message("Audio effects apply to the next notes and are captured in the take."); }); });
  el("gridSelect").addEventListener("change", function () { activeGrid = Number(el("gridSelect").value); el("followRobot").checked = false; renderCells(); });
  el("gridSelect").addEventListener("pointerdown", function () { el("followRobot").checked = false; });
  el("followRobot").addEventListener("change", function () { if (el("followRobot").checked) { activeGrid = C.bot(world, selectedRobot).pose.gridId; render(); } });
  el("addGridBtn").addEventListener("click", function () { try { world = C.addGrid(world); edits.clear(); activeGrid = world.nextGridId - 1; el("followRobot").checked = false; render(); message("Added Grid " + activeGrid + ". Pair portals to connect it."); } catch (error) { message(error.message, true); } });
  el("deleteGridBtn").addEventListener("click", function () { startDelete("grid",activeGrid); });
  el("deleteRobotBtn").addEventListener("click", function () { startDelete("robot",selectedRobot); });
  el("cancelDeleteBtn").addEventListener("click", cancelDelete);
  el("programForm").addEventListener("submit", applyProgram);
  el("cancelProgramBtn").addEventListener("click", closeProgram);
  el("programDialog").addEventListener("cancel", function () { programTarget = null; });
  el("programDialog").addEventListener("close", function () { if (!el("programDialog").open) { programTarget = null; } });
  el("programToolBtn").addEventListener("click", function () { selectTool("inspect"); message("? Program selected. Tap a rotator or other occupied cell to open its visit rules."); });
  el("deleteForm").addEventListener("submit", function (event) {
    event.preventDefault();
    try {
      var target = deleteTarget; if (!target) { throw new Error("Choose a robot or grid first."); }
      var next = target.kind === "grid" ? C.deleteGrid(world,target.id,el("deleteAnswer").value) : C.deleteRobot(world,target.id,el("deleteAnswer").value);
      stop(); world = next;
      if (target.kind === "grid") { edits.clear(); } else { selectedRobot = 1; syncControls(); }
      activeGrid = C.bot(world,selectedRobot).pose.gridId; clearSelection(); render();
      message(target.kind === "grid" ? "Deleted Grid " + target.id + ". Its orphan portals are now broken." : "Removed R" + hex(target.id) + ". Pattern cells and other robot progress kept. Tap Play to continue.");
    }
    catch (error) { el("deleteError").textContent = error.message; }
  });
  el("applyCellBtn").addEventListener("click", function () {
    try { if (!selected) { return; } var rule = rules(), c = C.grid(world, selected.gridId).cells[selected.y * 8 + selected.x]; cellEdit(C.paint(world, selected.gridId, selected.x, selected.y, C.cell(c.type, c.type === "tone" ? note : c.type === "sample" ? sample : c.note, rule.mode, rule.n, c.pair))); renderCells(); message("Cell settings applied; its counter starts at zero."); }
    catch (error) { message(error.message, true); }
  });
  el("savePatternBtn").addEventListener("click", savePattern); el("openPatternBtn").addEventListener("click", function () { el("patternFile").click(); }); el("patternFile").addEventListener("change", openPattern);
  el("saveWavBtn").addEventListener("click", renderWav);
  el("takeSelect").addEventListener("change", clearWavDownload);
  el("songName").addEventListener("input", clearWavDownload);
  el("undoCellBtn").addEventListener("click", function () { restoreEdit(true); });
  el("redoCellBtn").addEventListener("click", function () { restoreEdit(false); });
  document.addEventListener("keydown", function (event) {
    var target = event.target, tag = target && String(target.tagName || "").toUpperCase();
    if (programTarget || event.defaultPrevented || event.altKey || (!event.ctrlKey && !event.metaKey) ||
        ["INPUT","TEXTAREA","SELECT"].indexOf(tag) >= 0 || (target && (target.isContentEditable || (typeof target.closest === "function" && target.closest("[contenteditable]:not([contenteditable='false'])"))))) { return; }
    var key = String(event.key || "").toLowerCase(), backward = key === "z" && !event.shiftKey;
    if (key !== "z" && !(key === "y" && event.ctrlKey && !event.metaKey)) { return; }
    if (backward ? edits.canUndo() : edits.canRedo()) { event.preventDefault(); restoreEdit(backward); }
  });
  document.addEventListener("visibilitychange", function () { if (document.hidden) { stop(); } });
  window.addEventListener("resize", function () { window.requestAnimationFrame(renderCells); });
  window.addEventListener("orientationchange", function () { setTimeout(renderCells, 150); });
  syncControls(); selectNote(0); sampleSelection(); render();
}());
