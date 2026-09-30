"""faster-whisper で文字起こし。戻り値は [(start, end, text)]。"""


def transcribe(wav, model="small", language="ja"):
    from faster_whisper import WhisperModel

    m = WhisperModel(model, compute_type="int8")
    segs, _ = m.transcribe(str(wav), language=language, vad_filter=True)
    return [(s.start, s.end, s.text.strip()) for s in segs if s.text.strip()]
