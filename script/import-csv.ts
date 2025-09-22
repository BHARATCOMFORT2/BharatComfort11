import { collection, doc, writeBatch } from "firebase/firestore";
import fs from "fs";
import csv from "csv-parser";
import { db } from "../lib/firestore";

interface CSVRow {
  id: string;
  name: string;
  type: string;
}

async function importCSV(filePath: string) {
  const results: CSVRow[] = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      console.log(`✅ Loaded ${results.length} rows from CSV`);

      let batch = writeBatch(db);
      let counter = 0;
      let batchCount = 1;

      for (const row of results) {
        const ref = doc(collection(db, "myCollection"), row.id);
        batch.set(ref, row);
        counter++;

        // Commit every 500 writes (Firestore batch limit)
        if (counter % 500 === 0) {
          await batch.commit();
          console.log(`🚀 Batch ${batchCount} committed (500 docs)`);
          batchCount++;
          batch = writeBatch(db);
        }
      }

      // Commit any leftover writes
      if (counter % 500 !== 0) {
        await batch.commit();
        console.log(`🚀 Batch ${batchCount} committed (remaining docs)`);
      }

      console.log("🎉 CSV import complete!");
    });
}

// Run import
importCSV("data.csv");
