-- Add phone_verified flag to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;

-- OTP codes table — one pending code per user at a time
CREATE TABLE IF NOT EXISTS phone_otp_codes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone       text        NOT NULL,
  code_hash   text        NOT NULL,       -- SHA-256 of the 6-digit code
  expires_at  timestamptz NOT NULL,
  attempts    int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- One pending OTP per user
CREATE UNIQUE INDEX IF NOT EXISTS phone_otp_codes_user_id_unique
  ON phone_otp_codes(user_id);

-- Service role only; customers never read this table directly
ALTER TABLE phone_otp_codes ENABLE ROW LEVEL SECURITY;
