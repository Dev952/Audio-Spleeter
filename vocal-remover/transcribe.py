import sys
import whisper
import warnings

# Silence FP16 warning
warnings.filterwarnings("ignore", message="FP16 is not supported on CPU")

# Set encoding to support unicode
sys.stdout.reconfigure(encoding="utf-8")

# Get audio file path
audio_path = sys.argv[1]

# Load whisper model
model = whisper.load_model("small")

# Transcribe WITHOUT forcing language
result = model.transcribe(audio_path)

# Print text (likely Romanized Hindi)
print(result["text"])
