import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────
// CONFIGURATION — reads from .env ONLY, no hardcoded fallback.
// If the env vars are missing the app shows an error and stops.
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Supabase is not configured. ' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────
const getUserProfile = async (authUser) => {
  if (!authUser) return null;

  const { data: userData, error: roleError } = await supabase
    .from('users')
    .select('role, full_name')
    .eq('id', authUser.id)
    .limit(1)
    .maybeSingle();

  if (roleError) throw roleError;

  if (userData) {
    return {
      id: authUser.id,
      email: authUser.email,
      name: userData.full_name || authUser.email?.split('@')[0] || 'User',
      role: userData.role
    };
  }

  await supabase.auth.signOut();
  throw new Error(
    `This login exists in Supabase Auth, but no matching profile found in public.users for ${authUser.email}.`
  );
};

// ─────────────────────────────────────────────────────────────
// AUTH HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Wraps a promise with a hard timeout.
 * Rejects with a TimeoutError after `ms` milliseconds if the
 * original promise hasn't resolved yet.
 */
function withTimeout(promise, ms, label = 'operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`[Auth] ${label} timed out after ${ms}ms`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Clears the stored Supabase session from both the SDK and
 * localStorage so the bad token can never cause another hang.
 */
async function clearBadSession(reason) {
  console.error('[Auth] Clearing bad/expired session:', reason);
  try {
    await supabase.auth.signOut();
  } catch (_) {
    // signOut itself might fail if the token is already invalid — safe to ignore.
    // Belt-and-suspenders: also wipe the localStorage key directly.
    const storageKey = Object.keys(localStorage).find(k =>
      k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (storageKey) localStorage.removeItem(storageKey);
  }
}

export const auth = {
  /**
   * getCurrentUser — safe session restoration:
   *
   * 1. getSession()  — reads localStorage only, zero network I/O.
   *                    If nothing is stored we return null immediately.
   * 2. getUser()     — validates the token with the Supabase auth server.
   *                    Wrapped in a 7-second timeout so it can NEVER hang
   *                    the app forever.
   * 3. On any error  — the bad token is purged via signOut() so the next
   *                    load won't hit the same problem again.
   */
  getCurrentUser: async () => {
    // ── Step 1: fast local check (no network) ──────────────────
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      await clearBadSession(sessionError.message);
      return null;
    }

    // No stored session → nothing to validate, return immediately.
    if (!sessionData?.session) return null;

    // ── Step 2: validate token with the server (with timeout) ──
    let authUser;
    try {
      const { data, error } = await withTimeout(
        supabase.auth.getUser(),
        7000,
        'getUser()'
      );

      if (error) {
        // JWT / auth errors mean the stored token is bad — clean it up.
        const isAuthError =
          error.status === 401 ||
          error.status === 403 ||
          error.status === 400 ||
          error.name === 'AuthSessionMissingError' ||
          /jwt|token|expired|invalid|session missing/i.test(error.message || '');

        if (isAuthError) {
          await clearBadSession(error.message);
        } else {
          console.error('[Auth] getUser() returned a non-auth error:', error);
        }
        return null;
      }

      authUser = data?.user ?? null;
    } catch (err) {
      // Covers both the timeout rejection and any unexpected SDK throw.
      await clearBadSession(err.message);
      return null;
    }

    if (!authUser) return null;

    // ── Step 3: fetch the app-level profile from public.users ──
    return getUserProfile(authUser);
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return getUserProfile(data.user);
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },

  onAuthStateChange: (callback) => {
    const { data } = supabase.auth.onAuthStateChange(callback);
    return data.subscription;
  }
};

// ─────────────────────────────────────────────────────────────
// DATABASE — every method calls Supabase directly.
// On error: returns { success: false, error: message }.
// No mock fallback, no localStorage fake data.
// ─────────────────────────────────────────────────────────────
export const database = {
  // ── USERS ──────────────────────────────────────────────────
  users: {
    list: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('full_name');
      if (error) throw new Error(error.message);
      return data;
    },

    create: async (userPayload) => {
      const { full_name, phone, role, email, education, age, father_name, mother_name, address, cnic } = userPayload;

      const { data, error } = await supabase
        .from('users')
        .insert({
          id: uuidv4(),
          full_name,
          phone,
          role,
          email,
          education,
          age: age ? Number(age) : null,
          father_name,
          mother_name,
          address,
          cnic
        })
        .select();

      if (error) return { success: false, error: error.message };
      return { success: true, data: data[0] };
    },

    update: async (id, userPayload) => {
      const { full_name, phone, role, email, education, age, father_name, mother_name, address, cnic } = userPayload;

      const { data, error } = await supabase
        .from('users')
        .update({
          full_name,
          phone,
          role,
          email,
          education,
          age: age ? Number(age) : null,
          father_name,
          mother_name,
          address,
          cnic
        })
        .eq('id', id)
        .select();

      if (error) return { success: false, error: error.message };
      return { success: true, data: data[0] };
    },

    delete: async (id) => {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  },

  // ── STUDENTS ───────────────────────────────────────────────
  students: {
    list: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, users(*)');
      if (error) throw new Error(error.message);
      return data.map(s => ({
        ...s,
        full_name: s.users?.full_name || '',
        phone: s.users?.phone || ''
      }));
    },

    create: async (studentPayload) => {
      const { full_name, phone, class_name, roll_number, father_name, address } = studentPayload;

      // 1. Create user row
      const newUserId = uuidv4();
      const { error: userErr } = await supabase
        .from('users')
        .insert({
          id: newUserId,
          full_name,
          phone,
          role: 'student'
        })
        .select();

      if (userErr) return { success: false, error: userErr.message };

      // 2. Create student row — rollback user on failure
      const { data: studentRecord, error: studErr } = await supabase
        .from('students')
        .insert({
          user_id: newUserId,
          class: class_name,
          roll_number,
          father_name,
          address
        })
        .select();

      if (studErr) {
        await supabase.from('users').delete().eq('id', newUserId);
        return { success: false, error: studErr.message };
      }
      return { success: true, data: studentRecord[0] };
    },

    update: async (id, studentPayload) => {
      const { full_name, phone, class_name, roll_number, father_name, address, user_id } = studentPayload;

      const { error: userErr } = await supabase
        .from('users')
        .update({ full_name, phone })
        .eq('id', user_id);
      if (userErr) return { success: false, error: userErr.message };

      const { data, error: studErr } = await supabase
        .from('students')
        .update({ class: class_name, roll_number, father_name, address })
        .eq('id', id)
        .select();

      if (studErr) return { success: false, error: studErr.message };
      return { success: true, data: data[0] };
    },

    delete: async (id) => {
      // Delete user record; students row cascades via FK
      const { data, error: fetchErr } = await supabase
        .from('students')
        .select('user_id')
        .eq('id', id)
        .single();

      if (fetchErr) return { success: false, error: fetchErr.message };

      const { error } = await supabase.from('users').delete().eq('id', data.user_id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  },

  // ── TEACHERS ───────────────────────────────────────────────
  teachers: {
    list: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('*, users(*)');
      if (error) throw new Error(error.message);
      return data.map(t => ({
        ...t,
        full_name: t.users?.full_name || '',
        phone: t.users?.phone || ''
      }));
    },

    create: async (teacherPayload) => {
      const { full_name, phone, subject, qualification, salary, joining_date, user_id } = teacherPayload;

      const newUserId = user_id || uuidv4();
      const { error: userErr } = await supabase
        .from('users')
        .insert({
          id: newUserId,
          full_name,
          phone,
          role: 'teacher'
        });
      if (userErr) return { success: false, error: userErr.message };

      const { data, error: teaErr } = await supabase
        .from('teachers')
        .insert({
          user_id: newUserId,
          subject,
          qualification,
          salary: Number(salary),
          joining_date
        })
        .select();

      if (teaErr) {
        await supabase.from('users').delete().eq('id', newUserId);
        return { success: false, error: teaErr.message };
      }
      return { success: true, data: data[0] };
    },

    update: async (id, teacherPayload) => {
      const { full_name, phone, subject, qualification, salary, joining_date, user_id } = teacherPayload;

      const { error: userErr } = await supabase
        .from('users')
        .update({ full_name, phone })
        .eq('id', user_id);
      if (userErr) return { success: false, error: userErr.message };

      const { data, error: teaErr } = await supabase
        .from('teachers')
        .update({ subject, qualification, salary: Number(salary), joining_date })
        .eq('id', id)
        .select();

      if (teaErr) return { success: false, error: teaErr.message };
      return { success: true, data: data[0] };
    },

    delete: async (id) => {
      const { data, error: fetchErr } = await supabase
        .from('teachers')
        .select('user_id')
        .eq('id', id)
        .single();
      if (fetchErr) return { success: false, error: fetchErr.message };

      const { error } = await supabase.from('users').delete().eq('id', data.user_id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  },

  // ── COURSES ────────────────────────────────────────────────
  courses: {
    list: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*, teachers(*, users(*))');
      if (error) throw new Error(error.message);
      return data.map(c => ({
        ...c,
        teacher_name: c.teachers?.users?.full_name || 'Unassigned'
      }));
    },

    create: async (course) => {
      const { data, error } = await supabase
        .from('courses')
        .insert([course])
        .select();
      if (error) return { success: false, error: error.message };
      return { success: true, data: data[0] };
    },

    update: async (id, course) => {
      const { data, error } = await supabase
        .from('courses')
        .update(course)
        .eq('id', id)
        .select();
      if (error) return { success: false, error: error.message };
      return { success: true, data: data[0] };
    },

    delete: async (id) => {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  },

  // ── ATTENDANCE ─────────────────────────────────────────────
  attendance: {
    list: async (date, roleFilter) => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, users(*)')
        .eq('date', date);
      if (error) throw new Error(error.message);
      return data.filter(a => a.users?.role === roleFilter);
    },

    listForUser: async (userId) => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },

    listForUserInDateRange: async (userId, startDate, endDate) => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },

    saveBulk: async (date, _roleFilter, records) => {
      const rows = records.map(r => ({
        user_id: r.id,
        date,
        status: r.status.toLowerCase()
      }));

      const { data, error } = await supabase
        .from('attendance')
        .upsert(rows, { onConflict: 'user_id,date' })
        .select();

      if (error) return { success: false, error: error.message };
      return { success: true, data };
    },

    delete: async (id) => {
      const { error } = await supabase.from('attendance').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  },

  // ── FEES ───────────────────────────────────────────────────
  fees: {
    list: async () => {
      const { data, error } = await supabase
        .from('fees')
        .select('*, students(*, users(*))');
      if (error) throw new Error(error.message);
      return data.map(f => ({
        ...f,
        student_name: f.students?.users?.full_name || 'Deleted Student',
        roll_number: f.students?.roll_number || ''
      }));
    },

    create: async (feeInvoice) => {
      const { data, error } = await supabase
        .from('fees')
        .insert([feeInvoice])
        .select();
      if (error) return { success: false, error: error.message };
      return { success: true, data: data[0] };
    },

    paymentsList: async (feeId) => {
      const { data, error } = await supabase
        .from('fee_payments')
        .select('*')
        .eq('fee_id', feeId);
      if (error) throw new Error(error.message);
      return data;
    },

    update: async (feeId, feeInvoice) => {
      const { data, error } = await supabase
        .from('fees')
        .update(feeInvoice)
        .eq('id', feeId)
        .select();
      if (error) return { success: false, error: error.message };
      return { success: true, data: data[0] };
    },

    updateStatus: async (feeId, newStatus) => {
      const { error } = await supabase
        .from('fees')
        .update({ status: newStatus })
        .eq('id', feeId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    },

    delete: async (feeId) => {
      const { error } = await supabase.from('fees').delete().eq('id', feeId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    },

    recordPayment: async (paymentPayload) => {
      const { fee_id, amount_paid, payment_mode, payment_date } = paymentPayload;

      // 1. Insert payment record
      const { data, error } = await supabase
        .from('fee_payments')
        .insert([{
          fee_id,
          amount_paid: Number(amount_paid),
          payment_mode: payment_mode.toLowerCase(),
          payment_date
        }])
        .select();

      if (error) return { success: false, error: error.message };

      // 2. Sum all payments to auto-update invoice status
      const { data: allPayments } = await supabase
        .from('fee_payments')
        .select('amount_paid')
        .eq('fee_id', fee_id);
      const totalPaid = (allPayments || []).reduce((sum, p) => sum + Number(p.amount_paid), 0);

      // 3. Mark paid if fully settled
      const { data: invoice } = await supabase
        .from('fees')
        .select('amount')
        .eq('id', fee_id)
        .single();
      if (invoice && totalPaid >= Number(invoice.amount)) {
        await supabase.from('fees').update({ status: 'paid' }).eq('id', fee_id);
      }

      return { success: true, data: data[0] };
    }
  },

  // ── DONATIONS ──────────────────────────────────────────────
  donations: {
    list: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },

    create: async (donation) => {
      const { data, error } = await supabase
        .from('donations')
        .insert([{
          donor_name: donation.donor_name,
          amount: Number(donation.amount),
          source: donation.source,
          payment_mode: donation.payment_mode.toLowerCase()
        }])
        .select();
      if (error) return { success: false, error: error.message };
      return { success: true, data: data[0] };
    },

    update: async (id, donation) => {
      const { data, error } = await supabase
        .from('donations')
        .update({
          donor_name: donation.donor_name,
          amount: Number(donation.amount),
          source: donation.source,
          payment_mode: donation.payment_mode.toLowerCase()
        })
        .eq('id', id)
        .select();
      if (error) return { success: false, error: error.message };
      return { success: true, data: data[0] };
    },

    delete: async (id) => {
      const { error } = await supabase.from('donations').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  },

  // ── CMS NOTICES ────────────────────────────────────────────
  cms: {
    list: async () => {
      const { data, error } = await supabase
        .from('cms_notices')
        .select('*')
        .order('published_date', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },

    create: async (notice) => {
      const { data, error } = await supabase
        .from('cms_notices')
        .insert([notice])
        .select();
      if (error) return { success: false, error: error.message };
      return { success: true, data: data[0] };
    },

    update: async (id, notice) => {
      const { data, error } = await supabase
        .from('cms_notices')
        .update(notice)
        .eq('id', id)
        .select();
      if (error) return { success: false, error: error.message };
      return { success: true, data: data[0] };
    },

    delete: async (id) => {
      const { error } = await supabase.from('cms_notices').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  }
};

// ─────────────────────────────────────────────────────────────
// UUID v4 helper
// ─────────────────────────────────────────────────────────────
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
