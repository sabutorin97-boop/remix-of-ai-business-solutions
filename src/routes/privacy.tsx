import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Политика обработки персональных данных — AI-Profigrup" },
      {
        name: "description",
        content:
          "Политика обработки и защиты персональных данных пользователей сайта AI-Profigrup.",
      },
    ],
    links: [{ rel: "canonical", href: "https://ai-profigrup-studia.lovable.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <section className="container mx-auto px-4 md:px-6 py-16 md:py-24">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
          ← На главную
        </Link>
        <h1 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight">
          Политика обработки <span className="text-gradient">персональных данных</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Действует с 20 мая 2026 года. AI-Profigrup (далее — «Оператор»).
        </p>

        <div className="mt-10 space-y-8 text-sm md:text-base leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-xl md:text-2xl font-semibold">1. Общие положения</h2>
            <p className="mt-3 text-muted-foreground">
              Настоящая Политика определяет порядок обработки персональных данных и меры по
              обеспечению их безопасности в соответствии с Федеральным законом от 27.07.2006
              № 152-ФЗ «О персональных данных».
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold">2. Какие данные мы собираем</h2>
            <ul className="mt-3 list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Имя, контактный телефон, e-mail, Telegram-username.</li>
              <li>Содержание заявки или сообщения, отправленного через формы сайта.</li>
              <li>Технические данные: IP-адрес, cookie, тип устройства и браузера.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold">3. Цели обработки</h2>
            <ul className="mt-3 list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Связь с пользователем по заявке и подготовка коммерческого предложения.</li>
              <li>Оказание услуг и поддержка после запуска проекта.</li>
              <li>Улучшение работы сайта и аналитика посещаемости.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold">4. Правовые основания</h2>
            <p className="mt-3 text-muted-foreground">
              Обработка осуществляется на основании согласия субъекта персональных данных,
              даваемого при отправке формы на сайте, а также для исполнения договора, стороной
              которого является пользователь.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold">5. Передача третьим лицам</h2>
            <p className="mt-3 text-muted-foreground">
              Оператор не передаёт персональные данные третьим лицам, за исключением случаев,
              прямо предусмотренных законодательством РФ, и обработчиков, обеспечивающих
              техническую работу сайта (хостинг, аналитика) на условиях конфиденциальности.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold">6. Срок хранения и удаление</h2>
            <p className="mt-3 text-muted-foreground">
              Данные хранятся до достижения целей обработки или до отзыва согласия. Запрос на
              удаление можно направить в Telegram{" "}
              <a
                href="https://t.me/sabutorin45"
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline underline-offset-4"
              >
                @sabutorin45
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold">7. Права пользователя</h2>
            <p className="mt-3 text-muted-foreground">
              Пользователь вправе получить информацию о своих данных, требовать их уточнения,
              блокировки или удаления, а также отозвать согласие на обработку в любой момент.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold">8. Контакты Оператора</h2>
            <p className="mt-3 text-muted-foreground">
              Telegram:{" "}
              <a
                href="https://t.me/sabutorin45"
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline underline-offset-4"
              >
                @sabutorin45
              </a>
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
