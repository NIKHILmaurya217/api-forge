export default function About() {
  return (
    <div className="page-fade">
      <div className="page-header">
        <h1>About</h1>
        <p>APIforge — College Mini Project</p>
      </div>
      <div className="page-body">
        <div className="about-section">
          <h2>What is APIforge?</h2>
          <p>
            APIforge is a college mini project that demonstrates automatic LLM model routing.
            Given a user prompt, it classifies the task type and estimates complexity, then
            selects the most appropriate free model from OpenRouter using a defined scoring algorithm.
          </p>
          <p>
            The goal of this project is to show that intelligent routing can reduce latency and
            improve response quality without requiring manual model selection by the user.
          </p>

          <h2>How It Works</h2>
          <p>Each request goes through the following pipeline:</p>
          <ul>
            <li><strong>Task Classification</strong> — The prompt is pattern-matched to identify its type: <code>CODING</code>, <code>MATH</code>, <code>WRITING</code>, <code>ANALYSIS</code>, or <code>GENERAL</code>.</li>
            <li><strong>Complexity Estimation</strong> — A score (0–100) is computed from prompt length, vocabulary, structural cues, and domain-specific terms.</li>
            <li><strong>Model Scoring</strong> — Each available free model is scored on three criteria: task compatibility, context capacity, and complexity fit.</li>
            <li><strong>Model Selection</strong> — The highest-scoring model receives the request. If it fails, the next best model is used as a fallback.</li>
            <li><strong>History Storage</strong> — The full routing decision and response are stored locally in a SQLite database.</li>
          </ul>

          <h2>Scoring Algorithm</h2>
          <p>Each model receives a score out of 100 points:</p>
          <ul>
            <li><strong>Task compatibility</strong> — 40 pts. Does this model family specialise in the detected task type?</li>
            <li><strong>Context capacity</strong> — 30 pts. Does this model have enough context window for the prompt?</li>
            <li><strong>Complexity fit</strong> — 30 pts. Is the model large enough for the estimated complexity level?</li>
          </ul>
          {/* <p>
            The model with the highest total score is selected. This is not a claim that the selected model
            is objectively the "best" — it is the model that scored highest according to APIforge's defined criteria.
          </p> */}

          <h2>Technology Stack</h2>
          <ul>
            <li>Backend: Node.js + Express</li>
            <li>Database: SQLite (better-sqlite3)</li>
            <li>Frontend: React + Vite</li>
            <li>Charts: Recharts</li>
            <li>LLM API: OpenRouter (free tier)</li>
          </ul>

          <h2>Limitations</h2>
          <ul>
            <li>Task classification uses keyword heuristics, not a learned classifier.</li>
            <li>Complexity estimation is rule-based, not empirically calibrated.</li>
            <li>Model availability depends on OpenRouter's free tier, which may change.</li>
            <li>The routing algorithm is not benchmarked against a ground-truth dataset.</li>
          </ul>

          <h2>Data</h2>
          <p>
            All requests and responses are stored locally in <code>backend/data/apiforge.db</code>.
            No data is sent to any external service other than OpenRouter.
          </p>
        </div>
      </div>
    </div>
  );
}
