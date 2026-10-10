import {
  CloudOff
} from 'lucide-react';

import {
  useOnlineStatus
} from '../hooks/useOnlineStatus';

export default function OfflineStatus() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      className="inventory-offline-banner"
      role="status"
    >
      <CloudOff size={18} />

      <div>
        <strong>
          No network connection
        </strong>

        <span>
          Saved views are available. Admin product
          saves remain local drafts. Stock changes
          require a connection. Draft synchronization
          is not enabled yet.
        </span>
      </div>
    </div>
  );
}