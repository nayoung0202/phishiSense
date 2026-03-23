ALTER TABLE public.smtp_accounts
DROP COLUMN IF EXISTS from_email,
DROP COLUMN IF EXISTS from_name,
DROP COLUMN IF EXISTS reply_to;
