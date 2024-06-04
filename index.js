const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
	res.send("Hello World!");
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.USER_ID}:${process.env.PASSWORD}@cluster0.xzza9m5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

const publisherCollection = client.db("newspaperDB").collection("publisher");
const articlesCollection = client.db("newspaperDB").collection("articles");
const usersCollection = client.db("newspaperDB").collection("users");

async function run() {
	try {
		await client.connect();

		await client.db("admin").command({ ping: 1 });

		console.log(
			"Pinged your deployment. You successfully connected to MongoDB!"
		);

		// users section

		app.get('/users', async(req,res)=>{
			const users = await usersCollection
				.find({})
				.toArray();
			res.send(users);
		})

		app.patch("/users/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const updatedUserData = { $set: req.body };
			const result = await usersCollection.updateOne(
				query,
				updatedUserData,
			);
			res.send(result);
		});

		app.post("/users", async (req, res) => {
			const user = req.body;
			const query = { email: user.email };
			const existingUser = usersCollection.findOne(query);
			if (existingUser) {
				return res.send({message: "User Already Exists", insertedId:null});
			} else {
				const result = await usersCollection.insertOne(user);
				res.send(result);
			}
		});

		// Publisher Section
		app.get("/publisher", async (req, res) => {
			const publisher = await publisherCollection
				.find({}, { projection: { _id: 0, publisherLogo: 0 } })
				.toArray();
			res.send(publisher);
		});

		app.post("/publisher", async (req, res) => {
			const publisher = req.body;
			const result = await publisherCollection.insertOne(publisher);
			res.send(result);
		});

		// Articles section
		app.get("/articles", async (req, res) => {
			const query = {};
			const projection = {};
			const articles = await articlesCollection
				.find(query, projection)
				.toArray();
			res.send(articles);
		});

		app.post("/articles", async (req, res) => {
			const formData = req.body;
			const result = await articlesCollection.insertOne(formData);
			res.send(result);
		});
		app.put("/articles/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const updatedArticleData = { $set: req.body };
			const option = {upsert:true}
			const result = await articlesCollection.updateOne(
				query,
				updatedArticleData,
				option
			);
			
			res.send(result);
		});

		app.delete("/articles/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			
			const result = await articlesCollection.deleteOne(
				query,
			);
			res.send(result);
		});
	} finally {
	}
}
run().catch(console.dir);

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
