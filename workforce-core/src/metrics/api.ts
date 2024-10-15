import express from "express";
import { Gauge, collectDefaultMetrics, prometheusContentType, register } from "prom-client";
import { Logger } from "../logging/logger.js";

export function collectMetrics() {
    try {
        collectDefaultMetrics()
    } catch (e) {
        Logger.getInstance("metrics-api").warn(`Error collecting metrics: ${(e as Error).message}`, e);
    }
}

export class CustomMetrics {
    private static instance: CustomMetrics;
    public objectCounts: Gauge<string>;
    public prospectSignups: Gauge<string>;

    private constructor() {
        this.objectCounts = new Gauge({
            name: "workforce_object_counts",
            help: "Number of objects registered with the workforce engine.",
            labelNames: ["type", "subtype"]
        });
        this.prospectSignups = new Gauge({
            name: "workforce_prospect_signups",
            help: "Number of prospects that have signed up for the workforce engine."
        });
    }

    public static getInstance(): CustomMetrics {
        if (!CustomMetrics.instance) {
            CustomMetrics.instance = new CustomMetrics();
        }

        return CustomMetrics.instance;
    }

    public getMetrics(): Promise<string> {
        return register.metrics();
    }

    public setMetricObjectCount(type: string, subtype: string, count: number) {
        this.objectCounts.labels(type, subtype).set(count);
    }

    public incrementProspectSignups() {
        this.prospectSignups.inc();
    }
}

export const MetricsHandlers = [
    async (req: express.Request, res: express.Response) => {
        res.set("Content-Type", prometheusContentType);
        res.send(await CustomMetrics.getInstance().getMetrics());
    }
]