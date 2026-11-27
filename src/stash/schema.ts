import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "staff"] }).notNull().default("staff"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const venues = sqliteTable("venues", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  /** Positive stock below this many grams counts as "running low" at this venue. */
  lowGrams: integer("low_grams").notNull().default(50),
});

export const memberships = sqliteTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id),
  },
  (t) => [uniqueIndex("membership_user_venue").on(t.userId, t.venueId)],
);

export const brands = sqliteTable("brands", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** A line inside a brand, e.g. Darkside Core. Empty string is not stored here. */
export const lines = sqliteTable(
  "lines",
  {
    id: text("id").primaryKey(),
    brandId: text("brand_id")
      .notNull()
      .references(() => brands.id),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("line_brand_name").on(t.brandId, t.name)],
);

/**
 * One sellable position: brand + line + aroma + pack size.
 * lineId "" and packGrams 0 mean an older row that has not been filled in yet.
 * priceKopecks is the price of a single pack of that size.
 */
export const flavors = sqliteTable(
  "flavors",
  {
    id: text("id").primaryKey(),
    brandId: text("brand_id")
      .notNull()
      .references(() => brands.id),
    lineId: text("line_id").notNull().default(""),
    name: text("name").notNull(),
    packGrams: integer("pack_grams").notNull().default(0),
    priceKopecks: integer("price_kopecks"),
  },
  (t) => [uniqueIndex("flavor_position").on(t.brandId, t.lineId, t.name, t.packGrams)],
);

export const stock = sqliteTable(
  "stock",
  {
    id: text("id").primaryKey(),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id),
    flavorId: text("flavor_id")
      .notNull()
      .references(() => flavors.id),
    grams: integer("grams").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [uniqueIndex("stock_venue_flavor").on(t.venueId, t.flavorId)],
);

export const MOVEMENT_KINDS = ["in", "out", "set", "create", "rename", "delete"] as const;
export type MovementKind = (typeof MOVEMENT_KINDS)[number];

/** Journal rows keep name snapshots and no foreign keys so history survives deletions. */
export const movements = sqliteTable("movements", {
  id: text("id").primaryKey(),
  venueId: text("venue_id").notNull(),
  flavorId: text("flavor_id").notNull(),
  flavorName: text("flavor_name").notNull(),
  brandId: text("brand_id").notNull(),
  brandName: text("brand_name").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  kind: text("kind", { enum: MOVEMENT_KINDS }).notNull(),
  delta: integer("delta").notNull().default(0),
  gramsAfter: integer("grams_after").notNull().default(0),
  note: text("note"),
  supplyId: text("supply_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const supplies = sqliteTable("supplies", {
  id: text("id").primaryKey(),
  venueId: text("venue_id").notNull(),
  supplier: text("supplier"),
  note: text("note"),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  totalGrams: integer("total_grams").notNull(),
  lineCount: integer("line_count").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** Name snapshots, no foreign keys: a supply stays readable after flavors are renamed or deleted. */
export const supplyLines = sqliteTable("supply_lines", {
  id: text("id").primaryKey(),
  supplyId: text("supply_id").notNull(),
  flavorId: text("flavor_id").notNull(),
  flavorName: text("flavor_name").notNull(),
  brandId: text("brand_id").notNull(),
  brandName: text("brand_name").notNull(),
  lineName: text("line_name").notNull().default(""),
  packGrams: integer("pack_grams").notNull().default(0),
  priceKopecks: integer("price_kopecks"),
  packs: integer("packs").notNull().default(0),
  grams: integer("grams").notNull(),
});
