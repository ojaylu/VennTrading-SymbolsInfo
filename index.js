// const cors = require("cors");
const { setSymbolsList, getSymbolsList } = require("./firestore");
const { Deta } = require("deta");
const app = require("express")();
const { Spot } = require("@binance/connector");
const deta = process.env.LOCAL? Deta("c0g4mgm6_BdytjHkNCyhT7m1TBN7wdCH3VJsoQVyk"): Deta();
const DB_NAME = "symbols";

let counter = 0;
const client = new Spot();

// function binanceErrorHandler(e) {
//     if (e.response) {
//         return e;
//     } else {
//         return new Error("error with request");
//     }
// }

// async function binanceResponseHandler(promise) {
//     try {
//         return [(await promise).data, null];
//     } catch(e) {
//         return [null, binanceErrorHandler(e)];
//     }
// }

async function promiseHandler(promise) {
    try {
        const data = await promise;
        return [data, null];
    } catch(e) {
        return [null, e];
    }
}

// function responseHandler(res) {
//     const [data, error] = res;
//     if (error) {
//         throw error;
//     } else {
//         return data;
//     }
// }

// app.use(cors());

app.get("/", async (req, res) => {
    const data = await client.exchangeInfo().then(response => response.data);
    res.send(data);
});

app.get("/api", (_, res) => {
    res.send("Express on Vercel");
});

app.get("/api/symbols", async (_, res, next) => {
    const [error, data] = await promiseHandler(getSymbolsList(`${DB_NAME}_${counter}`));
    if (error) {
        next(error);
    } else {
        res.json(data);
    }
});

app.get("/api/symbols/:symbol", async (req, res, next) => {
    const symbol = req.params.symbol;
    const db = deta.Base(`${DB_NAME}_${counter}`);
    const [data, error] = await promiseHandler(db.get(symbol));
    if (error) {
        next(error);
    } else {
        if (data) {
            res.json(data);
        } else {
            res.status(404);
            res.send("invalid symbol");
        }
    }
});

app.post("/api/symbols/actions", async (_, res, next) => {
    const [binanceData, binanceError] = await promiseHandler(fetch("https://testnet.binance.vision/api/v3/exchangeInfo").then(res => res.json()));
    if (binanceError) {
        console.log("error 1");
        res.status(500);
        res.send("error with binance api");
        return;
    }
    const symbolsList = [], symbolsInfo = {};
    console.log(binanceData.symbols)
    binanceData.symbols.forEach(async symbolInfo => {
        const { symbol, ...rest } = symbolInfo;
        if (rest.isSpotTradingAllowed && rest.status == 'TRADING') {
            symbolsList.push(symbol);
            symbolsInfo[symbol] = rest;
        }
    });

    try {
        const tdy = (counter + 1) % 2;

        await Promise.all([
            (async () => {
                const db = deta.Base(`${DB_NAME}_${tdy}`);
                const symbols = Object.keys(symbolsInfo);
                return Promise.all(symbols.map(async symbol => {
                    db.put(symbolsInfo[symbol], symbol);
                }));
            })(),
            (async () => {
                return setSymbolsList(`${DB_NAME}_${tdy}`, symbolsList);
            })()
        ]);

        console.log("write ran successfully");

        counter = tdy;
        const ytd = (tdy + 1) % 2;

        const previousSymbolsList = await getSymbolsList(`${DB_NAME}_${ytd}`);
        const previousDb = deta.Base(`${DB_NAME}_${ytd}`);
        previousSymbolsList.forEach(async symbol => {
            await previousDb.delete(symbol);
        });
    } catch(e) {
        res.status(500);
        next(e);
        return;
    }

    res.send("actions ran successfully");
});

app.listen(3000, () => {
    console.log(`running on port 3000.`);
});

module.exports = app;