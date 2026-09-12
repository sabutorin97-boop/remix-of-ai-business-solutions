/*
  Плавное раскрытие FAQ. Элемент <details> работает и без этого кода:
  скрипт только растягивает панель вместо мгновенного скачка. При
  prefers-reduced-motion не вмешивается вовсе.
*/
(function () {
  var root = document.querySelector("[data-faq]");
  if (!root) return;

  var calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (calm.matches) return;

  root.querySelectorAll(".faq__item").forEach(function (item) {
    var summary = item.querySelector("summary");
    var panel = item.querySelector(".faq__panel");
    if (!summary || !panel) return;

    summary.addEventListener("click", function (event) {
      event.preventDefault();
      if (item.dataset.busy === "1") return;
      item.dataset.busy = "1";

      var opening = !item.open;
      if (opening) {
        item.open = true;
        item.dataset.collapsed = "1";
      }

      // Перерисовка до включения перехода, иначе браузер склеит два кадра.
      requestAnimationFrame(function () {
        item.dataset.animating = "1";
        requestAnimationFrame(function () {
          if (opening) {
            delete item.dataset.collapsed;
          } else {
            item.dataset.collapsed = "1";
          }
        });
      });

      var finish = function (event) {
        if (event && event.propertyName !== "grid-template-rows") return;
        panel.removeEventListener("transitionend", finish);
        delete item.dataset.animating;
        delete item.dataset.busy;
        if (!opening) {
          item.open = false;
          delete item.dataset.collapsed;
        }
      };

      panel.addEventListener("transitionend", finish);
      // Страховка, если переход не случился: состояние не должно залипнуть.
      window.setTimeout(function () {
        if (item.dataset.busy === "1") finish();
      }, 600);
    });
  });
})();
