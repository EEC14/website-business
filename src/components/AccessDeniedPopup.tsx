export const AccessDeniedPopup = ({
  onClose,
  handleManageBilling,
}: {
  onClose: () => void;
  handleManageBilling: () => {};
}) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
    <div className="max-w-sm p-6 bg-white rounded-lg shadow-md">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">
        Access Denied
      </h2>
      <p className="mb-4 text-gray-700">
        You don't have access to this feature. Please manage your subscription
        to unlock it.
      </p>
      <div className="flex gap-4">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-800 bg-gray-200 rounded hover:bg-gray-300"
        >
          Close
        </button>
        <button
          onClick={handleManageBilling}
          className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          Manage Subscription
        </button>
      </div>
    </div>
  </div>
);
