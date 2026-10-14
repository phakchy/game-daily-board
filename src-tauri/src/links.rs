//! 外部リンクの安全確認。公式告知のリンクだけを、普段使っているブラウザで開く。

use tauri::{plugin::TauriPlugin, Runtime, Url};

/// 開いてよい公式サイトのドメイン（サブドメインも可）。
/// 画面側の src/lib/links.ts にも同じ一覧がある。変えるときは両方そろえる。
pub const OFFICIAL_DOMAINS: &[&str] = &[
    "hoyoverse.com",
    "hoyolab.com",
    "kurogames.com",
    "bluearchive.jp",
    "nikke-jp.com",
    "blablalink.com",
];

/// https で、ユーザー名・パスワード・独自ポートを含まず、公式ドメインのURLだけを通す
pub fn official_url(raw: &str) -> Option<Url> {
    let url = Url::parse(raw).ok()?;
    if url.scheme() != "https" || !url.username().is_empty() || url.password().is_some() || url.port().is_some() {
        return None;
    }
    let host = url.host_str()?.to_ascii_lowercase();
    OFFICIAL_DOMAINS
        .iter()
        .any(|d| host == *d || host.ends_with(&format!(".{d}")))
        .then_some(url)
}

/// アプリの画面以外へのページ移動をすべて止める（リンク等で外部サイトがアプリ内に表示されないように）
pub fn navigation_guard<R: Runtime>() -> TauriPlugin<R> {
    tauri::plugin::Builder::new("navigation-guard")
        .on_navigation(|_, url| {
            let app_page = matches!(url.scheme(), "tauri")
                || (url.scheme() == "http" && url.host_str() == Some("tauri.localhost"));
            let dev_server = cfg!(dev) && url.scheme() == "http" && url.host_str() == Some("localhost");
            app_page || dev_server
        })
        .build()
}

#[cfg(test)]
mod tests {
    use super::official_url;

    #[test]
    fn allows_official_https() {
        assert!(official_url("https://hsr.hoyoverse.com/ja-jp/news/123").is_some());
        assert!(official_url("https://bluearchive.jp/news/newsJump/698").is_some());
        assert!(official_url("https://nikke-jp.com/newsdetail.html?content_id=x").is_some());
    }

    #[test]
    fn rejects_everything_else() {
        for bad in [
            "http://bluearchive.jp/",                     // https ではない
            "https://evil.com/x.hoyoverse.com/",          // パスに公式ドメインを含むだけ
            "https://hoyoverse.com.evil.com/",            // 公式ドメインで始まる別サイト
            "https://evilhoyoverse.com/",                 // 末尾が一致するだけの別ドメイン
            "https://user:pw@bluearchive.jp/",            // 認証情報入り
            "https://bluearchive.jp:8443/",               // 独自ポート
            "javascript:alert(1)",
            "file:///C:/Windows/System32/cmd.exe",
            "not a url",
        ] {
            assert!(official_url(bad).is_none(), "{bad}");
        }
    }
}
