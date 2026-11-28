import { eq } from "drizzle-orm";
import { db, raw } from "./db";
import { id } from "./ids";
import { KOROLEV_SKU } from "./korolev-sku";
import { brands, flavors, stock, venues } from "./schema";

const fold = (value: string) => value.toLowerCase().replaceAll("ё", "е").replace(/\s+/g, " ").trim();

/**
 * The Королёв list belongs on Стрекалова. There is no third point.
 * Pack size and price stay empty. Nothing is copied onto Широкая.
 */
export async function seedKorolevShelf() {
  const database = db();
  const now = new Date();
  const venue = await database.query.venues.findFirst({ where: eq(venues.slug, "strekalova") });
  if (!venue) return;

  let brandRows = await database.query.brands.findMany();
  const brandByName = new Map(brandRows.map((brand) => [fold(brand.name), brand]));
  let sortOrder = brandRows.reduce((max, brand) => Math.max(max, brand.sortOrder), 0);
  const missingBrands = [];
  for (const name of new Set(KOROLEV_SKU.map((row) => row.brand))) {
    if (brandByName.has(fold(name))) continue;
    sortOrder += 1;
    const brand = { id: id("br"), name, sortOrder };
    missingBrands.push(brand);
    brandByName.set(fold(name), { ...brand, name });
  }
  if (missingBrands.length > 0) {
    await database.insert(brands).values(missingBrands);
    brandRows = await database.query.brands.findMany();
  }
  const brandId = new Map(brandRows.map((brand) => [fold(brand.name), brand.id]));
  for (const brand of missingBrands) brandId.set(fold(brand.name), brand.id);

  const currentFlavors = await database.query.flavors.findMany();
  const flavorByName = new Map<string, string>();
  for (const flavor of currentFlavors) {
    const key = `${flavor.brandId}\0${fold(flavor.name)}`;
    if (!flavorByName.has(key)) flavorByName.set(key, flavor.id);
  }

  const fresh: { id: string; brandId: string; lineId: string; name: string; packGrams: number }[] = [];
  const shelfIds: string[] = [];
  for (const row of KOROLEV_SKU) {
    const owner = brandId.get(fold(row.brand));
    if (!owner) continue;
    const key = `${owner}\0${fold(row.name)}`;
    const existing = flavorByName.get(key);
    if (existing) {
      shelfIds.push(existing);
      continue;
    }
    const flavorId = id("fl");
    fresh.push({ id: flavorId, brandId: owner, lineId: "", name: row.name, packGrams: 0 });
    flavorByName.set(key, flavorId);
    shelfIds.push(flavorId);
  }
  for (let index = 0; index < fresh.length; index += 60) {
    await database.insert(flavors).values(fresh.slice(index, index + 60));
  }

  const shelfStock = shelfIds.map((flavorId) => ({
    id: id("st"),
    venueId: venue.id,
    flavorId,
    grams: 0,
    updatedAt: now,
  }));
  for (let index = 0; index < shelfStock.length; index += 60) {
    await database.insert(stock).values(shelfStock.slice(index, index + 60)).onConflictDoNothing();
  }
}

/** Королёв is Стрекалова, not a separate card. Move anything parked there, then drop the extra point. */
export async function removeExtraKorolevVenue() {
  const database = db();
  const extra = await database.query.venues.findFirst({ where: eq(venues.slug, "korolev") });
  if (!extra) return;
  const home = await database.query.venues.findFirst({ where: eq(venues.slug, "strekalova") });
  if (!home) return;

  await raw().batch([
    {
      sql: `UPDATE stock SET venue_id = ? WHERE venue_id = ? AND flavor_id NOT IN (SELECT flavor_id FROM stock WHERE venue_id = ?)`,
      args: [home.id, extra.id, home.id],
    },
    { sql: `DELETE FROM stock WHERE venue_id = ?`, args: [extra.id] },
    { sql: `DELETE FROM memberships WHERE venue_id = ?`, args: [extra.id] },
    { sql: `UPDATE movements SET venue_id = ? WHERE venue_id = ?`, args: [home.id, extra.id] },
    { sql: `UPDATE supplies SET venue_id = ? WHERE venue_id = ?`, args: [home.id, extra.id] },
    { sql: `UPDATE mixes SET venue_id = ? WHERE venue_id = ?`, args: [home.id, extra.id] },
    { sql: `DELETE FROM venues WHERE id = ?`, args: [extra.id] },
  ]);
}
