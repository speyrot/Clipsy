# backend/app/services/layout_determination.py

def determine_layout(num_speakers: int):
    """
    Determines the layout for a scene based on the number of relevant speakers.

    Args:
        num_speakers (int): The number of relevant speakers detected in the scene.

    Returns:
        str: The layout type ('single', 'split_screen', 'grid').
    """
    if num_speakers == 1:
        return "single"
    elif num_speakers == 2:
        return "split_screen"
    else:
        return "grid"

def get_scene_layouts(scenes: list, speakers_per_scene: dict, selected_speakers: list):
    """
    Determines layouts for each scene based on relevant speakers.

    Args:
        scenes (list): List of scene timestamps or scene data.
        speakers_per_scene (dict): A dictionary where keys are scene identifiers and values are lists of detected speakers.
        selected_speakers (list): A list of selected speaker IDs relevant to the user.

    Returns:
        dict: A dictionary mapping scene identifiers to layout types.
    """
    scene_layouts = {}
    
    for scene in scenes:
        # Filter the speakers in the scene to only those relevant (selected by the user)
        relevant_speakers = [speaker for speaker in speakers_per_scene.get(scene, []) if speaker in selected_speakers]
        num_speakers = len(relevant_speakers)
        
        # Determine layout for the scene
        layout = determine_layout(num_speakers)
        scene_layouts[scene] = layout
    
    return scene_layouts
