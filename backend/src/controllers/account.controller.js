import Account from '../models/Account.js';
import { writeAudit } from '../utils/audit.js';

const ALLOWED_ROLES = [
  'admin',
  'manager',
  'staff',
  'cashier'
];

const clean = account => ({
  id: account._id,
  fullName: account.fullName,
  email: account.email,
  role: account.role,
  status: account.status,
  branch: account.branch,
  lastLogin: account.lastLogin,
  createdAt: account.createdAt,
  updatedAt: account.updatedAt
});

function normalizeRole(role) {
  return String(role || '')
    .trim()
    .toLowerCase();
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function validRole(role) {
  return ALLOWED_ROLES.includes(role);
}

export async function list(req, res) {
  const accounts = await Account.find()
    .sort({ createdAt: -1 });

  res.json(accounts.map(clean));
}

export async function get(req, res) {
  const account = await Account.findById(
    req.params.id
  );

  if (!account) {
    return res.status(404).json({
      message: 'Account not found'
    });
  }

  res.json(clean(account));
}

export async function create(req, res) {
  const {
    fullName,
    email,
    password,
    role,
    branch
  } = req.body;

  const normalizedFullName = String(
    fullName || ''
  ).trim();

  const normalizedEmail = normalizeEmail(email);

  const normalizedRole = normalizeRole(role);

  const normalizedBranch =
    String(branch || '').trim() || 'Main Branch';

  if (
    !normalizedFullName ||
    !normalizedEmail ||
    !password ||
    !normalizedRole
  ) {
    return res.status(400).json({
      message:
        'Full name, email, password, and role are required'
    });
  }

  if (!validRole(normalizedRole)) {
    return res.status(400).json({
      message: 'Invalid role'
    });
  }

  if (String(password).length < 8) {
    return res.status(400).json({
      message:
        'Password must be at least 8 characters'
    });
  }

  const existingAccount = await Account.findOne({
    email: normalizedEmail
  });

  if (existingAccount) {
    return res.status(409).json({
      message:
        'An account with this email already exists'
    });
  }

  const account = await Account.create({
    fullName: normalizedFullName,
    email: normalizedEmail,
    role: normalizedRole,
    branch: normalizedBranch,
    passwordHash: await Account.hashPassword(
      password
    )
  });

  await writeAudit({
    req,
    account: req.account,
    action: 'account_created',
    affectedRecord: account._id.toString(),
    metadata: {
      createdAccountRole: account.role,
      createdAccountEmail: account.email,
      branch: account.branch
    }
  });

  res.status(201).json(clean(account));
}

export async function update(req, res) {
  const account = await Account.findById(
    req.params.id
  );

  if (!account) {
    return res.status(404).json({
      message: 'Account not found'
    });
  }

  const updates = {};

  if (req.body.fullName !== undefined) {
    const fullName = String(
      req.body.fullName || ''
    ).trim();

    if (!fullName) {
      return res.status(400).json({
        message: 'Full name cannot be empty'
      });
    }

    updates.fullName = fullName;
  }

  if (req.body.email !== undefined) {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        message: 'Email cannot be empty'
      });
    }

    const emailOwner = await Account.findOne({
      email,
      _id: { $ne: account._id }
    });

    if (emailOwner) {
      return res.status(409).json({
        message:
          'An account with this email already exists'
      });
    }

    updates.email = email;
  }

  if (req.body.branch !== undefined) {
    updates.branch =
      String(req.body.branch || '').trim() ||
      'Main Branch';
  }

  if (req.body.role !== undefined) {
    const role = normalizeRole(req.body.role);

    if (!validRole(role)) {
      return res.status(400).json({
        message: 'Invalid role'
      });
    }

    if (
      account._id.toString() ===
        req.account._id.toString() &&
      role !== account.role
    ) {
      return res.status(400).json({
        message:
          'You cannot change your own account role'
      });
    }

    updates.role = role;
  }

  if (req.body.password !== undefined) {
    if (String(req.body.password).length < 8) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters'
      });
    }

    updates.passwordHash = await Account.hashPassword(
      req.body.password
    );
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({
      message:
        'Provide at least one account field to update'
    });
  }

  const previousValues = {
    fullName: account.fullName,
    email: account.email,
    role: account.role,
    branch: account.branch
  };

  Object.assign(account, updates);

  await account.save();

  await writeAudit({
    req,
    account: req.account,
    action: 'account_updated',
    affectedRecord: account._id.toString(),
    metadata: {
      changedFields: Object.keys(updates),
      previousValues,
      updatedRole: account.role
    }
  });

  res.json(clean(account));
}

export async function changeStatus(req, res) {
  const status = String(
    req.body.status || ''
  ).trim();

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({
      message: 'Status must be active or inactive'
    });
  }

  if (
    req.params.id === req.account.id &&
    status === 'inactive'
  ) {
    return res.status(400).json({
      message:
        'You cannot deactivate your own account'
    });
  }

  const account = await Account.findByIdAndUpdate(
    req.params.id,
    { status },
    {
      new: true,
      runValidators: true
    }
  );

  if (!account) {
    return res.status(404).json({
      message: 'Account not found'
    });
  }

  await writeAudit({
    req,
    account: req.account,
    action:
      status === 'inactive'
        ? 'account_deactivated'
        : 'account_activated',
    affectedRecord: account._id.toString(),
    metadata: {
      changedAccountRole: account.role,
      status: account.status
    }
  });

  res.json(clean(account));
}

export async function changeRole(req, res) {
  const role = normalizeRole(req.body.role);

  if (!validRole(role)) {
    return res.status(400).json({
      message: 'Invalid role'
    });
  }

  if (req.params.id === req.account.id) {
    return res.status(400).json({
      message:
        'You cannot change your own account role'
    });
  }

  const account = await Account.findById(
    req.params.id
  );

  if (!account) {
    return res.status(404).json({
      message: 'Account not found'
    });
  }

  const previousRole = account.role;

  account.role = role;

  await account.save();

  await writeAudit({
    req,
    account: req.account,
    action: 'account_role_changed',
    affectedRecord: account._id.toString(),
    metadata: {
      previousRole,
      newRole: account.role
    }
  });

  res.json(clean(account));
}

export async function remove(req, res) {
  if (req.params.id === req.account.id) {
    return res.status(400).json({
      message:
        'You cannot delete your own account'
    });
  }

  const account = await Account.findById(
    req.params.id
  );

  if (!account) {
    return res.status(404).json({
      message: 'Account not found'
    });
  }

  await Account.findByIdAndDelete(account._id);

  await writeAudit({
    req,
    account: req.account,
    action: 'account_deleted',
    affectedRecord: account._id.toString(),
    metadata: {
      deletedAccountEmail: account.email,
      deletedAccountRole: account.role
    }
  });

  res.json({
    message: 'Account deleted'
  });
}