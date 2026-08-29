import {
  useEffect,
  useState
} from 'react';

import {
  Bell,
  BellOff,
  CheckCircle2,
  Database,
  Globe2,
  LoaderCircle,
  LockKeyhole,
  Save,
  Send,
  ShieldCheck,
  Smartphone
} from 'lucide-react';

import toast from 'react-hot-toast';

import GlassCard from '../components/common/GlassCard';

import {
  disablePushNotifications,
  getPushNotificationStatus,
  sendTestPushNotification
} from '../utils/pushNotifications';

import {
  enableNotificationsForCurrentDevice
} from '../services/pushNotifications';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState({
    supermarketName: 'EssentialSupermarket',
    defaultBranch: 'Main Branch',
    timezone: 'Asia/Manila',
    lowStockNotifications: true,
    criticalNotifications: true,
    sessionDuration: '1d'
  });

  const [pushStatus, setPushStatus] = useState({
    supported: false,
    permission: 'default',
    subscribed: false
  });

  const [pushLoading, setPushLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  async function loadPushStatus() {
    try {
      const status = await getPushNotificationStatus();

      setPushStatus(status);
    } catch (error) {
      console.error(
        'Unable to load push notification status:',
        error
      );

      setPushStatus({
        supported: false,
        permission: 'default',
        subscribed: false
      });
    }
  }

  useEffect(() => {
    loadPushStatus();
  }, []);

  function change(key, value) {
    setSettings(current => ({
      ...current,
      [key]: value
    }));

    setSaved(false);
  }

  function save(event) {
    event.preventDefault();

    localStorage.setItem(
      'essential_settings',
      JSON.stringify(settings)
    );

    setSaved(true);

    toast.success('Settings saved locally.');
  }

  async function enableDeviceNotifications() {
    try {
      setPushLoading(true);

      await enableNotificationsForCurrentDevice();

      await loadPushStatus();

      toast.success(
        'Notifications are enabled for this device.'
      );
    } catch (error) {
      console.error(
        'Unable to enable device notifications:',
        error
      );

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Unable to enable notifications for this device.'
      );
    } finally {
      setPushLoading(false);
    }
  }

  async function disableDeviceNotifications() {
    try {
      setPushLoading(true);

      await disablePushNotifications();

      await loadPushStatus();

      toast.success(
        'Notifications are disabled for this device.'
      );
    } catch (error) {
      console.error(
        'Unable to disable device notifications:',
        error
      );

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Unable to disable notifications for this device.'
      );
    } finally {
      setPushLoading(false);
    }
  }

  async function testDeviceNotification() {
    try {
      setTestLoading(true);

      const result = await sendTestPushNotification();

      if (result.sent > 0) {
        toast.success(
          'A test notification was sent to this device.'
        );
      } else {
        toast(
          'No subscribed device was found for this account.'
        );
      }
    } catch (error) {
      console.error(
        'Unable to send test notification:',
        error
      );

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Unable to send test notification.'
      );
    } finally {
      setTestLoading(false);
    }
  }

  const deviceNotificationsEnabled =
    pushStatus.supported &&
    pushStatus.permission === 'granted' &&
    pushStatus.subscribed;

  const pushUnsupportedMessage =
    pushStatus.permission === 'insecure-context'
      ? 'Notifications require the secure HTTPS version of the app.'
      : 'Push notifications are not supported in this browser. Use the latest Chrome or Microsoft Edge.';

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            SYSTEM CONFIGURATION
          </p>

          <h1>Settings</h1>

          <p>
            Configure inventory monitoring preferences
            for this installation.
          </p>
        </div>
      </div>

      {saved && (
        <div className="success-message">
          Settings saved locally. Connect these fields
          to a server settings endpoint for multi-device
          persistence.
        </div>
      )}

      <form
        onSubmit={save}
        className="settings-grid"
      >
        <GlassCard className="settings-card">
          <div className="settings-heading">
            <Globe2 size={19} />

            <div>
              <h3>General settings</h3>

              <p>
                Basic supermarket configuration.
              </p>
            </div>
          </div>

          <label>
            System name

            <input
              value={settings.supermarketName}
              onChange={event =>
                change(
                  'supermarketName',
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Default branch / warehouse

            <input
              value={settings.defaultBranch}
              onChange={event =>
                change(
                  'defaultBranch',
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Timezone

            <select
              value={settings.timezone}
              onChange={event =>
                change(
                  'timezone',
                  event.target.value
                )
              }
            >
              <option value="Asia/Manila">
                Asia/Manila
              </option>

              <option value="UTC">
                UTC
              </option>
            </select>
          </label>
        </GlassCard>

        <GlassCard className="settings-card">
          <div className="settings-heading">
            <Bell size={19} />

            <div>
              <h3>Alert preferences</h3>

              <p>
                Control inventory notification behavior.
              </p>
            </div>
          </div>

          <label className="switch-row">
            <span>
              <strong>
                Low-stock notifications
              </strong>

              <small>
                Notify accounts when stock reaches
                reorder level.
              </small>
            </span>

            <input
              type="checkbox"
              checked={settings.lowStockNotifications}
              onChange={event =>
                change(
                  'lowStockNotifications',
                  event.target.checked
                )
              }
            />
          </label>

          <label className="switch-row">
            <span>
              <strong>
                Critical notifications
              </strong>

              <small>
                Notify accounts when a product reaches
                zero.
              </small>
            </span>

            <input
              type="checkbox"
              checked={settings.criticalNotifications}
              onChange={event =>
                change(
                  'criticalNotifications',
                  event.target.checked
                )
              }
            />
          </label>
        </GlassCard>

        <GlassCard className="settings-card">
          <div className="settings-heading">
            <Smartphone size={19} />

            <div>
              <h3>Device notifications</h3>

              <p>
                Receive low-stock and expiration alerts
                on this Windows browser or Android device.
              </p>
            </div>
          </div>

          {!pushStatus.supported ? (
            <div className="settings-info">
              <BellOff size={17} />

              <span>
                {pushUnsupportedMessage}
              </span>
            </div>
          ) : (
            <>
              <div className="settings-info">
                {deviceNotificationsEnabled ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <BellOff size={17} />
                )}

                <span>
                  {deviceNotificationsEnabled
                    ? 'Notifications are enabled for this device.'
                    : pushStatus.permission === 'denied'
                      ? 'Notifications are blocked in browser settings.'
                      : 'Notifications are not enabled on this device.'}
                </span>
              </div>

              <div className="notification-settings-actions">
                {deviceNotificationsEnabled ? (
                  <>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={testDeviceNotification}
                      disabled={testLoading}
                    >
                      {testLoading ? (
                        <LoaderCircle
                          size={16}
                          className="button-spinner"
                        />
                      ) : (
                        <Send size={16} />
                      )}

                      Send test
                    </button>

                    <button
                      type="button"
                      className="danger-btn"
                      onClick={disableDeviceNotifications}
                      disabled={pushLoading}
                    >
                      {pushLoading ? (
                        <LoaderCircle
                          size={16}
                          className="button-spinner"
                        />
                      ) : (
                        <BellOff size={16} />
                      )}

                      Disable
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={enableDeviceNotifications}
                    disabled={
                      pushLoading ||
                      pushStatus.permission === 'denied'
                    }
                  >
                    {pushLoading ? (
                      <LoaderCircle
                        size={16}
                        className="button-spinner"
                      />
                    ) : (
                      <Bell size={16} />
                    )}

                    Enable notifications
                  </button>
                )}
              </div>

              {pushStatus.permission === 'denied' && (
                <small className="notification-help">
                  Open browser site settings, allow
                  notifications for Essential Supermarket,
                  then reload this page.
                </small>
              )}
            </>
          )}
        </GlassCard>

        <GlassCard className="settings-card">
          <div className="settings-heading">
            <ShieldCheck size={19} />

            <div>
              <h3>Security</h3>

              <p>
                Authentication and data protection
                information.
              </p>
            </div>
          </div>

          <div className="settings-info">
            <LockKeyhole size={17} />

            <span>
              JWT authentication is enabled for API
              access.
            </span>
          </div>

          <div className="settings-info">
            <Database size={17} />

            <span>
              Inventory data is stored in MongoDB.
            </span>
          </div>

          <label>
            Session duration

            <select
              value={settings.sessionDuration}
              onChange={event =>
                change(
                  'sessionDuration',
                  event.target.value
                )
              }
            >
              <option value="1d">1 day</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
            </select>
          </label>
        </GlassCard>

        <div className="settings-actions">
          <button className="primary-btn">
            <Save size={16} />
            Save settings
          </button>
        </div>
      </form>
    </div>
  );
}