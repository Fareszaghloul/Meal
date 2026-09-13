const BASE_URL = "http://localhost:3000";

async function testMandatoryVerification() {
  console.log("=== Testing Mandatory Email Verification Workflow ===");
  const rand = Math.floor(Math.random() * 100000);
  const email = `fareszaghlool93+mandatory${rand}@gmail.com`;
  const password = "SecurePassword123!";

  // 1. Sign up new account
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: "Mandatory Tester", email, password }),
  });
  console.log("Register response status:", regRes.status);
  const regData = await regRes.json();
  console.log("Register requiresVerification:", regData.requiresVerification);

  const cookieAfterReg = regRes.headers.get("set-cookie");
  console.log("Was session cookie issued on signup? (Should be null):", cookieAfterReg || "None (Correct!)");

  // 2. Try to log in BEFORE verification -> Should be rejected with 403
  const loginBeforeRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  console.log("Login before verification status (Should be 403):", loginBeforeRes.status);
  const loginBeforeData = await loginBeforeRes.json();
  console.log("Login before error message:", loginBeforeData.error);
  console.log("needsEmailVerification flag:", loginBeforeData.needsEmailVerification);

  if (loginBeforeRes.status !== 403 || !loginBeforeData.needsEmailVerification) {
    console.error("FAIL: Unverified user was not blocked!");
    process.exit(1);
  }

  // 3. Verify the email using the verification token
  const token = regData.devVerifyUrl?.split("token=")[1];
  console.log("Using token to verify:", token);
  const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-email?token=${token}`);
  console.log("Verification status:", verifyRes.status);
  const verifyData = await verifyRes.json();
  console.log("Verification message:", verifyData.message);

  // 4. Try to log in AFTER verification -> Should succeed with 200
  const loginAfterRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  console.log("Login after verification status (Should be 200):", loginAfterRes.status);
  const loginAfterData = await loginAfterRes.json();
  console.log("Login after success:", loginAfterData.success, "User:", loginAfterData.user?.email);

  if (loginAfterRes.status === 200 && loginAfterData.success) {
    console.log("\n>>> SUCCESS: Mandatory email verification is strictly enforced! <<<");
  } else {
    console.error("FAIL: Could not log in even after verification!");
    process.exit(1);
  }
}

testMandatoryVerification();
