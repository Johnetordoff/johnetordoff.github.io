/* Visit-local cell-edit history. Playback and robot progress are not snapshots. */
(function (root) {
  "use strict";
  var C = root.CellbeatMiniComposer, MAX_ENTRIES = 32;
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function shape(world) { return world.grids.map(function (g) { return g.id; }).join(","); }
  function config(cell) { return JSON.stringify([cell.type,cell.note,cell.mode,cell.n,cell.pair,cell.seed,cell.instrument]); }
  function create(limit) {
    limit = limit === undefined ? MAX_ENTRIES : limit;
    if (typeof limit !== "number" || Math.floor(limit) !== limit || limit < 1 || limit > MAX_ENTRIES) { throw new Error("Cell history must hold 1–32 edits."); }
    var undo = [], redo = [], signature = null;
    function record(before, after) {
      var old = C.validate(before), next = C.validate(after), key = shape(old), changes = [];
      if (key !== shape(next) || (signature !== null && signature !== key)) { throw new Error("Clear cell history after changing grids."); }
      old.grids.forEach(function (g, gi) { g.cells.forEach(function (cell, i) {
        var changed = next.grids[gi].cells[i];
        if (JSON.stringify(cell) !== JSON.stringify(changed)) { changes.push({gridId:g.id,index:i,before:copy(cell),after:copy(changed)}); }
      }); });
      if (!changes.length) { return false; }
      if (changes.length > 2) { throw new Error("Cell history supports one cell or a portal's two endpoints per edit."); }
      undo.push(changes); if (undo.length > limit) { undo.shift(); } redo = []; signature = key; return true;
    }
    function apply(world, from, to, backward) {
      if (!from.length) { return null; }
      var next = C.validate(world), changes = from[from.length - 1];
      if (shape(next) !== signature) { throw new Error("Cell history no longer matches these grids."); }
      changes.forEach(function (change) {
        var g = C.grid(next, change.gridId), expected = backward ? change.after : change.before;
        // Visits may advance while playing, but a different cell configuration
        // outside this edit history must never be overwritten.
        if (config(g.cells[change.index]) !== config(expected)) { throw new Error("The cell changed outside this edit history."); }
        g.cells[change.index] = copy(backward ? change.before : change.after);
      });
      next = C.validate(next); from.pop(); to.push(changes);
      // Allocators remain at their live high-water marks, so pair IDs are not reused.
      return {world:next,gridId:changes[0].gridId};
    }
    return {record:record,undo:function (world) { return apply(world,undo,redo,true); },redo:function (world) { return apply(world,redo,undo,false); },
      canUndo:function () { return undo.length > 0; },canRedo:function () { return redo.length > 0; },
      clear:function () { undo = []; redo = []; signature = null; },
      counts:function () { return {undo:undo.length,redo:redo.length}; }};
  }
  root.CellbeatMiniHistory = {create:create,maxEntries:MAX_ENTRIES};
}(this));
