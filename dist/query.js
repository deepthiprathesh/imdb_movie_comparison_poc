// query.ts
import pool from './db';
// Function to get movies data
const getMovies = async () => {
    try {
        // Execute the query to fetch data from the 'movies' table
        const result = await pool.query('SELECT * FROM movies');
        // Log the result
        console.log(result.rows);
    }
    catch (err) {
        if (err instanceof Error) {
            console.error('Error executing query:', err.message);
        }
        else {
            console.error('Unknown error occurred:', err);
        }
    }
    finally {
        await pool.end();
    }
};
getMovies();
//# sourceMappingURL=query.js.map