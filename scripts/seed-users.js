const mongoose = require("mongoose")
const bcrypt   = require("bcryptjs")
const fs       = require("fs")
const path     = require("path")

// Load .env.local
const envPath = path.join(process.cwd(), ".env.local")
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const [key, ...rest] = trimmed.split("=")
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim()
  }
  console.log("Loaded .env.local")
}

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) { console.error("MONGODB_URI not set"); process.exit(1) }
console.log("Connecting to:", MONGODB_URI)

const UserSchema = new mongoose.Schema(
  { name: String, email: { type: String, unique: true }, password: String, role: String, company: { type: String, default: "" } },
  { timestamps: true }
)
const User = mongoose.models.User ?? mongoose.model("User", UserSchema)

const USERS = [
  { name: "Agency Admin", email: "admin@agency.com",   password: "admin1234",  role: "admin",  company: "Agency OS" },
  { name: "Test Client",  email: "client@example.com", password: "client1234", role: "client", company: "Acme Corp" },
]

async function seed() {
  await mongoose.connect(MONGODB_URI, { dbName: "agency-os" })
  console.log("Connected to DB:", mongoose.connection.name, "\n")
  for (const u of USERS) {
    const exists = await User.findOne({ email: u.email })
    if (exists) { console.log("SKIP  " + u.email + " (already exists)"); continue }
    const hashed = await bcrypt.hash(u.password, 12)
    const created = await User.create({ ...u, password: hashed })
    console.log("OK    " + u.role.padEnd(8) + u.email + "   _id: " + created._id)
  }
  console.log("\n-------------------------------------------")
  console.log("Login at: http://localhost:3000/login")
  console.log("admin@agency.com    / admin1234")
  console.log("client@example.com  / client1234")
  console.log("-------------------------------------------\n")
  await mongoose.disconnect()
  process.exit(0)
}

seed().catch(err => {
  console.error("Seed failed:", err.message)
  process.exit(1)
})
