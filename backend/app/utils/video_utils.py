# backend/app/utils/video_utils.py

import os
import cv2
import numpy as np
from PIL import Image
from moviepy.editor import VideoFileClip, ImageSequenceClip
import logging
from datetime import datetime
import subprocess

logger = logging.getLogger(__name__)

def ffprobe_info(video_path: str, label: str = ""):
    """Run ffprobe on the given video_path and log details."""
    try:
        cmd = [
            "ffprobe", "-v", "error", "-select_streams", "v:0", 
            "-show_entries", "stream=width,height,duration,nb_frames,r_frame_rate",
            "-of", "default=noprint_wrappers=1", video_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        logger.info(f"ffprobe [{label}] for {video_path}:\n{result.stdout}")
    except Exception as e:
        logger.error(f"Error running ffprobe [{label}] on {video_path}: {e}")

def extract_frames(video_path: str, frame_skip: int = 30) -> list:
    logger.info(f"extract_frames called with video={video_path}, frame_skip={frame_skip}")
    ffprobe_info(video_path, label="before extraction")

    frames = []
    try:
        vidcap = cv2.VideoCapture(video_path)
        if not vidcap.isOpened():
            logger.error(f"Cannot open video file {video_path}")
            raise IOError(f"Cannot open video file {video_path}")

        total_frames = int(vidcap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = vidcap.get(cv2.CAP_PROP_FPS)
        logger.info(f"Video {video_path} has {total_frames} frames at {fps} FPS")

        frame_count = 0
        success, image = vidcap.read()
        
        while success:
            rgb_frame = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            frames.append(rgb_frame)
            
            if frame_skip > 1:
                for _ in range(frame_skip - 1):
                    success, _ = vidcap.read()
                    frame_count += 1
                    if not success:
                        break
            
            success, image = vidcap.read()
            frame_count += 1

        vidcap.release()
        logger.info(f"Extracted {len(frames)} frames from {video_path}. frame_skip={frame_skip}")
        return frames

    except Exception as e:
        logger.error(f"Error extracting frames from {video_path}: {e}")
        raise e

def get_frame_at_time(video_path: str, time_sec: float) -> np.ndarray:
    vidcap = cv2.VideoCapture(video_path)
    vidcap.set(cv2.CAP_PROP_POS_MSEC, time_sec * 1000)
    success, image = vidcap.read()
    if success:
        return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    return None

def generate_thumbnail(face_image: np.ndarray, video_id: int, speaker_id: int = None) -> str:
    try:
        thumbnail_size = (128, 128)
        pil_image = Image.fromarray(face_image)
        pil_image.thumbnail(thumbnail_size)
        thumbnail_dir = os.path.join("app", "thumbnails", str(video_id))
        os.makedirs(thumbnail_dir, exist_ok=True)
        logger.info(f"Thumbnail directory set to {thumbnail_dir}")

        if speaker_id is not None:
            thumbnail_filename = f"speaker_{speaker_id}.png"
        else:
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
            thumbnail_filename = f"speaker_{timestamp}.png"

        thumbnail_path = os.path.join(thumbnail_dir, thumbnail_filename)
        pil_image.save(thumbnail_path, format='PNG')
        logger.info(f"Thumbnail saved at {thumbnail_path}")
        relative_thumbnail_path = os.path.join(str(video_id), thumbnail_filename)
        logger.info(f"Thumbnail relative path: {relative_thumbnail_path}")
        return relative_thumbnail_path

    except Exception as e:
        logger.error(f"Error generating thumbnail for video_id={video_id}, speaker_id={speaker_id}: {e}")
        raise e

def compile_video_with_audio(original_video_path: str, processed_frames: list, fps: float = None) -> str:
    try:
        logger.info(f"compile_video_with_audio called with {len(processed_frames)} frames and fps={fps}")
        ffprobe_info(original_video_path, label="original before compile")

        original_clip = VideoFileClip(original_video_path)
        original_duration = original_clip.duration
        original_fps = original_clip.fps
        logger.info(f"Original video ({original_video_path}) properties:")
        logger.info(f"- Duration: {original_duration:.2f} seconds")
        logger.info(f"- FPS: {original_fps}")

        output_path = original_video_path.rsplit('.', 1)[0] + '_processed.mp4'

        # If fps is None or calculated, fallback to original_fps from the original clip
        final_fps = fps or original_fps
        logger.info(f"Using final_fps={final_fps:.4f} for output video.")

        clip = ImageSequenceClip(processed_frames, fps=final_fps)
        final_clip = clip.set_audio(original_clip.audio)

        logger.info(f"Writing final video to {output_path}...")
        final_clip.write_videofile(output_path, codec='libx264', audio_codec='aac', fps=final_fps)

        clip.close()
        final_clip.close()
        original_clip.close()

        ffprobe_info(output_path, label="final after compile")

        return output_path

    except Exception as e:
        logger.error(f"Error in compile_video_with_audio: {e}")
        return None

def determine_layout(num_speakers: int) -> dict:
    if num_speakers == 0:
        return {
            'width': 1080,
            'height': 1920,
            'grid': [(0, 0, 1080, 1920)]
        }
    
    return {
        'width': 1080,
        'height': 1920,
        'grid': {
            1: [(0, 0, 1080, 1920)],
            2: [(0, 0, 1080, 960), (0, 960, 1080, 1920)],
            3: [(0, 0, 540, 960), (540, 0, 1080, 960), (0, 960, 1080, 1920)],
            4: [(0, 0, 540, 960), (540, 0, 1080, 960), (0, 960, 540, 1920), (540, 960, 1080, 1920)]
        }[min(num_speakers, 4)]
    }

#def apply_layout_to_frame(frame: np.ndarray, identified_speakers: list, layout_config: dict) -> np.ndarray:
#    """Apply layout to frame with identified speakers"""
#    try:
#        out_w = layout_config['width']
#        out_h = layout_config['height']
#        canvas = np.zeros((out_h, out_w, 3), dtype=np.uint8)
#
#        def fit_to_canvas(img, target_w, target_h):
#            h, w = img.shape[:2]
#            scale = min(target_w/w, target_h/h)
#            new_w, new_h = int(w*scale), int(h*scale)
#            return cv2.resize(img, (new_w, new_h))
#
#        grid = layout_config.get('grid', [])
#        if not grid:
#            # If no grid specified, single layout
#            fitted = fit_to_canvas(frame, out_w, out_h)
#            fh, fw = fitted.shape[:2]
#            start_x = (out_w - fw) // 2
#            start_y = (out_h - fh) // 2
#            canvas[start_y:start_y+fh, start_x:start_x+fw] = fitted
#            return canvas
#
#        # If we have a grid, assume identified_speakers <= len(grid)
#        for i, (speaker_id, (x1, y1, x2, y2)) in enumerate(identified_speakers[:len(grid)]):
#            speaker_img = frame[y1:y2, x1:x2]
#            if speaker_img.size == 0:
#                logger.warning(f"Speaker ID {speaker_id} has empty image. Skipping.")
#                continue
#            gx1, gy1, gx2, gy2 = grid[i]
#            region_w = gx2 - gx1
#            region_h = gy2 - gy1
#            fitted = fit_to_canvas(speaker_img, region_w, region_h)
#            fh, fw, _ = fitted.shape
#            start_x = gx1 + (region_w - fw) // 2
#            start_y = gy1 + (region_h - fh) // 2
#            canvas[start_y:start_y+fh, start_x:start_x+fw] = fitted
#            logger.debug(f"Speaker ID {speaker_id} placed at grid position {i} ({start_x},{start_y}) size {fw}x{fh}")
#
#        return canvas
#
#    except Exception as e:
#        logger.error(f"Error in apply_layout_to_frame: {e}")
#        return frame  # Return original frame on error

def apply_layout_to_frame(frame: np.ndarray, identified_speakers: list, layout_config: dict) -> np.ndarray:
    """Apply layout to frame with identified speakers"""
    try:
        out_w = layout_config['width']
        out_h = layout_config['height']
        canvas = np.zeros((out_h, out_w, 3), dtype=np.uint8)

        def fit_to_canvas(img, target_w, target_h, orig_coords):
            # Get original face region dimensions
            orig_x1, orig_y1, orig_x2, orig_y2 = orig_coords
            face_h, face_w = img.shape[:2]
            
            # Add significant padding around the face (150% on each side)
            pad_x = int(face_w * 1.5)
            pad_y = int(face_h * 1.5)
            
            # Calculate padded coordinates while keeping face centered
            pad_y1 = max(0, orig_y1 - pad_y)
            pad_y2 = min(frame.shape[0], orig_y2 + pad_y)
            pad_x1 = max(0, orig_x1 - pad_x)
            pad_x2 = min(frame.shape[1], orig_x2 + pad_x)
            
            # Extract the padded region
            padded_img = frame[pad_y1:pad_y2, pad_x1:pad_x2]
            if padded_img.size == 0:
                return img
            
            # Scale to fill the target area completely
            h, w = padded_img.shape[:2]
            # Use max instead of min to ensure we fill the entire space
            scale = max(target_w/w, target_h/h)
            new_w = int(w * scale)
            new_h = int(h * scale)
            resized = cv2.resize(padded_img, (new_w, new_h))
            
            # Center and crop to target size
            start_y = (new_h - target_h) // 2
            start_x = (new_w - target_w) // 2
            end_y = start_y + target_h
            end_x = start_x + target_w
            
            # Ensure we don't exceed the resized image dimensions
            start_y = max(0, min(start_y, new_h - target_h))
            start_x = max(0, min(start_x, new_w - target_w))
            end_y = min(new_h, start_y + target_h)
            end_x = min(new_w, start_x + target_w)
            
            cropped = resized[start_y:end_y, start_x:end_x]
            
            # Final resize to ensure exact target dimensions
            if cropped.shape[:2] != (target_h, target_w):
                cropped = cv2.resize(cropped, (target_w, target_h))
            
            return cropped

        grid = layout_config.get('grid', [])
        if not grid:
            # Single layout
            fitted = fit_to_canvas(frame, out_w, out_h, (0, 0, frame.shape[1], frame.shape[0]))
            canvas = fitted  # Direct assignment since it's already the right size
            return canvas

        # Multiple speakers
        for i, (speaker_id, (x1, y1, x2, y2)) in enumerate(identified_speakers[:len(grid)]):
            speaker_img = frame[y1:y2, x1:x2]
            if speaker_img.size == 0:
                logger.warning(f"Speaker ID {speaker_id} has empty image. Skipping.")
                continue
            
            gx1, gy1, gx2, gy2 = grid[i]
            region_w = gx2 - gx1
            region_h = gy2 - gy1
            
            # Fit the image to exactly fill the grid region
            fitted = fit_to_canvas(speaker_img, region_w, region_h, (x1, y1, x2, y2))
            canvas[gy1:gy2, gx1:gx2] = fitted

        return canvas

    except Exception as e:
        logger.error(f"Error in apply_layout_to_frame: {e}")
        return frame