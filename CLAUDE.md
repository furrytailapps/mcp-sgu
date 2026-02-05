# mcp-sgu - Claude Code Guide

> **Keep this file up to date.** When tools, API endpoints, or project structure change, update this file. For shared patterns and design decisions, see `../CLAUDE.md`.

MCP server wrapping Sveriges Geologiska Undersökning (SGU) APIs for geological data in Sweden. Built for construction and infrastructure users.

## Production URL

```
https://sgu-mcp.vercel.app/mcp
```

## Available Tools (<!-- AUTO:tool_count -->4<!-- /AUTO -->)

| Tool                  | Description                                                  |
| --------------------- | ------------------------------------------------------------ |
| `sgu_query_point`     | Query geological data at coordinates (9 data types via enum) |
| `sgu_get_map`         | Get rendered map images (WMS, multiple layer types)          |
| `sgu_get_bedrock`     | Get bedrock features for an area (OGC API Features)          |
| `sgu_describe_layers` | Describe available map layers and their metadata             |

## Project Structure

```
src/
├── app/[transport]/route.ts   # MCP endpoint
├── clients/sgu-client.ts      # Combined API client (WMS + OGC)
├── lib/
│   ├── coordinates.ts         # WGS84↔SWEREF99TM conversion (proj4)
│   ├── errors.ts              # Error classes
│   ├── geometry-utils.ts      # Bbox, corridor, coordinate validation
│   ├── http-client.ts         # HTTP wrapper
│   ├── map-tool-handler.ts    # Shared map tool handler factory
│   ├── ogc-client.ts          # OGC API Features client
│   ├── response.ts            # Response formatting
│   └── wms-client.ts          # WMS client
├── tools/
│   ├── index.ts               # Tool registry
│   ├── query-point.ts         # Point queries (9 data types)
│   ├── get-map.ts             # Map rendering
│   ├── get-bedrock.ts         # Bedrock features
│   └── describe-layers.ts     # Layer metadata
└── types/
    ├── sgu-api.ts             # API response types
    └── common-schemas.ts      # Shared Zod schemas (bbox, corridor, point)
```

## SGU API Endpoints

| Service                    | URL                                                              | Notes                                            |
| -------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ |
| OGC API Features (bedrock) | `https://api.sgu.se/oppnadata/berggrund50k-250k/ogc/features/v1` | Returns GeoJSON                                  |
| WMS Bedrock                | `https://maps3.sgu.se/geoserver/berg/ows`                        | Layer: `SE.GOV.SGU.BERG.GEOLOGISK_ENHET.YTA.50K` |
| WMS Soil                   | `https://maps3.sgu.se/geoserver/jord/ows`                        | Layer: `SE.GOV.SGU.JORD.GRUNDLAGER.25K`          |
| WMS Groundwater            | `https://maps3.sgu.se/geoserver/ows`                             | Multiple layers                                  |

## Coordinate System

**Input:** WGS84 (EPSG:4326) - latitude/longitude
**Internal:** SWEREF99TM (EPSG:3006) - converted automatically

### WGS84 Input Examples

| City       | latitude | longitude |
| ---------- | -------- | --------- |
| Stockholm  | 59.33    | 18.07     |
| Gothenburg | 57.71    | 11.97     |
| Malmo      | 55.61    | 13.00     |
| Kiruna     | 67.86    | 20.23     |

**Valid range for Sweden:** 55-69°N, 11-24°E

## Development

```bash
npm run dev          # Start dev server (localhost:3000)
npm run typecheck    # Type check
npm run lint         # Lint
npm run prettier:fix # Format code
```
