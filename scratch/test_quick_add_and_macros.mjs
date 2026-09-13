// Automated integration test for custom meal logging & barcode search

async function runTests() {
  const baseUrl = "http://localhost:3000";
  console.log("Testing POST /api/meal-plan with custom macros...");

  // 1. Test POST custom meal
  const postRes = await fetch(`${baseUrl}/api/meal-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dayOfWeek: "wednesday",
      mealCategory: "lunch",
      customName: "Test Steak & Sweet Potato",
      servings: 1,
      calories: 620,
      protein: 52.5,
      carbs: 45.0,
      fat: 18.2,
    }),
  });

  if (!postRes.ok) {
    throw new Error(`POST /api/meal-plan failed: ${postRes.status} ${await postRes.text()}`);
  }

  const createdMeal = await postRes.json();
  console.log("Created Meal:", {
    id: createdMeal.id,
    customName: createdMeal.customName,
    calories: createdMeal.calories,
    protein: createdMeal.protein,
    carbs: createdMeal.carbs,
    fat: createdMeal.fat,
  });

  if (
    createdMeal.calories !== 620 ||
    createdMeal.protein !== 52.5 ||
    createdMeal.carbs !== 45.0 ||
    createdMeal.fat !== 18.2
  ) {
    throw new Error("Macros do not match expected input!");
  }
  console.log("✓ Custom macros persisted accurately!");

  // 2. Test PUT update macros
  const putRes = await fetch(`${baseUrl}/api/meal-plan`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mealId: createdMeal.id,
      calories: 650,
      protein: 55,
      carbs: 48,
      fat: 19,
    }),
  });

  if (!putRes.ok) {
    throw new Error(`PUT /api/meal-plan failed: ${putRes.status}`);
  }

  const updatedMeal = await putRes.json();
  if (updatedMeal.calories !== 650 || updatedMeal.protein !== 55) {
    throw new Error("PUT update failed to persist updated macros!");
  }
  console.log("✓ Custom macros updated successfully via PUT!");

  // 3. Test Barcode Search via External endpoint
  console.log("Testing Barcode Lookup for 0737628064502 (Rice noodles)...");
  const barcodeRes = await fetch(`${baseUrl}/api/foods/external/search?q=0737628064502`);
  if (!barcodeRes.ok) {
    throw new Error(`Barcode lookup failed: ${barcodeRes.status}`);
  }
  const barcodeData = await barcodeRes.json();
  console.log(`Found ${barcodeData.length} items for barcode:`, barcodeData[0]?.name);
  if (barcodeData.length === 0) {
    console.warn("Notice: Open Food Facts returned 0 items (offline or rate limited)");
  } else {
    console.log("✓ Barcode lookup returned product:", barcodeData[0].name, "with macros:", {
      calories: barcodeData[0].caloriesPer100g,
      protein: barcodeData[0].proteinPer100g,
      carbs: barcodeData[0].carbsPer100g,
      fat: barcodeData[0].fatPer100g,
    });
  }

  // 4. Cleanup test meal
  console.log("Cleaning up test meal...");
  const delRes = await fetch(`${baseUrl}/api/meal-plan?mealId=${createdMeal.id}`, {
    method: "DELETE",
  });
  if (!delRes.ok) {
    throw new Error(`DELETE /api/meal-plan failed: ${delRes.status}`);
  }
  console.log("✓ Cleaned up test meal. All backend tests passed!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
