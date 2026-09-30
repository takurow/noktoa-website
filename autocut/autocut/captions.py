"""字幕テキストの整形。LLM あり/なしの2系統。
方針は premiere-caption スキルと同じ: 誤字脱字のみ直し、言い回しは変えない。句読点は使わず改行で区切る。"""
import json
import re

MAX_CHARS = 16  # 1行あたりの目安


def split_plain(text, max_chars=MAX_CHARS):
    """LLM を使わない簡易整形: 句読点で切り、長ければ max_chars で折る。句読点は除去。"""
    parts = [p for p in re.split(r"[、。,.!?！？\s]+", text) if p]
    lines = []
    for p in parts:
        while len(p) > max_chars:
            lines.append(p[:max_chars])
            p = p[max_chars:]
        lines.append(p)
    return "\n".join(lines)


def polish_with_claude(cues, model="claude-sonnet-5-5"):
    """Claude で誤字脱字を直し、読み上げのリズムで改行する。件数は変えない。"""
    import anthropic

    client = anthropic.Anthropic()
    payload = [t for _, _, t in cues]
    prompt = (
        "以下は動画の文字起こし(JSON配列)です。各要素について、誤字脱字のみ修正し、"
        f"1行{MAX_CHARS}文字程度で読み上げのリズムに合わせて改行(\\n)を入れてください。"
        "言い回し・語順・表現は変えず、句読点は使わないでください。"
        "要素数と順序は必ず同じにし、JSON配列のみを返してください。\n\n"
        + json.dumps(payload, ensure_ascii=False)
    )
    msg = client.messages.create(
        model=model, max_tokens=8000, messages=[{"role": "user", "content": prompt}]
    )
    text = msg.content[0].text
    result = json.loads(text[text.index("["): text.rindex("]") + 1])
    if len(result) != len(cues):
        raise ValueError("LLM の返却件数が一致しません")
    return [(s, e, r) for (s, e, _), r in zip(cues, result)]
