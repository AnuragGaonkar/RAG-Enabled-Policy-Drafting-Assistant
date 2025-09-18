// seedUsers.js
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

mongoose.connect("mongodb://localhost:27017/Policy-Agent");

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  passwordHash: String
});

const User = mongoose.model('Auth_Users', userSchema);

async function createUser(username, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({ username, passwordHash });
  await user.save();
  console.log(`Created user ${username}`);
}

const usersToCreate = [
  { username: 'anuraggaonkar', password: 'Anurag' },
  { username: 'ombelose', password: 'Om' },
  { username: 'admin', password: 'Admin@123' },
  { username: 'janhavi', password: 'Janhavi' },
  { username: 'prasad', password: 'Prasad' }
];

async function seed() {
  for (const u of usersToCreate) {
    const exists = await User.findOne({ username: u.username });
    if (!exists) await createUser(u.username, u.password);
  }
  mongoose.disconnect();
}

seed();
