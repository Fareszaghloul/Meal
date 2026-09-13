// Verification of Email Verification Flow
const BASE_URL = "http://localhost:3000";

async function testEmailVerification() {
  console.log("Testing Email Verification Flow...");
  const rand = Math.floor(Math.random() * 100000);
  const email = `fareszaghlool93+test${rand}@gmail.com`;
  const password = "SecurePassword123!";

  // 1. Register user
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: "Fares Test", email, password }),
  });
  console.log("Register status:", regRes.status);
  const regData = await regRes.json();
  console.log("User emailVerified before:", regData.user?.emailVerified);

  const cookie = regRes.headers.get("set-cookie")?.match(/mealprep_session=([^;]+)/)?.[0];

  // 2. Request verification token
  const sendRes = await fetch(`${BASE_URL}/api/auth/send-verification`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  const sendData = await sendRes.json();
  console.log("Send verification response:", sendData);
  const token = sendData.devVerifyUrl?.split("token=")[1];

  if (!token) {
    console.error("No token generated!");
    process.exit(1);
  }

  // 3. Verify token
  const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-email?token=${token}`);
  const verifyData = await verifyRes.json();
  console.log("Verify email status:", verifyRes.status, verifyData);

  // 4. Check /api/auth/me
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: cookie },
  });
  const meData = await meRes.json();
  console.log("User emailVerified after:", meData.user?.emailVerified);

  if (meData.user?.emailVerified) {
    console.log("SUCCESS: Email verification flow fully functional!");
  } else {
    console.error("FAILED: emailVerified is null!");
    process.exit(1);
  }
}

testEmailVerification();
