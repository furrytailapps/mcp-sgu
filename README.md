# SGU MCP Server

An MCP (Model Context Protocol) server that provides access to geological data from [Sveriges Geologiska Undersökning (SGU)](https://www.sgu.se) - the Geological Survey of Sweden.

Built for [Yesper.ai](https://yesper.ai), targeting users in construction and infrastructure in Sweden.

## Features

- **Bedrock geology data** - Get rock types, geological units, and lithology for any area
- **Soil types mapping** - Visualize quaternary deposits (clay, sand, gravel, moraine, peat)
- **Point queries** - Get soil type information at specific coordinates
- **Corridor support** - Query along linear infrastructure routes (roads, railways, pipelines)

## Available Tools

| Tool                         | Description                                                 |
| ---------------------------- | ----------------------------------------------------------- |
| `sgu_get_bedrock`            | Get bedrock geology features for an area (OGC API Features) |
| `sgu_get_bedrock_map`        | Get a rendered map image URL of bedrock geology (WMS)       |
| `sgu_get_soil_types_map`     | Get a rendered map image URL of soil types (WMS)            |
| `sgu_get_soil_type_at_point` | Get soil type at a specific coordinate (WMS GetFeatureInfo) |

## Coordinate System

All coordinates use **SWEREF99TM (EPSG:3006)**, the Swedish national grid:

- X = Easting (meters)
- Y = Northing (meters)

Example coordinates for Stockholm: `X: 674000, Y: 6580000`

## Installation

### Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "sgu": {
      "url": "https://mcp-sgu.vercel.app/mcp"
    }
  }
}
```

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint
```

## Usage Examples

### Get bedrock data for an area

```json
{
  "tool": "sgu_get_bedrock",
  "input": {
    "bbox": {
      "minX": 674000,
      "minY": 6580000,
      "maxX": 675000,
      "maxY": 6581000
    },
    "limit": 50
  }
}
```

### Get a bedrock map

```json
{
  "tool": "sgu_get_bedrock_map",
  "input": {
    "bbox": {
      "minX": 674000,
      "minY": 6580000,
      "maxX": 680000,
      "maxY": 6586000
    },
    "width": 1024,
    "height": 768
  }
}
```

### Query along a corridor

```json
{
  "tool": "sgu_get_bedrock",
  "input": {
    "corridor": {
      "coordinates": [
        [674000, 6580000],
        [675000, 6581000],
        [676000, 6582000]
      ],
      "bufferMeters": 500
    }
  }
}
```

### Get soil type at a point

```json
{
  "tool": "sgu_get_soil_type_at_point",
  "input": {
    "x": 674500,
    "y": 6580500
  }
}
```

## Data Sources

All data is provided by [Sveriges Geologiska Undersökning (SGU)](https://www.sgu.se):

- **Bedrock map 50-250k** - Geological bedrock data
- **Soil types map 25-100k** - Quaternary deposits

## MCP Endpoints

- `/mcp` - HTTP Streamable transport (recommended)
- `/sse` - SSE transport (legacy)

## License

MIT

## Author

[Yesper](https://yesper.ai)
