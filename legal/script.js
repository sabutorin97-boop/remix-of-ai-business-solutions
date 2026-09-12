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

/*
  Форма заявки без бэкенда. Скрипт собирает текст обращения и открывает то,
  чем клиент пользуется: почту или Telegram. Никаких запросов наружу.
  Название действия на кнопке и в подтверждении одно и то же.
*/
(function () {
  var form = document.querySelector("[data-lead-form]");
  if (!form) return;

  var status = form.querySelector("[data-form-status]");
  var action = form.dataset.action || "Обсудить проект";
  var email = form.dataset.email || "";
  var telegram = form.dataset.telegram || "";
  var brand = form.dataset.brand || "";

  function showError(input, on) {
    var error = document.getElementById(input.id + "-error");
    input.setAttribute("aria-invalid", on ? "true" : "false");
    if (error) {
      error.hidden = !on;
      input.setAttribute("aria-describedby", on ? error.id : "");
    }
  }

  form.querySelectorAll(".field__input").forEach(function (input) {
    input.addEventListener("input", function () {
      if (input.getAttribute("aria-invalid") === "true" && input.value.trim()) {
        showError(input, false);
      }
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var name = form.elements.name;
    var contact = form.elements.contact;
    var task = form.elements.task;
    var invalid = null;

    [name, contact].forEach(function (input) {
      var empty = !input.value.trim();
      showError(input, empty);
      if (empty && !invalid) invalid = input;
    });

    if (invalid) {
      status.textContent = "Не хватает двух строк — имени и контакта.";
      status.classList.remove("form__status--done");
      invalid.focus();
      return;
    }

    var lines = [
      "Заявка с сайта" + (brand ? " «" + brand + "»" : ""),
      "Имя: " + name.value.trim(),
      "Контакт: " + contact.value.trim()
    ];
    if (task.value.trim()) lines.push("Задача: " + task.value.trim());
    var message = lines.join("\n");

    if (email) {
      var subject = "Заявка с сайта" + (brand ? " «" + brand + "»" : "");
      window.location.href =
        "mailto:" + email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(message);
      finish("Открываем почту — письмо уже собрано, останется нажать «Отправить».");
      return;
    }

    if (telegram) {
      copy(message).then(function (copied) {
        window.open(telegram, "_blank", "noopener");
        finish(
          copied
            ? "Открываем Telegram — текст заявки скопирован, вставьте его в чат."
            : "Открываем Telegram — расскажите про задачу в чате."
        );
      });
      return;
    }

    finish("Заявка собрана — скопируйте её и отправьте удобным способом.");
  });

  function finish(text) {
    status.textContent = action + ". " + text;
    status.classList.add("form__status--done");
  }

  function copy(text) {
    if (!navigator.clipboard) return Promise.resolve(false);
    return navigator.clipboard.writeText(text).then(
      function () {
        return true;
      },
      function () {
        return false;
      }
    );
  }
})();
