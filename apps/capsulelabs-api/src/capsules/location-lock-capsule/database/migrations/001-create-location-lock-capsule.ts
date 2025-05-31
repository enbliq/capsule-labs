import { type MigrationInterface, type QueryRunner, Table } from "typeorm"

export class CreateLocationLockCapsule1703123456789 implements MigrationInterface {
  name = "CreateLocationLockCapsule1703123456789"

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "location_lock_capsules",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "title",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "content",
            type: "text",
            isNullable: false,
          },
          {
            name: "userId",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "lockLatitude",
            type: "decimal",
            precision: 10,
            scale: 8,
            isNullable: false,
          },
          {
            name: "lockLongitude",
            type: "decimal",
            precision: 11,
            scale: 8,
            isNullable: false,
          },
          {
            name: "allowedRadiusMeters",
            type: "int",
            default: 20,
            isNullable: false,
          },
          {
            name: "createdAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
          {
            name: "updatedAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
        indices: [
          {
            name: "IDX_LOCATION_LOCK_USER_ID",
            columnNames: ["userId"],
          },
          {
            name: "IDX_LOCATION_LOCK_COORDINATES",
            columnNames: ["lockLatitude", "lockLongitude"],
          },
        ],
      }),
      true,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("location_lock_capsules")
  }
}
