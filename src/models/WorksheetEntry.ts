import mongoose, { Document, Model, Schema, Types } from "mongoose"

export interface IWorksheetEntry extends Document {
  taskId:      Types.ObjectId
  talentId:    Types.ObjectId
  taskTitle:   string
  department:  string | null
  priority:    string
  assignedBy:  string          // name of the admin/manager who assigned the task
  completedAt: Date
  createdAt:   Date
  updatedAt:   Date
}

const WorksheetEntrySchema = new Schema<IWorksheetEntry>(
  {
    taskId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Task",
      required: true,
      index:    true,
    },
    talentId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    taskTitle: {
      type:     String,
      required: true,
      trim:     true,
    },
    department: {
      type:    String,
      default: null,
    },
    priority: {
      type:    String,
      default: "medium",
    },
    assignedBy: {
      type:    String,
      trim:    true,
      default: "",
    },
    completedAt: {
      type:     Date,
      required: true,
      default:  () => new Date(),
    },
  },
  { timestamps: true }
)

// Fast lookup of a talent's worksheet, newest completions first
WorksheetEntrySchema.index({ talentId: 1, completedAt: -1 })

export const WorksheetEntry: Model<IWorksheetEntry> =
  mongoose.models.WorksheetEntry ?? mongoose.model<IWorksheetEntry>("WorksheetEntry", WorksheetEntrySchema)