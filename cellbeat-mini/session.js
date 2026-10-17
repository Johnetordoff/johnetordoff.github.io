/* Versioned Mini-only JSON sessions. Parsing never changes live state. */
(function (root) {
  "use strict";
  var FORMAT = "cellbeat-mini-session", VERSION = 10, MAX_BYTES = 2097152;
  var LEGACY_TYPES = ["empty", "tone", "right", "left"];
  var TYPES = LEGACY_TYPES.concat(["reflect-vertical", "reflect-horizontal"]);
  var FIELDS = ["format", "version", "cols", "rows", "cells", "robot", "home", "step", "bpm"];

  function fail(message) { throw new Error(message); }

  function object(value, fields, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) { fail("Invalid " + label + "."); }
    Object.keys(value).forEach(function (key) {
      if (fields.indexOf(key) < 0) { fail("Unsupported field in " + label + ": " + key); }
    });
  }

  function integer(value, minimum, maximum, label) {
    if (typeof value !== "number" || !isFinite(value) || Math.floor(value) !== value ||
        value < minimum || value > maximum) { fail("Invalid " + label + "."); }
  }

  function point(value, label) {
    object(value, ["x", "y", "dir"], label);
    integer(value.x, 0, 7, label + " column");
    integer(value.y, 0, 5, label + " row");
    integer(value.dir, 0, 3, label + " direction");
    return {x: value.x, y: value.y, dir: value.dir};
  }

  function fromDocument(data) {
    if (!data || data.format !== FORMAT) {
      fail("Choose a Cellbeat Mini session; native Cellbeat 2 files are not imported yet.");
    }
    if (data.version === 3 || data.version === 4 || data.version === 5 || data.version === 6 || data.version === 7 || data.version === 8 || data.version === 9 || data.version === 10) {
      object(data, ["format", "version", "bpm", "world"], "session");
      integer(data.bpm, 60, 200, "tempo (whole BPM, 60 to 200)");
      return {world: root.CellbeatMiniComposer.validate(data.world, data.version), bpm: data.bpm};
    }
    object(data, FIELDS, "session");
    if (data.version !== 2 && data.version !== 1) { fail("This session version is not supported."); }
    if (data.cols !== 8 || data.rows !== 6) { fail("Mini sessions currently require an 8 by 6 grid."); }
    if (!Array.isArray(data.cells) || data.cells.length !== 48) { fail("The session must contain exactly 48 cells."); }
    var types = data.version === 1 ? LEGACY_TYPES : TYPES;
    for (var i = 0; i < data.cells.length; i++) {
      if (types.indexOf(data.cells[i]) < 0) { fail("The session contains an unsupported cell type for its version."); }
    }
    var robot = point(data.robot, "robot"), home = point(data.home, "reset position");
    integer(data.step, 0, 9007199254740991, "step count");
    integer(data.bpm, 60, 200, "tempo (whole BPM, 60 to 200)");
    var state = root.CellbeatMiniSimulation.createState(8, 6, home);
    state.cells = data.cells.slice();
    state.robot = robot;
    state.step = data.step;
    return {state: state, bpm: data.bpm};
  }

  function parse(text) {
    if (typeof text !== "string") { fail("The session must be JSON text."); }
    if (text.length > MAX_BYTES) { fail("The session file is too large (maximum 2 MiB)."); }
    var data;
    try { data = JSON.parse(text); } catch (error) { fail("The file is not valid JSON."); }
    return fromDocument(data);
  }

  function stringify(state, bpm) {
    if (!state || typeof state !== "object") { fail("Invalid simulation state."); }
    if (state.grids) {
      var current = {format: FORMAT, version: VERSION, bpm: bpm, world: state};
      current.world = fromDocument(current).world;
      return JSON.stringify(current, null, 2) + "\n";
    }
    // Legacy component callers can still export the version-2 single grid.
    var document = {format: FORMAT, version: 2, cols: state.cols, rows: state.rows,
      cells: state.cells, robot: state.robot, home: state.home, step: state.step, bpm: bpm};
    var checked = fromDocument(document);
    document.cells = checked.state.cells;
    document.robot = checked.state.robot;
    document.home = checked.state.home;
    return JSON.stringify(document, null, 2) + "\n";
  }

  root.CellbeatMiniSession = {format: FORMAT, version: VERSION, maxBytes: MAX_BYTES,
    parse: parse, stringify: stringify, fromDocument: fromDocument};
}(this));
