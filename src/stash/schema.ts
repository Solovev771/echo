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

export const flavors = sqliteTable(
  "flavors",
  {
    id: text("id").primaryKey(),
    brandId: text("brand_id")
      .notNull()
      .references(() => brands.id),
    name: text("name").notNull(),
  },
  (t) => [uniqueIndex("flavor_brand_name").on(t.brandId, t.name)],
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
