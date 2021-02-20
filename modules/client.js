// Postgres
// const { Pool, Client } = require('pg');
// const con = "postgres://postgres:nickky217@localhost:5432/weddingdeals";

// const client = new Client({
//     connectionString: con
// });

// client.connect();

// module.exports = client;


const { Pool, Client } = require('pg');

const pool = new Pool({
    user: "postgres",
    password: "nickky217",
    host: "localhost",
    post: 5432,
    database: "mavis"
});

module.exports = pool;