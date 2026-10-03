// Turns prisma/library/foods.ts into idempotent INSERT statements for a migration.
// Usage: node prisma/library/generate-migration.mjs > prisma/migrations/<n>_food_library/library.sql
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("./foods.ts", import.meta.url), "utf8");
// Evaluate the array literal without a TS toolchain: strip types/exports.
const body = src.slice(src.indexOf("export const LIBRARY"));
const arrayText = body.slice(body.indexOf("["), body.lastIndexOf("];") + 1);
const LIBRARY = Function(`return ${arrayText}`)();

const slug = (s) =>
  "lib_" +
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const n = (v) => (v === null || v === undefined ? "NULL" : String(v));

const seen = new Set();
const lines = [];
for (const [name, category, kcal, protein, carbs, fat, fiber, sodium, servings] of LIBRARY) {
  const id = slug(name);
  if (seen.has(id)) throw new Error(`duplicate id ${id}`);
  seen.add(id);
  const def = servings[0];
  const m = def?.[0].match(/\((\d+(?:\.\d+)?) g\)/);
  const servingSize = 1;
  const servingUnit = def ? def[0].replace(/^1\s+/, "").replace(/\s*\(.*\)$/, "").replace(/^(\d+(?:\/\d+)?|small|medium|large)\s*/, "").trim() || "serving" : "g";
  const grams = def ? def[1] : 100;
  lines.push(
    `INSERT INTO "Food" ("id","userId","name","category","rawOrCooked","caloriesPer100g","proteinPer100g","carbsPer100g","fatPer100g","fiberPer100g","sodiumPer100g","defaultUnit","servingWeightGrams","servingSize","servingUnit","nutritionBasis","source","createdAt","updatedAt")
VALUES (${q(id)}, NULL, ${q(name)}, ${q(category)}, 'unspecified', ${n(kcal)}, ${n(protein)}, ${n(carbs)}, ${n(fat)}, ${n(fiber)}, ${n(sodium)}, 'g', ${n(grams)}, ${servingSize}, ${q(def ? servingUnit : "g")}, 'PER_100G', 'SYSTEM', NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;`
  );
  void m;
  servings.forEach(([label, g], i) => {
    lines.push(
      `INSERT INTO "FoodServing" ("id","foodId","label","grams","isDefault","sortOrder") VALUES (${q(`${id}_s${i}`)}, ${q(id)}, ${q(label)}, ${n(g)}, ${i === 0}, ${i}) ON CONFLICT ("id") DO NOTHING;`
    );
  });
}
process.stdout.write(`-- Generated from prisma/library/foods.ts (${LIBRARY.length} foods). Re-run the generator after editing that file.\n${lines.join("\n")}\n`);
