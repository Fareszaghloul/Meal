import { describe, expect, it } from "vitest";
import { login, BASE } from "./helpers";

const USER_A_EMAIL = "test-user-a@mealprep.test";
const USER_A_PASS = "TestPassword123!";
const USER_B_EMAIL = "test-user-b@mealprep.test";
const USER_B_PASS = "TestPassword123!";

describe("Test User Authorization Isolation", () => {
  let userACookie: string;
  let userBCookie: string;
  let userARecipeId: string;

  it("authenticates test-user-a and test-user-b with isolated sessions", async () => {
    userACookie = await login(USER_A_EMAIL, USER_A_PASS);
    userBCookie = await login(USER_B_EMAIL, USER_B_PASS);

    expect(userACookie).toBeDefined();
    expect(userBCookie).toBeDefined();
    expect(userACookie).not.toBe(userBCookie);

    // Verify /api/auth/me returns distinct users
    const meARes = await fetch(`${BASE}/api/auth/me`, { headers: { cookie: userACookie } });
    const meA = await meARes.json();
    expect(meA.user.email).toBe(USER_A_EMAIL);

    const meBRes = await fetch(`${BASE}/api/auth/me`, { headers: { cookie: userBCookie } });
    const meB = await meBRes.json();
    expect(meB.user.email).toBe(USER_B_EMAIL);
  });

  it("allows test-user-a to create a private recipe", async () => {
    const res = await fetch(`${BASE}/api/recipes`, {
      method: "POST",
      headers: { cookie: userACookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `User A Private Recipe ${Date.now()}`,
        servings: 4,
        ingredients: [
          {
            rawName: "Salt",
            quantity: 5,
            unit: "g",
          },
        ],
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    userARecipeId = body.id;
  });

  it("prevents test-user-b from reading test-user-a's private recipe", async () => {
    expect(userARecipeId).toBeDefined();

    const res = await fetch(`${BASE}/api/recipes/${userARecipeId}`, {
      headers: { cookie: userBCookie },
    });

    // Must be 404 Not Found to unauthorized users
    expect(res.status).toBe(404);
  });

  it("prevents test-user-b from mutating or deleting test-user-a's private recipe", async () => {
    expect(userARecipeId).toBeDefined();

    const updateRes = await fetch(`${BASE}/api/recipes/${userARecipeId}`, {
      method: "PUT",
      headers: { cookie: userBCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Hacked Recipe Name" }),
    });
    expect(updateRes.status).toBe(404);

    const deleteRes = await fetch(`${BASE}/api/recipes/${userARecipeId}`, {
      method: "DELETE",
      headers: { cookie: userBCookie },
    });
    expect(deleteRes.status).toBe(404);
  });

  it("cleans up user-a's test recipe cleanly", async () => {
    expect(userARecipeId).toBeDefined();

    const res = await fetch(`${BASE}/api/recipes/${userARecipeId}`, {
      method: "DELETE",
      headers: { cookie: userACookie },
    });
    expect(res.status).toBe(200);
  });
});
