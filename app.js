const axios = require("axios");
const _ = require("lodash");
const moment = require("moment");
const { ethers } = require("ethers");
const tweet = require("./tweet");
const cache = require("./cache");
const emojiRegex = require("emoji-regex");
const { max, slice } = require("lodash");

// Format tweet text
function formatAndSendTweet(event) {
  // Handle both individual items + bundle sales
  const assetName = _.get(
    event,
    ["asset", "name"],
    _.get(event, ["asset_bundle", "name"])
  );
  const openseaLink = _.get(
    event,
    ["asset", "permalink"],
    _.get(event, ["asset_bundle", "permalink"])
  );

  const totalPrice = _.get(event, "total_price");

  const tokenDecimals = _.get(event, ["payment_token", "decimals"]);
  const tokenUsdPrice = _.get(event, ["payment_token", "usd_price"]);
  const tokenEthPrice = _.get(event, ["payment_token", "eth_price"]);

  const formattedUnits = ethers.utils.formatUnits(totalPrice, tokenDecimals);
  const formattedEthPrice = formattedUnits * tokenEthPrice;
  const formattedUsdPrice = formattedUnits * tokenUsdPrice;

  const tweetText = `${assetName} bought for ${formattedEthPrice}${
    ethers.constants.EtherSymbol
  } ($${Number(formattedUsdPrice).toFixed(
    2
  )})!!! #NFT #ENS #EMOJIENS #EMOJI ${openseaLink}`;

  // OPTIONAL PREFERENCE - don't tweet out sales below X ETH (default is 1 ETH - change to what you prefer)
  if (Number(formattedEthPrice) < Number(process.env.eth_boundary)) {
    console.log(
      `${assetName} sold below tweet price (${formattedEthPrice} ETH).`
    );
    return;
  }

  if (!assetName.includes(".eth")) {
    console.log(`${assetName} not ENS domain.`);
    return;
  }

  var regex = emojiRegex();
  regex = new RegExp("^" + regex.source + "+$", regex.flags);

  if (!regex.test(assetName.slice(0, assetName.indexOf(".eth")))) {
    console.log(`${assetName} not only emojis.`);
    return;
  }

  console.log(`Posting ${assetName}!`);

  // OPTIONAL PREFERENCE - if you want the tweet to include an attached image instead of just text
  // const imageUrl = _.get(event, ["asset", "image_preview_url"]);
  // return tweet.tweetWithImage(tweetText, imageUrl);

  return tweet.tweet(tweetText);
}

function summarizeWeek() {
  tweet.getRecentTweets().then((tweets) => {
    var prev_posts = tweets.filter((tweet) =>
      tweet.text.includes("Last Week in ENS Emojis")
    );
    console.log("prev post length " + prev_posts.length);
    if (prev_posts.length != 1) {
      return;
    }
    return;

    var sales = tweets.filter((tweet) => tweet.text.includes("bought"));

    var count = sales.length;

    var usdRegex = /\$(\d+\.*\d*)/gm;
    var ethRegex = /(\d+\.*\d*)Ξ/gm;
    var maxSale = sales.reduce(function (prev, current) {
      return parseFloat(prev.text.match(usdRegex)[0].replace("$", "")) >
        parseFloat(current.text.match(usdRegex)[0].replace("$", ""))
        ? prev
        : current;
    });
    var maxUsd = parseFloat(maxSale.text.match(usdRegex)[0].replace("$", ""));
    var maxEth = parseFloat(maxSale.text.match(ethRegex)[0].replace("Ξ", ""));

    const averageUsd = (
      sales.reduce(
        (total, next) =>
          total + parseFloat(next.text.match(usdRegex)[0].replace("$", "")),
        0
      ) / count
    ).toFixed(2);
    const averageEth = (
      sales.reduce(
        (total, next) =>
          total + parseFloat(next.text.match(ethRegex)[0].replace("Ξ", "")),
        0
      ) / count
    ).toFixed(2);
    sales.sort(function (a, b) {
      return (
        parseFloat(b.text.match(ethRegex)[0].replace("Ξ", "")) -
        parseFloat(a.text.match(ethRegex)[0].replace("Ξ", ""))
      );
    });
    var top3 = sales.slice(0, 3).map((tweet) => {
      return (
        tweet.text.slice(0, tweet.text.indexOf(".eth") + 4) +
        " " +
        tweet.text.match(ethRegex)[0] +
        " (" +
        tweet.text.match(usdRegex)[0] +
        ")"
      );
    });

    var weeklySummary = `Last Week in ENS Emojis (Over 0.1Ξ):\n\nNumber of Sales: ${count}\nHighest Sale: ${maxEth}Ξ ($${maxUsd})\nAverage Price: ${averageEth}Ξ ($${averageUsd})\n\nMajor Moves This Week:\n1.${top3[0]}\n2.${top3[1]}\n3.${top3[2]}\n#NFT #ENS #EMOJIENS #EMOJI`;

    // console.log(weeklySummary);
    return tweet.tweetWithImage(
      weeklySummary,
      "https://i.imgur.com/KDUZore.jpeg"
    );
  });
}
var test = new Date();
console.log(test.getDay());

// Check if already summarized and summarize
setInterval(() => {
  var now = new Date();
  console.log("trying to summarize week");
  if (now.getDay() == 0) {
    summarizeWeek();
  }
}, 20000);

// Poll OpenSea every 60 seconds & retrieve all sales for a given collection in either the time since the last sale OR in the last minute
setInterval(() => {
  var d = new Date(0);
  const lastSaleTime =
    cache.get("lastSaleTime", null) ||
    moment().startOf("minute").subtract(59, "seconds").unix();

  axios
    .get("https://api.opensea.io/api/v1/events", {
      headers: {
        "X-API-KEY": process.env.X_API_KEY,
      },
      params: {
        collection_slug: process.env.OPENSEA_COLLECTION_SLUG,
        event_type: "successful",
        occurred_after: lastSaleTime,
        only_opensea: "false",
      },
    })
    .then((response) => {
      const events = _.get(response, ["data", "asset_events"]);

      const sortedEvents = _.sortBy(events, function (event) {
        const created = _.get(event, "created_date");

        return new Date(created);
      });
      d.setUTCSeconds(cache.get("lastSaleTime", null));

      // console.log(
      //   `Sales since ${d.toTimeString()}: ${_.map(sortedEvents, "asset.name")}`
      // );
      if (process.env.verbose == "true") {
        console.log(events);
      }

      _.each(sortedEvents, (event) => {
        const created = _.get(event, "created_date");

        cache.set("lastSaleTime", moment(created).unix());

        return formatAndSendTweet(event);
      });
    })
    .catch((error) => {
      console.error(error);
    });
}, 60000);
