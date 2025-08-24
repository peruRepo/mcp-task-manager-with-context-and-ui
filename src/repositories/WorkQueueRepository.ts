import { Database as Db } from 'better-sqlite3';
import { logger } from '../utils/logger.js';

export interface QueueItemData {
    queue_id: string;
    project_id: string;
    request: string;
    created_at: string;
}

export class WorkQueueRepository {
    private db: Db;

    constructor(db: Db) {
        this.db = db;
    }

    public enqueue(item: QueueItemData): void {
        const sql = `
            INSERT INTO work_queue (queue_id, project_id, request, created_at)
            VALUES (@queue_id, @project_id, @request, @created_at)
        `;
        try {
            const stmt = this.db.prepare(sql);
            const info = stmt.run(item);
            logger.info(`[WorkQueueRepository] Enqueued request ${item.queue_id} for project ${item.project_id}, changes: ${info.changes}`);
        } catch (error) {
            logger.error(`[WorkQueueRepository] Failed to enqueue request ${item.queue_id}:`, error);
            throw error;
        }
    }

    public list(projectId: string): QueueItemData[] {
        const sql = `
            SELECT queue_id, project_id, request, created_at
            FROM work_queue
            WHERE project_id = ?
            ORDER BY created_at ASC
        `;
        try {
            const stmt = this.db.prepare(sql);
            return stmt.all(projectId) as QueueItemData[];
        } catch (error) {
            logger.error(`[WorkQueueRepository] Failed to fetch queue for project ${projectId}:`, error);
            throw error;
        }
    }

    public delete(projectId: string, queueIds: string[]): number {
        if (queueIds.length === 0) {
            return 0;
        }
        const placeholders = queueIds.map(() => '?').join(',');
        const sql = `
            DELETE FROM work_queue
            WHERE project_id = ? AND queue_id IN (${placeholders})
        `;
        const params = [projectId, ...queueIds];
        try {
            const stmt = this.db.prepare(sql);
            const info = stmt.run(...params);
            logger.info(`[WorkQueueRepository] Deleted ${info.changes} queue items from project ${projectId}.`);
            return info.changes;
        } catch (error) {
            logger.error(`[WorkQueueRepository] Failed to delete queue items from project ${projectId}:`, error);
            throw error;
        }
    }
}
