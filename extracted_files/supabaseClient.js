import { createClient } from '@supabase/supabase-js';

// 1. DYNAMIC CONFIGURATION LOADER
const getSavedConfig = () => {
  try {
    const config = localStorage.getItem('dar_ul_huda_supabase_config');
    if (config) {
      return JSON.parse(config);
    }
  } catch (e) {
    console.error("Error reading supabase config", e);
  }
  return {
    url: import.meta.env?.VITE_SUPABASE_URL || 'https://faosnkfbzehdpnyifnwt.supabase.co',
    anonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb3Nua2ZiemVoZHBueWlmbnd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1OTkzNjQsImV4cCI6MjA5MjE3NTM2NH0.vrW0KDNt23QAdQfuSt-wuqFCykmnPkHe3mLBEcnM5w0'
  };
};

const savedConfig = getSavedConfig();
let supabaseInstance = null;
let isLiveMode = false;

// Attempt to initialize Supabase client if config is present
if (savedConfig.url && savedConfig.anonKey) {
  try {
    supabaseInstance = createClient(savedConfig.url, savedConfig.anonKey);
    isLiveMode = true;
    console.log("Connected to live Supabase DB.");
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
    // Fallback to mock mode
    supabaseInstance = null;
    isLiveMode = false;
  }
} else {
  // No config – stay in mock mode
  supabaseInstance = null;
  isLiveMode = false;
}

const getUserProfile = async (authUser) => {
  if (!supabaseInstance || !authUser) return null;

  const { data: userData, error: roleError } = await supabaseInstance
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .limit(1)
    .maybeSingle();

  if (roleError) {
    throw roleError;
  }

  if (userData) {
    return {
      id: authUser.id,
      email: authUser.email,
      name: userData.email?.split('@')[0] || authUser.email?.split('@')[0] || 'User',
      role: userData.role
    };
  }

  await supabaseInstance.auth.signOut();
  throw new Error(
    `This login exists in Supabase Auth, but no matching app profile is linked in public.users for ${authUser.email}.`
  );
};

export const auth = {
  getCurrentUser: async () => {
    if (!isLiveMode || !supabaseInstance) return null;

    const { data, error } = await supabaseInstance.auth.getUser();
    if (error || !data?.user) return null;

    return getUserProfile(data.user);
  },

  signIn: async (email, password) => {
    if (!supabaseInstance) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await supabaseInstance.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    return getUserProfile(data.user);
  },

  signOut: async () => {
    if (supabaseInstance) {
      await supabaseInstance.auth.signOut();
    }
  },

  onAuthStateChange: (callback) => {
    if (!supabaseInstance) {
      return { unsubscribe: () => {} };
    }

    const { data } = supabaseInstance.auth.onAuthStateChange(callback);
    return data.subscription;
  }
};

// 2. AUTHORITATIVE MOCK DATABASE STRUCTURE (PERSISTED IN LOCALSTORAGE)
const MOCK_STORAGE_KEY = 'dar_ul_huda_authoritative_mock_db';

const defaultMockData = {
  users: [
    { id: 'u_admin', full_name: 'Administrator Panel', phone: '+92 300 0000000', role: 'admin', created_at: '2026-01-01T00:00:00Z', email: 'admin@darulhuda.edu' },
    { id: 'u_teacher1', full_name: 'Qari Muhammad Yousuf', phone: '+92 300 8887766', role: 'teacher', created_at: '2026-01-02T00:00:00Z', email: 'qari.yousuf@darulhuda.edu' },
    { id: 'u_teacher2', full_name: 'Ayesha Siddiqi', phone: '+92 321 5554433', role: 'teacher', created_at: '2026-01-03T00:00:00Z', email: 'ayesha.s@darulhuda.edu' },
    { id: 'u_student1', full_name: 'Zayd Ahmed', phone: '+92 300 1234567', role: 'student', created_at: '2026-01-04T00:00:00Z', email: 'parent.zayd@example.com' },
    { id: 'u_student2', full_name: 'Fatima Zahra', phone: '+92 333 9876543', role: 'student', created_at: '2026-01-05T00:00:00Z', email: 'saleem@example.com' },
    { id: 'u_student3', full_name: 'Yahya Khan', phone: '+92 321 4567890', role: 'student', created_at: '2026-01-06T00:00:00Z', email: 'imran@example.com' }
  ],
  students: [
    { id: 's1', user_id: 'u_student1', class: 'Grade 5', roll_number: 'DUH-2026-001', father_name: 'Riaz Ahmed', address: 'Block 4, Gulshan-e-Iqbal, Karachi' },
    { id: 's2', user_id: 'u_student2', class: 'Hifz', roll_number: 'DUH-2026-002', father_name: 'Muhammad Saleem', address: 'Defence Phase 6, Karachi' },
    { id: 's3', user_id: 'u_student3', class: 'Nazra', roll_number: 'DUH-2026-003', father_name: 'Imran Khan', address: 'Clifton Block 5, Karachi' }
  ],
  teachers: [
    { id: 't1', user_id: 'u_teacher1', subject: 'Hifz Instruction', qualification: 'Shahadat-ul-Almiya', salary: 45000, joining_date: '2020-08-15', email: 'qari.yousuf@darulhuda.edu', address: 'Karachi' },
    { id: 't2', user_id: 'u_teacher2', subject: 'Arabic Language', qualification: 'MA Arabic', salary: 38000, joining_date: '2022-09-01', email: 'ayesha.siddiqi@darulhuda.edu', address: 'Karachi' }
  ],
  courses: [
    { id: 'c1', title: 'Quran Memorization (Hifz)', description: 'Quranic recitation, rules of Tajweed, and complete memorization.', teacher_id: 't1' },
    { id: 'c2', title: 'Classical Arabic Grammar', description: 'Elementary morphology and syntax of the Arabic language.', teacher_id: 't2' }
  ],
  attendance: [
    { id: 'att1', user_id: 'u_student1', date: '2026-06-02', status: 'present' },
    { id: 'att2', user_id: 'u_student2', date: '2026-06-02', status: 'present' },
    { id: 'att3', user_id: 'u_student3', date: '2026-06-02', status: 'late' },
    { id: 'att4', user_id: 'u_teacher1', date: '2026-06-02', status: 'present' },
    { id: 'att5', user_id: 'u_teacher2', date: '2026-06-02', status: 'present' }
  ],
  fees: [
    { id: 'f1', student_id: 's1', amount: 3500, due_date: '2026-05-10', status: 'paid' },
    { id: 'f2', student_id: 's2', amount: 4500, due_date: '2026-05-10', status: 'paid' },
    { id: 'f3', student_id: 's3', amount: 3000, due_date: '2026-05-10', status: 'unpaid' },
    { id: 'f4', student_id: 's1', amount: 3500, due_date: '2026-06-10', status: 'unpaid' }
  ],
  fee_payments: [
    { id: 'fp1', fee_id: 'f1', amount_paid: 3500, payment_mode: 'cash', payment_date: '2026-05-08' },
    { id: 'fp2', fee_id: 'f2', amount_paid: 4500, payment_mode: 'bank', payment_date: '2026-05-05' }
  ],
  donations: [
    { id: 'd1', donor_name: 'Haji Abdul Majeed', amount: 50000, source: 'Mosque Hall Extension', payment_mode: 'bank', created_at: '2026-05-15T12:00:00Z' },
    { id: 'd2', donor_name: 'Anonymous Donor', amount: 15000, source: 'Orphan Sponsorship', payment_mode: 'cash', created_at: '2026-05-20T10:00:00Z' }
  ],
  cms_notices: [
    { id: 'n1', title: 'Eid-ul-Adha Holidays Announcement', content: 'Dar ul Huda will remain closed from June 15th to June 20th in observance of Eid-ul-Adha. Eid Mubarak!', urgency: 'High', published_date: '2026-06-01', is_active: true }
  ]
};

const getMockDb = () => {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(defaultMockData));
      return defaultMockData;
    }
    return JSON.parse(raw);
  } catch {
    return defaultMockData;
  }
};

const saveMockDb = (data) => {
  try {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Error saving mock db", e);
  }
};

// 3. UNIFIED SERVICE APIS
export const database = {
  isLive: () => isLiveMode,

  saveConfig: (url, anonKey) => {
    try {
      if (url && anonKey) {
        localStorage.setItem('dar_ul_huda_supabase_config', JSON.stringify({ url, anonKey }));
        supabaseInstance = createClient(url, anonKey);
        isLiveMode = true;
        return { success: true, message: "Successfully connected to Supabase Live!" };
      } else {
        localStorage.removeItem('dar_ul_huda_supabase_config');
        supabaseInstance = null;
        isLiveMode = false;
        return { success: true, message: "Reverted back to Sandbox Demo mode." };
      }
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  // USERS LOGS
  users: {
    list: async () => {
      if (isLiveMode && supabaseInstance) {
        const { data, error } = await supabaseInstance.from('users').select('*').order('full_name');
        if (!error) return data;
      }
      return getMockDb().users;
    },
    create: async (userPayload) => {
      const {
        full_name, phone, role, email,
        education, age, father_name, mother_name, address, cnic
      } = userPayload;

      if (isLiveMode && supabaseInstance) {
        const newId = uuidv4();
        const { data, error } = await supabaseInstance.from('users').insert({
          id: newId,
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
        }).select();

        if (error) return { success: false, error: error.message };
        return { success: true, data: data[0] };
      }

      const db = getMockDb();
      const newUser = {
        id: 'u_' + (db.users.length + 1) + '_' + Date.now(),
        full_name, phone, role, email,
        education, age: age ? Number(age) : null,
        father_name, mother_name, address, cnic,
        created_at: new Date().toISOString()
      };
      db.users.push(newUser);
      saveMockDb(db);
      return { success: true, data: newUser };
    },
    update: async (id, userPayload) => {
      const {
        full_name, phone, role, email,
        education, age, father_name, mother_name, address, cnic
      } = userPayload;

      if (isLiveMode && supabaseInstance) {
        const { data, error } = await supabaseInstance.from('users').update({
          full_name, phone, role, email,
          education, age: age ? Number(age) : null,
          father_name, mother_name, address, cnic
        }).eq('id', id).select();

        if (error) return { success: false, error: error.message };
        return { success: true, data: data[0] };
      }

      const db = getMockDb();
      const idx = db.users.findIndex(u => u.id === id);
      if (idx === -1) return { success: false, error: 'User not found' };
      db.users[idx] = {
        ...db.users[idx],
        full_name, phone, role, email,
        education, age: age ? Number(age) : null,
        father_name, mother_name, address, cnic
      };
      saveMockDb(db);
      return { success: true, data: db.users[idx] };
    },
    delete: async (id) => {
      if (isLiveMode && supabaseInstance) {
        const { error } = await supabaseInstance.from('users').delete().eq('id', id);
        if (error) return { success: false, error: error.message };
        return { success: true };
      }
      const db = getMockDb();
      db.users = db.users.filter(u => u.id !== id);
      saveMockDb(db);
      return { success: true };
    }
  },

  // STUDENTS DUAL TRANSACTION
  students: {
    list: async () => {
      if (isLiveMode && supabaseInstance) {
        // Query joins user attributes automatically
        const { data, error } = await supabaseInstance.from('students').select('*, users(*)');
        if (!error) return data.map(s => ({
          ...s,
          full_name: s.users?.full_name || '',
          phone: s.users?.phone || ''
        }));
        console.error("Supabase students error:", error);
      }
      const db = getMockDb();
      return db.students.map(s => {
        const u = db.users.find(usr => usr.id === s.user_id) || {};
        return {
          ...s,
          full_name: u.full_name || 'Deleted User',
          phone: u.phone || ''
        };
      });
    },
    create: async (studentPayload) => {
      const { full_name, phone, class_name, roll_number, father_name, address } = studentPayload;
      
      if (isLiveMode && supabaseInstance) {
        // 1. Create a dynamic user entry first (simulate dynamic credentials, link using UUID)
        const mockAuthId = uuidv4(); 
        const { error: userErr } = await supabaseInstance.from('users').insert({
          id: mockAuthId,
          full_name,
          phone,
          role: 'student',
          created_at: new Date().toISOString()
        }).select();
        
        if (userErr) return { success: false, error: userErr.message };

        // 2. Create Student
        const { data: studentRecord, error: studErr } = await supabaseInstance.from('students').insert({
          user_id: mockAuthId,
          class: class_name,
          roll_number,
          father_name,
          address,
          admission_date: new Date().toISOString()
        }).select();

        if (studErr) {
          // roll back user record
          await supabaseInstance.from('users').delete().eq('id', mockAuthId);
          return { success: false, error: studErr.message };
        }
        return { success: true, data: studentRecord[0] };
      }

      // Mock Transaction
      const db = getMockDb();
      const newUserId = 'u_student_' + (db.users.length + 1);
      const newUser = {
        id: newUserId,
        full_name,
        phone,
        role: 'student',
        email: `student.${roll_number.toLowerCase()}@example.com`,
        created_at: new Date().toISOString()
      };
      
      const newStudentId = 's' + (db.students.length + 1);
      const newStudent = {
        id: newStudentId,
        user_id: newUserId,
        class: class_name,
        roll_number,
        father_name,
        address,
        admission_date: new Date().toISOString()
      };

      db.users.push(newUser);
      db.students.push(newStudent);
      saveMockDb(db);
      return { success: true, data: { ...newStudent, full_name, phone } };
    },
    update: async (id, studentPayload) => {
      const { full_name, phone, class_name, roll_number, father_name, address, user_id } = studentPayload;
      
      if (isLiveMode && supabaseInstance) {
        const { error: userErr } = await supabaseInstance.from('users').update({ full_name, phone }).eq('id', user_id);
        if (userErr) return { success: false, error: userErr.message };

        const { data, error: studErr } = await supabaseInstance.from('students').update({
          class: class_name,
          roll_number,
          father_name,
          address
        }).eq('id', id).select();

        if (studErr) return { success: false, error: studErr.message };
        return { success: true, data: data[0] };
      }

      const db = getMockDb();
      const sIdx = db.students.findIndex(s => s.id === id);
      if (sIdx !== -1) {
        const student = db.students[sIdx];
        db.students[sIdx] = { ...student, class: class_name, roll_number, father_name, address };

        const uIdx = db.users.findIndex(u => u.id === student.user_id);
        if (uIdx !== -1) {
          db.users[uIdx] = { ...db.users[uIdx], full_name, phone };
        }
        saveMockDb(db);
        return { success: true, data: db.students[sIdx] };
      }
      return { success: false, error: "Student not found" };
    },
    delete: async (id) => {
      if (isLiveMode && supabaseInstance) {
        // Fetch student first to find user_id
        const { data } = await supabaseInstance.from('students').select('user_id').eq('id', id).single();
        if (data) {
          // Cascade references delete automatically, but users need clearing
          const { error } = await supabaseInstance.from('users').delete().eq('id', data.user_id);
          if (!error) return { success: true };
          return { success: false, error: error.message };
        }
      }
      const db = getMockDb();
      const student = db.students.find(s => s.id === id);
      if (student) {
        db.users = db.users.filter(u => u.id !== student.user_id);
        db.students = db.students.filter(s => s.id !== id);
        db.attendance = db.attendance.filter(a => a.user_id !== student.user_id);
        db.fees = db.fees.filter(f => f.student_id !== id);
        saveMockDb(db);
        return { success: true };
      }
      return { success: false, error: "Student not found" };
    }
  },

  // TEACHERS CRUD
  teachers: {
    list: async () => {
      if (isLiveMode && supabaseInstance) {
        const { data, error } = await supabaseInstance.from('teachers').select('*, users(*)');
        if (!error) return data.map(t => ({
          ...t,
          full_name: t.users?.full_name || '',
          phone: t.users?.phone || ''
        }));
      }
      const db = getMockDb();
      return db.teachers.map(t => {
        const u = db.users.find(usr => usr.id === t.user_id) || {};
        return {
          ...t,
          full_name: u.full_name || 'Deleted Staff',
          phone: u.phone || ''
        };
      });
    },
    create: async (teacherPayload) => {
      const { full_name, phone, subject, qualification, salary, joining_date } = teacherPayload;
      
      if (isLiveMode && supabaseInstance) {
        const mockAuthId = uuidv4();
        const { error: userErr } = await supabaseInstance.from('users').insert({
          id: mockAuthId,
          full_name,
          phone,
          role: 'teacher'
        });
        if (userErr) return { success: false, error: userErr.message };

        const { data, error: teaErr } = await supabaseInstance.from('teachers').insert({
          user_id: mockAuthId,
          subject,
          qualification,
          salary: Number(salary),
          joining_date
        }).select();

        if (teaErr) {
          await supabaseInstance.from('users').delete().eq('id', mockAuthId);
          return { success: false, error: teaErr.message };
        }
        return { success: true, data: data[0] };
      }

      const db = getMockDb();
      const newUserId = 'u_teacher_' + (db.users.length + 1);
      const newUser = {
        id: newUserId,
        full_name,
        phone,
        role: 'teacher',
        email: `instructor.${full_name.toLowerCase().replace(/ /g, '')}@darulhuda.edu`,
        created_at: new Date().toISOString()
      };
      
      const newTeacherId = 't' + (db.teachers.length + 1);
      const newTeacher = {
        id: newTeacherId,
        user_id: newUserId,
        subject,
        qualification,
        salary: Number(salary),
        joining_date
      };

      db.users.push(newUser);
      db.teachers.push(newTeacher);
      saveMockDb(db);
      return { success: true, data: { ...newTeacher, full_name, phone } };
    },
    update: async (id, teacherPayload) => {
      const { full_name, phone, subject, qualification, salary, joining_date, user_id } = teacherPayload;
      
      if (isLiveMode && supabaseInstance) {
        const { error: userErr } = await supabaseInstance.from('users').update({ full_name, phone }).eq('id', user_id);
        if (userErr) return { success: false, error: userErr.message };

        const { data, error: teaErr } = await supabaseInstance.from('teachers').update({
          subject,
          qualification,
          salary: Number(salary),
          joining_date
        }).eq('id', id).select();

        if (teaErr) return { success: false, error: teaErr.message };
        return { success: true, data: data[0] };
      }

      const db = getMockDb();
      const tIdx = db.teachers.findIndex(t => t.id === id);
      if (tIdx !== -1) {
        const teacher = db.teachers[tIdx];
        db.teachers[tIdx] = { ...teacher, subject, qualification, salary: Number(salary), joining_date };
        
        const uIdx = db.users.findIndex(u => u.id === teacher.user_id);
        if (uIdx !== -1) {
          db.users[uIdx] = { ...db.users[uIdx], full_name, phone };
        }
        saveMockDb(db);
        return { success: true, data: db.teachers[tIdx] };
      }
      return { success: false, error: "Teacher not found" };
    },
    delete: async (id) => {
      if (isLiveMode && supabaseInstance) {
        const { data } = await supabaseInstance.from('teachers').select('user_id').eq('id', id).single();
        if (data) {
          const { error } = await supabaseInstance.from('users').delete().eq('id', data.user_id);
          if (!error) return { success: true };
          return { success: false, error: error.message };
        }
      }
      const db = getMockDb();
      const teacher = db.teachers.find(t => t.id === id);
      if (teacher) {
        db.users = db.users.filter(u => u.id !== teacher.user_id);
        db.teachers = db.teachers.filter(t => t.id !== id);
        db.attendance = db.attendance.filter(a => a.user_id !== teacher.user_id);
        db.courses = db.courses.filter(c => c.teacher_id !== id);
        saveMockDb(db);
        return { success: true };
      }
      return { success: false, error: "Teacher not found" };
    }
  },

  // COURSES CRUD
  courses: {
    list: async () => {
      if (isLiveMode && supabaseInstance) {
        // Join course -> teacher -> users
        const { data, error } = await supabaseInstance.from('courses').select('*, teachers(*, users(*))');
        if (!error) return data.map(c => ({
          ...c,
          teacher_name: c.teachers?.users?.full_name || 'Unassigned'
        }));
      }
      const db = getMockDb();
      return db.courses.map(c => {
        const t = db.teachers.find(tea => tea.id === c.teacher_id) || {};
        const u = db.users.find(usr => usr.id === t.user_id) || {};
        return {
          ...c,
          teacher_name: u.full_name || 'Unassigned'
        };
      });
    },
    create: async (course) => {
      if (isLiveMode && supabaseInstance) {
        const { data, error } = await supabaseInstance.from('courses').insert([course]).select();
        if (!error) return { success: true, data: data[0] };
        return { success: false, error: error.message };
      }
      const db = getMockDb();
      const newCourse = {
        ...course,
        id: 'c' + (db.courses.length + 1)
      };
      db.courses.push(newCourse);
      saveMockDb(db);
      return { success: true, data: newCourse };
    },
    update: async (id, course) => {
      if (isLiveMode && supabaseInstance) {
        const { data, error } = await supabaseInstance.from('courses').update(course).eq('id', id).select();
        if (!error) return { success: true, data: data[0] };
        return { success: false, error: error.message };
      }
      const db = getMockDb();
      const idx = db.courses.findIndex(c => c.id === id);
      if (idx !== -1) {
        db.courses[idx] = { ...db.courses[idx], ...course };
        saveMockDb(db);
        return { success: true, data: db.courses[idx] };
      }
      return { success: false, error: "Course not found" };
    },
    delete: async (id) => {
      if (isLiveMode && supabaseInstance) {
        const { error } = await supabaseInstance.from('courses').delete().eq('id', id);
        if (!error) return { success: true };
        return { success: false, error: error.message };
      }
      const db = getMockDb();
      db.courses = db.courses.filter(c => c.id !== id);
      saveMockDb(db);
      return { success: true };
    }
  },

  // ATTENDANCE CRUD
  attendance: {
    list: async (date, roleFilter) => {
      if (isLiveMode && supabaseInstance) {
        // Query users by role and date in attendance ledger
        const { data, error } = await supabaseInstance.from('attendance').select('*, users(*)').eq('date', date);
        if (!error) {
          const filtered = data.filter(a => a.users?.role === roleFilter);
          return filtered;
        }
      }
      // Mock Fallback
      const db = getMockDb();
      const matchedLogs = db.attendance.filter(a => a.date === date);
      return matchedLogs.filter(a => {
        const u = db.users.find(usr => usr.id === a.user_id) || {};
        return u.role === roleFilter;
      });
    },
    saveBulk: async (date, roleFilter, records) => {
      // records: Array of { id: user_id, status } -- status is 'present' | 'absent' | 'late' (lowercase)
      if (isLiveMode && supabaseInstance) {
        const rows = records.map(r => ({
          user_id: r.id,
          date,
          status: r.status.toLowerCase()
        }));

        const { data, error } = await supabaseInstance
          .from('attendance')
          .upsert(rows, { onConflict: 'user_id,date' })
          .select();
        
        if (!error) return { success: true, data };
        return { success: false, error: error.message };
      }

      const db = getMockDb();
      // Clear previous attendance records for this date and role
      db.attendance = db.attendance.filter(a => {
        if (a.date === date) {
          const u = db.users.find(usr => usr.id === a.user_id) || {};
          return u.role !== roleFilter;
        }
        return true;
      });

      // Insert new rows
      records.forEach(r => {
        db.attendance.push({
          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          user_id: r.id,
          date,
          status: r.status.toLowerCase()
        });
      });

      saveMockDb(db);
      return { success: true };
    }
  },

  // FEES CRUD (separate billing invoice and payments) with status update capability
  fees: {
    list: async () => {
      if (isLiveMode && supabaseInstance) {
        const { data, error } = await supabaseInstance.from('fees').select('*, students(*, users(*))');
        if (!error) return data.map(f => ({
          ...f,
          student_name: f.students?.users?.full_name || 'Deleted Student',
          roll_number: f.students?.roll_number || ''
        }));
      }
      const db = getMockDb();
      return db.fees.map(f => {
        const s = db.students.find(stud => stud.id === f.student_id) || {};
        const u = db.users.find(usr => usr.id === s.user_id) || {};
        return {
          ...f,
          student_name: u.full_name || 'Deleted Student',
          roll_number: s.roll_number || ''
        };
      });
    },
    create: async (feeInvoice) => {
      if (isLiveMode && supabaseInstance) {
        const { data, error } = await supabaseInstance.from('fees').insert([feeInvoice]).select();
        if (!error) return { success: true, data: data[0] };
        return { success: false, error: error.message };
      }
      const db = getMockDb();
      const newFee = {
        ...feeInvoice,
        id: 'f' + (db.fees.length + 1),
        amount: Number(feeInvoice.amount),
        status: 'unpaid'
      };
      db.fees.push(newFee);
      saveMockDb(db);
      return { success: true, data: newFee };
    },
    paymentsList: async (feeId) => {
      if (isLiveMode && supabaseInstance) {
        const { data, error } = await supabaseInstance.from('fee_payments').select('*').eq('fee_id', feeId);
        if (!error) return data;
      }
      return getMockDb().fee_payments.filter(fp => fp.fee_id === feeId);
    },
    updateStatus: async (feeId, newStatus) => {
      if (isLiveMode && supabaseInstance) {
        const { error } = await supabaseInstance.from('fees').update({ status: newStatus }).eq('id', feeId);
        if (error) return { success: false, error: error.message };
        return { success: true };
      }
      const db = getMockDb();
      const idx = db.fees.findIndex(f => f.id === feeId);
      if (idx !== -1) {
        db.fees[idx].status = newStatus;
        saveMockDb(db);
        return { success: true };
      }
      return { success: false, error: 'Fee not found' };
    },
    recordPayment: async (paymentPayload) => {
      const { fee_id, amount_paid, payment_mode, payment_date } = paymentPayload;
      
      if (isLiveMode && supabaseInstance) {
        // 1. Post payment
        const { data, error } = await supabaseInstance.from('fee_payments').insert([{
          fee_id,
          amount_paid: Number(amount_paid),
          payment_mode: payment_mode.toLowerCase(),
          payment_date
        }]).select();

        if (error) return { success: false, error: error.message };

        // 2. Fetch all payments to sum up
        const { data: allPayments } = await supabaseInstance.from('fee_payments').select('amount_paid').eq('fee_id', fee_id);
        const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);

        // 3. Fetch invoice to check amount
        const { data: invoice } = await supabaseInstance.from('fees').select('amount').eq('id', fee_id).single();
        if (invoice && totalPaid >= Number(invoice.amount)) {
          // Update status to paid
          await supabaseInstance.from('fees').update({ status: 'paid' }).eq('id', fee_id);
        }
        return { success: true, data: data[0] };
      }

      const db = getMockDb();
      const newPayment = {
        id: 'fp' + (db.fee_payments.length + 1),
        fee_id,
        amount_paid: Number(amount_paid),
        payment_mode: payment_mode.toLowerCase(),
        payment_date
      };
      db.fee_payments.push(newPayment);

      // Check sum to resolve invoice Paid status
      const sum = db.fee_payments
        .filter(fp => fp.fee_id === fee_id)
        .reduce((s, fp) => s + Number(fp.amount_paid), 0);
        
      const idx = db.fees.findIndex(f => f.id === fee_id);
      if (idx !== -1) {
        const invoice = db.fees[idx];
        if (sum >= Number(invoice.amount)) {
          db.fees[idx].status = 'paid';
        }
      }
      saveMockDb(db);
      return { success: true, data: newPayment };
    }
  },

  // DONATIONS CRUD (donor_name, amount, source, payment_mode)
  donations: {
    list: async () => {
      if (isLiveMode && supabaseInstance) {
        const { data, error } = await supabaseInstance.from('donations').select('*').order('created_at', { ascending: false });
        if (!error) return data;
      }
      return getMockDb().donations;
    },
    create: async (donation) => {
      if (isLiveMode && supabaseInstance) {
        const { data, error } = await supabaseInstance.from('donations').insert([{
          donor_name: donation.donor_name,
          amount: Number(donation.amount),
          source: donation.source,
          payment_mode: donation.payment_mode.toLowerCase()
        }]).select();
        if (!error) return { success: true, data: data[0] };
        return { success: false, error: error.message };
      }
      const db = getMockDb();
      const newDonation = {
        id: 'd' + (db.donations.length + 1),
        donor_name: donation.donor_name,
        amount: Number(donation.amount),
        source: donation.source,
        payment_mode: donation.payment_mode.toLowerCase(),
        created_at: new Date().toISOString()
      };
      db.donations.push(newDonation);
      saveMockDb(db);
      return { success: true, data: newDonation };
    }
  },

  // CMS NOTICE TIMELINE (preserved)
  cms: {
    list: async () => {
      if (isLiveMode && supabaseInstance) {
        const { data, error } = await supabaseInstance.from('cms_notices').select('*').order('published_date', { ascending: false });
        if (!error) return data;
      }
      return getMockDb().cms_notices;
    },
    create: async (notice) => {
      if (isLiveMode && supabaseInstance) {
        const { data, error } = await supabaseInstance.from('cms_notices').insert([notice]).select();
        if (!error) return { success: true, data: data[0] };
        return { success: false, error: error.message };
      }
      const db = getMockDb();
      const newNotice = {
        ...notice,
        id: 'n' + (db.cms_notices.length + 1),
        published_date: new Date().toISOString().split('T')[0],
        is_active: true
      };
      db.cms_notices.unshift(newNotice);
      saveMockDb(db);
      return { success: true, data: newNotice };
    },
    delete: async (id) => {
      if (isLiveMode && supabaseInstance) {
        const { error } = await supabaseInstance.from('cms_notices').delete().eq('id', id);
        if (!error) return { success: true };
        return { success: false, error: error.message };
      }
      const db = getMockDb();
      db.cms_notices = db.cms_notices.filter(n => n.id !== id);
      saveMockDb(db);
      return { success: true };
    }
  }
};

// UUID helper generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
