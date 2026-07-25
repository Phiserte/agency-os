// src/app/api/worksheet/export/route.ts
// Generates a fresh .xlsx worksheet for the logged-in user, built on
// demand from WorksheetEntry records — nothing is stored as a file,
// the DB is the only source of truth.
//
// Currently talent-only. Kept at a general path (not /talent/) so this
// can be extended to marketing_manager / design_manager later — e.g.
// by accepting an optional ?talentId= for admins/managers to pull a
// specific person's worksheet — without having to duplicate the route.

import { NextResponse } from "next/server"
import ExcelJS, { type Row } from "exceljs"
import { cookies } from "next/headers"
import { connectDB } from "@/lib/db/mongoose"
import { verifyToken } from "@/lib/jwt"
import { WorksheetEntry } from "@/models/WorksheetEntry"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Talent-only for now — extend this check when manager support is
    // added (e.g. allow "marketing_manager" / "design_manager" too).
    if (user.role !== "talent") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const entries = await WorksheetEntry.find({ talentId: user.id })
      .sort({ completedAt: -1 })
      .lean()

    const workbook = new ExcelJS.Workbook()
    workbook.creator = "Sahynex Core"
    workbook.created = new Date()

    const sheet = workbook.addWorksheet("Worksheet")

    sheet.columns = [
      { header: "Task",           key: "task",        width: 40 },
      { header: "Department",     key: "department",  width: 16 },
      { header: "Priority",       key: "priority",     width: 12 },
      { header: "Assigned By",    key: "assignedBy",   width: 22 },
      { header: "Completed Date", key: "completedAt",  width: 20 },
    ]

    // Bold header row
    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEEEDFE" },
    }

    for (const e of entries) {
      sheet.addRow({
        task:        e.taskTitle,
        department:  e.department ? e.department.charAt(0).toUpperCase() + e.department.slice(1) : "—",
        priority:    e.priority ? e.priority.charAt(0).toUpperCase() + e.priority.slice(1) : "—",
        assignedBy:  e.assignedBy || "—",
        completedAt: e.completedAt
          ? new Date(e.completedAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
          : "—",
      })
    }

    // Freeze header row, add borders to all data cells
    sheet.views = [{ state: "frozen", ySplit: 1 }]
    sheet.eachRow((row:Row) => {
      row.eachCell(cell => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        }
      })
    })

    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="worksheet-${user.name.replace(/\s+/g, "-").toLowerCase()}.xlsx"`,
      },
    })
  } catch (error) {
    console.error("[GET /api/worksheet/export]", error)
    return NextResponse.json(
      { error: "Failed to generate worksheet. Please try again." },
      { status: 500 }
    )
  }
}