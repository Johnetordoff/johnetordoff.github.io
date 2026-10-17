/* Cellbeat Mini composition: fixed grids, stable robots, explicit portal pairs. */
(function (root) {
  "use strict";
  var FACES = ["face-up", "face-right", "face-down", "face-left"];
  var TYPES = ["empty", "tone", "right", "left", "reflect-vertical", "reflect-horizontal", "record-start", "record-stop", "portal", "sample"].concat(FACES, ["mute-toggle"]);
  var MODES = ["always", "every", "skip", "first"], DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  var LEGACY_NOTES = [9, 8, 7, 5, 4, 2];
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function integer(value, low, high) { return typeof value === "number" && isFinite(value) && Math.floor(value) === value && value >= low && value <= high; }
  function fail(message) { throw new Error(message); }
  function fields(value, keys) {
    if (!value || typeof value !== "object" || Array.isArray(value)) { fail("Invalid composition object."); }
    Object.keys(value).forEach(function (key) { if (keys.indexOf(key) < 0) { fail("Unsupported composition field: " + key); } });
  }
  function cell(type, note, mode, n, pair) {
    var c = {type: type, note: note === undefined ? 0 : note, mode: mode || "always", n: n || 1, count: 0, pair: pair || 0};
    validateCell(c); return c;
  }
  function validateCell(c, version) {
    fields(c, ["type", "note", "mode", "n", "count", "pair"]);
    if (TYPES.indexOf(c.type) < 0 || MODES.indexOf(c.mode) < 0 || !integer(c.note, 0, 11) ||
        !integer(c.n, 1, 64) || !integer(c.count, 0, 1000000000) || !integer(c.pair, 0, 1000000000) ||
        (c.type !== "portal" && c.pair !== 0) || (c.type === "sample" && (!integer(c.note, 0, 3) || (version !== undefined && version < 6))) ||
        (FACES.indexOf(c.type) >= 0 && version !== undefined && version < 7) ||
        (c.type === "mute-toggle" && version !== undefined && version < 8)) { fail("Invalid cell or tool rule."); }
  }
  function grid(world, id) { return world.grids.filter(function (g) { return g.id === id; })[0]; }
  function blank(id) {
    var cells = []; for (var i = 0; i < 48; i++) { cells.push(cell("empty")); }
    return {id: id, cells: cells};
  }
  function create() {
    return {cols: 8, rows: 6, grids: [blank(1)], nextGridId: 2, nextPairId: 1,
      robot: {gridId: 1, x: 0, y: 2, dir: 1}, home: {gridId: 1, x: 0, y: 2, dir: 1}, step: 0,
      companions: [], nextRobotId: 2, effects: {chorus: false, echo: false}, robotSpeed: 1, robotCounter: 0, mutedRobots: []};
  }
  function robots(world) {
    return [{id: 1, pose: world.robot, home: world.home, speed: world.robotSpeed, counter: world.robotCounter}].concat(world.companions || []).sort(function (a, b) { return a.id - b.id; });
  }
  function bot(world, id) { return robots(world).filter(function (b) { return b.id === id; })[0]; }
  function isMuted(world, id) { return (world.mutedRobots || []).indexOf(id) >= 0; }
  function toggleMute(world, id) {
    if (isMuted(world, id)) { world.mutedRobots = world.mutedRobots.filter(function (value) { return value !== id; }); }
    else { world.mutedRobots.push(id); world.mutedRobots.sort(function (a, b) { return a - b; }); }
  }
  function setPose(world, id, pose) { if (id === 1) { world.robot = pose; } else { world.companions.filter(function (b) { return b.id === id; })[0].pose = pose; } }
  function setCounter(world, id, value) { if (id === 1) { world.robotCounter = value; } else { bot(world, id).counter = value; } }
  function setSpeed(world, id, speed) {
    if (!integer(speed, 1, 16)) { fail("Ticks per move must be a whole number from 1 to 16."); }
    var current = bot(world, id); if (!current) { fail("Unknown robot."); }
    var next = copy(world);
    if (current.speed !== speed) {
      if (id === 1) { next.robotSpeed = speed; } else { bot(next, id).speed = speed; }
      setCounter(next, id, 0);
    }
    return next;
  }
  function key(p) { return p.gridId + ":" + p.x + ":" + p.y; }
  function validate(world, version) {
    version = version === undefined ? 8 : version;
    if ([3, 4, 5, 6, 7, 8].indexOf(version) < 0) { fail("Unsupported composition version."); }
    var keys = ["cols", "rows", "grids", "nextGridId", "nextPairId", "robot", "home", "step"];
    if (version >= 4) { keys = keys.concat(["companions", "nextRobotId", "effects"]); }
    if (version >= 5) { keys = keys.concat(["robotSpeed", "robotCounter"]); }
    if (version >= 8) { keys.push("mutedRobots"); }
    fields(world, keys);
    if (world.cols !== 8 || world.rows !== 6 || !Array.isArray(world.grids) || world.grids.length < 1 || world.grids.length > 64 ||
        !integer(world.nextGridId, 2, 1000000000) || !integer(world.nextPairId, 1, 1000000000) ||
        !integer(world.step, 0, 9007199254740991)) { fail("Invalid grid collection."); }
    var ids = [], pairs = {};
    world.grids.forEach(function (g) {
      fields(g, ["id", "cells"]);
      if (!integer(g.id, 1, world.nextGridId - 1) || ids.indexOf(g.id) >= 0 || !Array.isArray(g.cells) || g.cells.length !== 48) { fail("Invalid or duplicate grid."); }
      ids.push(g.id);
      g.cells.forEach(function (c) {
        validateCell(c, version);
        if (c.pair >= world.nextPairId) { fail("Invalid portal pair identifier."); }
        if (c.pair) { pairs[c.pair] = (pairs[c.pair] || 0) + 1; if (pairs[c.pair] > 2) { fail("A portal pair has more than two endpoints."); } }
      });
    });
    var checked = copy(world);
    if (version === 3) { checked.companions = []; checked.nextRobotId = 2; checked.effects = {chorus: false, echo: false}; }
    if (version < 5) { checked.robotSpeed = 1; checked.robotCounter = 0; }
    if (version < 8) { checked.mutedRobots = []; }
    if (!Array.isArray(checked.companions) || checked.companions.length > 7 || !integer(checked.nextRobotId, 2, 1000000000)) { fail("Invalid robot collection."); }
    fields(checked.effects, ["chorus", "echo"]);
    if (typeof checked.effects.chorus !== "boolean" || typeof checked.effects.echo !== "boolean") { fail("Invalid audio effects."); }
    var robotIds = [1], positions = {}, homes = {};
    checked.companions.forEach(function (b) {
      fields(b, version < 5 ? ["id", "pose", "home"] : ["id", "pose", "home", "speed", "counter"]);
      if (!integer(b.id, 2, checked.nextRobotId - 1) || robotIds.indexOf(b.id) >= 0) { fail("Invalid or duplicate robot ID."); }
      if (version < 5) { b.speed = 1; b.counter = 0; }
      robotIds.push(b.id);
    });
    if (!Array.isArray(checked.mutedRobots) || checked.mutedRobots.length > robotIds.length) { fail("Invalid muted robot IDs."); }
    checked.mutedRobots.forEach(function (id, index) {
      if (!integer(id, 1, 999999999) || robotIds.indexOf(id) < 0 || (index > 0 && checked.mutedRobots[index - 1] >= id)) { fail("Muted IDs must name existing robots in increasing order."); }
    });
    robots(checked).forEach(function (b) {
      if (!integer(b.speed, 1, 16) || !integer(b.counter, 0, b.speed - 1)) { fail("Invalid robot speed or tick phase."); }
      [b.pose, b.home].forEach(function (p, index) {
      fields(p, ["gridId", "x", "y", "dir"]);
      if (ids.indexOf(p.gridId) < 0 || !integer(p.x, 0, 7) || !integer(p.y, 0, 5) || !integer(p.dir, 0, 3)) { fail("Invalid robot position."); }
      var occupied = index === 0 ? positions : homes;
      if (occupied[key(p)]) { fail("Robots cannot share a position or reset cell."); } occupied[key(p)] = true;
    }); });
    return checked;
  }
  function paint(world, id, x, y, value) {
    validateCell(value);
    if (!grid(world, id) || !integer(x, 0, 7) || !integer(y, 0, 5)) { fail("Invalid grid cell."); }
    var next = copy(world); grid(next, id).cells[y * 8 + x] = copy(value); return next;
  }
  function addGrid(world) {
    if (world.grids.length >= 64 || world.nextGridId >= 1000000000) { fail("The Mini limit is 64 grids."); }
    var next = copy(world); next.grids.push(blank(next.nextGridId++)); return next;
  }
  function deleteGrid(world, id, answer) {
    if (String(answer).trim().toLowerCase() !== "yes") { fail("Type yes to delete the grid."); }
    if (!grid(world, id) || world.grids.length === 1) { fail("Keep at least one grid."); }
    var next = copy(world); next.grids = next.grids.filter(function (g) { return g.id !== id; });
    // Keep orphan portal IDs: missing partners are visibly broken, never retargeted.
    var fallback = next.grids[0].id, list = robots(next), homes = {}, occupied = {};
    function free(p, taken) {
      p = copy(p); if (!grid(next, p.gridId)) { p.gridId = fallback; }
      if (!taken[key(p)]) { taken[key(p)] = true; return p; }
      for (var i = 0; i < 48; i++) { p.x = i % 8; p.y = Math.floor(i / 8); if (!taken[key(p)]) { taken[key(p)] = true; return copy(p); } }
      fail("No free fallback cell.");
    }
    list.forEach(function (b) { if (b.home.gridId !== id) { homes[key(b.home)] = true; } if (b.pose.gridId !== id) { occupied[key(b.pose)] = true; } });
    list.forEach(function (b) {
      if (b.home.gridId === id) { var home = free({gridId: fallback, x: 0, y: 2, dir: b.home.dir}, homes); if (b.id === 1) { next.home = home; } else { b.home = home; } }
      if (b.pose.gridId === id) { setPose(next, b.id, free(bot(next, b.id).home, occupied)); setCounter(next, b.id, 0); }
    });
    return next;
  }
  function addRobot(world, id, x, y, dir, speed) {
    var next = validate(world), g = grid(next, id), pose = {gridId:id,x:x,y:y,dir:dir};
    speed = speed === undefined ? 1 : speed;
    if (robots(next).length >= 8 || next.nextRobotId >= 1000000000) { fail("The Mini limit is eight robots; robot IDs cannot be recycled."); }
    if (!g || !integer(x,0,7) || !integer(y,0,5) || !integer(dir,0,3) || !integer(speed,1,16)) { fail("Choose a valid robot start, direction and rate."); }
    if (g.cells[y * 8 + x].type !== "empty" || robots(next).some(function (b) { return key(b.pose) === key(pose) || key(b.home) === key(pose); })) { fail("Choose an empty cell without a robot or reserved start."); }
    next.companions.push({id:next.nextRobotId++,pose:pose,home:copy(pose),speed:speed,counter:0});
    return validate(next);
  }
  function deleteRobot(world, id, answer) {
    if (String(answer).trim().toLowerCase() !== "yes") { fail("Type yes to remove the robot."); }
    var next = validate(world);
    if (id === 1) { fail("Robot 01 is kept; select an extra robot."); }
    if (!integer(id,2,999999999) || !bot(next,id)) { fail("Select an existing extra robot."); }
    next.companions = next.companions.filter(function (b) { return b.id !== id; });
    next.mutedRobots = next.mutedRobots.filter(function (value) { return value !== id; });
    return next;
  }
  function placeRobot(world, id, x, y, dir, robotId) {
    if (!grid(world, id) || !integer(x, 0, 7) || !integer(y, 0, 5) || !integer(dir, 0, 3)) { fail("Invalid robot start."); }
    robotId = robotId || 1;
    if (!bot(world, robotId)) { fail("Unknown robot."); }
    var pose = {gridId: id, x: x, y: y, dir: dir};
    if (robots(world).some(function (b) { return b.id !== robotId && (key(b.pose) === key(pose) || key(b.home) === key(pose)); })) { fail("Choose a free robot/start cell."); }
    var next = copy(world); if (robotId === 1) { next.home = copy(pose); } else { bot(next, robotId).home = copy(pose); }
    setPose(next, robotId, pose); setCounter(next, robotId, 0); next.step = 0; return next;
  }
  function reset(world) {
    var next = copy(world); next.robot = copy(next.home); next.step = 0; next.robotCounter = 0; next.mutedRobots = [];
    next.companions.forEach(function (b) { b.pose = copy(b.home); b.counter = 0; });
    next.grids.forEach(function (g) { g.cells.forEach(function (c) { c.count = 0; }); }); return next;
  }
  function allows(c) {
    var visit = c.count + 1;
    return c.mode === "always" || (c.mode === "every" && visit % c.n === 0) ||
      (c.mode === "skip" && visit % c.n !== 0) || (c.mode === "first" && c.count < c.n);
  }
  function ruleLabel(c) {
    if (c.mode === "always") { return ""; }
    var remaining = c.mode === "first" ? Math.max(0, c.n - c.count) : c.n - c.count % c.n;
    return (allows(c) ? "1" : "0") + ":" + remaining;
  }
  function partner(world, id, index) {
    var source = grid(world, id).cells[index], matches = [];
    if (!source.pair) { return null; }
    world.grids.forEach(function (g) { g.cells.forEach(function (c, i) {
      if (c.type === "portal" && c.pair === source.pair && (g.id !== id || i !== index)) { matches.push({gridId: g.id, x: i % 8, y: Math.floor(i / 8)}); }
    }); });
    return matches.length === 1 ? matches[0] : null;
  }
  function pair(world, first, second, mode, n) {
    if (first.gridId === second.gridId && first.x === second.x && first.y === second.y) { fail("Choose a different portal endpoint."); }
    var id = world.nextPairId, next = copy(world);
    if (id >= 1000000000) { fail("Portal identifier limit reached."); }
    next.nextPairId++;
    next = paint(next, first.gridId, first.x, first.y, cell("portal", 0, mode, n, id));
    return paint(next, second.gridId, second.x, second.y, cell("portal", 0, mode, n, id));
  }
  function step(world) {
    var next = copy(world), events = [], list = robots(world), counts = {};
    function occupied(p, ownId) { return list.some(function (b) { return b.id !== ownId && key(b.pose) === key(p); }); }
    var intents = list.map(function (entry) {
    // Native cadence: increment phase each shared tick, move only when it wraps.
    // Waiting does not approach a bumper or arrive on any tool/sound cell.
    var phase = (entry.counter + 1) % entry.speed; setCounter(next, entry.id, phase);
    if (phase !== 0) { return {id: entry.id, origin: entry.pose, target: copy(entry.pose), waiting: true}; }
    var robot = entry.pose, g = grid(next, robot.gridId);
    var ax = (robot.x + DX[robot.dir] + 8) % 8, ay = (robot.y + DY[robot.dir] + 6) % 6;
    var ahead = g.cells[ay * 8 + ax], bumper = ["right", "left", "reflect-vertical", "reflect-horizontal"].indexOf(ahead.type) >= 0;
    var effective = g.cells.map(function (c) { return c.type === "tone" || TYPES.indexOf(c.type) > 5 ? "empty" : c.type; });
    if (bumper) {
      if (!allows(ahead)) { effective[ay * 8 + ax] = "empty"; }
      ahead.count = Math.min(1000000000, ahead.count + 1);
    }
    var base = root.CellbeatMiniSimulation.createState(8, 6, {x: robot.x, y: robot.y, dir: robot.dir}); base.cells = effective;
    var moved = root.CellbeatMiniSimulation.step(base).state.robot;
    var target = {gridId: g.id, x: moved.x, y: moved.y, dir: moved.dir};
    var index = moved.y * 8 + moved.x, c = g.cells[index], destination = null;
    if (c.type === "portal" && allows(c) && !occupied(target, entry.id)) { destination = partner(next, g.id, index); if (destination && !occupied(destination, entry.id)) { target = {gridId: destination.gridId, x: destination.x, y: destination.y, dir: moved.dir}; } else { destination = null; } }
    counts[key(target)] = (counts[key(target)] || 0) + 1;
    return {id: entry.id, origin: robot, target: target, cell: c, gridId: g.id, x: moved.x, y: moved.y, destination: destination};
    });
    intents.forEach(function (it) {
      var blocked = !it.waiting && (occupied(it.target, it.id) || counts[key(it.target)] > 1), target = blocked ? copy(it.origin) : it.target;
      setPose(next, it.id, target);
      var movement = {type: "move", robotId: it.id, gridId: target.gridId, x: target.x, y: target.y, dir: target.dir, blocked: blocked, waiting: !!it.waiting}; events.push(movement);
      if (blocked || it.waiting) { return; }
      var c = it.cell;
      var face = FACES.indexOf(c.type);
      if (face < 0 && ["tone", "sample", "record-start", "record-stop", "portal", "mute-toggle"].indexOf(c.type) < 0) { return; }
      var active = allows(c); c.count = Math.min(1000000000, c.count + 1);
      // Native TURN_* controls change heading after entering the cell. They
      // are not peek-ahead bumpers and never take a second step on arrival.
      if (face >= 0) {
        if (active) { target.dir = face; movement.dir = face; events.push({type: "face", robotId: it.id, gridId: target.gridId, x: target.x, y: target.y, dir: face}); }
      } else if (active && c.type === "mute-toggle") {
        // Native DEACTIVATE_SELF's default action is a robot-local mute toggle,
        // not deletion or a transport stop. Existing releases/FX may ring out.
        toggleMute(next, it.id); events.push({type:"mute-toggle",robotId:it.id,muted:isMuted(next,it.id),gridId:it.gridId,x:it.x,y:it.y});
      } else if (active && c.type === "portal") {
        if (it.destination) { events.push({type: "teleport", robotId: it.id, fromGrid: it.gridId, gridId: target.gridId, x: target.x, y: target.y}); }
        else if (!partner(next, it.gridId, it.y * 8 + it.x)) { events.push({type: "broken-portal", robotId: it.id, gridId: it.gridId, x: it.x, y: it.y}); }
      } else if (active) { events.push({type: c.type, robotId: it.id, note: c.note, gridId: it.gridId, x: it.x, y: it.y}); }
    });
    next.step++;
    return {world: next, events: events};
  }
  function fromLegacy(state) {
    var world = create(); world.robot = {gridId: 1, x: state.robot.x, y: state.robot.y, dir: state.robot.dir};
    world.home = {gridId: 1, x: state.home.x, y: state.home.y, dir: state.home.dir}; world.step = state.step;
    world.grids[0].cells = state.cells.map(function (type, index) { return cell(type, LEGACY_NOTES[Math.floor(index / 8)]); }); return world;
  }
  function demo(direction) {
    var world = addGrid(create()), i;
    world.home.dir = direction === undefined ? 1 : direction; world.robot.dir = world.home.dir;
    world = paint(world, 1, 1, 2, cell("record-start", 0, "first", 1));
    for (i = 2; i <= 6; i++) { world = paint(world, 1, i, 2, cell("tone", [0, 2, 4, 7, 9][i - 2], i === 4 ? "skip" : "always", 3)); }
    for (i = 1; i <= 5; i++) { world = paint(world, 2, i, 2, cell("tone", [9, 8, 7, 5, 4][i - 1], "always", 1)); }
    world = paint(world, 2, 6, 2, cell("record-stop", 0, "first", 1));
    world = pair(world, {gridId: 1, x: 7, y: 2}, {gridId: 2, x: 0, y: 2}, "always", 1);
    return pair(world, {gridId: 2, x: 7, y: 2}, {gridId: 1, x: 0, y: 2}, "always", 1);
  }
  function ensembleDemo() {
    var w = create(), i, gi, melodies = [[9,11,8,7,10,9],[4,5,2,5,4,2],[0,7,2,4,5,0]];
    for (i = 0; i < 3; i++) { w = addGrid(w); }
    w.robot = {gridId: 1, x: 0, y: 1, dir: 1}; w.home = copy(w.robot);
    w.companions = [{id: 2, pose: {gridId: 1, x: 0, y: 2, dir: 1}, home: {gridId: 1, x: 0, y: 2, dir: 1}, speed: 1, counter: 0},
      {id: 3, pose: {gridId: 1, x: 0, y: 3, dir: 1}, home: {gridId: 1, x: 0, y: 3, dir: 1}, speed: 1, counter: 0}]; w.nextRobotId = 4;
    w.effects = {chorus: true, echo: true};
    w = paint(w, 1, 1, 1, cell("record-start", 0, "first", 1));
    for (gi = 2; gi <= 4; gi++) {
      w = pair(w, {gridId: 1, x: 2, y: gi - 1}, {gridId: gi, x: 0, y: 2}, "always", 1);
      for (i = 1; i <= 6; i++) { w = paint(w, gi, i, 2, cell("tone", melodies[gi - 2][i - 1], i === gi ? "skip" : "always", gi)); }
      for (i = 2; i <= 5; i++) { w = paint(w, gi, i, 4, cell("tone", melodies[gi - 2][5 - i], "every", 2)); }
      [[7,2],[6,5],[0,4],[1,1]].forEach(function (p) { w = paint(w, gi, p[0], p[1], cell("right")); });
      w = paint(w, gi, 1, 3, cell("tone", melodies[gi - 2][2]));
    }
    // A few native one-shots add a rhythm/bass part without changing the launch/routes.
    [[1,2,0,"always",1],[3,2,2,"skip",4],[5,2,1,"always",1],[4,4,3,"every",2]].forEach(function (p) { w = paint(w, 4, p[0], p[1], cell("sample", p[2], p[3], p[4])); });
    // Each part loops once, then its exhausted first-use rotator lets it wrap
    // into the launch portal, returning to the hub in its own lane. The hub
    // plays a bridge and sends it to a different grid's second melody (row 0).
    var secondNotes = [[0,2,5,7,4,2,9],[5,7,9,11,9,7,5],[0,7,0,4,0,2,7]];
    for (gi = 2; gi <= 4; gi++) {
      var lane = gi - 1, secondGrid = gi === 4 ? 2 : gi + 1;
      w = paint(w, gi, 7, 2, cell("right", 0, "first", 1));
      w = paint(w, 1, 3, lane, cell("tone", [7,4,0][lane - 1]));
      w = pair(w, {gridId:1,x:4,y:lane}, {gridId:secondGrid,x:0,y:0}, "always", 1);
      for (i = 1; i <= 7; i++) { w = paint(w, secondGrid, i, 0, cell("tone", secondNotes[secondGrid - 2][i - 1])); }
      w = paint(w, 1, 5, lane, cell("tone", [9,5,2][lane - 1]));
      w = paint(w, 1, 6, lane, cell(lane === 3 ? "sample" : "tone", lane === 3 ? 0 : 7));
    }
    [[1,0],[3,2],[5,1],[7,3]].forEach(function (p) { w = paint(w,4,p[0],0,cell("sample",p[1])); });
    return paint(w, 1, 7, 1, cell("record-stop", 0, "first", 1));
  }
  root.CellbeatMiniComposer = {create: create, cell: cell, grid: grid, validate: validate, paint: paint, addGrid: addGrid,
    deleteGrid: deleteGrid, placeRobot: placeRobot, reset: reset, allows: allows, ruleLabel: ruleLabel,
    partner: partner, pair: pair, step: step, demo: demo, ensembleDemo: ensembleDemo, fromLegacy: fromLegacy,
    robots: robots, bot: bot, setSpeed: setSpeed, addRobot: addRobot, deleteRobot: deleteRobot, isMuted: isMuted};
}(this));
