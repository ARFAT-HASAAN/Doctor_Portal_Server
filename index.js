const express = require("express");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const admin = require("firebase-admin");
const { json } = require("express");
const app = express();
require("dotenv").config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 4000;


//  FIREBASE ADMIN INTITIALIZE
admin.initializeApp({
  credential: admin.credential.cert({
 type  : process.env.FIREBASE_TYPE,
 project_id : process.env.FIREBASE_PROJECT_ID,
 private_key_id : process.env.FIREBASE_PRIVATE_KEY_ID,
 private_key : process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
 client_email : process.env.FIREBASE_CLIENT_EMAIL,
 client_id : process.env.FIREBASE_CLIENT_ID,
 auth_uri : process.env.FIREBASE_AUTH_URI,
 token_uri : process.env.FIREBASE_TOKEN_URI,
 auth_provider_x509_cert_url : process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
 client_x509_cert_url  : process.env.FIREBASE_CLIENT_X509_CERT_URL,
  }),
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


// stripe secrter 


async function run() {
  try {
    await client.connect();

    const database = client.db("medicalData");
    const AppoinmentCollection = database.collection("appoinmentCollection");
    const UserCollection = database.collection("UserCollection");
    const FeedBackCollection = database.collection("FeedbackCollection");

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

    app.get("/appoientment/:id", async (req, res) => {
      const id = req?.params?.id
      const query = { _id: ObjectId(id) }
      const result = await AppoinmentCollection.findOne(query)
      // console.log(result)
      res.send(result)
      // console.log(req.params.id)
      // console.log("hi")
    })
    app.get("/appoientment", async (req, res) => {
      const date = new Date(req.query.date).toLocaleDateString();
      const email = req.query.email;
      const query = { email: email, date: date };
      const result = await AppoinmentCollection.find(query).toArray();
      res.send(result);
    });
 
    // appoinment update after payment
    app.put("/appoinment/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const query = { _id:ObjectId(id)}
      const payment = req.body;
      console.log(payment)
            const doc = {
        $set: {
          payment: payment
        }

      }
      const result = await AppoinmentCollection.updateOne(query, doc);
     res.send(result)

    })

    app.post("/feedback", async (req, res) => {
      const feedback = req.body;
      const result = await FeedBackCollection.insertOne(feedback);
      res.send(result)
    })


    // create payment intent 
    app.post("/create-payment-intent", async (req, res) => {
    const paymentInfo = req?.body
    const ammount = (paymentInfo?.price * 100)
    console.log(ammount, typeof(ammount))
    
    //  Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
    amount: ammount,
    currency: "usd",
    payment_method_types: ['card'],
    
  })
     console.log(paymentIntent.client_secret)
       //send client secret
   res.send({ clientSecret: paymentIntent.client_secret,})
       
    })

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
