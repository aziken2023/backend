// This code sets up an Express app, enables CORS, configures JSON parsing, 
// and reads database connection properties from a config file using PropertiesReader.
var express = require("express");
let app = express();
const cors = require("cors");
app.use(cors({
  origin: "(https://backend-1hjb.onrender.com)",
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type"
}));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server is running on port ${PORT}');
});
app.use(express.json());
app.set('json spaces', 3);
const path = require('path');
let PropertiesReader = require("properties-reader");

// This loads properties from the file  
let propertiesPath = path.resolve(__dirname, "./dbconnection.properties");
let properties = PropertiesReader(propertiesPath);

// This Extract values from the properties file
const dbPrefix = properties.get('db.prefix');
const dbHost = properties.get('db.host');
const dbName = properties.get('db.name');
const dbUser = properties.get('db.user');
const dbPassword = properties.get('db.password');
const dbParams = properties.get('db.params');

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// MongoDB connection URL
const uri = `${dbPrefix}${dbUser}:${dbPassword}${dbHost}${dbParams}`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

let db1;//declare variable

async function connectDB() {
  try {
    client.connect();
    console.log('Connected to MongoDB');
    db1 = client.db('Online_Tuition');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}

connectDB(); //call the connectDB function to connect to MongoDB database

//Optional if you want the get the collection name from the Fetch API in test3.html then
app.param('collectionName', async function(req, res, next, collectionName) { 
    req.collection = db1.collection(collectionName);
    /*Check the collection name for debugging if error */
    console.log('Middleware set collection:', req.collection.collectionName);
    next();
});

// Ensure this route is defined after the middleware app.param
// get all data from our collection in Mongodb
app.get('/collections/lesson', async function (req, res, next) {
  try {
      // Fetch all documents from the 'lesson' collection
      const lessons = await db1.collection('lesson').find({}).toArray();
      res.json(lessons); // Send the lessons as JSON response
  } catch (err) {
      console.error('Error fetching lessons:', err);
      res.status(500).json({ error: 'An error occurred while fetching lessons' });
  }
});


// POST for the endpoint to handle the form submission and save order details to MongoDB
app.post('/orders', async function (req, res) {
  try {
    const orderData = req.body; // Get the data sent from the client
    const collection = db1.collection('orders'); // Reference the 'orders' collection

    // Insert the order data into the 'orders' collection
    const result = await collection.insertOne(orderData);
    
    // Send a success response back to the client
    res.status(201).json({ message: 'Order placed successfully', orderId: result.insertedId });
  } catch (err) {
    console.error('Error saving order:', err);
    res.status(500).json({ error: 'An error occurred while saving the order' });
  }
});


app.put('/courses/:courseId', async function(req, res) {
  const { courseId } = req.params; // Get the courseId from the URL parameters
  const { quantity } = req.body; // Get the quantity to subtract (this could be 1 if only 1 item is being purchased)

  try {
    // Find the course by courseId and update the remaining availability
    const course = await db1.collection('lesson').findOne({ _id: new ObjectId(courseId) });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if there's enough availability
    if (course.remaining < quantity) {
      return res.status(400).json({ error: 'Not enough available spots' });
    }

    // Update the course's remaining spots
    const updatedCourse = await db1.collection('lesson').updateOne(
      { _id: new ObjectId(courseId) },
      { $inc: { remaining: -quantity } } // Decrease the remaining by the quantity purchased
    );

    if (updatedCourse.modifiedCount > 0) {
      return res.status(200).json({ message: 'Course availability updated successfully' });
    } else {
      return res.status(500).json({ error: 'Failed to update course availability' });
    }
  } catch (err) {
    console.error('Error updating course availability:', err);
    res.status(500).json({ error: 'An error occurred while updating course availability' });
  }
});


app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: 'An error occurred' });
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
  });