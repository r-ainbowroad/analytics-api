import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import { Client } from 'pg'

const client = new Client()

const app = express();
app.use(express.json());

app.get("/", async (req, res) => {
    let totalPixels = (await client.query("SELECT COUNT(timestamp) FROM placements;")).rows[0].count as string;
    let totalPixels5Minutes = (await client.query("SELECT COUNT(timestamp) FROM placements WHERE \"timestamp\" >= NOW() - INTERVAL '5 minutes';")).rows[0].count as string;
    let totalPixels1Minutes = (await client.query("SELECT COUNT(timestamp) FROM placements WHERE \"timestamp\" >= NOW() - INTERVAL '1 minutes';")).rows[0].count as string;
    
    // Total pixels placed, Total pixels placed in last 5 minutes ("pixel power"), Completeness percentage

    res.status(200).send({
        totalPixels: {
            all: parseInt(totalPixels),
            mins_5: parseInt(totalPixels5Minutes),
            mins_1: parseInt(totalPixels1Minutes)
        }
    });
});

app.get("/:template", async (req, res) => {
    let exists = (await client.query("SELECT 1 FROM placements WHERE template = $1;", [ req.params.template ])).rows.length >= 1;

    if (!exists) return res.status(404).send({
        code: "TEMPLATE_NOT_EXISTS",
        message: "This templte has not had any analytics submitted yet."
    });

    let totalPixels = (await client.query("SELECT COUNT(timestamp) FROM placements WHERE template = $1;", [ req.params.template ])).rows[0].count as string;
    let totalPixels5Minutes = (await client.query("SELECT COUNT(timestamp) FROM placements WHERE \"timestamp\" >= NOW() - INTERVAL '5 minutes' AND WHERE template = $1;", [ req.params.template ])).rows[0].count as string;
    let totalPixels1Minutes = (await client.query("SELECT COUNT(timestamp) FROM placements WHERE \"timestamp\" >= NOW() - INTERVAL '1 minutes' AND WHERE template = $1;", [ req.params.template ])).rows[0].count as string;
    let currentCompleteness = (await client.query("SELECT correct, total FROM completion_status GROUP BY correct, total ORDER BY max(timestamp) WHERE template = $1;", [ req.params.template ])).rows[0] as Completeness;
    
    res.status(200).send({
        totalPixels: {
            all: parseInt(totalPixels),
            mins_5: parseInt(totalPixels5Minutes),
            mins_1: parseInt(totalPixels1Minutes)
        },
        completeness: {
            total: currentCompleteness.total,
            correct: currentCompleteness.correct,
            percentage: (currentCompleteness.correct / currentCompleteness.total) || 0
        }
    });
});

app.get("/:template/:id", async (req, res) => {
    let existsUser = (await client.query("SELECT 1 FROM placements WHERE user_id = $1;", [ req.params.id ])).rows.length >= 1;

    if (!existsUser) return res.status(404).send({
        code: "USER_NOT_EXISTS",
        message: "This user has not submitted analytics yet."
    });

    let existsTemplate = (await client.query("SELECT 1 FROM placements WHERE template = $1;", [ req.params.template ])).rows.length >= 1;

    if (!existsTemplate) return res.status(404).send({
        code: "TEMPLATE_NOT_EXISTS",
        message: "This templte has not had any analytics submitted yet."
    });

    let totalPixels = (await client.query("SELECT COUNT(timestamp) FROM placements WHERE user_id = $1 AND template = $2;", [ req.params.id, req.params.template ])).rows[0].count as string;
    let totalPixels5Minutes = (await client.query("SELECT COUNT(timestamp) FROM placements WHERE \"timestamp\" >= NOW() - INTERVAL '5 minutes' AND user_id = $1 AND template = $2;", [ req.params.id, req.params.template ])).rows[0].count as string;
    let totalPixels1Minutes = (await client.query("SELECT COUNT(timestamp) FROM placements WHERE \"timestamp\" >= NOW() - INTERVAL '1 minutes' AND user_id = $1 AND template = $2;", [ req.params.id, req.params.template ])).rows[0].count as string;
    
    res.status(200).send({
        all: parseInt(totalPixels),
        mins_5: parseInt(totalPixels5Minutes),
        mins_1: parseInt(totalPixels1Minutes)
    });
});

app.post("/:template/pixel", async (req, res) => {
    if(!(["timestamp", "user_id", "x", "y", "color", "next_pixel"].every(parameter => Object.keys(req.body).includes(parameter))))
        return res.status(400).send({
            code: "INVALID_BODY",
            message: "The following body parameters may be missing: timestamp, user_id, x, y, color, next_pixel"
        });
    
    if (!(typeof req.body.timestamp == "string")) return resBadRequest(res, "INVALID_BODY_PARAMETER", "timestamp must be a Date-resolvable string a.");
    if (!(typeof req.body.user_id == "string")) return resBadRequest(res, "INVALID_BODY_PARAMETER", "user_id must be a string.");
    if (!(typeof req.body.x == "number")) return resBadRequest(res, "INVALID_BODY_PARAMETER", "x must be a number.");
    if (!(typeof req.body.y == "number")) return resBadRequest(res, "INVALID_BODY_PARAMETER", "y must be a number.");
    if (!(typeof req.body.color == "number")) return resBadRequest(res, "INVALID_BODY_PARAMETER", "color must be a number.");
    if (!(typeof req.body.next_pixel == "string")) return resBadRequest(res, "INVALID_BODY_PARAMETER", "next_pixel must be a Date-resolvable string.");
    
    let timestamp = new Date(req.body.timestamp);
    let next_pixel = new Date(req.body.next_pixel);

    if (timestamp.toString() == "Invalid Date") return resBadRequest(res, "INVALID_BODY_PARAMETER", "timestamp must be a Date-resolvable string.");
    if (next_pixel.toString() == "Invalid Date") return resBadRequest(res, "INVALID_BODY_PARAMETER", "next_pixel must be a Date-resolvable string.");

    // Add the values to the database!
    try {
        await client.query("INSERT INTO placements VALUES ($1, $2, $3, $4, $5, $6, $7);", [
            req.body.timestamp,
            req.body.user_id,
            req.params.template,
            req.body.x,
            req.body.y,
            req.body.color,
            req.body.next_pixel
        ]);

        res.sendStatus(200);
    } catch (error) {
        console.error("Error while writing to the database for /", req.params.template,"/pixel:");
        console.error(error);
        res.send(500).send({
            code: "DATABASE_INSERT_ERROR",
            message: "Encountered a database error while trying to insert pixel event. Please try again later."
        });
    }
});

app.post("/error", async (req, res) => {
    if(!(["timestamp", "user_id", "code"].every(parameter => Object.keys(req.body).includes(parameter))))
        return res.status(400).send({
            code: "INVALID_BODY",
            message: "The following body parameters may be missing: timestamp, user_id, message"
        });
    
    if (!(typeof req.body.timestamp == "string")) return resBadRequest(res, "INVALID_BODY_PARAMETER", "timestamp must be a Date-resolvable string a.");
    if (!(typeof req.body.user_id == "string")) return resBadRequest(res, "INVALID_BODY_PARAMETER", "user_id must be a string.");
    if (!(typeof req.body.code == "string")) return resBadRequest(res, "INVALID_BODY_PARAMETER", "code must be a string.");
    
    let timestamp = new Date(req.body.timestamp);

    if (timestamp.toString() == "Invalid Date") return resBadRequest(res, "INVALID_BODY_PARAMETER", "timestamp must be a Date-resolvable string.");

    // Add the values to the database!
    try {
        await client.query("INSERT INTO errors VALUES ($1, $2, $3);", [
            req.body.timestamp,
            req.body.user_id,
            req.body.code,
        ]);

        res.sendStatus(200);
    } catch (error) {
        console.error("Error while writing to the database for /error:");
        console.error(error);
        res.send(500).send({
            code: "DATABASE_INSERT_ERROR",
            message: "Encountered a database error while trying to insert error event. Please try again later."
        });
    }
});

function resBadRequest(res, code, message) {
    res.status(400).send({
        code,
        message
    });
}

app.listen(80, async () => {
    console.log("Listening on port 80");
    await client.connect();
    console.log((await client.query("SELECT NOW()")).rows[0].now != undefined ? "Connected to database!" : "Not connected?");
});

interface Completeness {
    correct: number,
    total: number
}