export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith("/api/")) {
      return handleApi(request, env);
    }

    return new Response("Not found", { status: 404 });
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function token() {
  return crypto.randomUUID();
}

async function getUserId(request, env) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const t = auth.replace("Bearer ", "");
  return await env.SESSIONS.get(`session:${t}`);
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // AUTH
  if (path === "/api/auth/signup" && request.method === "POST")
    return signup(request, env);

  if (path === "/api/auth/login" && request.method === "POST")
    return login(request, env);

  if (path === "/api/me" && request.method === "GET")
    return getMe(request, env);

  if (path === "/api/me" && request.method === "PUT")
    return updateMe(request, env);

  // FAMILY GROUPS
  if (path === "/api/family-groups" && request.method === "POST")
    return createFamilyGroup(request, env);

  if (path === "/api/family-groups" && request.method === "GET")
    return listFamilyGroups(request, env);

  // RELATIONSHIPS
  if (path === "/api/relationships" && request.method === "POST")
    return createRelationship(request, env);

  if (path === "/api/relationships" && request.method === "GET")
    return listRelationships(request, env);

  return json({ error: "Not found" }, 404);
}

/* ---------------- AUTH ---------------- */

async function signup(request, env) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) return json({ error: "Missing fields" }, 400);

  const exists = await env.DB.prepare(
    "SELECT id FROM users WHERE email = ?"
  ).bind(email).first();

  if (exists) return json({ error: "Email already used" }, 409);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(id, email, password, now, now).run();

  const t = token();
  await env.SESSIONS.put(`session:${t}`, id, { expirationTtl: 60 * 60 * 24 * 30 });

  return json({ token: t, userId: id });
}

async function login(request, env) {
  const body = await request.json();
  const { email, password } = body;

  const user = await env.DB.prepare(
    "SELECT id, password_hash FROM users WHERE email = ?"
  ).bind(email).first();

  if (!user || user.password_hash !== password)
    return json({ error: "Invalid credentials" }, 401);

  const t = token();
  await env.SESSIONS.put(`session:${t}`, user.id, { expirationTtl: 60 * 60 * 24 * 30 });

  return json({ token: t, userId: user.id });
}

/* ---------------- PROFILE ---------------- */

async function getMe(request, env) {
  const id = await getUserId(request, env);
  if (!id) return json({ error: "Unauthorized" }, 401);

  const user = await env.DB.prepare(
    `SELECT id, email, nickname, first_name, last_name, phone, city, state,
            instagram_handle, facebook_profile, share_phone, family_group_id
     FROM users WHERE id = ?`
  ).bind(id).first();

  return json(user || {});
}

async function updateMe(request, env) {
  const id = await getUserId(request, env);
  if (!id) return json({ error: "Unauthorized" }, 401);

  const body = await request.json();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE users SET
      nickname = COALESCE(?, nickname),
      first_name = COALESCE(?, first_name),
      last_name = COALESCE(?, last_name),
      phone = COALESCE(?, phone),
      city = COALESCE(?, city),
      state = COALESCE(?, state),
      instagram_handle = COALESCE(?, instagram_handle),
      facebook_profile = COALESCE(?, facebook_profile),
      share_phone = COALESCE(?, share_phone),
      updated_at = ?
     WHERE id = ?`
  ).bind(
    body.nickname,
    body.first_name,
    body.last_name,
    body.phone,
    body.city,
    body.state,
    body.instagram_handle,
    body.facebook_profile,
    body.share_phone,
    now,
    id
  ).run();

  return json({ success: true });
}

/* ---------------- FAMILY GROUPS ---------------- */

async function createFamilyGroup(request, env) {
  const userId = await getUserId(request, env);
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const body = await request.json();
  const { name, description } = body;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO family_groups (id, name, description, created_by_user_id, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(id, name, description || null, userId, now).run();

  await env.DB.prepare(
    "UPDATE users SET family_group_id = ? WHERE id = ?"
  ).bind(id, userId).run();

  return json({ id, name, description });
}

async function listFamilyGroups(request, env) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");

  let sql = "SELECT id, name, description FROM family_groups";
  let bind = [];

  if (q) {
    sql += " WHERE name LIKE ?";
    bind.push(`%${q}%`);
  }

  const rows = await env.DB.prepare(sql).bind(...bind).all();
  return json(rows.results || []);
}

/* ---------------- RELATIONSHIPS ---------------- */

async function createRelationship(request, env) {
  const from = await getUserId(request, env);
  if (!from) return json({ error: "Unauthorized" }, 401);

  const body = await request.json();
  const { to_user_id, relationship_type } = body;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO relationships (id, from_user_id, to_user_id, relationship_type, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(id, from, to_user_id, relationship_type, now).run();

  return json({ id, from_user_id: from, to_user_id, relationship_type });
}

async function listRelationships(request, env) {
  const id = await getUserId(request, env);
  if (!id) return json({ error: "Unauthorized" }, 401);

  const rows = await env.DB.prepare(
    `SELECT * FROM relationships
     WHERE from_user_id = ? OR to_user_id = ?`
  ).bind(id, id).all();

  return json(rows.results || []);
}
