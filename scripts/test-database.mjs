// Execute the actual migrations on PostgreSQL WASM. Auth/Storage schemas below
// model the relevant Supabase columns; this does not test the hosted HTTP services.
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
let checks = 0;
await db.exec(`
 create role anon; create role authenticated;
 create schema auth; create schema storage;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,storage,public to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant select,insert,delete on storage.objects to authenticated;
`);
const sqlFiles = process.argv.includes("--installer")
  ? ["../supabase/INSTALAR_SUPABASE.sql"]
  : [
      "../supabase/migrations/202610040001_initial.sql",
      "../supabase/migrations/202610040002_catalog.sql",
    ];
for (const file of sqlFiles)
  await db.exec(
    await readFile(
      new URL(file, import.meta.url),
      "utf8",
    ),
  );
const ids = {
  alice: "00000000-0000-0000-0000-000000000001",
  bob: "00000000-0000-0000-0000-000000000002",
  staff: "00000000-0000-0000-0000-000000000003",
  admin: "00000000-0000-0000-0000-000000000004",
};
for (const [name, id] of Object.entries(ids))
  await db.query(
    `insert into auth.users(id,raw_user_meta_data) values($1,$2)`,
    [
      id,
      JSON.stringify({
        username: name,
        full_name: name + " Test",
        role: "admin",
      }),
    ],
  );
assert.equal(
  (await db.query(`select role from profiles where id=$1`, [ids.alice])).rows[0]
    .role,
  "patient",
);
checks++;
await db.exec(
  `update profiles set birth_date='2000-01-01',phone='6671234567';update profiles set role='staff' where username='staff';update profiles set role='admin' where username='admin';`,
);
const service = (
  await db.query(`select id,area_id from services order by name limit 1`)
).rows[0];
const doctor = (
  await db.query(
    `insert into doctors(name,area_id) values('Médico de prueba',$1) returning id`,
    [service.area_id],
  )
).rows[0].id;
await db.query(
  `insert into schedules(doctor_id,weekday,opens_at,closes_at) select $1,day,'08:00','16:00' from generate_series(1,5) day`,
  [doctor],
);
const date = (
  await db.query(
    `select to_char(d,'YYYY-MM-DD') as date from generate_series(current_date+1,current_date+7,interval '1 day') d where extract(isodow from d)<6 limit 1`,
  )
).rows[0].date;
async function as(role, id, fn) {
  await db.exec(`set role ${role}`);
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [
    id || "",
  ]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}
async function denied(sql, params = []) {
  await assert.rejects(() => db.query(sql, params));
  checks++;
}
function equal(a, b) {
  assert.equal(a, b);
  checks++;
}
let appointment, slot;
await as("anon", null, async () => {
  equal((await db.query(`select * from services`)).rows.length, 16);
  await denied(`select * from profiles`);
  await denied(`select * from appointments`);
  await denied(`select * from available_slots($1,$2,$3)`, [
    service.id,
    doctor,
    date,
  ]);
});
await as("authenticated", ids.alice, async () => {
  equal((await db.query(`select * from profiles`)).rows.length, 1);
  await denied(`update profiles set role='admin' where id=$1`, [ids.alice]);
  equal(
    (
      await db.query(
        `update profiles set full_name='Intruso' where id=$1 returning id`,
        [ids.bob],
      )
    ).rows.length,
    0,
  );
  await denied(`insert into doctors(name,area_id)values('Intruso',$1)`, [
    service.area_id,
  ]);
  const slots = await db.query(`select * from available_slots($1,$2,$3)`, [
    service.id,
    doctor,
    date,
  ]);
  equal(slots.rows.length, 16);
  slot = slots.rows[0].starts_at;
  appointment = (
    await db.query(`select book_appointment($1,$2,$3,'Nota') id`, [
      service.id,
      doctor,
      slot,
    ])
  ).rows[0].id;
  equal((await db.query(`select * from appointments`)).rows.length, 1);
  await denied(`select book_appointment($1,$2,$3,'')`, [
    service.id,
    doctor,
    slot,
  ]);
  await denied(`select set_appointment_status($1,'confirmed')`, [appointment]);
  await denied(`update appointments set status='completed' where id=$1`, [
    appointment,
  ]);
  await denied(
    `insert into results(appointment_id,patient_id,title,file_path) values($1,$2,'Falso',$3)`,
    [appointment, ids.alice, ids.alice + "/fake.pdf"],
  );
  await denied(
    `insert into storage.objects(bucket_id,name) values('results','fake.pdf')`,
  );
  await db.query(
    `insert into feedback(patient_id,message) values($1,'Comentario de prueba')`,
    [ids.alice],
  );
  checks++;
  await denied(
    `insert into feedback(patient_id,message) values($1,'Comentario intruso')`,
    [ids.bob],
  );
});
await as("authenticated", ids.bob, async () => {
  equal((await db.query(`select * from appointments`)).rows.length, 0);
  equal((await db.query(`select * from feedback`)).rows.length, 0);
  await denied(`select cancel_appointment($1)`, [appointment]);
  await denied(`select book_appointment($1,$2,$3,'')`, [
    service.id,
    doctor,
    slot,
  ]);
});
const filePath = ids.alice + "/result.pdf";
await as("authenticated", ids.staff, async () => {
  equal((await db.query(`select * from appointments`)).rows.length, 1);
  await db.query(`select set_appointment_status($1,'confirmed')`, [
    appointment,
  ]);
  checks++;
  await denied(`select set_appointment_status($1,'completed')`, [appointment]);
  await denied(`insert into services(name,area_id) values('Intruso',$1)`, [
    service.area_id,
  ]);
  await db.query(
    `insert into storage.objects(bucket_id,name) values('results',$1)`,
    [filePath],
  );
  await db.query(
    `insert into results(appointment_id,patient_id,title,file_path) values($1,$2,'Resultado',$3)`,
    [appointment, ids.alice, filePath],
  );
  checks++;
  await denied(
    `insert into results(appointment_id,patient_id,title,file_path) values($1,$2,'Paciente incorrecto',$3)`,
    [appointment, ids.bob, ids.bob + "/result.pdf"],
  );
});
await as("authenticated", ids.alice, async () => {
  equal((await db.query(`select * from results`)).rows.length, 1);
  equal((await db.query(`select * from storage.objects`)).rows.length, 1);
  await db.query(`select cancel_appointment($1)`, [appointment]);
  checks++;
  await denied(`select cancel_appointment($1)`, [appointment]);
});
await as("authenticated", ids.bob, async () => {
  equal((await db.query(`select * from results`)).rows.length, 0);
  equal((await db.query(`select * from storage.objects`)).rows.length, 0);
  const newId = (
    await db.query(`select book_appointment($1,$2,$3,'') id`, [
      service.id,
      doctor,
      slot,
    ])
  ).rows[0].id;
  assert.ok(newId);
  checks++;
  // Past, weekend, off-grid, wrong specialty and out-of-window slots are rejected.
  await denied(`select book_appointment($1,$2,now()-interval '1 day','')`, [
    service.id,
    doctor,
  ]);
  await denied(
    `select book_appointment($1,$2,$3::timestamptz+interval '1 minute','')`,
    [service.id, doctor, slot],
  );
  await denied(`select book_appointment($1,$2,now()+interval '200 days','')`, [
    service.id,
    doctor,
  ]);
  const sunday = (
    await db.query(
      `select to_char(d,'YYYY-MM-DD') d from generate_series(current_date+1,current_date+7,interval '1 day')d where extract(isodow from d)=7`,
    )
  ).rows[0].d;
  equal(
    (
      await db.query(`select * from available_slots($1,$2,$3)`, [
        service.id,
        doctor,
        sunday,
      ])
    ).rows.length,
    0,
  );
});
await as("authenticated", ids.admin, async () => {
  assert.ok((await db.query(`select * from audit_log`)).rows.length >= 5);
  checks++;
  await db.query(`update services set price=500 where id=$1`, [service.id]);
  checks++;
  await denied(`update profiles set role='staff' where id=$1`, [ids.bob]);
});
// Test the unique index directly as backend owner: even privileged accidental writes cannot double-book.
await denied(
  `insert into appointments(patient_id,service_id,doctor_id,starts_at,ends_at)values($1,$2,$3,$4,$4::timestamptz+interval '30 minutes')`,
  [ids.alice, service.id, doctor, slot],
);
console.log(
  `PASS: ${checks} PostgreSQL checks: migrations, auth bootstrap, RLS, privilege escalation, booking, state transitions, private results and slot uniqueness.`,
);
await db.close();
