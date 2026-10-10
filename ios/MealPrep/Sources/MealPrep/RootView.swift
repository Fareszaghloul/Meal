import SwiftUI
import WebKit

/// Matches the web app's surface colors (`themeColor` in src/app/layout.tsx) so nothing flashes before first paint.
extension UIColor {
    static let appBackground = UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0x0f / 255, green: 0x10 / 255, blue: 0x12 / 255, alpha: 1)
            : UIColor(red: 0xf6 / 255, green: 0xf6 / 255, blue: 0xf4 / 255, alpha: 1)
    }
}

struct RootView: View {
    @StateObject private var model = WebModel()

    var body: some View {
        ZStack {
            Color(uiColor: .appBackground).ignoresSafeArea()
            // Edge to edge, keyboard included. This mirrors Safari/PWA: the layout viewport keeps its full height and only
            // the visual viewport shrinks, which is what ViewportVars.tsx (--kb, --vvh) and the bottom sheets are built
            // for. Shrinking the view instead would make the page compensate for the keyboard twice. The page owns its
            // safe-area padding via env(safe-area-inset-*) (viewport-fit=cover).
            WebViewContainer(webView: model.webView)
                .ignoresSafeArea()
            if let failure = model.failure {
                FailureView(failure: failure, retry: model.retry)
            }
        }
        .task { model.loadHomeIfNeeded() }
    }
}

struct WebViewContainer: UIViewRepresentable {
    let webView: WKWebView

    func makeUIView(context: Context) -> WKWebView { webView }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

struct FailureView: View {
    let failure: WebFailure
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: failure.symbol)
                .font(.system(size: 34, weight: .regular))
                .foregroundStyle(.secondary)
            Text(failure.title)
                .font(.headline)
            Text(failure.detail)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            if failure.isRetryable {
                Button("Try Again", action: retry)
                    .buttonStyle(.borderedProminent)
                    .padding(.top, 4)
            }
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(uiColor: .appBackground))
    }
}
