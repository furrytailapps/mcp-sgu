import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getBedrockTool, getBedrockHandler } from './get-bedrock';
import { getBedrockMapTool, getBedrockMapHandler } from './get-bedrock-map';
import { getSoilTypesMapTool, getSoilTypesMapHandler } from './get-soil-types-map';
import { getSoilTypeAtPointTool, getSoilTypeAtPointHandler } from './get-soil-type-at-point';
import { getBoulderCoverageMapTool, getBoulderCoverageMapHandler } from './get-boulder-coverage-map';
import { getSoilDepthMapTool, getSoilDepthMapHandler } from './get-soil-depth-map';
import { getGroundwaterMapTool, getGroundwaterMapHandler } from './get-groundwater-map';
import { getLandslideMapTool, getLandslideMapHandler } from './get-landslide-map';

// Tool registry: all tools must be added here
const tools = [
  { definition: getBedrockTool, handler: getBedrockHandler },
  { definition: getBedrockMapTool, handler: getBedrockMapHandler },
  { definition: getSoilTypesMapTool, handler: getSoilTypesMapHandler },
  { definition: getSoilTypeAtPointTool, handler: getSoilTypeAtPointHandler },
  { definition: getBoulderCoverageMapTool, handler: getBoulderCoverageMapHandler },
  { definition: getSoilDepthMapTool, handler: getSoilDepthMapHandler },
  { definition: getGroundwaterMapTool, handler: getGroundwaterMapHandler },
  { definition: getLandslideMapTool, handler: getLandslideMapHandler },
];

/**
 * Register all SGU tools with the MCP server
 */
export function registerAllTools(server: McpServer): void {
  for (const { definition, handler } of tools) {
    server.tool(definition.name, definition.description, definition.inputSchema, handler);
  }
}
