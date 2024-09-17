Batch Processing and Actor Validation Script

Overview
This script processes a large JSON file (`large_imdb_mock_data.json`) containing movie records, splits it into smaller batch files, and validates the actors in these batches against an actor list provided in a CSV file (`actors_data.csv`). The script also generates an Excel file (`batch_status.xlsx`) to track the validation status of each batch.

Prerequisites
- Node.js installed on your machine
- The following npm packages should be installed:
  - `exceljs`
  - `csv-parser`
- Input files:
  - `large_imdb_mock_data.json` (movie records in JSON format)
  - `actors_data.csv` (actors information in CSV format)

Script Workflow

1.Initialize Batch Folder  : The script first initializes the batch folder (`./batches`), creating it if it doesn't exist or clearing it if it does.
2.Read Input JSON File  : Reads movie data from `large_imdb_mock_data.json`.
3.Split Data into Batches  : The data is split into smaller batches of 100 records each.
4.Save Batches to Files  : Each batch is saved as a separate JSON file in the `./batches` folder.
5.Write Initial Excel File  : Generates an Excel file `batch_status.xlsx` with initial statuses of all batches as 'Not Processed'.
6.Read Actors CSV File: Reads actor data from `actors_data.csv` and stores it in a Map for quick lookup.
7. Validate Batches: For each batch marked as 'Not Processed' in the Excel file:
   - The script checks if all actor IDs in the batch are present in the CSV.
   - Updates the Excel file with the validation status and any errors.
8.Process in Chunks: Batches are processed in chunks of 10 files at a time for efficiency.
9.Save Validation Results: The results are saved back to the `batch_status.xlsx` file.


+-----------------------------------+
| Start                             |
+-----------------------------------+
            |
            v
+---------------------------+
| Initialize Batch Folder   |
| (Create/Clear ./batches)  |
+---------------------------+
            |
            v
+---------------------------+
| Read JSON File            |
| (large_imdb_mock_data.json)|
+---------------------------+
            |
            v
+---------------------------+
| Split Data into Batches   |
+---------------------------+
            |
            v
+---------------------------+
| Save Batches to Files     |
| (batch_1.json, ...)       |
+---------------------------+
            |
            v
+---------------------------+
| Write Initial Excel File  |
| (batch_status.xlsx)       |
+---------------------------+
            |
            v
+---------------------------+
| Read Actors CSV File      |
| (actors_data.csv)         |
+---------------------------+
            |
            v
+---------------------------+
| Validate Batches in Chunks|
| (Update Excel Status)     |
+---------------------------+
            |
            v
+-----------------------------------+
| End                               |
+-----------------------------------+
