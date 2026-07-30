import mongoose, { Document, Model, Schema } from "mongoose"
import bcrypt from "bcryptjs"
import { ROLES, type UserRole } from "@/lib/roles"

export type Department = "marketing" | "design" | "dev"

export interface IUser extends Document {
  name:       string
  email:      string
  password:   string
  role:       UserRole
  company:    string
  department: Department | null
  createdAt:  Date
  updatedAt:  Date
  comparePassword(candidate: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type:     String,
      required: [true, "Name is required"],
      trim:     true,
    },
    email: {
      type:      String,
      required:  [true, "Email is required"],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },
    password: {
      type:      String,
      required:  [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select:    false,
    },
    role: {
      type:    String,
      enum:    { values: [...ROLES], message: "{VALUE} is not a valid role" },
      default: "talent",
    },
    
    department: {
      type:    String,
      enum:    {
        values:  ["marketing", "design", "dev"],
        message: "{VALUE} is not a valid department",
      },
      default: null,
    },
  },
  { timestamps: true }
)

// Pre-validate hook without callback parameter
UserSchema.pre("validate", function () {
  const doc = this as unknown as IUser
  if (doc.role === "talent" && !doc.department) {
    doc.invalidate("department", "Talents must be assigned a department (marketing, design, or dev).")
  }
})

// Hash password before save
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return
  this.password = await bcrypt.hash(this.password, 12)
})

// Compare plain password against hash
UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password)
}

// Index so "get all talents in my department" queries are fast
UserSchema.index({ role: 1, department: 1 })

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema)