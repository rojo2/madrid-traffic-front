const express = require("express");
const app = express();

app.use("/", express.static(path.join(__dirname, "dist")));

app.listen(process.env.PORT);
