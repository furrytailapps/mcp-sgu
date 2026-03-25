import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { sguQueryTool, sguQueryHandler } from './sgu-query';
import { getMapTool, getMapHandler } from './get-map';

const tools = [
  { definition: sguQueryTool, handler: sguQueryHandler },
  { definition: getMapTool, handler: getMapHandler },
];

export function registerAllTools(server: McpServer): void {
  for (const { definition, handler } of tools) {
    server.tool(definition.name, definition.description, definition.inputSchema, handler);
  }
}
