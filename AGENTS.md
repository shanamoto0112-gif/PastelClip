# AGENTS.md

PastelClip — 静的 Web アプリ（HTML / CSS / JavaScript + FFmpeg.wasm）。バックエンドなし。
DedupeCSV / Cursor-Cloud とは別プロジェクト（混同しないこと）。

## Cursor Cloud specific instructions

### サービス構成

- **PastelClip（メイン・唯一のサービス）**: 静的フロントエンド。ビルド工程・パッケージマネージャ・lint/test スイートは存在しない。
- **`tools/preview_pastel_style.py`（任意の開発補助ツール）**: 実写画像をパステル画風に変換するプレビュー。`cv2`(opencv-python-headless) + numpy を使用。`docs/reference/` に画像を置いてから実行する。

### 起動方法（重要な注意点）

- 開発サーバーは **リポジトリのルートから** 静的サーバーで起動する: `python3 -m http.server 8080`（標準手順は `README.md` 参照）。
- `file://` で直接開くと動作しない。必ず HTTP サーバー経由で開くこと。
- FFmpeg コア（`ffmpeg-core.js` / `.wasm`）は実行時に `cdn.jsdelivr.net` から動的に取得する（`script.js` の `FFMPEG_CORE_BASE`）。**ブラウザ実行中にネットワークアクセスが必要**。CDN が遮断されると「FFmpeg の読み込みに失敗しました」エラーになる。
- 動画処理はすべてブラウザ内（WASM）で行われ、サーバーには送信されない。
- 入力動画は「冒頭+末尾の秒数 + トランジション各0.5秒」より長い必要がある（デフォルト設定では 5 秒超）。短すぎる動画はエラーになる。

### lint / test / build

- lint・test・build コマンドは定義されていない（静的サイトのため）。変更確認はブラウザでの手動動作確認で行う。
- ローカル動作確認用の短い動画は `ffmpeg`（VM に導入済み）で生成できる。例: `ffmpeg -f lavfi -i testsrc=duration=8:size=640x360:rate=30 -f lavfi -i sine=frequency=440:duration=8 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest /tmp/test_clip.mp4`
