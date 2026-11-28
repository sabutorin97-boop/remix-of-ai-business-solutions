import postgres from "postgres";
import { createPostgresProductWorkerStore, fulfillNextProductOrder } from "../src/lib/profi-product-worker.server";

async function run() {
  const configured = process.env.PROFI_TEST_WORKER_DATABASE_URL;
  if (!configured) throw new Error("Укажите отдельную локальную тестовую базу");
  const url = new URL(configured);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== "127.0.0.1" ||
      url.pathname !== "/profi_market_test" || url.search || url.hash) {
    throw new Error("Обработчик принимает только локальную базу profi_market_test");
  }
  const sql = postgres(configured, { max: 1, connect_timeout: 5, prepare: false });
  try {
    const status = await fulfillNextProductOrder(createPostgresProductWorkerStore(sql));
    const messages = {
      idle: "Нет готовых тестовых заказов.",
      completed: "Материалы тестового заказа сохранены.",
      lease_lost: "Задание больше не принадлежит этому обработчику.",
      retry_recorded: "Очередь зафиксировала сбой при подготовке материалов.",
    };
    console.log(messages[status]);
    if (status === "lease_lost" || status === "retry_recorded") process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 3 });
  }
}

run().catch(() => {
  console.error("Не удалось обработать тестовую очередь. Проверьте адрес и миграции локальной базы.");
  process.exitCode = 1;
});
