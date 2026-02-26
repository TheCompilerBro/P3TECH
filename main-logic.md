# P3TECh - Main Logic Implementation

## Core Application Flow

### 1. Repository Upload Flow

```javascript
// Main upload orchestration
async function handleRepositoryUpload(input) {
  const { type, url, file, userId } = input;
  
  // Step 1: Validate input
  const validation = validateInput(type, url, file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  // Step 2: Generate analysis ID
  const analysisId = generateUUID();
  
  // Step 3: Process repository based on type
  let repoPath;
  if (type === 'github') {
    repoPath = await cloneGitHubRepository(url);
  } else if (type === 'zip') {
    repoPath = await extractZipFile(file);
  }
  
  // Step 4: Build file tree structure
  const structure = await buildFileTree(repoPath);
  
  // Step 5: Upload to S3
  await uploadRepositoryToS3(repoPath, userId, analysisId);
  
  // Step 6: Trigger async analysis
  await triggerCodeAnalysis(analysisId, structure);
  
  // Step 7: Return immediate response
  return {
    analysisId,
    status: 'processing',
    estimatedTime: estimateAnalysisTime(structure)
  };
}
```

### 2. Code Analysis Engine

```javascript
// Main AI analysis logic
async function analyzeCodebase(analysisId, structure) {
  try {
    // Step 1: Check cache first
    const cached = await getCachedAnalysis(analysisId);
    if (cached) {
      return cached;
    }
    
    // Step 2: Prepare code context
    const context = await prepareCodeContext(structure, analysisId);
    
    // Step 3: Parallel AI calls to AWS Bedrock
    const [insights, architecture, learningPath, fileAnalyses] = await Promise.all([
      generateInsights(context),
      generateArchitectureDiagram(context),
      generateLearningPath(context),
      analyzeKeyFiles(context)
    ]);
    
    // Step 4: Process and structure results
    const analysis = {
      analysisId,
      repoName: extractRepoName(structure),
      structure,
      insights,
      architecture,
      learningPath,
      files: fileAnalyses,
      createdAt: Date.now(),
      ttl: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    };
    
    // Step 5: Store in DynamoDB
    await saveAnalysis(analysis);
    
    // Step 6: Update status
    await updateAnalysisStatus(analysisId, 'completed');
    
    return analysis;
    
  } catch (error) {
    await updateAnalysisStatus(analysisId, 'failed', error.message);
    throw error;
  }
}
```

### 3. File Tree Builder

```javascript
// Recursive file tree construction
function buildFileTree(rootPath, ignoredPatterns = []) {
  const tree = {
    type: 'directory',
    name: 'root',
    path: '/',
    children: []
  };
  
  function traverseDirectory(currentPath, parentNode) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      // Skip ignored files/directories
      if (shouldIgnore(entry.name, ignoredPatterns)) {
        continue;
      }
      
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootPath, fullPath);
      
      if (entry.isDirectory()) {
        const dirNode = {
          type: 'directory',
          name: entry.name,
          path: relativePath,
          children: []
        };
        parentNode.children.push(dirNode);
        traverseDirectory(fullPath, dirNode);
      } else {
        const fileNode = {
          type: 'file',
          name: entry.name,
          path: relativePath,
          size: fs.statSync(fullPath).size,
          language: detectLanguage(entry.name)
        };
        parentNode.children.push(fileNode);
      }
    }
  }
  
  traverseDirectory(rootPath, tree);
  return tree;
}

// Ignore common files
function shouldIgnore(filename, customPatterns = []) {
  const defaultIgnore = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
    '.env',
    '*.log',
    '.DS_Store'
  ];
  
  const patterns = [...defaultIgnore, ...customPatterns];
  return patterns.some(pattern => minimatch(filename, pattern));
}
```

### 4. AWS Bedrock Integration

```javascript
// AI-powered insights generation
async function generateInsights(codeContext) {
  const prompt = buildInsightsPrompt(codeContext);
  
  const bedrockParams = {
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7
    })
  };
  
  const response = await bedrockRuntime.invokeModel(bedrockParams).promise();
  const result = JSON.parse(new TextDecoder().decode(response.body));
  
  return parseInsightsResponse(result.content[0].text);
}

// Prompt template for insights
function buildInsightsPrompt(context) {
  return `You are an expert software architect analyzing a codebase.

Repository Structure:
${JSON.stringify(context.structure, null, 2)}

Key Files Preview:
${context.keyFiles.map(f => `${f.path}:\n${f.preview}`).join('\n\n')}

Package Dependencies:
${JSON.stringify(context.dependencies, null, 2)}

Tasks:
1. Identify the framework and architecture pattern used
2. Determine the main entry point(s)
3. List the core components and their responsibilities
4. Assess overall code quality and complexity (1-10 scale)
5. Provide 5 key insights for a developer new to this codebase
6. Suggest 3 recommendations for improvement

Respond ONLY with valid JSON in this exact format:
{
  "framework": "string (e.g., 'React 18 with Vite')",
  "architecture": "string (e.g., 'Component-based SPA')",
  "entryPoint": "string (file path)",
  "components": [
    {
      "name": "string",
      "role": "string",
      "files": ["array of file paths"]
    }
  ],
  "complexity": number (1-10),
  "insights": ["array of 5 strings"],
  "recommendations": ["array of 3 strings"]
}`;
}
```

### 5. Learning Path Generator

```javascript
// Generate personalized learning roadmap
async function generateLearningPath(codeContext) {
  const prompt = `Based on this codebase analysis, create a step-by-step learning path.

Framework: ${codeContext.insights.framework}
Architecture: ${codeContext.insights.architecture}
Entry Point: ${codeContext.insights.entryPoint}
Components: ${JSON.stringify(codeContext.insights.components)}

Create 5-10 progressive learning steps that guide a developer from basics to advanced.
Each step should:
- Build on previous steps
- Focus on a specific aspect
- Reference 1-3 specific files
- Include a clear description

Respond with JSON array:
[
  {
    "id": "step-1",
    "title": "string",
    "description": "string (2-3 sentences)",
    "files": ["array of file paths"],
    "estimatedTime": number (minutes),
    "difficulty": "beginner|intermediate|advanced"
  }
]`;

  const response = await invokeBedrockModel(prompt);
  const steps = JSON.parse(response);
  
  // Add status tracking
  return steps.map(step => ({
    ...step,
    status: 'not_started',
    completedAt: null
  }));
}
```

### 6. Architecture Diagram Generator

```javascript
// Generate Mermaid diagram
async function generateArchitectureDiagram(codeContext) {
  const prompt = `Generate a Mermaid diagram showing the architecture of this codebase.

Insights:
${JSON.stringify(codeContext.insights, null, 2)}

Requirements:
- Use 'graph LR' for left-to-right flow
- Maximum 12 nodes for clarity
- Show data/control flow with arrows
- Use descriptive labels
- Group related components in subgraphs if applicable
- Include database/API/external service nodes if relevant

Output ONLY valid Mermaid syntax, no markdown code blocks or explanation.
Start directly with 'graph LR'`;

  const mermaidCode = await invokeBedrockModel(prompt);
  
  // Validate Mermaid syntax
  const validated = validateMermaidSyntax(mermaidCode);
  
  return validated;
}

function validateMermaidSyntax(code) {
  // Basic validation
  if (!code.startsWith('graph ')) {
    throw new Error('Invalid mermaid diagram format');
  }
  
  // Remove any markdown code fences if present
  let cleaned = code.replace(/```mermaid\n?/g, '').replace(/```\n?/g, '');
  
  return cleaned.trim();
}
```

### 7. File Analysis

```javascript
// Analyze individual files
async function analyzeKeyFiles(codeContext) {
  const { structure, insights } = codeContext;
  
  // Identify important files
  const keyFiles = identifyKeyFiles(structure, insights);
  
  // Analyze in batches to optimize Bedrock calls
  const batchSize = 5;
  const batches = chunk(keyFiles, batchSize);
  
  const analyses = [];
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(file => analyzeFile(file, insights))
    );
    analyses.push(...batchResults);
  }
  
  return analyses;
}

async function analyzeFile(file, contextInsights) {
  const content = await readFileContent(file.path);
  
  const prompt = `Analyze this code file for a developer learning the codebase.

File: ${file.path}
Language: ${file.language}

Code:
\`\`\`${file.language}
${content.slice(0, 5000)} // Truncate for token limit
\`\`\`

Codebase Context:
- Framework: ${contextInsights.framework}
- Architecture: ${contextInsights.architecture}

Provide:
1. A concise explanation (2-3 sentences) of what this file does
2. Its role in the overall architecture
3. Complexity score (1-10)
4. Importance level: "critical" | "normal" | "low"
5. Key concepts a developer should understand

Respond with JSON:
{
  "explanation": "string",
  "role": "string",
  "complexity": number,
  "importance": "critical|normal|low",
  "keyConcepts": ["array of strings"]
}`;

  const response = await invokeBedrockModel(prompt);
  const analysis = JSON.parse(response);
  
  return {
    fileId: `${file.analysisId}#${file.path}`,
    filePath: file.path,
    language: file.language,
    ...analysis,
    analyzedAt: Date.now()
  };
}

// Identify which files are most important
function identifyKeyFiles(structure, insights) {
  const important = [];
  
  // 1. Entry point
  if (insights.entryPoint) {
    important.push({ path: insights.entryPoint, reason: 'entry_point' });
  }
  
  // 2. Configuration files
  const configFiles = ['package.json', 'tsconfig.json', 'vite.config.js', 'webpack.config.js'];
  findFiles(structure, configFiles, important);
  
  // 3. Component files from insights
  insights.components.forEach(comp => {
    comp.files.forEach(f => important.push({ path: f, reason: 'component' }));
  });
  
  // 4. Main application files
  const mainFiles = ['App.jsx', 'App.tsx', 'index.js', 'main.js', 'main.py', 'server.js'];
  findFiles(structure, mainFiles, important);
  
  return [...new Set(important.map(f => f.path))].map(path => ({ path }));
}
```

### 8. Q&A Chat Engine

```javascript
// Handle user questions about codebase
async function handleChatQuestion(analysisId, message, conversationId) {
  // Step 1: Load analysis context
  const analysis = await loadAnalysis(analysisId);
  
  // Step 2: Load conversation history
  const history = await loadConversationHistory(conversationId);
  
  // Step 3: Build contextual prompt
  const prompt = buildQAPrompt(message, analysis, history);
  
  // Step 4: Get AI response
  const response = await invokeBedrockModel(prompt);
  
  // Step 5: Extract file references
  const references = extractFileReferences(response, analysis);
  
  // Step 6: Generate suggested follow-up questions
  const suggestedQuestions = await generateSuggestedQuestions(message, response, analysis);
  
  // Step 7: Save to conversation history
  await saveConversationMessage(conversationId, {
    role: 'user',
    content: message,
    timestamp: Date.now()
  });
  
  await saveConversationMessage(conversationId, {
    role: 'assistant',
    content: response,
    references,
    timestamp: Date.now()
  });
  
  return {
    conversationId,
    response,
    references,
    suggestedQuestions
  };
}

function buildQAPrompt(message, analysis, history) {
  const historyText = history
    .slice(-5) // Last 5 messages for context
    .map(m => `${m.role}: ${m.content}`)
    .join('\n\n');
  
  return `You are a helpful coding assistant answering questions about a codebase.

Codebase Context:
- Name: ${analysis.repoName}
- Framework: ${analysis.insights.framework}
- Architecture: ${analysis.insights.architecture}
- Entry Point: ${analysis.insights.entryPoint}
- Components: ${JSON.stringify(analysis.insights.components)}

File Structure:
${JSON.stringify(analysis.structure, null, 2)}

Conversation History:
${historyText}

User Question: ${message}

Instructions:
- Answer based ONLY on the provided codebase context
- Reference specific files and line numbers when relevant
- Use code examples with proper syntax highlighting
- Be concise but thorough (2-4 paragraphs max)
- If you don't have enough information, say so clearly
- Format code snippets in markdown

Answer:`;
}

// Extract file references from AI response
function extractFileReferences(response, analysis) {
  const references = [];
  const filePathRegex = /(?:file|path):\s*[`']?([a-zA-Z0-9_\/.-]+\.[a-zA-Z0-9]+)[`']?/gi;
  
  let match;
  while ((match = filePathRegex.exec(response)) !== null) {
    const filePath = match[1];
    
    // Verify file exists in analysis
    if (fileExistsInStructure(filePath, analysis.structure)) {
      references.push({
        file: filePath,
        type: 'file'
      });
    }
  }
  
  return [...new Set(references.map(r => r.file))].map(file => ({ file }));
}
```

### 9. Context Preparation

```javascript
// Prepare comprehensive code context for AI
async function prepareCodeContext(structure, analysisId) {
  // Step 1: Extract key files
  const keyFiles = await extractKeyFiles(structure, analysisId);
  
  // Step 2: Parse dependencies
  const dependencies = await parseDependencies(structure, analysisId);
  
  // Step 3: Detect project metadata
  const metadata = await detectProjectMetadata(structure, analysisId);
  
  // Step 4: Calculate statistics
  const stats = calculateCodeStats(structure);
  
  return {
    structure,
    keyFiles,
    dependencies,
    metadata,
    stats
  };
}

async function extractKeyFiles(structure, analysisId) {
  const keyFileNames = [
    'package.json',
    'README.md',
    'index.js',
    'index.ts',
    'main.js',
    'App.jsx',
    'App.tsx',
    'server.js',
    'main.py',
    '__init__.py'
  ];
  
  const files = [];
  
  for (const fileName of keyFileNames) {
    const file = findFileInStructure(fileName, structure);
    if (file) {
      const content = await readFileFromS3(analysisId, file.path);
      files.push({
        path: file.path,
        name: file.name,
        preview: content.slice(0, 1000) // First 1000 chars
      });
    }
  }
  
  return files;
}

async function parseDependencies(structure, analysisId) {
  // Check for package.json (JavaScript/TypeScript)
  const packageJson = findFileInStructure('package.json', structure);
  if (packageJson) {
    const content = await readFileFromS3(analysisId, packageJson.path);
    const parsed = JSON.parse(content);
    return {
      type: 'npm',
      dependencies: parsed.dependencies || {},
      devDependencies: parsed.devDependencies || {}
    };
  }
  
  // Check for requirements.txt (Python)
  const requirementsTxt = findFileInStructure('requirements.txt', structure);
  if (requirementsTxt) {
    const content = await readFileFromS3(analysisId, requirementsTxt.path);
    return {
      type: 'pip',
      dependencies: content.split('\n').filter(Boolean)
    };
  }
  
  return { type: 'unknown', dependencies: {} };
}

function calculateCodeStats(structure) {
  let stats = {
    totalFiles: 0,
    totalDirectories: 0,
    filesByLanguage: {},
    totalLines: 0
  };
  
  function traverse(node) {
    if (node.type === 'directory') {
      stats.totalDirectories++;
      node.children.forEach(traverse);
    } else {
      stats.totalFiles++;
      const lang = node.language || 'other';
      stats.filesByLanguage[lang] = (stats.filesByLanguage[lang] || 0) + 1;
    }
  }
  
  traverse(structure);
  return stats;
}
```

### 10. Helper Utilities

```javascript
// UUID generation
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Language detection
function detectLanguage(filename) {
  const ext = path.extname(filename).toLowerCase();
  const languageMap = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rb': 'ruby',
    '.php': 'php',
    '.cpp': 'cpp',
    '.c': 'c',
    '.css': 'css',
    '.html': 'html',
    '.json': 'json',
    '.md': 'markdown'
  };
  
  return languageMap[ext] || 'plaintext';
}

// Find file in structure
function findFileInStructure(filename, structure) {
  function search(node) {
    if (node.type === 'file' && node.name === filename) {
      return node;
    }
    if (node.type === 'directory') {
      for (const child of node.children) {
        const result = search(child);
        if (result) return result;
      }
    }
    return null;
  }
  
  return search(structure);
}

// Check if file exists in structure
function fileExistsInStructure(filePath, structure) {
  function search(node) {
    if (node.type === 'file' && node.path === filePath) {
      return true;
    }
    if (node.type === 'directory') {
      return node.children.some(search);
    }
    return false;
  }
  
  return search(structure);
}

// Chunk array for batch processing
function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Estimate analysis time based on repo size
function estimateAnalysisTime(structure) {
  const stats = calculateCodeStats(structure);
  const baseTime = 30; // 30 seconds base
  const perFileTime = 0.5; // 0.5 seconds per file
  
  return Math.min(baseTime + (stats.totalFiles * perFileTime), 120); // Max 2 minutes
}
```

### 11. Validation Logic

```javascript
// Input validation
function validateInput(type, url, file) {
  if (!type || !['github', 'zip'].includes(type)) {
    return { valid: false, error: 'Invalid type. Must be "github" or "zip"' };
  }
  
  if (type === 'github') {
    if (!url) {
      return { valid: false, error: 'GitHub URL is required' };
    }
    if (!isValidGitHubUrl(url)) {
      return { valid: false, error: 'Invalid GitHub URL format' };
    }
  }
  
  if (type === 'zip') {
    if (!file) {
      return { valid: false, error: 'ZIP file is required' };
    }
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      return { valid: false, error: 'ZIP file exceeds 100MB limit' };
    }
  }
  
  return { valid: true };
}

function isValidGitHubUrl(url) {
  const githubRegex = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+$/;
  return githubRegex.test(url);
}
```

## Data Flow Summary

```
┌─────────────┐
│   User      │
│  Uploads    │
│   Repo      │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  1. Validate & Process Upload       │
│     - Clone GitHub or Extract ZIP   │
│     - Build File Tree               │
│     - Upload to S3                  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. Prepare Context                 │
│     - Extract key files             │
│     - Parse dependencies            │
│     - Calculate stats               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. AI Analysis (Parallel)          │
│     ├─ Generate Insights            │
│     ├─ Create Diagram               │
│     ├─ Build Learning Path          │
│     └─ Analyze Key Files            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  4. Store Results                   │
│     - Save to DynamoDB              │
│     - Cache for 7 days              │
│     - Update status                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  5. User Interaction                │
│     - View dashboard                │
│     - Explore code                  │
│     - Follow learning path          │
│     - Ask questions via chat        │
└─────────────────────────────────────┘
```

## Error Handling Strategy

```javascript
// Centralized error handler
class P3TEChError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
    this.statusCode = this.getStatusCode(code);
  }
  
  getStatusCode(code) {
    const codeMap = {
      'INVALID_REPO_URL': 400,
      'REPO_NOT_FOUND': 404,
      'REPO_TOO_LARGE': 413,
      'ANALYSIS_FAILED': 500,
      'RATE_LIMIT_EXCEEDED': 429,
      'UNAUTHORIZED': 401,
      'BEDROCK_ERROR': 503
    };
    return codeMap[code] || 500;
  }
}

// Usage
try {
  await analyzeCodebase(analysisId, structure);
} catch (error) {
  if (error.name === 'BedrockError') {
    throw new P3TEChError(
      'BEDROCK_ERROR',
      'AI service temporarily unavailable',
      { original: error.message }
    );
  }
  throw error;
}
```

---

## Key Implementation Notes

1. **Caching Strategy**: Always check DynamoDB cache before calling Bedrock to minimize costs
2. **Parallel Processing**: Use `Promise.all()` for independent AI calls (insights, diagrams, paths)
3. **Rate Limiting**: Implement per-user rate limits (100 req/min)
4. **Token Optimization**: Truncate file previews to ~1000 chars, full files to ~5000 chars
5. **Error Recovery**: Graceful degradation - if diagram fails, still show insights
6. **Progressive Enhancement**: Return partial results immediately, enrich asynchronously
