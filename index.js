import express, { json } from "express";
import cors from "cors";
import db from "./db.js"; // Primary MySQL pool
import fallbackDb from "./fallbackDb.js"; // Fallback MySQL pool
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(json());

// Serve static files from "public"
app.use(express.static(path.join(__dirname, "public")));

async function fetchVehicles(pool, caseId) {
  const [rows] = await pool.execute(
    `SELECT 
    cvs.callid,
    cvs.call_time,
    cvs.vehicle_no,
    cvs.distance,
    IF(cvs.vehicle_call_id = 0, 'Available', 'Busy') AS StatusVehicle,
    cvs.vehicle_call_id,
    cvs.assigned_time,
    cvs.incident_latitude,
    cvs.incident_longitude,
    cvs.vehicle_latitude,
    cvs.vehicle_longitude,
    cvs.reach_time,
    mv.location_name AS base_location,
    mt.vehicle_type_id AS vehicle_type,
    va.vehicle_id AS assigned_vehicle_id
FROM cluster_vehicle_status AS cvs
LEFT JOIN m_vehicle AS mv 
    ON cvs.vehicle_no = mv.vehicle_no
LEFT JOIN m_vehicle_type AS mt 
    ON mv.vehicle_type_id = mt.vehicle_type_id
LEFT JOIN vehicle_assignment AS va 
    ON va.callid = cvs.callid AND va.vehicle_no = cvs.vehicle_no
WHERE 
    cvs.callid = ?
   
ORDER BY cvs.distance ASC;
`,[caseId]
  );
  return rows;
}
// AND (mv.location_name NOT LIKE '%NHAI%' OR mv.location_name IS NULL)
// API: Get vehicle list by Case ID with assignment highlight and fallback
app.get("/api/vehicles/:caseId", async (req, res) => {
  const { caseId } = req.params;

  try {
    let vehicles = await fetchVehicles(db, caseId);

    // If primary DB returns no data, fallback to second DB
    if (!vehicles.length) {
      console.log(`⚠️ No data in primary DB for Case ID ${caseId}, using fallback DB`);
      vehicles = await fetchVehicles(fallbackDb, caseId);
    }

    res.json({ caseId, vehicles });
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ error: "Database query failed" });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
