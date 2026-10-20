`vad-speech.wav` is a generated, mono 16 kHz PCM voice fixture for the real
Silero ONNX browser tests and fake microphone. It contains no recorded person
or provider output. Generate it with FFmpeg's Flite source:

```sh
ffmpeg -f lavfi -i "flite=text='I would add an index on the customer identifier and creation time. Then I would test the query with realistic data and check the execution plan.':voice=slt" -ar 16000 -ac 1 -c:a pcm_s16le -y e2e/fixtures/vad-speech.wav
```
