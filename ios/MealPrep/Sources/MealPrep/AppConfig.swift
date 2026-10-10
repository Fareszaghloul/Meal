import Foundation

/// Build-time configuration, read from Info.plist so the server origin lives in exactly one place.
enum AppConfig {
    /// The web app's origin. Navigation to this host stays in the app; every other host opens in Safari.
    static let serverURL: URL? = {
        guard
            let raw = Bundle.main.object(forInfoDictionaryKey: "MealServerURL") as? String,
            let url = URL(string: raw),
            url.scheme == "https",
            url.host != nil
        else { return nil }
        return url
    }()
}
