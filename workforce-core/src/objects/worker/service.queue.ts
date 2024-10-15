import { WorkRequestDb } from "./db.work_request.js";

export class QueueService {

    static async getNext(workerId: string): Promise<WorkRequestDb | null> {
        return await WorkRequestDb.findOne({
            where: {
                workerId,
                status: "queued"
            },
            order: [
                ['createdAt', 'ASC']
            ]
        });
    }

    static async workerIsAvailable(workerId: string, wipLimit: number): Promise<boolean> {
        const wipCount = await this.getInProgressCount(workerId).catch(() => 0);
        // Logger.getInstance("QueueService").debug(`workerIsAvailable() Worker ${workerId} has ${wipCount} in progress`);
        return wipCount < wipLimit;
    }

    public static async getInProgressCount(workerId: string): Promise<number> {
        return await WorkRequestDb.count({
            where: {
                workerId,
                status: "in-progress"
            }
        });
    }

    public static async getQueuedCount(workerId: string): Promise<number> {
        return await WorkRequestDb.count({
            where: {
                workerId,
                status: "queued"
            }
        });
    }
}