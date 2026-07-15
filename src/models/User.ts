import mongoose, { Document, Model, Schema } from "mongoose"
import bcrypt from "bcryptjs"

export type UserRole = "admin" | "talent"

export interface IUser extends Document {
  name:      string
  email:     string
  password:  string
  role:      UserRole
  company:   string
  createdAt: Date
  updatedAt: Date
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
      select:    false, // stripped from all queries by default
    },
    role: {
      type:    String,
      enum:    { values: ["admin", "talent"], message: "{VALUE} is not a valid role" },
      default: "talent",
    },
    company: {
      type:    String,
      trim:    true,
      default: "",
    },
  },
  { timestamps: true }
)

// Hash password before save
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return
  this.password = await bcrypt.hash(this.password, 12)
})

// Compare plain password against hash
UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password)
}

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema)