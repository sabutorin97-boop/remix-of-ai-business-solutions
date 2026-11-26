import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  planLicenseChanges,
  reconcileLicenseAssignments,
  type LicenseAccessAdapter,
  type LicenseModule,
} from "../src/lib/profi-license.server";

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

  it("повторяет только оставшиеся действия после сбоя выдачи", async () => {
    const assignments = new Set<LicenseModule>();
    let failPhoto = true;
    const adapter: LicenseAccessAdapter = {
      async listManagedModules() { return Array.from(assignments); },
      async grant(_, module) {
        if (module === "photo" && failPhoto) throw new Error("Временный сбой");
        assignments.add(module);
      },
      async revoke(_, module) { assignments.delete(module); },
    };

    await assert.rejects(reconcileLicenseAssignments("verified-account", ["base", "photo"], adapter));
    assert.deepEqual([...assignments], ["base"]);

    failPhoto = false;
    assert.deepEqual(await reconcileLicenseAssignments("verified-account", ["base", "photo"], adapter), {
      grant: ["photo"],
      revoke: [],
    });
    assert.deepEqual(await reconcileLicenseAssignments("verified-account", ["base"], adapter), {
      grant: [],
      revoke: ["photo"],
    });
    assert.deepEqual([...assignments], ["base"]);
  });
});
