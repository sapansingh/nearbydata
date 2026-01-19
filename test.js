const express = require("express");
const AriClient = require("ari-client");

const app = express();
app.use(express.json());

// Store active channels
let ari = null;
let activeCalls = {};   // { channelId: channelObject }

// -------------------
// 1) Initialize ARI
// -------------------
async function initARI() {
  try {
    ari = await AriClient.connect(
      "http://localhost:8088", // ARI URL
      "ariUser",               // ARI username
      "ariPass"                // ARI password
    );

    console.log("✅ Connected to Asterisk ARI");

    ari.on("StasisStart", (event, channel) => {
      console.log("📞 Incoming call:", channel.id);
      activeCalls[channel.id] = channel;

      // Optional: Auto-answer
      channel.answer().catch(console.error);
    });

    ari.on("StasisEnd", (event, channel) => {
      console.log("❌ Call ended:", channel.id);
      delete activeCalls[channel.id];
    });

    // Start ARI app
    ari.start("myApp");

  } catch (err) {
    console.error("❌ ARI Connection Error:", err);
  }
}

initARI(); // start ARI when server starts

// -------------------
// 2) Express APIs
// -------------------

// GET all active calls
app.get("/api/calls", (req, res) => {
  const list = Object.keys(activeCalls);
  res.json({ activeCalls: list });
});

// Transfer call to another agent
app.post("/api/transfer", async (req, res) => {
  const { channelId, target } = req.body;

  const channel = activeCalls[channelId];
  if (!channel) return res.status(404).send("Channel not found");

  try {
    console.log(`➡️  Transferring ${channelId} → ${target}`);
    await channel.redirect(`PJSIP/${target}`);

    res.send("Call transferred successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Transfer failed");
  }
});

// Hangup a call
app.post("/api/hangup", async (req, res) => {
  const { channelId } = req.body;
  const channel = activeCalls[channelId];

  if (!channel) return res.status(404).send("Channel not found");

  try {
    await channel.hangup();
    res.send("Call hung up");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error hanging up");
  }
});

// Originate outbound call
app.post("/api/originate", async (req, res) => {
  const { endpoint, callerId } = req.body;

  try {
    const call = await ari.channels.originate({
      endpoint: `PJSIP/${endpoint}`,
      app: "myApp",
      callerId: callerId || "1000"
    });

    res.send("Outbound call initiated");
  } catch (err) {
    console.error(err);
    res.status(500).send("Originate failed");
  }
});

// -------------------
// 3) Run Express Server
// -------------------
app.listen(3000, () => {
  console.log("🚀 Express API running on port 3000");
});
