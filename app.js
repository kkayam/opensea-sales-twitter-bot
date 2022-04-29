const axios = require("axios");
const _ = require("lodash");
const moment = require("moment");
const { ethers } = require("ethers");
const tweet = require("./tweet");
const cache = require("./cache");

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
  )}) #NFT #ENS #EMOJIENS ${openseaLink}`;

  //   console.log(tweetText);

  // OPTIONAL PREFERENCE - don't tweet out sales below X ETH (default is 1 ETH - change to what you prefer)
  // if (Number(formattedEthPrice) < 1) {
  //     console.log(`${assetName} sold below tweet price (${formattedEthPrice} ETH).`);
  //     return;
  // }

  var regex =
    /^[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]+$/gu;

  if (!assetName.includes(".eth")) {
    console.log(`${assetName} not ENS domain.`);
    return;
  }
  if (!regex.test(assetName.slice(0, -4))) {
    console.log(`${assetName} not only emojis.`);
    return;
  }

  // OPTIONAL PREFERENCE - if you want the tweet to include an attached image instead of just text
  const imageUrl = _.get(event, ["asset", "image_url"]);
  return tweet.tweetWithImage(tweetText, imageUrl);

  // return tweet.tweet(tweetText);
}

// Poll OpenSea every 60 seconds & retrieve all sales for a given collection in either the time since the last sale OR in the last minute
setInterval(() => {
  const lastSaleTime =
    cache.get("lastSaleTime", null) ||
    moment().startOf("minute").subtract(59, "seconds").unix();

  console.log(
    `Last sale (in seconds since Unix epoch): ${cache.get(
      "lastSaleTime",
      null
    )}`
  );

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

      console.log(`${events.length} sales since the last one...`);

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
