import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { ZoomIn, ZoomOut, Maximize2, Info, Copy, CheckCheck } from 'lucide-react'
import './ArchitectureViewer.css'

function ArchitectureViewer({ data }) {
    const diagramRef = useRef(null)
    const [zoom, setZoom] = useState(1)
    const [selectedNode, setSelectedNode] = useState(null)
    const [copied, setCopied] = useState(false)
    const [statsVisible, setStatsVisible] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(data?.architecture || '').then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    useEffect(() => {
        if (!diagramRef.current || !data?.architecture) return
        diagramRef.current.innerHTML = ''

        const renderDiagram = async () => {
            try {
                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'dark',
                    securityLevel: 'loose',
                    flowchart: {
                        htmlLabels: true,    // HTML labels so nodes auto-size to text
                        curve: 'basis',
                        nodeSpacing: 60,
                        rankSpacing: 70,
                        padding: 20,
                    },
                    themeVariables: {
                        primaryColor: '#6366f1',
                        primaryTextColor: '#f9fafb',
                        primaryBorderColor: '#8b5cf6',
                        lineColor: '#6366f1',
                        secondaryColor: '#1f2937',
                        tertiaryColor: '#111827',
                        fontFamily: 'Inter, -apple-system, sans-serif',
                        fontSize: '14px',
                    },
                })

                const uniqueId = `mermaid-${Date.now()}`
                const { svg } = await mermaid.render(uniqueId, data.architecture)

                if (diagramRef.current) {
                    diagramRef.current.innerHTML = svg
                    const svgEl = diagramRef.current.querySelector('svg')
                    if (svgEl) {
                        // Render SVG at full natural size — never scale it down.
                        // The .diagram-container handles scrolling if the diagram is wide.
                        svgEl.removeAttribute('width')
                        svgEl.removeAttribute('height')
                        svgEl.style.minWidth = '500px'
                        svgEl.style.display = 'block'
                        svgEl.style.overflow = 'visible'
                    }
                    const nodes = diagramRef.current.querySelectorAll('.node')
                    nodes.forEach((node, index) => {
                        node.style.cursor = 'pointer'
                        node.addEventListener('click', () => {
                            setSelectedNode({
                                name: node.textContent?.trim(),
                                index,
                                description: getNodeDescription(node.textContent?.trim())
                            })
                        })
                    })
                }
            } catch (error) {
                console.error('Error rendering diagram:', error)
                if (diagramRef.current) {
                    diagramRef.current.innerHTML = `<div style="color:#9ca3af;text-align:center;padding:3rem">
                      <p>Unable to render architecture diagram</p>
                      <p style="font-size:0.875rem;margin-top:0.5rem">Error: ${error.message}</p>
                    </div>`
                }
            }
        }

        renderDiagram()
        setTimeout(() => setStatsVisible(true), 400)
    }, [data])

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2))
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5))
    const handleReset = () => setZoom(1)

    return (
        <div className="architecture-viewer">
            <div className="viewer-header">
                <div>
                    <h3>Architecture Overview</h3>
                    <p className="text-muted">
                        Visual representation of {data?.repoName || 'the codebase'} structure
                    </p>
                </div>
                <div className="viewer-controls">
                    <button className="btn btn-secondary" onClick={handleCopy} title="Copy Mermaid source">
                        {copied ? <CheckCheck size={18} /> : <Copy size={18} />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button className="btn btn-secondary" onClick={handleZoomOut} title="Zoom Out">
                        <ZoomOut size={18} />
                    </button>
                    <button className="btn btn-secondary" onClick={handleReset} title="Reset">
                        <Maximize2 size={18} />
                    </button>
                    <button className="btn btn-secondary" onClick={handleZoomIn} title="Zoom In">
                        <ZoomIn size={18} />
                    </button>
                </div>
            </div>

            <div className="diagram-container card">
                <div className="diagram-zoom-wrapper" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
                    <div ref={diagramRef} className="diagram-content" />
                </div>
            </div>

            {/* AI Insights */}
            <div className="insights-section">
                <div className="insights-header">
                    <Info size={20} />
                    <h4>AI-Generated Insights</h4>
                </div>
                <div className="insights-grid">
                    {data?.insights?.map((insight, index) => (
                        <div key={index} className="insight-card card animate-fade-in"
                            style={{ animationDelay: `${index * 100}ms` }}>
                            <div className="insight-icon">💡</div>
                            <p>{insight}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* AWS Tech Stack Badge Strip */}
            <div className="aws-badge-strip">
                <span className="aws-label">Powered by</span>
                {['☁️ AWS Bedrock', '⚡ Lambda', '🪣 S3', '🗄️ DynamoDB', '🌐 API Gateway', '🚀 CloudFront'].map(s => (
                    <span key={s} className="aws-badge-chip">{s}</span>
                ))}
            </div>

            {/* Stats */}
            <div className={`stats-grid ${statsVisible ? 'stats-visible' : ''}`}>
                <div className="stat-card card">
                    <div className="stat-value">{data?.structure?.files || 0}</div>
                    <div className="stat-label">Files</div>
                </div>
                <div className="stat-card card">
                    <div className="stat-value">{data?.structure?.components || 0}</div>
                    <div className="stat-label">Components</div>
                </div>
                <div className="stat-card card">
                    <div className="stat-value">{data?.structure?.dependencies || 0}</div>
                    <div className="stat-label">Dependencies</div>
                </div>
                <div className="stat-card card">
                    <div className="stat-value">{data?.structure?.linesOfCode?.toLocaleString() || 0}</div>
                    <div className="stat-label">Lines of Code</div>
                </div>
            </div>

            {/* Node Detail Modal */}
            {selectedNode && (
                <div className="modal-overlay" onClick={() => setSelectedNode(null)}>
                    <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
                        <h4>{selectedNode.name}</h4>
                        <p className="text-muted">{selectedNode.description}</p>
                        <button className="btn btn-primary mt-md" onClick={() => setSelectedNode(null)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function getNodeDescription(nodeName) {
    const descriptions = {
        'User Interface': 'The presentation layer where users interact with the application',
        'React Components': 'Reusable UI components built with React',
        'State Management': 'Centralized application state handling',
        'API Layer': 'Abstraction layer for backend communication',
        'Backend Services': 'Server-side business logic and data processing',
        'Database': 'Persistent data storage',
        'Routing': 'Application navigation and URL handling',
        'Authentication': 'User identity verification and authorization'
    }
    return descriptions[nodeName] || 'Component in the application architecture'
}

export default ArchitectureViewer
