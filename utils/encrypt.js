const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Encryption function
function encrypt(text, secretKey) {
    const cipher = crypto.createCipher('aes-256-cbc', secretKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

// Decryption function
function decrypt(encryptedText, secretKey) {
    const decipher = crypto.createDecipher('aes-256-cbc', secretKey);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function masterEncrypt(og){
    return new Promise((resolve, reject) => {
        return resolve( bcrypt.hash(og, 11) )
    })
}

function masterDecrypt(plain, encrypted){
    return new Promise((resolve, reject) => {
        return resolve( bcrypt.compare(plain, encrypted) )
    })
}

module.exports = {
    encrypt,
    decrypt,
    masterEncrypt,
    masterDecrypt
}