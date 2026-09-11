/*
  Переключение тем на витрине. В самом продукте тема выбирается один раз в
  client.json и подставляется при сборке — здесь подменяется только файл
  стилей, чтобы показать все четыре варианта на одной странице.
*/
(function () {
  var link = document.getElementById("page-theme");
  var buttons = document.querySelectorAll(".showcase__button");
  if (!link || !buttons.length) return;

  function apply(theme) {
    link.href = theme + ".css";
    buttons.forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.theme === theme));
    });
    try {
      localStorage.setItem("neuro-portfolio-theme", theme);
    } catch (error) {
      /* приватное окно: просто не запоминаем выбор */
    }
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      apply(button.dataset.theme);
    });
  });

  try {
    var saved = localStorage.getItem("neuro-portfolio-theme");
    if (saved && document.querySelector('.showcase__button[data-theme="' + saved + '"]')) {
      apply(saved);
    }
  } catch (error) {
    /* читать нечего — остаётся тема из сборки */
  }
})();
