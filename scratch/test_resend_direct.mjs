import { Resend } from "resend";

const resend = new Resend("re_hNm6p5Ra_7vRb2doHADbDAWivMXQpitPs");

async function test() {
  console.log("Testing Resend email to fareszaghlool93@gmail.com...");
  const result = await resend.emails.send({
    from: "MealPrep <onboarding@resend.dev>",
    to: "fareszaghlool93@gmail.com",
    subject: "MealPrep Email Verification Test",
    html: "<h1>MealPrep Email Verification</h1><p>Your Resend API key is working perfectly!</p>"
  });
  console.log("Result:", JSON.stringify(result, null, 2));
}

test();
