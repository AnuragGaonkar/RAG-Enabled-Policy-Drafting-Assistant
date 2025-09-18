const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect("mongodb://localhost:27017/Policy-Agent", {
  // These options are deprecated in Mongoose 6+, remove if using latest Mongoose
  // useNewUrlParser: true,
  // useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

const JWT_SECRET = "your_jwt_secret_key";

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  passwordHash: String
});

// Make sure this matches your MongoDB collection name exactly
const User = mongoose.model('auth_users', userSchema);

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).send("Missing username or password");

    const user = await User.findOne({ username });
    if (!user) return res.status(400).send("Invalid credentials");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).send("Invalid credentials");

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Internal server error");
  }
});

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return res.status(401).send("Unauthorized");

  const token = auth.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send("Unauthorized");
    req.userId = decoded.userId;
    next();
  });
}

app.post('/api/search', authMiddleware, (req, res) => {
  const { query, department } = req.body;
  if (!query || !department) return res.status(400).send("Missing query or department");

  const pyProg = spawn('python', ['agent.py', query, department], { cwd: __dirname });

  let data = '';
  let errData = '';

  pyProg.stdout.on('data', chunk => {
    data += chunk.toString();
  });

  pyProg.stderr.on('data', chunk => {
    errData += chunk.toString();
  });

  pyProg.on('close', code => {
    if (code === 0) {
      res.json({ result: data });
    } else {
      console.error('agent.py error:', errData);
      res.status(500).send('Internal Server Error in agent script');
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
