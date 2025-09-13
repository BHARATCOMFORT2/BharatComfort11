// script/import-csv.ts
import { db } from "@/lib/firestore";
import { collection, doc, setDoc } from "firebase/firestore";
import fs from "fs";
import csv from "csv-parser";

interface CSVRow {
  [key: string]: string;
}

async function importCSV(filePath: string, collectionName: string) {
  console.log(`📂 Importing ${filePath} into Firestore collection: ${collectionName}`);

  const rows: CSVRow[] = [];

  // Read CSV file
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => {
        console.log(`✅ Loaded ${rows.length} rows from ${filePath}`);
        resolve();
      })
      .on("error", (err) => reject(err));
  });

  // Upload to Firestore
  for (const row of rows) {
    const ref = doc(collection(db, collectionName));
    await setDoc(ref, {
      ...row,
      createdAt: new Date(),
    });
    console.log(`➕ Added document with ID: ${ref.id}`);
  }

  console.log(`🎉 Successfully imported ${rows.length} documents into ${collectionName}`);
}

// Example usage
(async () => {
  try {
    // Adjust path and collection name as needed
    await importCSV("data/listings.csv", "listings");
  } catch (error) {
    console.error("❌ Import failed:", error);
  }
})();
