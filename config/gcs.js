const { Storage } = require('@google-cloud/storage');

// Decode the Base64 service account key from environment variable
const serviceAccountKeyBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
let credentials;
try {
    if (serviceAccountKeyBase64) {
        const decodedKey = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf8');
        credentials = JSON.parse(decodedKey);
    } else {
        console.error("GOOGLE_APPLICATION_CREDENTIALS_BASE64 environment variable is not set.");
        // In a production environment, you might want to throw an error or exit.
    }
} catch (error) {
    console.error("Error parsing Google Cloud credentials:", error);
    // Handle cases where the base64 string is invalid JSON
}

const storage = new Storage({
    projectId: credentials ? credentials.project_id : undefined, // Get project_id from credentials
    credentials: credentials // Pass the parsed credentials object
});

const bucketName = process.env.GCS_BUCKET_NAME;
const bucket = storage.bucket(bucketName);

module.exports = { bucket };