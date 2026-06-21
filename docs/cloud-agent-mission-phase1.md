# Cloud Agent ミッション — PastelClip Phase 1

**リポジトリ**: `PastelClip`（DedupeCSV の Cursor-Cloud とは別）

---

## 依頼文（Cloud 起動時にコピペ）

```
PastelClip Phase 1 プロトタイプを実装してください。

## 参照
- docs/pastel_video_effect_spec_v2.md（仕様書 v2.0）
- .cursorrules（開発ルール）

## 必須タスク
1. index.html / style.css / script.js を作成（スマホファースト縦型UI）
2. FFmpeg.wasm で mp4 アップロード → パステルエフェクト → ダウンロード
3. 冒頭・末尾の実写時間スライダー（1〜5秒、デフォルト2秒）
4. 処理中プログレスバー + 将来広告用スペース（空 div でOK）
5. 動画はブラウザ内のみ処理（サーバー送信なし）
6. PC ブラウザで動作確認手順を README に追記
7. 完了したら PR を作成（feat: PastelClip Phase 1 prototype）

## 制約
- バックエンド不要（静的 HTML/JS のみ）
- Phase 1 に広告・認証・SNS 投稿は含めない
- 1ステップずつ：まず UI 骨格 → FFmpeg 連携 → エフェクト調整の順
- DedupeCSV / Cursor-Cloud とは無関係 — このリポジトリのみ編集

## パステルフィルター（デフォルト）
- 彩度 0.6、明度 1.2、コントラスト 0.9、ガンマ 1.1
- 冒頭N秒実写 → フェード0.5秒 → パステル中間 → フェード → 末尾M秒実写
```

---

## 社長の操作

1. GitHub に **PastelClip** リポジトリを作成（空）
2. ローカルを push（または Cursor に「PastelClip を push して」）
3. Cloud 選択 + 上記依頼文
4. Composer 2.5 で OK（Web + FFmpeg.wasm は範囲が明確）

---

## DedupeCSV との分離

| | Cursor-Cloud | PastelClip |
|--|--------------|------------|
| 商品 | DedupeCSV | PastelClip |
| 技術 | Python / exe | HTML / FFmpeg.wasm |
| 販売 | Gumroad $19 | 将来 広告Web |
| GitHub | shanamoto0112-gif/Cursor-Cloud | shanamoto0112-gif/PastelClip（新規） |
