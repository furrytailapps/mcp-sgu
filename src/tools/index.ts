import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getBedrockTool, getBedrockHandler } from './get-bedrock';
import { getBedrockMapTool, getBedrockMapHandler } from './get-bedrock-map';
import { getSoilTypesMapTool, getSoilTypesMapHandler } from './get-soil-types-map';
import { getSoilTypeAtPointTool, getSoilTypeAtPointHandler } from './get-soil-type-at-point';
import { getBoulderCoverageMapTool, getBoulderCoverageMapHandler } from './get-boulder-coverage-map';
import { getSoilDepthMapTool, getSoilDepthMapHandler } from './get-soil-depth-map';
import { getGroundwaterMapTool, getGroundwaterMapHandler } from './get-groundwater-map';
import { getLandslideMapTool, getLandslideMapHandler } from './get-landslide-map';
import { getRadonRiskMapTool, getRadonRiskMapHandler } from './get-radon-risk-map';
import { getWellsMapTool, getWellsMapHandler } from './get-wells-map';
import { getGroundwaterVulnerabilityMapTool, getGroundwaterVulnerabilityMapHandler } from './get-groundwater-vulnerability-map';
// Point query tools
import { getBedrockAtPointTool, getBedrockAtPointHandler } from './get-bedrock-at-point';
import { getSoilDepthAtPointTool, getSoilDepthAtPointHandler } from './get-soil-depth-at-point';
import { getBoulderCoverageAtPointTool, getBoulderCoverageAtPointHandler } from './get-boulder-coverage-at-point';
import { getGroundwaterAtPointTool, getGroundwaterAtPointHandler } from './get-groundwater-at-point';
import { getLandslideAtPointTool, getLandslideAtPointHandler } from './get-landslide-at-point';
import {
  getGroundwaterVulnerabilityAtPointTool,
  getGroundwaterVulnerabilityAtPointHandler,
} from './get-groundwater-vulnerability-at-point';

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
  { definition: getRadonRiskMapTool, handler: getRadonRiskMapHandler },
  { definition: getWellsMapTool, handler: getWellsMapHandler },
  { definition: getGroundwaterVulnerabilityMapTool, handler: getGroundwaterVulnerabilityMapHandler },
  // Point query tools
  { definition: getBedrockAtPointTool, handler: getBedrockAtPointHandler },
  { definition: getSoilDepthAtPointTool, handler: getSoilDepthAtPointHandler },
  { definition: getBoulderCoverageAtPointTool, handler: getBoulderCoverageAtPointHandler },
  { definition: getGroundwaterAtPointTool, handler: getGroundwaterAtPointHandler },
  { definition: getLandslideAtPointTool, handler: getLandslideAtPointHandler },
  { definition: getGroundwaterVulnerabilityAtPointTool, handler: getGroundwaterVulnerabilityAtPointHandler },
];

/**
 * Register all SGU tools with the MCP server
 */
export function registerAllTools(server: McpServer): void {
  for (const { definition, handler } of tools) {
    server.tool(definition.name, definition.description, definition.inputSchema, handler);
  }
}
