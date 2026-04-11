/**
 * SMS abstraction layer.
 *
 * Swap the body of `sendSms` for any provider (Twilio, AWS SNS, Vonage, etc.)
 * without touching OTP logic elsewhere in the codebase.
 *
 * Required env vars depend on the chosen provider — document them in
 * .env.local.example once a provider is selected.
 */
export async function sendSms(to: string, body: string): Promise<void> {
  // TODO: wire up chosen SMS provider here
  // Example (Twilio):
  //   const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  //   await client.messages.create({ from: process.env.TWILIO_FROM_NUMBER, to, body });
  console.log(`[sms stub] to=${to} body="${body}"`);
}
