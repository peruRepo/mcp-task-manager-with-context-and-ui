import { v4 as uuidv4 } from 'uuid';
import { WorkQueueRepository, QueueItemData } from '../repositories/WorkQueueRepository.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { logger } from '../utils/logger.js';
import { NotFoundError } from '../utils/errors.js';

export class WorkQueueService {
    private workQueueRepository: WorkQueueRepository;
    private projectRepository: ProjectRepository;

    constructor(workQueueRepository: WorkQueueRepository, projectRepository: ProjectRepository) {
        this.workQueueRepository = workQueueRepository;
        this.projectRepository = projectRepository;
    }

    public async enqueue(projectId: string, request: string): Promise<QueueItemData> {
        logger.info(`[WorkQueueService] Enqueue request for project ${projectId}`);
        const projectExists = this.projectRepository.findById(projectId);
        if (!projectExists) {
            logger.warn(`[WorkQueueService] Project not found: ${projectId}`);
            throw new NotFoundError(`Project with ID ${projectId} not found.`);
        }

        const item: QueueItemData = {
            queue_id: uuidv4(),
            project_id: projectId,
            request,
            created_at: new Date().toISOString(),
        };

        try {
            this.workQueueRepository.enqueue(item);
            return item;
        } catch (error) {
            logger.error(`[WorkQueueService] Failed to enqueue request for project ${projectId}:`, error);
            throw error;
        }
    }

    public async list(projectId: string): Promise<QueueItemData[]> {
        logger.info(`[WorkQueueService] Listing queue for project ${projectId}`);
        const projectExists = this.projectRepository.findById(projectId);
        if (!projectExists) {
            logger.warn(`[WorkQueueService] Project not found: ${projectId}`);
            throw new NotFoundError(`Project with ID ${projectId} not found.`);
        }

        try {
            return this.workQueueRepository.list(projectId);
        } catch (error) {
            logger.error(`[WorkQueueService] Failed to list queue for project ${projectId}:`, error);
            throw error;
        }
    }

    public async clear(projectId: string, queueIds: string[]): Promise<number> {
        logger.info(`[WorkQueueService] Clearing ${queueIds.length} queue items from project ${projectId}`);
        const projectExists = this.projectRepository.findById(projectId);
        if (!projectExists) {
            logger.warn(`[WorkQueueService] Project not found: ${projectId}`);
            throw new NotFoundError(`Project with ID ${projectId} not found.`);
        }

        try {
            return this.workQueueRepository.delete(projectId, queueIds);
        } catch (error) {
            logger.error(`[WorkQueueService] Failed to clear queue items for project ${projectId}:`, error);
            throw error;
        }
    }
}
