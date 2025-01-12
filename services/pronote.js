const Collection = require('@discordjs/collection')
const chalk = require('chalk')
const pronote = require('pronote-api')

class PronoteService {
    constructor () {
        this.casCache = new Collection()
    }

    async getEstablishments (latitude, longitude) {
        return pronote.geo(latitude, longitude)
    }

    parsePronoteURL (url) {
        console.log('Parsing URL ' + url)
        let newURL = url
        const pronoteIndexEducationRegex = /([a-zA-Z0-9]{8})\.index-education\.net/
        if (newURL.includes('index-education.net') && pronoteIndexEducationRegex.test(newURL)) {
            const matches = newURL.match(pronoteIndexEducationRegex)
            newURL = `https://${matches[1]}.index-education.net/pronote/`
        }
        console.log('Parsed URL ' + newURL)
        return newURL
    }

    async resolveCas ({ pronoteUsername, pronotePassword, pronoteURL }) { // currently not robust
   
        console.log('Resolving CAS ' + pronoteURL)
        if (this.casCache.has(pronoteURL) && this.casCache.get(pronoteURL) !== undefined) {
            return {
                cas: this.casCache.get(pronoteURL)
            }
        } else {
            const possiblesCas = await pronote.getCAS(pronoteURL).catch(() => {})
            console.log('Results from PAPI: ' + possiblesCas)
            if (!possiblesCas) {
                console.log('Final Result: none')
                return {
                    cas: 'none'
                }
            } else if (typeof possiblesCas === 'string') {
                console.log('Final Result: ' + possiblesCas)
                this.casCache.set(pronoteURL, possiblesCas)
                return {
                    cas: possiblesCas
                }
            } else {
                const fetchCas = async () => {
                    
                    const promises = possiblesCas.map((cas) => pronote.login(pronoteURL, pronoteUsername, pronotePassword, cas))
                    const results = await Promise.all(promises)
                    const workedSessionIndex = results.findIndex((r) => r !== undefined);
                    if (!workedSessionIndex) {
                        console.log(results);
                    }
                    return {
                        cas: possiblesCas[workedSessionIndex],
                        session: results[workedSessionIndex]
                    };
                }
                const { cas, session } = await fetchCas()
                if (cas) this.casCache.set(pronoteURL, cas)
                console.log('Final Result: ' + cas)
                return {
                    cas,
                    session: results.find((r) => r !== undefined)
                }
            }
        }
    }

    checkSession (userAuth, oldCache = {}, fetchID) {
        return new Promise((resolve, reject) => {
            const notifications = []
            let newCache = oldCache

            this.createSession(userAuth, fetchID).then((session) => {
                // Vérification des devoirs
                session.homeworks(new Date(Date.now()), session.params.lastDay).then((homeworks) => {
                    if (oldCache.homeworks_cache) {
                        const newHomeworks = homeworks.filter((work) => !(oldCache.homeworks_cache.some((cacheWork) => cacheWork.description === work.description)))
                        if (newHomeworks.length > 0 && newHomeworks.length <= 3) {
                            newHomeworks.forEach((work) => notifications.push({
                                type: 'homework',
                                title: `Nouveau devoir en ${work.subject}`,
                                body: work.description
                            }))
                        }
                    }

                    // Mise à jour du cache pour les devoirs
                    newCache = {
                        ...newCache,
                        ...{
                            homeworks_cache: homeworks
                        }
                    }

                    session.marks('trimester').then((marks) => {
                        if (!marks) {
                            marks = { subjects: [], empty: true }
                        } else if (oldCache.marks_cache && !oldCache.marks_cache.empty) {
                            const marksNotifications = []
                            marks.subjects.forEach((subject) => {
                                const cachedSubject = oldCache.marks_cache.subjects.find((sub) => sub.name === subject.name)
                                if (cachedSubject) {
                                    const newMarks = subject.marks.filter((mark) => !(cachedSubject.marks.some((cacheMark) => cacheMark.id === mark.id)))
                                    newMarks.forEach((mark) => marksNotifications.push({ subject, mark }))
                                } else {
                                    subject.marks.forEach((mark) => marksNotifications.push({ subject, mark }))
                                }
                            })
                            if (marksNotifications.length > 0 && marksNotifications.length < 3) {
                                marksNotifications.forEach((markNotif) => {
                                    notifications.push({
                                        type: 'mark',
                                        title: `Nouvelle note en ${markNotif.subject.name}`,
                                        body: `Note: ${markNotif.mark.value || 'ABS'}/${markNotif.mark.scale}\nMoyenne de la classe: ${markNotif.mark.average}/${markNotif.mark.scale}`
                                    })
                                })
                            }
                        }

                        // Mise à jour du cache pour les notes
                        newCache = {
                            ...newCache,
                            ...{
                                marks_cache: marks
                            }
                        }

                        // Déconnexion de Pronote
                        session.logout()

                        resolve([notifications, newCache])
                    })
                })
            }).catch((e) => {
                reject(e)
            })
        })
    }

    createSession ({ pronoteUsername, pronotePassword, pronoteURL, pronoteCAS }, fetchID) {
        return new Promise((resolve, reject) => {
            try {
                pronote.login(pronoteURL, pronoteUsername, pronotePassword, pronoteCAS || 'none', 'student').then((session) => {
                    resolve(session)
                }).catch((error) => {
                    const formattedUserCredentials = `(${pronoteUsername}:${pronotePassword}@${pronoteURL}:${pronoteCAS})`
                    if (error.code === 1) {
                        console.log(chalk.yellow(`#${fetchID} Connexion à Pronote : CAS est invalide pour ${pronoteUsername} (${pronoteCAS})`))
                    } else if (error.message === 'read ECONNRESET') {
                        console.log(chalk.red(`#${fetchID} Connexion à Pronote : serveur ${pronoteURL} inaccessible, connexion fermée`))
                    } else if (error.message === 'Wrong user credentials') {
                        console.log(chalk.red(`#${fetchID} Connexion à Pronote : mauvais identifiants ${formattedUserCredentials}`))
                    } else if (error.message.startsWith('connect ETIMEDOUT')) {
                        console.log(chalk.redBright(`#${fetchID} Connexion à Pronote : timeout lors de l\'authentification à ${pronoteURL}`))
                    } else if (error.message === 'You are being rate limited because of too many failed requests') {
                        console.log(chalk.redBright(`#${fetchID} Connexion à Pronote : API de Pronote Notifications bannie suite à de nombreuses connexions invalides ${pronoteURL}`))
                    } else if (error.message === 'Session has expired due to inactivity or error') {
                        console.log(chalk.redBright(`#${fetchID} Connexion à Pronote : La session a expiré lors de la connexion ${formattedUserCredentials}`))
                    } else {
                        console.log(chalk.red(`#${fetchID} ${error.message}`))
                    }
                    reject(error)
                })
            } catch {
                // eslint-disable-next-line prefer-promise-reject-errors
                reject()
            }
        })
    }
}

module.exports = PronoteService
