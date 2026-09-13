import { hash, verify } from "@node-rs/argon2";

// Modern Argon2id configuration (OWASP recommended parameters)
const ARGON2_OPTIONS = {
  memoryCost: 65536, // 64 MB
  timeCost: 3,       // 3 iterations
  parallelism: 4,    // 4 parallel threads
  outputLen: 32,
};

// Pre-computed dummy hash to consume constant-time comparison on nonexistent user
// Prevents timing-based user enumeration attacks
let dummyHashPromise: Promise<string> | null = null;
async function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hash("dummy_constant_time_pass_for_timing_protection_123!", ARGON2_OPTIONS);
  }
  return dummyHashPromise;
}

/**
 * Hashes a plaintext password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Verifies a plaintext password against an Argon2id hash in constant time
 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch (err) {
    console.error("Password verification error:", err);
    return false;
  }
}

/**
 * Performs a dummy password verification so response times for invalid emails
 * match response times for valid emails with incorrect passwords (prevents timing attacks)
 */
export async function dummyPasswordVerify(): Promise<void> {
  try {
    const dummyH = await getDummyHash();
    await verify(dummyH, "dummy_constant_time_pass_for_timing_protection_123!");
  } catch {
    // ignore
  }
}
