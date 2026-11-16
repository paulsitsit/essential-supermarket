import { BookOpen } from 'lucide-react';
import GlassCard from '../common/GlassCard';

const manuals = [
  { title: 'Daily maintenance checklist', steps: [
    'Confirm that the application opens and that authorized accounts can sign in.',
    'Check Inventory for low-stock, out-of-stock, and expiring products. Compare unusual quantities with physical stock before making corrections.',
    'Review pending products and stock receipts through an authorized account. Before repeating a receipt, check whether it has already synchronized.',
    'Check recent stock movements, sales, and returns for unexpected entries. Record discrepancies for investigation instead of deleting history.'
  ] },
  { title: 'Weekly maintenance checklist', steps: [
    'Review product barcodes, categories, suppliers, reorder levels, and expiration dates for accuracy.',
    'Review account access with the responsible manager and remove access that is no longer required using the authorized account workflow.',
    'Review available audit logs and investigate unexpected changes.',
    'Have the database maintainer verify that recent backups completed successfully and that a recovery test is scheduled.'
  ] },
  { title: 'Backup and recovery precautions', steps: [
    'An inventory CSV export is a report, not a complete database backup. Arrange a database backup with the authorized database maintainer.',
    'Before a deployment, migration, or bulk correction, confirm the database environment and obtain a verified backup. Store backups securely outside the public repository and restrict access.',
    'Test recovery in a separate non-production database first. Confirm product records, stock, sales, and account access before considering a production recovery.',
    'Production recovery must be coordinated by the database maintainer: pause writes, preserve the current database, confirm the restore target, restore the verified backup, validate records, then resume service. This manual does not perform backups or restores.'
  ] },
  { title: 'Offline data and synchronization', steps: [
    'If a saved-data notice appears, check its timestamp. Cached inventory may not reflect current server stock.',
    'Reconnect and wait for fresh inventory data before editing, archiving, deleting, or receiving stock from Inventory.',
    'The Products workflow supports locally saved stock receipts. Check pending receipts and synchronization status before entering the same receipt again.',
    'Do not clear browser site data, uninstall the app, or reset the device while unsynchronized work remains. First reconcile pending work with the responsible administrator.'
  ] },
  { title: 'Notification troubleshooting', steps: [
    'Use the secure HTTPS application and check Device notifications in Settings.',
    'If permission is blocked, allow notifications in browser site settings, then reload the page.',
    'Use Enable notifications on each device that should receive alerts. Use Send test to check delivery after enabling.',
    'If delivery still fails, record the device, browser, time, and error. Ask the maintainer to inspect notification configuration and server logs without sharing secrets.'
  ] },
  { title: 'Deployment and incident checklist', steps: [
    'Record the current working commit and deployment before changing code. Back up the database before database-related changes.',
    'Test changes in a non-production environment and confirm the frontend and backend builds, configuration, and API connectivity.',
    'After deployment, verify login, role restrictions, Inventory View, stock receiving, reports, and notifications using test records. Do not delete real products merely to test a button.',
    'If a regression occurs, capture the error, time, page, and affected role. Coordinate a rollback to a known working deployment; code rollback does not undo database changes.'
  ] },
  { title: 'Settings scope and security reminders', steps: [
    'The current Save settings form stores its values locally in this browser. It does not update a shared server configuration.',
    'The Session duration selector does not by itself change the server token lifetime. Coordinate authentication changes with the backend maintainer.',
    'Device notification subscription controls are separate from the locally stored alert preference checkboxes.',
    'Never paste passwords, database connection strings, API keys, or authentication tokens into screenshots, manuals, issues, or public repositories.'
  ] }
];

export default function MaintenanceManual() {
  return (
    <section aria-labelledby="maintenance-manual-title" style={{ marginTop: 24 }}>
      <GlassCard className="settings-card">
        <div className="settings-heading">
          <BookOpen size={19} aria-hidden="true" />
          <div><h2 id="maintenance-manual-title">Maintenance manuals</h2><p>Operational checklists and safe troubleshooting for authorized administrators.</p></div>
        </div>
        <p>Expand a topic for instructions. These guides do not run maintenance tasks or change your data.</p>
        {manuals.map(manual => (
          <details key={manual.title} style={{ borderTop: '1px solid currentColor', padding: '14px 0' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{manual.title}</summary>
            <ol style={{ paddingLeft: 24, lineHeight: 1.7 }}>
              {manual.steps.map(step => <li key={step} style={{ marginTop: 8 }}>{step}</li>)}
            </ol>
          </details>
        ))}
      </GlassCard>
    </section>
  );
}
