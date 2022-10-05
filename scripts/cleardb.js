const { database } = require('../config.json')
const { Client } = require('pg')

const client = new Client(database)
client.connect()
// drop all
client.query(`
    DROP TABLE IF EXISTS public.notifications;
    DROP TABLE IF EXISTS public.users;
    DROP TABLE IF EXISTS public.users_caches;
    DROP TABLE IF EXISTS public.users_tokens;
    DROP TABLE IF EXISTS public.users_logs;

`, (err, res) => {
    console.log(err, res)
    client.end()
})
