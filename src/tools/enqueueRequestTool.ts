import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { TOOL_NAME, TOOL_DESCRIPTION, TOOL_PARAMS, EnqueueRequestArgs } from './enqueueRequestParams.js';
import { WorkQueueService } from '../services/WorkQueueService.js';
import { logger } from '../utils/logger.js';
import { NotFoundError } from '../utils/errors.js';

export const enqueueRequestTool = (server: McpServer, workQueueService: WorkQueueService): void => {
    const processRequest = async (args: EnqueueRequestArgs) => {
        logger.info(`[${TOOL_NAME}] Received request`, args);
        try {
            const item = await workQueueService.enqueue(args.project_id, args.request);
            return {
                content: [{ type: 'text' as const, text: JSON.stringify(item) }],
            };
        } catch (error) {
            logger.error(`[${TOOL_NAME}] Error processing request:`, error);
            if (error instanceof NotFoundError) {
                throw new McpError(ErrorCode.InvalidParams, error.message);
            }
            const message = error instanceof Error ? error.message : 'Failed to enqueue request.';
            throw new McpError(ErrorCode.InternalError, message);
        }
    };

    server.tool(TOOL_NAME, TOOL_DESCRIPTION, TOOL_PARAMS.shape, processRequest);
    logger.info(`[${TOOL_NAME}] Tool registered successfully.`);
};
