// AWS Lambda function for AI-powered question answering about codebases
// Uses AWS Bedrock with context from analyzed code

const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

/**
 * Lambda handler for answering questions about codebases using AWS Bedrock
 * @param {Object} event - API Gateway event with repoId and question
 * @returns {Object} AI-generated answer with code references
 */
exports.handler = async (event) => {
    try {
        const { repoId, question, conversationHistory = [] } = JSON.parse(event.body);

        // Retrieve codebase context from DynamoDB
        const context = await getCodebaseContext(repoId);

        // Generate AI response using Bedrock
        const answer = await generateAnswer(question, context, conversationHistory);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                answer,
                sources: extractSources(context),
                timestamp: new Date().toISOString()
            })
        };
    } catch (error) {
        console.error('Error answering question:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: error.message })
        };
    }
};

async function getCodebaseContext(repoId) {
    const response = await dynamoClient.send(new GetItemCommand({
        TableName: process.env.ANALYSIS_TABLE,
        Key: { repoId: { S: repoId } }
    }));

    if (!response.Item) {
        throw new Error('Codebase analysis not found');
    }

    return JSON.parse(response.Item.analysis.S);
}

async function generateAnswer(question, context, conversationHistory) {
    const systemPrompt = `You are an expert code analyst helping developers understand a codebase. 

Codebase Context:
- Files: ${context.structure?.files || 0}
- Components: ${context.structure?.components || 0}
- Architecture: ${context.insights?.join(', ') || 'Standard web application'}

Provide clear, concise answers with specific references to files and code patterns when relevant.
Use markdown formatting for code snippets and structure.`;

    const messages = [
        ...conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        })),
        {
            role: 'user',
            content: question
        }
    ];

    const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';

    const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2000,
        system: systemPrompt,
        messages
    };

    const command = new InvokeModelCommand({
        modelId,
        body: JSON.stringify(payload)
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return responseBody.content[0].text;
}

function extractSources(context) {
    // Extract relevant file references from context
    const sources = [];

    if (context.learningPath?.steps) {
        context.learningPath.steps.forEach(step => {
            if (step.files) {
                sources.push(...step.files);
            }
        });
    }

    return [...new Set(sources)];
}
