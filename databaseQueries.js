//db query for api1

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
