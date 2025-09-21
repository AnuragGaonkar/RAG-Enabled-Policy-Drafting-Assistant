// policy_manager.js

const { execFile } = require('child_process');
const path = require('path');

function checkPolicyConflict(file, mode, policyId) {
  return new Promise((resolve, reject) => {
    execFile(
      'python',
      [path.join(__dirname, 'policy_upload.py'), file, mode, policyId || '', '--check-only'],
      (err, stdout, stderr) => {
        if (err) return reject(stderr || err);
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject('Conflict check parse error');
        }
      }
    );
  });
}

function suggestPolicyEdits(file) {
  return new Promise((resolve, reject) => {
    execFile(
      'python',
      [path.join(__dirname, 'suggest_edits.py'), file],
      (err, stdout, stderr) => {
        if (err) return reject(stderr || err);
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject('Suggestion parse error');
        }
      }
    );
  });
}

function savePolicy(file, mode, policyId) {
  return new Promise((resolve, reject) => {
    execFile(
      'python',
      [path.join(__dirname, 'policy_upload.py'), file, mode, policyId || ''],
      (err, stdout, stderr) => {
        if (err) return reject(stderr || err);
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject('Upload/Save parse error');
        }
      }
    );
  });
}

function vectorizePolicies() {
  execFile('python', [path.join(__dirname, 'vectoring.py')], (err, stdout, stderr) => {
    if (err) console.error('Vectoring failed:', stderr || err);
    else console.log('Vectoring complete.');
  });
}

module.exports = { checkPolicyConflict, suggestPolicyEdits, savePolicy, vectorizePolicies };
