# 参考画像・元素材

PastelClip のスタイル検証用フォルダです。

## 置き方

```
docs/reference/
├── beach-original.jpg   # 元の実写写真（または .png）
└── output/              # プレビュー生成結果（git に含めなくて OK）
```

1. 元画像をこのフォルダに入れる
2. `git add docs/reference/beach-original.jpg`（ファイル名は任意）
3. `git commit` → `git push`

## プレビュー生成（ローカル PC）

元画像の**構図・顔・ポーズはそのまま**、見た目だけパステル画風に変換する試作です。

```powershell
cd C:\Users\user\dev\PastelClip
pip install -r tools/requirements.txt
python tools/preview_pastel_style.py
```

結果は `docs/reference/output/` に保存されます。

- `exaggerated` — 大げさタイプ
- `medium` — 中間
- `refined` — 格調高い・淡め（イメージ B 寄り）

## 重要

AI で似た絵を**新規生成する**のではなく、**同じ実写を変換する**のが PastelClip の目標です。  
動画では「冒頭実写 → 同じ映像がパステル画風に → 末尾実写」という体験になります。
