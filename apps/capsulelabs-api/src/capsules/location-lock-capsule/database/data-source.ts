import { DataSource } from "typeorm"
import { LocationLockCapsule } from "../entities/location-lock-capsule.entity"

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number.parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "locationlock_db",
  entities: [LocationLockCapsule],
  migrations: ["dist/database/migrations/*.js"],
  synchronize: false, // Always false in production
  logging: process.env.NODE_ENV === "development",
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
})
