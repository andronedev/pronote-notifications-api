const { database } = require('../config.json')
const { Client } = require('pg')

const client = new Client(database)
client.connect()
client.query(`
    CREATE TABLE public.notifications
    (
        notification_id character varying COLLATE pg_catalog."default" NOT NULL,
        title character varying COLLATE pg_catalog."default" NOT NULL,
        body character varying COLLATE pg_catalog."default" NOT NULL,
        read_at timestamp with time zone,
        sent_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL,
        pronote_username character varying COLLATE pg_catalog."default" NOT NULL,
        pronote_url character varying COLLATE pg_catalog."default" NOT NULL,
        type character varying COLLATE pg_catalog."default" NOT NULL,
        CONSTRAINT notifications_pkey PRIMARY KEY (notification_id)
    )

    TABLESPACE pg_default;

    ALTER TABLE public.notifications
        OWNER to postgres;

    CREATE TABLE public.users
    (
        pronote_url character varying COLLATE pg_catalog."default" NOT NULL,
        pronote_username character varying COLLATE pg_catalog."default" NOT NULL,
        pronote_password character varying COLLATE pg_catalog."default" NOT NULL,
        password_invalidated boolean default false NOT NULL,
        pronote_cas character varying COLLATE pg_catalog."default",
        avatar_base64 text COLLATE pg_catalog."default",
        full_name character varying COLLATE pg_catalog."default",
        student_class character varying COLLATE pg_catalog."default",
        establishment character varying COLLATE pg_catalog."default",
        created_at timestamp with time zone default now() NOT NULL,
        updated_at timestamp with time zone default now() NOT NULL
    )

    TABLESPACE pg_default;

    ALTER TABLE public.users
        OWNER to postgres;

    CREATE TABLE public.users_caches
    (
        pronote_username character varying COLLATE pg_catalog."default" NOT NULL,
        pronote_url character varying COLLATE pg_catalog."default" NOT NULL,
        homeworks_cache json,
        marks_cache json,
        last_update_at timestamp with time zone,
        CONSTRAINT users_caches_pkey PRIMARY KEY (pronote_username, pronote_url)
    )

    TABLESPACE pg_default;

    ALTER TABLE public.users_caches
        OWNER to postgres;

    CREATE TABLE public.users_tokens
    (
        fcm_token character varying COLLATE pg_catalog."default" NOT NULL,
        is_active boolean NOT NULL,
        notifications_homeworks boolean NOT NULL,
        notifications_marks boolean NOT NULL,
        pronote_username character varying COLLATE pg_catalog."default" NOT NULL,
        pronote_url character varying COLLATE pg_catalog."default" NOT NULL,
        device_id character varying COLLATE pg_catalog."default" default 'unknown'::character varying,
        CONSTRAINT users_tokens_pkey PRIMARY KEY (fcm_token)
    )

    TABLESPACE pg_default;

    ALTER TABLE public.users_tokens
        OWNER to postgres;

    CREATE TABLE public.users_logs
    (
        pronote_username character varying COLLATE pg_catalog."default" NOT NULL,
        pronote_url character varying COLLATE pg_catalog."default" NOT NULL,
        fcm_token character varying COLLATE pg_catalog."default" NOT NULL,
        route character varying COLLATE pg_catalog."default" NOT NULL,
        app_version character varying COLLATE pg_catalog."default" NOT NULL,
        date timestamp with time zone NOT NULL,
        jwt character varying COLLATE pg_catalog."default",
        req_body json
    )

    TABLESPACE pg_default;

    ALTER TABLE public.users_logs
        OWNER to postgres;


`, (err, res) => {
    console.log(err, res)
    client.end()
})
