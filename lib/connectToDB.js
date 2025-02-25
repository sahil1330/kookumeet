import mongoose from "mongoose";

export default async function connectToDB() {
    try {
        if (!mongoose.connection.readyState) {
            await mongoose.connect(process.env.MONGO_URI);
            console.log("Connected to MongoDB");
        }
        console.log("MongoDB already connected");
        return mongoose.connection;
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error;
    }
}

