import mysql from 'mysql2'
import dotenv from 'dotenv'

dotenv.config();

const database = mysql.createPool({
    connectionLimit: 20,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

database.getConnection((err, connection) => {
    if (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Database connection was closed.');
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('Database has too many connections.');
        }
        if (err.code === 'ECONNREFUSED') {
            console.error('Database connection was refused.');
        }
        console.error('Error connecting to MySQL database: ', err);
        // Depending on your error handling strategy, you might want to exit the application
        // process.exit(1);
        return;
    }
    if (connection) {
        console.log(`Successfully connected to '${process.env.DB_NAME}' database`);
        connection.release(); // Release the connection back to the pool
    }
});

export default database;
