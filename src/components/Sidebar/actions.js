import { useState } from 'react';
import { Listbox } from '@headlessui/react';
import { PlusIcon, SelectorIcon } from '@heroicons/react/solid';

import Button from '../Button';
import Modal from '../Modal';

const Actions = () => {
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [showModal, setModalState] = useState(false);

  const toggleModal = () => setModalState(!showModal);
  return (
    <div className="flex flex-col items-stretch justify-center px-5 space-y-3">
      <Button
        className="text-white bg-blue-600 hover:bg-blue-500"
        onClick={toggleModal}
      >
        <PlusIcon className="w-5 h-5 text-white" aria-hidden="true" />
        <span>Create Workspace</span>
      </Button>
      <Modal show={showModal} title="Create a Workspace" toggle={toggleModal}>
        <div className="space-y-0 text-sm text-gray-600">
          <p>
            Create a workspace to keep your team&apos;s content in one place.
          </p>
          <p>You&apos;ll be able to invite everyone later!</p>
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold">Workspace Name</h3>
          <p className="text-sm text-gray-400">
            Name your workspace. Keep it simple.
          </p>
          <input className="w-full px-3 py-2 border rounded" type="text" />
        </div>
        <div className="flex flex-col items-stretch">
          <Button
            className="text-white bg-blue-600 hover:bg-blue-500"
            onClick={toggleModal}
          >
            <span>Create Workspace</span>
          </Button>
        </div>
      </Modal>
      <Listbox value={currentWorkspace} onChange={setCurrentWorkspace}>
        <div className="relative">
          <Listbox.Button className="relative w-full py-2 pl-3 pr-10 text-left bg-white rounded-lg shadow-md cursor-default">
            <span className="block truncate">Select</span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <SelectorIcon
                className="w-5 h-5 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>
        </div>
      </Listbox>
    </div>
  );
};

export default Actions;