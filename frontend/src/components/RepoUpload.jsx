import { useState, useRef } from 'react'
import { Upload, Github, FileCode, Loader2, CheckCircle2 } from 'lucide-react'
import JSZip from 'jszip'
import './RepoUpload.css'

function RepoUpload({ onAnalysisComplete }) {
    const [uploadMethod, setUploadMethod] = useState('github')
    const [repoUrl, setRepoUrl] = useState('')
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState('')
    const [selectedFile, setSelectedFile] = useState(null)
    const fileInputRef = useRef(null)

    // Analyze actual ZIP file contents
    const analyzeZipFile = async (file) => {
        try {
            const zip = await JSZip.loadAsync(file)
            const files = []
            const fileContents = {}

            // Extract all files
            for (const [path, zipEntry] of Object.entries(zip.files)) {
                if (!zipEntry.dir && !path.includes('node_modules') && !path.includes('.git')) {
                    const ext = path.split('.').pop()
                    const validExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rb', 'php', 'css', 'html', 'json', 'md']

                    if (validExts.includes(ext)) {
                        const content = await zipEntry.async('string')
                        const fileName = path.split('/').pop()
                        const fileType = ['jsx', 'tsx', 'js', 'ts'].includes(ext) ? 'component' : ext

                        files.push({
                            name: fileName,
                            path: path,
                            type: fileType,
                            lines: content.split('\n').length,
                            content: content
                        })

                        fileContents[fileName] = content
                    }
                }
            }

            return { files, fileContents }
        } catch (error) {
            console.error('Error analyzing ZIP:', error)
            return { files: [], fileContents: {} }
        }
    }

    // Fetch real GitHub repository contents
    const analyzeGithubRepo = async (repoUrl) => {
        try {
            // Extract owner and repo from URL
            const urlParts = repoUrl.replace('https://github.com/', '').split('/')
            const owner = urlParts[0]
            const repo = urlParts[1]

            // Fetch repository tree via GitHub API
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`
            const response = await fetch(apiUrl)

            if (!response.ok) {
                // Try master branch if main fails
                const masterUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`
                const masterResponse = await fetch(masterUrl)
                if (!masterResponse.ok) throw new Error('Failed to fetch repository')
                const data = await masterResponse.json()
                return await processGithubTree(data.tree, owner, repo)
            }

            const data = await response.json()
            return await processGithubTree(data.tree, owner, repo)
        } catch (error) {
            console.error('Error fetching GitHub repo:', error)
            return { files: [], fileContents: {} }
        }
    }

    const processGithubTree = async (tree, owner, repo) => {
        const files = []
        const fileContents = {}
        const validExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rb', 'php', 'css', 'html', 'json', 'md']

        // Filter code files (fetch first 30 to respect rate limits)
        const codeFiles = tree.filter(item => {
            if (item.type !== 'blob') return false
            if (item.path.includes('node_modules') || item.path.includes('.git')) return false
            const ext = item.path.split('.').pop()
            return validExts.includes(ext)
        }).slice(0, 30)

        // Fetch content for each file
        for (const fileItem of codeFiles) {
            try {
                const contentUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${fileItem.path}`
                const contentResponse = await fetch(contentUrl)

                if (contentResponse.ok) {
                    const contentData = await contentResponse.json()
                    const content = atob(contentData.content) // Decode base64
                    const fileName = fileItem.path.split('/').pop()
                    const ext = fileName.split('.').pop()
                    const fileType = ['jsx', 'tsx', 'js', 'ts'].includes(ext) ? 'component' : ext

                    files.push({
                        name: fileName,
                        path: fileItem.path,
                        type: fileType,
                        lines: content.split('\n').length,
                        content: content
                    })

                    fileContents[fileName] = content
                }
            } catch (err) {
                console.error(`Error fetching ${fileItem.path}:`, err)
            }
        }

        return { files, fileContents }
    }

    // Generate learning path from actual file structure
    const generateRealLearningPath = (files) => {
        const hasIndex = files.find(f => f.name.includes('index') && (f.name.includes('.js') || f.name.includes('.html')))
        const hasApp = files.find(f => f.name.includes('App') && (f.name.includes('.jsx') || f.name.includes('.js')))
        const hasComponents = files.filter(f => f.type === 'component' && !f.name.includes('App')).length > 0
        const hasRoutes = files.find(f => f.path.includes('route') || f.name.includes('route'))
        const hasApi = files.find(f => f.path.includes('api') || f.path.includes('service'))

        const steps = []
        let stepId = 1

        if (hasIndex) {
            steps.push({
                id: stepId++,
                title: 'Start with the Entry Point',
                description: `Begin at ${hasIndex.name} to see how the application initializes`,
                files: [hasIndex.path],
                completed: false
            })
        }

        if (hasApp) {
            steps.push({
                id: stepId++,
                title: 'Explore Main Component',
                description: `Check out ${hasApp.name} to understand the main application structure`,
                files: [hasApp.path],
                completed: false
            })
        }

        if (hasComponents) {
            const componentFiles = files.filter(f => f.type === 'component' && !f.name.includes('App'))
            steps.push({
                id: stepId++,
                title: 'Review Components',
                description: 'Examine the reusable UI components and their structure',
                files: componentFiles.map(f => f.path).slice(0, 3),
                completed: false
            })
        }

        if (hasRoutes) {
            steps.push({
                id: stepId++,
                title: 'Understand Routing',
                description: 'See how the application handles navigation and routes',
                files: [hasRoutes.path],
                completed: false
            })
        }

        if (hasApi) {
            steps.push({
                id: stepId++,
                title: 'Explore API Layer',
                description: 'Review how the app communicates with backend services',
                files: [hasApi.path],
                completed: false
            })
        }

        return {
            title: 'Understanding This Codebase',
            steps: steps.length > 0 ? steps : generateMockLearningPath().steps
        }
    }

    const handleAnalyze = async (source) => {
        if (!source) return

        setIsAnalyzing(true)
        setProgress(0)

        // Simulate analysis process for prototype
        const steps = [
            { progress: 20, status: 'Extracting files...', delay: 800 },
            { progress: 40, status: 'Analyzing code structure...', delay: 1200 },
            { progress: 60, status: 'Processing with AI (AWS Bedrock)...', delay: 1500 },
            { progress: 80, status: 'Generating architecture diagram...', delay: 1000 },
            { progress: 100, status: 'Creating learning paths...', delay: 800 }
        ]

        for (const step of steps) {
            await new Promise(resolve => setTimeout(resolve, step.delay))
            setProgress(step.progress)
            setStatus(step.status)
        }

        let mockAnalysis

        // Check if source is a File object (ZIP upload)
        if (source instanceof File) {
            const zipAnalysis = await analyzeZipFile(source)
            const fileName = source.name.replace('.zip', '')

            mockAnalysis = {
                repoName: fileName,
                repoUrl: 'Uploaded ZIP',
                structure: {
                    files: zipAnalysis.files.length,
                    components: zipAnalysis.files.filter(f => f.type === 'component').length,
                    dependencies: Math.floor(zipAnalysis.files.length / 3),
                    linesOfCode: zipAnalysis.files.reduce((sum, f) => sum + f.lines, 0)
                },
                architecture: generateMockArchitecture(),
                codeFiles: zipAnalysis.files, // Show ALL files
                fileContents: zipAnalysis.fileContents,
                learningPath: generateRealLearningPath(zipAnalysis.files),
                insights: [
                    `Analyzed ${zipAnalysis.files.length} files from your uploaded project`,
                    'Detected modern JavaScript/TypeScript patterns',
                    `Total ${zipAnalysis.files.reduce((sum, f) => sum + f.lines, 0).toLocaleString()} lines of code`,
                    'Well-organized project structure with clear separation'
                ]
            }
        } else if (typeof source === 'string' && source.includes('github.com')) {
            // Fetch real GitHub repository contents
            const githubAnalysis = await analyzeGithubRepo(source)
            const repoName = source.split('/').pop()

            if (githubAnalysis.files.length > 0) {
                mockAnalysis = {
                    repoName: repoName,
                    repoUrl: source,
                    structure: {
                        files: githubAnalysis.files.length,
                        components: githubAnalysis.files.filter(f => f.type === 'component').length,
                        dependencies: Math.floor(githubAnalysis.files.length / 3),
                        linesOfCode: githubAnalysis.files.reduce((sum, f) => sum + f.lines, 0)
                    },
                    architecture: generateMockArchitecture(),
                    codeFiles: githubAnalysis.files,
                    fileContents: githubAnalysis.fileContents,
                    learningPath: generateMockLearningPath(),
                    insights: [
                        `Fetched ${githubAnalysis.files.length} files from GitHub repository`,
                        'Analyzed real repository structure and patterns',
                        `Total ${githubAnalysis.files.reduce((sum, f) => sum + f.lines, 0).toLocaleString()} lines of code`,
                        'Ready to explore actual repository code'
                    ]
                }
            } else {
                // Fall back to mock if API fails
                mockAnalysis = createMockAnalysis(repoName, source)
            }
        } else {
            // Mock analysis for invalid URLs
            const repoName = typeof source === 'string' ? source.split('/').pop() || 'Project' : 'Project'
            mockAnalysis = createMockAnalysis(repoName, source)
        }

        setStatus('Analysis complete!')
        setTimeout(() => {
            onAnalysisComplete(mockAnalysis)
            setIsAnalyzing(false)
            setSelectedFile(null)
        }, 500)
    }

    // Helper function for mock analysis
    const createMockAnalysis = (repoName, repoUrl) => {
        const repoStats = {
            'react': { files: 847, components: 156, dependencies: 45, loc: 184320 },
            'express': { files: 134, components: 28, dependencies: 31, loc: 12450 },
            'next.js': { files: 523, components: 89, dependencies: 67, loc: 98760 },
            'default': { files: 47, components: 12, dependencies: 23, loc: 3420 }
        }

        const repoKey = repoName.toLowerCase().replace('.js', '')
        const stats = repoStats[repoKey] || repoStats['default']

        return {
            repoName: repoName,
            repoUrl: typeof repoUrl === 'string' ? repoUrl : 'Unknown',
            structure: {
                files: stats.files,
                components: stats.components,
                dependencies: stats.dependencies,
                linesOfCode: stats.loc
            },
            architecture: generateMockArchitecture(),
            codeFiles: generateMockCodeFiles(),
            learningPath: generateMockLearningPath(),
            insights: [
                'This appears to be a React application with modern hooks',
                'Uses REST API architecture for backend communication',
                'Implements authentication using JWT tokens',
                'Well-structured component hierarchy with proper separation of concerns'
            ]
        }
    }

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (file && file.name.endsWith('.zip')) {
            setSelectedFile(file)
            handleAnalyze(file)
        }
    }

    return (
        <div className="repo-upload">
            <div className="upload-hero">
                <div className="hero-icon">
                    <FileCode size={48} />
                </div>
                <h2>Understand Any Codebase in Minutes</h2>
                <p className="text-muted">
                    Upload a repository and let AI guide you through its architecture,
                    patterns, and learning path.
                </p>
            </div>

            <div className="card upload-card">
                {/* Upload Method Selector */}
                <div className="method-selector">
                    <button
                        className={`method-btn ${uploadMethod === 'github' ? 'active' : ''}`}
                        onClick={() => setUploadMethod('github')}
                    >
                        <Github size={20} />
                        GitHub URL
                    </button>
                    <button
                        className={`method-btn ${uploadMethod === 'upload' ? 'active' : ''}`}
                        onClick={() => setUploadMethod('upload')}
                    >
                        <Upload size={20} />
                        Upload ZIP
                    </button>
                </div>

                {/* GitHub URL Input */}
                {uploadMethod === 'github' && (
                    <div className="input-group">
                        <input
                            type="text"
                            className="input"
                            placeholder="https://github.com/username/repository"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            disabled={isAnalyzing}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={() => handleAnalyze(repoUrl)}
                            disabled={isAnalyzing || !repoUrl.trim()}
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 size={18} className="spinner" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={18} />
                                    Analyze Repository
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* File Upload */}
                {uploadMethod === 'upload' && (
                    <div className="drop-zone" onClick={() => !isAnalyzing && fileInputRef.current?.click()}>
                        <Upload size={32} className="text-muted" />
                        <p>Drag & drop a ZIP file here, or click to browse</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".zip"
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                            disabled={isAnalyzing}
                        />
                        {selectedFile && !isAnalyzing && (
                            <p className="text-accent mt-md">Selected: {selectedFile.name}</p>
                        )}
                    </div>
                )}

                {/* Progress Indicator */}
                {isAnalyzing && (
                    <div className="progress-section animate-fade-in">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="progress-text">{status}</p>
                    </div>
                )}

                {/* Example Repos */}
                {!isAnalyzing && (
                    <div className="examples">
                        <p className="text-muted">Try these examples:</p>
                        <div className="example-buttons">
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setRepoUrl('https://github.com/facebook/react')
                                    setUploadMethod('github')
                                }}
                            >
                                React
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setRepoUrl('https://github.com/expressjs/express')
                                    setUploadMethod('github')
                                }}
                            >
                                Express.js
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setRepoUrl('https://github.com/vercel/next.js')
                                    setUploadMethod('github')
                                }}
                            >
                                Next.js
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Features */}
            <div className="features-grid">
                <div className="feature-card card">
                    <div className="feature-icon">🎯</div>
                    <h4>Smart Analysis</h4>
                    <p className="text-muted">
                        AI-powered code analysis using AWS Bedrock to understand structure and patterns
                    </p>
                </div>
                <div className="feature-card card">
                    <div className="feature-icon">🗺️</div>
                    <h4>Visual Architecture</h4>
                    <p className="text-muted">
                        Auto-generated interactive diagrams showing component relationships
                    </p>
                </div>
                <div className="feature-card card">
                    <div className="feature-icon">🧭</div>
                    <h4>Guided Learning</h4>
                    <p className="text-muted">
                        Personalized paths to understand the codebase step-by-step
                    </p>
                </div>
            </div>
        </div>
    )
}

// Mock data generators for prototype
function generateMockArchitecture() {
    return `graph TB
    A[User Interface] --> B[React Components]
    B --> C[State Management]
    C --> D[API Layer]
    D --> E[Backend Services]
    E --> F[Database]
    B --> G[Routing]
    D --> H[Authentication]
    
    style A fill:#6366f1
    style B fill:#8b5cf6
    style E fill:#ec4899`
}

function generateMockCodeFiles() {
    return [
        { name: 'App.jsx', path: 'src/App.jsx', type: 'component', lines: 145 },
        { name: 'index.js', path: 'src/index.js', type: 'entry', lines: 23 },
        { name: 'api.js', path: 'src/services/api.js', type: 'service', lines: 89 },
        { name: 'auth.js', path: 'src/utils/auth.js', type: 'utility', lines: 67 },
        { name: 'UserProfile.jsx', path: 'src/components/UserProfile.jsx', type: 'component', lines: 112 }
    ]
}

function generateMockLearningPath() {
    return {
        title: 'Understanding This Codebase',
        steps: [
            {
                id: 1,
                title: 'Start with the Entry Point',
                description: 'Begin at src/index.js to see how the application initializes',
                files: ['src/index.js'],
                completed: false
            },
            {
                id: 2,
                title: 'Explore Main Component',
                description: 'Check out App.jsx to understand the main application structure',
                files: ['src/App.jsx'],
                completed: false
            },
            {
                id: 3,
                title: 'Understand Data Flow',
                description: 'Review how data flows through the API layer',
                files: ['src/services/api.js'],
                completed: false
            },
            {
                id: 4,
                title: 'Learn Authentication',
                description: 'See how user authentication is implemented',
                files: ['src/utils/auth.js'],
                completed: false
            }
        ]
    }
}

export default RepoUpload
