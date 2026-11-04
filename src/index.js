import express from "express";
import dotenv from "dotenv";

import { prisma } from "./config/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import usersRouter from "./routes/users.js";
import postsRouter from "./routes/posts.js";

async function shutdown() {
    server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
}

dotenv.config();

const app = express();

app.use(express.json());

app.get("/", (_, res) => {
    res.json({
        message: "Blog API is running",
    });
});

app.use("/api/users", usersRouter);
app.use("/api/posts", postsRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
