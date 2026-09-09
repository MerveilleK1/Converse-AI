import "dotenv/config";
import { app } from "./app.js";
import { connectDatabase } from "./config/database.js";

const port = Number(process.env.PORT ?? 3001);

async function startServer() {
  try {
    await connectDatabase();
  } catch (error) {
    console.error("MongoDB connection failed");
    console.error(error);
    process.exit(1);
  }

  const server = app.listen(port, () => {
    console.log(`Backend API listening on port ${port}`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${port} is already in use. Stop the process using it or set another PORT in .env.`,
      );
      process.exit(1);
    }

    throw error;
  });
}

startServer();
