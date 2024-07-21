import {Integration} from "../base/integration";
import { Client as NzbGetClient } from "@jc21/nzbget-jsonrpc-api";
import type {UsenetQueueItem} from "../interfaces/usnet-downloads/usenet-queue-item";
import type {UsenetHistoryItem} from "../interfaces/usnet-downloads/usenet-history-item";
import {UsenetIntegration} from "../interfaces/usnet-downloads/usenet-integration";

export class NzbGetIntegration extends UsenetIntegration {
    public async testConnectionAsync(): Promise<void> {
        const client = this.getClient();
        await client.status();
    }

    public async getCurrentQueueAsync(): Promise<UsenetQueueItem[]> {
        const sabnzbdClient = this.getClient();
        const files = await sabnzbdClient.listgroups();
        const nzbGetStatus = await sabnzbdClient.status();
        return files.map((file): UsenetQueueItem => {
            const status = this.getNzbGetState(file.Status);
            return {
                id: `${file.NZBID}`,
                estimatedTimeOfArrival: (file.RemainingSizeLo * 1000000) / nzbGetStatus.DownloadRate,
                name: file.NZBName,
                progress: (file.DownloadedSizeMB / file.FileSizeMB) * 100,
                sizeInBytes: file.FileSizeLo,
                state: status,
            };
        })
    }

    public async getHistoryAsync(): Promise<UsenetHistoryItem[]> {
        const history = await this.getClient().history();
        return history.map((history): UsenetHistoryItem => {
            return {
                id: `${history.NZBID}`,
                name: history.Name,
                size: history.FileSizeLo,
                time: history.DownloadTimeSec * 1000
            };
        });
    }

    public async pauseQueueAsync() {
        await this.getClient().pausedownload();
    }

    public async resumeQueueAsync() {
        await this.getClient().resumedownload();
    }

    private getClient() {
        const url = new URL(this.integration.url);
        url.username = this.getSecretValue('username');
        url.password = this.getSecretValue('password');
        url.pathname += url.pathname.endsWith("/") ? "jsonrpc" : "/jsonrpc";
        return new NzbGetClient(url);
    }

    private getNzbGetState(status: string) {
        switch (status) {
            case 'QUEUED':
                return 'queued';
            case 'PAUSED ':
                return 'paused';
            default:
                return 'downloading';
        }
    }
}