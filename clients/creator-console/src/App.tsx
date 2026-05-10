export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>CreatorMesh Console</h1>
        <span className="badge badge-mock">Local Mock Mode</span>
      </header>
      <main className="app-main">
        <p className="safety-note">
          Safety: No real Notion or Anthropic API calls are made in this build.
          All workflow execution is local and deterministic mock data.
        </p>
      </main>
    </div>
  )
}
