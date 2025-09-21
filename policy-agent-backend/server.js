const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { execFile } = require('child_process');
const path = require('path');

// Import your policy management helper functions (need to create policy_manager.js)
const {
  checkPolicyConflict,
  suggestPolicyEdits,
  savePolicy,
  vectorizePolicies
} = require('./policy_manager');

const upload = multer({ dest: 'uploads/' });

const app = express();

app.use(cors());
app.use(bodyParser.json());

mongoose.connect("mongodb://localhost:27017/Policy-Agent")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

const JWT_SECRET = "your_secret_key"; // Change in production!

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  passwordHash: String
});

const User = mongoose.model('auth_users', userSchema);

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).send("Missing username or password");
    }
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).send("Invalid credentials");
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(400).send("Invalid credentials");
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Internal server error");
  }
});

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).send("Unauthorized");
  }
  const token = auth.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send("Unauthorized");
    }
    req.userId = decoded.userId;
    next();
  });
}

app.post('/api/search', authMiddleware, (req, res) => {
  const { query, department } = req.body;
  if (!query || !department) {
    return res.status(400).send("Missing query or department");
  }

  const pyProg = execFile('python', ['agent.py', query, department], { cwd: __dirname });

  let data = '';
  let errData = '';

  pyProg.stdout.on('data', chunk => data += chunk.toString());
  pyProg.stderr.on('data', chunk => errData += chunk.toString());

  pyProg.on('close', code => {
    if (code === 0) {
      res.json({ result: data });
    } else {
      console.error('agent.py error:', errData);
      res.status(500).send('Internal server error');
    }
  });
});

// Check Conflict Endpoint
app.post('/api/check-policy-conflict', authMiddleware, upload.single('file'), async (req, res) => {
  const { file } = req;
  const { mode, policyId } = req.body;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const result = await checkPolicyConflict(file.path, mode, policyId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// Suggest Edits Endpoint
app.post('/api/suggest-policy-edits', authMiddleware, upload.single('file'), async (req, res) => {
  const { file } = req;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  try {
    const result = await suggestPolicyEdits(file.path);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// Upload (Save) Policy Endpoint
app.post('/api/upload-policy', authMiddleware, upload.single('file'), async (req, res) => {
  const { file } = req;
  const { mode, policyId } = req.body;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Re-check conflicts before saving
    const conflict = await checkPolicyConflict(file.path, mode, policyId);
    if (conflict.conflict) {
      return res.status(409).json(conflict);
    }

    const saveResult = await savePolicy(file.path, mode, policyId);

    // Trigger vectorization asynchronously
    vectorizePolicies();

    res.json(saveResult);
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
