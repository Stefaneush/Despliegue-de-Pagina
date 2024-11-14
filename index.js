import express, { query } from 'express';
import {config} from "dotenv";
import pg from "pg";

config()

const app = express();

const pool = new pg.Pool({
    
    connectionString: process.env.DATABASE_URL

})



app.listen(3000)
console.log("server on port ", 3000)
