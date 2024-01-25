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
    const {tweetId} = request.params
    const {tweet} = request.body
    const authHeader = request.headers['authorization']
    let jwtToken
    if (authHeader !== undefined) {
      jwtToken = authHeader.split(' ')[1]
    }
    if (jwtToken === undefined) {
      response.status(401).send('Invalid JWT Token')
      return
    } else {
      jwt.verify(jwtToken, 'hello_saikiran', async (error, payload) => {
        if (error) {
          response.status(401).send('Invalid JWT Token')
        } else {
          request.username = payload.username
          request.tweet_id = tweetId
          request.tweet = tweet
          next()
        }
      })
    }
  } catch (e) {
    console.log('Provide Authorization in the header')
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
  const tweetsArray = await db.all(userLatestTweetsQuery)
  response.send(tweetsArray)
})

app.get('/user/following/', authenticateToken, async (request, response) => {
  const {username} = request
  console.log(username)
  const userFollowingQuery = `
  select user.name 
  from user 
  where user_id in (
      select following_user_id 
      from follower
      where follower_user_id = (
          select user_id from user
          where username = '${username}'
      )
  );
  `
  const followingArray = await db.all(userFollowingQuery)
  response.send(followingArray)
})

app.get('/user/followers/', authenticateToken, async (request, response) => {
  const {username} = request
  console.log(username)
  const userFollowersQuery = `
  select user.name 
  from user 
  where user_id in (
      select follower_user_id 
      from follower
      where following_user_id = (
          select user_id from user
          where username = '${username}'
      )
  );`
  const followersArray = await db.all(userFollowersQuery)
  response.send(followersArray)
})

app.get('/tweets/:tweetId', authenticateToken, async (request, response) => {
  const {username, tweet_id} = request
  let tweetId = parseInt(tweet_id)
  console.log(username, tweetId)
  const userIdQuery = `
  select user_id from user where username = '${username}';`
  const userObject = await db.get(userIdQuery)
  const userId = userObject.user_id
  const tweetIdArrayQuery = `
  select tweet_id from 
  tweet where user_id in (
    select following_user_id from
    follower where follower_user_id = ${userId}
  )`
  const tweetIdArrayObject = await db.all(tweetIdArrayQuery)
  const tweetIdArray = tweetIdArrayObject.map(item => {
    return item.tweet_id
  })
  console.log(tweetIdArray)
  const isTweetIdValid = tweetIdArray.includes(tweetId)
  console.log(isTweetIdValid)
  if (isTweetIdValid) {
    const tweetDetailsQuery = `
    SELECT
    tweet.tweet,
    COUNT(DISTINCT like.like_id) AS likes,
    COUNT(DISTINCT reply.reply_id) AS replies,
    tweet.date_time AS dateTime
    FROM
      tweet
      inner JOIN like ON tweet.tweet_id = like.tweet_id
      inner JOIN reply ON tweet.tweet_id = reply.tweet_id
    WHERE
    tweet.tweet_id = ${tweetId};
  `
    const tweetObject = await db.get(tweetDetailsQuery)
    response.send(tweetObject)
  } else {
    response.status(401).send('Invalid Request')
    return
  }
})

app.get(
  '/tweets/:tweetId/likes',
  authenticateToken,
  async (request, response) => {
    const {username, tweet_id} = request
    let tweetId = parseInt(tweet_id)
    console.log(username, tweetId)
    const userIdQuery = `
  select user_id from user where username = '${username}';`
    const userObject = await db.get(userIdQuery)
    const userId = userObject.user_id
    const tweetIdArrayQuery = `
  select tweet_id from 
  tweet where user_id in (
    select following_user_id from
    follower where follower_user_id = ${userId}
  )`
    const tweetIdArrayObject = await db.all(tweetIdArrayQuery)
    const tweetIdArray = tweetIdArrayObject.map(item => {
      return item.tweet_id
    })
    console.log(tweetIdArray)
    const isTweetIdValid = tweetIdArray.includes(tweetId)
    console.log(isTweetIdValid)
    if (isTweetIdValid) {
      const tweetDetailsQuery = `
    select distinct user.username
    from like left join user on like.user_id = user.user_id
    where like.tweet_id = ${tweetId};
    `
      const tweetObject = await db.all(tweetDetailsQuery)
      const tweetLikesNames = tweetObject.map(item => {
        return item.username
      })
      response.send({likes: tweetLikesNames})
    } else {
      response.status(401).send('Invalid Request')
      return
    }
  },
)

app.get(
  '/tweets/:tweetId/replies',
  authenticateToken,
  async (request, response) => {
    const {username, tweet_id} = request
    let tweetId = parseInt(tweet_id)
    console.log(username, tweetId)
    const userIdQuery = `
  select user_id from user where username = '${username}';`
    const userObject = await db.get(userIdQuery)
    const userId = userObject.user_id
    const tweetIdArrayQuery = `
  select tweet_id from 
  tweet where user_id in (
    select following_user_id from
    follower where follower_user_id = ${userId}
  )`
    const tweetIdArrayObject = await db.all(tweetIdArrayQuery)
    const tweetIdArray = tweetIdArrayObject.map(item => {
      return item.tweet_id
    })
    console.log(tweetIdArray)
    const isTweetIdValid = tweetIdArray.includes(tweetId)
    console.log(isTweetIdValid)
    if (isTweetIdValid) {
      const tweetDetailsQuery = `
    select user.name,
    reply.reply
    from reply inner join user on reply.user_id = user.user_id
    where reply.tweet_id = ${tweetId};
    `
      const tweetObject = await db.all(tweetDetailsQuery)
      response.send({replies: tweetObject})
    } else {
      response.status(401).send('Invalid Request')
      return
    }
  },
)

app.get('/user/tweets', authenticateToken, async (request, response) => {
  const {username} = request
  const userIdQuery = `
  select user_id from user where username = '${username}';`
  const userObject = await db.get(userIdQuery)
  const userId = userObject.user_id
  const getUserTweetsQuery = `
  select 
  tweet.tweet,
  count(distinct like.like_id) as likes,
  count(distinct reply.reply_id) as replies,
  tweet.date_time as dateTime
  from tweet
   inner join like on tweet.tweet_id = like.tweet_id 
   inner join reply on tweet.tweet_id = reply.tweet_id
  where tweet.user_id = ${userId}
  group by tweet.tweet_id;
  `
  const getUserTweetsObject = await db.all(getUserTweetsQuery)
  response.send(getUserTweetsObject)
})

app.post('/user/tweets', authenticateToken, async (request, response) => {
  const {username, tweet} = request
  const userIdQuery = `
  select user_id from user where username = '${username}';`
  const userObject = await db.get(userIdQuery)
  const userId = userObject.user_id
  const dateTime = new Date()
  const insertTweetQuery = `
  insert into tweet(tweet,user_id,date_time)
  values(
    '${tweet}',
     ${userId},
    '${dateTime}'
  );`
  await db.run(insertTweetQuery)
  response.send('Created a Tweet')
})

app.delete('/tweets/:tweetId', authenticateToken, async (request, response) => {
  const {username, tweet_id} = request
  let tweetId = parseInt(tweet_id)
  console.log(username, tweetId)
  const userIdQuery = `
  select user_id from user where username = '${username}';`
  const userObject = await db.get(userIdQuery)
  const userId = userObject.user_id
  const tweetIdArrayQuery = `
  select tweet.tweet_id 
  from user inner join 
  tweet on user.user_id = tweet.user_id
  where user.user_id = ${userId};`
  const tweetIdArrayObject = await db.all(tweetIdArrayQuery)
  const tweetIdArray = tweetIdArrayObject.map(item => {
    return item.tweet_id
  })
  console.log(tweetIdArray)
  const isTweetIdValid = tweetIdArray.includes(tweetId)
  console.log(isTweetIdValid)
  if (isTweetIdValid) {
    const tweetDetailsQuery = `
    delete from tweet 
    where tweet_id = ${tweetId};`
    await db.run(tweetDetailsQuery)
    response.send('Tweet Removed')
  } else {
    response.status(401).send('Invalid Request')
    return
  }
})

module.exports = app
