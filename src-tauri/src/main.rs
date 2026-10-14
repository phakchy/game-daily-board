// リリースビルドで余計なコンソール画面を出さない
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    game_daily_board_lib::run()
}
