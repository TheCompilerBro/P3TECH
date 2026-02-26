// AWS Lambda function for processing repository uploads
// In production, this would clone the repo and upload to S3

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

/**
 * Lambda handler for repository processing
 * @param {Object} event - API Gateway event with repository URL
 * @returns {Object} Response with S3 location and metadata
 */
exports.handler = async (event) => {
    try {
        const { repoUrl } = JSON.parse(event.body);
        const repoId = generateRepoId(repoUrl);
        const tmpDir = `/tmp/${repoId}`;

        // Clone repository
        console.log(`Cloning repository: ${repoUrl}`);
        await execAsync(`git clone --depth 1 ${repoUrl} ${tmpDir}`);

        // Extract repository metadata
        const metadata = await extractMetadata(tmpDir);

        // Upload to S3
        const s3Key = `repositories/${repoId}`;
        await uploadDirectoryToS3(tmpDir, s3Key);

        // Store metadata in DynamoDB
        await storeMetadata(repoId, repoUrl, metadata);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                repoId,
                s3Location: s3Key,
                metadata
            })
        };
    } catch (error) {
        console.error('Error processing repository:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

function generateRepoId(repoUrl) {
    const hash = require('crypto')
        .createHash('md5')
        .update(repoUrl)
        .digest('hex');
    return `${Date.now()}-${hash.substring(0, 8)}`;
}

async function extractMetadata(repoPath) {
    const files = await getAllFiles(repoPath);

    return {
        totalFiles: files.length,
        fileTypes: countFileTypes(files),
        size: await getDirectorySize(repoPath),
        timestamp: new Date().toISOString()
    };
}

async function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = await fs.readdir(dirPath);

    for (const file of files) {
        if (file === '.git' || file === 'node_modules') continue;

        const fullPath = path.join(dirPath, file);
        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {
            arrayOfFiles = await getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    }

    return arrayOfFiles;
}

function countFileTypes(files) {
    const types = {};
    files.forEach(file => {
        const ext = path.extname(file) || 'no-extension';
        types[ext] = (types[ext] || 0) + 1;
    });
    return types;
}

async function getDirectorySize(dirPath) {
    const files = await getAllFiles(dirPath);
    let totalSize = 0;

    for (const file of files) {
        const stats = await fs.stat(file);
        totalSize += stats.size;
    }

    return totalSize;
}

async function uploadDirectoryToS3(dirPath, s3KeyPrefix) {
    const files = await getAllFiles(dirPath);

    for (const file of files) {
        const relativePath = path.relative(dirPath, file);
        const s3Key = `${s3KeyPrefix}/${relativePath}`;
        const fileContent = await fs.readFile(file);

        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: s3Key,
            Body: fileContent
        }));
    }
}

async function storeMetadata(repoId, repoUrl, metadata) {
    await dynamoClient.send(new PutItemCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
            repoId: { S: repoId },
            repoUrl: { S: repoUrl },
            metadata: { S: JSON.stringify(metadata) },
            createdAt: { S: new Date().toISOString() }
        }
    }));
}
