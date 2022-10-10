const config = require('../config.json')
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(config.database);

sequelize.authenticate().then(() => {
    console.log('Connection has been established successfully.');
}
).catch(err => {
    console.error('Unable to connect to the database:', err);
}
);

/*
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

*/

const Users = sequelize.define('users', {
    pronote_url: {
        type: Sequelize.STRING,
        allowNull: false
    },
    pronote_username: {
        type: Sequelize.STRING,
        allowNull: false
    },
    pronote_password: {
        type: Sequelize.STRING,
        allowNull: false
    },
    pronote_cas: {
        type: Sequelize.STRING,
        allowNull: true
    },
    avatar_base64: {
        type: Sequelize.TEXT,
        allowNull: true
    },
    full_name: {
        type: Sequelize.STRING,
        allowNull: true
    },
    student_class: {
        type: Sequelize.STRING,
        allowNull: true
    },
    establishment: {
        type: Sequelize.STRING,
        allowNull: true
    },
    created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
    },
    updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
    }
}, {
    createdAt: false,
    updatedAt: false
});

const UsersCaches = sequelize.define('users_caches', {
    pronote_username: {
        type: Sequelize.STRING,
        allowNull: false
    },
    pronote_url: {
        type: Sequelize.STRING,
        allowNull: false
    },
    homeworks_cache: {
        type: Sequelize.JSON,
        allowNull: true
    },
    marks_cache: {
        type: Sequelize.JSON,
        allowNull: true
    },
    last_update_at: {
        type: Sequelize.DATE,
        allowNull: true
    }
}, {
    createdAt: false,
    updatedAt: false
});

const UsersTokens = sequelize.define('users_tokens', {
    fcm_token: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
    },
    is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    },
    notifications_homeworks: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    },
    notifications_marks: {
        type: Sequelize.BOOLEAN,
        allowNull: false
    },
    pronote_username: {
        type: Sequelize.STRING,
        allowNull: false
    },
    pronote_url: {
        type: Sequelize.STRING,
        allowNull: false
    },
    device_id: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'unknown'
    }
}, {
    createdAt: false,
    updatedAt: false
});

const UsersLogs = sequelize.define('users_logs', {
    pronote_username: {
        type: Sequelize.STRING,
        allowNull: false
    },
    pronote_url: {
        type: Sequelize.STRING,
        allowNull: false
    },
    fcm_token: {
        type: Sequelize.STRING,
        allowNull: false
    },
    route: {
        type: Sequelize.STRING,
        allowNull: false
    },
    app_version: {
        type: Sequelize.STRING,
        allowNull: false
    },
    date: {
        type: Sequelize.DATE,
        allowNull: false
    },
    jwt: {
        type: Sequelize.STRING,
        allowNull: true
    },
    req_body: {
        type: Sequelize.JSON,
        allowNull: true
    }
}, {
    createdAt: false,
    updatedAt: false
});

const Notifications = sequelize.define('notifications', {
    notification_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    pronote_username: {
        type: Sequelize.STRING,
        allowNull: false
    },
    pronote_url: {
        type: Sequelize.STRING,
        allowNull: false
    },
    fcm_token: {
        type: Sequelize.STRING,
        allowNull: false
    },
    route: {
        type: Sequelize.STRING,
        allowNull: false
    },
    app_version: {
        type: Sequelize.STRING,
        allowNull: false
    },
    date: {
        type: Sequelize.DATE,
        allowNull: false
    },
    jwt: {
        type: Sequelize.STRING,
        allowNull: true
    },
    req_body: {
        type: Sequelize.JSON,
        allowNull: true
    },
    notification_title: {
        type: Sequelize.STRING,
        allowNull: false
    },
    notification_body: {
        type: Sequelize.STRING,
        allowNull: false
    },
    notification_data: {
        type: Sequelize.JSON,
        allowNull: false
    }
}, {
    createdAt: false,
    updatedAt: false
});

// sync
sequelize.sync({
    force: false
})


module.exports = {
    Users,
    UsersCaches,
    UsersTokens,
    UsersLogs,
    Notifications,
    db : sequelize
};

