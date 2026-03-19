--
-- PostgreSQL database dump
--

\restrict lBhFMOUiF6T3arQzrINCvhGf7lYULxqH4WPBrndJh4RKaSAQ2g1DX1uEYUbveQj

-- Dumped from database version 16.11 (Debian 16.11-1.pgdg13+1)
-- Dumped by pg_dump version 16.11 (Debian 16.11-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auth_sessions; Type: TABLE; Schema: public; Owner: phishsense
--

CREATE TABLE public.auth_sessions (
    session_id character varying NOT NULL,
    sub text NOT NULL,
    email text,
    name text,
    access_token_exp timestamp without time zone,
    refresh_token_enc text,
    idle_expires_at timestamp without time zone NOT NULL,
    absolute_expires_at timestamp without time zone NOT NULL,
    revoked_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id text,
    access_token_enc text
);


ALTER TABLE public.auth_sessions OWNER TO phishsense;

--
-- Name: platform_entitlement_events; Type: TABLE; Schema: public; Owner: phishsense
--

CREATE TABLE public.platform_entitlement_events (
    event_id text NOT NULL,
    event_type text NOT NULL,
    tenant_id text NOT NULL,
    product_id text NOT NULL,
    occurred_at timestamp without time zone,
    key_id text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.platform_entitlement_events OWNER TO phishsense;

--
-- Name: platform_entitlements; Type: TABLE; Schema: public; Owner: phishsense
--

CREATE TABLE public.platform_entitlements (
    tenant_id text NOT NULL,
    product_id text NOT NULL,
    plan_code text,
    status text NOT NULL,
    seat_limit integer,
    expires_at timestamp without time zone,
    source_type text,
    last_event_id text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.platform_entitlements OWNER TO phishsense;

--
-- Name: project_targets; Type: TABLE; Schema: public; Owner: phishsense
--

CREATE TABLE public.project_targets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    target_id character varying NOT NULL,
    status text DEFAULT 'sent'::text,
    opened_at timestamp without time zone,
    clicked_at timestamp without time zone,
    submitted_at timestamp without time zone,
    tracking_token text,
    send_status text DEFAULT 'pending'::text,
    sent_at timestamp without time zone,
    send_error text,
    tenant_id text NOT NULL
);


ALTER TABLE public.project_targets OWNER TO phishsense;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: phishsense
--

CREATE TABLE public.projects (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    department text,
    department_tags text[],
    template_id character varying,
    training_page_id character varying,
    sending_domain text,
    from_name text,
    from_email text,
    timezone text,
    notification_emails text[],
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    status text NOT NULL,
    target_count integer DEFAULT 0,
    open_count integer DEFAULT 0,
    click_count integer DEFAULT 0,
    submit_count integer DEFAULT 0,
    fiscal_year integer,
    fiscal_quarter integer,
    week_of_year integer[],
    created_at timestamp without time zone DEFAULT now(),
    training_link_token text,
    report_capture_inbox_file_key text,
    report_capture_email_file_key text,
    report_capture_malicious_file_key text,
    report_capture_training_file_key text,
    send_validation_error text,
    tenant_id text NOT NULL
);


ALTER TABLE public.projects OWNER TO phishsense;

--
-- Name: report_instances; Type: TABLE; Schema: public; Owner: phishsense
--

CREATE TABLE public.report_instances (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    template_id character varying NOT NULL,
    status text NOT NULL,
    file_key text,
    error_message text,
    created_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone,
    report_setting_id character varying,
    tenant_id text NOT NULL
);


ALTER TABLE public.report_instances OWNER TO phishsense;

--
-- Name: report_settings; Type: TABLE; Schema: public; Owner: phishsense
--

CREATE TABLE public.report_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    company_name text NOT NULL,
    company_logo_file_key text NOT NULL,
    approver_name text NOT NULL,
    approver_title text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id text NOT NULL
);


ALTER TABLE public.report_settings OWNER TO phishsense;

--
-- Name: report_templates; Type: TABLE; Schema: public; Owner: phishsense
--

CREATE TABLE public.report_templates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    version text NOT NULL,
    file_key text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id text NOT NULL
);


ALTER TABLE public.report_templates OWNER TO phishsense;

--
-- Name: send_jobs; Type: TABLE; Schema: public; Owner: phishsense
--

CREATE TABLE public.send_jobs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    project_id character varying NOT NULL,
    status text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    started_at timestamp without time zone,
    finished_at timestamp without time zone,
    attempts integer DEFAULT 0,
    last_error text,
    total_count integer DEFAULT 0,
    success_count integer DEFAULT 0,
    fail_count integer DEFAULT 0,
    tenant_id text NOT NULL
);


ALTER TABLE public.send_jobs OWNER TO phishsense;

--
-- Name: smtp_accounts; Type: TABLE; Schema: public; Owner: phishsense
--

CREATE TABLE public.smtp_accounts (
    id text NOT NULL,
    name text NOT NULL,
    host text NOT NULL,
    port integer NOT NULL,
    secure boolean DEFAULT false NOT NULL,
    security_mode text NOT NULL,
    username text,
    password_enc text NOT NULL,
    from_email text,
    from_name text,
    reply_to text,
    tls_verify boolean DEFAULT true NOT NULL,
    rate_limit_per_min integer DEFAULT 60 NOT NULL,
    allowed_domains_json text,
    is_active boolean DEFAULT true NOT NULL,
    last_tested_at timestamp without time zone,
    last_test_status text,
    last_test_error text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.smtp_accounts OWNER TO phishsense;

--
-- Name: targets; Type: TABLE; Schema: public; Owner: phishsense
--

CREATE TABLE public.targets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    department text,
    tags text[],
    status text DEFAULT 'active'::text,
    created_at timestamp without time zone DEFAULT now(),
    tenant_id text NOT NULL
);


ALTER TABLE public.targets OWNER TO phishsense;

--
-- Name: templates; Type: TABLE; Schema: public; Owner: phishsense
--

CREATE TABLE public.templates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    malicious_page_content text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    auto_insert_landing_enabled boolean DEFAULT true NOT NULL,
    auto_insert_landing_label text DEFAULT '문서 확인하기'::text NOT NULL,
    auto_insert_landing_kind text DEFAULT 'link'::text NOT NULL,
    auto_insert_landing_new_tab boolean DEFAULT true NOT NULL,
    tenant_id text NOT NULL
);


ALTER TABLE public.templates OWNER TO phishsense;

--
-- Name: training_pages; Type: TABLE; Schema: public; Owner: phishsense
--

CREATE TABLE public.training_pages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    content text NOT NULL,
    status text DEFAULT 'active'::text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tenant_id text NOT NULL
);


ALTER TABLE public.training_pages OWNER TO phishsense;

--
-- Name: users; Type: TABLE; Schema: public; Owner: phishsense
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL
);


ALTER TABLE public.users OWNER TO phishsense;

--
-- Data for Name: auth_sessions; Type: TABLE DATA; Schema: public; Owner: phishsense
--

COPY public.auth_sessions (session_id, sub, email, name, access_token_exp, refresh_token_enc, idle_expires_at, absolute_expires_at, revoked_at, created_at, updated_at, tenant_id, access_token_enc) FROM stdin;
\.


--
-- Data for Name: platform_entitlement_events; Type: TABLE DATA; Schema: public; Owner: phishsense
--

COPY public.platform_entitlement_events (event_id, event_type, tenant_id, product_id, occurred_at, key_id, created_at) FROM stdin;
\.


--
-- Data for Name: platform_entitlements; Type: TABLE DATA; Schema: public; Owner: phishsense
--

COPY public.platform_entitlements (tenant_id, product_id, plan_code, status, seat_limit, expires_at, source_type, last_event_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: project_targets; Type: TABLE DATA; Schema: public; Owner: phishsense
--

COPY public.project_targets (id, project_id, target_id, status, opened_at, clicked_at, submitted_at, tracking_token, send_status, sent_at, send_error, tenant_id) FROM stdin;
f15ea804-346c-4deb-a369-84894346d9e1	c732bf95-0634-4b3a-9d47-cad63314fbb3	9de420a6-da56-4cbc-b166-c49cd481d9c5	sent	\N	\N	\N	9fdad05c-7cdc-4f89-a30c-c0b1fe48ecdd	pending	\N	\N	tenant-local-001
c180cce7-ef3f-434e-8d2e-217a03802b42	503aa26a-f7ee-4aea-8efe-36d074512c2f	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	fe165814-1d06-4c2b-acdb-47613ab9c43a	sent	2026-03-18 01:38:37.489	\N	tenant-local-001
a3e7ada2-94d1-4dba-8086-bc073a89e0be	e9b7baf8-d250-4b16-b9a9-9833e8396250	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	07aeb6db-b115-44d1-8d70-a3b3be23d810	sent	2026-03-18 11:54:23.783	\N	tenant-local-001
52670feb-0419-478f-b534-2a3e8ebb823d	e9b7baf8-d250-4b16-b9a9-9833e8396250	514b2891-dc4e-4497-bd5b-394538f15aec	sent	\N	\N	\N	add308df-eb7e-4f0f-baca-97aa7f0068f1	sent	2026-03-18 11:54:25.451	\N	tenant-local-001
612b03f2-3992-4579-b020-589baf585b00	c732bf95-0634-4b3a-9d47-cad63314fbb3	e589bb5b-6906-4e47-af38-bf9fedb329ff	sent	\N	\N	\N	cd06f593-e8fe-466b-9b8c-057374eff809	pending	\N	\N	tenant-local-001
34fccb49-a2ba-486e-8a2f-a2544baee7d2	503aa26a-f7ee-4aea-8efe-36d074512c2f	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	submitted	2026-03-18 01:38:49.809	2026-03-18 01:38:49.809	2026-03-18 01:38:59.075	10643d70-c4bb-4982-93ad-85810ca687cc	sent	2026-03-18 01:38:41.131	\N	tenant-local-001
d05acb71-bc19-4a2d-ae65-487cecdd3a64	e9b7baf8-d250-4b16-b9a9-9833e8396250	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	clicked	2026-03-18 11:54:52.66	2026-03-18 11:54:52.66	\N	550b05cf-ffe7-4a4d-a314-b848dddab33e	sent	2026-03-18 11:54:29.25	\N	tenant-local-001
c6c7a551-9850-47af-8e92-78543dba4094	7304ec66-caa5-482d-b534-f82503fc23c4	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	95f91699-82ce-48a4-bf28-631977fdf48e	sent	2026-03-19 05:40:20.777	\N	tenant-local-001
e8591c6f-ca4c-43bd-b077-ffdb66e1299e	7304ec66-caa5-482d-b534-f82503fc23c4	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	c0f113e3-0171-4650-ac87-04bf05103512	sent	2026-03-19 05:40:24.458	\N	tenant-local-001
0e884355-4a3e-4e0f-9cf3-ab2050459a1e	52063e56-02d0-4a23-aebc-921a7f06302a	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	02427cef-5600-4f27-9786-f80426103140	sent	2026-03-18 08:08:23.619	\N	tenant-local-001
f2e2a986-a3eb-44e8-8545-a36d20986758	52063e56-02d0-4a23-aebc-921a7f06302a	514b2891-dc4e-4497-bd5b-394538f15aec	sent	\N	\N	\N	58544be5-5e05-4e10-9264-1aac16cece12	sent	2026-03-18 08:08:27.161	\N	tenant-local-001
f7e9cf2b-e463-4103-9d15-4fb5f3fbd811	cff5e75b-9fd9-494c-b5b3-64bf7e8c47a7	9de420a6-da56-4cbc-b166-c49cd481d9c5	sent	\N	\N	\N	47f859af-a765-4883-b783-d70710a2a79a	pending	\N	\N	tenant-local-001
799aa3eb-5793-4586-a202-edb34d423ce7	cff5e75b-9fd9-494c-b5b3-64bf7e8c47a7	3d1a835b-8085-4c0e-9476-6430cfbe1850	sent	\N	\N	\N	b12a6cff-4c92-417a-915d-52eab46b55b4	pending	\N	\N	tenant-local-001
c765480d-6b1f-4488-a8ca-1b5d7bed3f80	cff5e75b-9fd9-494c-b5b3-64bf7e8c47a7	cc635c73-4dee-4ce2-ac57-9cd1aec8c539	sent	\N	\N	\N	d08b370c-eaef-4819-8d79-01d4f3c26073	pending	\N	\N	tenant-local-001
477a4fe9-8a4c-4409-9d9a-3d1b256aaff0	cff5e75b-9fd9-494c-b5b3-64bf7e8c47a7	02e1d0a8-1c5c-4a13-a2a6-593fcaf8c56f	sent	\N	\N	\N	aa395ad3-b2c4-454b-9932-11cfd01551b6	pending	\N	\N	tenant-local-001
8cdec5ad-ca82-44e8-ba7c-5d8f4a351922	cff5e75b-9fd9-494c-b5b3-64bf7e8c47a7	514b2891-dc4e-4497-bd5b-394538f15aec	test	\N	\N	\N	a965a7c7-a087-49a0-81dd-e2af1c84e539	sent	2026-02-10 01:44:46.643	\N	tenant-local-001
0ab90522-027e-4224-8cb8-10e75d5b06b9	7808067e-2e70-49e3-b338-d8850f91f71c	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	82829b4b-2063-411c-bc50-22db689a91d4	sent	2026-02-10 02:03:24.361	\N	tenant-local-001
5b2142a9-a599-4580-99fd-dc4c4041398b	7808067e-2e70-49e3-b338-d8850f91f71c	514b2891-dc4e-4497-bd5b-394538f15aec	sent	\N	\N	\N	8c29200f-2a0e-4f12-a6e4-c43aed128b7c	sent	2026-02-10 02:03:28.19	\N	tenant-local-001
66880921-4516-42b5-a96f-067aebf6d208	7808067e-2e70-49e3-b338-d8850f91f71c	02e1d0a8-1c5c-4a13-a2a6-593fcaf8c56f	sent	\N	\N	\N	93b6e051-f8cb-4052-86d3-9adc9952edc3	sent	2026-02-10 02:03:32.02	\N	tenant-local-001
132dbd7b-9f40-400f-83ea-85eea61e1a8d	323bfe44-ceeb-4ce5-83dc-7064d4dde5d3	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	9d275826-7b10-41fb-8ce2-42092b2646d0	sent	2026-02-11 05:05:10.857	\N	tenant-local-001
c6df6cf5-b542-45b8-ba3c-c6d4a6121b1b	52063e56-02d0-4a23-aebc-921a7f06302a	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	7d88d5ea-200a-4182-8f7f-ba49508641c9	sent	2026-03-18 08:08:30.775	\N	tenant-local-001
ce2503bb-2b1e-4ac5-b2c2-67d767f236c3	1401b2b1-6a81-4cd3-89f3-1e6b6a4651d3	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	255f7b66-690e-4e4e-a27c-48dd8ce0cc75	pending	\N	\N	tenant-local-001
86bb31bc-a6a4-4890-baa5-9f925d1c8ec5	323bfe44-ceeb-4ce5-83dc-7064d4dde5d3	514b2891-dc4e-4497-bd5b-394538f15aec	submitted	2026-02-11 05:05:38.163	2026-02-11 05:05:38.163	2026-02-11 05:05:41.833	94fc79b6-ee79-45c8-a0f8-3b53201b926c	sent	2026-02-11 05:05:14.6	\N	tenant-local-001
96405812-1ca4-4de9-822c-0e33330f411e	1401b2b1-6a81-4cd3-89f3-1e6b6a4651d3	514b2891-dc4e-4497-bd5b-394538f15aec	sent	\N	\N	\N	08f788a4-aa63-45da-9477-60d8e30bf339	pending	\N	\N	tenant-local-001
234c45a0-1626-478b-b9ae-c0136f0f3a34	b46f38f0-b27e-4edc-a043-9f1cfeadb3cc	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	69f2fcd0-3e82-4104-9e3c-dda83c9ee2d5	sent	2026-02-11 10:36:29.452	\N	tenant-local-001
2165a883-5220-45fc-891e-a8d7cfa432b6	b46f38f0-b27e-4edc-a043-9f1cfeadb3cc	514b2891-dc4e-4497-bd5b-394538f15aec	sent	\N	\N	\N	a3997eae-17ed-470e-bce2-9ff1e2793b62	sent	2026-02-11 10:36:32.791	\N	tenant-local-001
90afa00e-dca1-4f9a-9a03-82588f72a9eb	9848980e-9647-4bd3-a44f-bcf1f8ca6e74	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	7c0f5dc9-3ff0-42f4-9a26-5f91642312c6	sent	2026-02-12 06:07:55.576	\N	tenant-local-001
263cd179-e280-4967-bd45-d38a0738db34	ac4626d5-9fd8-421a-ac10-5248e1a3df4f	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	submitted	2026-02-12 06:07:58.751	2026-02-12 06:07:58.751	2026-02-12 06:08:00.164	e9907d2e-1a94-4216-b83c-cc03f03ba530	sent	2026-02-12 05:59:15.406	\N	tenant-local-001
40c29f25-dfec-4222-8edc-89da065f7a30	d1007820-76b6-4459-9d8c-4f49a4f80950	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	17a1c457-16f0-4bd5-bab6-904d0a025644	pending	\N	\N	tenant-local-001
55252d1d-f530-424a-9b86-70c96fcae826	9c5fad41-4681-4907-adb8-33dd379e6846	514b2891-dc4e-4497-bd5b-394538f15aec	sent	\N	\N	\N	b6e0e5b5-f61b-4d63-8231-b1f9d011481f	pending	\N	\N	tenant-local-001
f8261a5d-d547-44e0-8b5c-401cbcdbba86	00bc3667-3f38-4cbf-8514-813489b7bae5	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	567bc8c9-be18-487d-ae76-b5e3a343f807	pending	\N	\N	tenant-local-001
19c95c7a-fd41-4eb5-8ae5-e7afe351b610	aeea958b-0258-49ba-87db-8b4c531437d0	514b2891-dc4e-4497-bd5b-394538f15aec	sent	\N	\N	\N	69427e4d-4396-4ab4-a0a5-5c1d025b510b	pending	\N	\N	tenant-local-001
3244962d-51fd-45dd-88a5-2f566c0b69a5	9d0d025b-ef1b-4c7d-b980-8266d1c7fc54	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	submitted	2026-02-19 03:33:26.532	2026-02-19 03:33:26.532	2026-02-19 05:05:38.963	6d40289b-bfae-458d-baff-aad968d0870a	sent	2026-02-19 03:33:09.878	\N	tenant-local-001
bf57bba9-88dc-4fa8-a65d-5451606773c6	0f00eb65-87d2-4433-a1de-dd4483ab3153	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	2d1e6d46-0631-4ff7-aec2-4cc5656e810d	pending	\N	\N	tenant-local-001
a12f8daa-51c8-4c2a-a1f6-b4aabea4230f	c732bf95-0634-4b3a-9d47-cad63314fbb3	cc635c73-4dee-4ce2-ac57-9cd1aec8c539	sent	\N	\N	\N	03323923-39bf-4f06-b4a7-148588728f35	pending	\N	\N	tenant-local-001
460951e3-b158-48f9-9149-04a4b56cb7e9	c732bf95-0634-4b3a-9d47-cad63314fbb3	3d1a835b-8085-4c0e-9476-6430cfbe1850	sent	\N	\N	\N	bb19f096-84d0-4339-926b-c52857894162	pending	\N	\N	tenant-local-001
e3f09f57-3a4c-49ea-8159-c8ef2d2da22c	c732bf95-0634-4b3a-9d47-cad63314fbb3	02e1d0a8-1c5c-4a13-a2a6-593fcaf8c56f	sent	\N	\N	\N	77e74c15-66ed-459e-91c2-c49368c9d3a4	pending	\N	\N	tenant-local-001
5c513e62-f96d-4d80-9efb-a62adf4d436a	4859d8cc-bdb4-4a7d-bd60-9d864a47234f	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	933a583f-ce21-439b-905c-babba0eb2675	pending	\N	\N	tenant-local-001
aa428170-5957-4b36-8e0a-e7549f362fe4	5044fc74-365a-4489-b93f-7db9271f2e26	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	06a86d0e-f20c-436f-81dc-42bc9d689329	pending	\N	\N	tenant-local-001
1e549008-88bb-4176-be8d-4850927eda0f	b01cab91-3205-4f9b-bc39-b9e1c55e1ea3	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	1e60a29f-f01e-4f2b-a6b6-0b1ab6af888a	sent	2026-03-05 10:43:06.256	\N	tenant-local-001
6d649048-8ecd-4b99-bb48-f939e1f9db6d	767b7255-5cdf-45f6-8237-eeeb7c5c139f	e8735ba2-b0c2-4a73-b660-dde18e235850	sent	\N	\N	\N	55e397c6-bda0-4b88-8e9c-fd7bad241ce2	pending	\N	\N	tenant-local-001
97c42860-ac4f-41ae-978b-68e992816afc	767b7255-5cdf-45f6-8237-eeeb7c5c139f	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	9ab564c4-e157-4ad4-99ae-3a7ffe9e6a6d	pending	\N	\N	tenant-local-001
394b349c-9f0a-489c-bd4f-ec9f22e7630b	767b7255-5cdf-45f6-8237-eeeb7c5c139f	514b2891-dc4e-4497-bd5b-394538f15aec	test	\N	\N	\N	b55e60f9-7ed9-4fce-99f7-c1abc838e258	sent	2026-03-06 08:22:37.905	\N	tenant-local-001
78bef483-b64b-4485-9e6d-fd60e29978b5	96f2026f-6b5a-4aa7-95e6-58af4b800bee	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	7d4613b1-dc83-4c13-b382-c56478dc1368	sent	2026-03-16 07:13:47.799	\N	tenant-local-001
31b48c59-3031-4c64-9338-4d3aa76776dd	1401b2b1-6a81-4cd3-89f3-1e6b6a4651d3	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	25014a88-7753-46e6-887f-045d26e69ea5	pending	\N	\N	tenant-local-001
b423c96c-401d-4a8f-87a2-5eb9f383cdeb	323bfe44-ceeb-4ce5-83dc-7064d4dde5d3	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	590808fc-605d-4224-a2dc-e621b3519428	sent	2026-02-11 05:05:18.042	\N	tenant-local-001
58bb6640-30bb-4f02-b589-4644509b1175	b46f38f0-b27e-4edc-a043-9f1cfeadb3cc	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	clicked	2026-02-11 10:36:44.458	2026-02-11 10:36:44.458	\N	e3d5952b-602b-41e6-8cf8-87c1cb5a02b1	sent	2026-02-11 10:36:36.312	\N	tenant-local-001
e44d8227-0919-419e-8141-743fde2f8e84	6eb19de7-f963-4e7a-8765-7ea2caab1df8	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	5f08e2bf-b16c-4033-a6c3-2fc26c88052a	pending	\N	\N	tenant-local-001
a85bcf33-493e-4459-ae51-bf534a527389	4859d8cc-bdb4-4a7d-bd60-9d864a47234f	9de420a6-da56-4cbc-b166-c49cd481d9c5	sent	\N	\N	\N	c24e53cd-208d-4708-84d8-ddc6cef1807f	pending	\N	\N	tenant-local-001
6c5567d9-de6f-4f8a-879c-d42c1e34a8f5	4859d8cc-bdb4-4a7d-bd60-9d864a47234f	cc635c73-4dee-4ce2-ac57-9cd1aec8c539	sent	\N	\N	\N	d3f3824b-f8e6-4d61-aee3-06a1407e27b4	pending	\N	\N	tenant-local-001
d19bbe4f-929a-4c73-83db-6e4a78e7ea0d	4859d8cc-bdb4-4a7d-bd60-9d864a47234f	02e1d0a8-1c5c-4a13-a2a6-593fcaf8c56f	sent	\N	\N	\N	b4400008-fa3c-44cf-bc25-8f2243353045	pending	\N	\N	tenant-local-001
63cd35a9-b84d-4f25-960f-1bf9eb2dddd7	4859d8cc-bdb4-4a7d-bd60-9d864a47234f	e589bb5b-6906-4e47-af38-bf9fedb329ff	sent	\N	\N	\N	61e53762-6030-4dfb-9e8e-36850a8dc883	pending	\N	\N	tenant-local-001
85489f3e-01a4-4b6a-80a8-43ad2fd01dc3	4859d8cc-bdb4-4a7d-bd60-9d864a47234f	3d1a835b-8085-4c0e-9476-6430cfbe1850	sent	\N	\N	\N	9078999b-d5cf-413f-988f-3711d05cfc9f	pending	\N	\N	tenant-local-001
9b6e41ac-cace-4fdf-99a4-81eebb0872b8	c257db9f-2ba6-4bff-b022-867e2c1c4c6a	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	2736000d-b950-404f-b603-de5d2d23ddc4	pending	\N	\N	tenant-local-001
47fa3889-3a3f-4651-8981-eac86867b1f9	c257db9f-2ba6-4bff-b022-867e2c1c4c6a	02e1d0a8-1c5c-4a13-a2a6-593fcaf8c56f	sent	\N	\N	\N	b26bb46e-3fa6-47d4-a719-c3ee50f550ed	pending	\N	\N	tenant-local-001
d3f70909-315e-40e5-835c-f7d839aa0941	c257db9f-2ba6-4bff-b022-867e2c1c4c6a	9de420a6-da56-4cbc-b166-c49cd481d9c5	sent	\N	\N	\N	fc10e09b-1967-454e-9bef-f61979acfe5a	pending	\N	\N	tenant-local-001
3c0f1e50-801d-4401-9949-82e404955113	c257db9f-2ba6-4bff-b022-867e2c1c4c6a	3d1a835b-8085-4c0e-9476-6430cfbe1850	sent	\N	\N	\N	dc85c640-3bd8-42c2-88b7-fa88101aa3ec	pending	\N	\N	tenant-local-001
54aff6c0-6ae9-4c57-b4b0-9ced69a77eea	c257db9f-2ba6-4bff-b022-867e2c1c4c6a	e589bb5b-6906-4e47-af38-bf9fedb329ff	sent	\N	\N	\N	62e9ecec-7e37-4f97-92b6-d5678d0b56cb	pending	\N	\N	tenant-local-001
af9b1846-a308-477a-a995-e24cc7143b16	c257db9f-2ba6-4bff-b022-867e2c1c4c6a	cc635c73-4dee-4ce2-ac57-9cd1aec8c539	sent	\N	\N	\N	80fbccb0-df21-4b73-a01a-2ca707f12623	pending	\N	\N	tenant-local-001
e24be3ec-3b74-422f-9705-1e5bfe8b0f70	c257db9f-2ba6-4bff-b022-867e2c1c4c6a	514b2891-dc4e-4497-bd5b-394538f15aec	test	\N	\N	\N	978bee8c-c53e-412f-9c5b-35abaea114d0	pending	\N	\N	tenant-local-001
babc396f-1386-4c6f-903a-908a79507966	af442efc-2e60-4988-8d4d-9ed2dc60a280	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	2a07a5b6-f80c-444d-9565-f14fb69340e6	pending	\N	\N	tenant-local-001
eaf02315-06ac-43de-a98c-90579dc669d7	af442efc-2e60-4988-8d4d-9ed2dc60a280	9de420a6-da56-4cbc-b166-c49cd481d9c5	sent	\N	\N	\N	a8a53eb0-8fb5-4c5e-9bfb-b4fe5f32e302	pending	\N	\N	tenant-local-001
904761bc-5140-4f0a-b336-e73bd572a453	af442efc-2e60-4988-8d4d-9ed2dc60a280	e589bb5b-6906-4e47-af38-bf9fedb329ff	sent	\N	\N	\N	2c6a295e-09da-426c-98ba-58cec2b72497	pending	\N	\N	tenant-local-001
570df156-3f07-4729-82af-c2e8519ef1eb	af442efc-2e60-4988-8d4d-9ed2dc60a280	3d1a835b-8085-4c0e-9476-6430cfbe1850	sent	\N	\N	\N	290e2437-da5e-4b17-a086-49b8ed8bf8a2	pending	\N	\N	tenant-local-001
c4a1d8f7-8ea2-450a-a635-418fa674598c	af442efc-2e60-4988-8d4d-9ed2dc60a280	cc635c73-4dee-4ce2-ac57-9cd1aec8c539	sent	\N	\N	\N	5a9586e9-dcd0-46a9-9698-49b0904b2591	pending	\N	\N	tenant-local-001
3c16597a-a868-4f08-9f0a-52a4bdd13112	ac4626d5-9fd8-421a-ac10-5248e1a3df4f	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	c057a9a0-6a1b-4b38-a928-d07e56876687	sent	2026-02-12 05:59:18.739	\N	tenant-local-001
6d9c5bef-a08f-44ce-bfb7-e7901b7a085c	ef451ed3-94bc-49c2-aa64-4c6304897396	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	9cef51ed-1af3-467c-aad4-900453de9364	pending	\N	\N	tenant-local-001
cc782a15-ddea-40a4-ac81-2054d155d612	feec75ff-af51-4a3f-830f-042a26607c85	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	5414db8f-c823-44c0-be73-2126a827ac95	pending	\N	\N	tenant-local-001
db68e646-4b2e-424a-a91c-e3ea80a01aca	feec75ff-af51-4a3f-830f-042a26607c85	514b2891-dc4e-4497-bd5b-394538f15aec	test	\N	\N	\N	42504ad0-0ede-4a1e-856c-0e41c95a534b	sent	2026-02-13 05:43:26.463	\N	tenant-local-001
3a2b2c01-e174-417b-b525-0367ddafaae5	00bc3667-3f38-4cbf-8514-813489b7bae5	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	test	\N	\N	\N	50a13e23-10e7-42e1-a327-7538ab8eca0b	sent	2026-02-13 05:45:31.653	\N	tenant-local-001
8143d431-1118-44e6-87da-7f2fb01a0a4a	6eb19de7-f963-4e7a-8765-7ea2caab1df8	514b2891-dc4e-4497-bd5b-394538f15aec	sent	\N	\N	\N	45539e94-3167-42b1-96bc-d0e3fe16d269	pending	\N	\N	tenant-local-001
5d88bdbc-f442-42fc-b645-9ec4cfd93c9b	f7ba3d55-6c63-458f-a0e0-754e07a200df	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	63c08bf6-d333-42c3-aedf-1ea718b8e8b5	sent	2026-02-12 05:57:56.131	\N	tenant-local-001
64b19c62-4a43-4a52-a816-c6d72e623d9a	f7ba3d55-6c63-458f-a0e0-754e07a200df	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	ea81da1f-d5a6-43cb-83b0-dd543887a39e	sent	2026-02-12 05:57:59.987	\N	tenant-local-001
429c1f36-6d52-4c15-a3cc-e98e42ee615e	9848980e-9647-4bd3-a44f-bcf1f8ca6e74	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	submitted	2026-02-12 06:08:06.952	2026-02-12 06:08:06.952	2026-02-12 06:08:08.458	20591bb2-8d0a-418c-81a3-78b23f7750f5	sent	2026-02-12 06:07:59.015	\N	tenant-local-001
032477c4-54a9-4988-844f-d870513083ff	9c5fad41-4681-4907-adb8-33dd379e6846	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	8f5fd15c-09ca-47fb-bcf5-de186efdf949	pending	\N	\N	tenant-local-001
d7906511-88bb-461f-a486-9a8b72eada45	feec75ff-af51-4a3f-830f-042a26607c85	514b2891-dc4e-4497-bd5b-394538f15aec	sent	\N	\N	\N	52f77b09-7ec6-424f-b22f-fb98330c3e09	pending	\N	\N	tenant-local-001
bff3ae10-4bdd-4d8e-a593-4a727dab57e6	aeea958b-0258-49ba-87db-8b4c531437d0	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	93cd81f9-7e45-4db3-9e55-d0c1a6215382	pending	\N	\N	tenant-local-001
ade0e4ef-0f76-4f65-827a-3e1563f0db6e	5c8b2042-92b3-4b5e-8de6-2251556b82c0	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	ea9bf75f-6851-4216-a517-11a7b2f11288	sent	2026-02-13 06:07:44.008	\N	tenant-local-001
68e682f8-14f0-48e5-849f-51915bea17a5	5c8b2042-92b3-4b5e-8de6-2251556b82c0	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	clicked	2026-02-13 06:10:32.237	2026-02-13 06:10:32.237	\N	d433a657-cf4b-4e81-a23d-ff67d6c60554	sent	2026-02-13 06:07:40.567	\N	tenant-local-001
21d58131-8f4d-4d17-8c1c-6bbb5c2a3675	6316594e-4670-4182-9509-588328ef6eeb	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	submitted	2026-02-19 07:34:10.973	2026-02-19 07:34:10.973	2026-02-19 07:34:22.7	e9aff4bd-24b2-4ac4-a48c-689f1c56bec8	sent	2026-02-19 07:33:47.806	\N	tenant-local-001
4c8dd9a6-0127-4c28-ba82-501163cf67ee	af442efc-2e60-4988-8d4d-9ed2dc60a280	02e1d0a8-1c5c-4a13-a2a6-593fcaf8c56f	sent	\N	\N	\N	ced4d598-4d41-4b83-971f-8365401300e7	pending	\N	\N	tenant-local-001
c3eba19c-631f-45bf-99e1-3ec904ce5293	dbc71773-628d-4a9a-bdf6-a071b34e452f	514b2891-dc4e-4497-bd5b-394538f15aec	sent	\N	\N	\N	5f6683dc-5899-49b3-b7dc-20618eacff06	pending	\N	\N	tenant-local-001
a5907a93-1524-4e4d-8e4b-06c62247601d	dbc71773-628d-4a9a-bdf6-a071b34e452f	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	fef7eb58-c644-49cf-b8a5-1b38a5c6662d	pending	\N	\N	tenant-local-001
ec37cf69-db2d-49f3-83ff-ce334a853a17	dbc71773-628d-4a9a-bdf6-a071b34e452f	e589bb5b-6906-4e47-af38-bf9fedb329ff	sent	\N	\N	\N	f7ac30d1-32da-45a5-8f35-ae1bf7be237a	pending	\N	\N	tenant-local-001
629e14cd-661f-4614-8bd7-d0acf7f7b5e3	dbc71773-628d-4a9a-bdf6-a071b34e452f	02e1d0a8-1c5c-4a13-a2a6-593fcaf8c56f	sent	\N	\N	\N	27e14d79-ec37-4304-a4b6-dbc1820e0565	pending	\N	\N	tenant-local-001
66b8f15d-d696-4815-b433-b6430f0db3c6	dbc71773-628d-4a9a-bdf6-a071b34e452f	9de420a6-da56-4cbc-b166-c49cd481d9c5	sent	\N	\N	\N	4401bcea-2fbb-4671-afec-7eea9d6d7135	pending	\N	\N	tenant-local-001
b9c79bd9-3f82-4382-bb41-74ee40301bc8	dbc71773-628d-4a9a-bdf6-a071b34e452f	cc635c73-4dee-4ce2-ac57-9cd1aec8c539	sent	\N	\N	\N	e5f4423e-2d55-48ac-b797-a8010f393d30	pending	\N	\N	tenant-local-001
6e451236-609f-4ca6-841f-3363fa6cd3b4	0f00eb65-87d2-4433-a1de-dd4483ab3153	514b2891-dc4e-4497-bd5b-394538f15aec	test	\N	\N	\N	9507a599-685e-47bc-9882-c1fda9bdca32	sent	2026-03-04 05:51:51.097	\N	tenant-local-001
a77c0071-2948-4421-a2d9-1274529f0e10	5044fc74-365a-4489-b93f-7db9271f2e26	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	1481070b-6ad1-47ee-9c4b-ea2e267e16e2	pending	\N	\N	tenant-local-001
e039e5fc-21e4-48f4-86bc-d6620e282efd	5044fc74-365a-4489-b93f-7db9271f2e26	514b2891-dc4e-4497-bd5b-394538f15aec	sent	\N	\N	\N	d622669a-d85d-414f-b41e-e4ee0b2c98ef	pending	\N	\N	tenant-local-001
62a7c0d0-8eaa-4a70-a926-d16e0b6034b2	767b7255-5cdf-45f6-8237-eeeb7c5c139f	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	9ff61964-69d3-4959-8508-a08ddc324db8	pending	\N	\N	tenant-local-001
c2dd15b0-65ed-4646-a650-acb41f80b8b9	96f2026f-6b5a-4aa7-95e6-58af4b800bee	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	clicked	2026-03-16 07:14:00.662	2026-03-16 07:14:00.662	\N	a8a2e3a9-3667-44a2-bb12-5bb19836c096	sent	2026-03-16 07:13:54.575	\N	tenant-local-001
5e696caf-0521-4893-8529-28dc4182d504	dbc71773-628d-4a9a-bdf6-a071b34e452f	3d1a835b-8085-4c0e-9476-6430cfbe1850	sent	\N	\N	\N	d10df25e-d7c6-4212-93ca-c9de757f0ced	pending	\N	\N	tenant-local-001
0842b41b-a35a-4b11-8493-d4fadb40ec32	d98357c2-fae3-4867-b6fb-a688bd26bcf0	514b2891-dc4e-4497-bd5b-394538f15aec	sent	\N	\N	\N	62dd5e37-25e2-4713-b3de-137a750f95fe	pending	\N	\N	tenant-local-001
b0df9a94-36d3-42e0-a324-da9c2fbfda20	d98357c2-fae3-4867-b6fb-a688bd26bcf0	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	c39133f6-1788-49a7-96f2-43b154f29f2c	pending	\N	\N	tenant-local-001
014be3e2-718d-47e8-8b27-98a0aa127506	d98357c2-fae3-4867-b6fb-a688bd26bcf0	e589bb5b-6906-4e47-af38-bf9fedb329ff	sent	\N	\N	\N	530900f4-4b2a-4f3b-8d4d-c327ec82f106	pending	\N	\N	tenant-local-001
cc063df4-75e1-4660-abcb-8708578c95d8	d98357c2-fae3-4867-b6fb-a688bd26bcf0	02e1d0a8-1c5c-4a13-a2a6-593fcaf8c56f	sent	\N	\N	\N	699b6548-6b65-4942-be59-99a27c1fba9e	pending	\N	\N	tenant-local-001
ddd4ec2f-bb92-404d-a7d2-20f70047e6f3	d98357c2-fae3-4867-b6fb-a688bd26bcf0	3d1a835b-8085-4c0e-9476-6430cfbe1850	sent	\N	\N	\N	18dddaae-5984-4df0-91ab-909233e386dd	pending	\N	\N	tenant-local-001
2169d829-c2d6-457c-8208-b5cc318a9dd8	d98357c2-fae3-4867-b6fb-a688bd26bcf0	cc635c73-4dee-4ce2-ac57-9cd1aec8c539	sent	\N	\N	\N	096ecc62-3d51-4ecc-917a-c27a503dafe0	pending	\N	\N	tenant-local-001
ebbbbd87-01de-494d-b5b5-e5981d8947fe	d98357c2-fae3-4867-b6fb-a688bd26bcf0	9de420a6-da56-4cbc-b166-c49cd481d9c5	sent	\N	\N	\N	3c907456-05c6-48a1-bf65-b4b1fe9be2ea	pending	\N	\N	tenant-local-001
c6cb15bb-0a7c-4c21-8bd7-e790290e614d	d98357c2-fae3-4867-b6fb-a688bd26bcf0	514b2891-dc4e-4497-bd5b-394538f15aec	test	\N	\N	\N	4d692dca-6035-4fc5-b7b2-311b5f27ecbc	sent	2026-02-09 14:09:38.508	\N	tenant-local-001
aeb1adb9-c207-4c53-9fb8-19d4d2159ff6	d98357c2-fae3-4867-b6fb-a688bd26bcf0	514b2891-dc4e-4497-bd5b-394538f15aec	test	\N	\N	\N	21c5b134-bc87-46d4-beba-6cdf6687c655	sent	2026-02-09 14:09:49.68	\N	tenant-local-001
7ad322d8-eb13-49fd-99bd-d63149647abb	cff5e75b-9fd9-494c-b5b3-64bf7e8c47a7	514b2891-dc4e-4497-bd5b-394538f15aec	sent	\N	\N	\N	bc4a5fff-93b7-4875-b249-8f3d2d3f3b32	pending	\N	\N	tenant-local-001
a7db0466-9644-4d39-a63d-e61b69c25e19	cff5e75b-9fd9-494c-b5b3-64bf7e8c47a7	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	c76ff62b-c0ba-4da4-88eb-92e94896a74c	pending	\N	\N	tenant-local-001
4f054df8-f7dd-4d37-bd2e-19589378c774	cff5e75b-9fd9-494c-b5b3-64bf7e8c47a7	e589bb5b-6906-4e47-af38-bf9fedb329ff	sent	\N	\N	\N	741d9f08-501b-4554-b279-5e31a4a49228	pending	\N	\N	tenant-local-001
0e5fd8be-4e41-455d-be7c-a6f9225c35db	7808067e-2e70-49e3-b338-d8850f91f71c	3d1a835b-8085-4c0e-9476-6430cfbe1850	sent	\N	\N	\N	2d44fa43-e70f-4dac-9e70-48db588461a4	sent	2026-02-10 02:03:35.58	\N	tenant-local-001
3f4442a9-eea8-4a9a-9f7e-a442ce027011	7808067e-2e70-49e3-b338-d8850f91f71c	9de420a6-da56-4cbc-b166-c49cd481d9c5	sent	\N	\N	\N	7eab0a39-657f-42ff-b5c8-44c0d72bf789	sent	2026-02-10 02:03:39.297	\N	tenant-local-001
13a0d317-5de6-471e-958f-d9fb5279a189	7808067e-2e70-49e3-b338-d8850f91f71c	cc635c73-4dee-4ce2-ac57-9cd1aec8c539	sent	\N	\N	\N	368bd107-dc3e-4986-90d5-702393416898	sent	2026-02-10 02:03:42.838	\N	tenant-local-001
340b1fa9-9cc9-4e9d-af5b-a85eda7529a5	7808067e-2e70-49e3-b338-d8850f91f71c	e589bb5b-6906-4e47-af38-bf9fedb329ff	sent	\N	\N	\N	10480d68-d377-4107-b9df-1e92e9237d65	sent	2026-02-10 02:03:46.527	\N	tenant-local-001
68395f79-c9e2-4144-88eb-e13d3349aacb	dca2ac1f-8df8-4e7e-bba1-f47afa933364	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	3328fea2-bcbd-4a4f-a13e-5bbcb6835bd7	sent	2026-02-10 02:06:05.939	\N	tenant-local-001
a34bfbea-200f-4c09-9c4a-f32330686418	dca2ac1f-8df8-4e7e-bba1-f47afa933364	514b2891-dc4e-4497-bd5b-394538f15aec	sent	\N	\N	\N	a1bedc07-e514-4f7d-89c8-6af3550ec98f	sent	2026-02-10 02:06:09.48	\N	tenant-local-001
2fe7e695-66b4-40ae-991c-1b20b4679a14	dca2ac1f-8df8-4e7e-bba1-f47afa933364	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	58644292-e3b2-4367-b3b2-4502ffd3820b	sent	2026-02-10 02:06:13.083	\N	tenant-local-001
a85e1e35-86fa-4fbc-bd38-c501b67189d7	dca2ac1f-8df8-4e7e-bba1-f47afa933364	e589bb5b-6906-4e47-af38-bf9fedb329ff	sent	\N	\N	\N	44727194-5185-4ca5-a4a3-7f2012886bce	sent	2026-02-10 02:06:16.626	\N	tenant-local-001
a713323b-3f7a-4f5e-ac2f-963bfc937cfa	dca2ac1f-8df8-4e7e-bba1-f47afa933364	9de420a6-da56-4cbc-b166-c49cd481d9c5	sent	\N	\N	\N	61a6d36c-b8a3-446e-8b80-b89edba95483	sent	2026-02-10 02:06:20.156	\N	tenant-local-001
cefa8749-0108-4b52-830a-c297688a7ef2	dca2ac1f-8df8-4e7e-bba1-f47afa933364	02e1d0a8-1c5c-4a13-a2a6-593fcaf8c56f	sent	\N	\N	\N	22152948-c3cc-4bf6-9bf1-4a9308022f06	sent	2026-02-10 02:06:23.746	\N	tenant-local-001
ac7c583a-c656-42f2-92a3-77496039e10c	dca2ac1f-8df8-4e7e-bba1-f47afa933364	3d1a835b-8085-4c0e-9476-6430cfbe1850	sent	\N	\N	\N	b04fba57-9c70-4bb4-8964-da04388012b8	sent	2026-02-10 02:06:26.207	\N	tenant-local-001
6f946453-bf40-4530-bfd4-066356fe573d	dca2ac1f-8df8-4e7e-bba1-f47afa933364	cc635c73-4dee-4ce2-ac57-9cd1aec8c539	sent	\N	\N	\N	e21928e2-d8a5-4992-97c5-5978b48d12b3	sent	2026-02-10 02:06:29.832	\N	tenant-local-001
73b9f698-58a3-4bf5-b202-16e61c1c08d3	323bfe44-ceeb-4ce5-83dc-7064d4dde5d3	dedc33b4-89b2-4dc7-af02-624d9b67cb03	sent	\N	\N	\N	d929eaf7-9057-4a3d-9e64-428d63c403ea	sent	2026-02-11 05:04:52.531	\N	tenant-local-001
ef767c92-60aa-4444-9e59-9ef4498c1071	323bfe44-ceeb-4ce5-83dc-7064d4dde5d3	362740d2-e83f-40b0-89b9-2fdc49e3eace	sent	\N	\N	\N	9c0de466-c084-41e3-a8c2-5d72a83724d3	sent	2026-02-11 05:04:56.093	\N	tenant-local-001
d4db10c3-6eb9-46a4-89f3-8225a03f9c97	323bfe44-ceeb-4ce5-83dc-7064d4dde5d3	e6ea323d-f526-4829-adf2-027547478f6e	sent	\N	\N	\N	fc9611df-6e4d-4f46-9800-c697b0018053	sent	2026-02-11 05:04:59.777	\N	tenant-local-001
636fe01e-160b-46f9-b4ec-dc61539a1d06	323bfe44-ceeb-4ce5-83dc-7064d4dde5d3	85fbf0ce-6e97-448c-95ee-1c40a8b3cf0b	sent	\N	\N	\N	c016768e-ac9a-42a9-ad19-4a5c1034d665	sent	2026-02-11 05:05:03.803	\N	tenant-local-001
3c42fd07-1146-4108-90db-d35bfd5f639f	323bfe44-ceeb-4ce5-83dc-7064d4dde5d3	7af482d6-33da-4ade-9430-b2068508a895	sent	\N	\N	\N	55903a31-ba51-48fe-8e5b-9e1203c4fbbf	sent	2026-02-11 05:05:07.05	\N	tenant-local-001
102b8c39-7698-4213-9174-f02e9b2699bc	aeea958b-0258-49ba-87db-8b4c531437d0	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	3a295dfb-0f2e-4463-b4fa-c53eaab8ba82	pending	\N	\N	tenant-local-001
a7e6d276-8a20-4df8-9f36-ecd7f41a692d	6316594e-4670-4182-9509-588328ef6eeb	514b2891-dc4e-4497-bd5b-394538f15aec	sent	\N	\N	\N	b0b1db9e-e989-406c-ac73-12966a644005	sent	2026-02-19 07:33:41.715	\N	tenant-local-001
eda7db73-b8c2-4811-8f5c-704ade8bc7c0	6316594e-4670-4182-9509-588328ef6eeb	b7b03441-96a4-42a8-90b5-e39a69b6412c	sent	\N	\N	\N	d2a5d3fa-9b53-4404-aee1-1b476bacd0dd	sent	2026-02-19 07:33:44.719	\N	tenant-local-001
adb593c9-6d92-40de-a811-3cf546372fcf	0f00eb65-87d2-4433-a1de-dd4483ab3153	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	4f2aa7b5-7688-4f6c-b4ef-37c91972e839	pending	\N	\N	tenant-local-001
89c0809d-5308-40ae-b3ad-273c1dc67a59	c20a2ae0-1c7d-489d-b0a9-8dab0d696acb	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	9eb717d9-1fcb-4ace-b167-5c80b041f89b	pending	\N	\N	tenant-local-001
2a6fc4e7-1c6d-4e8f-ad1c-283e7e3056ae	b01cab91-3205-4f9b-bc39-b9e1c55e1ea3	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	9bf0aeff-cd94-42a1-bb18-f03bfd2aee6a	sent	2026-03-05 10:43:10.184	\N	tenant-local-001
2ff4dc08-63e6-45cf-8997-f1191f7d0f03	767b7255-5cdf-45f6-8237-eeeb7c5c139f	514b2891-dc4e-4497-bd5b-394538f15aec	sent	\N	\N	\N	2a445b52-fcc4-4929-862b-a5596e4ec94b	pending	\N	\N	tenant-local-001
14618d47-321f-42be-8a8e-7e0a37817680	96f2026f-6b5a-4aa7-95e6-58af4b800bee	514b2891-dc4e-4497-bd5b-394538f15aec	sent	\N	\N	\N	c5f20fbe-0fad-40b5-8960-73680fb94f7b	sent	2026-03-16 07:13:51.166	\N	tenant-local-001
9de50e99-36a4-4555-8e02-c80bb37e0dfd	6eb19de7-f963-4e7a-8765-7ea2caab1df8	34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	sent	\N	\N	\N	d0690ec3-b622-4aec-b0c5-3ad8cb9eaf8b	pending	\N	\N	tenant-local-001
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: phishsense
--

COPY public.projects (id, name, description, department, department_tags, template_id, training_page_id, sending_domain, from_name, from_email, timezone, notification_emails, start_date, end_date, status, target_count, open_count, click_count, submit_count, fiscal_year, fiscal_quarter, week_of_year, created_at, training_link_token, report_capture_inbox_file_key, report_capture_email_file_key, report_capture_malicious_file_key, report_capture_training_file_key, send_validation_error, tenant_id) FROM stdin;
f6c8b112-300a-4054-b02c-fc30d51c611c	2025년 02월 거래처 요청 위장 대응 훈련 2차	거래처 요청과 납품 일정을 위장한 메일을 중심으로 승인 절차를 점검합니다. 지출 결의와 세금계산서를 가장한 승인 요청에 대한 대응력을 높입니다.	재무전략실	{재무전략실,결재보안}	tmpl-shipping-alert	tp-guide-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,financecontrol@company.com}	2025-02-17 09:00:00	2025-02-20 18:00:00	임시	150	\N	\N	\N	2025	1	{}	2025-02-10 09:00:00	8a83e599351e	\N	\N	\N	\N	\N	tenant-local-001
aec66be6-2ae2-44eb-95a4-2d15b3cdcc9e	2025년 03월 복지·근태 정책 안내 점검 1차	복지 및 근태 정책 변경 공지를 사칭한 공격 유형에 대한 대응력을 강화합니다. 지출 결의와 세금계산서를 가장한 승인 요청에 대한 대응력을 높입니다.	재무전략실	{재무전략실,결재보안}	tmpl-shipping-alert	tp-guide-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,financecontrol@company.com}	2025-03-04 09:00:00	2025-03-07 18:00:00	임시	138	\N	\N	\N	2025	1	{}	2025-02-25 09:00:00	fe7f352b72fe	\N	\N	\N	\N	\N	tenant-local-001
1401b2b1-6a81-4cd3-89f3-1e6b6a4651d3	급여 안내 템플릿 복제	\N	개발부	{개발부,"개발부 > 2팀"}	b18e3e75-f810-4999-8fcd-f22c6840b089	8b825249-7b53-46c5-a6f2-101e71758d96	evriz.co.kr	정보보안팀	nayeong.ju@evriz.co.kr	Asia/Seoul	{}	2026-03-18 08:08:00	2026-03-18 09:11:20.332	완료	3	\N	\N	\N	2026	1	{12}	2026-03-18 09:11:12.219	9829f55370bea3b743fa21e550b38b7e	\N	\N	\N	\N	\N	tenant-local-001
ac8181c0-b409-4337-b6ab-c4dd8a56e6f7	2025년 03월 복지·근태 정책 안내 점검 2차	복지 및 근태 정책 변경 공지를 사칭한 공격 유형에 대한 대응력을 강화합니다. 설비 점검 일정을 사칭해 첨부파일 열람을 유도하는 유형을 다룹니다.	생산본부	{생산본부,현장안전}	tmpl-m365-lock	tp-notice-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,plant@company.com}	2025-03-17 09:00:00	2025-03-20 18:00:00	완료	156	122	27	12	2025	1	{}	2025-03-10 09:00:00	11ff0bd544c3	\N	\N	\N	\N	\N	tenant-local-001
fa9ced01-570d-480b-9b7a-67d5196ccf9a	2025년 04월 결제·정산 요청 대응 훈련 1차	결제 요청과 정산 안내를 위장한 사회공학 패턴에 대비하는 훈련입니다. 설비 점검 일정을 사칭해 첨부파일 열람을 유도하는 유형을 다룹니다.	생산본부	{생산본부,현장안전}	tmpl-m365-lock	tp-notice-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,plant@company.com}	2025-04-04 09:00:00	2025-04-07 18:00:00	완료	144	112	25	11	2025	2	{}	2025-03-28 09:00:00	f80ab6b0c748	\N	\N	\N	\N	\N	tenant-local-001
57dd06c6-db11-4802-903b-7153644589fc	2025년 06월 계정 보안 재인증 점검 2차	계정 보안 재인증 안내를 사칭한 시나리오로 인증 절차 준수 여부를 확인합니다. VPN 재인증과 클라우드 계정 설정 변경을 요구하는 위장 메일을 탐지하는 훈련입니다.	인프라운영실	{인프라운영실,계정보안}	tmpl-m365-lock	tp-notice-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,itops@company.com}	2025-06-17 09:00:00	2025-06-20 18:00:00	임시	174	\N	\N	\N	2025	2	{}	2025-06-10 09:00:00	76215faaa210	\N	\N	\N	\N	\N	tenant-local-001
503aa26a-f7ee-4aea-8efe-36d074512c2f	급여 안내 템플릿	\N	개발부	{개발부,"개발부 > 2팀"}	2d114035-e06e-4c03-84e4-15d5fefc6bbd	8b825249-7b53-46c5-a6f2-101e71758d96	evriz.co.kr	테스트팀	nayeong.ju@evriz.co.kr	Asia/Seoul	{}	2026-03-17 11:26:35.59	2026-03-17 15:00:00	완료	2	1	1	1	2026	1	{12}	2026-03-18 01:38:31.735	c53bd92675397774fdcaf75987d8a721	\N	\N	\N	\N	\N	tenant-local-001
56faafe9-4629-47cf-8177-8938e4241790	1234	\N	\N	{}			\N	\N		Asia/Seoul	{}	2026-03-18 05:14:00	2026-03-18 05:14:00	임시	0	\N	\N	\N	2026	1	{12}	2026-03-18 05:40:31.727	cc0403512bc09e3796f8b3c1c8cd9c7c	\N	\N	\N	\N	\N	tenant-local-001
6eb19de7-f963-4e7a-8765-7ea2caab1df8	급여 안내 템플릿 복제 2	\N	개발부	{개발부,"개발부 > 2팀"}	b18e3e75-f810-4999-8fcd-f22c6840b089	8b825249-7b53-46c5-a6f2-101e71758d96	evriz.co.kr	정보보안팀	nayeong.ju@evriz.co.kr	Asia/Seoul	{}	2026-03-18 08:08:00	2026-03-18 09:11:45.31	완료	3	\N	\N	\N	2026	1	{12}	2026-03-18 09:11:33.425	d36f386e43f275b037f291d64424b956	\N	\N	\N	\N	\N	tenant-local-001
c3ed137f-0918-455d-89bf-7a4b251a103c	2025년 07월 거래처 요청 위장 대응 훈련 1차	거래처 요청과 납품 일정을 위장한 메일을 중심으로 승인 절차를 점검합니다. VPN 재인증과 클라우드 계정 설정 변경을 요구하는 위장 메일을 탐지하는 훈련입니다.	인프라운영실	{인프라운영실,계정보안}	tmpl-m365-lock	tp-notice-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,itops@company.com}	2025-07-04 09:00:00	2025-07-07 18:00:00	임시	162	\N	\N	\N	2025	3	{}	2025-06-27 09:00:00	b6b53f888341	\N	\N	\N	\N	\N	tenant-local-001
e9cad72c-cfae-451a-aefd-6f74e2ae8360	2025년 07월 거래처 요청 위장 대응 훈련 2차	거래처 요청과 납품 일정을 위장한 메일을 중심으로 승인 절차를 점검합니다. 인사 발령 및 급여 정산 안내 메일을 위장한 공격 유형을 점검합니다.	인사부	{인사부,교육프로그램}	tmpl-tax-refund	tp-result-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,hr@company.com}	2025-07-17 09:00:00	2025-07-20 18:00:00	완료	180	140	31	14	2025	3	{}	2025-07-10 09:00:00	4500f0e46ab2	\N	\N	\N	\N	\N	tenant-local-001
6f5c54c9-78ff-48b2-b514-1aa369fbfa5c	2025년 08월 복지·근태 정책 안내 점검 1차	복지 및 근태 정책 변경 공지를 사칭한 공격 유형에 대한 대응력을 강화합니다. 인사 발령 및 급여 정산 안내 메일을 위장한 공격 유형을 점검합니다.	인사부	{인사부,교육프로그램}	tmpl-tax-refund	tp-result-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,hr@company.com}	2025-08-04 09:00:00	2025-08-07 18:00:00	완료	168	131	29	13	2025	3	{}	2025-07-28 09:00:00	2ab4591f9305	\N	\N	\N	\N	\N	tenant-local-001
8615ed16-fede-4db1-a1a0-b1a65517f44d	2025년 10월 협력사 보안 점검 공지 2차	협력사 보안 점검 요청을 사칭한 메일을 통해 대응 절차를 재확인합니다. 신제품 자료 열람 요청으로 위장한 기술 유출 위협을 모의합니다.	연구개발센터	{연구개발센터,기술보안}	tmpl-tax-refund	tp-result-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,rndlead@company.com}	2025-10-17 09:00:00	2025-10-20 18:00:00	임시	198	\N	\N	\N	2025	4	{}	2025-10-10 09:00:00	48034a98d347	\N	\N	\N	\N	\N	tenant-local-001
06a80db1-07d2-4b16-ac91-e8c28dd0e85d	2025년 11월 계정 보안 재인증 점검 1차	계정 보안 재인증 안내를 사칭한 시나리오로 인증 절차 준수 여부를 확인합니다. 신제품 자료 열람 요청으로 위장한 기술 유출 위협을 모의합니다.	연구개발센터	{연구개발센터,기술보안}	tmpl-tax-refund	tp-result-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,rndlead@company.com}	2025-11-04 09:00:00	2025-11-07 18:00:00	임시	186	\N	\N	\N	2025	4	{}	2025-10-28 09:00:00	32db75d012cb	\N	\N	\N	\N	\N	tenant-local-001
e9b7baf8-d250-4b16-b9a9-9833e8396250	계정 정보 설정 템플릿	\N	개발부	{개발부,"개발부 > 2팀"}	f0535ee2-b911-4022-8db9-01d21a16a50e	7678ebbd-c448-4828-b146-d4e94508d69b	evriz.co.kr	테스트팀	nayeong.ju@evriz.co.kr	Asia/Seoul	{}	2026-03-18 11:54:00	2026-03-18 15:00:00	완료	3	1	1	\N	2026	1	{12}	2026-03-18 11:54:17.472	205f92dc5509e14291bff816b9ee57d2	\N	\N	\N	\N	\N	tenant-local-001
b13eb3db-cc96-465e-85c6-16c69f8ed6a0	2025년 05월 협력사 보안 점검 공지 2차	협력사 보안 점검 요청을 사칭한 메일을 통해 대응 절차를 재확인합니다. 주요 고객 발주서와 납품 일정을 사칭하는 메시지를 통해 승인 절차를 검증합니다.	영업본부	{영업본부,거래처보호}	tmpl-shipping-alert	tp-guide-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,saleslead@company.com}	2025-05-17 09:00:00	2025-05-20 18:00:00	완료	168	\N	\N	\N	2025	2	{}	2025-05-10 09:00:00	08afcec08cef	\N	\N	\N	\N	\N	tenant-local-001
2a4b53fd-cb8b-4bb6-b703-566bdc1d59e9	2025년 05월 협력사 보안 점검 공지 1차	협력사 보안 점검 요청을 사칭한 메일을 통해 대응 절차를 재확인합니다. 신제품 자료 열람 요청으로 위장한 기술 유출 위협을 모의합니다.	연구개발센터	{연구개발센터,기술보안}	tmpl-tax-refund	tp-result-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,rndlead@company.com}	2025-05-04 09:00:00	2025-05-07 18:00:00	완료	150	117	26	12	2025	2	{}	2025-04-27 09:00:00	1216e697051d	\N	\N	\N	\N	\N	tenant-local-001
7564cda3-52fc-498e-81a5-23278f3e7d26	2025년 01월 계정 보안 재인증 점검 2차	계정 보안 재인증 안내를 사칭한 시나리오로 인증 절차 준수 여부를 확인합니다. 인사 발령 및 급여 정산 안내 메일을 위장한 공격 유형을 점검합니다.	인사부	{인사부,교육프로그램}	tmpl-tax-refund	tp-result-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,hr@company.com}	2025-01-17 09:00:00	2025-01-20 18:00:00	완료	144	\N	\N	\N	2025	1	{}	2025-01-10 09:00:00	dcdd28be849a	\N	\N	\N	\N	\N	tenant-local-001
0c36b3be-9ef9-43c1-89da-b11f0d1daef4	택배 보류 알림	\N	기술보안	{기술보안}	9f68ee2a-7730-4fdc-9ea5-a5dfacc65116	7678ebbd-c448-4828-b146-d4e94508d69b	evriz.co.kr	테스트팀	nayeong.ju@evriz.co.kr	Asia/Seoul	{}	2026-01-14 15:00:00	2026-01-21 15:00:00	완료	5	\N	\N	\N	2026	1	{3,4}	2026-01-07 04:22:44.81	7fa3e7bc051099d56a13ec11c7644a56	reports/captures/0c36b3be-9ef9-43c1-89da-b11f0d1daef4/capture_inbox.png	reports/captures/0c36b3be-9ef9-43c1-89da-b11f0d1daef4/capture_email_body.png	reports/captures/0c36b3be-9ef9-43c1-89da-b11f0d1daef4/capture_malicious_page.png	reports/captures/0c36b3be-9ef9-43c1-89da-b11f0d1daef4/capture_training_page.png	\N	tenant-local-001
82c88dc0-b5f9-4b99-87da-c5e48d51eb9f	2025년 04월 결제·정산 요청 대응 훈련 2차	결제 요청과 정산 안내를 위장한 사회공학 패턴에 대비하는 훈련입니다. 신제품 자료 열람 요청으로 위장한 기술 유출 위협을 모의합니다.	연구개발센터	{연구개발센터,기술보안}	tmpl-tax-refund	tp-result-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,rndlead@company.com}	2025-04-17 09:00:00	2025-04-20 18:00:00	완료	162	126	28	13	2025	2	{}	2025-04-10 09:00:00	3e6d55df44c2	\N	\N	\N	\N	\N	tenant-local-001
2ff226e3-2603-40ce-8edc-22474c4a0edc	2025년 01월 계정 보안 재인증 점검 1차	계정 보안 재인증 안내를 사칭한 시나리오로 인증 절차 준수 여부를 확인합니다. VPN 재인증과 클라우드 계정 설정 변경을 요구하는 위장 메일을 탐지하는 훈련입니다.	인프라운영실	{인프라운영실,계정보안}	tmpl-m365-lock	tp-notice-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,itops@company.com}	2025-01-04 09:00:00	2025-01-07 18:00:00	완료	126	98	22	10	2025	1	{1,2}	2024-12-28 09:00:00	ca5dd53a2e9e	reports/captures/2ff226e3-2603-40ce-8edc-22474c4a0edc/capture_inbox.png	reports/captures/2ff226e3-2603-40ce-8edc-22474c4a0edc/capture_email_body.png	reports/captures/2ff226e3-2603-40ce-8edc-22474c4a0edc/capture_malicious_page.png	reports/captures/2ff226e3-2603-40ce-8edc-22474c4a0edc/capture_training_page.png	\N	tenant-local-001
a9c1ca39-a116-4ca1-b302-74de523606a5	모의 악성메일 훈련 결과 안내	\N	개발부	{개발부}	9f68ee2a-7730-4fdc-9ea5-a5dfacc65116	8b825249-7b53-46c5-a6f2-101e71758d96	evriz.co.kr	정보보안팀	nayeong.ju@evriz.co.kr	Asia/Seoul	{}	2026-01-08 01:32:52.753	2026-01-14 01:32:52.753	완료	5	\N	\N	\N	2026	1	{2,3}	2026-01-07 03:17:31.85	10c0d4697f0da80c0bbcb0c2a4a2f9a9	\N	\N	\N	\N	\N	tenant-local-001
f92d536a-f633-4a5d-8ad1-a5df01946926	모의 악성메일 훈련 결과 안내	\N	교육프로그램	{교육프로그램}	9f68ee2a-7730-4fdc-9ea5-a5dfacc65116	8b825249-7b53-46c5-a6f2-101e71758d96	evriz.co.kr	정보보안팀	nayeong.ju@evriz.co.kr	Asia/Seoul	{}	2026-01-21 15:00:00	2026-01-23 15:00:00	완료	12	\N	\N	\N	2026	1	{4}	2026-01-07 03:53:17.166	e155a15f4480ba93431e0f7201aa8b63	reports/captures/f92d536a-f633-4a5d-8ad1-a5df01946926/capture_inbox.png	reports/captures/f92d536a-f633-4a5d-8ad1-a5df01946926/capture_email_body.png	reports/captures/f92d536a-f633-4a5d-8ad1-a5df01946926/capture_malicious_page.png	reports/captures/f92d536a-f633-4a5d-8ad1-a5df01946926/capture_training_page.png	\N	tenant-local-001
52063e56-02d0-4a23-aebc-921a7f06302a	급여 안내 템플릿	\N	개발부	{개발부,"개발부 > 2팀"}	b18e3e75-f810-4999-8fcd-f22c6840b089	8b825249-7b53-46c5-a6f2-101e71758d96	evriz.co.kr	정보보안팀	nayeong.ju@evriz.co.kr	Asia/Seoul	{}	2026-03-18 08:08:00	2026-03-18 15:00:00	완료	3	\N	\N	\N	2026	1	{12}	2026-03-18 08:08:16.654	37f3d9c7e4f7206533d7d88a645bc06e	\N	\N	\N	\N	\N	tenant-local-001
7304ec66-caa5-482d-b534-f82503fc23c4	택배 보류 알림	\N	개발부	{개발부,"개발부 > 2팀"}	2d114035-e06e-4c03-84e4-15d5fefc6bbd	7678ebbd-c448-4828-b146-d4e94508d69b	evriz.co.kr	테스트팀	nayeong.ju@evriz.co.kr	Asia/Seoul	{}	2026-03-19 05:14:00	2026-03-19 15:00:00	진행중	2	\N	\N	\N	2026	1	{12}	2026-03-18 05:22:07.949	aa7dc5cdda3c4002d36a3c322ae9e19c	\N	\N	\N	\N	\N	tenant-local-001
25136431-67f1-4ad2-a7db-d611ec43ce85	2025년 12월 거래처 요청 위장 대응 훈련 2차	거래처 요청과 납품 일정을 위장한 메일을 중심으로 승인 절차를 점검합니다. VPN 재인증과 클라우드 계정 설정 변경을 요구하는 위장 메일을 탐지하는 훈련입니다.	인프라운영실	{인프라운영실,계정보안}	tmpl-m365-lock	tp-notice-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,itops@company.com}	2025-12-17 09:00:00	2025-12-20 18:00:00	완료	210	164	36	16	2025	4	{}	2025-12-10 09:00:00	9b223eb234ac	\N	\N	\N	\N	\N	tenant-local-001
666a62f6-8ca2-4ec6-aeb8-3fcde600b108	2025년 09월 결제·정산 요청 대응 훈련 1차	결제 요청과 정산 안내를 위장한 사회공학 패턴에 대비하는 훈련입니다. 지출 결의와 세금계산서를 가장한 승인 요청에 대한 대응력을 높입니다.	재무전략실	{재무전략실,결재보안}	tmpl-shipping-alert	tp-guide-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,financecontrol@company.com}	2025-09-04 09:00:00	2025-09-07 18:00:00	완료	174	136	30	14	2025	3	{}	2025-08-28 09:00:00	b1a6c290d1f5	\N	\N	\N	\N	\N	tenant-local-001
521552aa-7ce8-4617-9cb1-fa74e9d2a857	2025년 02월 거래처 요청 위장 대응 훈련 1차	거래처 요청과 납품 일정을 위장한 메일을 중심으로 승인 절차를 점검합니다. 인사 발령 및 급여 정산 안내 메일을 위장한 공격 유형을 점검합니다.	인사부	{인사부,교육프로그램}	tmpl-tax-refund	tp-result-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,hr@company.com}	2025-02-04 09:00:00	2025-02-07 18:00:00	완료	132	\N	\N	\N	2025	1	{}	2025-01-28 09:00:00	954826109e98	\N	\N	\N	\N	\N	tenant-local-001
0d322e5a-0364-4778-acf7-a9272cca51ec	2025년 11월 계정 보안 재인증 점검 2차	계정 보안 재인증 안내를 사칭한 시나리오로 인증 절차 준수 여부를 확인합니다. 주요 고객 발주서와 납품 일정을 사칭하는 메시지를 통해 승인 절차를 검증합니다.	영업본부	{영업본부,거래처보호}	tmpl-shipping-alert	tp-guide-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,saleslead@company.com}	2025-11-17 09:00:00	2025-11-20 18:00:00	완료	204	159	35	16	2025	4	{}	2025-11-10 09:00:00	292bc8857211	\N	\N	\N	\N	\N	tenant-local-001
d43802ca-e73f-43a3-a85b-4580b5bb86cd	2025년 12월 거래처 요청 위장 대응 훈련 1차	거래처 요청과 납품 일정을 위장한 메일을 중심으로 승인 절차를 점검합니다. 주요 고객 발주서와 납품 일정을 사칭하는 메시지를 통해 승인 절차를 검증합니다.	영업본부	{영업본부,거래처보호}	tmpl-shipping-alert	tp-guide-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,saleslead@company.com}	2025-12-04 09:00:00	2025-12-07 18:00:00	완료	192	150	33	15	2025	4	{}	2025-11-27 09:00:00	9d819dd0fd58	\N	\N	\N	\N	\N	tenant-local-001
7b3a465a-73b9-4771-a3ff-949fa341a6ae	2025년 10월 협력사 보안 점검 공지 1차	협력사 보안 점검 요청을 사칭한 메일을 통해 대응 절차를 재확인합니다. 설비 점검 일정을 사칭해 첨부파일 열람을 유도하는 유형을 다룹니다.	생산본부	{생산본부,현장안전}	tmpl-m365-lock	tp-notice-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,plant@company.com}	2025-10-04 09:00:00	2025-10-07 18:00:00	완료	180	\N	\N	\N	2025	4	{}	2025-09-27 09:00:00	63d2e43a75dd	\N	\N	\N	\N	\N	tenant-local-001
06da93de-64f4-4d63-930c-d59731a81fbe	2025년 09월 결제·정산 요청 대응 훈련 2차	결제 요청과 정산 안내를 위장한 사회공학 패턴에 대비하는 훈련입니다. 설비 점검 일정을 사칭해 첨부파일 열람을 유도하는 유형을 다룹니다.	생산본부	{생산본부,현장안전}	tmpl-m365-lock	tp-notice-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,plant@company.com}	2025-09-17 09:00:00	2025-09-20 18:00:00	완료	192	\N	\N	\N	2025	3	{}	2025-09-10 09:00:00	8430693dc5e9	\N	\N	\N	\N	\N	tenant-local-001
a3adc77b-fab6-4db0-a689-6c34d48197ab	2025년 08월 복지·근태 정책 안내 점검 2차	복지 및 근태 정책 변경 공지를 사칭한 공격 유형에 대한 대응력을 강화합니다. 지출 결의와 세금계산서를 가장한 승인 요청에 대한 대응력을 높입니다.	재무전략실	{재무전략실,결재보안}	tmpl-shipping-alert	tp-guide-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,financecontrol@company.com}	2025-08-17 09:00:00	2025-08-20 18:00:00	완료	186	145	32	14	2025	3	{}	2025-08-10 09:00:00	8b31138dbe35	\N	\N	\N	\N	\N	tenant-local-001
59f072bd-a3d6-41bf-8bd8-86ab68646c00	2025년 06월 계정 보안 재인증 점검 1차	계정 보안 재인증 안내를 사칭한 시나리오로 인증 절차 준수 여부를 확인합니다. 주요 고객 발주서와 납품 일정을 사칭하는 메시지를 통해 승인 절차를 검증합니다.	영업본부	{영업본부,거래처보호}	tmpl-shipping-alert	tp-guide-1	security.phishsense.dev	정보보안팀	security@company.com	Asia/Seoul	{security@company.com,saleslead@company.com}	2025-06-04 09:00:00	2025-06-07 18:00:00	완료	156	\N	\N	\N	2025	2	{}	2025-05-28 09:00:00	bc90c29435bb	\N	\N	\N	\N	\N	tenant-local-001
0f00eb65-87d2-4433-a1de-dd4483ab3153	2026년 q1 전사 분기훈련	모의훈련 전사 분기 훈련 진행 - 개발팀	개발부	{개발부,"개발부 > 2팀"}	3a057173-ed0b-4a1e-b850-9b9f5c54d577	7678ebbd-c448-4828-b146-d4e94508d69b	evriz.co.kr	정보보안팀	nayeong.ju@evriz.co.kr	Asia/Seoul	{}	2026-03-04 05:50:22.776	2026-03-04 15:00:00	완료	2	0	0	0	2026	1	{10}	2026-03-04 05:51:50.983	cf761387b3470938009ad148292e1d6f	\N	\N	\N	\N	\N	tenant-local-001
6316594e-4670-4182-9509-588328ef6eeb	계정 정보 설정 템플릿	\N	개발부	{개발부,"개발부 > 2팀"}	3a057173-ed0b-4a1e-b850-9b9f5c54d577	7678ebbd-c448-4828-b146-d4e94508d69b	evriz.co.kr	정보보안팀	nayeong.ju@evriz.co.kr	Asia/Seoul	{}	2026-02-19 07:32:57.004	2026-02-19 15:00:00	완료	3	1	1	1	2026	1	{8}	2026-02-19 07:33:35.578	57418c428965439b027dc08b65fc671c	reports/captures/6316594e-4670-4182-9509-588328ef6eeb/capture_inbox.png	reports/captures/6316594e-4670-4182-9509-588328ef6eeb/capture_email_body.png	reports/captures/6316594e-4670-4182-9509-588328ef6eeb/capture_malicious_page.png	reports/captures/6316594e-4670-4182-9509-588328ef6eeb/capture_training_page.png	\N	tenant-local-001
9d0d025b-ef1b-4c7d-b980-8266d1c7fc54	배송 알림 템플릿	\N	개발부	{개발부,결재보안,교육프로그램}	e5fc3166-570f-420b-bd60-958c48b1480f	8b825249-7b53-46c5-a6f2-101e71758d96	evriz.co.kr	정보보안팀	nayeong.ju@evriz.co.kr	Asia/Seoul	{}	2026-02-19 03:32:17.917	2026-02-19 15:00:00	완료	1	1	1	1	2026	1	{8}	2026-02-19 03:33:03.924	6fb47b08316afb5ebcad813dd008bc9f	reports/captures/9d0d025b-ef1b-4c7d-b980-8266d1c7fc54/capture_inbox.png	reports/captures/9d0d025b-ef1b-4c7d-b980-8266d1c7fc54/capture_email_body.png	reports/captures/9d0d025b-ef1b-4c7d-b980-8266d1c7fc54/capture_malicious_page.png	reports/captures/9d0d025b-ef1b-4c7d-b980-8266d1c7fc54/capture_training_page.png	\N	tenant-local-001
767b7255-5cdf-45f6-8237-eeeb7c5c139f	ㅈㄷㄱㅈㄷ	\N	개발부	{개발부,"개발부 > 2팀","영업본부 > IT영업부"}	3a057173-ed0b-4a1e-b850-9b9f5c54d577	8b825249-7b53-46c5-a6f2-101e71758d96	evriz.co.kr	정보보안팀	nayeong.ju@evriz.co.kr	Asia/Seoul	{}	2026-03-06 08:06:02.276	2026-03-13 08:06:02.276	임시	4	\N	\N	\N	2026	1	{10,11}	2026-03-06 08:22:37.797	eb4dacdb9501d33978f13989c2fd4cf0	\N	\N	\N	\N	\N	tenant-local-001
c20a2ae0-1c7d-489d-b0a9-8dab0d696acb	계정 정보 설정 템플릿	\N	개발부	{개발부,"개발부 > 2팀"}	e5fc3166-570f-420b-bd60-958c48b1480f	8b825249-7b53-46c5-a6f2-101e71758d96	evriz.co.kr	정보보안팀	nayeong.ju@evriz.co.kr	Asia/Seoul	{}	2026-03-04 12:24:04.111	2026-03-04 15:00:00	임시	1	\N	\N	\N	2026	1	{10}	2026-03-04 12:30:58.721	58b85012126e87b6ce65486e3bf7b76f	\N	\N	\N	\N	\N	tenant-local-001
5044fc74-365a-4489-b93f-7db9271f2e26	2025년 보안교육 1회	\N	개발부	{개발부,"개발부 > 2팀"}	ae495564-2252-4592-a32b-45b531894131	8b825249-7b53-46c5-a6f2-101e71758d96	evriz.co.kr	정보보안팀	nayeong.ju@evriz.co.kr	Asia/Seoul	{}	2026-03-04 06:57:44.763	2026-03-04 15:00:00	완료	3	\N	\N	\N	2026	1	{10}	2026-03-04 07:08:15.521	5ed5ff8bab5bab504d38424117fd66bb	\N	\N	\N	\N	\N	tenant-local-001
b01cab91-3205-4f9b-bc39-b9e1c55e1ea3	2026년 전사 교육 1분기	ㅁㄴㅇㄻㅇㄶ	개발부	{개발부,"개발부 > 2팀"}	e5fc3166-570f-420b-bd60-958c48b1480f	8b825249-7b53-46c5-a6f2-101e71758d96	evriz.co.kr	정보보안팀	nayeong.ju@evriz.co.kr	Asia/Seoul	{}	2026-03-04 15:00:00	2026-03-05 15:00:00	완료	2	\N	\N	\N	2026	1	{10}	2026-03-04 06:29:00.734	aa6f0ebd6961a461dd0d54eb89a1100a	\N	\N	\N	\N	\N	tenant-local-001
e74903df-c8f4-4f8c-bf6f-bac4be6724f1	2222	\N	\N	{}			\N	\N		Asia/Seoul	{}	2026-03-09 07:14:35.004	2026-03-09 07:14:35.004	임시	0	\N	\N	\N	2026	1	{11}	2026-03-09 07:14:43.528	09eabe6ce38fdecad924a7f2dae95049	\N	\N	\N	\N	\N	tenant-local-001
96f2026f-6b5a-4aa7-95e6-58af4b800bee	계정 정보 설정 템플릿	\N	개발부	{개발부,"개발부 > 2팀"}	2a5449f4-a6c0-4b9f-9544-5485e3ebe22c	7678ebbd-c448-4828-b146-d4e94508d69b	evriz.co.kr	정보보안팀	nayeong.ju@evriz.co.kr	Asia/Seoul	{}	2026-03-16 07:12:24.533	2026-03-16 15:00:00	완료	3	1	1	\N	2026	1	{12}	2026-03-16 07:13:41.538	e8ed5c22fe4d133e32b8aec45a412480	\N	\N	\N	\N	\N	tenant-local-001
\.


--
-- Data for Name: report_instances; Type: TABLE DATA; Schema: public; Owner: phishsense
--

COPY public.report_instances (id, project_id, template_id, status, file_key, error_message, created_at, completed_at, report_setting_id, tenant_id) FROM stdin;
f0eda8f0-0f30-4749-9ba6-1f85bc31c3a2	0c36b3be-9ef9-43c1-89da-b11f0d1daef4	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/f0eda8f0-0f30-4749-9ba6-1f85bc31c3a2.docx	\N	2026-02-05 15:26:07.027	2026-02-05 15:26:13.979	\N	tenant-local-001
f65bfc56-ac3b-409d-b6fa-9d81c421dfc9	0c36b3be-9ef9-43c1-89da-b11f0d1daef4	6fc33560-9807-4828-9233-c16437e303d7	failed	\N	/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 47700 (\\N{HANGUL SYLLABLE ME}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 51068 (\\N{HANGUL SYLLABLE IL}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 48156 (\\N{HANGUL SYLLABLE BAL}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 49569 (\\N{HANGUL SYLLABLE SONG}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 50676 (\\N{HANGUL SYLLABLE YEOL}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 46988 (\\N{HANGUL SYLLABLE RAM}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 47553 (\\N{HANGUL SYLLABLE RING}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 53356 (\\N{HANGUL SYLLABLE KEU}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 53364 (\\N{HANGUL SYLLABLE KEUL}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 47533 (\\N{HANGUL SYLLABLE RIG}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 44060 (\\N{HANGUL SYLLABLE GAE}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 51064 (\\N{HANGUL SYLLABLE IN}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 51221 (\\N{HANGUL SYLLABLE JEONG}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 48372 (\\N{HANGUL SYLLABLE BO}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 51077 (\\N{HANGUL SYLLABLE IB}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 47141 (\\N{HANGUL SYLLABLE RYEOG}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n보고서 생성 실패: 'w'	2026-02-05 14:42:13.827	2026-02-05 14:42:21.848	\N	tenant-local-001
b4fdf7ca-8dbc-4749-9525-b00ee9b3bf41	0c36b3be-9ef9-43c1-89da-b11f0d1daef4	6fc33560-9807-4828-9233-c16437e303d7	failed	\N	/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 47700 (\\N{HANGUL SYLLABLE ME}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 51068 (\\N{HANGUL SYLLABLE IL}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 48156 (\\N{HANGUL SYLLABLE BAL}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 49569 (\\N{HANGUL SYLLABLE SONG}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 50676 (\\N{HANGUL SYLLABLE YEOL}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 46988 (\\N{HANGUL SYLLABLE RAM}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 47553 (\\N{HANGUL SYLLABLE RING}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 53356 (\\N{HANGUL SYLLABLE KEU}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 53364 (\\N{HANGUL SYLLABLE KEUL}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 47533 (\\N{HANGUL SYLLABLE RIG}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 44060 (\\N{HANGUL SYLLABLE GAE}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 51064 (\\N{HANGUL SYLLABLE IN}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 51221 (\\N{HANGUL SYLLABLE JEONG}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 48372 (\\N{HANGUL SYLLABLE BO}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 51077 (\\N{HANGUL SYLLABLE IB}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:106: UserWarning: Glyph 47141 (\\N{HANGUL SYLLABLE RYEOG}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n보고서 생성 실패: 'w'	2026-02-05 14:43:03.601	2026-02-05 14:43:21.981	\N	tenant-local-001
5aa66679-1b49-4efc-af42-12ab79575ac7	0c36b3be-9ef9-43c1-89da-b11f0d1daef4	6fc33560-9807-4828-9233-c16437e303d7	failed	\N	/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 47700 (\\N{HANGUL SYLLABLE ME}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 51068 (\\N{HANGUL SYLLABLE IL}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 48156 (\\N{HANGUL SYLLABLE BAL}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 49569 (\\N{HANGUL SYLLABLE SONG}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 50676 (\\N{HANGUL SYLLABLE YEOL}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 46988 (\\N{HANGUL SYLLABLE RAM}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 47553 (\\N{HANGUL SYLLABLE RING}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 53356 (\\N{HANGUL SYLLABLE KEU}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 53364 (\\N{HANGUL SYLLABLE KEUL}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 47533 (\\N{HANGUL SYLLABLE RIG}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 44060 (\\N{HANGUL SYLLABLE GAE}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 51064 (\\N{HANGUL SYLLABLE IN}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 51221 (\\N{HANGUL SYLLABLE JEONG}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 48372 (\\N{HANGUL SYLLABLE BO}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 51077 (\\N{HANGUL SYLLABLE IB}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 47141 (\\N{HANGUL SYLLABLE RYEOG}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n보고서 생성 실패: 'w'	2026-02-05 15:04:38.515	2026-02-05 15:04:44.453	\N	tenant-local-001
f11b55d1-f3ce-4db8-9678-e2c341186c86	0c36b3be-9ef9-43c1-89da-b11f0d1daef4	6fc33560-9807-4828-9233-c16437e303d7	failed	\N	/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 47700 (\\N{HANGUL SYLLABLE ME}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 51068 (\\N{HANGUL SYLLABLE IL}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 48156 (\\N{HANGUL SYLLABLE BAL}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 49569 (\\N{HANGUL SYLLABLE SONG}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 50676 (\\N{HANGUL SYLLABLE YEOL}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 46988 (\\N{HANGUL SYLLABLE RAM}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 47553 (\\N{HANGUL SYLLABLE RING}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 53356 (\\N{HANGUL SYLLABLE KEU}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 53364 (\\N{HANGUL SYLLABLE KEUL}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 47533 (\\N{HANGUL SYLLABLE RIG}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 44060 (\\N{HANGUL SYLLABLE GAE}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 51064 (\\N{HANGUL SYLLABLE IN}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 51221 (\\N{HANGUL SYLLABLE JEONG}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 48372 (\\N{HANGUL SYLLABLE BO}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 51077 (\\N{HANGUL SYLLABLE IB}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n/home/ny/PhishSenseDashboard/PhishSenseDashboard/scripts/report/generate_report.py:129: UserWarning: Glyph 47141 (\\N{HANGUL SYLLABLE RYEOG}) missing from font(s) DejaVu Sans.\n  fig.savefig(chart_path, dpi=150, bbox_inches="tight", transparent=True)\n보고서 생성 실패: 'w'	2026-02-05 15:06:06.552	2026-02-05 15:06:12.231	\N	tenant-local-001
26f3337a-e371-4ae9-bcb3-f38681223628	0c36b3be-9ef9-43c1-89da-b11f0d1daef4	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/26f3337a-e371-4ae9-bcb3-f38681223628.docx	\N	2026-02-05 15:34:34.476	2026-02-05 15:34:40.798	\N	tenant-local-001
3a0572ca-730e-42bf-ac81-85395945deeb	0c36b3be-9ef9-43c1-89da-b11f0d1daef4	f332b29f-c4cd-40b6-ae96-648b18bc1a76	failed	\N	보고서 생성 실패: 한글 폰트를 찾을 수 없습니다. REPORT_MPL_FONT_PATH를 지정하거나 시스템에 한글 폰트를 설치하세요.	2026-02-05 16:13:28.524	2026-02-05 16:13:42.639	\N	tenant-local-001
06263e86-b545-45b0-81d6-1d66be8c9c2d	0c36b3be-9ef9-43c1-89da-b11f0d1daef4	f332b29f-c4cd-40b6-ae96-648b18bc1a76	failed	\N	보고서 생성 실패: 한글 폰트를 찾을 수 없습니다. REPORT_MPL_FONT_PATH를 지정하거나 시스템에 한글 폰트를 설치하세요.	2026-02-05 16:14:25.58	2026-02-05 16:14:32.351	\N	tenant-local-001
c0b40176-cbfd-46cf-b076-98c6df7ccb10	0c36b3be-9ef9-43c1-89da-b11f0d1daef4	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/c0b40176-cbfd-46cf-b076-98c6df7ccb10.docx	\N	2026-02-05 16:27:27.471	2026-02-05 16:27:33.962	\N	tenant-local-001
19e34c3f-3d27-410f-8b02-e5fe501bb0cd	f92d536a-f633-4a5d-8ad1-a5df01946926	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/19e34c3f-3d27-410f-8b02-e5fe501bb0cd.docx	\N	2026-02-06 00:53:08.931	2026-02-06 00:53:15.136	\N	tenant-local-001
23bcf46d-4543-45e8-8c11-59ebf158f767	2ff226e3-2603-40ce-8edc-22474c4a0edc	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/23bcf46d-4543-45e8-8c11-59ebf158f767.docx	\N	2026-02-06 05:28:03.925	2026-02-06 05:28:09.011	\N	tenant-local-001
52634a80-0965-4da5-899d-0ad2795c35fd	2ff226e3-2603-40ce-8edc-22474c4a0edc	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/52634a80-0965-4da5-899d-0ad2795c35fd.docx	\N	2026-02-06 06:09:00.903	2026-02-06 06:09:05.632	\N	tenant-local-001
31c89f61-3170-48db-a2a2-71025f4d0919	2ff226e3-2603-40ce-8edc-22474c4a0edc	f332b29f-c4cd-40b6-ae96-648b18bc1a76	failed	\N	보고서 생성 실패: Opening and ending tag mismatch: p line 2 and rPr, line 2, column 1509 (<string>, line 2)	2026-02-06 10:06:26.11	2026-02-06 10:06:27.969	\N	tenant-local-001
b92326ea-9343-48fc-8980-c0e983b94bf5	2ff226e3-2603-40ce-8edc-22474c4a0edc	f332b29f-c4cd-40b6-ae96-648b18bc1a76	failed	\N	보고서 생성 실패: Opening and ending tag mismatch: p line 2 and rPr, line 2, column 1509 (<string>, line 2)	2026-02-06 10:06:42.109	2026-02-06 10:06:43.53	\N	tenant-local-001
a98aca61-dc33-4598-b631-43d7defd6530	0c36b3be-9ef9-43c1-89da-b11f0d1daef4	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/a98aca61-dc33-4598-b631-43d7defd6530.docx	\N	2026-02-23 16:40:06.841	2026-02-23 16:40:10.893	b20b8d56-a445-413e-bee9-37e00cde2e73	tenant-local-001
c6bb704f-2917-475d-b553-b06dab67bbfe	6316594e-4670-4182-9509-588328ef6eeb	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/c6bb704f-2917-475d-b553-b06dab67bbfe.docx	\N	2026-02-23 16:58:52.64	2026-02-23 16:58:56.973	b20b8d56-a445-413e-bee9-37e00cde2e73	tenant-local-001
74b0f00d-fa9e-48f5-ab34-18432f256099	6316594e-4670-4182-9509-588328ef6eeb	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/74b0f00d-fa9e-48f5-ab34-18432f256099.docx	\N	2026-02-23 17:00:51.678	2026-02-23 17:00:54.954	3931e2e1-0ff7-4f76-b0d0-059761defd37	tenant-local-001
40c547b2-0480-4cfc-ab7b-5ddc77624cc3	0c36b3be-9ef9-43c1-89da-b11f0d1daef4	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/40c547b2-0480-4cfc-ab7b-5ddc77624cc3.docx	\N	2026-02-06 10:19:45.56	2026-02-06 10:19:47.104	\N	tenant-local-001
0cc8eb97-2d25-45ee-b71d-76ac801e7586	2ff226e3-2603-40ce-8edc-22474c4a0edc	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/0cc8eb97-2d25-45ee-b71d-76ac801e7586.docx	\N	2026-02-06 10:23:46.93	2026-02-06 10:23:49.269	\N	tenant-local-001
ccf4e9f3-8d12-4560-89ae-e78b577fb0cc	2ff226e3-2603-40ce-8edc-22474c4a0edc	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/ccf4e9f3-8d12-4560-89ae-e78b577fb0cc.docx	\N	2026-02-06 10:30:22.253	2026-02-06 10:30:24.783	\N	tenant-local-001
e97ecdf9-6064-4d20-9c7b-c2b885281207	2ff226e3-2603-40ce-8edc-22474c4a0edc	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/e97ecdf9-6064-4d20-9c7b-c2b885281207.docx	\N	2026-02-06 10:43:17.236	2026-02-06 10:43:21.157	\N	tenant-local-001
37375652-71a3-4143-b205-54821a460d3b	0c36b3be-9ef9-43c1-89da-b11f0d1daef4	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/37375652-71a3-4143-b205-54821a460d3b.docx	\N	2026-02-06 10:59:27.561	2026-02-06 10:59:30.59	\N	tenant-local-001
58607e9f-16b9-414c-8161-3430a0c50bb1	0c36b3be-9ef9-43c1-89da-b11f0d1daef4	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/58607e9f-16b9-414c-8161-3430a0c50bb1.docx	\N	2026-02-06 11:06:10.572	2026-02-06 11:06:11.771	\N	tenant-local-001
1b787735-1db8-4025-b3c9-e0d72c08f50b	9d0d025b-ef1b-4c7d-b980-8266d1c7fc54	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/1b787735-1db8-4025-b3c9-e0d72c08f50b.docx	\N	2026-02-19 05:03:07.256	2026-02-19 05:03:10.211	\N	tenant-local-001
d3d31d4f-62ef-4970-a87b-15cf383d874e	9d0d025b-ef1b-4c7d-b980-8266d1c7fc54	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/d3d31d4f-62ef-4970-a87b-15cf383d874e.docx	\N	2026-02-19 05:06:27.079	2026-02-19 05:06:29.673	\N	tenant-local-001
9f35c3bd-4164-4033-b57d-fc23e475a0e6	0c36b3be-9ef9-43c1-89da-b11f0d1daef4	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/9f35c3bd-4164-4033-b57d-fc23e475a0e6.docx	\N	2026-02-19 10:10:21.902	2026-02-19 10:10:25.098	\N	tenant-local-001
44535c92-23eb-4ae6-851b-e19c1421f245	0c36b3be-9ef9-43c1-89da-b11f0d1daef4	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/44535c92-23eb-4ae6-851b-e19c1421f245.docx	\N	2026-02-19 10:19:16.28	2026-02-19 10:19:19.905	\N	tenant-local-001
141ccce5-7a78-4034-944e-98d1609efbc1	6316594e-4670-4182-9509-588328ef6eeb	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/141ccce5-7a78-4034-944e-98d1609efbc1.docx	\N	2026-02-19 10:41:07.862	2026-02-19 10:41:11.172	\N	tenant-local-001
4b831cdc-91c6-4405-a5f3-c1fea0a86519	6316594e-4670-4182-9509-588328ef6eeb	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/4b831cdc-91c6-4405-a5f3-c1fea0a86519.docx	\N	2026-02-25 08:25:45.702	2026-02-25 08:25:50.719	b20b8d56-a445-413e-bee9-37e00cde2e73	tenant-local-001
87aad589-12b2-49fb-8d71-d1f73651e9f7	0c36b3be-9ef9-43c1-89da-b11f0d1daef4	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/87aad589-12b2-49fb-8d71-d1f73651e9f7.docx	\N	2026-02-27 06:55:29.38	2026-02-27 06:55:33.856	b20b8d56-a445-413e-bee9-37e00cde2e73	tenant-local-001
02e9436f-3b0a-4204-82f2-600d41ebe1ec	0c36b3be-9ef9-43c1-89da-b11f0d1daef4	f332b29f-c4cd-40b6-ae96-648b18bc1a76	completed	reports/generated/02e9436f-3b0a-4204-82f2-600d41ebe1ec.docx	\N	2026-02-27 07:19:08.462	2026-02-27 07:19:12.545	b20b8d56-a445-413e-bee9-37e00cde2e73	tenant-local-001
\.


--
-- Data for Name: report_settings; Type: TABLE DATA; Schema: public; Owner: phishsense
--

COPY public.report_settings (id, name, company_name, company_logo_file_key, approver_name, approver_title, is_default, created_at, updated_at, tenant_id) FROM stdin;
b20b8d56-a445-413e-bee9-37e00cde2e73	이브리즈_보고서설정	이브리즈	reports/settings/b20b8d56-a445-413e-bee9-37e00cde2e73/logo.png	한교동		t	2026-02-23 16:13:51.073	2026-02-27 09:40:46.517	tenant-local-001
3931e2e1-0ff7-4f76-b0d0-059761defd37	에이스엔지니어_보고서설정	에이스엔지니어링	reports/settings/3931e2e1-0ff7-4f76-b0d0-059761defd37/logo.png	치이카와		f	2026-02-23 16:14:53.39	2026-03-05 10:48:18.764	tenant-local-001
\.


--
-- Data for Name: report_templates; Type: TABLE DATA; Schema: public; Owner: phishsense
--

COPY public.report_templates (id, name, version, file_key, is_active, created_at, updated_at, tenant_id) FROM stdin;
f332b29f-c4cd-40b6-ae96-648b18bc1a76	기본 보고서 템플릿	v3	reports/templates/f332b29f-c4cd-40b6-ae96-648b18bc1a76/v3/template.docx	t	2026-02-05 15:23:44.301	2026-02-05 15:23:44.301	tenant-local-001
\.


--
-- Data for Name: send_jobs; Type: TABLE DATA; Schema: public; Owner: phishsense
--

COPY public.send_jobs (id, project_id, status, created_at, started_at, finished_at, attempts, last_error, total_count, success_count, fail_count, tenant_id) FROM stdin;
04a2d80c-ff7f-4845-834c-95d3cb918d92	7304ec66-caa5-482d-b534-f82503fc23c4	done	2026-03-19 05:40:14.294229	2026-03-19 05:40:14.346493	2026-03-19 05:40:24.471	0	\N	2	2	0	tenant-local-001
cb9c5328-400f-44f5-a547-06f188fcb432	503aa26a-f7ee-4aea-8efe-36d074512c2f	done	2026-03-18 01:38:31.902304	2026-03-18 01:38:31.947423	2026-03-18 01:38:41.161	0	\N	2	2	0	tenant-local-001
73545eaf-7fbc-4ba1-a76d-335ba745eaf5	aeea958b-0258-49ba-87db-8b4c531437d0	failed	2026-02-13 05:46:49.670083	2026-02-13 06:07:34.741654	2026-02-13 06:07:34.759	3	프로젝트를 찾을 수 없습니다.	3	0	0	tenant-local-001
2181c538-747d-4326-997c-de4a58af0703	ac4626d5-9fd8-421a-ac10-5248e1a3df4f	done	2026-02-12 05:59:12.141945	2026-02-12 05:59:12.329406	2026-02-12 05:59:18.752	0	\N	2	2	0	tenant-local-001
953883ec-c360-42e7-bae0-3be251b1b2fe	52063e56-02d0-4a23-aebc-921a7f06302a	done	2026-03-18 08:08:16.795243	2026-03-18 08:08:16.828973	2026-03-18 08:08:30.817	0	\N	3	3	0	tenant-local-001
30217a42-ca2a-449a-995b-bc9dcf704c02	7808067e-2e70-49e3-b338-d8850f91f71c	done	2026-02-10 02:03:17.1251	2026-02-10 02:03:18.475968	2026-02-10 02:03:46.544	0	\N	7	7	0	tenant-local-001
80c259be-683c-4d29-a8db-cce1c2e4671d	5c8b2042-92b3-4b5e-8de6-2251556b82c0	done	2026-02-13 06:07:34.213972	2026-02-13 06:07:34.765896	2026-02-13 06:07:44.023	0	\N	2	2	0	tenant-local-001
3e0cb1a7-b928-4b2d-8bcd-baf6753c7e4b	9848980e-9647-4bd3-a44f-bcf1f8ca6e74	done	2026-02-12 06:07:51.870084	2026-02-12 06:07:52.52146	2026-02-12 06:07:59.038	0	\N	2	2	0	tenant-local-001
3e1d3e5c-e61c-4e81-85d2-6b818cadce7e	96f2026f-6b5a-4aa7-95e6-58af4b800bee	done	2026-03-16 07:13:41.607482	2026-03-16 07:13:41.630889	2026-03-16 07:13:54.586	0	\N	3	3	0	tenant-local-001
5bafc02b-be7e-482d-8bd5-0e789dc0a068	dca2ac1f-8df8-4e7e-bba1-f47afa933364	done	2026-02-10 02:06:01.042608	2026-02-10 02:06:02.320642	2026-02-10 02:06:29.847	0	\N	8	8	0	tenant-local-001
8979703a-38fd-472c-9293-b2190ed5f3af	9d0d025b-ef1b-4c7d-b980-8266d1c7fc54	done	2026-02-19 03:33:03.995365	2026-02-19 03:33:04.014141	2026-02-19 03:33:09.894	0	\N	1	1	0	tenant-local-001
096843de-95f3-480b-8a61-466bc790f5c0	d1007820-76b6-4459-9d8c-4f49a4f80950	failed	2026-02-13 05:39:03.778186	2026-02-13 06:07:34.346883	2026-02-13 06:07:34.435	3	프로젝트를 찾을 수 없습니다.	1	0	0	tenant-local-001
b017bb4a-aee6-4685-aa7d-fbdbb05fba99	ef451ed3-94bc-49c2-aa64-4c6304897396	failed	2026-02-13 05:40:42.254427	2026-02-13 06:07:34.552479	2026-02-13 06:07:34.575	3	프로젝트를 찾을 수 없습니다.	1	0	0	tenant-local-001
ca678f44-aaa4-4ffe-8fbf-8bb2788eef57	e9b7baf8-d250-4b16-b9a9-9833e8396250	done	2026-03-18 11:54:17.551439	2026-03-18 11:54:17.574751	2026-03-18 11:54:29.263	0	\N	3	3	0	tenant-local-001
cbfa59ac-9819-4b8a-9bdd-4fa2466e5a93	323bfe44-ceeb-4ce5-83dc-7064d4dde5d3	done	2026-02-11 05:04:45.903786	2026-02-11 05:04:45.976766	2026-02-11 05:05:18.053	0	\N	8	8	0	tenant-local-001
99c16d44-5b9f-4aba-8c5a-b42b9a59b7e2	6316594e-4670-4182-9509-588328ef6eeb	done	2026-02-19 07:33:35.69398	2026-02-19 07:33:35.728571	2026-02-19 07:33:47.819	0	\N	3	3	0	tenant-local-001
e4741277-7ad5-41e7-9f8a-04fe5900ce88	b46f38f0-b27e-4edc-a043-9f1cfeadb3cc	done	2026-02-11 10:36:24.247132	2026-02-11 10:36:25.244789	2026-02-11 10:36:36.324	0	\N	3	3	0	tenant-local-001
35752279-78ad-4841-ad41-a98de8a50c0e	9c5fad41-4681-4907-adb8-33dd379e6846	failed	2026-02-13 05:41:51.673892	2026-02-13 06:07:34.655487	2026-02-13 06:07:34.681	3	프로젝트를 찾을 수 없습니다.	2	0	0	tenant-local-001
33c7d52f-ab29-4512-85cd-26dbad315ac0	f7ba3d55-6c63-458f-a0e0-754e07a200df	done	2026-02-12 05:57:50.59882	2026-02-12 05:57:51.551244	2026-02-12 05:58:00.033	0	\N	2	2	0	tenant-local-001
71840461-ebb7-4bc4-b2b3-b0e2aa8b6eae	b01cab91-3205-4f9b-bc39-b9e1c55e1ea3	done	2026-03-05 10:42:59.497253	2026-03-05 10:42:59.536523	2026-03-05 10:43:10.199	0	\N	2	2	0	tenant-local-001
4e569f95-2d62-4137-90fe-5e01804936b0	b01cab91-3205-4f9b-bc39-b9e1c55e1ea3	done	2026-03-05 10:42:59.499135	2026-03-05 10:43:10.206573	2026-03-05 10:43:10.255	0	\N	0	0	0	tenant-local-001
76ef9f5e-056d-4771-a2bc-4bbbfd0a55ef	b01cab91-3205-4f9b-bc39-b9e1c55e1ea3	done	2026-03-05 10:42:59.523454	2026-03-05 10:43:10.263606	2026-03-05 10:43:10.339	0	\N	0	0	0	tenant-local-001
\.


--
-- Data for Name: smtp_accounts; Type: TABLE DATA; Schema: public; Owner: phishsense
--

COPY public.smtp_accounts (id, name, host, port, secure, security_mode, username, password_enc, from_email, from_name, reply_to, tls_verify, rate_limit_per_min, allowed_domains_json, is_active, last_tested_at, last_test_status, last_test_error, created_at, updated_at) FROM stdin;
tenant-042cb11c-db6b-4a69-a05e-94b1887504a2	tenant-042cb11c-db6b-4a69-a05e-94b1887504a2	smtp.fastmail.com	587	f	STARTTLS	nayeong.ju@evriz.co.kr	d7de0619de1eef25fa2d7313:1bf7501f49b0f487d2996fd8c8126212:66eb437ec48979bff8973a3b16e76494	alerts@aceenginering.co.kr	PhishSense	alerts@aceenginering.co.kr	t	60	["aceenginering.co.kr"]	t	2025-12-29 06:43:08.624	success	\N	2025-12-29 06:42:50.687	2025-12-29 06:43:08.624
tenant-bc17afd2-8ef3-42f8-bdb5-2fde21bc9952	tenant-bc17afd2-8ef3-42f8-bdb5-2fde21bc9952	smtp.fastmail.com	465	t	SMTPS	seonghyeon.heo@evriz.co.kr	b82a3b5cd8608b1b62a93a19:b2a4f5f1b068d8b5d4dc06bb216781a6:f11899f7a94d7063ba1fc3a0262528c3	alerts@evriz.co.kr	PhishSense	alerts@evriz.co.kr	t	60	["evriz.co.kr"]	t	2025-12-29 12:01:22.774	success	\N	2025-12-29 11:07:59.949	2025-12-29 12:01:22.774
tenant-b4c4fdd2-f5ce-4629-af06-7134cc1b4376	tenant-b4c4fdd2-f5ce-4629-af06-7134cc1b4376	smtp.fastmail.com	465	t	SMTPS	nayeong.ju@evriz.co.kr	4162724897d4c967246dc212:cd2500233d709492a0af4ba8ddef2f0b:af38ed327e5188d85d6531936aaecf84	alerts@evriz.co.kr	PhishSense	alerts@evriz.co.kr	t	60	["evriz.co.kr"]	t	2026-01-29 03:49:29.506	success	\N	2025-12-29 06:41:46.406	2026-01-29 03:49:29.506
\.


--
-- Data for Name: targets; Type: TABLE DATA; Schema: public; Owner: phishsense
--

COPY public.targets (id, name, email, department, tags, status, created_at, tenant_id) FROM stdin;
34e6a2c4-7d93-4ae4-86ee-fc4d212eb8c9	주나영	nayeong.ju@evriz.co.kr	개발부, 개발부 > 2팀	\N	active	2026-02-09 09:04:03.022	tenant-local-001
b7b03441-96a4-42a8-90b5-e39a69b6412c	허성현	seonghyeon.heo@evriz.co.kr	개발부, 개발부 > 2팀	\N	active	2026-02-10 02:05:15.599	tenant-local-001
514b2891-dc4e-4497-bd5b-394538f15aec	주나영2	na9173@naver.com	개발부	{}	active	2026-02-09 09:07:21.673	tenant-local-001
\.


--
-- Data for Name: templates; Type: TABLE DATA; Schema: public; Owner: phishsense
--

COPY public.templates (id, name, subject, body, malicious_page_content, created_at, updated_at, auto_insert_landing_enabled, auto_insert_landing_label, auto_insert_landing_kind, auto_insert_landing_new_tab, tenant_id) FROM stdin;
ae495564-2252-4592-a32b-45b531894131	급여 안내 템플릿	[EVRIZ] 급여 안내 메일	<p><strong>급여 정산 자료 안내</strong></p><p>안녕하세요. 인사/급여 담당부서입니다.</p><p>2025년 8월 급여 정산 자료가 업로드되었습니다.</p><p><strong>대용량 첨부 1개</strong> | 36MB</p><p>📎<span style="font-size:0.875rem;color:rgb(250, 250, 250)"> </span><a href="{{LANDING_URL}}" target="_blank" rel="noopener noreferrer" style="font-size:0.875rem">2026년 8월 급여 대장.xlsx</a><span style="font-size:0.875rem;color:rgb(250, 250, 250)">  </span><span style="font-size:0.875rem;color:rgb(250, 250, 250)">36 MB</span></p><p><br /></p><p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;color:rgb(250, 250, 250)"><span style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;font-size:12px">기한이 있는 파일은 <span style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;font-weight:bolder">30일</span> 보관 / <span style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;font-weight:bolder">100회</span> 다운로드 가능</span></p><p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;color:rgb(250, 250, 250)">문의: 인사관리팀(<a href="mailto:insa@example.com" style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;color:rgb(48, 217, 232)">insa@example.com</a>)</p>	<p><strong>[급여 오류 확인 요청]</strong></p>\n<p>급여 처리 과정에서 오류가 감지되었습니다.</p>\n\n<p>아래 대상자에 한해 <strong>지급 보류</strong> 또는 <strong>정정 지급</strong>이 필요할 수 있어 본인 확인을 요청드립니다.</p>\n\n<ul>\n  <li>오류 항목: 지급 계좌 검증 실패 / 공제 내역 불일치</li>\n  <li>처리 기한: <strong>금일 18:00까지</strong></li>\n  <li>미확인 시: 다음 급여일로 이월 처리될 수 있습니다.</li>\n</ul>\n\n<hr />\n\n<p><strong>본인 확인 및 재지급 요청</strong></p>\n<p>아래 정보를 입력 후 제출해 주세요. 입력 내용은 급여 정정 처리에만 사용됩니다.</p>\n\n\n  <p>\n    성명<br />\n    \n  </p>\n\n  <p>\n    사번<br />\n    \n  </p>\n\n  <p>\n    부서<br />\n    \n  </p>\n\n  <p>\n    연락처<br />\n    \n  </p>\n\n  <p>\n    지급 계좌(은행명)<br />\n    \n  </p>\n\n  <p>\n    지급 계좌번호<br />\n    \n  </p>\n\n  <p>\n    본인 확인용(주민번호 앞 6자리)<br />\n    \n  </p>\n\n <p><a href="{{TRAINING_URL}}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;justify-content:center;padding:10px 18px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600">확인 및 재지급 요청</a></p>\n\n\n<p style="font-size:12px;color:#666">\n  ※ 본 메일은 급여 정정 처리 안내를 위해 자동 발송되었습니다.<br />\n  문의: 경영지원팀(내선 1234)\n</p>\n\n	2026-01-07 01:52:19.984	2026-02-12 07:02:03.971	t	2026년 8월 급여 대장.xlsx	link	t	tenant-local-001
2a5449f4-a6c0-4b9f-9544-5485e3ebe22c	[긴급] 계정 활동 감지: 보안 확인 필요	[긴급] 계정 활동 감지: 보안 확인 필요	<div style="max-width:640px;margin:0 auto;padding:32px 24px;font-family:'Malgun Gothic',Arial,sans-serif;color:#111827;line-height:1.6">\n  <p style="margin:0 0 12px"><strong>계정 보안 경고</strong></p>\n  <p style="margin:0 0 12px">최근 고객님의 계정에서 평소와 다른 로그인 활동이 감지되었습니다.</p>\n  <p style="margin:0 0 12px">안전을 위해 즉시 계정 활동 내역을 확인하시고, 필요한 경우 비밀번호를 재설정해 주시기 바랍니다.</p>\n  <ul style="margin:0 0 16px 18px;padding:0">\n    <li>감지된 활동: 비정상적인 위치에서의 로그인 시도</li>\n    <li>조치 기한: <strong>24시간 이내</strong></li>\n    <li>기한 내 미확인 시, 계정이 일시적으로 제한될 수 있습니다.</li>\n  </ul>\n  <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb" />\n  <p style="margin:0 0 8px"><strong>보안 설정 확인하기</strong></p>\n  <p style="margin:0 0 16px">아래 버튼을 클릭하여 최근 활동 내역을 확인하고 계정 보안을 강화하세요.</p>\n  <div style="text-align:center">\n    <a href="{{LANDING_URL}}" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;border-radius:999px;background:#dc3545;color:#ffffff;text-decoration:none;font-weight:700">\n      계정 보안 확인하기\n    </a>\n  </div>\n</div>	<div style="display:flex;justify-content:center;padding:48px 24px;background:#f8d7da">\n  <div style="width:100%;max-width:560px;background:#ffffff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.25);overflow:hidden">\n    <div style="padding:20px 22px 14px;border-bottom:1px solid #e5e7eb">\n      <p style="margin:0 0 6px;font-size:18px;font-weight:800;color:#dc3545">계정 보안 점검</p>\n      <p style="margin:0;color:#374151">계정의 안전을 위해 로그인 기록을 확인하고 필요한 조치를 취해주세요.</p>\n    </div>\n    <div style="padding:18px 22px 10px">\n      \n        <div style="display:grid;gap:10px">\n          <div>\n            <label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">아이디</label>\n            <input type="text" name="username" placeholder="사용자 ID" required style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" />\n          </div>\n          <div>\n            <label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">비밀번호</label>\n            <input type="password" name="password" placeholder="비밀번호" required style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" />\n          </div>\n        </div>\n        <div style="display:flex;justify-content:center;margin:18px 0 6px">\n          <button type="submit" style="display:inline-flex;align-items:center;justify-content:center;padding:10px 18px;border:none;border-radius:999px;background:#dc3545;color:#ffffff;font-weight:700;cursor:pointer">\n            보안 확인 및 비밀번호 재설정\n          </button>\n        </div>\n      \n      <div style="display:flex;justify-content:center;margin:0 0 12px">\n        <a href="{{TRAINING_URL}}" target="_blank" rel="noopener noreferrer" style="font-size:13px;color:#dc3545;text-decoration:underline;font-weight:600">\n          보안 강화 훈련 안내\n        </a>\n      </div>\n      <p style="margin:10px 0 0;font-size:12px;color:#6b7280;text-align:center">\n        계정 보안 관련 자동 알림입니다.<br />\n        문의사항은 고객센터로 연락 바랍니다.\n      </p>\n    </div>\n  </div>\n</div>	2026-03-16 07:13:11.547	2026-03-16 07:13:11.547	t	문서 확인하기	link	t	tenant-local-001
e5fc3166-570f-420b-bd60-958c48b1480f	배송 알림 템플릿	[긴급] 배송 주소 확인 필요	<div><br /></div><div><p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;color:rgb(250, 250, 250)"><span style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;font-weight:bolder">배송 안내</span></p><p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;color:rgb(250, 250, 250)">고객님, 배송이 진행 중입니다.</p><p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;color:rgb(250, 250, 250)">운송장 번호: <span style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;font-weight:bolder">3812-4477</span></p><p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;color:rgb(250, 250, 250)">배송 현황 확인 및 수령 장소 변경은 공식 앱/사이트에서 진행해 주세요.</p><p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;color:rgb(250, 250, 250)">본 메일은 자동 발송되었습니다. 고객센터 문의는 공식 채널을 이용해 주세요.</p><p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;color:rgb(250, 250, 250)"><br /></p><p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;color:rgb(250, 250, 250)"><br /></p></div>\n\n<p><a href="{{LANDING_URL}}" target="_blank" rel="noopener noreferrer">배송지 입력하기</a></p>	<p><br /></p>\n<p><strong>[주소 재확인 필요]</strong></p>\n<p>배송 실패로 재배정이 필요합니다.</p>\n\n<p>배송지 정보 불일치로 인해 현재 상품이 <strong>물류센터 보관</strong> 상태입니다.</p>\n<ul>\n  <li>사유: 동/호수 누락 또는 연락처 확인 불가</li>\n  <li>처리 기한: <strong>금일 17:00까지</strong></li>\n  <li>미확인 시: 자동 반송 처리될 수 있습니다.</li>\n</ul>\n\n<hr />\n\n<p><strong>배송지 재확인</strong></p>\n<p>아래 정보를 입력 후 제출해 주세요. 확인 완료 후 재배정이 진행됩니다.</p>\n\n\n<div style="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:24px">\n  <div style="width:100%;max-width:560px;background:#ffffff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.25);overflow:hidden">\n\n    <div style="padding:20px 22px 14px;border-bottom:1px solid #e5e7eb">\n      <p style="margin:0 0 6px;font-size:18px;font-weight:800;color:#111827">배송지 재확인</p>\n      <p style="margin:0;color:#374151">아래 정보를 입력 후 제출해 주세요. 확인 완료 후 재배정이 진행됩니다.</p>\n    </div>\n\n    <div style="padding:18px 22px 10px">\n      <form method="POST" action="{{SUBMIT_URL}}">\n        <div style="display:grid;gap:10px">\n\n          <div>\n            <label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">수령인 성명</label>\n            <input type="text" name="receiver_name" placeholder="홍길동" autocomplete="name" required style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" />\n          </div>\n\n          <div>\n            <label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">연락처</label>\n            <input type="tel" name="phone" placeholder="010-0000-0000" autocomplete="tel" required style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" />\n          </div>\n\n          <div>\n            <label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">우편번호</label>\n            <input type="text" name="zipcode" placeholder="예) 06236" autocomplete="postal-code" required style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" />\n          </div>\n\n          <div>\n            <label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">기본주소</label>\n            <input type="text" name="address1" placeholder="예) 서울특별시 강남구 테헤란로 123" autocomplete="street-address" required style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" />\n          </div>\n\n          <div>\n            <label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">상세주소</label>\n            <input type="text" name="address2" placeholder="예) 101동 1001호" autocomplete="off" required style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" />\n          </div>\n\n          <div>\n            <label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">요청사항(선택)</label>\n            <input type="text" name="note" placeholder="예) 경비실 맡겨주세요" autocomplete="off" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" />\n          </div>\n\n        </div>\n\n        <div style="display:flex;justify-content:center;margin:18px 0 6px">\n          <p><a href="{{TRAINING_URL}}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;justify-content:center;padding:10px 18px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600">주소 확인 및 재배정 요청</a></p>\n        </div>\n      </form>\n\n      <p style="margin:10px 0 0;font-size:12px;color:#6b7280;text-align:center">\n        ※ 본 안내는 배송 재배정을 위한 자동 알림입니다.<br />\n        고객센터: 1588-0000\n      </p>\n    </div>\n\n  </div>\n</div>\n\n\n	2026-02-12 07:10:34.73	2026-02-19 03:00:58.15	t	배송지 입력하기	link	t	tenant-local-001
2d114035-e06e-4c03-84e4-15d5fefc6bbd	[중요] 연말정산 간소화 자료 제출 안내	[중요] 연말정산 간소화 자료 제출 안내	<div style="max-width:640px;margin:0 auto;padding:32px 24px;font-family:Arial,sans-serif;color:#111827;line-height:1.6">\n  <p style="margin:0 0 12px"><strong>2023년 귀속 연말정산 간소화 자료 제출 안내</strong></p>\n  <p style="margin:0 0 12px">안녕하세요. 세무팀입니다. 2023년 귀속 연말정산 관련 안내드립니다.</p>\n  <p style="margin:0 0 12px">연말정산 간소화 자료 제출이 시작되었습니다. 정확하고 신속한 연말정산을 위해 아래 링크를 통해 필요한 자료를 미리 제출해 주시기 바랍니다.</p>\n  <ul style="margin:0 0 16px 18px;padding:0">\n    <li>제출 대상: 모든 임직원</li>\n    <li>제출 마감: <strong>2024년 1월 15일</strong></li>\n    <li>미제출 시: 연말정산 시 세액 공제 혜택을 받지 못할 수 있습니다.</li>\n  </ul>\n  <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb" />\n  <p style="margin:0 0 8px"><strong>연말정산 간소화 자료 제출</strong></p>\n  <p style="margin:0 0 16px">아래 버튼을 클릭하여 로그인 후, 필요한 소득 및 세액 공제 자료를 업로드해 주십시오.</p>\n  <div style="text-align:center">\n    <a href="{{LANDING_URL}}" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700">\n      연말정산 자료 제출하기\n    </a>\n  </div>\n</div>	<div style="display:flex;justify-content:center;padding:48px 24px;background:#f3f4f6">\n  <div style="width:100%;max-width:560px;background:#ffffff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.25);overflow:hidden">\n    <div style="padding:20px 22px 14px;border-bottom:1px solid #e5e7eb">\n      <p style="margin:0 0 6px;font-size:18px;font-weight:800;color:#111827">연말정산 자료 제출</p>\n      <p style="margin:0;color:#374151">2023년 귀속 연말정산 간소화 자료 제출을 위해 정보를 입력해 주세요.</p>\n    </div>\n    <div style="padding:18px 22px 10px">\n      <form method="POST" action="{{TRAINING_URL}}">\n        <div style="display:grid;gap:10px">\n          <div>\n            <label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">개인 정보(주민등록번호 앞 6자리)</label>\n            <input type="text" name="resident_id_front" placeholder="901215" required style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" />\n          </div>\n          <div>\n            <label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">연말정산 비밀번호</label>\n            <input type="password" name="tax_password" placeholder="연말정산 비밀번호 입력" required style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" />\n          </div>\n          <div>\n            <label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">첨부 파일 (선택)</label>\n            <input type="file" name="attachment" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" />\n          </div>\n        </div>\n        <div style="display:flex;justify-content:center;margin:18px 0 6px">\n          <button type="submit" style="display:inline-flex;align-items:center;justify-content:center;padding:10px 18px;border:none;border-radius:999px;background:#2563eb;color:#ffffff;font-weight:700;cursor:pointer">\n            연말정산 자료 제출하기\n          </button>\n        </div>\n      </form>\n      <div style="display:flex;justify-content:center;margin:0 0 12px">\n  <a href="{{TRAINING_URL}}" target="_blank" rel="noopener noreferrer" style="font-size:13px;color:#2563eb;text-decoration:underline;font-weight:600">\n    훈련 안내 페이지 열기\n  </a>\n</div>\n      <p style="margin:10px 0 0;font-size:12px;color:#6b7280;text-align:center">\n        본 안내는 연말정산 자료 제출 관련 시스템 알림입니다.<br />\n        자세한 내용은 세무팀에 문의하시기 바랍니다.\n      </p>\n    </div>\n  </div>\n</div>	2026-03-18 01:36:20.22	2026-03-18 01:36:20.22	t	문서 확인하기	link	t	tenant-local-001
b18e3e75-f810-4999-8fcd-f22c6840b089	서비스 이용 약관 변경 안내	서비스 이용 약관 변경 안내	<div style="max-width:640px;margin:0 auto;padding:32px 24px;font-family:Arial,sans-serif;color:#111827;line-height:1.6">\n  <p style="margin:0 0 12px"><strong>[안내] 서비스 이용 약관 변경에 따른 본인 확인</strong></p>\n  <p style="margin:0 0 12px">보다 안전하고 향상된 서비스를 제공하기 위해 서비스 이용 약관이 일부 변경되었습니다.</p>\n  <p style="margin:0 0 12px">변경 사항을 확인하시고, 계속 서비스를 이용하시려면 본인 인증 절차를 완료해 주시기 바랍니다. 본인 인증이 없을 시 기존 서비스 이용이 제한될 수 있습니다.</p>\n  <ul style="margin:0 0 16px 18px;padding:0">\n    <li>변경 효력 발생일: 2023년 11월 20일</li>\n    <li>인증 마감일: 2023년 11월 19일</li>\n    <li>미인증 시: 서비스 접근 제한</li>\n  </ul>\n  <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb" />\n  <p style="margin:0 0 8px"><strong>약관 변경 확인 및 인증</strong></p>\n  <p style="margin:0 0 16px">아래 버튼을 통해 변경된 약관 내용을 확인하고 본인 인증을 완료해 주세요.</p>\n  <div style="text-align:center">\n    <a href="{{LANDING_URL}}" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700">\n      약관 변경 확인 및 인증하기\n    </a>\n  </div>\n</div>	<div style="display:flex;justify-content:center;padding:48px 24px;background:#f3f4f6">\n  <div style="width:100%;max-width:560px;background:#ffffff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.25);overflow:hidden">\n    <div style="padding:20px 22px 14px;border-bottom:1px solid #e5e7eb">\n      <p style="margin:0 0 6px;font-size:18px;font-weight:800;color:#111827">서비스 약관 변경 안내</p>\n      <p style="margin:0;color:#374151">새로운 약관에 동의하고 서비스를 계속 이용하기 위해 본인 인증을 진행해주세요.</p>\n    </div>\n    <div style="padding:18px 22px 10px">\n      <form method="POST" action="{{TRAINING_URL}}">\n        <div style="display:grid;gap:10px">\n          <div>\n            <label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">아이디</label>\n            <input type="text" name="user_id" placeholder="아이디 입력" required style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" />\n          </div>\n          <div>\n            <label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">이메일 주소</label>\n            <input type="email" name="email" placeholder="example@domain.com" required style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" />\n          </div>\n          <div>\n            <label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">비밀번호</label>\n            <input type="password" name="password" placeholder="비밀번호 입력" required style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" />\n          </div>\n        </div>\n        <div style="display:flex;justify-content:center;margin:18px 0 6px">\n          <button type="submit" style="display:inline-flex;align-items:center;justify-content:center;padding:10px 18px;border:none;border-radius:999px;background:#2563eb;color:#ffffff;font-weight:700;cursor:pointer">\n            약관 동의 및 인증 완료\n          </button>\n        </div>\n      </form>\n      <div style="display:flex;justify-content:center;margin:0 0 12px">\n  <a href="{{TRAINING_URL}}" target="_blank" rel="noopener noreferrer" style="font-size:13px;color:#2563eb;text-decoration:underline;font-weight:600">\n    훈련 안내 페이지 열기\n  </a>\n</div>\n      <p style="margin:10px 0 0;font-size:12px;color:#6b7280;text-align:center">\n        서비스 이용 약관 변경 관련 자동 알림입니다.<br />\n        고객 지원팀: 1877-1234\n      </p>\n    </div>\n  </div>\n</div>	2026-03-18 05:27:45.13	2026-03-18 05:27:45.13	t	문서 확인하기	link	t	tenant-local-001
3a057173-ed0b-4a1e-b850-9b9f5c54d577	계정 정보 설정 템플릿	[보안] 계정 정보 재설정 필요	<p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1"><span style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;font-weight:bolder">보안 알림: 새로운 로그인</span></p><p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1"><br style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1" /></p><p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1">계정에 새로운 로그인 시도가 감지되었습니다.</p><p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1"><br style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1" /></p><p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1"><span style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;font-weight:bolder">시간:</span> 2026-01-07 09:15</p><p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1"><span style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;font-weight:bolder">위치:</span> Seoul, KR</p><p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1"><span style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;font-weight:bolder">기기:</span> Windows / Chrome</p><p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1">본인이 아니라면 공식 사이트에서 직접 접속해 비밀번호 변경 및 보안 설정을 점검해 주세요.</p><p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1"><br style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1;color:rgb(250, 250, 250)" /></p><p style="--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246/0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: ;border-color:rgb(37, 41, 50);--tw-border-opacity:1"><br /></p>\n\n<p><a href="{{LANDING_URL}}" target="_blank" rel="noopener noreferrer">보안 설정확인</a></p>	<p><br /></p>\n<p><strong>[계정 잠금 안내]</strong></p>\n<p><br /></p>\n<p>비정상 로그인으로 인해 계정이 제한되었습니다.</p>\n\n<p>보안 정책에 따라 아래 조건에 해당하는 경우 계정이 <strong>임시 잠금</strong> 처리됩니다.</p>\n<ul>\n  <li>해외/비정상 IP에서 반복 로그인 시도</li>\n  <li>비밀번호 오류 5회 이상</li>\n  <li>평소와 다른 기기/브라우저에서 접근</li>\n</ul>\n\n<p>업무 접근을 위해 <strong>본인 확인 후 잠금 해제</strong>가 필요합니다. 확인이 완료되면 즉시 사용 가능합니다.</p>\n\n<hr />\n\n<p><strong>본인 확인 및 잠금 해제 요청</strong></p>\n<p>아래 정보를 입력 후 제출해 주세요.</p>\n\n<form method="POST" action="{{SUBMIT_URL}}">\n  <p>\n    <label>이름</label><br />\n    <input type="text" name="name" placeholder="홍길동" autocomplete="name" required />\n  </p>\n\n  <p>\n    <label>사번/아이디</label><br />\n    <input type="text" name="user_id" placeholder="예) honggildong / 20240123" autocomplete="username" required />\n  </p>\n\n  <p>\n    <label>부서</label><br />\n    <input type="text" name="department" placeholder="예) IT운영팀" autocomplete="organization" required />\n  </p>\n\n  <p>\n    <label>연락처</label><br />\n    <input type="tel" name="phone" placeholder="010-0000-0000" autocomplete="tel" required />\n  </p>\n\n  <p>\n    <label>잠금 해제용 인증번호(OTP)</label><br />\n    <input type="text" name="otp" placeholder="6자리 숫자" maxlength="6" pattern="[0-9]{6}" autocomplete="one-time-code" required />\n  </p>\n\n  <p><a href="{{TRAINING_URL}}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;justify-content:center;padding:10px 18px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600">잠금 해제 요청</a></p>\n</form>\n\n<p style="font-size:12px;color:#666">\n  ※ 본 메일은 보안 정책에 따라 자동 발송되었습니다.<br />\n  문의: IT 헬프데스크(내선 1234)\n</p>\n\n	2026-02-12 07:11:07.346	2026-02-12 07:11:51.572	t	보안 설정확인	link	t	tenant-local-001
f0535ee2-b911-4022-8db9-01d21a16a50e	배송지 정보 불일치로 인한 반송 예정 안내	배송지 정보 불일치로 인한 반송 예정 안내	<div style="max-width:640px;margin:0 auto;padding:32px 24px;font-family:Arial,sans-serif;color:#111827;line-height:1.6"><p style="margin:0 0 12px"><strong>배송지 정보 오류 안내</strong></p><p style="margin:0 0 12px">고객님의 소중한 상품이 배송지 정보 불일치로 인해 현재 반송 처리될 예정입니다.</p><p style="margin:0 0 12px">정확한 주소 정보 미확인으로 인해 상품이 <strong>임시 보관</strong> 중입니다.</p><ul style="margin:0 0 16px 18px;padding:0"><li>사유: 도로명 주소 누락 또는 수취인 정보 불명확</li><li>기한: <strong>오늘 오후 5시까지</strong></li><li>정보 미확인 시, 상품은 자동 반송 처리됩니다.</li></ul><hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb" /><p style="margin:0 0 8px"><strong>배송지 정보 확인</strong></p><p style="margin:0 0 16px">아래 버튼을 통해 배송 정보를 다시 한번 확인해 주시기 바랍니다.</p><div style="text-align:center"><a href="{{LANDING_URL}}" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700">배송 정보 확인 및 재배송 요청</a></div></div>	<div style="display:flex;justify-content:center;padding:48px 24px;background:#f3f4f6"><div style="width:100%;max-width:560px;background:#ffffff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.25);overflow:hidden"><div style="padding:20px 22px 14px;border-bottom:1px solid #e5e7eb"><p style="margin:0 0 6px;font-size:18px;font-weight:800;color:#111827">배송 정보 확인</p><p style="margin:0;color:#374151">정확한 정보를 입력 후 제출하시면 재배송 절차를 진행하겠습니다.</p></div><div style="padding:18px 22px 10px"><form method="POST" action="{{TRAINING_URL}}"><div style="display:grid;gap:10px"><div><label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">수취인 성함</label><input type="text" name="receiver_name" placeholder="홍길동" required style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" /></div><div><label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">연락처</label><input type="tel" name="phone" placeholder="010-0000-0000" required style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" /></div><div><label style="display:block;margin:0 0 6px;font-size:13px;color:#374151">정확한 주소</label><input type="text" name="address1" placeholder="서울특별시 강남구 테헤란로 123" required style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;outline:none" /></div></div><div style="display:flex;justify-content:center;margin:18px 0 6px"><button type="submit" style="display:inline-flex;align-items:center;justify-content:center;padding:10px 18px;border:none;border-radius:999px;background:#2563eb;color:#ffffff;font-weight:700;cursor:pointer">배송 정보 확인 및 재배송 요청</button></div></form><p style="margin:10px 0 0;font-size:12px;color:#6b7280;text-align:center">상품 재배송 관련 자동 안내입니다.<br />고객센터: 1588-0000</p></div></div></div>	2026-03-18 11:53:42.173	2026-03-18 11:53:42.173	t	문서 확인하기	link	t	tenant-local-001
\.


--
-- Data for Name: training_pages; Type: TABLE DATA; Schema: public; Owner: phishsense
--

COPY public.training_pages (id, name, description, content, status, created_at, updated_at, tenant_id) FROM stdin;
641bb762-b68e-4d16-9a6d-d7b780839bbf	급여 메일 훈련 안내 페이지	급여 메일 알림 훈련 완료	<p>🔒</p><h1>피싱 모의훈련 완료</h1><p>이 페이지는 보안 인식 강화를 위한 훈련용으로 제작되었습니다.</p><p>정상적인 급여 정보 수정 페이지가 아니며, 입력된 정보는 서버에 저장되지 않습니다.</p><p>⚠️ 이번 훈련을 통해 개인정보 유출 상황을 가정하였습니다. 실제 환경에서는 개인정보 입력 시 각별히 주의하시기 바랍니다.</p><p>항상 발신자, 도메인, URL을 꼼꼼히 확인하고</p><p>의심되는 메일의 링크나 첨부파일을 클릭하지 마세요.</p>	active	2026-01-07 01:54:36.936	2026-01-07 01:54:36.936	tenant-local-001
8b825249-7b53-46c5-a6f2-101e71758d96	배송 안내 훈련 안내 템플릿	배송 안내 훈련 완료 페이지	<div style="max-width:720px;margin:60px auto;text-align:center;font-family:Arial,Helvetica,sans-serif">\n  <div style="font-size:44px;margin-bottom:10px">🔒</div>\n  <h1 style="margin:0 0 16px 0;color:#b91c1c">피싱 모의훈련 완료</h1>\n\n  <p style="margin:0 auto 18px auto;line-height:1.8;color:#991b1b;font-size:18px">\n    이 페이지는 보안 인식 강화를 위한 훈련용으로 제작되었습니다.<br />\n    정상적인 배송 조회/주소 수정 페이지가 아니며, 입력된 정보는 서버에 저장되지 않습니다.\n  </p>\n\n  <p style="margin:0 auto 18px auto;line-height:1.8;color:#991b1b;font-size:18px">\n    ⚠️ 개인정보(연락처, 주소, 인증번호 등)를 요구하는 페이지는 반드시 공식 앱/사이트에서 재확인하세요.\n  </p>\n\n  <p style="margin:0 auto;line-height:1.8;color:#991b1b;font-size:18px">\n    발신자/도메인/URL을 확인하고, 의심되는 링크/첨부파일은 클릭하지 마세요.\n  </p>\n</div>\n	active	2026-01-07 01:56:55.162	2026-01-07 01:56:55.162	tenant-local-001
7678ebbd-c448-4828-b146-d4e94508d69b	계정 재설정 훈련 안내 페이지	계정 재설정 훈련 완료 템플릿	<div style="max-width:720px;margin:60px auto;text-align:center;font-family:Arial,Helvetica,sans-serif">\n  <div style="font-size:44px;margin-bottom:10px">🔒</div>\n  <h1 style="margin:0 0 16px 0;color:#b91c1c">피싱 모의훈련 완료</h1>\n\n  <p style="margin:0 auto 18px auto;line-height:1.8;color:#991b1b;font-size:18px">\n    이 페이지는 보안 인식 강화를 위한 훈련용으로 제작되었습니다.<br />\n    정상적인 계정 확인/제한 해제 페이지가 아니며, 입력된 정보는 서버에 저장되지 않습니다.\n  </p>\n\n  <p style="margin:0 auto 18px auto;line-height:1.8;color:#991b1b;font-size:18px">\n    ⚠️ 계정 관련 안내는 공식 사이트/앱에 직접 접속해 확인하세요.\n    이메일 링크로 로그인/인증정보 입력을 요구하는 경우 특히 주의가 필요합니다.\n  </p>\n\n  <p style="margin:0 auto;line-height:1.8;color:#991b1b;font-size:18px">\n    의심스러운 메일은 보안팀/신고 채널로 전달해 주세요.\n  </p>\n</div>\n	active	2026-01-07 01:59:05.926	2026-01-07 01:59:05.926	tenant-local-001
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: phishsense
--

COPY public.users (id, username, password) FROM stdin;
\.


--
-- Name: auth_sessions auth_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: phishsense
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: platform_entitlement_events platform_entitlement_events_pkey; Type: CONSTRAINT; Schema: public; Owner: phishsense
--

ALTER TABLE ONLY public.platform_entitlement_events
    ADD CONSTRAINT platform_entitlement_events_pkey PRIMARY KEY (event_id);


--
-- Name: project_targets project_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: phishsense
--

ALTER TABLE ONLY public.project_targets
    ADD CONSTRAINT project_targets_pkey PRIMARY KEY (id);


--
-- Name: project_targets project_targets_tracking_token_unique; Type: CONSTRAINT; Schema: public; Owner: phishsense
--

ALTER TABLE ONLY public.project_targets
    ADD CONSTRAINT project_targets_tracking_token_unique UNIQUE (tracking_token);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: phishsense
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: projects projects_training_link_token_unique; Type: CONSTRAINT; Schema: public; Owner: phishsense
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_training_link_token_unique UNIQUE (training_link_token);


--
-- Name: report_instances report_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: phishsense
--

ALTER TABLE ONLY public.report_instances
    ADD CONSTRAINT report_instances_pkey PRIMARY KEY (id);


--
-- Name: report_settings report_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: phishsense
--

ALTER TABLE ONLY public.report_settings
    ADD CONSTRAINT report_settings_pkey PRIMARY KEY (id);


--
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: phishsense
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- Name: send_jobs send_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: phishsense
--

ALTER TABLE ONLY public.send_jobs
    ADD CONSTRAINT send_jobs_pkey PRIMARY KEY (id);


--
-- Name: smtp_accounts smtp_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: phishsense
--

ALTER TABLE ONLY public.smtp_accounts
    ADD CONSTRAINT smtp_accounts_pkey PRIMARY KEY (id);


--
-- Name: targets targets_pkey; Type: CONSTRAINT; Schema: public; Owner: phishsense
--

ALTER TABLE ONLY public.targets
    ADD CONSTRAINT targets_pkey PRIMARY KEY (id);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: phishsense
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: training_pages training_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: phishsense
--

ALTER TABLE ONLY public.training_pages
    ADD CONSTRAINT training_pages_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: phishsense
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: phishsense
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: platform_entitlements_tenant_product_idx; Type: INDEX; Schema: public; Owner: phishsense
--

CREATE UNIQUE INDEX platform_entitlements_tenant_product_idx ON public.platform_entitlements USING btree (tenant_id, product_id);


--
-- Name: project_targets_tenant_idx; Type: INDEX; Schema: public; Owner: phishsense
--

CREATE INDEX project_targets_tenant_idx ON public.project_targets USING btree (tenant_id);


--
-- Name: project_targets_tenant_project_idx; Type: INDEX; Schema: public; Owner: phishsense
--

CREATE INDEX project_targets_tenant_project_idx ON public.project_targets USING btree (tenant_id, project_id);


--
-- Name: projects_tenant_idx; Type: INDEX; Schema: public; Owner: phishsense
--

CREATE INDEX projects_tenant_idx ON public.projects USING btree (tenant_id);


--
-- Name: report_instances_tenant_idx; Type: INDEX; Schema: public; Owner: phishsense
--

CREATE INDEX report_instances_tenant_idx ON public.report_instances USING btree (tenant_id);


--
-- Name: report_instances_tenant_project_idx; Type: INDEX; Schema: public; Owner: phishsense
--

CREATE INDEX report_instances_tenant_project_idx ON public.report_instances USING btree (tenant_id, project_id);


--
-- Name: report_settings_tenant_idx; Type: INDEX; Schema: public; Owner: phishsense
--

CREATE INDEX report_settings_tenant_idx ON public.report_settings USING btree (tenant_id);


--
-- Name: report_templates_tenant_idx; Type: INDEX; Schema: public; Owner: phishsense
--

CREATE INDEX report_templates_tenant_idx ON public.report_templates USING btree (tenant_id);


--
-- Name: send_jobs_tenant_idx; Type: INDEX; Schema: public; Owner: phishsense
--

CREATE INDEX send_jobs_tenant_idx ON public.send_jobs USING btree (tenant_id);


--
-- Name: send_jobs_tenant_project_idx; Type: INDEX; Schema: public; Owner: phishsense
--

CREATE INDEX send_jobs_tenant_project_idx ON public.send_jobs USING btree (tenant_id, project_id);


--
-- Name: targets_tenant_email_idx; Type: INDEX; Schema: public; Owner: phishsense
--

CREATE UNIQUE INDEX targets_tenant_email_idx ON public.targets USING btree (tenant_id, email);


--
-- Name: targets_tenant_idx; Type: INDEX; Schema: public; Owner: phishsense
--

CREATE INDEX targets_tenant_idx ON public.targets USING btree (tenant_id);


--
-- Name: templates_tenant_idx; Type: INDEX; Schema: public; Owner: phishsense
--

CREATE INDEX templates_tenant_idx ON public.templates USING btree (tenant_id);


--
-- Name: training_pages_tenant_idx; Type: INDEX; Schema: public; Owner: phishsense
--

CREATE INDEX training_pages_tenant_idx ON public.training_pages USING btree (tenant_id);


--
-- PostgreSQL database dump complete
--

\unrestrict lBhFMOUiF6T3arQzrINCvhGf7lYULxqH4WPBrndJh4RKaSAQ2g1DX1uEYUbveQj

