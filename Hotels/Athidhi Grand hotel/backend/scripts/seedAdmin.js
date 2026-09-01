require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const Admin = require('../models/Admin');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required.');

  await mongoose.connect(process.env.MONGO_URI);
  const existing = await Admin.exists({});
  if (existing) {
    console.log('An admin already exists. No new admin was created.');
    return;
  }

  const username = String(await ask('Enter admin username: ')).trim();
  const password = String(await ask('Enter admin password (minimum 8 characters): '));

  if (username.length < 3 || username.length > 50) throw new Error('Username must be 3-50 characters.');
  if (password.length < 8 || password.length > 200) throw new Error('Password must be 8-200 characters.');

  await Admin.create({ username, password });
  console.log('Admin created successfully.');
}

main()
  .catch(error => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await mongoose.disconnect().catch(() => {});
  });
