const express = require('express')
const app = express()
const { ObjectId } = require('mongodb');
const cors = require('cors')

var jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
console.log( process.env.STRIPE_SECRET_KEY )


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
    const tagCollection = client.db('thaughtSpace').collection('tags')
    const announcementCollection = client.db('thaughtSpace').collection('announcements')
    const postCollection = client.db('thaughtSpace').collection('posts')
    const commentCollection = client.db('thaughtSpace').collection('comments')
    const voteCollection = client.db('thaughtSpace').collection('votes');

    // jwt related api
    app.post('/jwt', async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        res.send({ token });
      })
  
      // middlewares 
      const verifyToken = (req, res, next) => {
        console.log('inside verify token', req.headers.authorization);
        if (!req.headers.authorization) {
          return res.status(401).send({ message: 'unauthorized access' });
        }
        const token = req.headers.authorization.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
          if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
          }
          req.decoded = decoded;
          next();
        })
      }
  
      // use verify admin after verifyToken
      const verifyAdmin = async (req, res, next) => {
        const email = req.decoded.email;
        const query = { email: email };
        const user = await userCollection.findOne(query);
        const isAdmin = user?.role === 'admin';
        if (!isAdmin) {
          return res.status(403).send({ message: 'forbidden access' });
        }
        next();
      }

        // users related api
        app.get('/users',  async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
          });

             // tag related api
        app.get('/tags', async (req, res) => {
            const result = await tagCollection.find().toArray();
            res.send(result);
          });
      
             // announcement related api
        app.get('/announcement', async (req, res) => {
            const result = await announcementCollection.find().toArray();
            res.send(result);
          });
      
             // posts related api
        app.get('/posts', async (req, res) => {
            const {category} = req.query
            console.log(category)
            if(category){
                const result = await postCollection.find({category}).toArray();
                return res.send(result);
            }
        
            const result = await postCollection.find().toArray();
            res.send(result);
          });
      


       // comments related api
       app.get('/comments', async (req, res) => {
        const result = await commentCollection.find().toArray();
        res.send(result);
      });
      
       // votes related api
// Get votes for a specific post
       // comments related api
       app.get('/votes', async (req, res) => {
        const result = await voteCollection.find().toArray();
        res.send(result);
      });


    app.get('/users/admin/:email', verifyToken, async (req, res) => {
        const email = req.params.email;
  
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: 'forbidden access' })
        }
  
        const query = { email: email };
        const user = await userCollection.findOne(query);
        let admin = false;
        if (user) {
          admin = user?.role === 'admin';
        }
        res.send({ admin });
      })

         // user collection api
   
    app.post('/users', async (req, res) => {
        const user = req.body;
        const query = { email: user.email }
        const existingUser = await userCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: 'user already exists', insertedId: null })
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
   
    });

    // for posting tags
    app.post('/tags',verifyToken, verifyAdmin, async (req, res) => {
        const tag = req.body;
        const result = await tagCollection.insertOne(tag);
        res.send(result);
      });

    //   for posting announcement
    app.post('/announcement', verifyToken, verifyAdmin, async (req, res) => {
        const announcement = req.body;
        const result = await announcementCollection.insertOne(announcement);
        res.send(result);
      });

    //   for posting posts
    app.post('/posts', verifyToken,  async (req, res) => {
        const post = req.body;
        const result = await postCollection.insertOne( post);
        res.send(result);
      });
    //   for posting comments
    app.post('/comments', verifyToken,  async (req, res) => {
        const comment = req.body;
        const result = await commentCollection.insertOne( comment);
        res.send(result);
      });



      

    // to make  user an admin
    app.patch('/users/admin/:id',verifyToken, verifyAdmin,   async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new  ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: 'admin'
          }
        }
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      })


    //   PAYMENT RELATED
        // payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
           

            console.log(amount, 'amount inside the intent')
      
            const paymentIntent = await stripe.paymentIntents.create({
              amount: amount,
              currency: 'usd',
              payment_method_types: ['card']
            });
      
            res.send({
              clientSecret: paymentIntent.client_secret,
              amount: amount
            })
          });

          // Add a new endpoint to handle updating user status
app.post('/update-user-status', async (req, res) => {
    const { email, amount } = req.body;

    try {
        // Assuming your userCollection is where user details are stored
        const filter = { email: email };
        const updateDoc = {
            $set: {
                status: 'golden' // Change status to 'golden' upon successful payment
            }
        };

        // Update the user's status to 'golden' based on their email
        const result = await userCollection.updateOne(filter, updateDoc);

        // Sending a success response to the client
        res.send({ success: true, updatedUser: result });
    } catch (error) {
        // Sending an error response if something goes wrong
        res.status(500).send({ success: false, error: error.message });
    }
});



// 2nd try

// Increment upVote for a post
app.patch('/posts/upvote/:postId', verifyToken, async (req, res) => {
    const postId = req.params.postId;
    // console.log("line 286", postId);
    

        const result = await postCollection.updateOne(
            { _id: new ObjectId(postId) },
            { $inc: { upVote: 1 } }, 
        );
    //  console.log(result, "line 293")
        
        res.send(result); 
  
});

// Increment downVote for a post
app.patch('/posts/downvote/:postId', verifyToken, async (req, res) => {
    const postId = req.params.postId;
    console.log("down vote", postId);
  
        const result = await postCollection.updateOne(
            { _id: new ObjectId(postId) },
            { $inc: { downVote: 1 } }, 
            { returnOriginal: false } 
        );

      
           console.log(result, "line 293")
        res.send(result); 
  
});





  

// for getting single post
app.get('/posts/:id',  async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await postCollection.findOne(query);
    res.send(result);
  })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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