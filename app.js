const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

const db_path = path.join(__dirname, 'twitterClone.db')

let db = null
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: db_path,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server running at port 3000....')
    })
  } catch (e) {
    console.log(`dbError : ${e.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const authenticateToken = async (request, response, next) => {
  try {
    const authHeader = request.headers['authorization']
    if (!authHeader) {
      response.status(401).send('Missing Authorization Header')
      return
    }

    const tokenParts = authHeader.split(' ')
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      response.status(401).send('Invalid Authorization Header Format')
      return
    }

    const jwtToken = tokenParts[1]

    jwt.verify(jwtToken, 'hello_saikiran', async (error, payload) => {
      if (error) {
        console.error('Error during JWT verification:', error.message)
        response.status(401).send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  } catch (error) {
    console.error('Error in authenticateToken middleware:', error.message)
    response.status(500).send('Internal Server Error')
  }
}

app.post('/register/', async (request, response) => {
  const userDetails = request.body
  const {username, password, name, gender} = userDetails
  const checkUsernameQuery = `
  select * from user where username = '${username}';`
  const userExists = await db.get(checkUsernameQuery)
  if (userExists !== undefined) {
    response.status(400)
    response.send('User already exists')
    return
  } else {
    if (password.length >= 6) {
      const newPassword = await bcrypt.hash(password, 10)
      const newUserInsertQuery = `
      insert into
      user (name,username,password,gender)
      values (
        '${name}',
        '${username}',
        '${newPassword}',
        '${gender}'
      );`
      await db.run(newUserInsertQuery)
      response.status(200).send('User created successfully')
      return
    } else {
      response.status(400).send('Password is too short')
      return
    }
  }
})

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const checkUsernameQuery = `
  select * from user where username = '${username}';`
  const userExists = await db.get(checkUsernameQuery)
  if (userExists === undefined) {
    response.status(400)
    response.send('Invalid user')
    return
  } else {
    const validPassword = await bcrypt.compare(password, userExists.password)
    if (validPassword) {
      const payload = {
        username: username,
      }
      const jwtToken = await jwt.sign(payload, 'hello_saikiran')
      response.send({jwtToken})
    } else {
      response.status(400).send('Invalid password')
    }
  }
})

app.get('/user/tweets/feed/', authenticateToken, async (request, response) => {
  const {username} = request
  console.log(username)
  const userLatestTweetsQuery = `
    select user.username,
  tweet.tweet,
  tweet.date_time as dateTime
  from (user inner join 
  follower on user.user_id = follower.following_user_id) as t
  inner join tweet on t.following_user_id = tweet.user_id
  where follower_user_id = (
      select user_id 
      from user
      where username = '${username}'
  )
  order by tweet.date_time desc
  limit 4;
  `
})
