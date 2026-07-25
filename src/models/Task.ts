import mongoose, { Document, Model, Schema, Types } from "mongoose"

export type Priority   = "high" | "medium" | "low"
export type Status     = "backlog" | "todo" | "inprogress" | "review" | "done"
export type Department = "marketing" | "design"

export interface ITask extends Document {
  title:       string
  description: string
  priority:    Priority
  status:      Status
  assignee:    string
  assignedBy:  string                 // name of whoever created/assigned this task
  talentId:    Types.ObjectId | null  // links task to a talent User
  department:  Department | null      // scopes task to marketing/design manager boards
  tags:        string[]
  due:         string                 // ISO date string e.g. "2026-07-31"
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
    assignedBy: {
      type:    String,
      trim:    true,
      default: "",
    },
    talentId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "User",   // references the User model
      default: null,
    },
    department: {
      type:    String,
      enum:    {
        values:  ["marketing", "design"],
        message: "{VALUE} is not a valid department",
      },
      default: null,
    },
    tags: {
      type:    [String],
      default: [],
    },
    due: {
      type:    String,   // store as ISO string — "2026-07-31"
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
// Index so marketing/design manager board queries are fast
TaskSchema.index({ department: 1, status: 1 })

export const Task: Model<ITask> =
  mongoose.models.Task ?? mongoose.model<ITask>("Task", TaskSchema)