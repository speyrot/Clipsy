# backend/app/utils/video_utils.py

import os
import cv2
import numpy as np
from PIL import Image
from moviepy.editor import VideoFileClip, ImageSequenceClip
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def extract_frames(video_path: str, frame_skip: int = 30) -> list:
    frames = []
    try:
        vidcap = cv2.VideoCapture(video_path)
        if not vidcap.isOpened():
            logger.error(f"Cannot open video file {video_path}")
            raise IOError(f"Cannot open video file {video_path}")

        # Get total frame count using cv2
        total_frames = int(vidcap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = vidcap.get(cv2.CAP_PROP_FPS)
        logger.info(f"Video has {total_frames} frames at {fps} FPS")

        frame_count = 0
        success, image = vidcap.read()
        
        while success:
            rgb_frame = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            frames.append(rgb_frame)
            
            # Skip frames only if frame_skip > 1
            if frame_skip > 1:
                for _ in range(frame_skip - 1):
                    success, _ = vidcap.read()
                    frame_count += 1
                    if not success:
                        break
            
            success, image = vidcap.read()
            frame_count += 1

        vidcap.release()
        logger.info(f"Extracted {len(frames)} frames from {video_path}")
        return frames

    except Exception as e:
        logger.error(f"Error extracting frames from {video_path}: {e}")
        raise e

def get_frame_at_time(video_path: str, time_sec: float) -> np.ndarray:
    try:
        vidcap = cv2.VideoCapture(video_path)
        if not vidcap.isOpened():
            logger.error(f"Cannot open video file {video_path}")
            raise IOError(f"Cannot open video file {video_path}")
        fps = vidcap.get(cv2.CAP_PROP_FPS)
        frame_number = int(fps * time_sec)
        vidcap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        success, image = vidcap.read()
        if not success:
            logger.warning(f"Could not read frame at {time_sec}s in {video_path}.")
            vidcap.release()
            return None

        rgb_frame = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        vidcap.release()
        return rgb_frame

    except Exception as e:
        logger.error(f"Error getting frame at time {time_sec} from {video_path}: {e}")
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

def apply_layout_to_frame(frame: np.ndarray, identified_speakers: list, layout_config: dict) -> np.ndarray:
    num_speakers = len(identified_speakers)
    out_w = layout_config['width']
    out_h = layout_config['height']

    canvas = np.zeros((out_h, out_w, 3), dtype=np.uint8)

    def fit_to_canvas(img, max_w, max_h):
        h, w, _ = img.shape
        scale_w = max_w / w
        scale_h = max_h / h
        scale = min(scale_w, scale_h)
        new_w = int(w * scale)
        new_h = int(h * scale)
        if new_w < 1 or new_h < 1:
            logger.warning(f"fit_to_canvas produced invalid size: new_w={new_w}, new_h={new_h}. Using at least 1x1.")
            new_w = max(1, new_w)
            new_h = max(1, new_h)
        return cv2.resize(img, (new_w, new_h))

    logger.debug(f"Applying layout for {num_speakers} speakers.")

    if num_speakers == 0:
        # No selected speakers: Show the entire original frame scaled to fit the 9:16 canvas.
        fitted = fit_to_canvas(frame, out_w, out_h)
        fh, fw, _ = fitted.shape
        # Place it centered
        start_x = (out_w - fw) // 2
        start_y = (out_h - fh) // 2
        canvas[:] = 0  # reset just in case
        canvas[start_y:start_y+fh, start_x:start_x+fw] = fitted
        logger.debug(f"No speakers. Placed original frame scaled at ({start_x},{start_y}) size {fw}x{fh}")
        # Debug check a pixel
        logger.debug(f"Top-left pixel of canvas: {canvas[0,0]}, center pixel: {canvas[out_h//2, out_w//2]}")
        return canvas

    elif num_speakers == 1:
        speaker_id, (x1, y1, x2, y2) = identified_speakers[0]
        speaker_img = frame[y1:y2, x1:x2]
        if speaker_img.size == 0:
            logger.warning(f"Speaker ID {speaker_id} has empty image. Skipping.")
            return canvas
        fitted = fit_to_canvas(speaker_img, out_w, out_h)
        fh, fw, _ = fitted.shape
        start_x = (out_w - fw) // 2
        start_y = (out_h - fh) // 2
        canvas[start_y:start_y+fh, start_x:start_x+fw] = fitted
        logger.debug(f"One speaker. Placed speaker ID {speaker_id} scaled at ({start_x},{start_y}) size {fw}x{fh}")
        return canvas

    elif num_speakers == 2:
        half_h = out_h // 2
        for i, (speaker_id, (x1, y1, x2, y2)) in enumerate(identified_speakers[:2]):
            speaker_img = frame[y1:y2, x1:x2]
            if speaker_img.size == 0:
                logger.warning(f"Speaker ID {speaker_id} has empty image. Skipping.")
                continue
            fitted = fit_to_canvas(speaker_img, out_w, half_h)
            fh, fw, _ = fitted.shape
            start_x = (out_w - fw) // 2
            start_y = i * half_h + (half_h - fh) // 2
            canvas[start_y:start_y+fh, start_x:start_x+fw] = fitted
            logger.debug(f"Speaker ID {speaker_id} placed at ({start_x},{start_y}) size {fw}x{fh}")
        return canvas

    elif num_speakers == 3:
        top_h = out_h // 2
        half_w = out_w // 2
        # first two on top, third on bottom
        for i in range(2):
            speaker_id, (x1, y1, x2, y2) = identified_speakers[i]
            speaker_img = frame[y1:y2, x1:x2]
            if speaker_img.size == 0:
                logger.warning(f"Speaker ID {speaker_id} has empty image. Skipping.")
                continue
            fitted = fit_to_canvas(speaker_img, half_w, top_h)
            fh, fw, _ = fitted.shape
            start_x = i * half_w + (half_w - fw) // 2
            start_y = (top_h - fh) // 2
            canvas[start_y:start_y+fh, start_x:start_x+fw] = fitted
            logger.debug(f"Speaker ID {speaker_id} placed at top ({start_x},{start_y}) size {fw}x{fh}")

        # bottom
        speaker_id, (x1, y1, x2, y2) = identified_speakers[2]
        speaker_img = frame[y1:y2, x1:x2]
        if speaker_img.size > 0:
            fitted = fit_to_canvas(speaker_img, out_w, out_h - top_h)
            fh, fw, _ = fitted.shape
            start_x = (out_w - fw) // 2
            start_y = top_h + (out_h - top_h - fh) // 2
            canvas[start_y:start_y+fh, start_x:start_x+fw] = fitted
            logger.debug(f"Speaker ID {speaker_id} placed at bottom ({start_x},{start_y}) size {fw}x{fh}")
        return canvas

    else:
        # 2x2 grid for first 4 speakers
        half_w = out_w // 2
        half_h = out_h // 2
        for i, (speaker_id, (x1, y1, x2, y2)) in enumerate(identified_speakers[:4]):
            speaker_img = frame[y1:y2, x1:x2]
            if speaker_img.size == 0:
                logger.warning(f"Speaker ID {speaker_id} has empty image. Skipping.")
                continue
            fitted = fit_to_canvas(speaker_img, half_w, half_h)
            fh, fw, _ = fitted.shape
            start_x = (i % 2) * half_w + (half_w - fw) // 2
            start_y = (i // 2) * half_h + (half_h - fh) // 2
            canvas[start_y:start_y+fh, start_x:start_x+fw] = fitted
            logger.debug(f"Speaker ID {speaker_id} placed at grid position {i} ({start_x},{start_y}) size {fw}x{fh}")
        return canvas

def compile_video_with_audio(original_video_path: str, processed_frames: list, fps: float = None) -> str:
    try:
        # Get original video properties if fps not provided
        if fps is None:
            original_clip = VideoFileClip(original_video_path)
            fps = original_clip.fps
            original_clip.close()

        # Create output path
        output_path = original_video_path.rsplit('.', 1)[0] + '_processed.mp4'
        
        # Create video clip from processed frames
        clip = ImageSequenceClip(processed_frames, fps=fps)
        
        # Add audio from original video
        original_audio = VideoFileClip(original_video_path).audio
        final_clip = clip.set_audio(original_audio)
        
        # Write video
        final_clip.write_videofile(output_path, codec='libx264', audio_codec='aac')
        
        # Clean up
        clip.close()
        final_clip.close()
        original_audio.close()
        
        return output_path

    except Exception as e:
        logger.error(f"Error in compile_video_with_audio: {e}")
        return None

def determine_layout(num_speakers: int) -> dict:
    return {
        'width': 1080,
        'height': 1920,
        'grid': {
            1: [(0, 0, 1080, 1920)],  # Full frame
            2: [(0, 0, 1080, 960),    # Top
                (0, 960, 1080, 1920)], # Bottom
            3: [(0, 0, 540, 960),     # Top left
                (540, 0, 1080, 960),  # Top right
                (0, 960, 1080, 1920)], # Bottom
            4: [(0, 0, 540, 960),     # Top left
                (540, 0, 1080, 960),  # Top right
                (0, 960, 540, 1920),  # Bottom left
                (540, 960, 1080, 1920)] # Bottom right
        }[min(num_speakers, 4)]
    }