const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config();
const port = process.env.PORT || 5000


// middleware
app.use(cors())
app.use(express.json())
console.log(process.env.DB_USER)


const { MongoClient, ServerApiVersion } = require('mongodb');
// const uri = "mongodb+srv://<username>:<password>@cluster0.cuu4rc1.mongodb.net/?retryWrites=true&w=majority";
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cuu4rc1.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const db = client.db('thaughtSpace');
    const userCollection = client.db('thaughtSpace').collection('users')

    // user collection api
    app.post(('/users',async(req,res) =>{
        const user = req.body;
        const result = await userCollection.insertOne(user);
        res.send(result);
    }))

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req,res) =>{
    res.send('thaughts are generating')
})

app.listen(port, () =>{
    console.log(`thaught space is running on serve ${port}`);
})