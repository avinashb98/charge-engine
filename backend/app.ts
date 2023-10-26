import express from "express";
import { createClient } from "redis";
import { json } from "body-parser";

const DEFAULT_BALANCE = 100;

interface ChargeResult {
    isAuthorized: boolean;
    remainingBalance: number;
    charges: number;
}

async function connect(): Promise<ReturnType<typeof createClient>> {
    const url = `redis://${process.env.REDIS_HOST ?? "localhost"}:${process.env.REDIS_PORT ?? "6379"}`;
    console.log(`Using redis URL ${url}`);
    const client = createClient({ url });
    await client.connect();
    return client;
}

type RedisClient = ReturnType<typeof createClient>;

async function reset(client: RedisClient, account: string): Promise<void> {
    try {
        await client.set(`${account}/balance`, DEFAULT_BALANCE);
    } catch (e) {
        console.log("error while resetting account balance due to ", String(e));
    }
}

async function charge(client: RedisClient, account: string, charges: number): Promise<ChargeResult | undefined> {
    try {
        const balance = parseInt((await client.get(`${account}/balance`)) ?? "");
        if (balance >= charges) {
            await client.set(`${account}/balance`, balance - charges);
            const remainingBalance = parseInt((await client.get(`${account}/balance`)) ?? "");
            return { isAuthorized: true, remainingBalance, charges };
        } else {
            return { isAuthorized: false, remainingBalance: balance, charges: 0 };
        }
    } catch (e) {
        console.log("error while charging account due to ", String(e));
    }
}

export async function buildApp(): Promise<express.Application> {
    const app = express();
    app.use(json());
    const redisClient = await connect();
    app.post("/reset", async (req, res) => {
        try {
            const account = req.body.account ?? "account";
            await reset(redisClient, account);
            console.log(`Successfully reset account ${account}`);
            res.sendStatus(204);
        } catch (e) {
            console.error("Error while resetting account", e);
            res.status(500).json({ error: String(e) });
        }
    });
    app.post("/charge", async (req, res) => {
        try {
            const account = req.body.account ?? "account";
            let charges = req.body.charges;
            if (!charges) {
                res.status(400).json({
                    error: "missing charge in input",
                });
                return;
            }
            charges = Number.parseInt(charges, 10);
            console.log({ charges });
            if (Number.isNaN(charges)) {
                res.status(400).json({
                    error: "invalid charge in input",
                });
                return;
            }
            const result = await charge(redisClient, account, req.body.charges ?? 10);
            console.log(`Successfully charged account ${account}`);
            res.status(200).json(result);
        } catch (e) {
            console.error("Error while charging account", e);
            res.status(500).json({ error: String(e) });
        }
    });
    return app;
}
