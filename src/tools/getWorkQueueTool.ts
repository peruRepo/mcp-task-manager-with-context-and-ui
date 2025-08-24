import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { TOOL_NAME, TOOL_DESCRIPTION, TOOL_PARAMS, GetWorkQueueArgs } from './getWorkQueueParams.js';
import { WorkQueueService } from '../services/WorkQueueService.js';
import { logger } from '../utils/logger.js';
import { NotFoundError } from '../utils/errors.js';

export const getWorkQueueTool = (server: McpServer, workQueueService: WorkQueueService): void => {
    const processRequest = async (args: GetWorkQueueArgs) => {
        logger.info(`[${TOOL_NAME}] Received request`, args);
        try {
            const items = await workQueueService.list(args.project_id);
            return {
                content: [{ type: 'text' as const, text: JSON.stringify(items) }],
            };
        } catch (error) {
            logger.error(`[${TOOL_NAME}] Error processing request:`, error);
            if (error instanceof NotFoundError) {
                throw new McpError(ErrorCode.InvalidParams, error.message);
            }
            const message = error instanceof Error ? error.message : 'Failed to retrieve work queue.';
            throw new McpError(ErrorCode.InternalError, message);
        }
    };

    server.tool(TOOL_NAME, TOOL_DESCRIPTION, TOOL_PARAMS.shape, processRequest);
    logger.info(`[${TOOL_NAME}] Tool registered successfully.`);
};
