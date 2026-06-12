# Enabling real in-browser model inference

The SmartPot web app **already runs your trained model** when the model file
carries TFLite metadata. Here's the full picture and the 10-line fix.

## What's happening now

- Your `smartpot_plant_model.tflite` is a **MobileNetV2 1.00 224** classifier
  (224×224×3 input, 3 classes, `FULLY_CONNECTED` op **v12** — a recent TF export).
- The web app loads it with **Google MediaPipe Tasks** (the only browser TFLite
  runtime new enough to support op v12 — `@tensorflow/tfjs-tflite` is too old).
- MediaPipe loads the model fine, but its image classifier needs the model to
  embed **NormalizationOptions** metadata so it knows how to scale pixels. Your
  model was exported **without** embedded metadata, so the app currently shows a
  **"Preview classifier"** (a lightweight color/spot heuristic) instead.
- **Your React Native app is unaffected** — `react-native-fast-tflite` runs the
  raw model natively on-device and does not need this metadata.

## The fix: add metadata once (≈10 lines of Python)

Run this in the same environment you trained/exported the model. It writes the
input normalization (MobileNetV2 uses **[-1, 1]**, i.e. mean=127.5, std=127.5)
and your class labels into the file.

```python
# pip install tflite-support
from tflite_support.metadata_writers import image_classifier
from tflite_support.metadata_writers import writer_utils

ImageClassifierWriter = image_classifier.MetadataWriter

# IMPORTANT: order must match your training class order (Keras sorts folders
# alphabetically). Adjust if needed.
labels = ["healthy", "disease_spots", "leaf_browning"]

# MobileNetV2 preprocessing: (pixel / 127.5) - 1  ->  mean=127.5, std=127.5
writer = ImageClassifierWriter.create_for_inference(
    writer_utils.load_file("smartpot_plant_model.tflite"),
    input_norm_mean=[127.5],
    input_norm_std=[127.5],
    label_file_paths=[]  # or ["labels.txt"] with one label per line
)
# If you skip label_file_paths, pass labels via a temp file:
with open("labels.txt", "w") as f:
    f.write("\n".join(labels))
writer = ImageClassifierWriter.create_for_inference(
    writer_utils.load_file("smartpot_plant_model.tflite"),
    [127.5], [127.5], ["labels.txt"])

writer_utils.save_file(writer.populate(), "smartpot_plant_model.tflite")
print("Metadata added.")
```

Replace the project's `smartpot_plant_model.tflite` with the new file. On the
next scan the app will run **real on-device inference** and the result card will
read **"MobileNetV2 · on-device"** instead of "Preview classifier" — no code
changes needed.

## If your class order differs

Open `tflite.jsx` and edit `TFLITE_CLASSES` so the order matches your training
labels (index 0 = first class the model outputs, etc.).
