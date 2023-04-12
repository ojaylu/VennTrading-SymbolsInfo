const CyclicDb = require("@cyclic.sh/dynamodb")
const db = CyclicDb("defiant-duck-suspendersCyclicDB")

const symbols = db.collection("symbols_0")

// let leo = await animals.set("leo", {
//     type: "cat",
//     color: "orange"
// })

// get an item at key "leo" from collection animals
symbols.get("BTCUSDT").then(data => console.log(data));