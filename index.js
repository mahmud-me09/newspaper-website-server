const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
	res.send("Hello World.");
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
		// await client.connect();

		// await client.db("admin").command({ ping: 1 });

		// console.log(
		// 	"Pinged your deployment. You successfully connected to MongoDB!"
		// );

		// users section update

		app.get("/users", async (req, res) => {
			let query = {};
			if (req.query.email) {
				query = { email: req.query.email };
				const user = await usersCollection.findOne(query);
				res.send(user);
			} else {
				const users = await usersCollection.find(query).toArray();
				res.send(users);
			}
		});

		app.patch("/users/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const updatedUserData = { $set: req.body };
			const result = await usersCollection.updateOne(
				query,
				updatedUserData
			);
			res.send(result);
		});
		app.patch("/userpublication/:email",async(req,res)=>{
			const email = req.params.email
			const query = {email}
			const updatedUserData = req.body;

			const result = await usersCollection.updateOne(
				query,
				updatedUserData
			);

			res.send(result);
		})

		app.post("/users", async (req, res) => {
			const user = req.body;
			const query = { email: user.email };
			const existingUser = await usersCollection.findOne(query);
			if (existingUser) {
				return res.send({
					message: "User Already Exists",
					insertedId: null,
				});
			} else {
				const result = await usersCollection.insertOne(user);
				res.send(result);
			}
		});

		// Publisher Section
		app.get("/publisher", async (req, res) => {
			const publisher = await publisherCollection
				.find({})
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
			let query = {};
			const { sortBy, limit } = req.query;

			if (req.query.email) {
				query["author.email"] = req.query.email;
			}
			if (req.query.isApproved) {
				query.isApproved = req.query.isApproved === "true";
			}
			if (req.query.isPremium) {
				query.isPremium = req.query.isPremium === "true";
			}
			if (req.query.title) {
				query.name = { $regex: req.query.title, $options: "i" }; // Case insensitive search
			}
			if (req.query.publisher) {
				query.publisher = {
					$regex: req.query.publisher,
					$options: "i",
				}; // Case insensitive search
			}
			if (req.query.tags) {
				query.tags = { $in: req.query.tags.split(",") };
			}


			const options = {};

			if (sortBy) {
				options.sort = { viewCount: -1 };
			}
			if (limit) {
				options.limit = parseInt(limit);
			}
			try {
				const articles = await articlesCollection
					.find(query, options)
					.toArray();
				res.send(articles);
			} catch (error) {
				console.error("Error fetching articles:", error);
				res.status(500).send("Error fetching articles");
			}
		});

		app.get("/articledetail/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			try {
				const article = await articlesCollection.findOne(query);
				if (!article) {
					return res.status(404).send("Article not found");
				}
				res.send(article);
			} catch (err) {
				console.error("Error fetching article:", err);
				res.status(500).send("Error fetching article");
			}
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
			const option = { upsert: true };
			const result = await articlesCollection.updateOne(
				query,
				updatedArticleData,
				option
			);

			res.send(result);
		});
		app.patch("/articledetail/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const updatedArticleData = req.body;

			const result = await articlesCollection.updateOne(
				query,
				updatedArticleData
			);

			res.send(result);
		});

		app.delete("/articles/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };

			const result = await articlesCollection.deleteOne(query);
			res.send(result);
		});

		// stats

		app.get("/statistics", async (req, res) => {
			try {
				const totalUsers = await usersCollection.countDocuments();
				const premiumUsers = await usersCollection.countDocuments({
					isPremium: true,
				});
				const normalUsers = totalUsers - premiumUsers;

				res.send({ totalUsers, premiumUsers, normalUsers });
			} catch (error) {
				console.error("Error fetching statistics:", error);
				res.status(500).send("Error fetching statistics");
			}
		});

		app.get("/publisher/articles/count", async (req, res) => {
			try {
				const pipeline = [
					{
						$group: {
							_id: "$publisher",
							count: { $sum: 1 },
						},
					},
				];

				const results = await articlesCollection
					.aggregate(pipeline)
					.toArray();
				res.send(results);
			} catch (error) {
				console.error(
					"Error aggregating article counts by publisher:",
					error
				);
				res.status(500).send("Error aggregating article counts");
			}
		});

		app.get("/publisher/viewcount", async (req, res) => {
			try {
				const pipeline = [
					{
						$group: {
							_id: "$publisher",
							totalViewCount: { $sum: "$viewCount" },
						},
					},
					{
						$sort: { totalViewCount: -1 },
					},
				];

				const results = await articlesCollection
					.aggregate(pipeline)
					.toArray();
				res.send(results);
			} catch (error) {
				console.error(
					"Error aggregating view counts by publisher:",
					error
				);
				res.status(500).send("Error aggregating view counts");
			}
		});

		// Payment Section

		app.post("/create-payment-intent", async (req, res) => {
			try{
				const { price } = req.body;
			const amount = parseInt(price * 100);
			console.log(amount, "amount inside the intent");

			const paymentIntent = await stripe.paymentIntents.create({
				amount: amount,
				currency: "usd",
				payment_method_types: ["card"],
			});

			res.send({
				clientSecret: paymentIntent.client_secret,
			});
			}catch(error){
				res.send(error.message)
			}
		});
		app.put("/payment", async(req,res)=>{
			const subscriptionHistory = req.body;
			const query = {email:req.query.email}
			
			const updatedUserData = { $set: subscriptionHistory };
			const result = await usersCollection.updateOne(
				query,
				updatedUserData
			);
			res.send(result);
		})

	} finally {
	}
}
run().catch(console.dir);

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});