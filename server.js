require("dotenv").config();

const connectDatabase = require("./src/config/database");
const app = require("./src/app");

const PORT = process.env.PORT || 3000;

connectDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Expense Tracker server running on http://localhost:${PORT}`);
  });
});
