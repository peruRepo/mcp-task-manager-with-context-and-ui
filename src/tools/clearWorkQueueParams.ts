import { z } from 'zod';

export const TOOL_NAME = 'clear_work_queue';

export const TOOL_DESCRIPTION = `
Remove processed requests from a project's work queue.
Call this after handling items returned by get_work_queue.
`;

export const TOOL_PARAMS = z.object({
    project_id: z.string().uuid().describe('ID of the project whose queue items should be cleared.'),
    queue_ids: z.array(z.string().uuid()).nonempty().describe('IDs of queue items to remove.'),
});

export type ClearWorkQueueArgs = z.infer<typeof TOOL_PARAMS>;
