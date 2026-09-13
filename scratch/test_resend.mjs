import { sendEmail } from "./src/lib/email/resend.ts";

async function test() {
  console.log("Testing Resend email sending...");
  const res = await sendEmail({
    to: "fareszaghloul@icloud.com",
    subject: "MealPrep Email Service Test",
    html: "<p>This is a test to verify the Resend integration for MealPrep.</p>"
  });
  console.log("Resend response:", JSON.stringify(res, null, 2));
}

test();
