import { Storage } from '@google-cloud/storage';

// Decode the Base64 service account key from environment variable
const serviceAccountKeyBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
let credentials;

try {
    if (serviceAccountKeyBase64) {
        const decodedKey = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf8');
        credentials = JSON.parse(decodedKey);
    } else {
        console.error("GOOGLE_APPLICATION_CREDENTIALS_BASE64 environment variable is not set. GCS will not function correctly.");
        // In a production environment, you might want to throw an error or exit the process.
    }
} catch (error) {
    console.error("Error parsing Google Cloud credentials:", error);
    // Handle cases where the base64 string is invalid JSON
    // Set credentials to null to prevent further errors if parsing fails
    credentials = null;
}

const storage = new Storage({
    projectId: credentials ? credentials.project_id : undefined,
    credentials: credentials
});

const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
    console.error("GCS_BUCKET_NAME environment variable is not set. GCS bucket operations will fail.");
}

const bucket = storage.bucket(bucketName);

export { bucket };