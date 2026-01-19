const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// --- MONGODB CONNECTION ---
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('Mongo Error:', err));

const PolicySchema = new mongoose.Schema({
    title: String,
    department: String,
    uploadDate: { type: Date, default: Date.now },
    filename: String
});
const Policy = mongoose.model('Policy', PolicySchema);

// --- ROUTES ---

// 1. Upload & Ingest Policy
app.post('/api/upload-policy', upload.single('file'), async (req, res) => {
    try {
        const { path, originalname } = req.file;
        const metadata = JSON.parse(req.body.metadata || '{}');

        // A. Save to MongoDB (Metadata)
        const newPolicy = new Policy({
            title: metadata.policyName || originalname,
            department: metadata.department || 'General',
            filename: originalname
        });
        await newPolicy.save();

        // B. Send to Python for Vector Embedding
        const formData = new FormData();
        formData.append('file', fs.createReadStream(path), originalname);

        // Call Python Service
        await axios.post('http://localhost:5000/ingest', formData, {
            headers: { ...formData.getHeaders() }
        });

        // Cleanup local file
        fs.unlinkSync(path);

        res.json({ success: true, message: "Policy uploaded and indexed successfully." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Upload failed" });
    }
});

// 2. Chat (RAG)
app.post('/api/search', async (req, res) => {
    try {
        // Forward query to Python RAG Engine
        const pythonRes = await axios.post('http://localhost:5000/chat', {
            query: req.body.query
        });
        
        res.json({ message: pythonRes.data.response });
    } catch (error) {
        console.error("AI Service Error:", error.message);
        res.status(500).json({ message: "AI Service unavailable." });
    }
});

// 3. Draft Generation (New Route for Editor)
app.post('/api/draft', async (req, res) => {
    try {
        // Forward to Python Drafting Engine
        const pythonRes = await axios.post('http://localhost:5000/draft', {
            query: req.body.query,
            context: req.body.current_content
        });
        
        res.json({ message: pythonRes.data.response });
    } catch (error) {
        console.error("AI Drafting Error:", error.message);
        res.status(500).json({ message: "Drafting service unavailable." });
    }
});

// 4. Conflict Check
app.post('/api/check-policy-conflict', upload.single('file'), async (req, res) => {
    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(req.file.path), req.file.originalname);

        const pythonRes = await axios.post('http://localhost:5000/check-conflict', formData, {
            headers: { ...formData.getHeaders() }
        });

        fs.unlinkSync(req.file.path);
        
        // Transform Python response to match frontend Types
        res.json({
            hasConflict: pythonRes.data.hasConflict,
            message: pythonRes.data.analysis,
            suggestions: ["Check the highlighted sections above."]
        });

    } catch (error) {
        res.status(500).json({ hasConflict: false, message: "Could not run conflict check." });
    }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`Node Server running on ${PORT}`));