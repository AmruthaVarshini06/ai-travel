import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import { seedTransportData } from "./utils/transportSeeder.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const seed = async () => {
  const connected = await connectDB();
  if (!connected) {
    console.error("Unable to connect to MongoDB. Ensure MONGO_URI is set in .env.");
    process.exit(1);
  }

  const result = await seedTransportData();

  console.log("Transport seed complete.");
  console.log(`  Buses: ${result.buses}`);
  console.log(`  Trains: ${result.trains}`);
  console.log(`  Flights: ${result.flights}`);
  console.log(`  Total: ${result.total}`);

  process.exit(0);
};

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
