/* Appearance only. Changing theme never touches song state or playback. */
(function (root) {
  "use strict";
  var sheet = document.getElementById("trackerTheme");
  var select = document.getElementById("themeSelect");
  var key = "cellbeat-mini:theme", theme = "compact";
  try { if (root.localStorage.getItem(key) === "classic") { theme = "classic"; } } catch (error) {}
  function apply(value) {
    theme = value === "classic" ? "classic" : "compact";
    sheet.disabled = theme === "classic";
    select.value = theme;
    document.documentElement.setAttribute("data-theme", theme);
  }
  apply(theme);
  select.addEventListener("change", function () {
    apply(select.value);
    try { root.localStorage.setItem(key, theme); } catch (error) {}
  });
}(this));
