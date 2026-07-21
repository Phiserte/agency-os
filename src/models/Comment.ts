import mongoose, { Document, Model, Schema, Types } from "mongoose"
import { ROLES, type UserRole } from "@/lib/roles"

export interface IComment extends Document {
  taskId:     Types.ObjectId
  authorId:   Types.ObjectId
  authorName: string
  authorRole: UserRole
  message:    string
  createdAt:  Date
  updatedAt:  Date
}

const CommentSchema = new Schema<IComment>(
  {
    taskId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Task",
      required: true,
      index:    true,
    },
    authorId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    authorName: {
      type:     String,
      required: true,
      trim:     true,
    },
    authorRole: {
      type:     String,
      enum:     [...ROLES],
      required: true,
    },
    message: {
      type:      String,
      required:  [true, "Comment cannot be empty"],
      trim:      true,
      maxlength: [2000, "Comment cannot exceed 2000 characters"],
    },
  },
  { timestamps: true }
)

export const Comment: Model<IComment> =
  mongoose.models.Comment ?? mongoose.model<IComment>("Comment", CommentSchema)