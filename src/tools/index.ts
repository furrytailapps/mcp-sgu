import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Consolidated tools
import { queryPointTool, queryPointHandler } from './query-point';
import { getMapTool, getMapHandler } from './get-map';
import { getBedrockTool, getBedrockHandler } from './get-bedrock';
import { describeLayersTool, describeLayersHandler } from './describe-layers';

// Tool registry: consolidated from 21 tools to 4
const tools = [
  { definition: queryPointTool, handler: queryPointHandler },
  { definition: getMapTool, handler: getMapHandler },
  { definition: getBedrockTool, handler: getBedrockHandler },
  { definition: describeLayersTool, handler: describeLayersHandler },
];

/**
 * Register all SGU tools with the MCP server
 */
export function registerAllTools(server: McpServer): void {
  for (const { definition, handler } of tools) {
    server.tool(definition.name, definition.description, definition.inputSchema, handler);
  }
}
