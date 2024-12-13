# backend/app/services/face_detection.py

import os
import json
import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.models import Speaker
from app.utils.video_utils import extract_frames, generate_thumbnail
import cv2
import numpy as np
from collections import defaultdict
import torch
from sklearn.manifold import TSNE
import umap
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pickle

logger = logging.getLogger(__name__)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# Global YOLO and ReID models
yolo_model = None
reid_model = None
reid_device = 'cuda' if torch.cuda.is_available() else 'cpu'

# Global scaler and pca for runtime use
scaler = None
pca = None

def get_yolo_model():
    global yolo_model
    if yolo_model is None:
        from ultralytics import YOLO
        logger.info("Loading YOLOv5 model...")
        model_path = os.path.join(CURRENT_DIR, '..', '..', 'yolov5su.pt')
        model_path = os.path.abspath(model_path)
        if not os.path.isfile(model_path):
            logger.error(f"YOLOv5 model file not found at {model_path}")
            raise RuntimeError(f"Unable to open YOLOv5 model file at {model_path}")
        yolo_model = YOLO(model_path)
        logger.info("YOLOv5 model loaded successfully.")
    return yolo_model

def load_reid_model():
    global reid_model
    if reid_model is None:
        logger.info("Loading Re-ID model...")
        import torchreid
        reid_model = torchreid.models.build_model(
            name='osnet_x1_0',
            num_classes=1000,
            pretrained=True
        )
        reid_model.eval()
        reid_model.to(reid_device)
        logger.info("Re-ID model loaded successfully.")
    return reid_model

def get_reid_embedding(person_img_rgb: np.ndarray) -> np.ndarray:
    model = load_reid_model()
    import torch
    from torchreid.data import transforms as T

    height, width = 256, 128
    transforms = T.build_transforms(height=height, width=width, random_erase=False)[1]
    from PIL import Image
    pil_img = Image.fromarray(person_img_rgb)
    img_t = transforms(pil_img)
    img_t = img_t.unsqueeze(0).to(reid_device)

    with torch.no_grad():
        features = model(img_t)
    emb = features.cpu().numpy().flatten()
    return emb

def visualize_embeddings(embeddings, labels, output_path='embeddings_tsne.png'):
    tsne = TSNE(n_components=2, random_state=42)
    embeddings_2d = tsne.fit_transform(embeddings)
    plt.figure(figsize=(10, 8))
    scatter = plt.scatter(embeddings_2d[:, 0], embeddings_2d[:, 1], c=labels, cmap='jet', alpha=0.7)
    plt.colorbar(scatter, label='Cluster Label')
    plt.title('t-SNE Visualization of Re-ID Embeddings')
    plt.savefig(output_path)
    plt.close()
    logger.info(f"t-SNE visualization saved at {output_path}")

def visualize_embeddings_umap(embeddings, labels, output_path='embeddings_umap.png'):
    reducer = umap.UMAP(n_components=2, random_state=42)
    embeddings_2d = reducer.fit_transform(embeddings)
    plt.figure(figsize=(10, 8))
    scatter = plt.scatter(embeddings_2d[:, 0], embeddings_2d[:, 1], c=labels, cmap='jet', alpha=0.7)
    plt.colorbar(scatter, label='Cluster Label')
    plt.title('UMAP Visualization of Re-ID Embeddings')
    plt.savefig(output_path)
    plt.close()
    logger.info(f"UMAP visualization saved at {output_path}")

def merge_clusters(X, labels, distance_threshold=0.5):
    from scipy.spatial.distance import euclidean
    unique_labels = set(labels)
    if -1 in unique_labels:
        unique_labels.remove(-1)
    cluster_centroids = {}
    for label in unique_labels:
        cluster_points = X[labels == label]
        cluster_centroids[label] = cluster_points.mean(axis=0)

    merged_labels = labels.copy()
    for label1, centroid1 in cluster_centroids.items():
        for label2, centroid2 in cluster_centroids.items():
            if label1 < label2 and euclidean(centroid1, centroid2) < distance_threshold:
                merged_labels[labels == label2] = label1
    return merged_labels

def detect_unique_people(file_path: str, frame_skip: int = 25):
    logger.info(f"detect_unique_people called with {file_path}, frame_skip={frame_skip}")
    from app.utils.video_utils import ffprobe_info
    ffprobe_info(file_path, label="face_detection start")
    
    global scaler, pca
    logger.info(f"Starting person detection for file {file_path} with frame_skip={frame_skip}.")
    model = get_yolo_model()
    frames = extract_frames(file_path, frame_skip=frame_skip)
    logger.info(f"Extracted {len(frames)} frames from the video.")

    if not frames:
        logger.warning("No frames extracted. Returning 0 unique people.")
        return 0, None, None, None

    embeddings = []
    person_images = []

    debug_frames_dir = "debug_frames"
    os.makedirs(debug_frames_dir, exist_ok=True)
    debug_clusters_dir = "debug_clusters"
    os.makedirs(debug_clusters_dir, exist_ok=True)

    for idx, frame in enumerate(frames, start=1):
        logger.debug(f"Processing frame {idx}/{len(frames)}.")
        results = model(frame)
        detections = results[0].boxes

        img_with_boxes = frame.copy()
        for det in detections:
            if int(det.cls) == 0:
                x1, y1, x2, y2 = map(int, det.xyxy[0].tolist())
                cv2.rectangle(img_with_boxes, (x1, y1), (x2, y2), (0, 255, 0), 2)

        cv2.imwrite(os.path.join(debug_frames_dir, f"frame_{idx}.jpg"),
                    cv2.cvtColor(img_with_boxes, cv2.COLOR_RGB2BGR))

        for det in detections:
            if int(det.cls) == 0:
                x1, y1, x2, y2 = map(int, det.xyxy[0].tolist())
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(frame.shape[1], x2), min(frame.shape[0], y2)
                person_img = frame[y1:y2, x1:x2]
                if person_img.size == 0:
                    continue
                emb = get_reid_embedding(person_img)
                if emb is not None:
                    embeddings.append(emb)
                    person_images.append(person_img)

    if not embeddings:
        logger.warning("No embeddings extracted. Possibly no people detected.")
        return 0, None, None, None

    norms = np.linalg.norm(embeddings, axis=1)
    logger.info(f"Embedding norms: min={norms.min()}, max={norms.max()}, mean={norms.mean()}")

    from sklearn.preprocessing import StandardScaler
    from sklearn.decomposition import PCA
    import hdbscan

    # Fit scaler and pca on embeddings
    X = np.array(embeddings)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    pca = PCA(n_components=20)
    X_reduced = pca.fit_transform(X_scaled)

    clustering = hdbscan.HDBSCAN(min_cluster_size=15, min_samples=7, metric='euclidean')
    labels = clustering.fit_predict(X_reduced)

    labels = merge_clusters(X_reduced, labels, distance_threshold=0.5)
    num_unique_people = len(set(labels)) - (1 if -1 in labels else 0)
    logger.info(f"Number of unique individuals identified: {num_unique_people}")

    for i, (img, lbl) in enumerate(zip(person_images, labels)):
        out_dir = os.path.join(debug_clusters_dir, f"cluster_{lbl}")
        os.makedirs(out_dir, exist_ok=True)
        cv2.imwrite(os.path.join(out_dir, f"person_{i}.jpg"),
                    cv2.cvtColor(img, cv2.COLOR_RGB2BGR))

    visualize_embeddings(X_reduced, labels, output_path='debug_embeddings_tsne.png')
    visualize_embeddings_umap(X_reduced, labels, output_path='debug_embeddings_umap.png')

    from sklearn.metrics import silhouette_score, davies_bouldin_score
    silhouette = silhouette_score(X_reduced, labels)
    db_index = davies_bouldin_score(X_reduced, labels)
    logger.info(f"Silhouette Score: {silhouette}")
    logger.info(f"Davies-Bouldin Index: {db_index}")

    # We return processed embeddings (X_reduced) which match what we stored
    return num_unique_people, labels, X_reduced, person_images

def detect_and_store_speakers(video_id: int, file_path: str, db: Session, frame_skip: int = 25):
    try:
        num_people, labels, processed_embeddings, person_images = detect_unique_people(file_path, frame_skip=frame_skip)
        logger.info(f"For video_id={video_id}, detected {num_people} unique individuals.")

        if labels is not None:
            # Save scaler and PCA for this video
            models_dir = os.path.join("app", "models", str(video_id))
            os.makedirs(models_dir, exist_ok=True)
            
            with open(os.path.join(models_dir, 'scaler.pkl'), 'wb') as f:
                pickle.dump(scaler, f)
            with open(os.path.join(models_dir, 'pca.pkl'), 'wb') as f:
                pickle.dump(pca, f)
            
            logger.info(f"Saved scaler and PCA models for video_id={video_id}")

            valid_indices = [i for i, label in enumerate(labels) if label != -1]
            unique_labels = set(label for label in labels if label != -1)
            logger.info(f"Valid clusters after excluding noise: {unique_labels}")

            label_to_indices = defaultdict(list)
            for idx in valid_indices:
                label_to_indices[labels[idx]].append(idx)

            for label in unique_labels:
                representative_idx = label_to_indices[label][0]
                representative_embedding = processed_embeddings[representative_idx]
                representative_image = person_images[representative_idx]

                thumbnail_path = generate_thumbnail(representative_image, video_id, speaker_id=label)
                logger.info(f"Thumbnail path stored in DB: {thumbnail_path}")

                speaker = Speaker(
                    video_id=video_id,
                    unique_speaker_id=int(label),
                    embedding=json.dumps(representative_embedding.tolist()),
                    thumbnail_path=thumbnail_path
                )
                db.add(speaker)

            db.commit()
            logger.info(f"Stored {len(unique_labels)} speakers in the database for video_id={video_id}.")
        else:
            logger.warning(f"No valid labels found for video_id={video_id}.")

    except Exception as e:
        logger.error(f"Error in detect_and_store_speakers for video ID {video_id}: {e}")
        db.rollback()
        raise e
    finally:
        db.close()