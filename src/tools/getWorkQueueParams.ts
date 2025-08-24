import { z } from 'zod';

export const TOOL_NAME = 'get_work_queue';

export const TOOL_DESCRIPTION = `
Retrieve pending requests from a project's work queue.
After processing these requests, call clear_work_queue to remove them.
`;

export const TOOL_PARAMS = z.object({
    project_id: z.string().uuid().describe('ID of the project whose queue should be read.'),
});

export type GetWorkQueueArgs = z.infer<typeof TOOL_PARAMS>;
