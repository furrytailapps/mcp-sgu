# mcp-sgu

> For shared patterns and coding standards, see parent CLAUDE.md.

MCP server wrapping Sveriges Geologiska Undersökning (SGU) APIs for geological data in Sweden.

## Production URL

https://mcp-sgu.vercel.app/mcp

## Tools

- `sgu_query` — Query geological data at one or more points (9 data types, OGC area + WMS point)
- `sgu_get_map` — Get rendered map images (WMS, multiple layer types)

## Quirks

- Input WGS84, OGC responses in WGS84 (no coordinate conversion for bbox queries)
- sgu_query computes SWEREF99TM bbox from points + radiusKm, converts back to WGS84 for OGC
- WMS point queries use SWEREF99TM internally
- Landslide WMS uses 2km buffer (MinScaleDenominator constraint)
- No environment variables needed (public APIs)
