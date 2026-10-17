/* Deterministic single-robot rules; DOM rendering and audio consume events. */
(function (root) {
  "use strict";
  var TYPES = ["empty", "tone", "right", "left", "reflect-vertical", "reflect-horizontal"];
  var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

  function integer(value, name, minimum, maximum) {
    if (typeof value !== "number" || !isFinite(value) || Math.floor(value) !== value ||
        value < minimum || value > maximum) {
      throw new RangeError("Invalid " + name + ".");
    }
  }

  function copyRobot(robot) { return {x: robot.x, y: robot.y, dir: robot.dir}; }

  function createState(cols, rows, robot) {
    integer(cols, "columns", 1, 128); integer(rows, "rows", 1, 128);
    robot = robot || {x: 0, y: Math.min(2, rows - 1), dir: 1};
    integer(robot.x, "robot column", 0, cols - 1);
    integer(robot.y, "robot row", 0, rows - 1);
    integer(robot.dir, "robot direction", 0, 3);
    var cells = [], i;
    for (i = 0; i < cols * rows; i++) { cells.push("empty"); }
    return {cols: cols, rows: rows, cells: cells, robot: copyRobot(robot), home: copyRobot(robot), step: 0};
  }

  function stateWith(state, cells, robot, step) {
    return {cols: state.cols, rows: state.rows, cells: cells, robot: robot, home: state.home, step: step};
  }

  function paint(state, x, y, type) {
    integer(x, "cell column", 0, state.cols - 1);
    integer(y, "cell row", 0, state.rows - 1);
    if (TYPES.indexOf(type) < 0) { throw new RangeError("Unsupported cell type."); }
    var cells = state.cells.slice();
    cells[y * state.cols + x] = type;
    return stateWith(state, cells, state.robot, state.step);
  }

  function destination(state, robot, direction) {
    return {x: (robot.x + DX[direction] + state.cols) % state.cols,
            y: (robot.y + DY[direction] + state.rows) % state.rows};
  }

  function step(state) {
    var origin = state.robot, dir = origin.dir;
    // Native apply_rules transforms the heading using the cell ahead, then
    // takes a step from the origin in that transformed direction.
    var ahead = destination(state, origin, dir);
    var candidateType = state.cells[ahead.y * state.cols + ahead.x];
    if (candidateType === "right") { dir = (dir + 1) % 4; }
    else if (candidateType === "left") { dir = (dir + 3) % 4; }
    else if (candidateType === "reflect-vertical" && dir % 2 === 0) { dir = (dir + 2) % 4; }
    else if (candidateType === "reflect-horizontal" && dir % 2 === 1) { dir = (dir + 2) % 4; }
    var target = destination(state, origin, dir);
    var robot = {x: target.x, y: target.y, dir: dir};
    var events = [{type: "move", from: {x: origin.x, y: origin.y}, x: target.x, y: target.y, dir: dir}];
    // Ordinary native tones dispatch after the robot commits its destination.
    if (state.cells[target.y * state.cols + target.x] === "tone") {
      events.push({type: "tone", x: target.x, y: target.y});
    }
    return {state: stateWith(state, state.cells, robot, state.step + 1), events: events};
  }

  function reset(state) { return stateWith(state, state.cells, copyRobot(state.home), 0); }

  function demo() {
    var state = createState(8, 6), x;
    for (x = 1; x <= 6; x++) {
      state = paint(state, x, 2, "tone"); state = paint(state, x, 4, "tone");
    }
    state = paint(state, 1, 3, "tone"); state = paint(state, 6, 3, "tone");
    [[7, 2], [6, 5], [0, 4], [1, 1]].forEach(function (cell) {
      state = paint(state, cell[0], cell[1], "right");
    });
    return state;
  }

  root.CellbeatMiniSimulation = {createState: createState, paint: paint, step: step, reset: reset, demo: demo};
}(this));
