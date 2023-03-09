// const cors = require("cors");
const { setSymbolsList, getSymbolsList } = require("./firestore");
const app = require("express")();
const CyclicDb = require("@cyclic.sh/dynamodb")
const db = CyclicDb("defiant-duck-suspendersCyclicDB");

const DB_NAME = "symbols";
const port = process.env.PORT || 3000

let counter = 0;

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

app.get("/api", (_, res) => {
    res.send("Successful");
});

app.get("/api/symbols", async (_, res, next) => {
    const [data, error] = await promiseHandler(getSymbolsList(`${DB_NAME}_${counter}`));
    if (error) {
        next(error);
    } else {
        res.json(data);
    }
});

app.get("/api/symbols/:symbol", async (req, res, next) => {
    const symbol = req.params.symbol;
    const symbolsDb = db.collection(`${DB_NAME}_${counter}`);
    const [data, error] = await promiseHandler(symbolsDb.get(symbol));
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
    binanceData.symbols.forEach(symbolInfo => {
        const { symbol, ...rest } = symbolInfo;
        if (rest.isSpotTradingAllowed && rest.status == 'TRADING') {
            symbolsList.push(symbol);
            symbolsInfo[symbol] = rest;
        }
    });

    try {
        const ytd = counter;
        const tdy = (counter + 1) % 2;

        await Promise.all([
            (async () => {
                const symbolsDb = db.collection(`${DB_NAME}_${tdy}`);
                const symbols = Object.keys(symbolsInfo);
                return Promise.all(symbols.map(async symbol => {
                    console.log(typeof symbolsInfo[symbol]);
                    symbolsDb.set(symbol, symbolsInfo[symbol]);
                }));
            })(),
            (async () => {
                return setSymbolsList(`${DB_NAME}_${tdy}`, symbolsList);
            })()
        ]);

        console.log("write ran successfully");

        counter = tdy;

        const previousSymbolsList = await getSymbolsList(`${DB_NAME}_${ytd}`);
        const previousDb = db.collection(`${DB_NAME}_${ytd}`);
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

app.listen(port, () => {
    console.log(`running on port 3000.`);
});

module.exports = app;