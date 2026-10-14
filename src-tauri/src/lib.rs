mod links;

use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, PhysicalPosition, WindowEvent,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_opener::OpenerExt;

const MAIN: &str = "main";
const PANEL: &str = "panel";
const TRAY: &str = "tray";
/// 自動起動時に付ける引数。これがあればメイン画面を出さずにトレイだけで待機する
const MINIMIZED_ARG: &str = "--minimized";
/// パネルと画面端・タスクバーとのすき間（物理ピクセル）
const MARGIN: i32 = 12;

/// パネルが最後に隠れた時刻。トレイを押した瞬間にフォーカスが外れて隠れ、
/// 直後のクリックで再表示されてしまうのを防ぐ
struct PanelState {
    hidden_at: Mutex<Option<Instant>>,
}

fn show_main(app: &AppHandle) {
    if let Some(panel) = app.get_webview_window(PANEL) {
        let _ = panel.hide();
    }
    if let Some(w) = app.get_webview_window(MAIN) {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn toggle_panel(app: &AppHandle, click: PhysicalPosition<f64>) {
    let Some(panel) = app.get_webview_window(PANEL) else { return };

    if panel.is_visible().unwrap_or(false) {
        let _ = panel.hide();
        return;
    }
    let recently_hidden = app
        .state::<PanelState>()
        .hidden_at
        .lock()
        .unwrap()
        .is_some_and(|t| t.elapsed() < Duration::from_millis(250));
    if recently_hidden {
        return;
    }

    // クリック位置のモニターの作業領域（タスクバーを除いた範囲）に収まるよう、
    // トレイアイコンのすぐ上（タスクバーが上にあるときはすぐ下）に置く
    if let (Ok(Some(monitor)), Ok(size)) = (panel.monitor_from_point(click.x, click.y), panel.outer_size()) {
        let area = monitor.work_area();
        let (w, h) = (size.width as i32, size.height as i32);
        let (left, top) = (area.position.x, area.position.y);
        let (right, bottom) = (left + area.size.width as i32, top + area.size.height as i32);

        let x = (click.x as i32 - w / 2).clamp(left + MARGIN, (right - w - MARGIN).max(left + MARGIN));
        let taskbar_at_top = (click.y as i32) < top + area.size.height as i32 / 2;
        let y = if taskbar_at_top { top + MARGIN } else { bottom - h - MARGIN };
        let _ = panel.set_position(PhysicalPosition::new(x, y));
    }

    let _ = panel.show();
    let _ = panel.set_focus();
}

/// 画面側から呼ぶ：トレイアイコンにマウスを乗せたときの説明（例「今日の日課 2／5 完了」）
#[tauri::command]
fn set_tray_tooltip(app: AppHandle, text: String) {
    if let Some(tray) = app.tray_by_id(TRAY) {
        let _ = tray.set_tooltip(Some(text));
    }
}

/// 画面側から呼ぶ：パネルの「全画面で開く」
#[tauri::command]
fn open_main(app: AppHandle) {
    show_main(&app);
}

/// 画面側から呼ぶ：公式告知のリンクを普段使っているブラウザで開く。公式サイト以外は開かない
#[tauri::command]
fn open_official_url(app: AppHandle, url: String) -> Result<(), String> {
    let url = links::official_url(&url).ok_or("公式サイト以外のリンクは開けません")?;
    app.opener().open_url(url.as_str(), None::<&str>).map_err(|e| e.to_string())
}

/// インストール版の初回起動時だけ「PC起動時に自動で起動」をオンにする。
/// 印のファイルを残すので、あとでメニューからオフにすればその設定が続く。
/// 開発版（npm run desktop）は開発用サーバーがないと動かないため対象外。
fn enable_autostart_on_first_run(app: &AppHandle) {
    if cfg!(debug_assertions) {
        return;
    }
    let Ok(dir) = app.path().app_config_dir() else { return };
    let marker = dir.join("autostart-initialized");
    if marker.exists() {
        return;
    }
    if app.autolaunch().enable().is_ok() && std::fs::create_dir_all(&dir).is_ok() {
        let _ = std::fs::write(&marker, b"1");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 2つ目を起動しようとしたら、既に動いている方の画面を出す
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec![MINIMIZED_ARG])))
        .plugin(tauri_plugin_opener::init())
        .plugin(links::navigation_guard())
        .manage(PanelState { hidden_at: Mutex::new(None) })
        .invoke_handler(tauri::generate_handler![set_tray_tooltip, open_main, open_official_url])
        .setup(|app| {
            enable_autostart_on_first_run(app.handle());
            let autostart = app.autolaunch().is_enabled().unwrap_or(false);

            let open = MenuItem::with_id(app, "open", "開く", true, None::<&str>)?;
            let auto = CheckMenuItem::with_id(app, "autostart", "PC起動時に自動で起動", true, autostart, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "終了", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &auto, &PredefinedMenuItem::separator(app)?, &quit])?;

            let auto_item = auto.clone();
            TrayIconBuilder::with_id(TRAY)
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("ソシャゲ日課ボード")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "open" => show_main(app),
                    "autostart" => {
                        let launcher = app.autolaunch();
                        let enable = !launcher.is_enabled().unwrap_or(false);
                        let _ = if enable { launcher.enable() } else { launcher.disable() };
                        let _ = auto_item.set_checked(launcher.is_enabled().unwrap_or(false));
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, position, .. } => {
                        toggle_panel(tray.app_handle(), position)
                    }
                    TrayIconEvent::DoubleClick { button: MouseButton::Left, .. } => show_main(tray.app_handle()),
                    _ => {}
                })
                .build(app)?;

            if !std::env::args().any(|a| a == MINIMIZED_ARG) {
                show_main(app.handle());
            }
            Ok(())
        })
        .on_window_event(|window, event| match (window.label(), event) {
            // メイン画面の×は終了ではなくトレイにしまう（終了はトレイのメニューから）
            (MAIN, WindowEvent::CloseRequested { api, .. }) => {
                api.prevent_close();
                let _ = window.hide();
            }
            // パネルは他の場所をクリックしたら隠す
            (PANEL, WindowEvent::Focused(false)) => {
                let _ = window.hide();
                *window.state::<PanelState>().hidden_at.lock().unwrap() = Some(Instant::now());
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("アプリの起動に失敗しました");
}
