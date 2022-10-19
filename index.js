require('tls').DEFAULT_MIN_VERSION = 'TLSv1'
require('dotenv').config();

const path = require('path')

const config = require('./config.json')
const fetch = require('node-fetch')

const Sentry = require('@sentry/node')
Sentry.init({
    dsn: config.sentryDSN,
    tracesSampleRate: 1.0
})
// Start express server
const morgan = require('morgan')
const express = require('express')
const app = express()
app.use(express.json())
app.use(morgan('dev'))
app.listen(config.port, () => console.log(`Pronote Notifications API server listening on port ::${config.port}::`))

const { db } = require('./services/models')

const DatabaseService = require('./services/database')
const PronoteService = require('./services/pronote')
const FirebaseService = require('./services/firebase')
const jwt = require('./services/jwt')

const database = new DatabaseService()
const pronote = new PronoteService()
const firebase = new FirebaseService()


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const synchronize = async (studentName) => {
    await db.sync({ force: true })
    const users = await database.fetchUsers()
    const usersCaches = await database.fetchUsersCache()
    const usersTokens = await database.fetchFCMTokens()

    const usersSync = users.filter((user) => !user.passwordInvalidated && (studentName ? user.pronoteUsername === studentName : true))
    for (const [index, userAuth] of usersSync.entries()) {
        await sleep(500)
        const oldCache = usersCaches.find((cache) => {
            return cache.pronoteUsername === userAuth.pronoteUsername && cache.pronoteURL === userAuth.pronoteURL
        })
        pronote.checkSession(userAuth, oldCache, index).then(([notifications, newCache]) => {
            if (notifications.length > 0) {
                const tokens = usersTokens.filter((token) => {
                    return token.pronoteUsername === userAuth.pronoteUsername && token.pronoteURL === userAuth.pronoteURL && token.isActive
                })
                const homeworksTokens = tokens.filter((token) => token.notificationsHomeworks).map((token) => token.fcmToken)
                const marksTokens = tokens.filter((token) => token.notificationsMarks).map((token) => token.fcmToken)
                notifications.forEach((notificationData) => {
                    database.createNotification(userAuth, notificationData).then((notificationDBID) => {
                        const notification = {
                            title: notificationData.title,
                            body: notificationData.body
                        }
                        const sentAt = new Date()
                        if (notificationData.type === 'homework' && homeworksTokens.length > 0) {
                            firebase.sendNotification(notification, 'homework', homeworksTokens).then((responses) => {
                                database.markNotificationSent(notificationDBID, new Date())
                                responses.forEach((res, i) => {
                                    const token = marksTokens[i]
                                    database.markLastActiveAt(token, sentAt)
                                    if (res.success) database.markLastSuccessAt(token, sentAt)
                                })
                            })
                        } else if (notificationData.type === 'mark' && marksTokens.length > 0) {
                            firebase.sendNotification(notification, 'mark', marksTokens).then((responses) => {
                                database.markNotificationSent(notificationDBID, new Date())
                                responses.forEach((res, i) => {
                                    const token = marksTokens[i]
                                    database.markLastActiveAt(token, sentAt)
                                    if (res.success) database.markLastSuccessAt(token, sentAt)
                                })
                            })
                        }
                    })
                })
            }
            database.updateUserCache(userAuth, newCache)
        }).catch((e) => {
            if (e.message === 'Wrong user credentials') {
                database.invalidateUserPassword(userAuth)
            }
        })
    }
}

const checkInvalidated = async () => {
    const users = await database.fetchUsers()
    const usersInvalidated = users.filter((u) => u.passwordInvalidated)
    const failed = []
    usersInvalidated.forEach((user) => {
        if (failed.filter((e) => e === user.pronoteURL).length < 1) {
            pronote.createSession(user).then(() => {
                database.invalidateUserPassword(user, false)
            }).catch(() => {
                failed.push(user.pronoteURL)
            })
        }
    })
}

const userToSynchronize = process.argv[process.argv.indexOf('--sync') + 1] === 'all' ? null : process.argv[process.argv.indexOf('--sync') + 1]
if (process.argv.includes('--sync')) synchronize(userToSynchronize)
if (process.argv.includes('--checkinv')) checkInvalidated()

synchronize()

setInterval(function () {
    synchronize()
}, 30 * 60 * 1000)
setInterval(() => {
    checkInvalidated()
}, 24 * 60 * 60 * 1000)


// set cors headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
    next()
})




app.post('/logout', async (req, res) => {
    const token = req.headers.authorization
    const payload = jwt.verifyToken(token)
    if (!token || !payload) {
        return res.status(403).send({
            success: false,
            code: 2,
            message: 'Unauthorized'
        })
    }
    database.createUserLog(payload, {
        route: '/logout',
        appVersion: req.headers['app-version'] || 'unknown',
        date: new Date(),
        jwt: token
    })

    if (payload.pronoteURL === 'demo') {
        return res.status(200).send({
            success: true
        })
    }

    const existingToken = await database.fetchFCMToken(payload.fcmToken)
    if (!existingToken) {
        return res.status(500).send({
            success: false,
            code: 4,
            message: 'Unknown FCM token'
        })
    }
    database.updateToken(payload.fcmToken, {
        isActive: false
    })

    return res.status(200).send({
        success: true
    })

})

app.post('/settings', async (req, res) => {
    const token = req.headers.authorization
    const payload = jwt.verifyToken(token)
    if (!token || !payload) {
        return res.status(403).send({
            success: false,
            code: 2,
            message: 'Unauthorized'
        })
    }
    const data = req.body
    database.createUserLog(payload, {
        route: '/settings',
        appVersion: req.headers['app-version'] || 'unknown',
        date: new Date(),
        body: data,
        jwt: token
    })

    if (payload.pronoteURL === 'demo') {
        return res.status(200).send({
            success: true
        })
    }

    const existingToken = await database.fetchFCMToken(payload.fcmToken)
    if (!existingToken) {
        return res.status(500).send({
            success: false,
            code: 4,
            message: 'Unknown FCM token'
        })
    }

    database.updateToken(payload.fcmToken, {
        notificationsHomeworks: data.notifications_homeworks === 'true',
        notificationsMarks: data.notifications_marks === 'true'
    })
    return res.status(200).send({
        success: true
    })
})

app.get('/notifications', async (req, res) => {
    const token = req.headers.authorization
    const payload = jwt.verifyToken(token)
    if (!token || !payload) {
        return res.status(403).send({
            success: false,
            code: 2,
            message: 'Unauthorized'
        })
    }

    database.createUserLog(payload, {
        route: '/notifications',
        appVersion: req.headers['app-version'] || 'unknown',
        date: new Date(),
        jwt: token
    })

    if (payload.pronoteURL === 'demo') {
        const minDate = new Date(2012, 0, 1)
        const randomDate = () => new Date(minDate.getTime() + Math.random() * (Date.now() - minDate.getTime()))
        return res.status(200).send({
            success: true,
            notifications: [
                {
                    created_at: randomDate(),
                    read_at: randomDate(),
                    sent_at: randomDate(),
                    title: 'Nouvelle note en HISTOIRE-GEOGRAPHIE',
                    body: 'Note: 19/20\nMoyenne de la classe: 11.91/20',
                    type: 'mark'
                }
            ]
        })
    }

    const user = await database.fetchUser(payload.pronoteUsername, payload.pronoteURL)
    if (!user) {
        return res.status(403).send({
            success: false,
            code: 3,
            message: 'Votre compte est introuvable.'
        })
    }

    const notifications = (await database.fetchUserNotifications(payload.pronoteUsername, payload.pronoteURL))
        .sort((a, b) => {
            const createdOrder = b.createdAt.getTime() - a.createdAt.getTime()
            if (createdOrder !== 0) return createdOrder
            else return b.body.length - a.body.length
        })
        .map((notif) => ({
            created_at: notif.createdAt,
            read_at: notif.readAt,
            sent_at: notif.sentAt,
            title: notif.title,
            body: notif.body,
            type: notif.type
        }))

    return res.status(200).send({
        success: true,
        notifications
    })
})

app.get('/login', async (req, res) => {
    const token = req.headers.authorization
    const payload = jwt.verifyToken(token)
    if (!token || !payload) {
        return res.status(403).send({
            success: false,
            code: 2,
            message: 'Unauthorized'
        })
    }

    database.createUserLog(payload, {
        route: '/login',
        appVersion: req.headers['app-version'] || 'unknown',
        date: new Date(),
        jwt: token
    })

    if (payload.pronoteURL === 'demo') {
        return res.status(200).send({
            success: true,
            full_name: 'Sarah Kelly',
            student_class: '204',
            establishment: 'Lycée Gustave Eiffel',
            notifications_homeworks: true,
            notifications_marks: true
        })
    }

    const user = await database.fetchUser(payload.pronoteUsername, payload.pronoteURL)
    if (!user) {
        return res.status(403).send({
            success: false,
            code: 3,
            message: 'Votre compte est introuvable.'
        })
    } else {
        const existingToken = await database.fetchFCMToken(payload.fcmToken)
        if (!existingToken) {
            return res.status(500).send({
                success: false,
                code: 4,
                message: 'Unknown FCM token'
            })
        }

        return res.status(200).send({
            success: true,
            full_name: user.fullName,
            student_class: user.studentClass,
            establishment: user.establishment,
            password_invalidated: user.passwordInvalidated,
            notifications_homeworks: existingToken.notificationsHomeworks,
            notifications_marks: existingToken.notificationsMarks
        })
    }
})

app.get('/establishments', async (req, res) => {
    if (!req.query.latitude || !req.query.longitude) return

    database.createUserLog({
        pronoteUsername: 'unknown',
        pronoteURL: 'unknown',
        fcmToken: 'unknown'
    }, {
        route: '/establishments',
        appVersion: req.headers['app-version'] || 'unknown',
        date: new Date(),
        body: { latitude: req.query.latitude, longitude: req.query.longitude }
    })

    const establishments = (await pronote.getEstablishments(req.query.latitude, req.query.longitude)) || []

    return res.status(200).send({
        success: true,
        establishments
    })
})

app.post('/register', async (req, res) => {
    const body = req.body

    if (!body.pronote_url) {
        return res.status(400).send({
            success: false,
            code: 1,
            message: 'Missing pronote_url'
        })
    }
    console.table(body)

    database.createUserLog({
        pronoteUsername: body.username,
        pronoteURL: body.pronote_url,
        fcmToken: body.fcm_token
    }, {
        route: '/register',
        appVersion: req.headers['app-version'] || 'unknown',
        date: new Date(),
        body
    })

    const login = await pronote.createSession(body.pronote_url, body.username, body.password)
    if (!login) {
        return res.status(403).send({
            success: false,
            code: 1,
            message: 'Identifiants incorrects'
        })
    }

    const user = await database.fetchUser(body.username, body.pronote_url)
    if (user) {
        await database.updateUser(body.username, body.pronote_url, {
            fullName: login.fullName,
            studentClass: login.studentClass,
            establishment: login.establishment,
            passwordInvalidated: false
        })
    } else {
        await database.createUser(body.username, body.pronote_url, {
            fullName: login.fullName,
            studentClass: login.studentClass,
            establishment: login.establishment,
            passwordInvalidated: false
        })
    }

    let jwt = jwt.generateToken({
        pronoteUsername: body.username,
        pronoteURL: body.pronote_url,
        fcmToken: body.fcm_token
    })
    // add FCM token
    database.createOrUpdateToken(body.fcm_token, body.username, body.pronote_url, body.notifications_homeworks, body.notifications_marks)

    res.status(200).send({
        success: true,
        jwt
    })


    setTimeout(() => {
        //message de bienvenue 
        if (!userAuth.fcmToken) return console.log("no token")
        //sendNotification (notificationData, notificationType, tokens) {
        firebase.sendNotification({
            title: 'Bienvenue sur Notifications pour Pronote !',
            body: 'Vous pouvez désormais recevoir des notifications pour vos devoirs et vos notes !',
        }, 'welcome', [userAuth.fcmToken])
    }, 10000)


})

app.get('/embed/register', async (req, res) => {
    //send file 
    res.sendFile(path.join(__dirname, '..', 'public', 'register.html'))
})

app.get('/embed/unregister', async (req, res) => {
    //send file
    res.sendFile(path.join(__dirname, '..', 'public', 'unregister.html'))
})

app.get("/firebase-messaging-sw.js", (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'firebase-messaging-sw.js'))
})


app.get('/', (req, res) => res.send({
    success: true, message: 'Welcome to Notifications pour Pronote API'
}))

