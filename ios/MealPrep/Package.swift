// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "MealPrep",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
    ],
    products: [
        // An xtool project contains exactly one library product: the main app.
        .library(
            name: "MealPrep",
            targets: ["MealPrep"]
        ),
    ],
    targets: [
        .target(
            name: "MealPrep"
        ),
    ]
)
