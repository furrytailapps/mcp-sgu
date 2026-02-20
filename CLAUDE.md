# mcp-sgu

> For shared patterns and coding standards, see parent CLAUDE.md.

MCP server wrapping Sveriges Geologiska Undersökning (SGU) APIs for geological data in Sweden.

## Production URL

https://mcp-sgu.vercel.app/mcp

## Tools

- `sgu_query_point` — Query geological data at coordinates (9 data types via enum)
- `sgu_get_map` — Get rendered map images (WMS, multiple layer types)
- `sgu_get_bedrock` — Get bedrock features for an area (OGC API Features)
- `sgu_describe_layers` — Describe available map layers and their metadata

## Quirks

- Input WGS84, internal SWEREF99TM (auto-converts via proj4)
- No environment variables needed (public APIs)
