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

class DatabaseService {



    query(query, ...parameters) {
        return new Promise((resolve) => {
            db.query(query, parameters).then((result) => {
                resolve(result)
            })
        })
    }

    fetchFCMToken(fcmToken) {
        return new Promise((resolve) => {
            UsersTokens.findOne({
                where: {
                    fcm_token: fcmToken
                }
            }).then((row) => {
                resolve(formatFCMToken(row))
            }
            )

        })
    }

    fetchUser(pronoteUsername, pronoteURL) {
        return new Promise((resolve) => {
            Users.findOne({
                where: {
                    pronote_username: pronoteUsername,
                    pronote_url: pronoteURL
                }
            }).then((row) => {
                resolve(formatUser(row))
            })
        })
    }

    deleteUser({ pronoteUsername, pronoteURL }) {
        return new Promise((resolve) => {
            Users.destroy({
                where: {
                    pronote_username: pronoteUsername,
                    pronote_url: pronoteURL
                }
            }).then(() => {
                resolve()
            }
            )
        })
    }

    fetchUsers() {
        return new Promise((resolve) => {
            Users.findAll().then((rows) => {
                resolve(rows.map(formatUser))
            }
            )
        })
    }

    fetchUsersCache() {
        return new Promise((resolve) => {
            UsersCaches.findAll().then((rows) => {
                resolve(rows.map((row) => ({
                    pronoteURL: row.pronote_url,
                    pronoteUsername: row.pronote_username,
                    homeworksCache: row.homeworks_cache,
                    marksCache: row.marks_cache,
                    lastUpdateAt: row.last_update_at
                })))
            }
            )
        })
    }

    fetchFCMTokens() {
        return new Promise((resolve) => {
            UsersTokens.findAll().then((rows) => {
                resolve(rows.map(formatFCMToken))
            })
        })
    }

    fetchUserNotifications(pronoteUsername, pronoteURL) {
        return new Promise((resolve) => {
            Notifications.findAll({
                where: {
                    pronote_username: pronoteUsername,
                    pronote_url: pronoteURL
                }
            }).then((rows) => {
                resolve(rows.map((row) => ({
                    id: row.id,
                    pronoteURL: row.pronote_url,
                    pronoteUsername: row.pronote_username,
                    title: row.title,
                    body: row.body,
                    type: row.type,
                    createdAt: row.created_at
                })))
            })
        })
    }

    markLastActiveAt(token, date) {
        return new Promise((resolve) => {
            UsersTokens.update({
                last_active_at: date
            }, {
                where: {
                    fcm_token: token
                }
            }).then(() => {
                resolve()
            }
            )
        })
    }

    markLastSuccessAt(token, date) {
        return new Promise((resolve) => {
            UsersTokens.update({
                last_success_at: date
            }, {
                where: {
                    fcm_token: token
                }
            }).then(() => {
                resolve()
            }
            )
        })
    }

    updateUserCache({ pronoteUsername, pronoteURL }, { homeworksCache, marksCache }) {
        return new Promise((resolve) => {
            // insert or update
            UsersCaches.upsert({
                pronote_url: pronoteURL,
                pronote_username: pronoteUsername,
                homeworks_cache: homeworksCache,
                marks_cache: marksCache,
                last_update_at: new Date()
            }).then(() => {
                resolve()
            })
        })
    }

    invalidateUserPassword({ pronoteUsername, pronoteURL }, invalidate = true) {
        return new Promise((resolve) => {
            Users.update({
                password_invalidated: invalidate
            }, {
                where: {
                    pronote_username: pronoteUsername,
                    pronote_url: pronoteURL
                }
            }).then(() => {
                resolve()
            }
            )
        })
    }

    updateUserPassword({ pronoteUsername, pronoteURL, newPassword }) {
        return new Promise((resolve) => {
            Users.update({
                pronote_password: newPassword,
                password_invalidated: false
            }, {
                where: {
                    pronote_username: pronoteUsername,
                    pronote_url: pronoteURL
                }
            }).then(() => {
                resolve()
            }
            )
        })
    }

    createUser({ pronoteUsername, pronotePassword, pronoteURL, pronoteCAS, fullName, studentClass, establishment }) {
        return new Promise((resolve) => {
            Users.upsert({
                pronote_url: pronoteURL,
                pronote_username: pronoteUsername,
                pronote_password: pronotePassword,
                pronote_cas: pronoteCAS,
                full_name: fullName,
                student_class: studentClass,
                establishment: establishment,
                password_invalidated: false
            }).then(() => {
                resolve()
            }
            )
        })
    }

    updateToken(token, data) {
        return new Promise((resolve) => {
            const updates = []
            if (Object.prototype.hasOwnProperty.call(data, 'notificationsHomeworks')) updates.push(`notifications_homeworks = ${data.notificationsHomeworks}`)
            if (Object.prototype.hasOwnProperty.call(data, 'notificationsMarks')) updates.push(`notifications_marks = ${data.notificationsMarks}`)
            if (Object.prototype.hasOwnProperty.call(data, 'isActive')) updates.push(`is_active = ${data.isActive}`)
            UsersTokens.update({
                last_active_at: new Date()
            }, {
                where: {
                    fcm_token: token
                }
            }).then(() => {
                if (updates.length > 0) {
                    UsersTokens.update(updates.join(', '), {
                        where: {
                            fcm_token: token
                        }
                    }).then(() => {
                        resolve()
                    })
                } else {
                    resolve()
                }
            }
            )
        })
    }

    createOrUpdateToken({ pronoteUsername, pronoteURL }, token, deviceID) {
        return new Promise((resolve) => {
            UsersTokens.upsert({
                pronote_url: pronoteURL,
                pronote_username: pronoteUsername,
                fcm_token: token,
                device_id: deviceID,
                last_active_at: new Date(),
                last_success_at: new Date(),
                notifications_homeworks: true,
                notifications_marks: true,
                is_active: true
            }).then(() => {
                resolve()
            }
            )
        })
    }

    createNotification({ pronoteUsername, pronoteURL }, { type, title, body }) {
        return new Promise((resolve) => {
            Notifications.create({
                pronote_url: pronoteURL,
                pronote_username: pronoteUsername,
                type: type,
                title: title,
                body: body,
                created_at: new Date()
            }).then(() => {
                resolve()
            }
            )
        })
    }

    markNotificationSent(id, sentAt) {
        return new Promise((resolve) => {
            Notifications.update({
                sent_at: sentAt
            }, {
                where: {
                    id: id
                }
            }).then(() => {
                resolve()
            }
            )
        })
    }

    markNotificationRead(id, readAt) {
        return new Promise((resolve) => {
            Notifications.update({
                read_at: readAt
            }, {
                where: {
                    id: id
                }
            }).then(() => {
                resolve()
            }
            )
        })
    }

    createUserLog({ pronoteUsername, pronoteURL, fcmToken }, { route, appVersion, date = new Date(), body, jwt }) {
        return UsersLogs.create({
            pronote_url: pronoteURL,
            pronote_username: pronoteUsername,
            fcm_token: fcmToken,
            route: route,
            app_version: appVersion,
            date: date,
            body: body,
            jwt: jwt
        })
    }
};

module.exports = DatabaseService
