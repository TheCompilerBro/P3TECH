import { useState } from 'react'
import './App.css'
import RepoUpload from './components/RepoUpload'
import ArchitectureViewer from './components/ArchitectureViewer'
import CodeExplorer from './components/CodeExplorer'
import AIChat from './components/AIChat'
import LearningPath from './components/LearningPath'
import { Code2, Brain, Sparkles } from 'lucide-react'

function App() {
  const [analysisData, setAnalysisData] = useState(() => {
    try {
      const saved = localStorage.getItem('p3_analysisData')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('p3_activeTab') || 'upload'
  })
  const [showDocs, setShowDocs] = useState(false)
  const [selectedFilePath, setSelectedFilePath] = useState(null)

  const handleAnalysisComplete = (data) => {
    setAnalysisData(data)
    localStorage.setItem('p3_analysisData', JSON.stringify(data))
    setActiveTab('architecture')
    localStorage.setItem('p3_activeTab', 'architecture')
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    localStorage.setItem('p3_activeTab', tab)
  }

  const handleGetStarted = () => {
    setActiveTab('upload')
    localStorage.setItem('p3_activeTab', 'upload')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleNavigateToFile = (tab, filePath) => {
    setActiveTab(tab)
    localStorage.setItem('p3_activeTab', tab)
    setSelectedFilePath(filePath)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header glass">
        <div className="container">
          <div className="header-content">
            <div className="logo" onClick={handleGetStarted} title="Go to Home" style={{ cursor: 'pointer', userSelect: 'none' }}>
              <Code2 size={36} className="logo-icon" />
              <div>
                <h1 className="logo-text">P3 Tech</h1>
                <p className="logo-subtitle">AI-Powered Codebase Learning</p>
              </div>
            </div>
            <div className="header-actions">
              <button className="btn btn-secondary" onClick={() => setShowDocs(true)}>
                <Brain size={18} />
                Documentation
              </button>
              <button className="btn btn-primary" onClick={handleGetStarted}>
                <Sparkles size={18} />
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="container">
          {/* Navigation Tabs */}
          {analysisData && (
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => handleTabChange('upload')}
              >
                Upload
              </button>
              <button
                className={`tab ${activeTab === 'architecture' ? 'active' : ''}`}
                onClick={() => handleTabChange('architecture')}
              >
                Architecture
              </button>
              <button
                className={`tab ${activeTab === 'explorer' ? 'active' : ''}`}
                onClick={() => handleTabChange('explorer')}
              >
                Code Explorer
              </button>
              <button
                className={`tab ${activeTab === 'learning' ? 'active' : ''}`}
                onClick={() => handleTabChange('learning')}
              >
                Learning Path
              </button>
              <button
                className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => handleTabChange('chat')}
              >
                AI Chat
              </button>
            </div>
          )}

          {/* Tab Content */}
          <div className="tab-content animate-fade-in">
            {activeTab === 'upload' && (
              <RepoUpload onAnalysisComplete={handleAnalysisComplete} />
            )}
            {activeTab === 'architecture' && analysisData && (
              <ArchitectureViewer data={analysisData} />
            )}
            {activeTab === 'explorer' && analysisData && (
              <CodeExplorer data={analysisData} initialFilePath={selectedFilePath} />
            )}
            {activeTab === 'learning' && analysisData && (
              <LearningPath data={analysisData} onNavigate={handleNavigateToFile} />
            )}
            {activeTab === 'chat' && analysisData && (
              <AIChat data={analysisData} />
            )}
          </div>
        </div>
      </main>

      {/* Documentation Modal */}
      {showDocs && (
        <div className="modal-overlay" onClick={() => setShowDocs(false)}>
          <div className="docs-modal card" onClick={(e) => e.stopPropagation()}>
            <div className="docs-header">
              <h2>P3 Documentation</h2>
              <button className="btn btn-secondary" onClick={() => setShowDocs(false)}>
                Close
              </button>
            </div>

            <div className="docs-content">
              <section>
                <h3>🚀 Getting Started</h3>
                <p>P3 (Programmer's Path Planner) helps you understand any codebase in minutes using AI-powered analysis. Whether you're joining a new team, contributing to open source, or learning from examples, P3 creates personalized learning journeys through code.</p>

                <h4>Quick Start Guide</h4>
                <ol>
                  <li><strong>Upload Your Code</strong>
                    <ul>
                      <li>Paste a GitHub repository URL (e.g., https://github.com/facebook/react)</li>
                      <li>Or upload a ZIP file of your project</li>
                      <li>Try example repos: React, Express.js, Next.js</li>
                    </ul>
                  </li>
                  <li><strong>AI Analysis</strong>
                    <ul>
                      <li>Watch as AI processes your code structure</li>
                      <li>Powered by AWS Bedrock (Claude 3 Sonnet)</li>
                      <li>Typically completes in seconds</li>
                    </ul>
                  </li>
                  <li><strong>Explore & Learn</strong>
                    <ul>
                      <li>Navigate through 5 interactive tabs</li>
                      <li>Follow guided learning paths</li>
                      <li>Ask questions via AI chat</li>
                    </ul>
                  </li>
                </ol>
              </section>

              <section>
                <h3>✨ Features Overview</h3>

                <div className="feature-doc">
                  <h4>📊 Architecture Viewer</h4>
                  <p><strong>Auto-generated visual diagrams</strong> of your codebase structure using Mermaid.js.</p>
                  <ul>
                    <li><strong>Interactive Visualization:</strong> Click on components to see descriptions</li>
                    <li><strong>Zoom Controls:</strong> Zoom in/out to explore details or get overview</li>
                    <li><strong>AI Insights:</strong> Get key architectural observations below the diagram</li>
                    <li><strong>Stats Dashboard:</strong> See file counts, components, dependencies, lines of code</li>
                  </ul>
                  <p><em>Tip: Use the maximize button to reset zoom level</em></p>
                </div>

                <div className="feature-doc">
                  <h4>💻 Code Explorer</h4>
                  <p><strong>Professional code viewer</strong> with syntax highlighting powered by Monaco Editor (same engine as VS Code).</p>
                  <ul>
                    <li><strong>File Tree Navigation:</strong> Browse project structure with expand/collapse folders</li>
                    <li><strong>Syntax Highlighting:</strong> Color-coded for JavaScript, TypeScript, and more</li>
                    <li><strong>AI Explanations:</strong> Each file includes AI-generated purpose and context</li>
                    <li><strong>File Metadata:</strong> See file type, line count, and location</li>
                  </ul>
                  <p><em>Tip: Click any file in the tree to view its contents and explanation</em></p>
                </div>

                <div className="feature-doc">
                  <h4>🧭 Learning Path</h4>
                  <p><strong>AI-generated step-by-step guide</strong> to understand the codebase systematically.</p>
                  <ul>
                    <li><strong>Structured Journey:</strong> Follow logical steps from entry point to advanced features</li>
                    <li><strong>Progress Tracking:</strong> Mark steps complete as you learn</li>
                    <li><strong>AI Guidance:</strong> Get tips and pointers for each learning step</li>
                    <li><strong>File References:</strong> See exactly which files to study at each step</li>
                    <li><strong>Quick Navigation:</strong> Click "Open in Code Explorer" to jump directly to relevant code</li>
                  </ul>
                  <p><em>Tip: Complete all steps for a celebration and solid understanding!</em></p>
                </div>

                <div className="feature-doc">
                  <h4>💬 AI Chat</h4>
                  <p><strong>Context-aware Q&A</strong> about your codebase powered by AWS Bedrock.</p>
                  <ul>
                    <li><strong>Smart Responses:</strong> AI understands your entire codebase context</li>
                    <li><strong>Suggested Questions:</strong> Get started with pre-built queries</li>
                    <li><strong>Ask Anything:</strong> Authentication, architecture, data flow, dependencies, etc.</li>
                    <li><strong>Conversational:</strong> Follow-up questions maintain context</li>
                  </ul>
                  <p><em>Try asking: "How does authentication work?" or "Explain the architecture pattern"</em></p>
                </div>
              </section>

              <section>
                <h3>🔧 Technology Stack</h3>
                <p>P3 demonstrates cutting-edge AI integration with production-ready architecture:</p>

                <h4>AWS Services (7 integrated)</h4>
                <ul>
                  <li><strong>AWS Bedrock:</strong> Claude 3 Sonnet for intelligent code analysis and Q&A</li>
                  <li><strong>Lambda:</strong> Serverless compute for repository processing and AI operations</li>
                  <li><strong>S3:</strong> Durable storage for uploaded repositories and assets</li>
                  <li><strong>DynamoDB:</strong> Fast NoSQL database for analysis caching (90% cost reduction)</li>
                  <li><strong>API Gateway:</strong> RESTful API endpoints with rate limiting and auth</li>
                  <li><strong>CloudFront:</strong> Global CDN for low-latency content delivery</li>
                  <li><strong>Amplify:</strong> Simplified deployment and hosting infrastructure</li>
                </ul>

                <h4>Frontend Technologies</h4>
                <ul>
                  <li><strong>React 18:</strong> Modern UI framework with hooks and suspense</li>
                  <li><strong>Vite:</strong> Lightning-fast build tool and dev server</li>
                  <li><strong>Monaco Editor:</strong> VS Code's editor for professional code viewing</li>
                  <li><strong>Mermaid.js:</strong> Beautiful diagram generation from text</li>
                  <li><strong>Lucide React:</strong> Clean, consistent icon system</li>
                </ul>

                <h4>Design Philosophy</h4>
                <ul>
                  <li><strong>Dark Theme:</strong> Optimized for developer workflows</li>
                  <li><strong>Glassmorphism:</strong> Modern frosted glass effects with depth</li>
                  <li><strong>Smooth Animations:</strong> Micro-interactions enhance UX without distraction</li>
                  <li><strong>Responsive:</strong> Works beautifully on all screen sizes</li>
                </ul>
              </section>

              <section>
                <h3>💡 Tips & Best Practices</h3>
                <ul>
                  <li><strong>Start with Examples:</strong> Try React, Express, or Next.js to see different patterns</li>
                  <li><strong>Follow Learning Paths:</strong> More effective than random exploration</li>
                  <li><strong>Use AI Chat:</strong> Ask specific questions for targeted learning</li>
                  <li><strong>Mark Progress:</strong> Track completed steps in Learning Path</li>
                  <li><strong>Zoom Diagrams:</strong> Explore architecture at different detail levels</li>
                  <li><strong>Read AI Insights:</strong> Key observations save hours of manual analysis</li>
                </ul>
              </section>

              <section>
                <h3>🎯 Use Cases</h3>
                <ul>
                  <li><strong>Onboarding:</strong> New team members understand codebases 70% faster</li>
                  <li><strong>Open Source:</strong> Contributors quickly grasp project structure</li>
                  <li><strong>Learning:</strong> Students study real-world code with guided paths</li>
                  <li><strong>Code Review:</strong> Understand PR context before reviewing</li>
                  <li><strong>Documentation:</strong> Generate architecture documentation automatically</li>
                </ul>
              </section>

              <section>
                <h3>🔐 Privacy & Data</h3>
                <p>Your code is analyzed securely:</p>
                <ul>
                  <li>Repositories stored in private S3 buckets</li>
                  <li>Analysis cached in DynamoDB with 7-day TTL</li>
                  <li>AWS Bedrock processes code without permanent storage</li>
                  <li>No data sharing with third parties</li>
                </ul>
              </section>

              <section>
                <h3>📞 Support & Feedback</h3>
                <p>Questions or issues? We're here to help:</p>
                <ul>
                  <li>GitHub Issues: Report bugs or request features</li>
                  <li>Email: support@p3.dev (example)</li>
                  <li>Documentation: Full guides at docs.p3.dev (example)</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p className="text-muted text-center">
            Built with AWS Bedrock, Lambda, S3, and DynamoDB • Hackathon 2026 • P3 Tech
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
