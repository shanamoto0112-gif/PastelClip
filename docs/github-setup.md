# GitHub セットアップ — PastelClip

DedupeCSV（Cursor-Cloud）とは **別リポジトリ** にします。

## 手順

1. https://github.com/new でリポジトリ作成
   - Name: **PastelClip**
   - Public、README は追加しない（空）

2. PowerShell:

```powershell
cd C:\Users\user\dev\PastelClip
git init
git branch -M main
git add .
git commit -m "Initial commit: PastelClip spec and Cloud Agent mission"
git remote add origin https://github.com/shanamoto0112-gif/PastelClip.git
git push -u origin main
```

または Cursor に **「PastelClip を GitHub に push して」** と依頼。

## 旧フォルダの削除（任意）

移行後、混同防止のため削除してOK:

```
C:\Users\user\dev\Cursor-Cloud\pastel_video_effect\
```

（Cursor-Cloud の Git にはまだ含まれていません）
