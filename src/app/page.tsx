export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>SGU MCP Server</h1>
      <p>
        This is an MCP (Model Context Protocol) server that wraps the SGU (Sveriges Geologiska Undersökning) APIs for geological
        data in Sweden.
      </p>

      <h2>Available Tools</h2>
      <ul>
        <li>
          <strong>sgu_query</strong> - Query geological data at one or more points (9 data types, OGC area + WMS point)
        </li>
        <li>
          <strong>sgu_get_map</strong> - Get rendered map images for an area (WMS, multiple layer types)
        </li>
      </ul>

      <h2>Coordinate System</h2>
      <p>Input coordinates use WGS84 (latitude/longitude), converted internally to SWEREF99TM (EPSG:3006).</p>

      <h2>MCP Endpoints</h2>
      <ul>
        <li>
          <code>/mcp</code> - HTTP Streamable transport (recommended)
        </li>
        <li>
          <code>/sse</code> - SSE transport (legacy)
        </li>
      </ul>

      <h2>Data Source</h2>
      <p>
        Data is provided by{' '}
        <a href="https://www.sgu.se" target="_blank" rel="noopener noreferrer">
          Sveriges Geologiska Undersökning (SGU)
        </a>
        .
      </p>
    </main>
  );
}
