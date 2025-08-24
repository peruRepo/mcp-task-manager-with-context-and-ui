import { z } from 'zod';

export const TOOL_NAME = 'enqueue_request';

export const TOOL_DESCRIPTION = `
Add a new request to a project's work queue.
Use this to queue additional instructions so the AI can revisit its plans.
`;

export const TOOL_PARAMS = z.object({
    project_id: z.string().uuid().describe('ID of the project receiving the request.'),
    request: z.string().min(1, 'Request is required.').describe('Description of the request to enqueue.'),
});

export type EnqueueRequestArgs = z.infer<typeof TOOL_PARAMS>;
