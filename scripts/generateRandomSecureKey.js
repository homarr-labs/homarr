// This script generates a random secure key with a length of 64 characters
// This key is used to encrypt and decrypt the integration secrets for auth.js
// In production it is generated in run.sh and stored in the environment variables ENCRYPTION_KEY / AUTH_SECRET
// during runtime, it's also stored in a file.

const crypto = require("crypto");
console.log(crypto.randomBytes(32).toString("hex"));
