import { AsyncMap } from "../../manager/impl/cache/async_map.js";
import { MapFactory } from "../../manager/impl/map_factory.js";

export class ChannelDataCache {
    usernamesToWorkerIds: AsyncMap<string>;
    workerIdsToChannelUserIds: AsyncMap<string>;
    userIdsToWorkerIds: AsyncMap<string>;
    sessionThreads: AsyncMap<string>;
    threadSessions: AsyncMap<string>;
    messageBuffers: AsyncMap<string>;
    messageImages: AsyncMap<string[]>;
    channelMessageIdsToImplementationIds: AsyncMap<string>;

    private channelId: string;

    private constructor(channelId: string, usernameToWorkerIds: AsyncMap<string>, workerIdsToChannelUserIds: AsyncMap<string>, userIdsToWorkerIds: AsyncMap<string>, sessionThreads: AsyncMap<string>, threadSessions: AsyncMap<string>, messageBuffers: AsyncMap<string>, messageImages: AsyncMap<string[]>, channelMessageIdsToImplementationIds: AsyncMap<string>) {
        this.usernamesToWorkerIds = usernameToWorkerIds;
        this.workerIdsToChannelUserIds = workerIdsToChannelUserIds;
        this.userIdsToWorkerIds = userIdsToWorkerIds;
        this.sessionThreads = sessionThreads;
        this.threadSessions = threadSessions;
        this.messageBuffers = messageBuffers;
        this.messageImages = messageImages;
        this.channelMessageIdsToImplementationIds = channelMessageIdsToImplementationIds;
        this.channelId = channelId;
    }

    static async for(channelId: string): Promise<ChannelDataCache> {
        const usernameToWorkerIds = await MapFactory.for<string>("channel", `${channelId}:usernameNamesToWorkerIds`);
        const workerIdsToChannelUserIds = await MapFactory.for<string>("channel", `${channelId}:workerIdsToChannelUserIds`);
        const sessionThreads = await MapFactory.for<string>("channel", `${channelId}:sessionThreads`);
        const threadSessions = await MapFactory.for<string>("channel", `${channelId}:threadSessions`);
        const messageBuffers = await MapFactory.for<string>("channel", `${channelId}:messageBufffers`);
        const messageImages = await MapFactory.for<string[]>("channel", `${channelId}:messageImages`);
        const channelMessageIdsToImplementationIds = await MapFactory.for<string>("channel", `${channelId}:channelMessageIdsToImplementationIds`);
        const userIdsToWorkerIds = await MapFactory.for<string>("channel", `${channelId}:userIdsToWorkerIds`);
        const cache = new ChannelDataCache(channelId, usernameToWorkerIds, workerIdsToChannelUserIds, userIdsToWorkerIds, sessionThreads, threadSessions, messageBuffers, messageImages, channelMessageIdsToImplementationIds);
        return cache;
    }

    async destroy() {
        await this.usernamesToWorkerIds.destroy();
        await this.workerIdsToChannelUserIds.destroy();
        await this.userIdsToWorkerIds.destroy();
        await this.sessionThreads.destroy();
        await this.threadSessions.destroy();
        await this.messageBuffers.destroy();
        await this.messageImages.destroy();
        await this.channelMessageIdsToImplementationIds.destroy();
    }
}