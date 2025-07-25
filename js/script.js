const API_URL = "https://official-joke-api.appspot.com/jokes/random";
const EXCHANGE_API_URL_WS = "wss://api.whitebit.com/ws";
const STATUS = {
  CONNECTED: "Connected",
  CONNECTING: "Connecting...",
  DISCONNECTED: "Disconnected",
  error: "error",
  ERROR_QUOTE_FETCHING: "Bad fetching quote",
  LOADING: "Loading...",
  POST_NO_TO_SAVE: "No post to save",
  POST_SAVED: "Post saved",
  POST_SAVING: "Saving post...",
  POST_SAVING_ERROR: "Bad saving post",
  SUCCESS: "Success",
  WS_CONNECT_ERROR: "Bad websocket connection",
};

const currencyPriceEl = document.getElementById("currency-price");
const currencyStatusEl = document.getElementById("currency-status");
const generateBtn = document.getElementById("generate");
const postEl = document.getElementById("post");
const saveBtn = document.getElementById("save");
const statusEl = document.getElementById("status");
const trendEl = document.getElementById("trend");

const currencyPriceRender = makeTextContentRenderer(currencyPriceEl);
const currencyStatusRender = makeTextContentRenderer(currencyStatusEl);
const statusRender = makeTextContentRenderer(statusEl);
const trendRender = makeTextContentRenderer(trendEl);

exchangeConnect();

generateBtn.addEventListener("click", async () => {
  statusRender(STATUS.LOADING);

  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    const { message = "", type = "" } = data;

    if (type === STATUS.error) {
      throw new Error(message);
    }

    const textForPost = jokeTextMake(data);

    postFill(textForPost);
    statusRender(STATUS.SUCCESS);
  } catch (error) {
    statusRender(STATUS.ERROR_QUOTE_FETCHING);
    console.log(STATUS.ERROR_QUOTE_FETCHING, error);
  }
});

saveBtn.addEventListener("click", async () => {
  const postContent = postEl.value;

  if (!postContent) {
    statusRender(STATUS.POST_NO_TO_SAVE);

    return;
  }

  statusRender(STATUS.POST_SAVING);

  try {
    await new Promise((resolve) => {
      setTimeout(resolve, 1500);
    });
    statusRender(STATUS.POST_SAVED);
    postFill();
  } catch (e) {
    statusRender(STATUS.POST_SAVING_ERROR);
  }
});

function classNames({ el = null, classesList = {} } = {}) {
  if (!el) return;

  const classes = Object.keys(classesList) || [];

  classes.forEach((cn) => {
    const isAdd = classesList[cn];

    isAdd ? el.classList.add(cn) : el.classList.remove(cn);
  });
}

function exchangeConnect() {
  const socket = new WebSocket(EXCHANGE_API_URL_WS);

  classNames({
    el: currencyStatusEl,
    classesList: {
      connecting: true,
      disconnected: false,
    },
  });
  currencyStatusRender(STATUS.CONNECTING);

  socket.onclose = (e) => {
    console.log("Disconnected from Whitebit API", e);
    currencyStatusRender(STATUS.DISCONNECTED);
    classNames({
      el: currencyStatusEl,
      classesList: {
        connected: false,
        connecting: false,
        disconnected: true,
      },
    });

    setTimeout(exchangeConnect, 3000);
  };

  socket.onerror = (e) => {
    console.log(STATUS.WS_CONNECT_ERROR);
    currencyStatusRender(STATUS.DISCONNECTED);
    classNames({
      el: currencyStatusEl,
      classesList: {
        connected: false,
        connecting: false,
        disconnected: true,
      },
    });
  };

  socket.onmessage = (e) => {
    const data = JSON.parse(e.data);

    if (data.method === "depth_update") {
      const price = data.params?.[1]?.bids?.[0]?.[0];

      if (price) {
        const priceDiff =
          parseFloat(currencyPriceEl.textContent.substring(1)) - price;
        const trendContent = priceDiff < 0 ? "↓" : "↑";

        currencyPriceRender(`$${price}`);
        trendRender(trendContent);
        classNames({
          el: trendEl,
          classesList: {
            connected: priceDiff >= 0,
            disconnected: priceDiff < 0,
          },
        });
      }
    }
  };

  socket.onopen = () => {
    classNames({
      el: currencyStatusEl,
      classesList: {
        connected: true,
        connecting: false,
        disconnected: false,
      },
    });
    currencyStatusRender(STATUS.CONNECTED);

    const message = {
      id: 1,
      method: "depth_subscribe",
      params: ["BTC_USDT", 1, "0"],
    };

    socket.send(JSON.stringify(message));
  };
}

function jokeTextMake(data = {}) {
  const { punchline = "", setup = "" } = data || {};

  return `${setup} - ${punchline}`;
}

function makeTextContentRenderer(el = null) {
  return function (text = "") {
    if (!el) return;

    el.textContent = text;
  };
}

function postFill(value = "") {
  postEl.value = value;
}
