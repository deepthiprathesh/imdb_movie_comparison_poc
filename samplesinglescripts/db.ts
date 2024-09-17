import { Pool } from 'pg';

// Create a connection to the PostgreSQL database
const pool = new Pool({
  user: 'postgres',      
  host: 'localhost',         
  database: 'nokio',        
  password: '123456', 
  port: 5433,                
});

export default pool;
