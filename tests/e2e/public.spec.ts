import { test, expect } from "@playwright/test";
test("inicio legible sin desbordamiento horizontal", async ({ page }, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /La claridad/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Agendar una cita", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/inicio-${info.project.name}.png`,
    fullPage: true,
  });
});
test("reserva exige iniciar sesión", async ({ page }) => {
  await page.goto("/agendar");
  await expect(page).toHaveURL(/acceso/);
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
});
test("administración protegida", async ({ page }) => {
  await page.goto("/administracion");
  await expect(page).toHaveURL(/acceso/);
});
test("registro y recuperación accesibles", async ({ page }) => {
  await page.goto("/registro");
  await expect(page.getByLabel("Nombre de usuario")).toBeVisible();
  await expect(page.getByLabel("Confirmar contraseña")).toHaveAttribute(
    "minlength",
    "12",
  );
  await page.goto("/olvide-contrasena");
  await expect(
    page.getByRole("button", { name: "Enviar enlace" }),
  ).toBeVisible();
});
test("navegación y estados vacíos honestos", async ({ page }) => {
  await page.goto("/estudios");
  await expect(
    page.getByRole("heading", { name: "Nuestros estudios", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Catálogo pendiente de conexión" }),
  ).toBeVisible();
  await page.goto("/no-existe");
  await expect(
    page.getByRole("heading", { name: "Esta página no existe." }),
  ).toBeVisible();
});
