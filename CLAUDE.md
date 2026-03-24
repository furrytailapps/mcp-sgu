# mcp-sgu

> For shared patterns and coding standards, see parent CLAUDE.md.

MCP server wrapping Sveriges Geologiska Undersökning (SGU) APIs for geological data in Sweden.

## Production URL

https://mcp-sgu.vercel.app/mcp

## Tools

- `sgu_query_point` — Query geological data at coordinates (9 data types via enum)
- `sgu_get_map` — Get rendered map images (WMS, multiple layer types)
- `sgu_get_features` — Get geological features for an area (5 data types via OGC API, geometry detail levels)

## Quirks

- Input WGS84, OGC responses in WGS84 (no coordinate conversion for bbox queries)
- Corridor mode: converts to SWEREF99TM for buffer math only, converts bbox back to WGS84 for OGC query
- WMS tools (query-point, get-map) still use SWEREF99TM internally
- No environment variables needed (public APIs)
