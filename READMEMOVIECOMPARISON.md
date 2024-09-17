Batch Movie Comparison System

Overview
This project processes movie batch files from a directory, compares the data against a PostgreSQL database of movies, and updates the status of each batch in an Excel file. If there are discrepancies between the data in the batch files and the database, the discrepancies are logged, and the status is marked as "Comparison Failed." Otherwise, the status is marked as "Movie Details Found."

Key Features
- Reads movie data from a PostgreSQL database.
- Processes batch files containing movie details.
- Compares movie details such as title, year, genre, director, rating, actors, etc.
- Updates the batch processing status in an Excel sheet.
- Logs errors if discrepancies are found between the database and batch files.
- Supports parallel batch processing for faster execution.
- Applies color-coding to Excel cells based on the comparison status.

Requirements
- Node.js (v14 or higher)
- PostgreSQL
- ExcelJS library for reading/writing Excel files
- Mutex for handling concurrency in Excel updates

Installation

1. Clone this repository.
    ```bash
    git clone <repository-url>
    cd <repository-folder>
    ```

2. Install the dependencies using `npm`:
    ```bash
    npm install
    ```

3. Configure your PostgreSQL database connection in the code:
    ```js
    const pool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'nokio',
      password: '123456',
      port: 5433,
    });
    ```

4. Place your batch files (in JSON format) and Excel file (`batch_status.xlsx`) in the appropriate directory:
    - Directory Path: `\nokio\batches`
    - The Excel file must contain a worksheet named **Movie Validation Status**.

5. Ensure that your database has a `movies` table structured with the fields `title`, `year`, `genre`, `director`, `rating`, `actor_ids`, `imdb_id`, and `poster_url`.

6. Run the script to start the batch comparison:
    ```bash
    node <your-file-name>.js
    ```

Usage

1. Ensure the PostgreSQL server is running and properly configured with movie records.
2. Run the batch comparison script as explained above.
3. Check the Excel file to see the updated statuses of each batch (e.g., **Movie Details Found**, **Comparison Failed**, **Processing**, etc.).
4. Review any error logs generated in the `errorlog` folder for batches that failed.

Flow of Execution

1. The script fetches all movie records from the PostgreSQL database.
2. It reads the Excel file to get the list of batches that are marked as "Not Processed."
3. For each batch, the script reads the corresponding JSON file from the batch directory.
4. It compares the details from the JSON file against the database.
5. The script updates the batch status in the Excel file based on the comparison:
    - **Movie Details Found**: If the comparison passes.
    - **Comparison Failed**: If there are any discrepancies.
6. Errors (if any) are written to individual log files in the `errorlog` folder.
7. Batch processing occurs in parallel, with a limit of 5 concurrent batches.

Error Handling

- If a batch file is missing or has incorrect data, it logs the error.
- If the Excel file is missing, the script creates a new one.
- Any discrepancies between movie data from the database and the batch file are logged and marked in the Excel sheet.

Parallel Processing
The script processes up to 5 batches in parallel to improve efficiency. The number of concurrent batches can be adjusted by modifying the `maxConcurrentBatches` variable in the code.

