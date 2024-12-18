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
import pickle
from insightface.app import FaceAnalysis
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import hdbscan

logger = logging.getLogger(__name__)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# Global variables for face detection
face_detector = None

# scaler and pca are used for embedding normalization and dimensionality reduction
scaler = None
pca = None

def load_face_detector():
    global face_detector
    if face_detector is not None:
        return face_detector

    try:
        logger.info("Loading buffalo_l face detector from InsightFace...")
        face_detector = FaceAnalysis(
            name='buffalo_l',
            providers=['CPUExecutionProvider'],
            allowed_modules=['detection', 'recognition']
        )
        # Lower detection threshold and increase detection size
        face_detector.prepare(ctx_id=0, det_thresh=0.5, det_size=(640,640))
        logger.info("buffalo_l face pipeline loaded successfully.")
        return face_detector
    except Exception as e:
        logger.error(f"Failed to load face detector: {e}", exc_info=True)
        raise e

def visualize_embeddings(embeddings, labels, output_path='embeddings_tsne.png'):
    """
    Generates a t-SNE visualization of the face embeddings.
    """
    from sklearn.manifold import TSNE
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import matplotlib.pyplot as plt
    
    tsne = TSNE(n_components=2, random_state=42)
    embeddings_2d = tsne.fit_transform(embeddings)
    plt.figure(figsize=(10, 8))
    scatter = plt.scatter(embeddings_2d[:, 0], embeddings_2d[:, 1], c=labels, cmap='jet', alpha=0.7)
    plt.colorbar(scatter, label='Cluster Label')
    plt.title('t-SNE Visualization of Face Embeddings')
    plt.savefig(output_path)
    plt.close()
    logger.info(f"t-SNE visualization saved at {output_path}")

def visualize_embeddings_umap(embeddings, labels, output_path='embeddings_umap.png'):
    """
    Generates a UMAP visualization of the face embeddings.
    """
    import umap
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import matplotlib.pyplot as plt

    reducer = umap.UMAP(n_components=2, random_state=42)
    embeddings_2d = reducer.fit_transform(embeddings)
    plt.figure(figsize=(10, 8))
    scatter = plt.scatter(embeddings_2d[:, 0], embeddings_2d[:, 1], c=labels, cmap='jet', alpha=0.7)
    plt.colorbar(scatter, label='Cluster Label')
    plt.title('UMAP Visualization of Face Embeddings')
    plt.savefig(output_path)
    plt.close()
    logger.info(f"UMAP visualization saved at {output_path}")

def merge_clusters(X, labels, distance_threshold=0.5):
    """
    Merges clusters that are within a specified Euclidean distance threshold.
    """
    from scipy.spatial.distance import euclidean
    unique_labels = set(labels)
    if -1 in unique_labels:
        unique_labels.remove(-1)  # Remove noise label
    cluster_centroids = {}
    for label in unique_labels:
        cluster_points = X[labels == label]
        cluster_centroids[label] = cluster_points.mean(axis=0)

    merged_labels = labels.copy()
    for label1, centroid1 in cluster_centroids.items():
        for label2, centroid2 in cluster_centroids.items():
            if label1 < label2 and euclidean(centroid1, centroid2) < distance_threshold:
                merged_labels[labels == label2] = label1
                logger.debug(f"Merging cluster {label2} into cluster {label1}")
    return merged_labels

def detect_unique_people(file_path: str, frame_skip: int = 25):
    global scaler, pca
    
    logger.info(f"detect_unique_people called with {file_path}, frame_skip={frame_skip}")
    from app.utils.video_utils import ffprobe_info
    ffprobe_info(file_path, label="face_detection start")

    logger.info(f"Starting face-based person detection for file {file_path} with frame_skip={frame_skip}.")
    frames = extract_frames(file_path, frame_skip=frame_skip)
    logger.info(f"Extracted {len(frames)} frames from the video.")

    if not frames:
        logger.warning("No frames extracted. Returning 0 unique people.")
        return 0, None, None, None

    detector = load_face_detector()
    embeddings = []
    face_images = []
    face_tracking = []  # Add this line to track faces per frame

    for idx, frame in enumerate(frames, start=1):
        try:
            # Get face detections
            faces = detector.get(frame)
            logger.info(f"Frame {idx}: Found {len(faces)} faces")
            
            # Track faces in this frame
            frame_faces = []  # Add this line
            
            for face_idx, face in enumerate(faces):
                try:
                    # Get bounding box
                    bbox = face.bbox.astype(int)
                    x1, y1, x2, y2 = bbox

                    # Skip faces that are too small
                    face_width = x2 - x1
                    face_height = y2 - y1
                    if face_width < 60 or face_height < 60:
                        logger.warning(f"Frame {idx}: Skipping small face {face_idx}: {face_width}x{face_height}")
                        continue

                    # Add padding around face
                    padding = int(min(face_width, face_height) * 0.2)
                    x1 = max(0, x1 - padding)
                    y1 = max(0, y1 - padding)
                    x2 = min(frame.shape[1], x2 + padding)
                    y2 = min(frame.shape[0], y2 + padding)

                    # Extract face region directly
                    face_img = frame[y1:y2, x1:x2]
                    
                    # Resize to a standard size
                    face_img = cv2.resize(face_img, (112, 112))

                    # Get embedding directly from the detector
                    if hasattr(face, 'embedding') and face.embedding is not None:
                        embedding = face.embedding
                        embeddings.append(embedding)
                        face_images.append(face_img)
                        frame_faces.append(face)  # Add this line
                        logger.info(f"Frame {idx}: Successfully processed face {face_idx}")
                    else:
                        logger.warning(f"Frame {idx}: No embedding available for face {face_idx}")

                except Exception as e:
                    logger.error(f"Error processing face {face_idx} in frame {idx}: {e}")
                    continue
            
            face_tracking.append(frame_faces)  # Add this line

        except Exception as e:
            logger.error(f"Error processing frame {idx}: {e}")
            continue

    if not embeddings:
        logger.warning("No face embeddings extracted. Possibly no faces detected.")
        return 0, None, None, None

    # Convert embeddings to numpy array
    embeddings = np.array(embeddings)
    frame_indices = []  # Track which frame each embedding came from
    
    # Track temporal information
    for idx, frame_faces in enumerate(face_tracking):
        for _ in range(len(frame_faces)):
            frame_indices.append(idx)
    
    # Normalize embeddings
    norms = np.linalg.norm(embeddings, axis=1)
    logger.info(f"Embedding norms: min={norms.min()}, max={norms.max()}, mean={norms.mean()}")

    # Scale and reduce dimensionality
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(embeddings)

    pca = PCA(n_components=min(20, len(embeddings)))
    X_reduced = pca.fit_transform(X_scaled)

    # Add temporal information to feature space with reduced weight
    frame_info = np.array(frame_indices).reshape(-1, 1) / len(frames)
    X_with_temporal = np.hstack([X_reduced * 0.9, frame_info * 0.1])  # Reduce temporal weight even further

    # Initial clustering
    clustering = hdbscan.HDBSCAN(
        min_cluster_size=3,
        min_samples=2,
        metric='euclidean',
        cluster_selection_epsilon=0.8,
        prediction_data=True
    )
    labels = clustering.fit_predict(X_with_temporal)

    def get_cluster_similarities(emb1, emb2):
        """Calculate similarity metrics between two sets of embeddings"""
        from sklearn.metrics.pairwise import cosine_similarity

        # Safety check for empty clusters
        if len(emb1) == 0 or len(emb2) == 0:
            return 0.0, float('inf'), 0.0
            
        # Cosine similarity
        cos_sim = cosine_similarity(emb1, emb2).mean()
        
        # L2 distance normalized by dimensionality
        l2_dist = np.linalg.norm(np.mean(emb1, axis=0) - np.mean(emb2, axis=0)) / emb1.shape[1]
        
        # Distribution overlap
        mean1, std1 = np.mean(emb1, axis=0), np.std(emb1, axis=0)
        mean2, std2 = np.mean(emb2, axis=0), np.std(emb2, axis=0)
        dist_overlap = np.mean(np.abs(mean1 - mean2) < (std1 + std2))
        
        return cos_sim, l2_dist, dist_overlap

    # Post-process clusters with more robust merging
    unique_labels = set(labels)
    if -1 in unique_labels:
        unique_labels.remove(-1)
    
    final_labels = labels.copy()
    if len(unique_labels) > 0:
        # First pass: merge very similar clusters
        merged = set()
        while True:
            merged_any = False
            remaining_labels = [l for l in unique_labels if l not in merged]
            
            for label1 in remaining_labels:
                if label1 in merged:
                    continue
                    
                mask1 = final_labels == label1
                emb1 = embeddings[mask1]
                if len(emb1) == 0:
                    continue
                
                best_merge = None
                best_similarity = (0.0, float('inf'), 0.0)
                
                for label2 in remaining_labels:
                    if label2 <= label1:
                        continue
                        
                    mask2 = final_labels == label2
                    emb2 = embeddings[mask2]
                    if len(emb2) == 0:
                        continue
                    
                    cos_sim, l2_dist, dist_overlap = get_cluster_similarities(emb1, emb2)
                    
                    # Merge if meets criteria
                    if (cos_sim > 0.85 or  
                        (l2_dist < 0.5 and dist_overlap > 0.7) or
                        dist_overlap > 0.9):
                        if best_merge is None or cos_sim > best_similarity[0]:
                            best_merge = label2
                            best_similarity = (cos_sim, l2_dist, dist_overlap)
                
                if best_merge is not None:
                    final_labels[final_labels == best_merge] = label1
                    merged.add(best_merge)
                    merged_any = True
                    logger.info(f"Merged cluster {best_merge} into {label1} "
                              f"(cos_sim: {best_similarity[0]:.3f}, "
                              f"l2_dist: {best_similarity[1]:.3f}, "
                              f"dist_overlap: {best_similarity[2]:.3f})")
            
            if not merged_any:
                break

    # Get final number of unique people
    final_unique_labels = set(final_labels)
    if -1 in final_unique_labels:
        final_unique_labels.remove(-1)
    num_unique_people = len(final_unique_labels)

    logger.info(f"Number of unique individuals identified: {num_unique_people}")

    # Visualize results if needed
    visualize_embeddings(X_reduced, final_labels, output_path='debug_embeddings_tsne.png')
    visualize_embeddings_umap(X_reduced, final_labels, output_path='debug_embeddings_umap.png')

    return num_unique_people, final_labels, X_reduced, face_images

def detect_and_store_speakers(video_id: int, file_path: str, db: Session, frame_skip: int = 25):
    """
    Detects and stores unique speakers from a video file.

    Args:
        video_id (int): ID of the video in the database.
        file_path (str): Path to the video file.
        db (Session): SQLAlchemy database session.
        frame_skip (int, optional): Number of frames to skip between detections. Defaults to 25.
    """
    try:
        num_people, labels, processed_embeddings, face_images = detect_unique_people(file_path, frame_skip=frame_skip)
        logger.info(f"For video_id={video_id}, detected {num_people} unique individuals via face recognition.")

        if labels is not None and num_people > 0:
            # Save scaler and PCA for this video
            models_dir = os.path.join("app", "models", str(video_id))
            os.makedirs(models_dir, exist_ok=True)
            
            with open(os.path.join(models_dir, 'scaler.pkl'), 'wb') as f:
                pickle.dump(scaler, f)
            with open(os.path.join(models_dir, 'pca.pkl'), 'wb') as f:
                pickle.dump(pca, f)
            
            logger.info(f"Saved scaler and PCA models for video_id={video_id}")

            # Exclude noise labels (-1)
            valid_indices = [i for i, label in enumerate(labels) if label != -1]
            unique_labels = set(label for label in labels if label != -1)
            logger.info(f"Valid clusters after excluding noise: {unique_labels}")

            label_to_indices = defaultdict(list)
            for idx in valid_indices:
                label_to_indices[labels[idx]].append(idx)

            # Store the transformed embeddings
            for label in unique_labels:
                indices = label_to_indices[label]
                representative_idx = indices[0]
                
                # Get the raw embedding and transform it
                raw_embedding = processed_embeddings[representative_idx]  # This is already transformed
                
                representative_image = face_images[representative_idx]
                thumbnail_path = generate_thumbnail(representative_image, video_id, speaker_id=label)
                
                # Store the transformed embedding
                speaker = Speaker(
                    video_id=video_id,
                    unique_speaker_id=int(label),
                    embedding=json.dumps(raw_embedding.tolist()),  # Store the already transformed embedding
                    thumbnail_path=thumbnail_path
                )
                db.add(speaker)

            db.commit()
            logger.info(f"Stored {len(unique_labels)} speakers in the database for video_id={video_id}.")
        else:
            logger.warning(f"No valid labels found for video_id={video_id}.")

    except Exception as e:
        logger.error(f"Error in detect_and_store_speakers for video ID {video_id}: {e}", exc_info=True)
        db.rollback()
        raise e
    finally:
        db.close()
