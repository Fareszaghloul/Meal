import OSLog
import SwiftUI
import WebKit

private let log = Logger(subsystem: "com.fareszaghloul.mealprep", category: "web")

/// Owns the single WKWebView that hosts the MealPrep web app, and implements the native behavior WKWebView does not
/// provide by default: JS dialogs, camera permission, file downloads, external links and load-failure handling.
@MainActor
final class WebModel: NSObject, ObservableObject {
    let webView: WKWebView
    @Published private(set) var failure: WebFailure?

    private let serverHost = AppConfig.serverURL?.host?.lowercased()
    private var downloadDestinations: [ObjectIdentifier: URL] = [:]

    override init() {
        let configuration = WKWebViewConfiguration()
        // Persistent store: the session cookie (`mealprep_session`) and localStorage (offline write queue, theme) survive
        // app restarts.
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.applicationNameForUserAgent = "MealPrepApp"

        webView = WKWebView(frame: .zero, configuration: configuration)
        super.init()

        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        // Long-pressing a link would otherwise pop a Safari-style preview, which feels foreign in an app.
        webView.allowsLinkPreview = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = .appBackground
        webView.scrollView.backgroundColor = .appBackground
        webView.underPageBackgroundColor = .appBackground
    }

    func loadHomeIfNeeded() {
        guard webView.url == nil, !webView.isLoading else { return }
        loadHome()
    }

    func retry() {
        failure = nil
        if webView.url == nil || webView.url?.scheme == "about" {
            loadHome()
        } else {
            webView.reload()
        }
    }

    private func loadHome() {
        guard let url = AppConfig.serverURL else {
            failure = .misconfigured
            return
        }
        webView.load(URLRequest(url: url))
    }

    private func isInApp(_ url: URL) -> Bool {
        guard let host = url.host?.lowercased() else { return false }
        return host == serverHost
    }

    private func openExternally(_ url: URL) {
        UIApplication.shared.open(url)
    }

    private func record(_ error: Error) {
        let nsError = error as NSError
        log.error("load failed domain=\(nsError.domain, privacy: .public) code=\(nsError.code, privacy: .public)")
        if let mapped = WebFailure.from(error) {
            failure = mapped
        }
    }

    // MARK: - Presenting native UI

    private func topViewController() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
        var top = scene?.keyWindow?.rootViewController
        while let presented = top?.presentedViewController {
            top = presented
        }
        return top
    }

    /// Returns false when nothing could be presented, so callers can resolve their pending JS dialog.
    private func present(_ controller: UIViewController) -> Bool {
        guard let top = topViewController() else { return false }
        if let popover = controller.popoverPresentationController {
            popover.sourceView = top.view
            popover.sourceRect = CGRect(x: top.view.bounds.midX, y: top.view.bounds.midY, width: 0, height: 0)
            popover.permittedArrowDirections = []
        }
        top.present(controller, animated: true)
        return true
    }

    private func presentSimpleAlert(title: String, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        _ = present(alert)
    }
}

// MARK: - Navigation

extension WebModel: WKNavigationDelegate {
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
        guard let url = navigationAction.request.url, let scheme = url.scheme?.lowercased() else { return .cancel }

        // <a download> with a blob: URL (Settings -> Your data) arrives here.
        if navigationAction.shouldPerformDownload { return .download }

        switch scheme {
        case "about", "blob", "data":
            return .allow
        case "https", "http":
            if isInApp(url) { return .allow }
            // Embedded subframes may load other origins; a top-level jump to another site leaves the app.
            if navigationAction.targetFrame?.isMainFrame == false { return .allow }
            openExternally(url)
            return .cancel
        default:
            // mailto:, tel:, maps:, etc.
            openExternally(url)
            return .cancel
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse) async -> WKNavigationResponsePolicy {
        guard let http = navigationResponse.response as? HTTPURLResponse else {
            return navigationResponse.canShowMIMEType ? .allow : .download
        }

        let disposition = http.value(forHTTPHeaderField: "Content-Disposition")?.lowercased() ?? ""
        if disposition.hasPrefix("attachment") || !navigationResponse.canShowMIMEType {
            return .download
        }

        // A tunnel/proxy outage returns an HTML error page; show the native screen instead of raw gateway text.
        if navigationResponse.isForMainFrame, http.statusCode >= 500 {
            log.error("main frame status=\(http.statusCode, privacy: .public)")
            failure = .server(statusCode: http.statusCode)
            return .cancel
        }
        return .allow
    }

    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
        failure = nil
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        record(error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        record(error)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        // iOS reclaims web content memory while the app is backgrounded. Reload rather than show a blank view.
        log.error("web content process terminated; reloading")
        webView.reload()
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }
}

// MARK: - UI delegate (JS dialogs, camera, window.open)

extension WebModel: WKUIDelegate {
    // WKWebView drops alert/confirm/prompt unless these are implemented, and confirm() would then always be false,
    // silently cancelling every delete flow in the app.
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo) async {
        await withCheckedContinuation { continuation in
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in continuation.resume() })
            if !present(alert) { continuation.resume() }
        }
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo) async -> Bool {
        await withCheckedContinuation { continuation in
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in continuation.resume(returning: false) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in continuation.resume(returning: true) })
            if !present(alert) { continuation.resume(returning: false) }
        }
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo) async -> String? {
        await withCheckedContinuation { continuation in
            let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
            alert.addTextField { $0.text = defaultText }
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in continuation.resume(returning: nil) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak alert] _ in
                continuation.resume(returning: alert?.textFields?.first?.text)
            })
            if !present(alert) { continuation.resume(returning: nil) }
        }
    }

    // Barcode scanner (getUserMedia). Only our own origin, and only video: no microphone.
    func webView(_ webView: WKWebView, decideMediaCapturePermissionsFor origin: WKSecurityOrigin, initiatedBy frame: WKFrameInfo, type: WKMediaCaptureType) async -> WKPermissionDecision {
        guard type == .camera, origin.host.lowercased() == serverHost else { return .deny }
        return .grant
    }

    // target="_blank" / window.open: stay in the single web view for our origin, hand everything else to Safari.
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        guard let url = navigationAction.request.url else { return nil }
        if isInApp(url) {
            webView.load(navigationAction.request)
        } else {
            openExternally(url)
        }
        return nil
    }
}

// MARK: - Downloads (backup / CSV export) -> share sheet

extension WebModel: WKDownloadDelegate {
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String) async -> URL? {
        let invalid = CharacterSet(charactersIn: "/\\:")
        let name = suggestedFilename.components(separatedBy: invalid).joined(separator: "_")
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        } catch {
            log.error("download directory failed: \(error.localizedDescription, privacy: .public)")
            return nil
        }
        let destination = directory.appendingPathComponent(name.isEmpty ? "download" : name)
        downloadDestinations[ObjectIdentifier(download)] = destination
        return destination
    }

    func downloadDidFinish(_ download: WKDownload) {
        guard let destination = downloadDestinations.removeValue(forKey: ObjectIdentifier(download)) else { return }
        let directory = destination.deletingLastPathComponent()
        let sheet = UIActivityViewController(activityItems: [destination], applicationActivities: nil)
        sheet.completionWithItemsHandler = { _, _, _, _ in
            try? FileManager.default.removeItem(at: directory)
        }
        if !present(sheet) {
            try? FileManager.default.removeItem(at: directory)
        }
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        if let destination = downloadDestinations.removeValue(forKey: ObjectIdentifier(download)) {
            try? FileManager.default.removeItem(at: destination.deletingLastPathComponent())
        }
        let nsError = error as NSError
        log.error("download failed domain=\(nsError.domain, privacy: .public) code=\(nsError.code, privacy: .public)")
        presentSimpleAlert(title: "Download failed", message: "The file couldn't be saved. Try again.")
    }
}
