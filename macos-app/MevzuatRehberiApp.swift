import SwiftUI
import WebKit

private let liveURL = URL(string: "https://mevzuatrehberi.mevzuatrehberi.workers.dev/?app=macos")!

final class BrowserCoordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
    let onOpenTab: (URL) -> Void

    init(onOpenTab: @escaping (URL) -> Void) {
        self.onOpenTab = onOpenTab
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }

        if url.scheme == "http" || url.scheme == "https" {
            decisionHandler(.allow)
        } else {
            decisionHandler(.cancel)
        }
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        // Site yeni sekme/pencere istese de macOS uygulamasında aynı içerik alanında aç.
        if let requestURL = navigationAction.request.url { onOpenTab(requestURL) }
        return nil
    }
}

struct RehberWebView: NSViewRepresentable {
    let url: URL
    let onOpenTab: (URL) -> Void

    func makeCoordinator() -> BrowserCoordinator { BrowserCoordinator(onOpenTab: onOpenTab) }

    func makeNSView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.setValue(false, forKey: "drawsBackground")
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {}
}

struct BrowserTab: Identifiable, Equatable {
    let id: UUID
    let url: URL
    var title: String

    init(url: URL, title: String) {
        self.id = UUID()
        self.url = url
        self.title = title
    }
}

@main
struct MevzuatRehberiApp: App {
    @State private var tabs = [BrowserTab(url: liveURL, title: "Mevzuat Rehberi")]
    @State private var selectedTab: UUID?

    var body: some Scene {
        WindowGroup("Mevzuat Rehberi") {
            TabView(selection: $selectedTab) {
                ForEach(tabs) { tab in
                    RehberWebView(url: tab.url) { url in
                        addTab(url)
                    }
                    .tabItem { Text(tab.title) }
                    .tag(Optional(tab.id))
                }
            }
            .frame(minWidth: 1100, minHeight: 720)
            .onAppear {
                if selectedTab == nil { selectedTab = tabs[0].id }
            }
        }
        .windowResizability(.contentSize)
    }

    private func addTab(_ url: URL) {
        guard url.scheme == "http" || url.scheme == "https" else { return }
        let title = url.path.contains("ipc") ? "İPC 2026" : url.path.contains("mevzuat") ? "Mevzuat" : "Mevzuat Rehberi"
        let newTab = BrowserTab(url: url, title: title)
        tabs.append(newTab)
        selectedTab = newTab.id
    }
}
