import { createMcpHandler } from 'mcp-handler';
import { registerAllTools } from '@/tools';

const handler = createMcpHandler(
  (server) => {
    // Register all SGU tools
    registerAllTools(server);
  },
  {},
  {
    basePath: '/',
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV === 'development',
  },
);

export { handler as GET, handler as POST };
