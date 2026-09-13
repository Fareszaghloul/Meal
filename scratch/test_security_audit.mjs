// Automated Security & Multi-User Verification Test Suite
// Run against http://localhost:3000

const BASE_URL = "http://localhost:3000";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedCount++;
  }
}

// Helper to extract session cookie
function extractSessionCookie(res) {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;
  const match = setCookie.match(/mealprep_session=([^;]+)/);
  return match ? `mealprep_session=${match[1]}` : null;
}

async function runSecurityAudit() {
  console.log("=================================================");
  console.log("    MEALPREP PRODUCTION SECURITY AUDIT SUITE     ");
  console.log("=================================================\n");

  const IP_USER_A = "198.51.100.10";
  const IP_USER_B = "198.51.100.20";
  const IP_ADMIN = "198.51.100.30";
  const IP_ATTACKER = "198.51.100.99";

  // TEST SUITE 1: Security Headers & Unauthenticated Access
  console.log("--- 1. Security Headers & Proxy Guard ---");
  const homeRes = await fetch(`${BASE_URL}/`);
  assert(homeRes.headers.get("x-frame-options") === "DENY", "X-Frame-Options is DENY");
  assert(homeRes.headers.get("x-content-type-options") === "nosniff", "X-Content-Type-Options is nosniff");
  assert(homeRes.headers.get("referrer-policy") === "strict-origin-when-cross-origin", "Referrer-Policy is strict-origin-when-cross-origin");
  assert(!!homeRes.headers.get("content-security-policy"), "Content-Security-Policy header is present");

  // Unauthenticated API checks
  console.log("\n--- 2. Unauthenticated API Endpoints ---");
  const unauthEndpoints = [
    "/api/recipes",
    "/api/meal-plan",
    "/api/shopping-list",
    "/api/pantry",
    "/api/weight",
    "/api/workouts",
    "/api/settings",
    "/api/auth/me",
    "/api/admin/users",
  ];

  for (const endpoint of unauthEndpoints) {
    const res = await fetch(`${BASE_URL}${endpoint}`);
    assert(res.status === 401, `Unauthenticated ${endpoint} returns 401 (got ${res.status})`);
  }

  // TEST SUITE 3: User Registration & Authentication
  console.log("\n--- 3. Authentication & Account Creation ---");
  const rand = Math.floor(Math.random() * 100000);
  const userAEmail = `usera_${rand}@test.local`;
  const userBEmail = `userb_${rand}@test.local`;
  const password = "SecurePassword123!";

  // Register User A
  const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": IP_USER_A },
    body: JSON.stringify({ displayName: "User Alpha", email: userAEmail, password }),
  });
  assert(regARes.status === 201, `Register User A returned 201 (got ${regARes.status})`);
  const cookieA = extractSessionCookie(regARes);
  assert(!!cookieA, "User A received secure session cookie");

  // Register User B
  const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": IP_USER_B },
    body: JSON.stringify({ displayName: "User Beta", email: userBEmail, password }),
  });
  assert(regBRes.status === 201, `Register User B returned 201 (got ${regBRes.status})`);
  const cookieB = extractSessionCookie(regBRes);
  assert(!!cookieB, "User B received secure session cookie");
  assert(cookieA !== cookieB, "User A and User B received distinct session cookies");

  // Test Invalid Login
  const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": IP_USER_A },
    body: JSON.stringify({ email: userAEmail, password: "WrongPassword!" }),
  });
  assert(badLoginRes.status === 401, "Login with wrong password returns 401");

  // Test Non-existent Email Login (timing & enumeration defense)
  const fakeEmailRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": IP_USER_A },
    body: JSON.stringify({ email: "doesnotexist_999@test.local", password: "AnyPassword123!" }),
  });
  assert(fakeEmailRes.status === 401, "Login with non-existent email returns generic 401");

  // TEST SUITE 4: Object-Level Authorization & User Isolation (IDOR/BOLA)
  console.log("\n--- 4. Object-Level Access Control & Isolation (IDOR Defense) ---");

  // User A creates a recipe
  const createRecipeRes = await fetch(`${BASE_URL}/api/recipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA, "X-Forwarded-For": IP_USER_A },
    body: JSON.stringify({
      name: "User A Secret Recipe",
      description: "Confidential recipe owned by User A",
      servings: 4,
      prepTimeMinutes: 15,
      cookTimeMinutes: 20,
      tags: ["Secret", "Alpha"],
      ingredients: [
        { rawName: "Secret Spice", quantity: 10, unit: "g" },
      ],
      instructions: ["Mix thoroughly"],
    }),
  });
  assert(createRecipeRes.ok, `User A creates recipe returned 200/201 (got ${createRecipeRes.status})`);
  const recipeA = await createRecipeRes.json();
  const recipeAId = recipeA.id;
  assert(recipeA.name === "User A Secret Recipe", "Recipe created with correct name");

  // User A can view their recipe
  const viewRecipeARes = await fetch(`${BASE_URL}/api/recipes/${recipeAId}`, {
    headers: { Cookie: cookieA, "X-Forwarded-For": IP_USER_A },
  });
  assert(viewRecipeARes.status === 200, "User A can view their own recipe");

  // IDOR ATTACK 1: User B tries to view User A's recipe
  const idorViewRes = await fetch(`${BASE_URL}/api/recipes/${recipeAId}`, {
    headers: { Cookie: cookieB, "X-Forwarded-For": IP_USER_B },
  });
  assert(idorViewRes.status === 404, `User B reading User A's recipe is blocked (status 404, got ${idorViewRes.status})`);

  // IDOR ATTACK 2: User B tries to modify User A's recipe
  const idorUpdateRes = await fetch(`${BASE_URL}/api/recipes/${recipeAId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookieB, "X-Forwarded-For": IP_USER_B },
    body: JSON.stringify({ name: "Hacked by User B" }),
  });
  assert(idorUpdateRes.status === 404, `User B updating User A's recipe is blocked (status 404, got ${idorUpdateRes.status})`);

  // IDOR ATTACK 3: User B tries to delete User A's recipe
  const idorDeleteRes = await fetch(`${BASE_URL}/api/recipes/${recipeAId}`, {
    method: "DELETE",
    headers: { Cookie: cookieB, "X-Forwarded-For": IP_USER_B },
  });
  assert(idorDeleteRes.status === 404, `User B deleting User A's recipe is blocked (status 404, got ${idorDeleteRes.status})`);

  // Verify User A's recipe is still intact
  const verifyRecipeRes = await fetch(`${BASE_URL}/api/recipes/${recipeAId}`, {
    headers: { Cookie: cookieA, "X-Forwarded-For": IP_USER_A },
  });
  const currentRecipeA = await verifyRecipeRes.json();
  assert(currentRecipeA.name === "User A Secret Recipe", "User A's recipe remained untouched");

  // IDOR ATTACK 4: User B lists recipes -> User A's recipe must not appear
  const listBRes = await fetch(`${BASE_URL}/api/recipes`, {
    headers: { Cookie: cookieB, "X-Forwarded-For": IP_USER_B },
  });
  const listB = await listBRes.json();
  const userARecipeInB = (listB.recipes || []).some((r) => r.id === recipeAId);
  assert(!userARecipeInB, "User A's recipe does NOT leak into User B's recipe collection");

  // ISOLATION: Shopping List
  console.log("\n--- 5. Shopping List & Pantry Isolation ---");
  const addShopRes = await fetch(`${BASE_URL}/api/shopping-list`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA, "X-Forwarded-For": IP_USER_A },
    body: JSON.stringify({ name: "User A Private Item", category: "Produce", quantity: 2, unit: "kg" }),
  });
  assert(addShopRes.ok, "User A adds item to shopping list");

  const shopBRes = await fetch(`${BASE_URL}/api/shopping-list`, {
    headers: { Cookie: cookieB, "X-Forwarded-For": IP_USER_B },
  });
  const shopB = await shopBRes.json();
  const itemsB = shopB.items || [];
  const foundShopInB = itemsB.some((item) => item.name === "User A Private Item");
  assert(!foundShopInB, "User A's shopping list items are NOT visible to User B");

  // ISOLATION: Weight Log
  console.log("\n--- 6. Weight & Biometrics Isolation ---");
  const addWeightRes = await fetch(`${BASE_URL}/api/weight`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA, "X-Forwarded-For": IP_USER_A },
    body: JSON.stringify({ date: "2026-09-13", weightKg: 75.5, notes: "Morning weight" }),
  });
  assert(addWeightRes.ok, "User A logs weight");

  const weightBRes = await fetch(`${BASE_URL}/api/weight`, {
    headers: { Cookie: cookieB, "X-Forwarded-For": IP_USER_B },
  });
  const weightB = await weightBRes.json();
  const entriesB = weightB.entries || [];
  const foundWeightInB = entriesB.some((w) => w.notes === "Morning weight");
  assert(!foundWeightInB, "User A's weight entries are NOT visible to User B");

  // TEST SUITE 7: Admin RBAC & Privilege Escalation Defense
  console.log("\n--- 7. Admin Authorization & Privilege Escalation Defense ---");
  // User A tries to access admin users list
  const userAdminRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: { Cookie: cookieA, "X-Forwarded-For": IP_USER_A },
  });
  assert(userAdminRes.status === 403, `Non-admin User A accessing /api/admin/users is denied 403 (got ${userAdminRes.status})`);

  // User A tries to promote themselves to admin
  const meARes = await fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: cookieA, "X-Forwarded-For": IP_USER_A } });
  const meA = await meARes.json();
  const escalateRes = await fetch(`${BASE_URL}/api/admin/users/${meA.user.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookieA, "X-Forwarded-For": IP_USER_A },
    body: JSON.stringify({ role: "admin" }),
  });
  assert(escalateRes.status === 403, `User A attempting privilege escalation is blocked with 403 (got ${escalateRes.status})`);

  // Admin logs in
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": IP_ADMIN },
    body: JSON.stringify({ email: "admin@mealprep.local", password: "AdminPassword123!" }),
  });
  assert(adminLoginRes.status === 200, "Admin login successful");
  const adminCookie = extractSessionCookie(adminLoginRes);
  assert(!!adminCookie, "Admin received session cookie");

  // Admin accesses admin console endpoint
  const adminGetUsersRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: { Cookie: adminCookie, "X-Forwarded-For": IP_ADMIN },
  });
  assert(adminGetUsersRes.status === 200, "Admin can successfully access /api/admin/users");
  const adminData = await adminGetUsersRes.json();
  assert(Array.isArray(adminData.users) && adminData.users.length >= 2, "Admin receives list of all users");

  // TEST SUITE 8: Session Revocation & Logout
  console.log("\n--- 8. Session Revocation on Logout ---");
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookieA, "X-Forwarded-For": IP_USER_A },
  });
  assert(logoutRes.status === 200, "User A logs out successfully");

  // Attempt to use revoked session cookie
  const reusedCookieRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: cookieA, "X-Forwarded-For": IP_USER_A },
  });
  assert(reusedCookieRes.status === 401, "Revoked session cookie returns 401 on subsequent requests");

  // TEST SUITE 9: SSRF Defense
  console.log("\n--- 9. Server-Side Request Forgery (SSRF) Defense ---");
  // Login User B again for SSRF tests
  const ssrfCloudMetadataRes = await fetch(`${BASE_URL}/api/ai/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieB, "X-Forwarded-For": IP_USER_B },
    body: JSON.stringify({ url: "http://169.254.169.254/latest/meta-data" }),
  });
  assert(
    ssrfCloudMetadataRes.status === 400,
    `SSRF attempt to AWS/Cloud metadata (169.254.169.254) is blocked with 400 (got ${ssrfCloudMetadataRes.status})`
  );

  const ssrfLoopbackRes = await fetch(`${BASE_URL}/api/ai/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieB, "X-Forwarded-For": IP_USER_B },
    body: JSON.stringify({ url: "http://127.0.0.1:3000/api/admin/users" }),
  });
  assert(
    ssrfLoopbackRes.status === 400,
    `SSRF attempt to loopback (127.0.0.1) is blocked with 400 (got ${ssrfLoopbackRes.status})`
  );

  const ssrfFileProtoRes = await fetch(`${BASE_URL}/api/ai/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieB, "X-Forwarded-For": IP_USER_B },
    body: JSON.stringify({ url: "file:///etc/passwd" }),
  });
  assert(
    ssrfFileProtoRes.status === 400,
    `SSRF attempt to file:// protocol is blocked with 400 (got ${ssrfFileProtoRes.status})`
  );

  // TEST SUITE 10: Password Reset Flow & Single-Use Enforcement
  console.log("\n--- 10. Password Reset & Single-Use Enforcement ---");
  const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": IP_USER_B },
    body: JSON.stringify({ email: userBEmail }),
  });
  assert(forgotRes.status === 200, "Forgot password request processed");
  const forgotData = await forgotRes.json();
  const resetToken = forgotData.resetToken;
  assert(!!resetToken, "Reset token generated for user");

  // Reset password
  const newBPassword = "NewSecretPassword456!";
  const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": IP_USER_B },
    body: JSON.stringify({ token: resetToken, password: newBPassword }),
  });
  assert(resetRes.status === 200, "Password reset with valid token succeeds");

  // Try to REUSE the same reset token (replay attack)
  const replayResetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": IP_USER_B },
    body: JSON.stringify({ token: resetToken, password: "AnotherPassword789!" }),
  });
  assert(replayResetRes.status === 400, `Reusing used reset token is blocked with 400 (got ${replayResetRes.status})`);

  // Verify User B can login with new password
  const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": IP_USER_B },
    body: JSON.stringify({ email: userBEmail, password: newBPassword }),
  });
  assert(newLoginRes.status === 200, "User B logs in successfully with new password");

  // TEST SUITE 11: Rate Limiting
  console.log("\n--- 11. Rate Limiting Protection ---");
  let rateLimited = false;
  // Send 30 rapid requests from attacker IP (limit is 25 per 15 min window)
  for (let i = 1; i <= 30; i++) {
    const r = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": IP_ATTACKER },
      body: JSON.stringify({ email: "attacker@test.local", password: "bad" }),
    });
    if (r.status === 429) {
      rateLimited = true;
      break;
    }
  }
  assert(rateLimited, "Rate limiter activated: returns 429 Too Many Requests after threshold exceeded");

  console.log("\n=================================================");
  console.log(` AUDIT COMPLETE: ${passedCount} PASSED | ${failedCount} FAILED`);
  console.log("=================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSecurityAudit().catch((err) => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});
