const express = require('express');
const multer = require('multer');
const { bucket } = require('../config/gcs'); // Import your GCS bucket instance
const path = require('path');
const uploadRouter = express.Router();

uploadRouter.post('/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }

        const file = req.file;
        // Create a unique filename to prevent collisions, e.g., with timestamp
        const filename = `<span class="math-inline">\{Date\.now\(\)\}\_</span>{path.basename(file.originalname)}`;
        const blob = bucket.file(filename);
        const blobStream = blob.createWriteStream({
            resumable: false, // For smaller files, false is often simpler
            metadata: {
                contentType: file.mimetype,
            },
        });

        blobStream.on('error', (err) => {
            console.error('Error uploading to GCS:', err);
            res.status(500).json({ success: false, message: 'Failed to upload image to Google Cloud Storage.' });
        });

        blobStream.on('finish', async () => {
            // Make the file public (if you want public access)
            // If you prefer signed URLs for private access, skip this and generate signed URLs when needed.
            await blob.makePublic();

            const publicUrl = `https://storage.googleapis.com/<span class="math-inline">\{bucket\.name\}/</span>{blob.name}`;
            // Save publicUrl to your database (e.g., associated with a product or user)
            console.log(`Image uploaded to: ${publicUrl}`);

            res.status(200).json({
                success: true,
                message: 'Image uploaded successfully!',
                imageUrl: publicUrl
            });
        });

        blobStream.end(file.buffer); // End the stream with the file buffer

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, message: 'Internal server error during upload.' });
    }
});

module.exports = uploadRouter;