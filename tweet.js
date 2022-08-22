const axios = require("axios");
const { TwitterApi } = require("twitter-api-v2");
require("dotenv").config();

const twitterConfig = {
  appKey: process.env.CONSUMER_KEY,
  appSecret: process.env.CONSUMER_SECRET,
  accessToken: process.env.ACCESS_TOKEN_KEY,
  accessSecret: process.env.ACCESS_TOKEN_SECRET,
};

const twitterClient = new TwitterApi(twitterConfig);

// Tweet a text-based status
async function tweet(tweetText) {
  await twitterClient.v2.tweet(tweetText);
  console.log(`Successfully tweeted: ${tweetText}`);
}

// OPTIONAL - use this method if you want the tweet to include the full image file of the OpenSea item in the tweet.
async function tweetWithImage(tweetText, imageUrl) {
  // Format our image to base64
  var image = await getBase64(imageUrl);
  // Upload image
  var mediaId = await twitterClient.v1.uploadMedia(image, {
    mimeType: "EUploadMimeType." + imageUrl.split(".").pop(),
  });
  // Tweet with mediaId of image
  await twitterClient.v1.tweet(tweetText, {
    media_ids: [mediaId],
  });
  console.log(`Successfully tweeted: ${tweetText}`);
}

async function getRecentTweets() {
  return new Promise(async (resolve, reject) => {
    const now = new Date();

    var lastWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 7
    )
      .toJSON()
      .slice(0, 10);
      
    const jackTimeline = await twitterClient.v2.userTimeline(
      "1500147643737124864",
      { start_time: lastWeek + "T00:00:00Z" }
    );
    var response = await jackTimeline.fetchLast(1000);
    resolve(response._realData.data);
  });
}

// Format a provided URL into a buffer object
function getBase64(url) {
  return axios
    .get(url, { responseType: "arraybuffer" })
    .then((response) => Buffer.from(response.data));
}

module.exports = {
  tweet: tweet,
  tweetWithImage: tweetWithImage,
  getRecentTweets: getRecentTweets,
};
