import Foundation

/// A load problem the user can understand. Raw error text is never shown; details go to the log instead.
enum WebFailure: Equatable {
    case offline
    case unreachable
    case server(statusCode: Int)
    case misconfigured

    var symbol: String {
        switch self {
        case .offline: "wifi.slash"
        case .unreachable, .server: "exclamationmark.icloud"
        case .misconfigured: "gearshape.trianglebadge.exclamationmark"
        }
    }

    var title: String {
        switch self {
        case .offline: "You're offline"
        case .unreachable: "Can't reach MealPrep"
        case .server: "MealPrep is having trouble"
        case .misconfigured: "App isn't configured"
        }
    }

    var detail: String {
        switch self {
        case .offline: "MealPrep needs an internet connection. Your unsynced changes are kept on this device."
        case .unreachable: "The server didn't respond. Check your connection and try again."
        case .server(let code): "The server returned an error (\(code)). Try again in a moment."
        case .misconfigured: "MealServerURL in Info.plist must be a valid https URL."
        }
    }

    var isRetryable: Bool { self != .misconfigured }

    /// Maps a URLSession/WebKit error to a failure, or nil when the error is just a cancelled navigation.
    static func from(_ error: Error) -> WebFailure? {
        let nsError = error as NSError
        if nsError.domain == NSURLErrorDomain {
            switch nsError.code {
            case NSURLErrorCancelled:
                return nil
            case NSURLErrorNotConnectedToInternet, NSURLErrorDataNotAllowed, NSURLErrorInternationalRoamingOff:
                return .offline
            default:
                return .unreachable
            }
        }
        // WebKitErrorFrameLoadInterruptedByPolicyChange: raised when we turn a navigation into a download or hand a
        // link to Safari. Not a failure.
        if nsError.domain == "WebKitErrorDomain" && nsError.code == 102 {
            return nil
        }
        return .unreachable
    }
}
