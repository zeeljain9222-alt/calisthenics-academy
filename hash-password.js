const bcrypt = require("bcrypt");

async function generateHash() {
  const password = "admin7654321";
  const hash = await bcrypt.hash(password, 10);

  console.log(hash);
}

generateHash();