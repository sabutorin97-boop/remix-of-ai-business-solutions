import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planLicenseChanges } from "../src/lib/profi-license.server";

describe("права на пакеты Нейросотрудника", () => {
  it("выдаёт все пять модулей за комплект", () => {
    assert.deepEqual(planLicenseChanges(["all"], []), {
      grant: ["base", "photo", "video", "design", "dev"],
      revoke: [],
    });
  });

  it("не выдаёт дополнения без базы и не выдаёт модуль за продление", () => {
    assert.deepEqual(planLicenseChanges(["photo", "updates"], []), {
      grant: [],
      revoke: [],
    });
  });

  it("сохраняет модули, действующие по другим покупкам", () => {
    assert.deepEqual(planLicenseChanges(["base", "photo"], ["base", "photo", "video"]), {
      grant: [],
      revoke: ["video"],
    });
  });

  it("не повторяет операции для уже выданных прав", () => {
    assert.deepEqual(planLicenseChanges(["base", "base", "design"], ["base", "design"]), {
      grant: [],
      revoke: [],
    });
  });
});
