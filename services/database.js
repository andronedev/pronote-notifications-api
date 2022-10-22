const config = require('../config.json')
const { Users, UsersCaches, UsersTokens, UsersLogs, Notifications } = require('./models');
const { Sequelize, Op } = require('sequelize');

const formatUser = (row) => ({
    pronoteURL: row.pronote_url,
    pronoteUsername: row.pronote_username,
    pronotePassword: row.pronote_password,
    pronoteCAS: row.pronote_cas,
    fullName: row.full_name,
    studentClass: row.student_class,
    establishment: row.establishment,
    passwordInvalidated: row.password_invalidated
})

const formatFCMToken = (row) => ({
    pronoteURL: row.pronote_url,
    pronoteUsername: row.pronote_username,
    fcmToken: row.fcm_token,
    createdAt: row.created_at,
    isActive: row.is_active,
    notificationsMarks: row.notifications_marks,
    notificationsHomeworks: row.notifications_homeworks
})


// userAuth = { pronoteURL, pronoteUsername, pronotePassword, pronoteCAS }

class DatabaseService {



    query(query, ...parameters) {
        return new Promise(async (resolve) => {
            let query = await db.query(query, parameters)
            resolve(query)
        })
    }

    fetchFCMToken(fcmToken) {
        return new Promise(async (resolve) => {
            let query = await UsersTokens.findOne({
                raw: true, nest: true,
                where: {
                    fcm_token: fcmToken
                }
            }).then((row) => {
                if (row.length > 0) {
                    resolve(formatFCMToken(row[0]))
                }else {
                    resolve(false)
                }
            }
            )

        })
    }

    fetchUser(pronoteUsername, pronoteURL) {
        return new Promise(async (resolve) => {
            let query = await Users.findOne({
                raw: true, nest: true,
                where: {
                    pronote_username: pronoteUsername,
                    pronote_url: pronoteURL
                }
            })
            if (query) {
                resolve(formatUser(query))
            }else {
                resolve(false)
            }
        })
    }

    deleteUser({ pronoteUsername, pronoteURL }) {
        return new Promise(async (resolve) => {
            let query = await Users.destroy({
                where: {
                    pronote_username: pronoteUsername,
                    pronote_url: pronoteURL
                }
            })
            query.save()
            resolve()

        })
    }

    fetchUsers() {
        return new Promise(async (resolve) => {
            let query = await Users.findAll({ raw: true, nest: true })
            resolve(query.map(formatUser))
        })
    }

    fetchUsersCache() {
        return new Promise(async (resolve) => {
            let query = await UsersCaches.findAll({ raw: true, nest: true })

            resolve(query.map((row) => ({
                pronoteURL: row.pronote_url,
                pronoteUsername: row.pronote_username,
                homeworksCache: row.homeworks_cache,
                marksCache: row.marks_cache,
                lastUpdateAt: row.last_update_at
            })))
        })
    }

    fetchFCMTokens() {
        return new Promise(async (resolve) => {
            let query = await UsersTokens.findAll({ raw: true, nest: true })
            resolve(query.map(formatFCMToken))
        })
    }

    fetchUserNotifications(pronoteUsername, pronoteURL) {
        return new Promise(async (resolve) => {
            let query = await Notifications.findAll({
                where: {
                    pronote_username: pronoteUsername,
                    pronote_url: pronoteURL
                }
            })

                resolve(query.map((row) => ({
                    id: row.id,
                    pronoteURL: row.pronote_url,
                    pronoteUsername: row.pronote_username,
                    title: row.title,
                    body: row.body,
                    type: row.type,
                    createdAt: row.created_at
                })))
            
        })
    }

    markLastActiveAt(token, date) {
        return new Promise(async (resolve) => {
            let query = await UsersTokens.update({
                last_active_at: date
            }, {
                where: {
                    fcm_token: token
                }
            })
            query.save()
            resolve()
        })
    }

    markLastSuccessAt(token, date) {
        return new Promise(async (resolve) => {
            let query = await UsersTokens.update({
                last_success_at: date
            }, {
                where: {
                    fcm_token: token
                }
            })
            query.save()
            resolve()
        })
    }

    updateUserCache({ pronoteUsername, pronoteURL }, { homeworksCache, marksCache }) {
        return new Promise(async (resolve) => {
            let query = await   // insert or update
                UsersCaches.upsert({
                    pronote_url: pronoteURL,
                    pronote_username: pronoteUsername,
                    homeworks_cache: homeworksCache,
                    marks_cache: marksCache,
                    last_update_at: new Date()
                })
            resolve()
        })
    }

    invalidateUserPassword({ pronoteUsername, pronoteURL }, invalidate = true) {
        return new Promise(async (resolve) => {
            let query = await Users.update({
                password_invalidated: invalidate
            }, {
                where: {
                    pronote_username: pronoteUsername,
                    pronote_url: pronoteURL
                }
            })
            query.save()
            resolve()
        })
    }

    updateUserPassword({ pronoteUsername, pronoteURL, newPassword }) {
        return new Promise(async (resolve) => {
            let query = await Users.update({
                pronote_password: newPassword,
                password_invalidated: false
            }, {
                where: {
                    pronote_username: pronoteUsername,
                    pronote_url: pronoteURL
                }
            })
            query.save()
            resolve()

        })
    }

    createUser({ pronoteURL, pronoteUsername, pronotePassword, pronoteCAS}, { fullName, studentClass, establishment }) {
        return new Promise(async (resolve) => {
            let query = await Users.create({
                pronote_url: pronoteURL,
                pronote_username: pronoteUsername,
                pronote_password: pronotePassword,
                pronote_cas: pronoteCAS,
                full_name: fullName,
                student_class: studentClass,
                establishment: establishment,
                password_invalidated: false
            },{
                logging: console.log
            })
            query.save()
            resolve()

        })
    }
    updateUser({ pronoteURL, pronoteUsername, pronotePassword, pronoteCAS}, { fullName, studentClass, establishment }) {
        return new Promise(async (resolve) => {
            let query = await Users.update({
                pronote_url: pronoteURL,
                pronote_username: pronoteUsername,
                pronote_password: pronotePassword,
                pronote_cas: pronoteCAS,
                full_name: fullName,
                student_class: studentClass,
                establishment: establishment,
                password_invalidated: false
            },{
                where: {
                    pronote_url: pronoteURL,
                    pronote_username: pronoteUsername
                }
            })
            resolve()

        })
    }

    deleteFCMToken(token) {
        return new Promise(async (resolve) => {
            let query = await UsersTokens.destroy({
                where: {
                    fcm_token:token
                }
            })
        })
    }

    createOrUpdateToken({ pronoteUsername, pronoteURL }, token, deviceID) {
        return new Promise(async (resolve) => {
            let query = await UsersTokens.upsert({
                fcm_token: token,
                pronote_url: pronoteURL,
                pronote_username: pronoteUsername,
                device_id: deviceID,
                last_active_at: new Date(),
                last_success_at: new Date(),
                notifications_homeworks: true,
                notifications_marks: true,
                is_active: true
            })
            resolve()

        })
    }

    createNotification({ pronoteUsername, pronoteURL }, { type, title, body }) {
        return new Promise(async (resolve) => {
            let query = await Notifications.create({
                pronote_url: pronoteURL,
                pronote_username: pronoteUsername,
                type: type,
                title: title,
                body: body,
                created_at: new Date()
            })
            query.save()
            resolve(query)

        })
    }

    markNotificationSent(id, sentAt) {
        return new Promise(async (resolve) => {
            let query = await Notifications.update({
                sent_at: sentAt
            }, {
                where: {
                    id: id
                }
            })
            resolve()
        })

    }

    markNotificationRead(id, readAt) {
        return new Promise(async (resolve) => {
            let query = await Notifications.update({
                read_at: readAt
            }, {
                where: {
                    id: id
                }
            })
            resolve()
        })
    }

    async createUserLog({ pronoteUsername, pronoteURL, fcmToken }, { route, appVersion, date = new Date(), body, jwt }) {
        let query = await UsersLogs.create({
            pronote_url: pronoteURL,
            pronote_username: pronoteUsername,
            fcm_token: fcmToken,
            route: route,
            app_version: appVersion,
            date: date,
            body: body,
            jwt: jwt
        })
        query.save()
        return query
    }
};

module.exports = DatabaseService
