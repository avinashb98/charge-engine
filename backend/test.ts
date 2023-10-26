import { performance } from "perf_hooks";
import supertest from "supertest";
import { buildApp } from "./app";

async function test() {
    const app = supertest(await buildApp());

    async function basicLatencyTest() {
        await app.post("/reset").expect(204);
        const start = performance.now();
        await app.post("/charge").send({ account: "test", charges: 1 }).expect(200);
        await app.post("/charge").send({ account: "test", charges: 1 }).expect(200);
        await app.post("/charge").send({ account: "test", charges: 1 }).expect(200);
        await app.post("/charge").send({ account: "test", charges: 1 }).expect(200);
        await app.post("/charge").send({ account: "test", charges: 1 }).expect(200);
        console.log(`Latency: ${performance.now() - start} ms`);
    }

    async function basicValidationTests() {
        await app.post("/charge").send({ account: "test" }).expect(400);
        await app.post("/charge").send({ account: "test", charges: "a" }).expect(400);
        await app.post("/charge").send({ account: "test", charges: "one" }).expect(400);
        await app.post("/charge").send({ account: "test", charges: null }).expect(400);
    }

    async function runTests() {
        // await basicLatencyTest();
        await basicValidationTests();
    }

    runTests().catch(console.error);
}

test();
