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
          <strong>sgu_get_bedrock</strong> - Get bedrock geology data for an area (OGC API Features)
        </li>
        <li>
          <strong>sgu_get_bedrock_map</strong> - Get a rendered map image URL of bedrock geology (WMS)
        </li>
        <li>
          <strong>sgu_get_soil_types_map</strong> - Get a rendered map image URL of soil types (WMS)
        </li>
        <li>
          <strong>sgu_get_soil_type_at_point</strong> - Get soil type information at a specific coordinate (WMS GetFeatureInfo)
        </li>
      </ul>

      <h2>Coordinate System</h2>
      <p>All coordinates use SWEREF99TM (EPSG:3006), the Swedish national grid system.</p>

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
