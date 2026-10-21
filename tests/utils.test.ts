import { describe, expect, it } from "vitest";
import {
  clinicDate,
  isWeekday,
  money,
  validatePassword,
} from "../src/lib/utils";
describe("Fechas de la clínica", () => {
  it("conserva el día de Mazatlán cerca de medianoche UTC", () =>
    expect(clinicDate(new Date("2026-10-05T02:00:00Z"))).toBe("2026-10-04"));
  it("acepta lunes y rechaza fin de semana", () => {
    expect(isWeekday("2026-10-05")).toBe(true);
    expect(isWeekday("2026-10-04")).toBe(false);
    expect(isWeekday("2026-10-03")).toBe(false);
  });
});
it("distingue un precio cero de un precio sin publicar", () => {
  expect(money(null)).toBe("Consultar precio");
  expect(money(0)).toContain("0.00");
});
it("aplica la longitud mínima de contraseña", () => {
  expect(validatePassword("12345678901")).toBe(false);
  expect(validatePassword("123456789012")).toBe(true);
});
