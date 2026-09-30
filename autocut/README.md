# autocut

動画を渡すと、無音カット + テロップ付きのタイムラインを作るCLI。
出力は Premiere Pro / DaVinci Resolve のどちらでも読み込める形式。

## 準備
    brew install ffmpeg          # Windows は winget install ffmpeg
    pip install -r requirements.txt
    export ANTHROPIC_API_KEY=... # 字幕校正(Claude)を使う場合

## 使い方
    python -m autocut 動画.mp4 -o out
    python -m autocut 動画.mp4 --no-llm        # Claude を使わず簡易整形
    python -m autocut 動画.mp4 --no-captions   # 無音カットのみ

## 出力
- `動画.xml` : カット済みシーケンス(FCP7 XML)。Premiere は ファイル > 読み込み、Resolve は ファイル > 読み込み > タイムライン
- `動画.srt` : カット後のタイムラインに合わせた字幕(Premiereのキャプションに読み込み)
- `動画.txt` : 字幕テキストのみ(premiere-caption 形式)

## 調整
`--noise-db`(既定 -35)、`--min-silence`(既定 0.5秒)、`--pad`(既定 0.12秒)

## テスト
    python -m pytest
