/*
 * ============================================================
 * config/db.js — Database Connection
 * ============================================================
 * WHAT THIS FILE DOES:
 *   This file is responsible for one job: opening a connection
 *   between our Node.js server and the MongoDB database.
 *
 * WHY WE NEED IT:
 *   MongoDB is a separate program (or cloud service) running
 *   on its own. Our Express server can't read or write data
 *   until it "shakes hands" and opens a connection. Without
 *   this file, none of our routes could save or load anything.
 *
 * HOW IT FITS IN THE SYSTEM:
 *   server.js imports and calls connectDB() once at startup.
 *   After that, Mongoose keeps the connection alive for the
 *   lifetime of the process — we don't need to reconnect for
 *   every request.
 *
 * WHAT IS MONGOOSE?
 *   Mongoose is a library that sits on top of the official
 *   MongoDB driver and makes it much easier to use. Instead
 *   of writing raw MongoDB queries, you define JavaScript
 *   objects (Schemas and Models) and Mongoose translates your
 *   code into MongoDB operations automatically.
 * ============================================================
 */

// ── Import ──────────────────────────────────────────────────
// 'mongoose' is an npm package. require() loads it from
// the node_modules folder (installed via npm install mongoose).
const mongoose = require('mongoose');

// ── Connection Function ──────────────────────────────────────
/*
 * connectDB is declared as an async function because connecting
 * to MongoDB takes time (it's a network operation). In Node.js,
 * long-running operations return a "Promise" — a placeholder
 * for a value that will arrive in the future.
 *
 * The 'async' keyword lets us use 'await' inside the function.
 * 'await' pauses execution of THIS function until the Promise
 * resolves, without freezing the entire server.
 *
 * Think of it like ordering food: you (the function) wait for
 * your order (the Promise) without blocking the whole restaurant.
 */
const connectDB = async () => {
  // try/catch lets us handle errors gracefully.
  // Code in 'try' runs normally. If any line throws an error,
  // execution jumps to 'catch' — the server won't crash silently.
  try {
    /*
     * mongoose.connect() dials out to MongoDB.
     * process.env.MONGO_URI reads the connection string from the
     * .env file. That string looks like:
     *   mongodb+srv://username:password@cluster.mongodb.net/ats_db
     * We store it in .env (not hard-coded) so secrets never end
     * up in source code or version control (git).
     *
     * We use 'await' here because connecting is async — we need
     * to wait for the handshake before we can use the connection.
     * 'conn' holds the result object returned by mongoose.connect().
     */
    const conn = await mongoose.connect(process.env.MONGO_URI);

    /*
     * If we reach this line, the connection succeeded.
     * conn.connection.host is the hostname of the MongoDB server
     * (e.g., "cluster0.abc123.mongodb.net"). Logging it confirms
     * which database cluster we actually connected to — handy for
     * debugging environment mix-ups (dev vs. prod).
     */
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    /*
     * If mongoose.connect() fails (wrong password, network issue,
     * bad URI, etc.), it throws an error that lands here.
     * error.message contains a human-readable description of what
     * went wrong, which we log so we can debug it.
     */
    console.error(`❌ MongoDB Connection Error: ${error.message}`);

    /*
     * process.exit(1) forcefully stops the Node.js process.
     * The argument '1' signals a failure exit code to the OS
     * (0 means success, anything else means failure).
     *
     * WHY EXIT? If we have no database, the server is useless —
     * every route would crash anyway. Better to fail loudly at
     * startup so we notice and fix it immediately.
     */
    process.exit(1);
  }
};

// ── Export ───────────────────────────────────────────────────
// module.exports makes this function available to other files.
// In server.js you'll see: const connectDB = require('./config/db')
// That import gives server.js a reference to this function.
module.exports = connectDB;
