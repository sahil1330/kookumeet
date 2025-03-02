import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
    },
    users: {
        type: [String],
        required: true,
    },
    status: {
        type: String,
        enum: ["active", "inactive", "full"],
        default: "active",
    },
}, { timestamps: true });

const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);

export default Room;


