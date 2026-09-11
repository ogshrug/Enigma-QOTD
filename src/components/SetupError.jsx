export default function SetupError({ message }) {
  return (
    <div className="card">
      <h2>Database isn't ready</h2>
      <p>Couldn't reach your tables:</p>
      <pre className="muted" style={{ overflowX: 'auto' }}>{message}</pre>
      <p>Fix it in Supabase for project <b>obevkfvwefztcsmsglts</b>:</p>
      <ol>
        <li>
          Open <b>SQL Editor</b> in the Supabase dashboard, create a new query,
          paste the entire contents of the <code>supabase/schema.sql</code> file,
          and click <b>Run</b>.
        </li>
        <li>
          Enable <b>Authentication → Providers → Google</b> and add a Google Cloud
          OAuth client ID/secret (see README).
        </li>
        <li>Refresh this page.</li>
      </ol>
    </div>
  )
}