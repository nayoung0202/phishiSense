ALTER TABLE public.smtp_accounts
ADD COLUMN IF NOT EXISTS tenant_id text;

UPDATE public.smtp_accounts
SET tenant_id = id
WHERE tenant_id IS NULL;

ALTER TABLE public.smtp_accounts
ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS smtp_accounts_tenant_idx
ON public.smtp_accounts USING btree (tenant_id);

CREATE INDEX IF NOT EXISTS smtp_accounts_tenant_active_idx
ON public.smtp_accounts USING btree (tenant_id, is_active);
