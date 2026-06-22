# PastelClip

ショート動画に「冒頭実写 → パステル → 末尾実写」エフェクトを付ける Web アプリ（Phase 1 プロトタイプ）。

**DedupeCSV（[Cursor-Cloud](https://github.com/shanamoto0112-gif/Cursor-Cloud)）とは別プロジェクトです。**

## 仕様

- [docs/pastel_video_effect_spec_v2.md](docs/pastel_video_effect_spec_v2.md)
- [docs/pastel-style-transfer-vision.md](docs/pastel-style-transfer-vision.md) — 実写を保ったパステル画風変換の方向性

## パステル画風プレビュー（開発中）

**同じ実写の構図・顔・ポーズを維持**したまま、見た目だけパステル画風にする試作です。

```powershell
# 元画像を docs/reference/ に置いてから
pip install -r tools/requirements.txt
python tools/preview_pastel_style.py
```

詳細: [docs/reference/README.md](docs/reference/README.md)

## ファイル構成

```
index.html    # フロントエンド（単一ページ）
style.css     # スタイル（スマホファースト縦型UI）
script.js     # FFmpeg.wasm 処理ロジック
```

## PC ブラウザでの動作確認手順

FFmpeg.wasm は CDN からライブラリを読み込むため、**ローカルサーバー経由**で開いてください（`file://` では動作しません）。

### 1. ローカルサーバーを起動

リポジトリのルートで以下のいずれかを実行します。

```bash
# Python 3
python3 -m http.server 8080

# または npx（Node.js が入っている場合）
npx --yes serve -p 8080
```

### 2. ブラウザで開く

Chrome または Edge で次の URL を開きます。

```
http://localhost:8080
```

### 3. 動画を変換する

1. **「動画を選択する」** をクリックし、mp4 または mov ファイルを選ぶ（60秒以内・500MB以下）
2. **冒頭の実写時間**・**末尾の実写時間** をスライダーで調整（1〜5秒、デフォルト2秒）
3. **「エフェクトを適用する」** をクリック
4. 初回は FFmpeg.wasm の読み込みに数十秒かかることがあります。プログレスバーで進捗を確認
5. 完了後 **「動画をダウンロード」** で変換済み mp4 を保存

### 4. 確認ポイント

| 項目 | 期待する動作 |
|---|---|
| アップロード | mp4 / mov が選択できる |
| エフェクト | 冒頭・末尾は実写、中間がパステル調になる |
| プログレスバー | 処理中に表示される |
| 広告スペース | 処理中画面に空の枠（`#ad-space`）が表示される |
| プライバシー | 動画はブラウザ内のみで処理（ネットワーク送信なし） |
| ダウンロード | `pastelclip_*.mp4` が保存できる |

### トラブルシューティング

- **Worker の CORS エラー（`cdn.jsdelivr.net/.../worker.js`）** — 古いコードが動いています。`git pull` で最新を取得し、**強制リロード**（Ctrl+Shift+R / Mac: Cmd+Shift+R）してください。`script.js` の先頭が `import { FFmpeg } from './vendor/ffmpeg/index.js'` になっていれば OK です
- **古いコードがキャッシュされている** — シークレットウィンドウで `http://localhost:8080` を開いてください
- **「FFmpeg を読み込み中」で止まる** — ネットワーク接続を確認し、ページを再読み込みしてください
- **動画が短すぎるエラー** — 冒頭＋末尾の秒数の合計＋トランジション（各0.5秒）より長い動画が必要です
- **処理が遅い** — PC でも数十秒かかることがあります。Phase 2 でスマホ実機の検証を予定しています

## 開発

Cursor でこのフォルダをワークスペースとして開いて開発します。
Cloud Agent 用の依頼文は [docs/cloud-agent-mission-phase1.md](docs/cloud-agent-mission-phase1.md) を参照。
