const express = require("express");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const admin = require("firebase-admin");
const { json } = require("express");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
// firebase admin  sdk

// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
// const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
const serviceAccount = require("./doctorPortal_Firebase_Sdk.json");

// firebase admin intitialize
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());

// mongodb uri
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.oq9xl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

// mongodob connection
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// verifyToken
async function Verifitoken(req, res, next) {
  if (req.body.authorization.startsWith("Bearer ")) {
    // console.log(req.body.authorization.startsWith("Bearer "));

    const token = req.body.authorization.split(" ")[1];
    // console.log(token);

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }

  next();
}

async function run() {
  try {
    await client.connect();

    const database = client.db("medicalData");
    const AppoinmentCollection = database.collection("appoinmentCollection");
    const UserCollection = database.collection("UserCollection");

    app.post("/users", async (req, res) => {
      const user = req.body;
      const resutl = await UserCollection.insertOne(user);
      res.send(resutl);
      // console.log(resutl);
    });

    app.put("/users", async (req, res) => {
      const user = req.body;
      const email = req.body.email;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await UserCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      // const email = req.params;
      const email = req.params?.email;
      const query = { email };
      if (!email) {
      } else {
        // console.log(email);
        // console.log(query.email);
        // console.log(query);
        const result = await UserCollection?.findOne(query);
        res.send(result);
      }
    });

    app.put("/users/admin", Verifitoken, async (req, res) => {
      const email = req.body.email;
      // console.log(req.decodedEmail);
      const requester = req.decodedEmail;
      if (requester) {
        const requesterEmail = await UserCollection.findOne({
          email: requester,
        });
        if ((requesterEmail.role = "admin")) {
          const filter = { email: email };
          const updatedoc = { $set: { role: "admin" } };
          const result = await UserCollection.updateOne(filter, updatedoc);
          res.send(result);
        }
      } else {
        res.status(403).json({ message: "you have no access to make admin" });
      }
    });

    app.post("/appoientment", async (req, res) => {
      const appoinment = req.body;
      const result = await AppoinmentCollection.insertOne(appoinment);
      res.send(result);
      // console.log(result);
    });

    app.get("/appoientment", async (req, res) => {
      // console.log(req.query);
      const date = new Date(req.query.date).toLocaleDateString();
      const email = req.query.email;
      const query = { email: email, date: date };
      const result = await AppoinmentCollection.find(query).toArray();
      res.send(result);
    });

    // user insert
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`my port number is  ${port}`);
});
