// frontend/src/pages/ToDosPage.js
import React, { useState } from 'react';
import {
  EllipsisVerticalIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Listbox, Transition, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { Fragment } from 'react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';


function ToDosPage() {
  // Example columns
  const columns = [
    { title: 'Ideas', count: 0 },
    { title: 'To-Do', count: 0 },
    { title: 'In Progress', count: 0 },
    { title: 'Done', count: 0 },
  ];

  // State for showing/hiding the “Create Idea” modal
  const [showModal, setShowModal] = useState(false);

  // Handler to open/close the modal
  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  // Add this near your other state declarations
  const statusOptions = [
    { id: 'todo', name: 'To-Do' },
    { id: 'ideas', name: 'Ideas' },
    { id: 'in-progress', name: 'In Progress' },
    { id: 'done', name: 'Done' },
  ];

  // Add this with your other state
  const [status, setStatus] = useState('todo');

  // Add near your other state declarations
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearch, setTagSearch] = useState('');

  // Example tags (replace with your actual tags later)
  const tagOptions = [
    { id: 'feature', name: 'Feature' },
    { id: 'bug', name: 'Bug' },
    { id: 'enhancement', name: 'Enhancement' },
    { id: 'documentation', name: 'Documentation' },
  ];

  // Add near your other state declarations
  const [selectedFilterTags, setSelectedFilterTags] = useState([]);
  const [filterTagSearch, setFilterTagSearch] = useState('');

  return (
    <div className="p-6 space-y-4 relative">
      {/* Top toolbar */}
      <div className="flex items-center justify-between">
        {/* Left side: Page heading */}
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-800">To-Do's</h1>
        </div>

        {/* Right side: "Tags" button, and "+ New Idea" */}
        <div className="flex items-center space-x-2"> 
          <div className="relative">
            <Listbox value={selectedFilterTags} onChange={setSelectedFilterTags} multiple>
              <ListboxButton className="relative text-sm border border-gray-300 px-3 py-1 rounded hover:bg-gray-200 inline-flex items-center text-gray-600 transition-colors">
                <span>Tags</span>
                <ChevronDownIcon className="ml-1 h-4 w-4 text-gray-400" aria-hidden="true" />
              </ListboxButton>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <ListboxOptions className="absolute right-0 z-10 mt-1 w-56 overflow-hidden rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {/* Search input */}
                  <div className="px-3 py-2 border-b border-gray-200">
                    <div className="flex items-center space-x-2 bg-gray-50 rounded-md px-2">
                      <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        className="w-full bg-transparent border-none text-sm py-1 focus:outline-none focus:ring-0 placeholder-gray-400"
                        placeholder="Search tags..."
                        value={filterTagSearch}
                        onChange={(e) => setFilterTagSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Filtered tag options */}
                  <div className="max-h-48 overflow-auto">
                    {tagOptions
                      .filter(tag => 
                        tag.name.toLowerCase().includes(filterTagSearch.toLowerCase())
                      )
                      .map((tag) => (
                        <Listbox.Option
                          key={tag.id}
                          value={tag.id}
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-2 px-4 ${
                              active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                            }`
                          }
                        >
                          {tag.name}
                        </Listbox.Option>
                      ))}
                  </div>
                </ListboxOptions>
              </Transition>
            </Listbox>
          </div>

          {/* + New Idea button */}
          <button
            onClick={openModal}
            className="border border-purple-600 text-purple-600 hover:bg-gray-200 px-4 py-1 text-sm rounded inline-flex items-center transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            New Idea
          </button>
        </div>
      </div>

      {/* Board columns container */}
      <div className="flex space-x-4 overflow-x-auto pt-2 h-[calc(100vh-120px)]">
        {columns.map((col, idx) => (
          <div
            key={col.title}
            className="w-64 flex-shrink-0 bg-gray-200 rounded-lg p-3 relative flex flex-col"
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold text-gray-800">
                  {col.title}
                </h2>
                <span className="inline-flex items-center justify-center bg-white rounded-full w-5 h-5 text-xs text-gray-600">
                  {col.count}
                </span>
              </div>

              {/* Right side: plus icon + vertical ellipsis menu */}
              <div className="flex items-center space-x-2">
                {/* Clicking plus -> also open modal */}
                <button
                  onClick={openModal}
                  className="p-1 rounded hover:bg-gray-300"
                >
                  <PlusIcon className="h-4 w-4 text-gray-600" />
                </button>
                <button className="p-1 rounded hover:bg-gray-300">
                  <EllipsisVerticalIcon className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Body: scrollable area for tasks */}
            <div className="flex-1 overflow-y-auto">
              <button
                onClick={openModal}
                className="text-sm text-gray-700 hover:bg-gray-300 inline-flex items-center w-full justify-center p-1 rounded transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                New Idea
              </button>
            </div>
          </div>
        ))}

        {/* Final "New Group" column */}
        <div className="flex-shrink-0 w-64">
          <button className="h-full w-full text-gray-600 bg-gray-50 rounded-lg p-3 hover:bg-gray-100 border-dashed border-2 border-gray-200 flex items-center justify-center">
            <PlusIcon className="h-4 w-4 mr-1" />
            New Group
          </button>
        </div>
      </div>

      {/* MODAL OVERLAY (if showModal is true) */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          {/* MODAL CONTENT WRAPPER */}
          <div className="relative bg-white w-full max-w-xl rounded shadow-lg p-6">
            {/* Modal Title and Dropdowns Row */}
            <div className="flex items-center justify-between mb-4">
              {/* Left: Modal Title */}
              <h2 className="text-xl font-semibold text-gray-800">
                Create Idea
              </h2>

              {/* Right: Status and Tags dropdowns */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Listbox value={status} onChange={setStatus}>
                    <ListboxButton className="border rounded px-3 py-1 text-sm focus:outline-none bg-white inline-flex items-center">
                      {statusOptions.find(option => option.id === status)?.name}
                      <ChevronDownIcon className="ml-1 h-4 w-4 text-gray-400" aria-hidden="true" />
                    </ListboxButton>
                    <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-32 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        {statusOptions.map((option) => (
                          <ListboxOption
                            key={option.id}
                            value={option.id}
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-4 ${
                                active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
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
                <div className="relative">
                  <Listbox value={selectedTags} onChange={setSelectedTags} multiple>
                    <ListboxButton className="border rounded px-3 py-1 text-sm focus:outline-none bg-white inline-flex items-center">
                      <span>Add Tags</span>
                      <ChevronDownIcon className="ml-1 h-4 w-4 text-gray-400" aria-hidden="true" />
                    </ListboxButton>
                    <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
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
                        </div>

                        {/* Filtered tag options */}
                        <div className="max-h-48 overflow-auto">
                          {tagOptions
                            .filter(tag => 
                              tag.name.toLowerCase().includes(tagSearch.toLowerCase())
                            )
                            .map((tag) => (
                              <ListboxOption
                                key={tag.id}
                                value={tag.id}
                                className={({ active }) =>
                                  `relative cursor-pointer select-none py-2 px-4 ${
                                    active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                                  }`
                                }
                              >
                                {tag.name}
                              </ListboxOption>
                            ))}
                          
                          {/* Create new tag option (shown only if search doesn't match any existing tags) */}
                          {tagSearch && !tagOptions.some(tag => 
                            tag.name.toLowerCase() === tagSearch.toLowerCase()
                          ) && (
                            <button
                              className="w-full text-left py-2 px-4 text-purple-600 hover:bg-blue-100 flex items-center space-x-2"
                              onClick={() => {
                                // Add functionality later
                                console.log('Create new tag:', tagSearch);
                              }}
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
              />
            </div>

            {/* Large text area / body */}
            <div className="mb-4">
              <textarea
                rows="5"
                placeholder="What was that idea you had again?"
                className="w-full px-3 py-2 text-sm text-gray-700 placeholder-gray-500 focus:outline-none"
              />
            </div>

            {/* Upload section (drag & drop or select file) + small toolbar row */}
            <div className="flex items-center space-x-4 mb-4">
              {/* Drag & Drop region */}
              <div className="border-dashed border-2 border-gray-300 w-32 h-32 flex items-center justify-center rounded relative">
                <span className="text-sm text-gray-500 absolute">
                  Drag & drop <br /> or <span className="text-blue-600">select a file</span>
                </span>
              </div> 
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-300 w-full my-6"></div>

            {/* Bottom buttons: Cancel and Save Idea */}
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={closeModal}
                className="border border-gray-300 text-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm">
                Save Idea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ToDosPage;
