import { buildApp } from "./app";

async function start() {
    const app = await buildApp();
    const port = parseInt(process.env.EXPRESS_PORT ?? "3000");

    app.listen(port, () => console.log(`Backend listening on port ${port}`));
}

start();
