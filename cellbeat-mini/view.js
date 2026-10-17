/* Position the robot in the grid's padding-box coordinates, not static flow. */
(function (root) {
  "use strict";
  function positionMarker(marker, container, cell) {
    var parent = container.getBoundingClientRect(), target = cell.getBoundingClientRect();
    var x = target.left - parent.left - container.clientLeft + container.scrollLeft;
    var y = target.top - parent.top - container.clientTop + container.scrollTop;
    marker.style.left = "0px";
    marker.style.top = "0px";
    marker.style.width = target.width + "px";
    marker.style.height = target.height + "px";
    marker.style.transform = "translate(" + x + "px," + y + "px)";
  }
  root.CellbeatMiniView = {positionMarker: positionMarker};
}(this));
