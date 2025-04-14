import tensorflow as tf
from tensorflow.keras.utils import to_categorical
from sklearn.model_selection import train_test_split
import matplotlib.pyplot as plt
from datasets import Dataset
import json


# Load dataset
training_data = "normalized_output.json"
dataset = Dataset.from_list(training_data)
print(dataset)

# print(f"Training data shape: {x_train.shape}, {y_train.shape}")
# print(f"Testing data shape: {x_test.shape}, {y_test.shape}")
# x_train = x_train / 255.0
# x_test = x_test / 255.0
# y_train = to_categorical(y_train, num_classes=10)
# y_test = to_categorical(y_test, num_classes=10)
# x_train, x_val, y_train, y_val = train_test_split(x_train, y_train, test_size=0.2, random_state=42)
# from tensorflow.keras import layers, models
# model = models.Sequential([
#     # Convolutional Layer 1
#     layers.Conv2D(32, (3, 3), activation='relu', input_shape=(32, 32, 3)),
#     layers.MaxPooling2D((2, 2)),

#     # Convolutional Layer 2
#     layers.Conv2D(64, (3, 3), activation='relu'),
#     layers.MaxPooling2D((2, 2)),

#     # Convolutional Layer 3
#     layers.Conv2D(64, (3, 3), activation='relu'),

#     # Flatten and Fully Connected Layers
#     layers.Flatten(),
#     layers.Dense(64, activation='relu'),
#     layers.Dense(10, activation='softmax')  # 10 classes for CIFAR-10
# ])

# # Compile and train the model
# model.compile(optimizer='adam',
#               loss='categorical_crossentropy',
#               metrics=['accuracy'])

# history = model.fit(x_train, y_train, epochs=10, validation_data=(x_val, y_val))
# test_loss, test_acc = model.evaluate(x_test, y_test)
# print(f"Test accuracy: {test_acc:.2f}")
# plt.plot(history.history['accuracy'], label='Training Accuracy')
# plt.plot(history.history['val_accuracy'], label='Validation Accuracy')
# plt.xlabel('Epochs')
# plt.ylabel('Accuracy')
# plt.legend()
# plt.show()
