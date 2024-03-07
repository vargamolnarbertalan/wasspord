// IMPORT LIBRARIES AND INITIALIZE GLOBAL VARIABLES & CONSTANTS
const bodyParser = require('body-parser')
const express = require('express')
const session = require('express-session')
const dotenv = require('dotenv')
const path = require('path')
const mysql = require('mysql2')
dotenv.config({})

const PORT = process.env.PORT || 80

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 9,
    multipleStatements: true,
    dateStrings: true,
    authPlugins: {
        mysql_clear_password: () => () => Buffer.from(process.env.DB_PASSWORD + '\0')
    }
})

// MAIN FUNCTION CALL

;
(async() => {
    try {
        const text = await main();
    } catch (e) {
        console.log(e)
    }
})()

// FUNCTION DECLARATION
async function main() {
    const app = express()
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    //app.set('views', 'views')
    app.use(express.static('public'))
    app.use(bodyParser.urlencoded({
        extended: false
    }))
    app.use(bodyParser.json())
    app.set('trust proxy', true)
    app.use(session({
        secret: 'secret-key',
        resave: false,
        saveUninitialized: false,
    }))

    // GET REQUESTS

    app.get('/login', (req, res) => {
        if (req.session.loggedIn !== undefined && req.session.loggedIn == 1 && req.session.user.UserID !== undefined) {
            getActiveUserInfo(req.session.user.UserID).then(el => {
                if (el.status == 200) {
                    res.redirect('/')
                } else {
                    req.session.loggedIn = 0
                    req.session.destroy()
                    res.render('login')
                }
            })
        } else {
            req.session.loggedIn = 0
            req.session.destroy()
            res.render('login')
        }
    })

    app.get('/', (req, res) => {
        if (req.session.loggedIn !== undefined && req.session.loggedIn == 1 && req.session.user.UserID !== undefined) {
            getActiveUserInfo(req.session.user.UserID).then(el => {
                if (el.status == 200) { // LOGGED IN
                    const ejsdata = {
                        user: req.session.user
                    }
                    res.render('dashboard', { ejsdata })
                } else { // LOGGED OUT
                    req.session.loggedIn = 0
                    req.session.destroy()
                    res.redirect('/login')
                }
            })
        } else { // FIRST TIMER
            req.session.loggedIn = 0
            req.session.destroy()
            res.redirect('/login')
        }
    })

    app.get('/add/login', (req, res) => {
        if (req.session.loggedIn !== undefined && req.session.loggedIn == 1 && req.session.user.UserID !== undefined) {
            res.status(200).render('addlogin')
        } else {
            req.session.loggedIn = 0
            req.session.destroy()
            res.redirect('/login')
        }
    })

    app.get('/add/payment', (req, res) => {
        if (req.session.loggedIn !== undefined && req.session.loggedIn == 1 && req.session.user.UserID !== undefined) {
            res.status(200).render('addpayment')
        } else {
            req.session.loggedIn = 0
            req.session.destroy()
            res.redirect('/login')
        }
    })

    app.get('/logins', (req, res) => {
        if (req.session.loggedIn !== undefined && req.session.loggedIn == 1 && req.session.user.UserID !== undefined) {
            getActiveUserInfo(req.session.user.UserID).then(el => {
                if (el.status == 200) { // LOGGED IN
                    listLogins(req.session.user.UserID).then(loginList => {
                        //console.log(loginList)
                        const ejsdata = loginList
                        res.status(200).render('logins', { ejsdata })
                    })

                } else { // LOGGED OUT
                    req.session.loggedIn = 0
                    req.session.destroy()
                    res.redirect('/login')
                }
            })
        } else { // FIRST TIMER
            req.session.loggedIn = 0
            req.session.destroy()
            res.redirect('/login')
        }
    })

    app.get('/payments', (req, res) => {
        if (req.session.loggedIn !== undefined && req.session.loggedIn == 1 && req.session.user.UserID !== undefined) {
            getActiveUserInfo(req.session.user.UserID).then(el => {
                if (el.status == 200) { // LOGGED IN
                    listPayments(req.session.user.UserID).then(paymentList => {
                        //console.log(loginList)
                        const ejsdata = paymentList
                        res.status(200).render('payments', { ejsdata })
                    })

                } else { // LOGGED OUT
                    req.session.loggedIn = 0
                    req.session.destroy()
                    res.redirect('/login')
                }
            })
        } else { // FIRST TIMER
            req.session.loggedIn = 0
            req.session.destroy()
            res.redirect('/login')
        }
    })

    app.get('/register', (req, res) => {
        if (req.session.loggedIn !== undefined && req.session.loggedIn == 1) {
            res.redirect('/')
        } else {
            res.render('register')
        }
    })

    app.post('/register_user', (req, res) => {
        createNewUser(req.body.username, req.body.pw).then(createResult => {
            if (createResult.status == 200) {
                findUserID(req.body.username).then(el1 => {
                    var UserID = el1
                    getActiveUserInfo(UserID).then(el2 => {
                        const newUser = el2.data
                        req.session.loggedIn = 1
                        req.session.user = newUser
                        res.status(createResult.status).send(createResult.msg)
                    })
                })
            } else {
                res.status(createResult.status).send(createResult.msg)
            }
        })
    })

    app.post('/delete_login', (req, res) => {
        deleteLogin(req.body.LoginID).then(delResult => {
            res.status(delResult.status).send(delResult.msg)
        })
    })

    app.post('/delete_payment', (req, res) => {
        deletePayment(req.body.PaymentID).then(delResult => {
            res.status(delResult.status).send(delResult.msg)
        })
    })

    app.post('/add_new_login', (req, res) => {
        addNewLogin(req.body.service, req.body.username, req.body.password, req.session.user.UserID).then(addResult => {
            res.status(addResult.status).send(addResult.msg)
        })
    })

    app.post('/add_new_payment', (req, res) => {
        addNewPayment(req.body.name, req.body.holder, req.body.number, req.body.security, req.body.expiration, req.session.user.UserID).then(addResult => {
            res.status(addResult.status).send(addResult.msg)
        })
    })

    app.post('/edit_exs_login', (req, res) => {
        editExsLogin(req.body.LoginID, req.body.service, req.body.username, req.body.password).then(editResult => {
            res.status(editResult.status).send(editResult.msg)
        })
    })

    app.post('/edit_exs_payment', (req, res) => {
        editExsPayment(req.body.PaymentID, req.body.name, req.body.holder, req.body.number, req.body.security, req.body.expiration).then(editResult => {
            res.status(editResult.status).send(editResult.msg)
        })
    })

    app.post('/login_user', (req, res) => {
        loginCheck(req.body.username, req.body.pw).then(dbresult => {
            if (dbresult.status == 200) { //successful login
                findUserID(req.body.username).then(el1 => {
                    var UserID = el1
                    getActiveUserInfo(UserID).then(el2 => {
                        const newUser = el2.data
                        req.session.loggedIn = 1
                        req.session.user = newUser
                        res.status(dbresult.status).send(dbresult.msg)
                    })
                })
            } else {
                res.status(dbresult.status).send(dbresult.msg)
            }
        })
    })


    app.get('/logout', (req, res) => {
        req.session.loggedIn = 0
        req.session.destroy()
        res.status(200).send('Successfully logged out!')
    })

    app.get('*', async(req, res) => {
        res.redirect('/')
    })

    app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`))

}

function getActiveUserInfo(UserID) {
    return new Promise((resolve, reject) => {
        var user = {
            UserID: '',
            UserName: '',
            pw: ''
        }
        db.query(`
            SELECT * FROM users WHERE UserID = ?;
            `, [UserID], (err, dbres) => {
            var message = ''
            if (dbres && dbres.length > 0) {
                user.UserID = UserID
                user.UserName = dbres[0].UserName
                user.pw = dbres[0].pw
                message = `Got info of '${user.UserName}' successfully!`
                console.log(message)
                return resolve({
                    status: 200,
                    data: user,
                    msg: message
                })
            } else if (dbres.length == 0) {
                message = `User does not exist`
                console.log(message)
                return resolve({
                    status: 491,
                    msg: message
                })
            } else {
                message = `${err.code}`
                console.log(message)
                return resolve({
                    status: 492,
                    msg: message
                })
            }
        })
    })
}

function loginCheck(UserName, pw) {
    return new Promise((resolve, reject) => {
        db.query(`
        SELECT * FROM users WHERE UserName=?;
        `, [UserName], async(err, dbres) => {
            var message = ''
            if (!err) {
                if (dbres.length > 0) {
                    //console.log(dbres)
                    message = `User '${UserName}' found!`
                        //console.log(message)
                    if (pw == dbres[0].pw) {
                        message = `${UserName} successfully logged in!`
                        console.log(message)
                        return resolve({
                            status: 200,
                            msg: message
                        })
                    } else {
                        console.log(`User '${UserName}' entered wrong password!`)
                        return resolve({
                            status: 490,
                            msg: `Incorrect password!`
                        })
                    }
                } else {
                    //console.log(dbres)
                    message = `User '${UserName}' does not exist!`
                    console.log(message)
                    return resolve({
                        status: 491,
                        msg: message
                    })
                }
            } else {
                message = `Database related problem: ${err}`
                console.log(message)
                return resolve({
                    status: 492,
                    msg: message
                })
            }
        })
    })
}

function findUserID(username) {

    return new Promise((resolve, reject) => {
        db.query(`
        SELECT * FROM users WHERE UserName = ?;
        `, [username], (err, dbres) => {
            if (!err) {
                return resolve(dbres[0].UserID)
            } else {
                console.log(err.message)
                return reject(err)
            }
        })
    })
}



function listLogins(owner) {

    return new Promise((resolve, reject) => {
        db.query(`
        SELECT * FROM Logins WHERE owner = ?;
        `, [owner], (err, dbres) => {
            if (!err) {
                return resolve(dbres)
            } else {
                console.log(err.message)
                return reject(err)
            }
        })
    })
}

function listPayments(owner) {

    return new Promise((resolve, reject) => {
        db.query(`
        SELECT * FROM Payments WHERE owner = ?;
        `, [owner], (err, dbres) => {
            if (!err) {
                return resolve(dbres)
            } else {
                console.log(err.message)
                return reject(err)
            }
        })
    })
}

function createNewUser(UserName, pw) {
    return new Promise((resolve, reject) => {
        db.query(`
        INSERT INTO users (UserName, pw)
        VALUES (?, ?);
        `, [UserName, pw], (err, dbres) => {
            var message = ''
            if (!err) {
                message = `New user '${UserName}' registered successfully!`
                console.log(message)
                return resolve({
                    status: 200,
                    msg: message
                })
            } else {
                if (err.code == 'ER_DUP_ENTRY') {
                    message = `Username already in use!`
                    console.log(message)
                    return resolve({
                        status: 491,
                        msg: message
                    })
                }
                message = `${err.code + '\n' + err.message}`
                console.log(message)
                return resolve({
                    status: 492,
                    msg: message
                })
            }
        })
    })
}

function deleteLogin(LoginID) {
    return new Promise((resolve, reject) => {
        db.query(`
        DELETE FROM Logins WHERE LoginID = ?;
        `, [LoginID], (err, dbres) => {
            var message = ''
            if (!err) {
                message = `Login removed successfully!`
                console.log(message)
                return resolve({
                    status: 200,
                    msg: message
                })
            } else {
                message = `${err.code + '\n' + err.message}`
                console.log(message)
                return resolve({
                    status: 492,
                    msg: message
                })
            }
        })
    })
}

function addNewLogin(service, username, password, owner) {
    return new Promise((resolve, reject) => {
        db.query(`
        INSERT INTO Logins (service, username, password, owner) VALUES (?, ?, ?, ?);
        `, [service, username, password, owner], (err, dbres) => {
            var message = ''
            if (!err) {
                message = `Login added successfully!`
                console.log(message)
                return resolve({
                    status: 200,
                    msg: message
                })
            } else {
                message = `${err.code + '\n' + err.message}`
                console.log(message)
                return resolve({
                    status: 492,
                    msg: message
                })
            }
        })
    })
}

function editExsLogin(LoginID, service, username, password) {
    return new Promise((resolve, reject) => {
        db.query(`
        UPDATE Logins SET service = ?,  username = ?,  password = ? WHERE LoginID = ?;
        `, [service, username, password, LoginID], (err, dbres) => {
            var message = ''
            if (!err) {
                message = `Login edited successfully!`
                console.log(message)
                return resolve({
                    status: 200,
                    msg: message
                })
            } else {
                message = `${err.code + '\n' + err.message}`
                console.log(message)
                return resolve({
                    status: 492,
                    msg: message
                })
            }
        })
    })
}

function editExsPayment(PaymentID, name, holder, number, security, expiration) {
    return new Promise((resolve, reject) => {
        db.query(`
        UPDATE Payments SET name = ?, holder = ?,  number = ?, security = ?, expiration = ? WHERE PaymentID = ?;
        `, [name, holder, number, security, expiration, PaymentID], (err, dbres) => {
            var message = ''
            if (!err) {
                message = `Payment edited successfully!`
                console.log(message)
                return resolve({
                    status: 200,
                    msg: message
                })
            } else {
                message = `${err.code + '\n' + err.message}`
                console.log(message)
                return resolve({
                    status: 492,
                    msg: message
                })
            }
        })
    })
}

function deletePayment(PaymentID) {
    return new Promise((resolve, reject) => {
        db.query(`
        DELETE FROM Payments WHERE PaymentID = ?;
        `, [PaymentID], (err, dbres) => {
            var message = ''
            if (!err) {
                message = `Payment removed successfully!`
                console.log(message)
                return resolve({
                    status: 200,
                    msg: message
                })
            } else {
                message = `${err.code + '\n' + err.message}`
                console.log(message)
                return resolve({
                    status: 492,
                    msg: message
                })
            }
        })
    })
}

function addNewPayment(name, holder, number, security, expiration, owner) {
    return new Promise((resolve, reject) => {
        db.query(`
        INSERT INTO Payments (name, holder, number, security, expiration, owner) VALUES (?, ?, ?, ?, ?, ?);
        `, [name, holder, number, security, expiration, owner], (err, dbres) => {
            var message = ''
            if (!err) {
                message = `Payment added successfully!`
                console.log(message)
                return resolve({
                    status: 200,
                    msg: message
                })
            } else {
                message = `${err.code + '\n' + err.message}`
                console.log(message)
                return resolve({
                    status: 492,
                    msg: message
                })
            }
        })
    })
}