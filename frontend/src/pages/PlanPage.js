// frontend/src/pages/PlanPage.js

import React, { useState, useEffect, Fragment } from 'react';
import {
  EllipsisVerticalIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import {
  Listbox,
  Transition,
  ListboxButton,
  ListboxOptions,
  ListboxOption
} from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

// DRAG & DROP from @hello-pangea/dnd
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const TAG_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-600' },
  { bg: 'bg-purple-100', text: 'text-purple-600' },
  { bg: 'bg-green-100', text: 'text-green-600' },
  { bg: 'bg-red-100', text: 'text-red-600' },
  { bg: 'bg-yellow-100', text: 'text-yellow-600' },
  { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  { bg: 'bg-pink-100', text: 'text-pink-600' },
  { bg: 'bg-teal-100', text: 'text-teal-600' },
  { bg: 'bg-orange-100', text: 'text-orange-600' },
  { bg: 'bg-cyan-100', text: 'text-cyan-600' },
];

function PlanPage() {
  // ---------------------------
  // 1. Local State
  // ---------------------------
  const [tasks, setTasks] = useState([]);            // All tasks
  const [showModal, setShowModal] = useState(false); // Controls the modal visibility

  // We'll default new tasks to 'idea'
  const [status, setStatus] = useState('unassigned');

  // For user-defined tags loaded from the backend
  const [userTags, setUserTags] = useState([]);  // e.g. [{id: 'feature', name: 'Feature'}]
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearch, setTagSearch] = useState('');

  // Filter UI for tasks (optional)
  const [selectedFilterTags, setSelectedFilterTags] = useState([]);
  const [filterTagSearch, setFilterTagSearch] = useState('');

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // For editing existing tasks
  const [isEditing, setIsEditing] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Columns -> must match DB enum values exactly
  const columns = [
    { title: 'Unassigned', status: 'unassigned' },
    { title: 'To-Do', status: 'todo' },
    { title: 'In Progress', status: 'in_progress' },
    { title: 'Done', status: 'done' },
  ];

  // Status dropdown => match DB enum values
  const statusOptions = [
    { id: 'unassigned', name: 'Unassigned' },
    { id: 'todo', name: 'To-Do' },
    { id: 'in_progress', name: 'In Progress' },
    { id: 'done', name: 'Done' },
  ];

  // Add this new state to track tag colors
  const [tagColors, setTagColors] = useState({});

  // Add this function to manage tag colors
  const getTagColor = (tagName) => {
    if (tagColors[tagName]) {
      return tagColors[tagName];
    }
    
    // Find unused color
    const usedColors = Object.values(tagColors);
    const availableColors = TAG_COLORS.filter(color => 
      !usedColors.some(used => 
        used.bg === color.bg && used.text === color.text
      )
    );
    
    // If all colors are used, cycle through them
    const newColor = availableColors.length > 0 
      ? availableColors[Math.floor(Math.random() * availableColors.length)]
      : TAG_COLORS[Object.keys(tagColors).length % TAG_COLORS.length];
    
    // Save the new color mapping
    setTagColors(prev => ({
      ...prev,
      [tagName]: newColor
    }));
    
    return newColor;
  };

  // ---------------------------
  // 2. Load tasks & user tags on mount
  // ---------------------------
  useEffect(() => {
    fetchTasks();
    fetchUserTags();
  }, []);

  // Fetch tasks from the backend
  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/tasks', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        console.error('Failed to fetch tasks');
        return;
      }
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  // Fetch the user’s existing tags from GET /tags
  const fetchUserTags = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/tags', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error('Failed to fetch user tags');
        return;
      }
      const data = await res.json();
      // Convert them into an array of objects with encoded IDs
      const converted = data.map((tagName) => ({
        id: encodeURIComponent(tagName.toLowerCase()),
        name: tagName,
      }));
      setUserTags(converted);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  // ---------------------------
  // 3. Create a new Task
  // ---------------------------
  const createTask = async () => {
    try {
      const token = localStorage.getItem('access_token');

      // Convert selectedTags (which are encoded IDs) back to actual names
      const tagNames = selectedTags.map((tagId) => {
        const found = userTags.find((t) => t.id === tagId);
        return found ? found.name : decodeURIComponent(tagId); // fallback to decoded ID
      });

      const payload = {
        title: newTitle,
        description: newDescription,
        status,
        tags: tagNames,
      };

      const response = await fetch('http://localhost:8000/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        console.error('Failed to create task');
        return;
      }

      const newTask = await response.json();
      setTasks((prev) => [...prev, newTask]);

      // reset fields
      closeModal();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  // ---------------------------
  // 4. Delete a task
  // ---------------------------
  const deleteTask = async (taskId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        console.error('Failed to delete task');
        return;
      }
      // Remove from local state
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // ---------------------------
  // 5. Update Task Status (for DnD)
  // ---------------------------
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const token = localStorage.getItem('access_token');
      const payload = { status: newStatus };

      const response = await fetch(`http://localhost:8000/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        console.error('Failed to update task status');
        return;
      }
      const updatedTask = await response.json();
      // update local state
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  // ---------------------------
  // 6. Drag & Drop => onDragEnd
  // ---------------------------
  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;  // dropped outside
    if (destination.droppableId === source.droppableId) return; // same column

    const taskId = parseInt(draggableId, 10);
    const newStatus = destination.droppableId;
    updateTaskStatus(taskId, newStatus);
  };

  // ---------------------------
  // 7. Filter tasks for a column
  // ---------------------------
  const getFilteredTasks = (tasks, selectedFilterTags) => {
    if (!selectedFilterTags.length) return tasks;
    return tasks.filter(task => 
      task.tags.some(tag => 
        selectedFilterTags.includes(
          userTags.find(ut => ut.name === tag)?.id
        )
      )
    );
  };

  const getTasksForColumn = (statusValue) => {
    const filtered = getFilteredTasks(tasks, selectedFilterTags);
    return filtered.filter((task) => task.status === statusValue);
  };

  // ---------------------------
  // 8. Modal + Edit Handling
  // ---------------------------
  const openModal = (defaultStatus = 'unassigned', task = null) => {
    if (task) {
      // Edit existing
      setIsEditing(true);
      setEditingTask(task);
      setNewTitle(task.title);
      setNewDescription(task.description);
      setStatus(task.status);

      // Convert tag names to IDs for the dropdown
      const tagIds = task.tags.map((tagName) => {
        const found = userTags.find((t) => t.name === tagName);
        return found ? found.id : encodeURIComponent(tagName.toLowerCase()); // fallback
      });
      setSelectedTags(tagIds);
    } else {
      // Create new
      setIsEditing(false);
      setEditingTask(null);
      setNewTitle('');
      setNewDescription('');
      setStatus(defaultStatus);
      setSelectedTags([]);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setEditingTask(null);
    setNewTitle('');
    setNewDescription('');
    setSelectedTags([]);
    setStatus('unassigned');
  };

  // For saving changes to an existing task
  const updateTask = async () => {
    if (!editingTask) return;
    try {
      const token = localStorage.getItem('access_token');
      // Convert selectedTags to actual names
      const tagNames = selectedTags.map((tagId) => {
        const found = userTags.find((t) => t.id === tagId);
        return found ? found.name : tagId;
      });
      const payload = {
        title: newTitle,
        description: newDescription,
        status,
        tags: tagNames,
      };

      const response = await fetch(`http://localhost:8000/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        console.error('Failed to update task');
        return;
      }
      const updatedTask = await response.json();
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );
      closeModal();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // ---------------------------
  // 9. Create new tag locally if none matches
  // (You can also do a POST /tags to store in DB)
  // ---------------------------
  const createNewTagLocally = (tagName) => {
    // Use the full tag name as the ID, but encoded for safety
    const newId = encodeURIComponent(tagName.toLowerCase());
    const newObj = { id: newId, name: tagName };
    setUserTags((prev) => [...prev, newObj]);
    setSelectedTags((prev) => [...prev, newId]);
    setTagSearch('');
    // Assign a color to the new tag
    getTagColor(tagName);
  };

  // Filtered tags for the dropdown
  const filteredUserTags = userTags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  // Add this new function to handle tag deletion:
  const deleteUserTag = async (tagId) => {
    try {
      const token = localStorage.getItem('access_token');
      const tagToDelete = userTags.find(t => t.id === tagId);
      if (!tagToDelete) return;

      const response = await fetch(`http://localhost:8000/tags/${tagToDelete.name}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to delete tag');
        return;
      }

      // Remove from local state
      setUserTags(prev => prev.filter(t => t.id !== tagId));
      // Remove from selected tags if it was selected
      setSelectedTags(prev => prev.filter(t => t !== tagId));
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  // Add this to your useEffect to load saved tag colors from localStorage
  useEffect(() => {
    const savedColors = localStorage.getItem('tagColors');
    if (savedColors) {
      setTagColors(JSON.parse(savedColors));
    }
  }, []);

  // Add this to save tag colors when they change
  useEffect(() => {
    if (Object.keys(tagColors).length > 0) {
      localStorage.setItem('tagColors', JSON.stringify(tagColors));
    }
  }, [tagColors]);

  // ---------------------------
  // RENDER
  // ---------------------------
  return (
    <div className="p-6 space-y-4 relative">
      {/* Top toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-800">Plan Page</h1>
        </div>

        <div className="flex items-center space-x-2">
          {/* Tag Filter Example (Optional) */}
          <div className="relative">
            <Listbox value={selectedFilterTags} onChange={setSelectedFilterTags} multiple>
              <ListboxButton className="relative text-sm border border-gray-300 px-3 py-1 rounded hover:bg-gray-200 inline-flex items-center text-gray-600 transition-colors">
                <span>
                  {selectedFilterTags.length ? `${selectedFilterTags.length} tags` : 'Tags'}
                </span>
                <ChevronDownIcon className="ml-1 h-4 w-4 text-gray-400" />
              </ListboxButton>
              <Transition as={Fragment}>
                <ListboxOptions className="absolute right-0 z-10 mt-1 w-56 overflow-hidden rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {/* Search input */}
                  <div className="px-3 py-2 border-b border-gray-200">
                    <div className="flex items-center space-x-2 bg-gray-50 rounded-md px-2">
                      <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        className="w-full bg-transparent border-none text-sm py-1 focus:outline-none focus:ring-0 placeholder-gray-400"
                        placeholder="Filter tags..."
                        value={filterTagSearch}
                        onChange={(e) => setFilterTagSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="max-h-48 overflow-auto">
                    {userTags
                      .filter((tag) =>
                        tag.name.toLowerCase().includes(filterTagSearch.toLowerCase())
                      )
                      .map((tag) => (
                        <ListboxOption
                          key={tag.id}
                          value={tag.id}
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-2 px-4 ${
                              active ? 'bg-gray-50' : ''
                            }`
                          }
                        >
                          {({ selected }) => {
                            const colors = getTagColor(tag.name);
                            return (
                              <div className="flex items-center justify-between">
                                <span 
                                  className={`${colors.bg} ${colors.text} px-2 py-0.5 rounded-full text-sm`}
                                >
                                  {tag.name}
                                </span>
                                {selected && (
                                  <span className="text-blue-600">✓</span>
                                )}
                              </div>
                            );
                          }}
                        </ListboxOption>
                      ))}
                  </div>
                </ListboxOptions>
              </Transition>
            </Listbox>
          </div>

          {selectedFilterTags.length > 0 && (
            <button
              onClick={() => setSelectedFilterTags([])}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </button>
          )}

          <button
            onClick={() => openModal('unassigned')}
            className="border border-purple-600 text-purple-600 hover:bg-gray-200 px-4 py-1 text-sm rounded inline-flex items-center transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            New Task
          </button>
        </div>
      </div>

      {/* Drag & Drop Context */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex space-x-4 overflow-x-auto pt-2 h-[calc(100vh-120px)]">
          {columns.map((col) => {
            const columnTasks = getTasksForColumn(col.status);

            return (
              <Droppable key={col.status} droppableId={col.status}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="w-64 flex-shrink-0 bg-gray-200 rounded-lg p-3 relative flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <h2 className="text-sm font-semibold text-gray-800">
                          {col.title}
                        </h2>
                        <span className="inline-flex items-center justify-center bg-white rounded-full w-5 h-5 text-xs text-gray-600">
                          {columnTasks.length}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openModal(col.status)}
                          className="p-1 rounded hover:bg-gray-300"
                        >
                          <PlusIcon className="h-4 w-4 text-gray-600" />
                        </button>
                        <button className="p-1 rounded hover:bg-gray-300">
                          <EllipsisVerticalIcon className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      {columnTasks.length === 0 && (
                        <button
                          onClick={() => openModal(col.status)}
                          className="text-sm text-gray-700 hover:bg-gray-300 inline-flex items-center w-full justify-center p-1 rounded transition-colors"
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          New Task
                        </button>
                      )}

                      {columnTasks.map((task, index) => (
                        <Draggable
                          key={task.id.toString()}
                          draggableId={task.id.toString()}
                          index={index}
                        >
                          {(providedDrag) => (
                            <div
                              ref={providedDrag.innerRef}
                              {...providedDrag.draggableProps}
                              {...providedDrag.dragHandleProps}
                              className="bg-white p-2 rounded shadow text-sm text-gray-700 flex items-center justify-between mt-2 cursor-pointer hover:bg-gray-50"
                              onClick={() => openModal(task.status, task)}
                            >
                              <div>
                                <div className="font-semibold">{task.title}</div>
                                {task.description && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {task.description}
                                  </div>
                                )}
                                {task.tags.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {task.tags.map((tag) => {
                                      const colors = getTagColor(tag);
                                      return (
                                        <span
                                          key={tag}
                                          className={`${colors.bg} ${colors.text} px-2 py-0.5 rounded-full text-xs`}
                                        >
                                          {tag}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTask(task.id);
                                }}
                                className="p-1 text-gray-400 hover:text-red-600"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}

          <div className="flex-shrink-0 w-64">
            <button className="h-full w-full text-gray-600 bg-gray-50 rounded-lg p-3 hover:bg-gray-100 border-dashed border-2 border-gray-200 flex items-center justify-center">
              <PlusIcon className="h-4 w-4 mr-1" />
              New Group
            </button>
          </div>
        </div>
      </DragDropContext>

      {/* MODAL */}
      {showModal && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="relative bg-white w-full max-w-xl rounded shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {isEditing ? 'Edit Task' : 'Create Idea'}
              </h2>
              <div className="flex items-center space-x-2">
                {/* Status Dropdown */}
                <div className="relative">
                  <Listbox value={status} onChange={setStatus}>
                    <ListboxButton className="border rounded px-3 py-1 text-sm focus:outline-none bg-white inline-flex items-center">
                      {
                        statusOptions.find((option) => option.id === status)
                          ?.name
                      }
                      <ChevronDownIcon
                        className="ml-1 h-4 w-4 text-gray-400"
                        aria-hidden="true"
                      />
                    </ListboxButton>
                    <Transition as={Fragment}>
                      <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-32 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        {statusOptions.map((option) => (
                          <ListboxOption
                            key={option.id}
                            value={option.id}
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-4 ${
                                active
                                  ? 'bg-blue-100 text-blue-900'
                                  : 'text-gray-900'
                              }`
                            }
                          >
                            {option.name}
                          </ListboxOption>
                        ))}
                      </ListboxOptions>
                    </Transition>
                  </Listbox>
                </div>

                {/* Tags dropdown */}
                <div className="relative">
                  <Listbox 
                    value={selectedTags} 
                    onChange={(newTags) => {
                      // Only allow adding if under the limit
                      if (newTags.length <= 3) {
                        setSelectedTags(newTags);
                      }
                    }} 
                    multiple
                  >
                    <ListboxButton className="border rounded px-3 py-1 text-sm focus:outline-none bg-white inline-flex items-center max-w-[200px]">
                      <span className="truncate">
                        {selectedTags.length ? (
                          <span className="flex items-center gap-1">
                            {selectedTags.map(tagId => 
                              userTags.find(t => t.id === tagId)?.name
                            ).join(', ')}
                          </span>
                        ) : (
                          'Add Tags'
                        )}
                      </span>
                      <ChevronDownIcon
                        className="ml-1 h-4 w-4 text-gray-400 flex-shrink-0"
                        aria-hidden="true"
                      />
                    </ListboxButton>
                    <Transition as={Fragment}>
                      <ListboxOptions className="absolute right-0 z-10 mt-1 w-56 overflow-hidden rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        {/* Search input */}
                        <div className="px-3 py-2 border-b border-gray-200">
                          <div className="flex items-center space-x-2 bg-gray-50 rounded-md px-2">
                            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              className="w-full bg-transparent border-none text-sm py-1 focus:outline-none focus:ring-0 placeholder-gray-400"
                              placeholder="Search tags..."
                              value={tagSearch}
                              onChange={(e) => setTagSearch(e.target.value)}
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1 px-1">
                            {selectedTags.length}/3 tags selected
                          </div>
                        </div>

                        <div className="max-h-48 overflow-auto">
                          {filteredUserTags.map((tag) => (
                            <ListboxOption
                              key={tag.id}
                              value={tag.id}
                              disabled={selectedTags.length >= 3 && !selectedTags.includes(tag.id)}
                              className={({ active, disabled }) =>
                                `relative cursor-pointer select-none py-2 px-4 ${
                                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                                } ${
                                  active ? 'bg-gray-50' : ''
                                }`
                              }
                            >
                              {({ selected, disabled }) => {
                                const colors = getTagColor(tag.name);
                                return (
                                  <div className="flex items-center justify-between group">
                                    <span 
                                      className={`${colors.bg} ${colors.text} px-2 py-0.5 rounded-full text-sm`}
                                    >
                                      {tag.name}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      {selected && (
                                        <span className="text-blue-600">✓</span>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteUserTag(tag.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity"
                                      >
                                        <TrashIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                    {disabled && !selected && (
                                      <span className="text-xs text-gray-500">Max tags reached</span>
                                    )}
                                  </div>
                                );
                              }}
                            </ListboxOption>
                          ))}

                          {/* Create new tag option */}
                          {tagSearch &&
                            !userTags.some(
                              (t) =>
                                t.name.toLowerCase() === tagSearch.toLowerCase()
                            ) && 
                            selectedTags.length < 3 && (
                              <button
                                className="w-full text-left py-2 px-4 text-purple-600 hover:bg-blue-100 flex items-center space-x-2"
                                onClick={() => createNewTagLocally(tagSearch)}
                              >
                                <PlusIcon className="h-4 w-4" />
                                <span>Create "{tagSearch}"</span>
                              </button>
                            )}
                        </div>
                      </ListboxOptions>
                    </Transition>
                  </Listbox>
                </div>
              </div>
            </div>

            {/* Title input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Give your idea a title"
                className="w-full px-3 py-2 text-sm text-gray-700 placeholder-gray-500 focus:outline-none"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            {/* Large text area / body */}
            <div className="mb-4">
              <textarea
                rows="5"
                placeholder="What was that idea you had again?"
                className="w-full px-3 py-2 text-sm text-gray-700 placeholder-gray-500 focus:outline-none"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>

            {/* Upload section (drag & drop or select file) + small toolbar row */}
            <div className="flex items-center space-x-4 mb-4">
              <div className="border-dashed border-2 border-gray-300 w-32 h-32 flex items-center justify-center rounded relative">
                <span className="text-sm text-gray-500 absolute">
                  Drag & drop <br /> or{' '}
                  <span className="text-blue-600">select a file</span>
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-300 w-full my-6"></div>

            {/* Bottom buttons: Cancel and Save */}
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={closeModal}
                className="border border-gray-300 text-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={isEditing ? updateTask : createTask}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
              >
                {isEditing ? 'Save Changes' : 'Save Idea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlanPage;
