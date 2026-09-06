import { useState } from 'react';
import client from '../../api/client';
import { getErrorMessage } from '../../utils/errors';

export default function AccountForm({
  account,
  onSaved,
  onCancel
}) {
  const [form, setForm] = useState({
    fullName: account?.fullName || '',
    email: account?.email || '',
    password: '',
    role: account?.role || 'staff',
    branch: account?.branch || 'Main Branch'
  });

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function updateField(field, value) {
    setForm(previous => ({
      ...previous,
      [field]: value
    }));
  }

  async function submit(event) {
    event.preventDefault();

    setBusy(true);
    setError('');

    try {
      const body = {
        ...form
      };

      if (!body.password) {
        delete body.password;
      }

      const accountId = account?.id || account?._id;

      if (account && !accountId) {
        throw new Error(
          'Account ID is missing. Refresh the account list and try again.'
        );
      }

      if (account) {
        await client.put(
          `/accounts/${accountId}`,
          body
        );
      } else {
        await client.post('/accounts', body);
      }

      onSaved?.();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to save the account.'
        )
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="inline-form"
      onSubmit={submit}
    >
      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      <div className="form-grid">
        <label>
          Full name

          <input
            required
            value={form.fullName}
            onChange={event =>
              updateField(
                'fullName',
                event.target.value
              )
            }
          />
        </label>

        <label>
          Email

          <input
            required
            type="email"
            value={form.email}
            onChange={event =>
              updateField(
                'email',
                event.target.value
              )
            }
          />
        </label>

        <label>
          Password

          <span className="field-hint">
            {account
              ? 'Leave blank to keep current password'
              : 'Required, at least 8 characters'}
          </span>

          <input
            required={!account}
            type="password"
            minLength="8"
            value={form.password}
            onChange={event =>
              updateField(
                'password',
                event.target.value
              )
            }
          />
        </label>

        <label>
          Role

          <select
            value={form.role}
            onChange={event =>
              updateField(
                'role',
                event.target.value
              )
            }
          >
            <option value="admin">
              Admin
            </option>

            <option value="manager">
              Manager
            </option>

            <option value="staff">
              Staff
            </option>

            <option value="cashier">
              Cashier — POS only
            </option>
          </select>
        </label>

        <label>
          Branch / warehouse

          <input
            value={form.branch}
            onChange={event =>
              updateField(
                'branch',
                event.target.value
              )
            }
          />
        </label>
      </div>

      <div className="modal-actions">
        <button
          type="button"
          className="secondary-btn"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="primary-btn"
          disabled={busy}
        >
          {busy
            ? 'Saving...'
            : account
              ? 'Update account'
              : 'Create account'}
        </button>
      </div>
    </form>
  );
}