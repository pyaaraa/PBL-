import app from "./app.js";
import { connectDB } from "./config/db.js";
import { seedDemoData } from "../scripts/seedDemo.js";

const PORT = Number(process.env.PORT || 5050);

connectDB()
  .then(() => {
    if (process.env.SEED_DEMO === "true") {
      return seedDemoData();
    }
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`DAuth server listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
