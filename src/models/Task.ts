import mongoose, { Document, Model, Schema, Types } from "mongoose"

export type Priority = "high" | "medium" | "low"
export type Status   = "backlog" | "todo" | "inprogress" | "review" | "done"

export interface ITask extends Document {
  title:       string
  description: string
  priority:    Priority
  status:      Status
  assignee:    string
  talentId:    Types.ObjectId | null  // links task to a talent User
  tags:        string[]
  due:         string                 // ISO date string e.g. "2025-06-10"
  progress:    number
  createdAt:   Date
  updatedAt:   Date
}

const TaskSchema = new Schema<ITask>(
  {
    title: {
      type:      String,
      required:  [true, "Title is required"],
      trim:      true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type:    String,
      trim:    true,
      default: "",
    },
    priority: {
      type:    String,
      enum:    {
        values:  ["high", "medium", "low"],
        message: "{VALUE} is not a valid priority",
      },
      default: "medium",
    },
    status: {
      type:    String,
      enum:    {
        values:  ["backlog", "todo", "inprogress", "review", "done"],
        message: "{VALUE} is not a valid status",
      },
      default: "backlog",
    },
    assignee: {
      type:    String,
      trim:    true,
      default: "",
    },
    talentId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "User",   // references the User model
      default: null,
    },
    tags: {
      type:    [String],
      default: [],
    },
    due: {
      type:    String,   // store as ISO string — "2025-06-10"
      default: "",
    },
    progress: {
      type:    Number,
      min:     [0,   "Progress cannot be less than 0"],
      max:     [100, "Progress cannot exceed 100"],
      default: 0,
    },
  },
  { timestamps: true }
)

// Index so talent dashboard queries are fast
TaskSchema.index({ talentId: 1, status: 1 })
TaskSchema.index({ due: 1, status: 1 })

export const Task: Model<ITask> =
  mongoose.models.Task ?? mongoose.model<ITask>("Task", TaskSchema)