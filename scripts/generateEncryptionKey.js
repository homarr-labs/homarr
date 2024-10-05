// This script generates a random encryption key
// This key is used to encrypt and decrypt the integration secrets
// In production it is generated in run.sh and stored in the environment variable ENCRYPTION_KEY
// during runtime, it's also stored in a file.

const crypto = require("crypto");
console.log(crypto.randomBytes(32).toString("hex"));
