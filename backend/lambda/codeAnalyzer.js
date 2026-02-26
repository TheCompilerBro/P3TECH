// AWS Lambda function for AI-powered code analysis using Bedrock
// Analyzes code structure, generates architecture diagrams, and creates explanations

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, PutItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

/**
 * Lambda handler for code analysis using AWS Bedrock
 * @param {Object} event - API Gateway event with repoId
 * @returns {Object} Analysis results including architecture and insights
 */
exports.handler = async (event) => {
    try {
        const { repoId } = JSON.parse(event.body);

        // Check if analysis already exists in cache
        const cachedAnalysis = await getCachedAnalysis(repoId);
        if (cachedAnalysis) {
            return successResponse(cachedAnalysis);
        }

        // Fetch repository files from S3
        const codeFiles = await fetchCodeFiles(repoId);

        // Analyze code structure
        const structure = analyzeStructure(codeFiles);

        // Generate AI insights using Bedrock
        const insights = await generateAIInsights(codeFiles, structure);

        // Generate architecture diagram
        const architecture = await generateArchitecture(codeFiles, structure);

        // Create learning path
        const learningPath = await generateLearningPath(codeFiles, structure);

        const analysis = {
            repoId,
            structure,
            insights,
            architecture,
            learningPath,
            analyzedAt: new Date().toISOString()
        };

        // Cache results in DynamoDB
        await cacheAnalysis(repoId, analysis);

        return successResponse(analysis);
    } catch (error) {
        console.error('Error analyzing code:', error);
        return errorResponse(error.message);
    }
};

async function getCachedAnalysis(repoId) {
    try {
        const response = await dynamoClient.send(new GetItemCommand({
            TableName: process.env.ANALYSIS_TABLE,
            Key: { repoId: { S: repoId } }
        }));

        if (response.Item) {
            return JSON.parse(response.Item.analysis.S);
        }
    } catch (error) {
        console.log('No cached analysis found');
    }
    return null;
}

async function fetchCodeFiles(repoId) {
    // In production, fetch from S3
    // For now, return sample structure
    return [
        { path: 'src/App.jsx', language: 'javascript', type: 'component' },
        { path: 'src/api/index.js', language: 'javascript', type: 'service' },
        { path: 'src/utils/auth.js', language: 'javascript', type: 'utility' }
    ];
}

function analyzeStructure(codeFiles) {
    const structure = {
        files: codeFiles.length,
        components: 0,
        services: 0,
        utilities: 0,
        tests: 0
    };

    codeFiles.forEach(file => {
        if (file.type === 'component') structure.components++;
        else if (file.type === 'service') structure.services++;
        else if (file.type === 'utility') structure.utilities++;
        else if (file.path.includes('.test.')) structure.tests++;
    });

    return structure;
}

async function generateAIInsights(codeFiles, structure) {
    const prompt = `Analyze this codebase structure and provide key insights:

Files: ${structure.files}
Components: ${structure.components}
Services: ${structure.services}

Provide 4-5 concise insights about the architecture, patterns, and quality.`;

    const response = await callBedrock(prompt);

    // Parse response into array of insights
    return response.split('\n').filter(line => line.trim()).slice(0, 5);
}

async function generateArchitecture(codeFiles, structure) {
    const prompt = `Generate a Mermaid diagram for a web application with:
- ${structure.components} components
- ${structure.services} services
- Authentication system
- API layer

Provide only the Mermaid syntax, no explanation.`;

    const mermaidDiagram = await callBedrock(prompt);

    // Return cleaned Mermaid diagram
    return mermaidDiagram.replace(/```mermaid|```/g, '').trim();
}

async function generateLearningPath(codeFiles, structure) {
    const prompt = `Create a learning path for understanding this codebase:

Structure:
- Components: ${structure.components}
- Services: ${structure.services}
- Utilities: ${structure.utilities}

Generate 4 learning steps with titles and descriptions.`;

    const response = await callBedrock(prompt);

    // Parse into structured learning path
    return {
        title: 'Understanding This Codebase',
        steps: parseLearningSteps(response)
    };
}

async function callBedrock(prompt) {
    const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';

    const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        messages: [
            {
                role: 'user',
                content: prompt
            }
        ]
    };

    const command = new InvokeModelCommand({
        modelId,
        body: JSON.stringify(payload)
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return responseBody.content[0].text;
}

function parseLearningSteps(aiResponse) {
    // Parse AI response into structured steps
    // This is simplified for the prototype
    return [
        { id: 1, title: 'Start with Entry Point', description: 'Begin at the main application file', files: ['src/index.js'], completed: false },
        { id: 2, title: 'Explore Components', description: 'Understand the UI components', files: ['src/App.jsx'], completed: false },
        { id: 3, title: 'Review Services', description: 'Check the API layer', files: ['src/api/index.js'], completed: false },
        { id: 4, title: 'Understand Auth', description: 'Learn authentication flow', files: ['src/utils/auth.js'], completed: false }
    ];
}

async function cacheAnalysis(repoId, analysis) {
    await dynamoClient.send(new PutItemCommand({
        TableName: process.env.ANALYSIS_TABLE,
        Item: {
            repoId: { S: repoId },
            analysis: { S: JSON.stringify(analysis) },
            ttl: { N: String(Math.floor(Date.now() / 1000) + 86400 * 7) } // 7 days TTL
        }
    }));
}

function successResponse(data) {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(data)
    };
}

function errorResponse(message) {
    return {
        statusCode: 500,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: message })
    };
}
