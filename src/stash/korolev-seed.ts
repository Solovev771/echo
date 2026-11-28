import { eq } from "drizzle-orm";
import { db } from "./db";
import { id } from "./ids";
import { KOROLEV_SKU } from "./korolev-sku";
import { brands, flavors, memberships, stock, venues } from "./schema";

const fold = (value: string) => value.toLowerCase().replaceAll("ё", "е").replace(/\s+/g, " ").trim();

/**
 * Puts the Королёв SKU list on that shelf only.
 * Pack size and price stay empty. A flavor is not copied onto the other points.
 */
export async function seedKorolevShelf() {
  const database = db();
  const now = new Date();

  const [venueRows, userRows] = await Promise.all([
    database.query.venues.findMany(),
    database.query.users.findMany(),
  ]);

  let venue = venueRows.find((row) => row.slug === "korolev");
  if (!venue) {
    const created = {
      id: id("ven"),
      slug: "korolev",
      name: "Аура · Королёв",
      address: "Королёв",
    };
    await database.insert(venues).values(created).onConflictDoNothing();
    venue = await database.query.venues.findFirst({ where: eq(venues.slug, "korolev") });
  }
  if (!venue) return;

  if (userRows.length > 0) {
    await database
      .insert(memberships)
      .values(userRows.map((user) => ({ id: id("mem"), userId: user.id, venueId: venue.id })))
      .onConflictDoNothing();
  }

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
