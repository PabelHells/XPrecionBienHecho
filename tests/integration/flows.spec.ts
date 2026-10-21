// HTTP contract tests: responses are fixtures, not a connection to hosted Supabase.
import { test, expect, type Page } from "@playwright/test";
const uid = "00000000-0000-0000-0000-000000000001";
const service = {
  id: "10000000-0000-0000-0000-000000000001",
  area_id: "area1",
  name: "Rayos X de prueba",
  description: "Estudio de prueba",
  preparation: "",
  price: null,
  active: true,
};
const doctor = {
  id: "20000000-0000-0000-0000-000000000001",
  area_id: "area1",
  name: "Médico de prueba",
  active: true,
};
async function fixture(page: Page, role = "patient") {
  const profile = {
    id: uid,
    username: "paciente",
    full_name: "Paciente de prueba",
    birth_date: "2000-01-01",
    phone: "6671234567",
    address: "",
    role,
  };
  const user = {
    id: uid,
    aud: "authenticated",
    role: "authenticated",
    email: "test@example.com",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const access =
    [
      { alg: "HS256", typ: "JWT" },
      { sub: uid, aud: "authenticated", role: "authenticated", exp },
    ]
      .map((x) => Buffer.from(JSON.stringify(x)).toString("base64url"))
      .join(".") + ".fixture";
  await page.addInitScript(
    ({ user, access, exp }) =>
      localStorage.setItem(
        "sb-fixture-auth-token",
        JSON.stringify({
          access_token: access,
          refresh_token: "fixture",
          expires_at: exp,
          expires_in: 86400,
          token_type: "bearer",
          user,
        }),
      ),
    { user, access, exp },
  );
  const day = new Date(Date.now() + 86400000);
  while ([0, 6].includes(day.getUTCDay())) day.setUTCDate(day.getUTCDate() + 1);
  const date = day.toISOString().slice(0, 10),
    slot = date + "T09:00:00-07:00";
  const state: {
    booked: boolean;
    payload: Record<string, unknown> | null;
    profilePayload: Record<string, unknown> | null;
    servicePayload: Record<string, unknown> | null;
  } = {
    booked: false,
    payload: null,
    profilePayload: null,
    servicePayload: null,
  };
  await page.route("https://fixture.supabase.co/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    let data: unknown = [];
    if (url.pathname === "/auth/v1/user") data = user;
    else if (url.pathname === "/rest/v1/profiles") {
      if (req.method() === "PATCH") {
        state.profilePayload = req.postDataJSON();
        Object.assign(profile, state.profilePayload);
      }
      data = profile;
    } else if (url.pathname === "/rest/v1/services") {
      if (req.method() === "POST") state.servicePayload = req.postDataJSON();
      data = [service];
    } else if (url.pathname === "/rest/v1/doctors") data = [doctor];
    else if (url.pathname === "/rest/v1/areas")
      data = [{ id: "area1", name: "Radiología", active: true }];
    else if (url.pathname === "/rest/v1/rpc/available_slots")
      data = [{ starts_at: slot }];
    else if (url.pathname === "/rest/v1/rpc/book_appointment") {
      state.payload = req.postDataJSON();
      state.booked = true;
      data = "30000000-0000-0000-0000-000000000001";
    } else if (url.pathname === "/rest/v1/appointments")
      data = state.booked
        ? [
            {
              id: "30000000-0000-0000-0000-000000000001",
              patient_id: uid,
              doctor_id: doctor.id,
              service_id: service.id,
              starts_at: slot,
              ends_at: date + "T09:30:00-07:00",
              status: "pending",
              notes: "",
              services: { name: service.name },
              doctors: { name: doctor.name },
            },
          ]
        : [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  return { state, date, slot };
}
test("paciente solicita un turno mediante la RPC y ve su cita", async ({
  page,
}) => {
  const { state, date, slot } = await fixture(page);
  await page.goto("/agendar");
  await page.getByLabel("1. Estudio").selectOption(service.id);
  await page.getByLabel("2. Médico").selectOption(doctor.id);
  await page.getByLabel("3. Fecha").fill(date);
  await page.getByRole("button", { name: /^09:00/ }).click();
  await page.getByRole("button", { name: "Solicitar cita" }).click();
  await expect(page).toHaveURL(/citas/);
  await expect(page.getByRole("heading", { name: service.name })).toBeVisible();
  expect(state.payload).toMatchObject({
    p_service: service.id,
    p_doctor: doctor.id,
    p_starts_at: slot,
  });
});
test("paciente autenticado no entra a administración", async ({ page }) => {
  await fixture(page);
  await page.goto("/administracion");
  await expect(page).toHaveURL(/citas/);
  await expect(page.getByRole("heading", { name: "Mis citas" })).toBeVisible();
});
test("perfil guarda los campos permitidos y refresca la sesión visual", async ({
  page,
}) => {
  const { state } = await fixture(page);
  await page.goto("/perfil");
  await page.getByLabel("Nombre completo").fill("Nombre actualizado");
  await page.getByRole("button", { name: "Guardar datos" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Cambios guardados" }),
  ).toBeVisible();
  expect(state.profilePayload).toMatchObject({
    full_name: "Nombre actualizado",
    phone: "6671234567",
  });
  expect(state.profilePayload).not.toHaveProperty("role");
});
test("administrador registra un estudio con precio y área", async ({
  page,
}, info) => {
  const { state } = await fixture(page, "admin");
  await page.goto("/administracion");
  await page.getByRole("button", { name: "Catálogo", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Estudio nuevo");
  await page
    .getByRole("combobox", { name: "Área", exact: true })
    .selectOption("area1");
  await page.getByLabel("Precio MXN").fill("450");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Cambios guardados" }),
  ).toBeVisible();
  expect(state.servicePayload).toMatchObject({
    name: "Estudio nuevo",
    area_id: "area1",
    price: 450,
    active: true,
  });
  await page.screenshot({
    path: `artifacts/administracion-${info.project.name}.png`,
    fullPage: true,
  });
});
