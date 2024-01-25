//db query for api3

/*
select user.username,
tweet.tweet,
tweet.date_time as dateTime
from (user inner join 
follower on user.user_id = follower.following_user_id) as t
inner join tweet on t.following_user_id = tweet.user_id
where follower_user_id = (
    select user_id 
    from user
    where username = 'JoeBiden'
)
order by tweet.date_time desc
limit 4;

*/

//db query for api4

/*
select user.username as name,
  from (user inner join 
  follower on user.user_id = follower.following_user_id) as t
  inner join tweet on t.following_user_id = tweet.user_id
  where follower_user_id = (
      select user_id 
      from user
      where username = '${username}'
  );
*/

//db query for api5

/*
select user.name 
from user 
where user_id in (
    select follower_user_id 
    from follower
    where following_user_id = (
        select user_id from user
        where username = '${username}'
    )
);
*/

//db query for api6

/*
select tweet.tweet_id 
  from (user inner join 
  follower on user.user_id = follower.following_user_id) as t
  inner join tweet on t.following_user_id = tweet.user_id
  where follower_user_id = ${userId};
*/

/*
select 
tweet.tweet,
count(like.like_id) as likes,
count(reply.reply_id) as replies,
tweet.date_time as dateTime
from (tweet inner join 
reply on tweet.tweet_id = reply.tweet_id) as t
inner join like on t.tweet_id = like.tweet_id
where tweet.tweet_id = 7;
*/

//db query for api7

/*
select tweet.tweet_id 
  from (user inner join 
  follower on user.user_id = follower.following_user_id) as t
  inner join tweet on t.following_user_id = tweet.user_id
  where follower_user_id = ${userId};
*/

/*
select username
from user 
where user_id in (
select 
like.user_id
from (tweet inner join 
reply on tweet.tweet_id = reply.tweet_id) as t
inner join like on t.tweet_id = like.tweet_id
where tweet.tweet_id = 7
);

*/


//db query for api8

/*
select tweet.tweet_id 
  from (user inner join 
  follower on user.user_id = follower.following_user_id) as t
  inner join tweet on t.following_user_id = tweet.user_id
  where follower_user_id = ${userId};
*/

/*
select 
user.name,
reply.reply
from ((tweet inner join 
reply on tweet.tweet_id = reply.tweet_id) as t
inner join like on t.tweet_id = like.tweet_id) as p
inner join user on user.user_id = reply.user_id
where tweet.tweet_id = 7;

optional

select user.name,
reply.reply
from user inner join reply
on user.user_id = reply.user_id
where reply.user_id in (
select 
reply.user_id
from (tweet inner join 
reply on tweet.tweet_id = reply.tweet_id) as t
inner join like on t.tweet_id = like.tweet_id
where tweet.tweet_id = 7
);

*/


//db query for api9


/*
select 
tweet.tweet,
count(like.like_id) as likes,
count(reply.reply_id) as replies,
tweet.date_time as dateTime
from (tweet inner join 
reply on tweet.tweet_id = reply.tweet_id) as t
inner join like on t.tweet_id = like.tweet_id
where tweet.user_id = 2
group by tweet.tweet_id;

*/

