# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that wraps the Sveriges Geologiska Undersökning (SGU) APIs for querying geological data in Sweden. Built with Next.js and TypeScript, targeting construction and infrastructure users.

## Build and Development

### Common Commands

- **Type checking**: `npm run typecheck`
- **Linting**: `npm run lint`
- **Format checking**: `npm run prettier`
- **Format fixing**: `npm run prettier:fix`
- **Development server**: `npm run dev`
- **Build**: `npm run build`

## Code Quality Checks

**After making any code changes, ALWAYS run these checks:**

1. `npm run prettier:fix` - Format code
2. `npm run typecheck` - Verify TypeScript types
3. `npm run lint` - Check code quality

## Project Structure

```
src/
├── app/              # Next.js app routes
│   └── [transport]/  # MCP transport endpoint
├── clients/          # API clients
│   └── sgu-client.ts # SGU API client
├── lib/              # Shared utilities
│   ├── errors.ts     # Error classes
│   ├── http-client.ts # HTTP wrapper
│   ├── response.ts   # Response helpers
│   ├── geometry-utils.ts # Bbox/corridor utilities
│   ├── ogc-client.ts # OGC API Features client
│   └── wms-client.ts # WMS client
├── tools/            # MCP tool definitions
│   ├── index.ts      # Tool registry
│   ├── get-bedrock.ts
│   ├── get-bedrock-map.ts
│   ├── get-soil-types-map.ts
│   └── get-soil-type-at-point.ts
└── types/            # TypeScript type definitions
    └── sgu-api.ts    # SGU API types
```

## TypeScript Configuration

- **Module imports**: Use `@/` path alias for src imports
- **Strict mode enabled**: All TypeScript strict checks are on
- **Never use `any`**: Always use proper types

## MCP Tool Patterns

All tools in `src/tools/` follow this pattern:

```typescript
import { z } from 'zod';
import { sguClient } from '@/clients/sgu-client';
import { withErrorHandling } from '@/lib/response';

// 1. Define Zod input schema
export const myToolInputSchema = {
  param1: z.string().describe('Description for Claude'),
};

// 2. Define tool metadata
export const myTool = {
  name: 'sgu_my_tool',
  description: 'Clear description of what this tool does',
  inputSchema: myToolInputSchema,
};

// 3. Define TypeScript input type
type MyToolInput = { param1: string };

// 4. Implement handler with error handling wrapper
export const myToolHandler = withErrorHandling(async (args: MyToolInput) => {
  const result = await sguClient.someMethod(args);
  return { data: result };
});
```

## Coordinate System

All coordinates use **SWEREF99TM (EPSG:3006)**, the Swedish national grid system:

- X = Easting (typically 200,000 - 1,000,000)
- Y = Northing (typically 6,100,000 - 7,700,000)

## SGU API Endpoints

- **OGC API Features (bedrock)**: `https://api.sgu.se/oppnadata/berggrund50k-250k/ogc/features/v1`
- **WMS Bedrock**: `https://maps3.sgu.se/geoserver/berg/ows` (layer: `SE.GOV.SGU.BERG.GEOLOGISK_ENHET.YTA.50K`)
- **WMS Soil Types**: `https://maps3.sgu.se/geoserver/jord/ows` (layer: `SE.GOV.SGU.JORD.GRUNDLAGER.25K`)

## Adding New Tools

1. Create a new file in `src/tools/` following the pattern above
2. Add the tool to the registry in `src/tools/index.ts`
3. Add any new client methods to `src/clients/sgu-client.ts`
4. Run typecheck and lint

## Error Handling

Use custom error classes from `@/lib/errors`:

```typescript
import { ValidationError, NotFoundError } from '@/lib/errors';

if (!requiredParam) {
  throw new ValidationError('param is required');
}
```

The `withErrorHandling` wrapper automatically catches and formats errors for MCP.
