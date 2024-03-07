const axios = require('axios');
const qs = require('qs');
const dotenv = require('dotenv');
const { connectToDB, closeConnection } = require("./config/db");

// Load .env file
dotenv.config();

// If PORT is not defined, use default port
const PORT = process.env.PORT || 8999;
const { QUEUE_SERVICE_URL } = process.env;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const transltionRequest = async (sentence) => {
  return await axios.get(`http://0.0.0.0:${PORT}/api`, {
    params: {
      from: "en",
      to: "mn",
      text: sentence,
    },
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    paramsSerializer: (params) => qs.stringify(params),
  });
};

const queueService = async () => {
  let queueResponse = await axios.get(QUEUE_SERVICE_URL);

  const { status } = queueResponse;

  // retry queue service
  while (status !== 200) {
    console.log("retrying get queue service...");
    queueResponse = await axios.get(QUEUE_SERVICE_URL);
    await delay(3000);
  }

  const {
    data: {
      payload
    },
  } = queueResponse;

  return payload
}

const transltionService = async (sentence) => {
  let translationResponse = await transltionRequest(sentence);
  const { status: translationStatus } = translationResponse;

  // retry translation service
  while (translationStatus !== 200) {
    console.log("retrying translation service...");
    translationResponse = await transltionRequest(sentence);
    await delay(3000);
  }

  const {
    data: { result },
  } = translationResponse;

  return result;
}

const translate = async (queuePayload) => {
  try {
    const { id, sentence } = queuePayload;
    const mnTranslation = await transltionService(sentence);

    const db = await connectToDB()
    const collection = db.collection("result");

    console.log({ mn: mnTranslation, en: sentence })
    await collection.insertOne({ mn: mnTranslation, en: sentence });

    const sentenceCollection = db.collection("sentence");
    await sentenceCollection.updateOne({ _id: id }, { $set: { isTranslated: true } });
  } catch (error) {
    console.log(error);
    await closeConnection();
    console.log("retrying translate...");
    await delay(3000);
    await translate(queuePayload);
  }
};

const tranlateLoop = async () => {
  while (true) {
    const queuePayload = await queueService();
    await translate(queuePayload);
  }
}

(async () => {
  tranlateLoop();
  console.log("queue endeds");
})();