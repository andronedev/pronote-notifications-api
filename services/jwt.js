const jwt = require('jsonwebtoken')
const config = require('../config.json')

const fs = require('fs')


function addToBlacklist(token) {
    // ./blacklist.json
    if (!fs.existsSync('./blacklist.json')) {
        fs.writeFileSync('./blacklist.json', JSON.stringify({}))
    }

    let blacklist = JSON.parse(fs.readFileSync('./blacklist.json'))
    blacklist[token] = true
    fs.writeFileSync('./blacklist.json', JSON.stringify(blacklist))


}

function isBlacklisted(token) {
    // ./blacklist.json
    if (!fs.existsSync('./blacklist.json')) {
        fs.writeFileSync('./blacklist.json', JSON.stringify({}))
    }

    let blacklist = JSON.parse(fs.readFileSync('./blacklist.json'))
    return blacklist[token] || false
}

class JWTService {
    static createToken(payload) {
        return jwt.sign(payload, config.jwtKey)
    }

    static verifyToken(token) {
        if (isBlacklisted(token) === true) { return null }
        try {
            return jwt.verify(token, config.jwtKey)
        } catch {
            return null
        }
    }
    static deleteToken(token = '') {
        // add token to blacklist
        addToBlacklist(token)

    }
}

module.exports = JWTService
