const express = require("express");
const mongoose = require("mongoose");

require("dotenv").config();
const app = express();



mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("db connected");
    app.listen(PORT, () => {
      console.log(`Server listening at PORT: ${PORT}...`);
    });
  })
  .catch((error) => {
    console.log("Error Occured :" + error);
  });
