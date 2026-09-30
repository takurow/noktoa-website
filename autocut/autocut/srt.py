def _ts(t):
    ms = round(t * 1000)
    h, ms = divmod(ms, 3600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def to_srt(cues):
    blocks = []
    for i, (s, e, text) in enumerate(cues, 1):
        blocks.append(f"{i}\n{_ts(s)} --> {_ts(e)}\n{text}\n")
    return "\n".join(blocks)
