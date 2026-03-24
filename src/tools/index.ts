import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Consolidated tools
import { queryPointTool, queryPointHandler } from './query-point';
import { getMapTool, getMapHandler } from './get-map';
import { getFeaturesTool, getFeaturesHandler } from './get-features';

const tools = [
  { definition: queryPointTool, handler: queryPointHandler },
  { definition: getMapTool, handler: getMapHandler },
  { definition: getFeaturesTool, handler: getFeaturesHandler },
];

export function registerAllTools(server: McpServer): void {
  for (const { definition, handler } of tools) {
    server.tool(definition.name, definition.description, definition.inputSchema, handler);
  }
}
