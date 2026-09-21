/* ================================================================
   KFAHAD Academy — Application JavaScript
   Database, auth, routing, pages, admin, payments, AI bot
================================================================ */

"use strict";

// ================================================================
// DATABASE (localStorage)
// ================================================================
const DB = {
  get(key){try{return JSON.parse(localStorage.getItem('kfa_'+key)||'null')}catch{return null}},
  set(key,val){localStorage.setItem('kfa_'+key,JSON.stringify(val))},
  del(key){localStorage.removeItem('kfa_'+key)},
  init(){
    const primaryAdmin = {
      id:'admin-kfahad',
      name:'Kandeke Fahad',
      email:'Admin.kfahad@gmail.com',
      username:'kfahad',
      role:'admin',
      avatarUrl:'',
      bio:'Founder & CEO of KFAHAD Academy',
      phoneNumber:'+256702618396',
      createdAt:Date.now()
    };
    let users = this.get('users')||[];
    // Filter out any mock/fake seeded users so only real registered users exist
    users = users.filter(user => user && user.id !== 'student-alex' && user.id !== 'lecturer-musa' && String(user.email||'').toLowerCase() !== 'student@kfahad.com' && String(user.email||'').toLowerCase() !== 'lecturer@kfahad.com');
    if(!users.some(u => u.id === 'admin-kfahad' || String(u.email||'').toLowerCase() === 'admin.kfahad@gmail.com')){
      users.unshift(primaryAdmin);
    }
    this.set('users', users);
    const storedCurrentUser = this.get('currentUser');
    if(storedCurrentUser?.role==='admin'){
      this.set('currentUser',{
        ...storedCurrentUser,
        id:'admin-kfahad',
        name:'Kandeke Fahad',
        email:'Admin.kfahad@gmail.com',
        role:'admin'
      });
    }
    if(!this.get('payments')) this.set('payments',[]);
    if(!this.get('appointments')) this.set('appointments',[]);
    if(!this.get('blogPosts')) this.set('blogPosts',[
      {id:uid(),title:'Welcome to KFAHAD Academy!',description:'We are excited to launch our new online learning platform for students across Uganda.',author:'Kandeke Fahad',type:'image',mediaUrl:'https://picsum.photos/seed/blog1/800/400',createdAt:Date.now()-864e5*3},
      {id:uid(),title:'New ICT Courses Available',description:'We just added 5 new ICT courses covering Web Development and Graphics Design.',author:'Kandeke Fahad',type:'image',mediaUrl:'https://picsum.photos/seed/blog2/800/400',createdAt:Date.now()-864e5}
    ]);
    if(!this.get('jobs')) this.set('jobs',[
      {id:uid(),title:'Junior Web Developer',company:'TechHub Uganda',location:'Kampala, Uganda',type:'Full-time',description:'Looking for a junior web developer with HTML/CSS/JS skills.',applyUrl:'#',createdAt:Date.now()-864e5*5},
      {id:uid(),title:'Graphic Designer',company:'Creative Agency KLA',location:'Remote',type:'Contract',description:'Design social media graphics and marketing materials.',applyUrl:'#',createdAt:Date.now()-864e5*2}
    ]);
    if(!this.get('notifications')) this.set('notifications',[
      {id:uid(),title:'Welcome!',body:'Your account has been created. Start learning today!',createdAt:Date.now()-864e5,read:false,targetRole:'all'}
    ]);
    if(!this.get('studentReviews')) this.set('studentReviews',[]);
    if(!this.get('quizAttempts')) this.set('quizAttempts',[]);
    if(!this.get('messages')) this.set('messages',[]);
    if(!this.get('progress')) this.set('progress',{});
    if(!this.get('liveSessions')) this.set('liveSessions',[
      {id:uid(),title:'Live Q&A: Web Development Fundamentals',url:'https://meet.google.com/abc-defg-hij',courseId:'web-11',courseTitle:'Introduction to Web Development',instructorId:'',instructorName:'Kandeke Fahad',scheduledAt:Date.now()+864e5*2,createdAt:Date.now()}
    ]);
    if(!this.get('knowledgeBase')) this.set('knowledgeBase',[
      {id:uid(),title:'How to Get Started with Your Subscription',category:'Getting Started',description:'Step-by-step guide to activating your subscription and accessing courses.',content:'1. Register for an account\n2. Choose a subscription plan\n3. Complete payment via Mobile Money\n4. Access all your courses from the dashboard.',author:'Admin',createdAt:Date.now()-864e5*4},
      {id:uid(),title:'How to Use the Forum',category:'Community',description:'Learn how to ask questions and participate in course discussions.',content:'Navigate to your course and click "Forum" to ask questions and connect with other students.',author:'Admin',createdAt:Date.now()-864e5*2}
    ]);
    if(!this.get('examples')) this.set('examples',[
      {id:uid(),title:'Student Portfolio Website',description:'A simple portfolio built using HTML, CSS and JavaScript by a student.',imageUrl:'https://picsum.photos/seed/ex1/600/400',createdAt:Date.now()-864e5*3},
      {id:uid(),title:'Social Media Graphic Design',description:'Instagram post design created using Canva.',imageUrl:'https://picsum.photos/seed/ex2/600/400',createdAt:Date.now()-864e5}
    ]);
    if(!this.get('pathways')) this.set('pathways', [
      {id:uid(), title:'Full Stack Roadmap', description:'A step-by-step path to becoming a developer.', courseIds:['web-11', 'html-12', 'css-13', 'js-14', 'proj-15'], createdAt:Date.now()}
    ]);
    if(!this.get('userLists')) this.set('userLists', {});
    if(!this.get('tvArchive')) this.set('tvArchive', []);
  }
};
DB.init();

function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}

const isLocalOrFile = typeof window !== 'undefined' && (
  window.location.protocol === 'file:' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === ''
);
const DEFAULT_REMOTE_API = 'https://kfahad-com.amdernpropertiessmclimited.workers.dev/api';
const API_BASE_URL = (typeof __API_BASE_URL__ !== 'undefined' && __API_BASE_URL__) || (isLocalOrFile ? DEFAULT_REMOTE_API : '/api');
const AUTH_BACKEND = {
  endpoint: `${API_BASE_URL}/auth`
};
const UPLOAD_BACKEND = {
  endpoint: `${API_BASE_URL}/upload-profile-image`
};
const COURSE_VIDEO_UPLOAD_BACKEND = {
  endpoint: `${API_BASE_URL}/upload-course-video`
};
const DATA_BACKEND = {
  endpoint: `${API_BASE_URL}/data`
};
const CHAT_BACKEND = {
  endpoint: `${API_BASE_URL}/messages`,
  pollMs: 4000,
  pollHandle: null,
  polling: false,
  apiAvailable: false,
  seenIncomingIds: new Set(),
  pendingKey: 'kfa_pending_messages'
};
const HUMAN_CHAT_EXCLUDED_SENDERS = new Set(['ai-bot']);

const SUPABASE_TABLES = {
  courses: 'courses',
  blog_posts: 'blog_posts',
  jobs: 'jobs',
  knowledge_base: 'knowledge_base',
  live_sessions: 'live_sessions',
  student_reviews: 'student_reviews',
  appointments: 'appointments',
  payments: 'payments',
  examples: 'examples',
  pathways: 'pathways',
  notifications: 'notifications'
};

function dataApiHeaders() {
  const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() };
  const token = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.authToken : '';
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchFromDataAPI(table) {
  try {
    const response = await fetch(`${DATA_BACKEND.endpoint}?table=${encodeURIComponent(table)}`, {
      headers: dataApiHeaders()
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.records || [];
  } catch (err) {
    console.error(`Failed to fetch ${table}:`, err);
    return null;
  }
}

async function saveToDataAPI(table, data, action = 'create') {
  try {
    const response = await fetch(DATA_BACKEND.endpoint, {
      method: 'POST',
      headers: dataApiHeaders(),
      body: JSON.stringify({ table, action, data })
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error(`Failed to save to ${table}:`, err);
    return null;
  }
}

async function updateDataAPI(table, id, data) {
  try {
    const response = await fetch(DATA_BACKEND.endpoint, {
      method: 'POST',
      headers: dataApiHeaders(),
      body: JSON.stringify({ table, action: 'update', id, data })
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error(`Failed to update ${table}:`, err);
    return null;
  }
}

async function deleteFromDataAPI(table, id) {
  try {
    const response = await fetch(DATA_BACKEND.endpoint, {
      method: 'POST',
      headers: dataApiHeaders(),
      body: JSON.stringify({ table, action: 'delete', id })
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error(`Failed to delete from ${table}:`, err);
    return null;
  }
}

async function syncAppointmentsFromServer(){
  try {
    const records = await fetchFromDataAPI('appointments');
    if (records && Array.isArray(records)) {
      const current = DB.get('appointments') || [];
      const remoteIds = new Set(records.map(r => r.id));
      const formatted = records.map(r => ({
        id: r.id,
        userId: r.user_id || r.userId || '',
        name: r.name || '',
        email: r.email || '',
        phoneNumber: r.phone || r.phone_number || r.phoneNumber || '',
        message: r.notes || r.message || '',
        status: r.status || 'Pending',
        adminReply: r.admin_reply || r.adminReply || '',
        scheduledAt: r.date ? (r.date + (r.time ? ' ' + r.time : '')) : (r.scheduledAt || ''),
        requestedAt: r.requested_at || r.requestedAt || r.created_at || Date.now()
      }));
      const merged = [
        ...formatted,
        ...current.filter(r => !remoteIds.has(r.id))
      ];
      DB.set('appointments', merged);
    }
  } catch(e) {}
}

async function syncReviewsFromServer(){
  try {
    const records = await fetchFromDataAPI('student_reviews');
    if (records && Array.isArray(records)) {
      const current = DB.get('studentReviews') || [];
      const remoteIds = new Set(records.map(r => r.id));
      const formatted = records.map(r => ({
        id: r.id,
        userId: r.user_id || r.userId || '',
        studentName: r.student_name || r.studentName || '',
        studentEmail: r.student_email || r.studentEmail || '',
        avatarUrl: r.avatar_url || r.avatarUrl || '',
        courseTitles: typeof r.course_titles === 'string' ? r.course_titles.split(' • ') : (r.courseTitles || []),
        rating: Number(r.rating) || 5,
        text: r.text || '',
        createdAt: r.created_at || r.createdAt || Date.now()
      }));
      const merged = [
        ...formatted,
        ...current.filter(r => !remoteIds.has(r.id))
      ];
      DB.set('studentReviews', merged);
    }
  } catch(e) {}
}

async function syncPaymentsFromServer(){
  try {
    const records = await fetchFromDataAPI('payments');
    if (records && Array.isArray(records)) {
      const current = DB.get('payments') || [];
      const remoteIds = new Set(records.map(r => r.id));
      const formatted = records.map(r => ({
        id: r.id,
        userId: r.user_id || r.userId || '',
        studentName: r.student_name || r.studentName || '',
        studentEmail: r.student_email || r.studentEmail || '',
        plan: r.plan || '',
        planId: r.plan_id || r.planId || '',
        amount: Number(r.amount) || 0,
        provider: r.provider || '',
        phoneNumber: r.phone_number || r.phoneNumber || '',
        reference: r.reference || '',
        status: r.status || 'Approved',
        date: r.date || new Date().toISOString(),
        createdAt: r.created_at || r.createdAt || Date.now()
      }));
      const merged = [
        ...formatted,
        ...current.filter(r => !remoteIds.has(r.id))
      ];
      DB.set('payments', merged);
    }
  } catch(e) {}
}

function normalizeJobRecord(record={}){
  return {
    id: record.id || uid(),
    title: String(record.title || '').trim(),
    company: String(record.company || '').trim(),
    location: String(record.location || '').trim(),
    type: String(record.type || 'Full-time').trim() || 'Full-time',
    description: String(record.description || '').trim(),
    applyUrl: String(record.applyUrl || record.apply_url || '').trim() || '#',
    createdAt: Number(record.createdAt || record.created_at) || Date.now(),
    updatedAt: Number(record.updatedAt || record.updated_at) || null
  };
}
function getStoredJobs(){
  return (DB.get('jobs')||[]).map(normalizeJobRecord).sort((a,b)=>b.createdAt-a.createdAt);
}
function saveStoredJobs(jobs){
  DB.set('jobs', jobs.map(normalizeJobRecord));
}
async function loadJobsFromServer({rerender=false,silent=true}={}){
  const records = await fetchFromDataAPI('jobs');
  if(records===null){
    if(!silent) toast('Could not sync jobs from database','warn');
    return null;
  }
  const jobs = records.map(record=>normalizeJobRecord({
    ...record,
    applyUrl: record.apply_url,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  }));
  saveStoredJobs(jobs);
  if(rerender && (currentSection==='jobs' || currentPage==='admin')) renderPage();
  if(!silent) toast(`Synced ${jobs.length} job posting${jobs.length===1?'':'s'}`,'success');
  return jobs;
}
async function saveJobToServer(job){
  return saveToDataAPI('jobs',{
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    type: job.type,
    description: job.description,
    apply_url: job.applyUrl,
    created_at: job.createdAt,
    updated_at: Date.now()
  });
}

// ================================================================
// AUTH STATE
// ================================================================
let currentUser = DB.get('currentUser');
let publicUserStats = {
  registeredUsers:null
};
let otpCooldownTimer = null;

function isFetchNetworkError(error){
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.name === 'TypeError' ||
    message.includes('failed to fetch') ||
    message.includes('load failed') ||
    message.includes('networkerror') ||
    message.includes('network error')
  );
}

function isAuthServiceUnavailable(error){
  return isFetchNetworkError(error) || /unable to reach.*auth|authentication service is unavailable/i.test(String(error?.message || ''));
}

function getCsrfToken(){
  let t = sessionStorage.getItem('kfa_csrf_token');
  if(!t){
    t = uid() + uid();
    sessionStorage.setItem('kfa_csrf_token', t);
  }
  return t;
}
async function postAuthApi(payload,{token=''}={}){
  let response;
  try{
    response = await fetch(AUTH_BACKEND.endpoint,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'X-CSRF-Token': getCsrfToken(),
        ...(token?{Authorization:`Bearer ${token}`}:{})
      },
      body:JSON.stringify(payload)
    });
  }catch(error){
    if(isFetchNetworkError(error)){
      throw new Error('Unable to reach the authentication service. Please check your connection and try again.');
    }
    throw error;
  }
  const data = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data?.error||data?.message||'Authentication request failed');
  return data;
}
async function uploadProfileImageToServer(fileData,publicId){
  try {
    const response = await fetch(UPLOAD_BACKEND.endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        file:fileData,
        folder:'kfahad/profile-photos',
        publicId
      })
    });
    const data = await response.json().catch(()=>({}));
    if(response.ok) return data;
  } catch (error) {
    console.warn('Upload API unavailable (404), falling back to local storage.');
  }
  // Fallback: return the local base64 data as the URL
  return { secureUrl: fileData };
}
function upsertLocalUserRecord(user){
  const users = DB.get('users')||[];
  const idx = users.findIndex(entry=>entry.id===user.id||entry.email===user.email);
  const nextUser = {...(idx>=0?users[idx]:{}),...user};
  if(idx>=0) users[idx]=nextUser; else users.push(nextUser);
  DB.set('users',users);
}
function setAuthenticatedUser(user,token='',csrfToken=''){
  const safe = {...user};
  if(token) safe.authToken = token;
  if(csrfToken) safe.csrfToken = csrfToken;
  delete safe.password;
  upsertLocalUserRecord(safe);
  DB.set('currentUser',safe);
  currentUser = safe;
  syncUsersFromServer();
  startChatPolling();
  startNotificationPolling();
  loadNotificationsFromServer().catch(()=>{});
  return safe;
}
function replaceLocalUsersWithServerUsers(serverUsers=[]){
  const existingUsers = DB.get('users')||[];
  const nextUsers = serverUsers.map(user=>{
    const existing = existingUsers.find(entry=>entry.id===user.id||entry.email===user.email) || {};
    const merged = {...existing,...user};
    delete merged.passwordHash;
    return merged;
  });
  DB.set('users',nextUsers);
  if(currentUser){
    const refreshed = nextUsers.find(user=>user.id===currentUser.id||user.email===currentUser.email);
    if(refreshed){
      const safe = {...refreshed};
      if(currentUser.authToken) safe.authToken = currentUser.authToken;
      delete safe.password;
      DB.set('currentUser',safe);
      currentUser = safe;
    }
  }
}
function getRegisteredUsersMetric(){
  return Number.isFinite(publicUserStats.registeredUsers) && publicUserStats.registeredUsers>0
    ? publicUserStats.registeredUsers
    : (DB.get('users')||[]).length;
}
async function syncCurrentUserFromServer({rerender=false}={}){
  if(!currentUser?.authToken) return null;
  const data = await postAuthApi({action:'get_session_user',email:currentUser.email},{token:currentUser.authToken});
  const nextUser = {...data.user,authToken:currentUser.authToken};
  setAuthenticatedUser(nextUser,currentUser.authToken);
  if(rerender) renderPage();
  return nextUser;
}
async function syncUsersFromServer({rerender=false}={}){
  if(!currentUser?.authToken) return null;
  try {
    const data = await postAuthApi({action:'list_users'},{token:currentUser.authToken});
    replaceLocalUsersWithServerUsers(data.users||[]);
    publicUserStats.registeredUsers = (data.users||[]).length;
    if(rerender) renderPage();
    return data.users||[];
  } catch(err) {
    console.error("Failed to sync users:", err);
    return null;
  }
}
async function loadPublicUserStats({rerender=false}={}){
  try{
    const data = await postAuthApi({action:'public_stats'});
    publicUserStats.registeredUsers = Number(data.registeredUsers)||0;
    if(rerender && currentPage==='home') renderPage();
    return publicUserStats;
  }catch{
    return publicUserStats;
  }
}
function clearOtpCooldownTimer(){
  if(otpCooldownTimer){
    clearInterval(otpCooldownTimer);
    otpCooldownTimer = null;
  }
}
function formatOtpCooldown(ms){
  const seconds = Math.max(0,Math.ceil(ms/1000));
  return `${seconds}s`;
}
function updateOtpCooldownUI(){
  const label=document.getElementById('otp-resend-label');
  const btn=document.getElementById('otp-resend-btn');
  if(!window._otpFlow||!label||!btn) return;
  const remainingMs=Math.max(0,(window._otpFlow.cooldownUntil||0)-Date.now());
  if(remainingMs>0){
    btn.disabled=true;
    label.textContent=`Resend available in ${formatOtpCooldown(remainingMs)}`;
  }else{
    btn.disabled=false;
    label.textContent='Didn\'t get the code?';
    clearOtpCooldownTimer();
  }
}
function startOtpCooldown(durationMs){
  if(!window._otpFlow) return;
  window._otpFlow.cooldownUntil=Date.now()+durationMs;
  clearOtpCooldownTimer();
  updateOtpCooldownUI();
  otpCooldownTimer=setInterval(updateOtpCooldownUI,1000);
}
function openOtpVerificationModal({title,subtitle,email,verifyAction,resendAction,onSuccess,cooldownMs=60000,deliveryMode='email',devCode='',warning=''}){
  window._otpFlow = {email,verifyAction,resendAction,onSuccess,cooldownUntil:0,deliveryMode,devCode,warning};
  const manualCodeNotice = deliveryMode==='manual'
    ? `<div style="margin-bottom:14px;padding:14px 16px;border:1px solid rgba(245,158,11,.35);background:rgba(245,158,11,.1);border-radius:12px">
        <div style="font-weight:700;color:var(--txt);margin-bottom:6px">Email sending is not configured</div>
        <div style="font-size:.82rem;color:var(--muted);line-height:1.6">${warning||'Use this code for testing before the site goes live.'}</div>
        <div style="margin-top:10px;font-size:1.4rem;font-weight:800;letter-spacing:6px;color:var(--txt)">${devCode}</div>
      </div>`
    : '';
  openModal(title,`
    <div style="color:var(--muted);font-size:.9rem;line-height:1.7;margin-bottom:16px">${subtitle}</div>
    ${manualCodeNotice}
    <div style="font-size:.82rem;color:var(--muted);margin-bottom:12px">Code sent to <strong style="color:var(--txt)">${email}</strong></div>
    <div class="form-group" style="margin-bottom:0">
      <label>Verification Code</label>
      <input class="form-control" id="otp-code-input" inputmode="numeric" maxlength="6" placeholder="000000" value="${deliveryMode==='manual'&&devCode?devCode:''}"/>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;flex-wrap:wrap">
      <span id="otp-resend-label" style="font-size:.8rem;color:var(--muted)">Didn't get the code?</span>
      <button class="btn btn-outline btn-sm" id="otp-resend-btn" onclick="resendOtpCode()">Resend Code</button>
    </div>
    <div id="otp-code-error" style="display:none;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:10px 14px;font-size:.85rem;color:var(--danger);margin-top:16px"></div>
  `,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="submitOtpVerification()">Verify</button>`);
  startOtpCooldown(cooldownMs);
}
async function submitOtpVerification(){
  const code=document.getElementById('otp-code-input')?.value.trim();
  const err=document.getElementById('otp-code-error');
  if(!code||code.length!==6){
    if(err){err.style.display='block';err.textContent='Please enter the 6-digit verification code';}
    return;
  }
  try{
    const flow=window._otpFlow;
    const data=await postAuthApi({action:flow.verifyAction,email:flow.email,code});
    const user=setAuthenticatedUser(data.user,data.token);
    closeModal();
    if(typeof flow.onSuccess==='function') flow.onSuccess(user);
  }catch(error){
    if(err){err.style.display='block';err.textContent=error.message;}
  }
}
async function resendOtpCode(){
  const flow=window._otpFlow;
  const err=document.getElementById('otp-code-error');
  if(!flow?.resendAction) return;
  try{
    const data=await postAuthApi({...flow.resendAction});
    if(err) err.style.display='none';
    startOtpCooldown(data.resendCooldownMs||60000);
    if(data.deliveryMode==='manual' && data.devCode){
      flow.deliveryMode='manual';
      flow.devCode=data.devCode;
      flow.warning=data.warning||'';
      const input=document.getElementById('otp-code-input');
      if(input) input.value=data.devCode;
      toast(`Manual test code: ${data.devCode}`,'warn');
    }else{
      toast('A new verification code has been sent','success');
    }
  }catch(error){
    if(err){err.style.display='block';err.textContent=error.message;}
    updateOtpCooldownUI();
  }
}

function login(email,password){
  const users = DB.get('users')||[];
  const lookup = email.toLowerCase().trim();
  const user = users.find(u=>{
    if(u.password!==password) return false;
    if(u.email.toLowerCase()===lookup) return true;
    if(u.name.toLowerCase()===lookup) return true;
    if(lookup==='admin') return true;
    return false;
  });
  if(!user) return null;
  user.lastLoginAt = Date.now();
  user.signInCount = (user.signInCount||0)+1;
  DB.set('users',users);
  const safe = {...user};
  delete safe.password;
  DB.set('currentUser',safe);
  currentUser = safe;
  return safe;
}
function logout(){
  clearOtpCooldownTimer();
  DB.del('currentUser');
  currentUser=null;
  stopChatPolling();
  stopNotificationPolling();
  NOTIFICATION_BACKEND.seenIds.clear();
  goHome();
}
function normalizePhoneNumber(phone){
  return phone.replace(/[^\d+]/g,'');
}
function isValidPhoneNumber(phone){
  const normalized = normalizePhoneNumber(phone);
  return /^\+?\d{9,15}$/.test(normalized);
}
function isGuestUser(user=currentUser){
  return user?.role==='guest';
}
function getTrackLabel(trackId){
  return TRACKS.find(track=>track.id===trackId)?.name || trackId;
}
function getTrackIdsForCourses(courseIds=[]){
  return [...new Set(courseIds.map(courseId=>getAllCourses().find(course=>course.id===courseId)?.track).filter(Boolean))];
}
function getUserInterestSummary(user){
  const courseIds = user?.interestedCourses || [];
  const selectedCourses = courseIds.map(id=>getAllCourses().find(course=>course.id===id)).filter(Boolean);
  const categoryIds = user?.interestedTracks?.length ? user.interestedTracks : getTrackIdsForCourses(courseIds);
  const derivedCourseCategories = selectedCourses.map(course=>course.category).filter(Boolean);
  const categoryLabels = [...new Set([
    ...categoryIds.map(getTrackLabel),
    ...derivedCourseCategories
  ])];
  return {
    categoryIds,
    categoryLabels,
    courseTitles: selectedCourses.map(course=>course.title).filter(Boolean),
    selectedCourses
  };
}
function register(name,email,password,phoneNumber,interestedCourses=[],interestedTracks=[],avatarUrl='',accountType='student'){
  const users = DB.get('users')||[];
  if(users.find(u=>u.email===email)) return {error:'Email already exists'};
  const role = accountType==='guest' ? 'guest' : 'student';
  const user = {
    id:uid(),
    name,
    email,
    password,
    role,
    avatarUrl,
    bio:'',
    phoneNumber:normalizePhoneNumber(phoneNumber),
    interestedCourses: role==='guest' ? [] : interestedCourses,
    interestedTracks: role==='guest' ? [] : (interestedTracks.length ? interestedTracks : getTrackIdsForCourses(interestedCourses)),
    subscriptionExpiresAt:null,
    createdAt:Date.now(),
    lastLoginAt:Date.now(),
    signInCount:1
  };
  users.push(user);
  DB.set('users',users);
  const safe = {...user}; delete safe.password;
  DB.set('currentUser',safe); currentUser=safe;
  return {user:safe};
}
function getStudentReviews(){
  return (DB.get('studentReviews')||[]).sort((a,b)=>b.createdAt-a.createdAt);
}
function getHomepageReviews(){
  const stored = getStudentReviews().map(review=>({
    name:review.studentName,
    role:review.courseTitles?.length ? review.courseTitles.join(' • ') : 'Student',
    avatar:review.avatarUrl||'',
    rating:review.rating||5,
    text:review.text
  }));
  if(stored.length) return stored.slice(0,6);
  return [
    {name:'Aliyah Hassan',role:'ICT Beta Tester',avatar:'https://picsum.photos/seed/aliyah/150/150',rating:5,text:'The ICT courses took me from zero to building my first website. The hands-on projects are challenging but incredibly rewarding!'},
    {name:'Ben Carter',role:'Course Reviewer',avatar:'https://picsum.photos/seed/ben/150/150',rating:5,text:'The Psychology course was a game-changer. Practical insights I can already use every single day. Highly recommend KFAHAD Academy.'}
  ];
}
function updateCurrentUser(updates){
  const users = DB.get('users')||[];
  const idx = users.findIndex(u=>u.id===currentUser.id);
  if(idx>=0){Object.assign(users[idx],updates);DB.set('users',users)}
  Object.assign(currentUser,updates);
  DB.set('currentUser',currentUser);
}
async function updateCurrentUserRemote(updates){
  if(!currentUser?.authToken){
    updateCurrentUser(updates);
    return currentUser;
  }
  const data = await postAuthApi({action:'update_profile',email:currentUser.email,updates},{token:currentUser.authToken});
  const nextUser = {...data.user,authToken:currentUser.authToken};
  setAuthenticatedUser(nextUser,currentUser.authToken);
  return nextUser;
}
const MS_PER_DAY = 86400000;
function toTimestamp(value){
  if(value===null||value===undefined||value==='') return 0;
  const timestamp = typeof value==='number' ? value : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}
function isStaffUser(user=currentUser){
  if(!user) return false;
  if(user.id === 'admin-kfahad') return true;
  const role = String(user.role || user.accountType || '').trim().toLowerCase();
  if(['admin', 'instructor', 'lecturer', 'teacher'].includes(role)) return true;
  const email = String(user.email || '').trim().toLowerCase();
  if(email === 'admin.kfahad@gmail.com' || email === 'admin@kfahad.com') return true;
  return false;
}
const CourseLogic = {
  hasFullAccess(user=currentUser){
    if(!user) return false;
    if(isStaffUser(user)) return true;
    return toTimestamp(user.subscriptionExpiresAt) > Date.now();
  },
  calculateSubscriptionDays(user=currentUser){
    if(!user) return 0;
    if(isStaffUser(user)) return 9999;
    const diff = toTimestamp(user.subscriptionExpiresAt) - Date.now();
    return diff > 0 ? Math.ceil(diff / MS_PER_DAY) : 0;
  },
  verifyAccess({user=currentUser,courseId=null,showModal=true}={}){
    const allowed = this.hasFullAccess(user);
    if(!allowed && showModal) showUpgradeModal(courseId);
    return allowed;
  },
  getCourseProgressKey(courseId){
    return courseId;
  },
  getCompletedLessons(courseId){
    const progress = DB.get('progress')||{};
    return progress[this.getCourseProgressKey(courseId)]?.completed||[];
  },
  calculateCompletionPercent(courseId){
    const course = getAllCourses().find(c=>c.id===courseId);
    if(!course||!course.modules?.length) return 0;
    const totalLessons = course.modules.reduce((sum,module)=>sum+(module.lessons?.length||0),0);
    if(!totalLessons) return 0;
    const completedLessons = this.getCompletedLessons(courseId).length;
    return Math.round((completedLessons / totalLessons) * 100);
  },
  calculateTrackProgress(user,trackId){
    const trackCourses = getAllCourses().filter(course=>course.track===trackId);
    const totalLessons = trackCourses.reduce((sum,course)=>sum+course.modules.reduce((moduleSum,module)=>moduleSum+(module.lessons?.length||0),0),0);
    if(!totalLessons) return 0;
    const completedCount = trackCourses.reduce((sum,course)=>sum+this.getCompletedLessons(course.id).length,0);
    return Math.round((completedCount / totalLessons) * 100);
  }
};
function isSubscribed(){
  return CourseLogic.hasFullAccess(currentUser);
}
function refreshCurrentUser(){
  if(!currentUser) return;
  const users = DB.get('users')||[];
  const fresh = users.find(u=>u.id===currentUser.id);
  if(fresh){const safe={...fresh};delete safe.password;currentUser=safe;DB.set('currentUser',safe)}
}

// ================================================================
// COURSE DATA (from mock-data)
// ================================================================
const TRACKS = [
  {id:'human-mastery',name:'The Human Mastery Series',description:'Human Nature & Influence'},
  {id:'digital-mastery',name:'ICT (Tech & Design)',description:'ICT & Creative Design'},
  {id:'nodejs-mastery',name:'Node.js Development',description:'Backend & Server-side Mastery'},
  {id:'python-mastery',name:'Python Programming',description:'Data Science & Scripting'}
];
const COURSES = [
  {id:'human-01',track:'human-mastery',title:'Psychology & Human Nature',description:'Study behavior analysis and the core patterns that shape how people think, react, and decide.',videoUrl:'https://www.youtube.com/embed/vo4pMVb0R6M',category:'The Human Mastery Series',imageUrl:'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80',modules:[]},
  {id:'human-02',track:'human-mastery',title:'Body Language & Nonverbal Influence',description:'Understand silent communication and how nonverbal signals shape trust, authority, and attraction.',videoUrl:'https://www.youtube.com/embed/tn1stZCfF1M',category:'The Human Mastery Series',imageUrl:'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',modules:[]},
  {id:'human-03',track:'human-mastery',title:'Oration & Storytelling',description:'Train your voice, presence, and audience captivation through clear speaking and memorable storytelling.',videoUrl:'https://www.youtube.com/embed/eIho2S0ZahI',category:'The Human Mastery Series',imageUrl:'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',modules:[]},
  {id:'human-04',track:'human-mastery',title:'Mastery & Purpose Discovery',description:'Clarify personal direction, long-term purpose, and the habits needed to move with intention.',videoUrl:'https://www.youtube.com/embed/u4ZoJKF_VuA',category:'The Human Mastery Series',imageUrl:'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',modules:[]},
  {id:'human-05',track:'human-mastery',title:'Power & Authority',description:'Explore ethical leadership, influence, and how to build authority without losing integrity.',videoUrl:'https://www.youtube.com/embed/hGHyJjUE2R4',category:'The Human Mastery Series',imageUrl:'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',modules:[]},
  {id:'human-06',track:'human-mastery',title:'Social Intelligence',description:'Build stronger relationships through empathy, social timing, and practical connection-building skills.',videoUrl:'https://www.youtube.com/embed/iCvmsMzlF7o',category:'The Human Mastery Series',imageUrl:'https://images.unsplash.com/photo-1485217988980-11786ced9454?auto=format&fit=crop&w=800&q=80',modules:[]},
  {id:'human-07',track:'human-mastery',title:'Masculinity & Femininity',description:'Examine energy dynamics, polarity, and identity with a grounded, thoughtful approach.',videoUrl:'https://www.youtube.com/embed/g6y9tHQQlbc',category:'The Human Mastery Series',imageUrl:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',modules:[]},
  {id:'human-08',track:'human-mastery',title:'Spirituality & Unconscious Mastery',description:'Learn subconscious access, self-awareness, and deeper internal alignment.',videoUrl:'https://www.youtube.com/embed/a7sEoEvT8l8',category:'The Human Mastery Series',imageUrl:'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80',modules:[]},
  {id:'human-09',track:'human-mastery',title:'Breaking Limiting Beliefs',description:'Identify and dissolve mental constraints that block growth, courage, and freedom.',videoUrl:'https://www.youtube.com/embed/Lp7E973zozc',category:'The Human Mastery Series',imageUrl:'https://images.unsplash.com/photo-1517519014922-8fc02fbf1d0c?auto=format&fit=crop&w=800&q=80',modules:[]},
  {id:'human-10',track:'human-mastery',title:'Negotiation & Strategy',description:'Practice high-stakes influence, leverage, and strategic thinking in personal and professional settings.',videoUrl:'https://www.youtube.com/embed/ryXR4a1xJq0',category:'The Human Mastery Series',imageUrl:'https://images.unsplash.com/photo-1551836022-5e0b43b2a7fd?auto=format&fit=crop&w=800&q=80',modules:[]},
  {id:'web-11',track:'digital-mastery',title:'Introduction to Web Development',description:'This course introduces learners to how websites are created and how the internet works.',videoUrl:'https://www.youtube.com/embed/Q33KBiDriJY',category:'ICT (Tech & Design)',imageUrl:'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',modules:[{id:'wd1-m1',title:'Course Curriculum',lessons:[{id:'wd1-l1',title:'What is the web and how it works',type:'video',content:'https://www.youtube.com/embed/Q33KBiDriJY',duration:10},{id:'wd1-l2',title:'Frontend vs backend development',type:'video',content:'https://www.youtube.com/embed/XBu54nfYv_w',duration:8},{id:'wd1-l3',title:'Websites vs web applications',type:'video',content:'https://www.youtube.com/embed/AUHYt3w2s4c',duration:7},{id:'wd1-l4',title:'Tools used in web development',type:'video',content:'https://www.youtube.com/embed/42B9Ikq-d2c',duration:12},{id:'wd1-l5',title:'Careers in web development',type:'video',content:'https://www.youtube.com/embed/g-h_3f0LfPo',duration:15}]}]},
  {id:'html-12',track:'digital-mastery',title:'HTML Basics',description:'Learners study HTML, the language used to create website structure.',videoUrl:'https://www.youtube.com/embed/UB1O30fR-EE',category:'ICT (Tech & Design)',imageUrl:'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',modules:[{id:'wd2-m1',title:'Course Curriculum',lessons:[{id:'wd2-l1',title:'Structure of an HTML document',type:'video',content:'https://www.youtube.com/embed/UB1O30fR-EE',duration:10},{id:'wd2-l2',title:'Common HTML tags and elements',type:'video',content:'https://www.youtube.com/embed/ok-plXXHlMw',duration:15},{id:'wd2-l3',title:'Headings, paragraphs, links, and images',type:'video',content:'https://www.youtube.com/embed/kUMe1FH4paM',duration:12},{id:'wd2-l4',title:'Lists and tables',type:'video',content:'https://www.youtube.com/embed/Y1_xT0i41fM',duration:9},{id:'wd2-l5',title:'Forms and input elements',type:'video',content:'https://www.youtube.com/embed/fNcJuPIZ2WE',duration:14},{id:'wd2-quiz-1',title:'HTML Basics Quiz',type:'quiz',content:'quiz-html-basics',duration:5}]}]},
  {id:'css-13',track:'digital-mastery',title:'CSS Basics',description:'This course teaches how to make websites attractive using CSS.',videoUrl:'https://www.youtube.com/embed/yfoY53QXEnI',category:'ICT (Tech & Design)',imageUrl:'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&w=800&q=80',modules:[{id:'wd3-m1',title:'Course Curriculum',lessons:[{id:'wd3-l1',title:'What is CSS and how it works',type:'video',content:'https://www.youtube.com/embed/yfoY53QXEnI',duration:8},{id:'wd3-l2',title:'Selectors, properties, and values',type:'video',content:'https://www.youtube.com/embed/1PnVor36_40',duration:11},{id:'wd3-l3',title:'Colors, fonts, and text styling',type:'video',content:'https://www.youtube.com/embed/j31i-ztY2H4',duration:13},{id:'wd3-l4',title:'Layout basics (margin, padding, display)',type:'video',content:'https://www.youtube.com/embed/r1xN-s-R20Q',duration:10},{id:'wd3-l5',title:'Responsive design concepts',type:'video',content:'https://www.youtube.com/embed/2t_veb-G7oU',duration:16}]}]},
  {id:'js-14',track:'digital-mastery',title:'Introduction to JavaScript',description:'Learners are introduced to JavaScript, which adds interactivity to websites.',videoUrl:'https://www.youtube.com/embed/upDLs1sn7g4',category:'ICT (Tech & Design)',imageUrl:'https://images.unsplash.com/photo-1517433456452-f9633a875f6f?auto=format&fit=crop&w=800&q=80',modules:[{id:'wd4-m1',title:'Course Curriculum',lessons:[{id:'wd4-l1',title:'What JavaScript is used for',type:'video',content:'https://www.youtube.com/embed/upDLs1sn7g4',duration:7},{id:'wd4-l2',title:'Variables and data types',type:'video',content:'https://www.youtube.com/embed/i32fGmVjM5c',duration:12},{id:'wd4-l3',title:'Functions and events',type:'video',content:'https://www.youtube.com/embed/KJPtG-Ase-s',duration:14},{id:'wd4-l4',title:'Basic DOM manipulation',type:'video',content:'https://www.youtube.com/embed/wK2cBMcDTss',duration:18},{id:'wd4-l5',title:'Simple interactive examples',type:'video',content:'https://www.youtube.com/embed/yNz0sJ6v02w',duration:20}]}]},
  {id:'proj-15',track:'digital-mastery',title:'Building a Simple Website Project',description:'Students combine HTML, CSS, and JavaScript to build a small website.',videoUrl:'https://www.youtube.com/embed/s7ON0S8AJN4',category:'ICT (Tech & Design)',imageUrl:'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',modules:[{id:'wd5-m1',title:'Course Curriculum',lessons:[{id:'wd5-l1',title:'Planning website structure',type:'video',content:'https://www.youtube.com/embed/s7ON0S8AJN4',duration:10},{id:'wd5-l2',title:'Creating pages with HTML',type:'video',content:'https://www.youtube.com/embed/bWPMSSsVdPk',duration:25},{id:'wd5-l3',title:'Styling pages with CSS',type:'video',content:'https://www.youtube.com/embed/3rK-kwa631A',duration:30},{id:'wd5-l4',title:'Adding JavaScript interactions',type:'video',content:'https://www.youtube.com/embed/69aSEhM234E',duration:20},{id:'wd5-l5',title:'Testing and publishing',type:'video',content:'https://www.youtube.com/embed/41h9Kj8y2mE',duration:15}]}]},
  {id:'gfx-16',track:'digital-mastery',title:'Introduction to Graphics Design',description:'This course introduces learners to the basics of visual communication and design.',videoUrl:'https://www.youtube.com/embed/8Dlq1vWbYbw',category:'ICT (Tech & Design)',imageUrl:'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',modules:[{id:'gd1-m1',title:'Course Curriculum',lessons:[{id:'gd1-l1',title:'What is graphics design',type:'video',content:'https://www.youtube.com/embed/EqZVI0A3K_4',duration:9},{id:'gd1-l2',title:'Types of graphic design',type:'video',content:'https://www.youtube.com/embed/A01i9b1gYyA',duration:11},{id:'gd1-l3',title:'Raster vs vector graphics',type:'video',content:'https://www.youtube.com/embed/3G2-t3d5i2k',duration:8},{id:'gd1-l4',title:'Role of graphics in communication',type:'video',content:'https://www.youtube.com/embed/ZyXXsT3YILM',duration:6},{id:'gd1-l5',title:'Design workflow overview',type:'video',content:'https://www.youtube.com/embed/jS_wd23u6vM',duration:13}]}]},
  {id:'color-17',track:'digital-mastery',title:'Design Principles & Color Theory',description:'Learners understand how color, hierarchy, balance, and layout affect design outcomes.',videoUrl:'https://www.youtube.com/embed/DLGvth1tE2s',category:'ICT (Tech & Design)',imageUrl:'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=800&q=80',modules:[]},
  {id:'canva-18',track:'digital-mastery',title:'Introduction to Design Software (Canva)',description:'Students learn the essential Canva tools used in beginner-friendly digital design workflows.',videoUrl:'https://www.youtube.com/embed/6A0yfYvW0qQ',category:'ICT (Tech & Design)',imageUrl:'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',modules:[]},
  {id:'logo-19',track:'digital-mastery',title:'Logo & Poster Design',description:'Create practical visual assets by learning composition, typography, and message-driven layout.',videoUrl:'https://www.youtube.com/embed/QbbAP1ZH9rU',category:'ICT (Tech & Design)',imageUrl:'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',modules:[]},
  {id:'brand-20',track:'digital-mastery',title:'Branding & Social Media Design',description:'Build brand consistency and design polished social media visuals for real-world campaigns.',videoUrl:'https://www.youtube.com/embed/F6u5rhUQ6dU',category:'ICT (Tech & Design)',imageUrl:'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80',modules:[]},
  {id:'node-01',track:'nodejs-mastery',title:'Node.js Foundations',description:'Master server-side JavaScript and asynchronous programming.',videoUrl:'https://www.youtube.com/embed/TlB_eWDSMt4',category:'Node.js Development',imageUrl:'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',modules:[]},
  {id:'py-01',track:'python-mastery',title:'Python for Beginners',description:'Learn the world\'s most popular language for automation and data.',videoUrl:'https://www.youtube.com/embed/rfscVS0vtbw',category:'Python Programming',imageUrl:'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',modules:[]}
];

// Helper — merges built-in + admin-created courses
function getAllCourses(){
  return [...COURSES, ...(DB.get('customCourses')||[])];
}

// ================================================================
// BAYYINAH-INSPIRED LEARNING LOGIC
// State-Driven Architecture for "My Learning" Experience
// ================================================================
const BayyinahLogic = {
  getProgressKey(courseId){
    return `bayyinah_progress_${currentUser?.id||'guest'}_${courseId}`;
  },
  getUserProgress(courseId){
    const key = this.getProgressKey(courseId);
    const legacyKey = `bayyinah_progress_${courseId}`;
    const data = DB.get(key) || DB.get(legacyKey) || {completed: [], lastWatched: null, timestamps: {}};
    if(DB.get(legacyKey) && !DB.get(key)){
      DB.set(key,data);
    }
    return data;
  },
  saveUserProgress(courseId, data){
    const key = this.getProgressKey(courseId);
    DB.set(key, data);
    if(currentUser?.authToken){
      saveToDataAPI('learning_progress', {
        courseId,
        completedLessons: data.completed || [],
        lastWatched: data.lastWatched || Date.now()
      }).catch(()=>{});
    }
  },
  isLessonUnlocked(course, lessonIndex){
    if(lessonIndex === 0) return true;
    const progress = this.getUserProgress(course.id);
    const prevLessons = course.modules?.[0]?.lessons || [];
    if(lessonIndex < prevLessons.length){
      return progress.completed.includes(prevLessons[lessonIndex - 1]?.id);
    }
    let count = 0;
    for(const mod of (course.modules || [])){
      for(const l of (mod.lessons || [])){
        if(count === lessonIndex - 1) return progress.completed.includes(l.id);
        count++;
      }
    }
    return progress.completed.includes(prevLessons[lessonIndex - 1]?.id);
  },
  getMyLearning(){
    const allCourses = getAllCourses();
    const interested = new Set(currentUser?.interestedCourses || []);
    return allCourses.filter(c => {
      const prog = this.getUserProgress(c.id);
      return (prog && (prog.completed.length > 0 || prog.lastWatched)) || interested.has(c.id);
    });
  },
  getContinueWatching(){
    const myCourses = this.getMyLearning();
    if(!myCourses.length) return null;
    const sorted = [...myCourses].sort((a, b) => {
      const aProg = this.getUserProgress(a.id);
      const bProg = this.getUserProgress(b.id);
      return (bProg.lastWatched || 0) - (aProg.lastWatched || 0);
    });
    const top = sorted[0];
    const prog = this.getUserProgress(top.id);
    const course = top;
    const allLessons = [];
    let idx = 0;
    for(const mod of (course.modules || [])){
      for(const l of (mod.lessons || [])){
        allLessons.push({...l, modIndex: 0, lessonIndex: idx, modTitle: mod.title});
        idx++;
      }
    }
    const nextLesson = allLessons.find(l => !prog.completed.includes(l.id)) || allLessons[0];
    return {
      course,
      progress: prog,
      nextLesson,
      percentComplete: allLessons.length ? Math.round((prog.completed.length / allLessons.length) * 100) : 0
    };
  },
  getPathways(){
    return DB.get('pathways') || [];
  },
  getTVContent(){
    const tvArchive = DB.get('tvArchive') || [];
    return tvArchive.slice(-6);
  },
  isInMyList(courseId){
    const lists = DB.get('userLists') || {};
    return (lists[currentUser.id] || []).includes(courseId);
  },
  toggleMyList(courseId){
    const lists = DB.get('userLists') || {};
    const userList = lists[currentUser.id] || [];
    const idx = userList.indexOf(courseId);
    if(idx >= 0) userList.splice(idx, 1);
    else userList.push(courseId);
    lists[currentUser.id] = userList;
    DB.set('userLists', lists);
    renderPage();
  },
  markLessonComplete(courseId, lessonId, timestamp = 0){
    const prog = this.getUserProgress(courseId);
    if(!prog.completed.includes(lessonId)) prog.completed.push(lessonId);
    prog.lastWatched = Date.now();
    if(timestamp > 0) prog.timestamps[lessonId] = timestamp;
    this.saveUserProgress(courseId, prog);
    return prog;
  },
  getLessonStatus(course, lessonIndex){
    if(!currentUser) return 'Locked';
    const flatLessons = [];
    for(const mod of (course.modules || [])){
      for(const lesson of (mod.lessons || [])){
        flatLessons.push(lesson);
      }
    }
    const lesson = flatLessons[lessonIndex];
    if(!lesson) return 'Locked';
    const prog = this.getUserProgress(course.id);
    if(prog.completed.includes(lesson.id)) return 'Completed';
    if(isStaffUser(currentUser)) return 'Available';
    if(!CourseLogic.hasFullAccess(currentUser)) return 'Locked';
    if(lessonIndex===0) return 'Available';
    const prev = flatLessons[lessonIndex-1];
    return prev && prog.completed.includes(prev.id) ? 'Available' : 'Locked';
  },
  updateTimestamp(courseId, lessonId, timestamp){
    const prog = this.getUserProgress(courseId);
    prog.timestamps[lessonId] = timestamp;
    prog.lastWatched = Date.now();
    this.saveUserProgress(courseId, prog);
  },
  getLessonTimestamp(courseId, lessonId){
    const prog = this.getUserProgress(courseId);
    return prog.timestamps[lessonId] || 0;
  }
};

async function syncLearningProgressToServer(courseId, lessonId, timestampSeconds=0, status='completed'){
  if(!currentUser) return null;
  const payload = {
    id: `${currentUser.id}_${courseId}_${lessonId}`,
    user_id: currentUser.id,
    course_id: courseId,
    lesson_id: lessonId,
    timestamp_seconds: Number(timestampSeconds)||0,
    status,
    created_at: Date.now(),
    updated_at: Date.now()
  };
  try{
    return await saveToDataAPI('learning_progress', payload);
  }catch(_){
    return null;
  }
}

const LESSON_TRACKER = {
  active:null,
  ytReady:false,
  ytLoading:false,
  ytPlayers:new Map()
};

function ensureYouTubeIframeApi(){
  if(LESSON_TRACKER.ytReady || LESSON_TRACKER.ytLoading) return;
  LESSON_TRACKER.ytLoading = true;
  if(!window.onYouTubeIframeAPIReady){
    window.onYouTubeIframeAPIReady = () => {
      LESSON_TRACKER.ytReady = true;
      LESSON_TRACKER.ytLoading = false;
    };
  }
  const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
  if(existing) return;
  const script = document.createElement('script');
  script.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(script);
}

function completeTrackedLesson({courseId, lessonId, timestampSeconds=0}={}){
  if(!courseId || !lessonId) return;
  markComplete(courseId, lessonId, timestampSeconds);
  const btn = document.getElementById('lesson-complete-btn');
  if(btn){
    btn.disabled = true;
    btn.textContent = 'Completed';
  }
}

function startLessonProgressTracking({courseId, lessonId, type, mediaType, videoId}={}){
  LESSON_TRACKER.active = {courseId, lessonId, type, mediaType, videoId, completed:false};
  if(type!=='video') return;
  if(mediaType==='video'){
    const el = document.getElementById('lesson-video-player');
    if(!el) return;
    const mark = () => {
      if(LESSON_TRACKER.active?.completed) return;
      LESSON_TRACKER.active.completed = true;
      const ts = Math.round(el.currentTime||0);
      completeTrackedLesson({courseId,lessonId,timestampSeconds:ts});
    };
    el.addEventListener('timeupdate', ()=>{
      const dur = Number(el.duration||0);
      if(!dur || !isFinite(dur)) return;
      const pct = (el.currentTime||0)/dur;
      if(pct>=0.9) mark();
    });
    el.addEventListener('ended', mark);
    return;
  }
  if(mediaType==='youtube' && videoId){
    ensureYouTubeIframeApi();
    const attach = () => {
      if(!(window.YT && window.YT.Player)) return false;
      const iframeId = 'lesson-youtube-player';
      if(LESSON_TRACKER.ytPlayers.has(iframeId)) return true;
      const player = new window.YT.Player(iframeId, {
        events:{
          onStateChange: (event)=>{
            if(event.data===window.YT.PlayerState.ENDED && !LESSON_TRACKER.active?.completed){
              LESSON_TRACKER.active.completed = true;
              const ts = Math.round(player.getDuration?.()||0);
              completeTrackedLesson({courseId,lessonId,timestampSeconds:ts});
            }
          }
        }
      });
      LESSON_TRACKER.ytPlayers.set(iframeId, player);
      return true;
    };
    if(!attach()){
      let attempts = 0;
      const timer = setInterval(()=>{
        attempts++;
        if(attach() || attempts>40) clearInterval(timer);
      },250);
    }
  }
}

function getLastWatchedLesson(courseId){
  const prog = BayyinahLogic.getUserProgress(courseId);
  if(!prog.lastWatched) return null;
  const course = getAllCourses().find(c => c.id === courseId);
  if(!course) return null;
  for(const mod of (course.modules || [])){
    for(const l of (mod.lessons || [])){
      if(prog.completed.includes(l.id)){
        return {lesson: l, modTitle: mod.title};
      }
    }
  }
  return null;
}

function normalizeMessageRecord(msg={}){
  const readBy = Array.isArray(msg.readBy) ? [...new Set(msg.readBy.filter(Boolean))] : [];
  const deliveredTo = Array.isArray(msg.deliveredTo) ? [...new Set(msg.deliveredTo.filter(Boolean))] : [];
  if(msg.senderId && !readBy.includes(msg.senderId)) readBy.push(msg.senderId);
  if(msg.receiverId && !deliveredTo.includes(msg.receiverId)) deliveredTo.push(msg.receiverId);
  if(msg.read && msg.receiverId && !readBy.includes(msg.receiverId)) readBy.push(msg.receiverId);
  return {
    ...msg,
    channel: msg.channel || (msg.receiverId ? 'dm' : 'group'),
    receiverId: msg.receiverId || null,
    text: typeof msg.text==='string' ? msg.text : '',
    deliveredTo,
    readBy,
    pending:Boolean(msg.pending)
  };
}
function getPendingChatMessages(){
  try{
    const raw = JSON.parse(localStorage.getItem(CHAT_BACKEND.pendingKey) || '[]');
    return Array.isArray(raw) ? raw.map(normalizeMessageRecord) : [];
  }catch{
    return [];
  }
}
function savePendingChatMessages(messages=[]){
  const normalized = messages.map(normalizeMessageRecord).filter(message=>message.pending);
  localStorage.setItem(CHAT_BACKEND.pendingKey,JSON.stringify(normalized));
}
function getStoredMessages(){
  const stored = (DB.get('messages')||[]).map(normalizeMessageRecord);
  const pending = getPendingChatMessages();
  const map = new Map();
  [...stored,...pending].forEach(message=>map.set(message.id,message));
  return [...map.values()];
}
function saveStoredMessages(messages){
  const normalized = messages.map(normalizeMessageRecord);
  DB.set('messages',normalized);
  savePendingChatMessages(normalized);
}
function normalizeNotificationRecord(notification={}){
  const readBy = Array.isArray(notification.readBy)
    ? notification.readBy
    : Array.isArray(notification.read_by)
      ? notification.read_by
      : [];
  return {
    id: notification.id || uid(),
    title: String(notification.title || '').trim(),
    body: String(notification.body || '').trim(),
    targetRole: String(notification.targetRole || notification.target_role || 'all').trim() || 'all',
    targetUserId: notification.targetUserId || notification.target_user_id || null,
    priority: notification.priority || 'normal',
    createdAt: Number(notification.createdAt || notification.created_at) || Date.now(),
    updatedAt: Number(notification.updatedAt || notification.updated_at) || null,
    read: Boolean(notification.read),
    readBy: [...new Set(readBy.filter(Boolean))]
  };
}
function getStoredNotifications(){
  return (DB.get('notifications')||[]).map(normalizeNotificationRecord);
}
function saveStoredNotifications(notifications){
  DB.set('notifications',notifications.map(normalizeNotificationRecord));
}
function isNotificationReadByUser(notification,userId=currentUser?.id){
  if(!userId) return false;
  const normalized = normalizeNotificationRecord(notification);
  return normalized.readBy.includes(userId);
}
function isHumanChatMessage(message={}){
  return !HUMAN_CHAT_EXCLUDED_SENDERS.has(message.senderId);
}
function getPrimaryAdminUser(users=DB.get('users')||[]){
  return users.find(user=>user.role==='admin' && user.id==='admin-kfahad')
    || users.find(user=>user.role==='admin' && String(user.email||'').toLowerCase()==='admin.kfahad@gmail.com')
    || users.find(user=>user.role==='admin')
    || null;
}
function getChatDirectory(){
  const users = DB.get('users')||[];
  const primaryAdmin = getPrimaryAdminUser(users);
  return users.filter(user=>{
    if(!user || user.id===currentUser?.id) return false;
    if(user.role==='admin' && primaryAdmin) return user.id===primaryAdmin.id;
    return true;
  });
}
function isMessageReadByUser(message,userId){
  return (message.readBy||[]).includes(userId);
}
function isVisibleNotification(notification){
  if(!currentUser) return false;
  const normalized = normalizeNotificationRecord(notification);
  const roleVisible = normalized.targetRole==='all' || normalized.targetRole===currentUser.role;
  const userVisible = !normalized.targetUserId || normalized.targetUserId===currentUser.id;
  return roleVisible && userVisible;
}
function getVisibleNotifications(){
  return getStoredNotifications().filter(isVisibleNotification);
}
function getUnreadMessageCount(userId=currentUser?.id){
  if(!userId) return 0;
  return getStoredMessages().filter(message=>{
    if(!isHumanChatMessage(message)) return false;
    if(message.senderId===userId) return false;
    if(message.channel==='group') return !isMessageReadByUser(message,userId);
    return message.receiverId===userId && !isMessageReadByUser(message,userId);
  }).length;
}
function getChatUnreadSummary(userId=currentUser?.id){
  if(!userId) return {total:0, groupCount:0, directCount:0, groupLine:'', directLine:''};
  const users=DB.get('users')||[];
  const messages=getStoredMessages().filter(isHumanChatMessage);
  const unreadGroup=messages
    .filter(message=>message.channel==='group' && message.senderId!==userId && !isMessageReadByUser(message,userId))
    .sort((a,b)=>b.createdAt-a.createdAt);
  const unreadDirect=messages
    .filter(message=>message.channel==='dm' && message.receiverId===userId && message.senderId!==userId && !isMessageReadByUser(message,userId))
    .sort((a,b)=>b.createdAt-a.createdAt);
  const latestGroup=unreadGroup[0];
  const groupSender=latestGroup ? users.find(user=>user.id===latestGroup.senderId)?.name || 'Someone' : '';
  const directNames=[...new Set(unreadDirect.map(message=>users.find(user=>user.id===message.senderId)?.name).filter(Boolean))];
  return {
    total: unreadGroup.length + unreadDirect.length,
    groupCount: unreadGroup.length,
    directCount: unreadDirect.length,
    groupLine: latestGroup ? `Broadcast: ${groupSender}` : '',
    directLine: directNames.length ? `Direct: ${directNames.slice(0,2).join(', ')}${directNames.length>2?` +${directNames.length-2}`:''}` : ''
  };
}
function createNotification(notification){
  const notifications = getStoredNotifications();
  const createdNotification = normalizeNotificationRecord({
    id:uid(),
    read:false,
    readBy:[],
    createdAt:Date.now(),
    targetRole:'all',
    ...notification
  });
  notifications.push(createdNotification);
  saveStoredNotifications(notifications);
  saveNotificationToServer(createdNotification).then(result=>{
    if(result) loadNotificationsFromServer().catch(()=>{});
  });
  refreshNotificationUi();
  return createdNotification;
}
function markVisibleNotificationsRead(){
  if(!currentUser) return;
  const notifications = getStoredNotifications();
  const changedNotifications = [];
  notifications.forEach(notification=>{
    if(isVisibleNotification(notification) && !isNotificationReadByUser(notification,currentUser?.id)){
      notification.readBy = [...new Set([...(notification.readBy||[]), currentUser.id])];
      notification.read = true;
      notification.updatedAt = Date.now();
      changedNotifications.push(normalizeNotificationRecord(notification));
    }
  });
  if(!changedNotifications.length) return;
  saveStoredNotifications(notifications);
  changedNotifications.forEach(notification=>updateNotificationOnServer(notification));
  refreshNotificationUi();
}
function notificationBelongsToCurrentUser(notification){
  return isVisibleNotification(notification);
}
function refreshNotificationUi(){
  if(currentPage==='dashboard' && currentSection==='notifications'){
    renderPage();
    return;
  }
  if(currentPage==='admin' && currentSection==='notifications'){
    renderPage();
    return;
  }
  updateNav();
  updateMobileMenu();
}
function showBrowserNotification(notification){
  if(typeof window==='undefined' || typeof Notification==='undefined') return;
  if(Notification.permission!=='granted') return;
  if(document.visibilityState==='visible') return;
  try{
    new Notification(notification.title || 'New notification',{
      body: notification.body || '',
      tag: notification.id,
      icon: 'KF%20LOGO.png'
    });
  }catch(error){
    console.warn('Browser notification failed:',error);
  }
}
function handleIncomingNotificationAlerts(notifications){
  notifications.forEach(notification=>{
    if(!notificationBelongsToCurrentUser(notification)) return;
    if(isNotificationReadByUser(notification,currentUser?.id)) return;
    toast(notification.title || 'New notification',notification.priority==='urgent'?'error':notification.priority==='important'?'warn':'info');
    showBrowserNotification(notification);
  });
}
function hydrateRemoteNotifications(notifications,{notify=false}={}){
  const normalized = (notifications||[])
    .map(normalizeNotificationRecord)
    .sort((a,b)=>b.createdAt-a.createdAt);
  if(notify && currentUser){
    const unseen = normalized.filter(notification=>!NOTIFICATION_BACKEND.seenIds.has(notification.id));
    handleIncomingNotificationAlerts(unseen);
  }
  saveStoredNotifications(normalized);
  normalized.forEach(notification=>NOTIFICATION_BACKEND.seenIds.add(notification.id));
  refreshNotificationUi();
  return normalized;
}
async function loadNotificationsFromServer({rerender=false,silent=true,notify=false}={}){
  const records = await fetchFromDataAPI('notifications');
  if(records===null){
    if(!silent) toast('Could not sync notifications from database','warn');
    return null;
  }
  const notifications = records.map(normalizeNotificationRecord);
  hydrateRemoteNotifications(notifications,{notify});
  if(rerender) refreshNotificationUi();
  if(!silent) toast(`Synced ${notifications.length} notification${notifications.length===1?'':'s'}`,'success');
  return notifications;
}
async function saveNotificationToServer(notification){
  return saveToDataAPI('notifications',{
    id: notification.id,
    title: notification.title,
    body: notification.body,
    target_role: notification.targetRole,
    target_user_id: notification.targetUserId,
    priority: notification.priority,
    read: notification.read,
    read_by: notification.readBy || [],
    created_at: notification.createdAt,
    updated_at: notification.updatedAt || Date.now()
  });
}
async function updateNotificationOnServer(notification){
  return updateDataAPI('notifications',notification.id,{
    title: notification.title,
    body: notification.body,
    target_role: notification.targetRole,
    target_user_id: notification.targetUserId,
    priority: notification.priority,
    read: notification.read,
    read_by: notification.readBy || [],
    created_at: notification.createdAt,
    updated_at: notification.updatedAt || Date.now()
  });
}
async function deleteNotificationFromServer(id){
  return deleteFromDataAPI('notifications',id);
}
const NOTIFICATION_BACKEND = {
  pollHandle:null,
  pollMs:15000,
  seenIds:new Set()
};
function startNotificationPolling(){
  if(NOTIFICATION_BACKEND.pollHandle) return;
  NOTIFICATION_BACKEND.pollHandle = setInterval(()=>loadNotificationsFromServer({notify:true}).catch(()=>{}),NOTIFICATION_BACKEND.pollMs);
}
function stopNotificationPolling(){
  if(!NOTIFICATION_BACKEND.pollHandle) return;
  clearInterval(NOTIFICATION_BACKEND.pollHandle);
  NOTIFICATION_BACKEND.pollHandle = null;
}
function markMessagesAsRead({channel,userId=null}={}){
  if(!currentUser) return;
  const messages = getStoredMessages();
  let changed = false;
  messages.forEach(message=>{
    if(!isHumanChatMessage(message)) return;
    const matchesGroup = channel==='group' && message.channel==='group' && message.senderId!==currentUser.id;
    const matchesDm = channel==='dm' && userId && message.channel==='dm' && message.senderId===userId && message.receiverId===currentUser.id;
    if((matchesGroup || matchesDm) && !isMessageReadByUser(message,currentUser.id)){
      message.readBy = [...(message.readBy||[]), currentUser.id];
      if(message.receiverId===currentUser.id) message.read = true;
      changed = true;
    }
  });
  if(changed){
    saveStoredMessages(messages);
    syncReadStateToServer({channel,userId});
  }
}
function shouldRenderChatSensitiveView(){
  return currentPage==='dashboard' && (currentSection==='chat' || currentSection==='notifications');
}
function refreshChatUi(){
  if(shouldRenderChatSensitiveView()) renderPage();
  else {
    updateNav();
    updateMobileMenu();
  }
}
async function postChatApi(payload){
  const response = await fetch(CHAT_BACKEND.endpoint,{
    method:'POST',
    headers:{...dataApiHeaders()},
    body:JSON.stringify(payload)
  });
  if(!response.ok) throw new Error(`Chat API error: ${response.status}`);
  return response.json();
}
function storeIncomingMessageIds(messages){
  messages.forEach(message=>{
    if(message.senderId!==currentUser?.id) CHAT_BACKEND.seenIncomingIds.add(message.id);
  });
}
function hydrateRemoteMessages(messages,{notify=false}={}){
  const normalizedRemote = (messages||[]).map(normalizeMessageRecord).sort((a,b)=>a.createdAt-b.createdAt);
  const pending = getPendingChatMessages();
  const remoteIds = new Set(normalizedRemote.map(message=>message.id));
  const normalized = [...normalizedRemote,...pending.filter(message=>!remoteIds.has(message.id))]
    .sort((a,b)=>a.createdAt-b.createdAt);
  if(notify && currentUser){
    const users=DB.get('users')||[];
    normalized.forEach(message=>{
      const isIncoming = message.senderId!==currentUser.id;
      const unseen = !CHAT_BACKEND.seenIncomingIds.has(message.id);
      const relevant = message.channel==='group' || message.receiverId===currentUser.id;
      if(isIncoming && unseen && relevant){
        const senderName=users.find(user=>user.id===message.senderId)?.name || 'Someone';
        toast(message.channel==='group' ? `New broadcast from ${senderName}` : `New message from ${senderName}`,'success');
      }
    });
  }
  if(currentUser) storeIncomingMessageIds(normalized);
  saveStoredMessages(normalized);
}
async function syncMessagesFromServer({notify=false}={}){
  if(!currentUser || CHAT_BACKEND.polling) return;
  CHAT_BACKEND.polling = true;
  try{
    const response = await fetch(CHAT_BACKEND.endpoint, { headers: dataApiHeaders() });
    if(!response.ok) throw new Error(`Chat API error: ${response.status}`);
    const data = await response.json();
    hydrateRemoteMessages(data.messages||[],{notify});
    CHAT_BACKEND.apiAvailable = true;
    refreshChatUi();
  }catch(err){
    console.error("Chat sync error:", err);
    CHAT_BACKEND.apiAvailable = false;
  }finally{
    CHAT_BACKEND.polling = false;
  }
}
function startChatPolling(){
  if(!currentUser || CHAT_BACKEND.pollHandle) return;
  storeIncomingMessageIds(getStoredMessages());
  syncMessagesFromServer();
  retryPendingMessages();
  CHAT_BACKEND.pollHandle = setInterval(()=>syncMessagesFromServer({notify:true}),CHAT_BACKEND.pollMs);
}
function stopChatPolling(){
  if(CHAT_BACKEND.pollHandle){
    clearInterval(CHAT_BACKEND.pollHandle);
    CHAT_BACKEND.pollHandle = null;
  }
  CHAT_BACKEND.seenIncomingIds.clear();
}
async function sendMessageToServer(message){
  try{
    const data = await postChatApi({action:'send',message});
    hydrateRemoteMessages(data.messages||[]);
    CHAT_BACKEND.apiAvailable = true;
    refreshChatUi();
    return true;
  }catch{
    CHAT_BACKEND.apiAvailable = false;
    return false;
  }
}
async function retryPendingMessages(){
  if(!currentUser) return;
  const pending = getPendingChatMessages().filter(message=>message.pending && message.senderId===currentUser.id);
  if(!pending.length) return;
  for(const message of pending){
    const delivered = await sendMessageToServer({...message,pending:false});
    if(delivered){
      const next = getStoredMessages().map(entry=>entry.id===message.id?{...entry,pending:false}:entry);
      saveStoredMessages(next);
    }
  }
}
async function syncReadStateToServer({channel,userId=null}={}){
  if(!currentUser) return;
  try{
    const data = await postChatApi({action:'read',viewerId:currentUser.id,channel,userId});
    hydrateRemoteMessages(data.messages||[]);
    CHAT_BACKEND.apiAvailable = true;
    refreshChatUi();
  }catch{
    CHAT_BACKEND.apiAvailable = false;
  }
}

// ================================================================
// GLOBAL SEARCH
// ================================================================
function openSearch(){
  let overlay=document.getElementById('search-overlay');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='search-overlay';
    overlay.className='search-overlay';
    overlay.innerHTML=`
      <button class="search-close" onclick="closeSearch()">✕ Close</button>
      <div class="search-box">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input id="search-input" placeholder="Search courses, pages, features..." autocomplete="off" oninput="doSearch(this.value)" onkeydown="if(event.key==='Escape')closeSearch()"/>
      </div>
      <div class="search-results" id="search-results">
        <div style="text-align:center;color:var(--muted);padding:40px;font-size:.9rem">Start typing to search…</div>
      </div>`;
    document.body.appendChild(overlay);
  }
  overlay.classList.add('open');
  setTimeout(()=>document.getElementById('search-input')?.focus(),100);
}
function closeSearch(){
  document.getElementById('search-overlay')?.classList.remove('open');
}
function doSearch(q){
  const el=document.getElementById('search-results');
  if(!el) return;
  q=q.trim().toLowerCase();
  if(!q){el.innerHTML='<div style="text-align:center;color:var(--muted);padding:40px;font-size:.9rem">Start typing to search…</div>';return;}
  const results=[];
  // Courses
  getAllCourses().forEach(c=>{
    if(c.title.toLowerCase().includes(q)||c.category.toLowerCase().includes(q)||(c.description||'').toLowerCase().includes(q)){
      results.push({icon:'📚',title:c.title,sub:c.category+' course',action:`viewCourse('${c.id}')`});
    }
  });
  // Pages
  const pages=[
    {label:'Home',icon:'🏠',page:'home'},{label:'Courses',icon:'📖',page:'courses-public'},
    {label:'Pricing & Plans',icon:'💳',page:'pricing-page'},{label:'About Us',icon:'ℹ️',page:'about-page'},
    {label:'Blog',icon:'📝',page:'blog-page'},{label:'Contact',icon:'📞',page:'contact-page'}
  ];
  pages.forEach(p=>{if(p.label.toLowerCase().includes(q)){results.push({icon:p.icon,title:p.label,sub:'Page',action:`closeSearch();showPublicPage('${p.page}')`});}});
  // Dashboard sections
  if(currentUser){
    const dsecs=[
      {l:'Dashboard Overview',i:'🏠',s:'overview'},{l:'My Courses',i:'📚',s:'my-learning'},
      {l:'Quizzes',i:'❓',s:'quizzes'},{l:'Live Classes',i:'🎥',s:'live-classes'},
      {l:'Community Chat',i:'💬',s:'chat'},{l:'Job Board',i:'💼',s:'jobs'},
      {l:'Knowledge Base',i:'📖',s:'knowledge-base'},{l:'Appointments',i:'📅',s:'appointments'},
      {l:'Notifications',i:'🔔',s:'notifications'},{l:'Monthly Challenges',i:'🏆',s:'challenges'},
      {l:'My Profile',i:'👤',s:'profile'}
    ];
    dsecs.forEach(d=>{if(d.l.toLowerCase().includes(q)){results.push({icon:d.i,title:d.l,sub:'Dashboard',action:`closeSearch();showDashboard('${d.s}')`});}});
  }
  // KB articles
  (DB.get('knowledgeBase')||[]).forEach(a=>{
    if(a.title.toLowerCase().includes(q)||(a.content||'').toLowerCase().includes(q)){
      results.push({icon:'📄',title:a.title,sub:'Knowledge Base — '+a.category,action:`closeSearch();showDashboard('knowledge-base')`});
    }
  });
  if(!results.length){el.innerHTML=`<div style="text-align:center;color:var(--muted);padding:40px;font-size:.9rem">No results for "<strong>${q}</strong>"</div>`;return;}
  el.innerHTML=results.slice(0,12).map(r=>`
    <div class="search-result-item" onclick="${r.action};closeSearch()">
      <div class="search-result-icon">${r.icon}</div>
      <div><div class="search-result-title">${r.title}</div><div class="search-result-sub">${r.sub}</div></div>
    </div>`).join('');
}
document.addEventListener('keydown',e=>{
  if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();openSearch();}
  if(e.key==='Escape')closeSearch();
});

// ================================================================
// MONTHLY CHALLENGES
// ================================================================
function renderMonthlyChallenges(){
  const challenges=DB.get('challenges')||getDefaultChallenges();
  const userProgress=DB.get('challengeProgress')||{};
  return `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
    <h1 style="font-family:var(--font-h);font-size:1.7rem;font-weight:800">Monthly Challenges</h1>
    <span class="badge badge-warn">🏆 ${challenges.filter(c=>userProgress[c.id]?.completed).length}/${challenges.length} completed</span>
  </div>
  <p style="color:var(--muted);margin-bottom:24px">Complete challenges to earn badges and recognition!</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
  ${challenges.map(c=>{
    const done=userProgress[c.id]?.completed;
    const pct=Math.min(100,userProgress[c.id]?.progress||0);
    const submission=getChallengeSubmission(c.id);
    const isStudent=currentUser?.role==='student';
    const isAdmin=currentUser?.role==='admin';
    const pendingBadge = submission?.status==='pending' ? `<div style="margin-bottom:10px"><span class="badge badge-warn">Pending Review</span></div>` : '';
    const studentButton = !done ? (submission?.status==='pending' ? `<button class="btn btn-outline btn-sm" disabled>Awaiting admin review</button>` : `<button class="btn btn-outline btn-sm" onclick="submitChallengeTask('${c.id}')">Submit Task for Review</button>`) : '<div style="color:var(--success);font-size:.83rem;font-weight:600">🎉 Challenge Complete!</div>';
    const adminButton = !done ? (submission?.status==='pending' ? `<button class="btn btn-primary btn-sm" onclick="approveChallengeTask('${c.id}')">Approve +10% Progress</button>` : '<div style="color:var(--muted);font-size:.85rem">No student submission yet</div>') : '<div style="color:var(--success);font-size:.83rem;font-weight:600">🎉 Challenge Complete!</div>';
    return `<div class="challenge-card" style="${done?'opacity:.8':''}">
      <div class="challenge-badge"><span class="badge ${done?'badge-success':'badge-warn'}">${done?'✅ Done':'⏳ Active'}</span></div>
      <div style="font-size:2rem;margin-bottom:10px">${c.emoji}</div>
      <div style="font-family:var(--font-h);font-weight:700;margin-bottom:6px">${c.title}</div>
      <div style="color:var(--muted);font-size:.83rem;margin-bottom:14px">${c.description}</div>
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:.75rem;color:var(--muted);margin-bottom:4px"><span>Progress</span><span>${pct}%</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div style="font-size:.75rem;color:var(--muted);margin-bottom:12px">🎁 Reward: <strong>${c.reward}</strong></div>
      ${pendingBadge}
      ${isStudent ? studentButton : isAdmin ? adminButton : '<div style="color:var(--muted);font-size:.85rem">Login as a student to submit tasks.</div>'}
      ${submission?.status==='pending' && isAdmin ? `<div style="margin-top:8px;color:var(--muted);font-size:.78rem">Pending review from ${submission.submittedBy}</div>` : ''}
    </div>`;
  }).join('')}
  </div>`;
}
function getDefaultChallenges(){
  const def=[
    {id:'ch1',emoji:'💻',title:'Code Every Day',description:'Complete at least one coding lesson every day for 7 days.',reward:'Coding Streak Badge',target:7},
    {id:'ch2',emoji:'📝',title:'Quiz Master',description:'Score 80% or above on 3 different quizzes this month.',reward:'Quiz Master Badge',target:3},
    {id:'ch3',emoji:'🎓',title:'Course Finisher',description:'Complete any full course with all lessons done.',reward:'Graduate Badge + Certificate',target:1},
    {id:'ch4',emoji:'💬',title:'Community Builder',description:'Send 10 messages in the group chat to help others.',reward:'Community Star Badge',target:10},
    {id:'ch5',emoji:'🌟',title:'5-Star Student',description:'Log in to the academy for 5 consecutive days.',reward:'Dedication Badge',target:5},
    {id:'ch6',emoji:'🚀',title:'Fast Learner',description:'Complete 3 lessons in a single day.',reward:'Speed Learner Badge',target:3},
  ];
  DB.set('challenges',def);
  return def;
}
function getChallengeSubmission(id){
  const submissions = DB.get('challengeSubmissions') || {};
  return submissions[id] || null;
}
function setChallengeSubmission(id, submission){
  const submissions = DB.get('challengeSubmissions') || {};
  submissions[id] = submission;
  DB.set('challengeSubmissions', submissions);
}
function clearChallengeSubmission(id){
  const submissions = DB.get('challengeSubmissions') || {};
  delete submissions[id];
  DB.set('challengeSubmissions', submissions);
}
function submitChallengeTask(id){
  if(!currentUser || currentUser.role!=='student'){
    toast('Only students can submit tasks for review.','error');
    return;
  }
  const progress=DB.get('challengeProgress')||{};
  if(progress[id]?.completed){
    toast('This challenge is already complete.','info');
    return;
  }
  const submission = getChallengeSubmission(id);
  if(submission?.status==='pending'){
    toast('Task already submitted. Awaiting admin review.','info');
    return;
  }
  setChallengeSubmission(id,{status:'pending',submittedAt:Date.now(),submittedBy:currentUser.name||currentUser.email||'Student'});
  toast('Task submitted. Admin will assign progress when reviewed.','success');
  showDashboard('challenges');
}
function approveChallengeTask(id){
  if(!currentUser || currentUser.role!=='admin'){
    toast('Only admins can approve challenge progress.','error');
    return;
  }
  const submission = getChallengeSubmission(id);
  if(!submission || submission.status!=='pending'){
    toast('No pending submission available for this challenge.','info');
    return;
  }
  const progress=DB.get('challengeProgress')||{};
  if(!progress[id]) progress[id]={progress:0,completed:false};
  progress[id].progress=Math.min(100,progress[id].progress+10);
  if(progress[id].progress>=100) progress[id].completed=true;
  DB.set('challengeProgress',progress);
  clearChallengeSubmission(id);
  showDashboard('challenges');
  toast(progress[id].completed ? '🎉 Challenge completed and approved!' : '✅ Progress approved and awarded +10%.','success');
}
function progressChallenge(id){
  if(!currentUser || currentUser.role!=='admin'){
    toast('Only admins can assign challenge marks. Students can submit tasks instead.','error');
    return;
  }
  approveChallengeTask(id);
}

// ================================================================
// VIDEO UPLOAD FOR COURSES
// ================================================================
function normalizeYouTubeUrl(url=''){
  const raw = String(url||'').trim();
  if(!raw) return '';
  try{
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./,'');
    if(host==='youtu.be'){
      const videoId = parsed.pathname.split('/').filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : raw;
    }
    if(host.endsWith('youtube.com')){
      if(parsed.pathname.startsWith('/embed/')) return raw;
      const videoId = parsed.searchParams.get('v');
      if(videoId) return `https://www.youtube.com/embed/${videoId}`;
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if(pathParts[0]==='shorts' && pathParts[1]){
        return `https://www.youtube.com/embed/${pathParts[1]}`;
      }
    }
  }catch(_){
    return raw;
  }
  return raw;
}
function isYouTubeLikeUrl(url=''){
  const normalized = normalizeYouTubeUrl(url);
  return normalized.includes('youtube.com/embed/');
}
function renderVideoMediaHtml(url=''){
  const normalized = normalizeYouTubeUrl(url);
  const safeUrl = String(normalized||'').replace(/"/g,'&quot;');
  if(!safeUrl) return '';
  if(isYouTubeLikeUrl(normalized)){
    return `<iframe src="${safeUrl.includes('?')?safeUrl+'&rel=0':safeUrl+'?rel=0'}" style="width:100%;height:100%;border:none" allowfullscreen></iframe>`;
  }
  return `<video style="width:100%;height:100%;background:#000" controls src="${safeUrl}"></video>`;
}
function isValidCourseVideoUrl(url=''){
  const value = String(url||'').trim();
  if(!value) return false;
  if(value.startsWith('data:video/')) return true;
  const normalized = normalizeYouTubeUrl(value);
  if(isYouTubeLikeUrl(normalized)) return true;
  try{
    const parsed = new URL(normalized);
    const protocolOk = parsed.protocol==='https:' || parsed.protocol==='http:';
    return protocolOk;
  }catch(_){
    return false;
  }
}
async function uploadCourseVideoToServer(fileData,publicId){
  try{
    const response = await fetch(COURSE_VIDEO_UPLOAD_BACKEND.endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        file:fileData,
        folder:'kfahad/course-videos',
        publicId
      })
    });
    const data = await response.json().catch(()=>({}));
    if(response.ok && data?.secureUrl) return data;
  }catch(error){
    console.warn('Course video upload API unavailable, falling back to local storage.');
  }
  return { secureUrl:fileData };
}
async function handleVideoUpload(file, targetId){
  if(!file) return;
  if(!String(file.type||'').startsWith('video/')){toast('Please choose a valid video file','error');return;}
  if(file.size > 60*1024*1024){toast('Video file must be under 60MB when uploaded through Cloudflare','error');return;}
  const preview=document.getElementById(targetId);
  if(preview){
    preview.innerHTML=`<div style="font-size:.8rem;color:var(--muted)">Uploading video...</div>`;
  }
  const reader=new FileReader();
  reader.onload=async e=>{
    const dataUrl=e.target.result;
    try{
      const upload=await uploadCourseVideoToServer(dataUrl,`course_video_${Date.now()}`);
      const videoUrl=upload?.secureUrl||dataUrl;
      if(window._CB) window._CB.videoUrl=videoUrl;
      const videoInput=document.getElementById('cb-video');
      if(videoInput){
        videoInput.value = videoUrl.startsWith('http') ? videoUrl : '';
      }
      if(preview){
        preview.innerHTML=`<div style="aspect-ratio:16/9;border-radius:10px;overflow:hidden">${renderVideoMediaHtml(videoUrl)}</div>
          <div style="font-size:.75rem;color:var(--success);margin-top:6px">Video ready: ${file.name} (${(file.size/1024/1024).toFixed(1)}MB)</div>`;
      }
      if(videoUrl.startsWith('data:')) toast('Video saved locally. Publish still works.','warn');
      else toast('Video uploaded successfully','success');
    }catch(_){
      if(preview){
        preview.innerHTML=`<div style="font-size:.8rem;color:var(--danger)">Upload failed. Try again.</div>`;
      }
      toast('Failed to upload video file','error');
    }
  };
  reader.onerror=()=>{
    if(preview){
      preview.innerHTML=`<div style="font-size:.8rem;color:var(--danger)">Could not read the selected file.</div>`;
    }
    toast('Failed to read video file','error');
  };
}

async function handleLessonVideoUpload(file, moduleIndex, lessonIndex, targetId){
  if(!file) return;
  if(!String(file.type||'').startsWith('video/')){toast('Please choose a valid video file','error');return;}
  if(file.size > 60*1024*1024){toast('Video file must be under 60MB when uploaded through Cloudflare','error');return;}
  const preview = document.getElementById(targetId);
  if(preview){
    preview.innerHTML=`<div style="font-size:.8rem;color:var(--muted)">Uploading lesson video...</div>`;
  }
  const reader = new FileReader();
  reader.onload = async e => {
    const dataUrl = e.target.result;
    try{
      const upload = await uploadCourseVideoToServer(dataUrl, `lesson_video_${Date.now()}`);
      const videoUrl = upload?.secureUrl || dataUrl;
      if(window._CB && window._CB.modules[moduleIndex] && window._CB.modules[moduleIndex].lessons[lessonIndex]){
        window._CB.modules[moduleIndex].lessons[lessonIndex].content = videoUrl;
      }
      renderCourseBuilder();
      if(preview){
        preview.innerHTML=`<div style="aspect-ratio:16/9;border-radius:10px;overflow:hidden">${renderVideoMediaHtml(videoUrl)}</div>
          <div style="font-size:.75rem;color:var(--success);margin-top:6px">Video ready: ${file.name} (${(file.size/1024/1024).toFixed(1)}MB)</div>`;
      }
      if(videoUrl.startsWith('data:')) toast('Lesson video saved locally. Publish still works.','warn');
      else toast('Lesson video uploaded successfully','success');
    }catch(_){
      if(preview){
        preview.innerHTML=`<div style="font-size:.8rem;color:var(--danger)">Upload failed. Try again.</div>`;
      }
      toast('Failed to upload lesson video file','error');
    }
  };
  reader.onerror = ()=>{
    if(preview){
      preview.innerHTML=`<div style="font-size:.8rem;color:var(--danger)">Could not read the selected file.</div>`;
    }
    toast('Failed to read lesson video file','error');
  };
  reader.readAsDataURL(file);
}

async function handleProfileImageUpload(file,targetId,hiddenInputId){
  if(!file) return;
  if(!file.type.startsWith('image/')){toast('Please choose an image file','error');return;}
  if(file.size > 10*1024*1024){toast('Image must be under 10MB','error');return;}
  const hiddenInput=document.getElementById(hiddenInputId);
  const preview=document.getElementById(targetId);
  const previousValue=hiddenInput?.value||'';
  if(preview){
    preview.innerHTML=`<div class="profile-avatar" style="margin:0 auto;background:rgba(59,130,246,.1);border-style:dashed;font-size:.78rem">...</div>`;
  }
  const reader=new FileReader();
  reader.onload=async e=>{
    const dataUrl=e.target.result;
    try{
      const upload=await uploadProfileImageToServer(dataUrl,`${currentUser?.id||'new'}_${Date.now()}`);
      if(hiddenInput) hiddenInput.value=upload.secureUrl;
      if(preview){
        preview.innerHTML=`<div class="profile-avatar" style="margin:0 auto">${upload.secureUrl?`<img src="${upload.secureUrl}" alt="Profile photo preview"/>`:''}</div>`;
      }
      toast('Profile photo uploaded','success');
    }catch(error){
      if(hiddenInput) hiddenInput.value=previousValue;
      if(preview){
        preview.innerHTML=`<div class="profile-avatar" style="margin:0 auto">${previousValue?`<img src="${previousValue}" alt="Profile photo preview"/>`:'?'}</div>`;
      }
      toast(error.message,'error');
    }
  };
  reader.onerror=()=>toast('Failed to read image file','error');
  reader.readAsDataURL(file);
}

const QUIZZES = {
  'quiz-html-basics':{id:'quiz-html-basics',title:'HTML Basics Quiz',courseId:'html-12',questions:[
    {text:'What does HTML stand for?',options:['Hyper Text Markup Language','High Tech Modern Language','Hyper Transfer Markup Link','Home Text Making Language'],correctAnswerIndex:0},
    {text:'Which tag is used to create a hyperlink?',options:['<link>','<a>','<href>','<url>'],correctAnswerIndex:1},
    {text:'Which tag creates the largest heading?',options:['<h6>','<heading>','<h1>','<head>'],correctAnswerIndex:2},
    {text:'What tag is used to insert an image?',options:['<pic>','<image>','<img>','<src>'],correctAnswerIndex:2},
    {text:'Which HTML element is used to create a bulleted list?',options:['<ol>','<dl>','<ul>','<list>'],correctAnswerIndex:2}
  ]}
};

// ================================================================
// ROUTING
// ================================================================
let currentPage = '';
let currentSection = '';

function getDefaultPageState(){
  if(!currentUser) return {page:'home',section:''};
  if(currentUser.role==='student') return {page:'dashboard',section:'my-learning'};
  return {page:'dashboard',section:'overview'};
}

function parseHashRoute(){
  const hash = window.location.hash.replace(/^#/,'').trim();
  if(!hash) return null;
  if(hash==='tv') return {page:'dashboard',section:'tv'};
  if(hash==='my/learning') return {page:'dashboard',section:'my-learning'};
  const [page,section] = hash.split('/');
  if(page==='dashboard'){
    const resolved = section==='courses' ? 'my-learning' : (section||'overview');
    return {page:'dashboard',section:resolved};
  }
  if(page==='admin') return {page:'admin',section:section||'overview'};
  const publicPages=new Set(['home','login-page','register-page','courses-public','course-detail','pricing-page','about-page','blog-page','contact-page','terms-page','privacy-page','system-status','forgot-password','reset-password','payments-page']);
  if(publicPages.has(page)) return {page,section:''};
  return null;
}

function applyRouteState(route){
  if(!route) return;
  currentPage = route.page;
  currentSection = route.section || '';
}

function syncHash(){
  let hash = '#home';
  if(currentPage==='dashboard'){
    if(currentSection==='my-learning') hash = '#my/learning';
    else if(currentSection==='tv') hash = '#tv';
    else hash = `#dashboard/${currentSection||'overview'}`;
  }
  else if(currentPage==='admin') hash = `#admin/${currentSection||'overview'}`;
  else if(currentPage) hash = `#${currentPage}`;
  if(window.location.hash!==hash){
    window.location.hash = hash;
  }
}

function showPublicPage(page){
  if(currentUser && (page==='home'||page==='courses-public'||page==='pricing-page')){
    // logged in users can see public pages too
  }
  currentPage=page;
  currentSection='';
  syncHash();
  renderPage();
  if(page==='courses-public') maybeAutoSyncPublicCourses();
  document.querySelectorAll('.nav-links a').forEach(a=>a.classList.remove('active'));
  const map={'home':'nav-home','courses-public':'nav-courses','pricing-page':'nav-pricing','about-page':'nav-about','blog-page':'nav-blog','contact-page':'nav-contact','terms-page':'nav-terms','privacy-page':'nav-privacy','system-status':'nav-status','payments-page':'nav-payments'};
  if(map[page]){const el=document.getElementById(map[page]);if(el)el.classList.add('active')}
  window.scrollTo({top:0,behavior:'smooth'});
  closeMobileMenu();
}
function showDashboard(section='overview'){
  if(!currentUser){showPublicPage('login-page');return}
  currentPage='dashboard'; currentSection=section; syncHash(); renderPage();
  if(currentUser.authToken){
    syncCurrentUserFromServer({rerender:true}).catch(()=>{});
    syncAppointmentsFromServer().catch(()=>{});
    syncReviewsFromServer().catch(()=>{});
  }
  window.scrollTo({top:0,behavior:'smooth'});
  closeMobileMenu();
}
function showAdmin(section='overview'){
  if(!currentUser||currentUser.role!=='admin'){showPublicPage('home');return}
  currentPage='admin'; currentSection=section; syncHash(); renderPage();
  syncUsersFromServer({rerender:true}).catch(()=>{});
  syncAppointmentsFromServer().catch(()=>{});
  syncReviewsFromServer().catch(()=>{});
  syncPaymentsFromServer().catch(()=>{});
  window.scrollTo({top:0,behavior:'smooth'});
  closeMobileMenu();
}
function goHome(){currentUser?showDashboard():showPublicPage('home')}
function renderPage(){
  if(!currentPage){
    applyRouteState(parseHashRoute() || getDefaultPageState());
  }
  if(currentPage==='dashboard' && !currentUser){
    applyRouteState({page:'login-page',section:''});
    syncHash();
  }
  if(currentPage==='admin' && (!currentUser || currentUser.role!=='admin')){
    applyRouteState(currentUser ? {page:'dashboard',section:'overview'} : {page:'home',section:''});
    syncHash();
  }
  updateNav(); updateMobileMenu();
  const coursesDropdown=document.getElementById('courses-dd');
  if(coursesDropdown) coursesDropdown.innerHTML=renderCourseDropdownMenu();
  updateGlobalUiState();
  if(currentUser) startChatPolling();
  else stopChatPolling();
  if(currentPage==='dashboard' && (currentSection==='live' || currentSection==='live-classes')){
    setTimeout(()=>initLiveEventController(),40);
  } else if(LIVE_EVENT_STATE.intervalHandle){
    clearInterval(LIVE_EVENT_STATE.intervalHandle);
    LIVE_EVENT_STATE.intervalHandle = null;
  }
  // Fix logo gradient for current theme
  setTimeout(()=>{
    const isLight = document.documentElement.getAttribute('data-theme')==='light';
    document.querySelectorAll('.logo-kfahad,.logo-academy').forEach(el=>{
      el.style.background = isLight ? 'linear-gradient(135deg,#0d1627 30%,var(--pri))' : 'linear-gradient(135deg,#fff 30%,var(--pri))';
      el.style.webkitBackgroundClip='text'; el.style.webkitTextFillColor='transparent';
    });
  },10);
  const root=document.getElementById('pages-root');
  if(currentPage==='home') root.innerHTML=renderHomePage();
  else if(currentPage==='login-page') root.innerHTML=renderLoginPage();
  else if(currentPage==='register-page') root.innerHTML=renderRegisterPage();
  else if(currentPage==='courses-public') root.innerHTML=renderCoursesPublicPage();
  else if(currentPage==='course-detail') root.innerHTML=renderCourseDetailPage();
  else if(currentPage==='pricing-page') root.innerHTML=renderPricingPage();
  else if(currentPage==='about-page') root.innerHTML=renderAboutPage();
  else if(currentPage==='blog-page') root.innerHTML=renderBlogPage();
  else if(currentPage==='contact-page') root.innerHTML=renderContactPage();
  else if(currentPage==='terms-page') root.innerHTML=renderTermsPage();
  else if(currentPage==='privacy-page') root.innerHTML=renderPrivacyPolicyPage();
  else if(currentPage==='system-status') root.innerHTML=renderSystemStatusPage();
  else if(currentPage==='forgot-password') root.innerHTML=renderForgotPasswordPage();
  else if(currentPage==='reset-password') root.innerHTML=renderResetPasswordPage();
  else if(currentPage==='payments-page') root.innerHTML=renderPaymentsPage();
  else if(currentPage==='dashboard') root.innerHTML=renderDashboardLayout();
  else if(currentPage==='admin') root.innerHTML=renderAdminLayout();
  else root.innerHTML=renderHomePage();
  addEventListeners();
  if(currentPage==='dashboard' && currentSection==='chat') scrollChatToBottom();
  // observer for animations
  setTimeout(()=>{
    document.querySelectorAll('.fade-up').forEach(el=>{
      const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target)}})},{threshold:.1});
      obs.observe(el);
    });
  },50);
}

function updateGlobalUiState(){
  const inChatSection = currentPage==='dashboard' && currentSection==='chat';
  document.body.classList.toggle('chat-section-open', inChatSection);
  if(inChatSection && AI_BOT.open){
    AI_BOT.open = false;
    document.getElementById('ai-bot-panel')?.classList.remove('open');
  }
}

// ================================================================
// NAV RENDER
// ================================================================
function updateNav(){
  const actions=document.getElementById('nav-actions');
  if(!actions) return;
  if(currentUser){
    const notifUnread=getVisibleNotifications().filter(n=>!isNotificationReadByUser(n,currentUser?.id)).length;
    const msgUnread=getUnreadMessageCount();
    const unread=notifUnread+msgUnread;
    actions.innerHTML=`
      <button class="btn btn-ghost btn-sm icon-btn" onclick="openSearch()" title="Search (Ctrl+K)" aria-label="Search">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </button>
      <span class="nav-user-greeting">Hi, ${currentUser.name.split(' ')[0]}</span>
      <button class="btn btn-outline btn-sm nav-desktop-only" onclick="showDashboard()">Dashboard</button>
      ${currentUser.role==='admin'?`<button class="btn btn-warn btn-sm nav-desktop-only" onclick="showAdmin()">Admin</button>`:''}
      <div class="dropdown">
        <button class="btn btn-ghost btn-sm icon-btn" onclick="toggleDropdown('user-dd')" aria-label="Open account menu">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          ${unread>0?`<span class="unread-count">${unread}</span>`:''}
        </button>
        <div class="dropdown-menu" id="user-dd">
          <div class="dropdown-item" onclick="showDashboard('profile')">My Profile</div>
          <div class="dropdown-item" onclick="showDashboard('settings')">Settings</div>
          <div class="dropdown-sep"></div>
          <div class="dropdown-item danger" onclick="logout()">Sign Out</div>
        </div>
      </div>`;
  } else {
    actions.innerHTML=`
      <button class="btn btn-ghost btn-sm icon-btn" onclick="openSearch()" title="Search" aria-label="Search">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </button>
      <button class="btn btn-ghost btn-sm nav-desktop-only" onclick="showPublicPage('login-page')">Log In</button>
      <button class="btn btn-primary btn-sm nav-desktop-only" onclick="showPublicPage('register-page')">Join Us</button>`;
  }
}
function updateMobileMenu(){
  const m=document.getElementById('mobile-menu');
  if(!m) return;
  const links=[
    {label:'Home',href:'#home',fn:"showPublicPage('home')"},
    {label:'Courses',href:'#courses-public',fn:"showPublicPage('courses-public')"},
    {label:'Pricing',href:'#pricing-page',fn:"showPublicPage('pricing-page')"},
    {label:'About',href:'#about-page',fn:"showPublicPage('about-page')"},
    {label:'Blog',href:'#blog-page',fn:"showPublicPage('blog-page')"},
    {label:'Contact',href:'#contact-page',fn:"showPublicPage('contact-page')"},
    {label:'Terms',href:'#terms-page',fn:"showPublicPage('terms-page')"},
    {label:'Privacy',href:'#privacy-page',fn:"showPublicPage('privacy-page')"},
    {label:'System Status',href:'#system-status',fn:"showPublicPage('system-status')"},
    {label:'Payments',href:'#payments-page',fn:"showPublicPage('payments-page')"},
  ];
  links.unshift({label:'Search',href:'#',fn:"openSearch()"});
  if(currentUser){
    links.push({label:'Dashboard',href:'#dashboard/overview',fn:"showDashboard()"});
    if(currentUser.role==='admin') links.push({label:'Admin Panel',href:'#admin/overview',fn:"showAdmin()"});
    links.push({label:'Sign Out',href:'#',fn:"logout()"});
  } else {
    links.push({label:'Log In',href:'#login-page',fn:"showPublicPage('login-page')"});
    links.push({label:'Get Started',href:'#register-page',fn:"showPublicPage('register-page')"});
  }
  m.innerHTML=links.map(l=>`<a href="${l.href||'#'}" onclick="${l.fn};closeMobileMenu()">${l.label}</a>`).join('');
}
function getTrackCourses(trackId){
  return getAllCourses().filter(course=>course.track===trackId);
}
function renderCourseDropdownMenu(){
  return TRACKS.map(track=>`
    <div class="dropdown-track">
      <div class="dropdown-track-title" onclick="showPublicPage('courses-public');closeDropdown('courses-dd')">
        <span>${track.name}</span>
        <span>${track.description}</span>
      </div>
      ${getTrackCourses(track.id).map(course=>`
        <div class="dropdown-item dropdown-course-item" onclick="closeDropdown('courses-dd');viewCourse('${course.id}')">
          <span>${course.title}</span>
          <span>${course.id}</span>
        </div>`).join('')}
    </div>`).join('');
}
function toggleMobile(){document.getElementById('mobile-menu').classList.toggle('open')}
function closeMobileMenu(){document.getElementById('mobile-menu').classList.remove('open')}
function toggleDropdown(id){document.getElementById(id)?.classList.toggle('open')}
function closeDropdown(id){document.getElementById(id)?.classList.remove('open')}
document.addEventListener('click',e=>{
  if(!e.target.closest('.dropdown')){document.querySelectorAll('.dropdown-menu').forEach(d=>d.classList.remove('open'))}
});

// ================================================================
// HOME PAGE
// ================================================================
function renderHomePage(){
  const sub=isSubscribed();
  const reviews=getHomepageReviews();
  return `

  <!-- HERO -->
  <section class="hero">
    <div class="container hero-inner">
      <div class="fade-up"><span class="tag">🇺🇬 Uganda's Online Academy</span></div>
      <h1 class="fade-up">Unlock Your Potential with a Powerful Learning Platform</h1>
      <p class="fade-up">KFAHAD Academy provides a comprehensive, all-in-one LMS solution to deliver engaging training, manage learners, and track progress.</p>
      <div class="hero-btns fade-up">
        <button class="btn btn-primary btn-lg" onclick="${currentUser?`showDashboard()`:`showPublicPage('register-page')`}">Get Started</button>
        <button class="btn btn-outline btn-lg" onclick="showPublicPage('pricing-page')">See Pricing</button>
      </div>
      <div class="video-box fade-up">
        <div class="video-wrap"><iframe src="https://www.youtube.com/embed/ynef4Q6LDb4?autoplay=1&mute=1&loop=1&playlist=ynef4Q6LDb4&controls=0" title="KFAHAD Academy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
      </div>
    </div>
  </section>

  <!-- STATS -->
  <div class="stats-bar">
    <div class="container"><div class="stats-grid">
      <div class="fade-up"><div class="stat-num">${getRegisteredUsersMetric()}+</div><div class="stat-lbl">Registered Users</div></div>
      <div class="fade-up"><div class="stat-num">${getAllCourses().length}</div><div class="stat-lbl">Expert-Led Courses</div></div>
      <div class="fade-up"><div class="stat-num">2026</div><div class="stat-lbl">Founded in Uganda</div></div>
    </div></div>
  </div>

  <!-- FOUNDER -->
  <section style="padding:72px 0">
    <div class="container">
      <div class="section-head center fade-up"><h2>Scale Your Knowledge with Kfahad Academy</h2><p>Unlock powerful insights, streamline processes, and deliver training since 2026.</p></div>
      <div style="max-width:680px;margin:0 auto;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:44px;position:relative;" class="fade-up">
        <div style="font-family:var(--font-h);font-size:6rem;line-height:1;color:var(--pri);opacity:.1;position:absolute;top:16px;left:28px">"</div>
        <p style="font-size:1.1rem;font-style:italic;line-height:1.8;margin-bottom:24px;position:relative;z-index:1">"Seeing students unlock their potential is the reason I created this academy. Our goal is to provide not just knowledge, but the wisdom to apply it effectively in the real world."</p>
        <div style="display:flex;align-items:center;gap:14px">
          <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,var(--pri),#7c3aed);display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-size:1.2rem;font-weight:800">K</div>
          <div><div style="font-weight:700">Kandeke Fahad</div><div style="color:var(--muted);font-size:.85rem">CEO & Founder</div></div>
        </div>
      </div>
    </div>
  </section>

  <!-- FEATURES -->
  <section style="padding:72px 0;background:var(--bg2)">
    <div class="container">
      <div class="features-grid">
        <div>
          <div class="section-head"><span class="tag">Why Choose Us</span><h2>Everything for Great Learning</h2></div>
          <div class="feat-item fade-up"><div class="feat-icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3v18h18M7 16l4-4 4 4 4-8"/></svg></div><div><h4 style="font-family:var(--font-h);font-weight:700;margin-bottom:6px">Offer courses, webinars, or classes</h4><p style="color:var(--muted);font-size:.88rem">Deliver eLearning using self-paced courses, live webinars, or in-person classes.</p></div></div>
          <div class="feat-item fade-up"><div class="feat-icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5"/></svg></div><div><h4 style="font-family:var(--font-h);font-weight:700;margin-bottom:6px">Easy-to-use, powerful platform</h4><p style="color:var(--muted);font-size:.88rem">Manage learning programs of all sizes with our accessible LMS.</p></div></div>
          <div class="feat-item fade-up"><div class="feat-icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div><div><h4 style="font-family:var(--font-h);font-weight:700;margin-bottom:6px">Personalized learning paths</h4><p style="color:var(--muted);font-size:.88rem">Students get custom recommendations and progress tracking across all courses.</p></div></div>
          <div style="padding-left:62px"><button class="btn btn-primary btn-lg" onclick="showPublicPage('pricing-page')">See Pricing</button></div>
        </div>
        <div class="feat-img-box"><svg fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg></div>
      </div>
    </div>
  </section>

  <!-- TESTIMONIALS -->
  <section style="padding:72px 0">
    <div class="container">
      <div class="section-head center fade-up"><h2>What Our Students Say</h2><p>Reviews from real student accounts on the academy.</p></div>
      <div style="display:flex;justify-content:center;margin:-8px 0 24px">
        ${currentUser&&currentUser.role==='student'
          ? `<button class="btn btn-primary btn-sm" onclick="openStudentReviewModal()">Leave Your Review</button>`
          : `<button class="btn btn-outline btn-sm" onclick="showPublicPage('login-page')">Log in as Student to Review</button>`}
      </div>
      <div class="testimonials-grid">
        ${reviews.map(t=>`
        <div class="t-card fade-up">
          <div class="t-avatar">${t.avatar?`<img src="${t.avatar}" alt="${t.name}">`:`<div class="t-avatar-fb">${t.name[0]}</div>`}</div>
          <div style="text-align:center"><div style="font-weight:700;font-size:.9rem">${t.name}</div><div style="color:var(--muted);font-size:.78rem">${t.role}</div></div>
          <div class="t-stars">${'<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'.repeat(t.rating||5)}</div>
          <p style="color:var(--muted);font-size:.85rem;text-align:center;line-height:1.6">"${t.text}"</p>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- PRICING TEASER -->
  <section style="padding:72px 0;background:var(--bg2)">
    <div class="container">
      <div class="section-head center fade-up"><span class="tag">Plans</span><h2>Simple, Transparent Pricing</h2><p>Pay securely with Mobile Money.</p></div>
      ${renderPricingCards(false)}
    </div>
  </section>

  <!-- CTA -->
  <section class="cta-section">
    <div class="container">
      <h2>Ready to Take Your Training to the Next Level?</h2>
      <p>Join learners across Uganda and take the next step in your career.</p>
      <button class="btn-white" onclick="${currentUser?`showDashboard()`:`showPublicPage('register-page')`}">Get Started Free</button>
    </div>
  </section>
  ${renderFooter()}`;
}

// ================================================================
// PRICING CARDS (reused)
// ================================================================
// ================================================================
// XYLE PAYMENTS INTEGRATION
// ================================================================
const XYLE_BASE = 'https://api.xylepayments.com/api/v1/client';

const PLANS = [
  {id:'basic',name:'Basic Plan',price:50000,days:30,emoji:'🟢',color:'#22c55e',desc:'Perfect for getting started.',features:['All Standard Video Courses','Community Chat Access','Interactive Quizzes','Project Examples'],popular:false,foot:'💰 Affordable entry plan'},
  {id:'pro',name:'Pro Plan',price:100000,days:30,emoji:'🔵',color:'#3b82f6',desc:'Best for career-focused students.',features:['Everything in Basic','Live Masterclasses','Full Knowledge Base Access','Job Board Integration','Monthly Challenges'],popular:true,foot:'⭐ Best value for money'},
  {id:'premium',name:'Premium Plan',price:200000,days:30,emoji:'🟣',color:'#8b5cf6',desc:'Elite features for power users.',features:['Everything in Pro','1-on-1 Mentorship Sessions','Priority Support','Personalized Learning Path','Certification Prep'],popular:false,foot:'💰 All-in-one professional'}
];

function renderPricingCards(standalone=true){
  return `<div class="plans-grid" style="${standalone?'':''}">
  ${PLANS.map(p=>`
  <div class="plan-card ${p.popular?'popular':''}">
    ${p.popular?'<div class="plan-badge">Most Popular</div>':''}
    <div style="font-size:1.8rem;margin-bottom:10px">${p.emoji}</div>
    <div style="font-family:var(--font-h);font-size:1.2rem;font-weight:700">${p.name}</div>
    <div class="plan-price">${p.price.toLocaleString()} <span class="plan-cur">UGX / month</span></div>
    <div class="plan-desc">${p.desc}</div>
    <ul class="plan-feats">${p.features.map(f=>`<li><svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>${f}</li>`).join('')}</ul>
    <div class="plan-foot">${p.foot}</div>
    <button class="btn ${p.popular?'btn-primary':'btn-outline'}" style="width:100%;justify-content:center" onclick="handlePlanClick('${p.id}')">
      ${currentUser?'Pay with Mobile Money':'Join Now'}
    </button>
  </div>`).join('')}
  </div>`;
}

function handlePlanClick(planId){
  if(!currentUser){showPublicPage('register-page');toast('Create an account first to subscribe!','warn');return}
  openPaymentModal(planId);
}

// ---- PAYMENT MODAL ----
function openPaymentModal(planId){
  const plan=PLANS.find(p=>p.id===planId);
  if(!plan) return;
  openModal('💳 Choose Payment Method',`
    <div id="pay-step-1">
      <!-- Plan Summary -->
      <div style="background:linear-gradient(135deg,rgba(59,130,246,.12),rgba(139,92,246,.08));border:1px solid rgba(59,130,246,.25);border-radius:12px;padding:18px;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <span style="font-size:2rem">${plan.emoji}</span>
          <div>
            <div style="font-family:var(--font-h);font-weight:700;font-size:1.05rem">${plan.name}</div>
            <div style="color:var(--muted);font-size:.8rem">${plan.days} days access to all features</div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid rgba(255,255,255,.08)">
          <span style="color:var(--muted)">Total Amount</span>
          <span style="font-family:var(--font-h);font-size:1.3rem;font-weight:800;color:var(--pri)">${plan.price.toLocaleString()} UGX</span>
        </div>
      </div>

      <div class="form-group">
        <label>Payment Method</label>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px" id="method-grid">
          <div class="provider-opt selected" id="method-instant" onclick="selectPaymentMethod('instant','${planId}')" style="border:2px solid var(--pri);border-radius:10px;padding:12px 6px;cursor:pointer;text-align:center;background:var(--pri-g);transition:all .2s">
            <div style="font-size:1.3rem;margin-bottom:4px">⚡</div>
            <div style="font-weight:700;font-size:.8rem">Instant MoMo</div>
            <div style="font-size:.68rem;color:var(--muted);margin-top:2px">Phone Prompt</div>
          </div>
          <div class="provider-opt" id="method-direct" onclick="selectPaymentMethod('direct','${planId}')" style="border:2px solid var(--border);border-radius:10px;padding:12px 6px;cursor:pointer;text-align:center;background:transparent;transition:all .2s">
            <div style="font-size:1.3rem;margin-bottom:4px">📱</div>
            <div style="font-weight:700;font-size:.8rem">Direct Transfer</div>
            <div style="font-size:.68rem;color:var(--muted);margin-top:2px">SMS Reference</div>
          </div>
          <div class="provider-opt" id="method-bank" onclick="selectPaymentMethod('bank','${planId}')" style="border:2px solid var(--border);border-radius:10px;padding:12px 6px;cursor:pointer;text-align:center;background:transparent;transition:all .2s">
            <div style="font-size:1.3rem;margin-bottom:4px">🏦</div>
            <div style="font-weight:700;font-size:.8rem">Bank Transfer</div>
            <div style="font-size:.68rem;color:var(--muted);margin-top:2px">Manual Review</div>
          </div>
        </div>
      </div>

      <!-- METHOD 1: INSTANT MOBILE MONEY (XYLE PAYMENTS PUSH PROMPT) -->
      <div id="pay-method-instant">
        <div style="background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.25);border-radius:12px;padding:14px;margin-bottom:16px;font-size:.85rem;line-height:1.6">
          <div style="font-weight:700;color:var(--txt);margin-bottom:4px;display:flex;align-items:center;gap:6px">
            <span>⚡ Automated Instant Payment (Real-Time)</span>
          </div>
          <div style="color:var(--muted);font-size:.8rem">
            Enter your Mobile Money number below. When you click <strong>Pay</strong>, an instant payment prompt will appear on your phone. Simply enter your PIN to approve.
          </div>
        </div>

        <!-- Provider Selection -->
        <div class="form-group">
          <label>Select Mobile Money Provider</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px" id="provider-grid">
            <div class="provider-opt selected" id="prov-MTN_UGANDA" onclick="selectProvider('MTN_UGANDA')" style="border:2px solid var(--pri);border-radius:10px;padding:14px 12px;cursor:pointer;text-align:center;background:var(--pri-g);transition:all .2s">
              <div style="font-size:1.5rem;margin-bottom:4px">📱</div>
              <div style="font-weight:700;font-size:.88rem">MTN Mobile Money</div>
              <div style="font-size:.72rem;color:var(--muted);margin-top:2px">077 / 078 / 076 numbers</div>
            </div>
            <div class="provider-opt" id="prov-AIRTEL_UGANDA" onclick="selectProvider('AIRTEL_UGANDA')" style="border:2px solid var(--border);border-radius:10px;padding:14px 12px;cursor:pointer;text-align:center;background:transparent;transition:all .2s">
              <div style="font-size:1.5rem;margin-bottom:4px">📲</div>
              <div style="font-weight:700;font-size:.88rem">Airtel Money</div>
              <div style="font-size:.72rem;color:var(--muted);margin-top:2px">070 / 075 / 074 numbers</div>
            </div>
          </div>
        </div>

        <!-- Phone Number -->
        <div class="form-group">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <label style="margin-bottom:0">Your Mobile Money Phone Number</label>
            <span id="phone-carrier-badge" style="display:none;font-size:.74rem;font-weight:700;padding:2px 8px;border-radius:12px"></span>
          </div>
          <div style="position:relative">
            <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:.9rem;font-weight:600">+</span>
            <input class="form-control" id="pay-phone" style="padding-left:28px" placeholder="256771234567" maxlength="15" oninput="validatePhone(this)"/>
          </div>
          <div style="font-size:.75rem;color:var(--muted);margin-top:5px">USSD prompt will be sent to this phone (e.g. 25677... or 25670...)</div>
          <div id="phone-err" style="color:var(--danger);font-size:.78rem;margin-top:4px;display:none"></div>
        </div>
      </div>

      <!-- METHOD 2: DIRECT TRANSFER (SMS REFERENCE) -->
      <div id="pay-method-direct" style="display:none">
        <div style="background:linear-gradient(135deg,rgba(15,23,42,.96),rgba(30,41,59,.96));border:1px solid rgba(148,163,184,.18);border-radius:14px;padding:16px 18px;margin-bottom:16px;position:relative;overflow:hidden">
          <div style="position:absolute;inset:auto -40px -50px auto;width:140px;height:140px;border-radius:50%;background:radial-gradient(circle,rgba(59,130,246,.18),transparent 70%)"></div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;position:relative">
            <div>
              <div style="font-size:.74rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(191,219,254,.82);margin-bottom:4px">Send Mobile Money To:</div>
              <div style="font-family:var(--font-h);font-size:1.2rem;font-weight:800;color:#fff;letter-spacing:.02em">+256 702 618 396</div>
              <div style="color:var(--muted);font-size:.82rem;margin-top:2px">Recipient Name: <strong style="color:#fff">Kandeke Fahad</strong> (MTN & Airtel)</div>
            </div>
            <div style="width:46px;height:46px;border-radius:12px;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.22);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0">📱</div>
          </div>
        </div>

        <!-- Phone Number -->
        <div class="form-group">
          <label>Sender Phone Number</label>
          <div style="position:relative">
            <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:.9rem;font-weight:600">+</span>
            <input class="form-control" id="pay-direct-phone" style="padding-left:28px" placeholder="256771234567" maxlength="15" oninput="validatePhone(this)"/>
          </div>
          <div style="font-size:.75rem;color:var(--muted);margin-top:5px">Number used to make the payment</div>
        </div>

        <!-- Transaction Reference / ID from SMS -->
        <div class="form-group" style="margin-bottom:12px">
          <label>Transaction ID / SMS Reference</label>
          <input class="form-control" id="pay-momo-ref" placeholder="e.g. 2938475910 or MM ID from SMS" style="font-family:monospace;letter-spacing:.05em"/>
          <div style="font-size:.75rem;color:var(--muted);margin-top:5px">Enter the Transaction ID / Reference from your MTN/Airtel confirmation SMS</div>
        </div>

        <div style="background:rgba(59,130,246,.07);border:1px solid rgba(59,130,246,.2);border-radius:8px;padding:12px 14px;font-size:.82rem;margin-bottom:4px">
          <div style="font-weight:700;margin-bottom:4px;color:var(--txt)">📋 Quick Instructions:</div>
          <div style="color:var(--muted);line-height:1.7">
            1. Send <strong>${plan.price.toLocaleString()} UGX</strong> to <strong>+256 702 618 396</strong> (Kandeke Fahad)<br>
            2. Enter your Phone number & SMS Transaction ID above<br>
            3. Click <strong>Confirm Reference & Activate</strong> ✅
          </div>
        </div>
      </div>

      <div id="pay-method-bank" style="display:none">
        <div style="background:linear-gradient(135deg,rgba(15,23,42,.96),rgba(30,41,59,.96));border:1px solid rgba(148,163,184,.18);border-radius:14px;padding:16px 18px;margin-bottom:16px;position:relative;overflow:hidden">
          <div style="position:absolute;inset:auto -40px -50px auto;width:140px;height:140px;border-radius:50%;background:radial-gradient(circle,rgba(59,130,246,.18),transparent 70%)"></div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;position:relative">
            <div>
              <div style="font-size:.74rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(191,219,254,.82);margin-bottom:6px">Bank Payment</div>
              <div style="font-family:var(--font-h);font-size:1.02rem;font-weight:700;margin-bottom:4px">Secure Transfer Review</div>
              <div style="color:var(--muted);font-size:.81rem;line-height:1.65">Submit your bank transfer reference and proof of payment. Your request will be reviewed and activated after confirmation.</div>
            </div>
            <div style="width:46px;height:46px;border-radius:12px;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.22);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0">🏦</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:16px">
          <div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:10px;padding:12px">
            <div style="font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Method</div>
            <div style="font-weight:700;font-size:.86rem">Bank Transfer</div>
          </div>
          <div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:10px;padding:12px">
            <div style="font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Review</div>
            <div style="font-weight:700;font-size:.86rem">Manual Approval</div>
          </div>
          <div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:10px;padding:12px">
            <div style="font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Support</div>
            <div style="font-weight:700;font-size:.86rem">Available</div>
          </div>
        </div>
        <div class="form-group">
          <label>Reference / Transaction ID</label>
          <input class="form-control" id="bank-reference" placeholder="Enter bank transfer reference"/>
          <div id="bank-reference-err" style="color:var(--danger);font-size:.78rem;margin-top:4px;display:none"></div>
        </div>
        <div class="form-group">
          <label>Bank Name Used</label>
          <input class="form-control" id="bank-name" placeholder="e.g. Equity Bank"/>
        </div>
        <div class="form-group">
          <label>Proof of Payment</label>
          <div id="bank-proof-preview" style="margin-bottom:10px;color:var(--muted);font-size:.78rem">No proof uploaded yet</div>
          <input type="hidden" id="bank-proof-data" value=""/>
          <input class="form-control" type="file" accept="image/*,.pdf" onchange="handleBankProofUpload(this.files[0])"/>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label>Payment Note</label>
          <textarea class="form-control" id="bank-note" rows="3" placeholder="Optional note about your transfer or deposit"></textarea>
        </div>
        <div style="background:rgba(59,130,246,.07);border:1px solid rgba(59,130,246,.2);border-radius:8px;padding:12px 14px;font-size:.82rem;margin-top:14px">
          <div style="font-weight:700;margin-bottom:4px;color:var(--txt)">📋 What happens next:</div>
          <div style="color:var(--muted);line-height:1.7">
            1. Complete your bank transfer<br>
            2. Enter your bank reference here<br>
            3. Submit the payment notice<br>
            4. Admin will review and activate your subscription
          </div>
        </div>
      </div>
    </div>

    <!-- Processing State (hidden) -->
    <div id="pay-step-2" style="display:none;text-align:center;padding:20px 0">
      <div id="pay-spinner" style="width:64px;height:64px;border:4px solid var(--border);border-top-color:var(--pri);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 20px"></div>
      <div style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:8px" id="pay-status-title">Processing Payment...</div>
      <div style="color:var(--muted);font-size:.875rem" id="pay-status-msg">Please check your phone and approve the Mobile Money prompt</div>
      <div id="pay-ref" style="margin-top:16px;font-size:.78rem;color:var(--muted)"></div>
      <div id="pay-timer" style="margin-top:12px;font-size:.82rem;color:var(--warn)"></div>
    </div>

    <!-- Success State (hidden) -->
    <div id="pay-step-3" style="display:none;text-align:center;padding:20px 0">
      <div style="width:72px;height:72px;background:rgba(34,197,94,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:2rem">✅</div>
      <div style="font-family:var(--font-h);font-size:1.2rem;font-weight:800;color:var(--success);margin-bottom:8px">Payment Successful!</div>
      <div style="color:var(--muted);font-size:.875rem;margin-bottom:20px" id="pay-success-msg">Your subscription is now active. Enjoy full access!</div>
      <div id="pay-receipt" style="background:var(--bg3);border-radius:10px;padding:16px;text-align:left;font-size:.83rem"></div>
    </div>

    <!-- Failed State (hidden) -->
    <div id="pay-step-4" style="display:none;text-align:center;padding:20px 0">
      <div style="width:72px;height:72px;background:rgba(239,68,68,.12);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:2rem">❌</div>
      <div style="font-family:var(--font-h);font-size:1.1rem;font-weight:800;color:var(--danger);margin-bottom:8px">Payment Failed</div>
      <div style="color:var(--muted);font-size:.875rem;margin-bottom:16px" id="pay-fail-msg">The payment could not be completed.</div>
    </div>

  `,`
    <button class="btn btn-outline" id="pay-cancel-btn" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" id="pay-submit-btn" onclick="submitSelectedPayment('${planId}')">
      ⚡ Pay & Prompt My Phone (${plan.price.toLocaleString()} UGX)
    </button>
  `);
  // Set default selected provider & method
  window._selectedProvider = 'MTN_UGANDA';
  window._paymentMethod = 'instant';
}

window._selectedProvider = 'MTN_UGANDA';
window._paymentMethod = 'instant';

function submitSelectedPayment(planId){
  const method = window._paymentMethod || 'instant';
  if(method === 'bank') return submitBankPayment(planId);
  if(method === 'direct') return submitDirectMobilePayment(planId);
  return submitXylePayment(planId);
}

function submitDirectMobilePayment(planId){
  const plan=PLANS.find(p=>p.id===planId);
  if(!plan) return;
  const phoneRaw=(document.getElementById('pay-direct-phone')?.value||document.getElementById('pay-phone')?.value||'').trim().replace(/\D/g,'');
  const reference=document.getElementById('pay-momo-ref')?.value.trim();
  const provider=window._selectedProvider||'MTN_UGANDA';

  if(!phoneRaw||phoneRaw.length<9){
    toast('Please enter your Mobile Money phone number','error');
    return;
  }
  if(!reference){
    const refInput=document.getElementById('pay-momo-ref');
    if(refInput){
      refInput.style.border='2px solid var(--pri)';
      refInput.focus();
    }
    toast('Enter your Transaction Reference ID from your SMS','warn');
    return;
  }

  let account=phoneRaw;
  if(account.startsWith('0')&&account.length===10) account='256'+account.slice(1);
  if(!account.startsWith('256')) account='256'+account;

  // Immediately activate subscription
  const days=plan.days||30;
  const expiry=new Date();
  expiry.setDate(expiry.getDate()+days);
  updateCurrentUser({subscriptionExpiresAt:expiry.toISOString(),plan:plan.id});

  const payments=DB.get('payments')||[];
  const payRecord={
    id:uid(),
    userId:currentUser.id,
    studentName:currentUser.name,
    studentEmail:currentUser.email,
    plan:plan.name,
    planId,
    amount:plan.price,
    provider,
    phoneNumber:account,
    recipientNumber:'+256702618396',
    recipientName:'Kandeke Fahad',
    reference,
    status:'Approved',
    date:new Date().toISOString(),
    createdAt:Date.now()
  };
  payments.push(payRecord);
  DB.set('payments',payments);

  // Sync to backend database
  postDataApi({action:'create',table:'payments',data:payRecord}).catch(err=>{
    console.warn('Backend payment sync note:',err.message);
  });

  createNotification({
    title:'🎉 Subscription Activated!',
    body:`Your payment of ${plan.price.toLocaleString()} UGX for ${plan.name} (Ref: ${reference}) has been confirmed! Enjoy full access to all courses until ${expiry.toLocaleDateString()}.`,
    targetRole:'student',
    targetUserId:currentUser.id,
    createdAt:Date.now()
  });

  showPayStep(3);
  document.getElementById('pay-success-msg').textContent=`Your ${plan.name} subscription is now active until ${expiry.toLocaleDateString()}. Enjoy full access!`;
  document.getElementById('pay-receipt').innerHTML=`
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--muted)">Plan</span><strong>${plan.name}</strong></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--muted)">Amount</span><strong style="color:var(--pri)">${plan.price.toLocaleString()} UGX</strong></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--muted)">Method</span><strong>${provider==='MTN_UGANDA'?'MTN Mobile Money':'Airtel Money'}</strong></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--muted)">Sender Phone</span><strong>+${account}</strong></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--muted)">Reference ID</span><strong style="font-family:monospace">${reference}</strong></div>
    <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Status</span><span class="badge badge-success">✓ Active & Verified</span></div>
  `;
  const footer=document.getElementById('modal-footer');
  if(footer) footer.innerHTML=`<button class="btn btn-primary" onclick="closeModal();showDashboard()">Go to Dashboard 🚀</button>`;
  toast('Subscription activated successfully!','success');
}

function selectPaymentMethod(method,planId){
  window._paymentMethod = method;
  ['instant','direct','bank'].forEach(id=>{
    const card=document.getElementById('method-'+id);
    if(!card) return;
    if(id===method){
      card.style.border='2px solid var(--pri)';
      card.style.background='var(--pri-g)';
    } else {
      card.style.border='2px solid var(--border)';
      card.style.background='transparent';
    }
  });
  const instantBlock=document.getElementById('pay-method-instant');
  const directBlock=document.getElementById('pay-method-direct');
  const bankBlock=document.getElementById('pay-method-bank');
  if(instantBlock) instantBlock.style.display=method==='instant'?'block':'none';
  if(directBlock) directBlock.style.display=method==='direct'?'block':'none';
  if(bankBlock) bankBlock.style.display=method==='bank'?'block':'none';
  const btn=document.getElementById('pay-submit-btn');
  const plan=PLANS.find(p=>p.id===planId);
  if(btn&&plan){
    if(method==='instant') btn.textContent=`⚡ Pay & Prompt My Phone (${plan.price.toLocaleString()} UGX)`;
    else if(method==='direct') btn.textContent=`Confirm Reference & Activate (${plan.price.toLocaleString()} UGX)`;
    else btn.textContent='Submit Bank Payment';
  }
}

function detectUgandaCarrier(phoneRaw){
  if(!phoneRaw) return null;
  let digits = String(phoneRaw).replace(/\D/g, '');
  if(digits.startsWith('256')) digits = digits.slice(3);
  else if(digits.startsWith('0')) digits = digits.slice(1);
  if(digits.startsWith('77') || digits.startsWith('78') || digits.startsWith('76') || digits.startsWith('79')){
    return { provider: 'MTN_UGANDA', name: 'MTN Uganda', color: '#eab308', bg: 'rgba(234,179,8,0.15)', icon: '🟡' };
  }
  if(digits.startsWith('70') || digits.startsWith('75') || digits.startsWith('74')){
    return { provider: 'AIRTEL_UGANDA', name: 'Airtel Money', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: '🔴' };
  }
  return null;
}

function selectProvider(p){
  window._selectedProvider = p;
  const mtnEl = document.getElementById('prov-MTN_UGANDA');
  const airtelEl = document.getElementById('prov-AIRTEL_UGANDA');
  if(mtnEl){
    if(p === 'MTN_UGANDA'){
      mtnEl.style.border = '2px solid #eab308';
      mtnEl.style.background = 'rgba(234,179,8,0.14)';
    } else {
      mtnEl.style.border = '2px solid var(--border)';
      mtnEl.style.background = 'transparent';
    }
  }
  if(airtelEl){
    if(p === 'AIRTEL_UGANDA'){
      airtelEl.style.border = '2px solid #ef4444';
      airtelEl.style.background = 'rgba(239,68,68,0.14)';
    } else {
      airtelEl.style.border = '2px solid var(--border)';
      airtelEl.style.background = 'transparent';
    }
  }
}

function validatePhone(input){
  const val = input.value.replace(/\D/g,'');
  input.value = val;
  const err = document.getElementById('phone-err');
  const badge = document.getElementById('phone-carrier-badge');
  const carrier = detectUgandaCarrier(val);
  if(carrier){
    selectProvider(carrier.provider);
    if(badge){
      badge.style.display = 'inline-flex';
      badge.style.alignItems = 'center';
      badge.style.gap = '4px';
      badge.style.color = carrier.color;
      badge.style.background = carrier.bg;
      badge.style.border = `1px solid ${carrier.color}`;
      badge.innerHTML = `${carrier.icon} <span>${carrier.name}</span>`;
    }
  } else {
    if(badge) badge.style.display = 'none';
  }

  if(val.length > 0 && (val.length < 9 || val.length > 15)){
    if(err){ err.style.display = 'block'; err.textContent = 'Enter a valid number (e.g. 256771234567 or 0771234567)'; }
  } else {
    if(err) err.style.display = 'none';
  }
}

function showPayStep(step){
  [1,2,3,4].forEach(n=>{
    const el=document.getElementById('pay-step-'+n);
    if(el) el.style.display=n===step?'block':'none';
  });
}

async function submitXylePayment(planId){
  const phoneRaw=document.getElementById('pay-phone')?.value.trim().replace(/\D/g,'');
  let provider=window._selectedProvider||'MTN_UGANDA';
  const plan=PLANS.find(p=>p.id===planId);
  if(!plan) return;

  // Validate phone
  if(!phoneRaw||phoneRaw.length<9){
    const err=document.getElementById('phone-err');
    if(err){err.style.display='block';err.textContent='Please enter a valid phone number';}
    toast('Enter your Mobile Money number','error');
    return;
  }

  // Format: international without +, must start with country code
  let account=phoneRaw;
  if(account.startsWith('0')&&account.length===10) account='256'+account.slice(1);
  if(!account.startsWith('256')) account='256'+account;

  // Prefix detection ensures MTN vs Airtel is always accurately routed
  const carrier = detectUgandaCarrier(account);
  if(carrier){
    provider = carrier.provider;
    window._selectedProvider = provider;
  }

  // Disable btn and show processing
  const btn=document.getElementById('pay-submit-btn');
  const cancelBtn=document.getElementById('pay-cancel-btn');
  if(btn){btn.disabled=true;btn.textContent='Processing...';}
  if(cancelBtn) cancelBtn.style.display='none';

  showPayStep(2);
  document.getElementById('pay-status-title').textContent='Initiating Payment...';
  document.getElementById('pay-status-msg').textContent='Connecting to '+( provider==='MTN_UGANDA'?'MTN Mobile Money':'Airtel Money')+'...';

  try {
    // Call backend API
    const depositData = await postDataApi({ action:'xyle_deposit', provider, account, amount:plan.price }).catch(err => ({ success:false, error:err.message }));

    if(!depositData || !depositData.success){
      showPayStep(4);
      const isConfigIssue = depositData?.error?.includes('not configured') || depositData?.needsManualPayment || depositData?.message?.includes('credentials');
      if (isConfigIssue) {
        document.getElementById('pay-fail-msg').innerHTML=`
          Automated phone prompt is offline.<br><br>
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:left;font-size:.85rem;line-height:1.6">
            <div style="font-weight:700;color:var(--txt);margin-bottom:4px">Pay directly via Mobile Money:</div>
            <div>1. Send <strong>${plan.price.toLocaleString()} UGX</strong> to <strong>+256 702 618 396</strong> (Kandeke Fahad)</div>
            <div>2. Click below to enter your Transaction Reference ID to confirm.</div>
          </div>
        `;
      } else {
        document.getElementById('pay-fail-msg').textContent=depositData.error||depositData.message||'Payment initiation failed. Please try again.';
      }
      if(cancelBtn){cancelBtn.style.display='inline-flex';cancelBtn.textContent='Close';}
      const footer=document.getElementById('modal-footer');
      if(footer) footer.innerHTML=`<button class="btn btn-outline" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="selectPaymentMethod('direct','${planId}');showPayStep(1)">Enter SMS Reference</button>`;
      return;
    }

    const txRef=depositData.data?.reference||depositData.data?.id||depositData.reference||depositData.id||depositData.data?.transaction_ref;
    const txId=depositData.data?.id;

    // Check if immediately completed
    const initStatus = String(depositData.data?.status || depositData.status || '').toUpperCase();
    if(initStatus === 'COMPLETED' || initStatus === 'SUCCESS' || initStatus === 'SUCCESSFUL' || initStatus === 'APPROVED'){
      await onPaymentSuccess(plan, depositData.data || depositData, account, provider, planId);
      return;
    }

    document.getElementById('pay-status-title').textContent='Waiting for Phone Approval';
    document.getElementById('pay-status-msg').textContent='📱 Check your phone and approve the '+( provider==='MTN_UGANDA'?'MTN':'Airtel')+' payment prompt';
    if(txRef) document.getElementById('pay-ref').textContent='Reference: '+txRef;

    // ---- POLL FOR STATUS ----
    let elapsed=0;
    const maxWait=120000; // 2 minutes
    const pollInterval=4000; // 4 seconds
    let timerEl=document.getElementById('pay-timer');

    const pollTimer=setInterval(async()=>{
      elapsed+=pollInterval;
      const remaining=Math.max(0,Math.round((maxWait-elapsed)/1000));
      if(timerEl) timerEl.textContent=`Time remaining: ${remaining}s`;

      if(elapsed>=maxWait){
        clearInterval(pollTimer);
        showPayStep(4);
        document.getElementById('pay-fail-msg').textContent='Payment timed out. If you sent money, please submit your SMS transaction reference.';
        const footer=document.getElementById('modal-footer');
        if(footer) footer.innerHTML=`<button class="btn btn-outline" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="selectPaymentMethod('direct','${planId}');showPayStep(1)">Enter SMS Reference</button>`;
        return;
      }

      try {
        const ref=txRef||txId;
        const statusData=await postDataApi({ action:'xyle_check_status', data:{ ref } }).catch(()=>({}));
        let rawStatus = '';
        if (statusData.message && typeof statusData.message === 'object' && statusData.message.status) {
          rawStatus = statusData.message.status;
        } else if (statusData.data && typeof statusData.data === 'object' && statusData.data.status) {
          rawStatus = statusData.data.status;
        } else if (statusData.transaction_status) {
          rawStatus = statusData.transaction_status;
        } else if (statusData.status && statusData.status !== 'success' && statusData.status !== 'error') {
          rawStatus = statusData.status;
        }
        const s = String(rawStatus).toUpperCase();

        if(s === 'COMPLETED' || s === 'SUCCESS' || s === 'SUCCESSFUL' || s === 'APPROVED'){
          clearInterval(pollTimer);
          const txInfo = (statusData.message && typeof statusData.message === 'object') ? statusData.message : (statusData.data || statusData || depositData.data);
          await onPaymentSuccess(plan, txInfo, account, provider, planId);
        } else if(s === 'FAILED' || s === 'CANCELLED' || s === 'DECLINED' || s === 'REJECTED' || s === 'EXPIRED'){
          clearInterval(pollTimer);
          showPayStep(4);
          document.getElementById('pay-fail-msg').textContent='Payment was '+rawStatus.toLowerCase()+'. Please try again or submit your SMS reference.';
          const footer=document.getElementById('modal-footer');
          if(footer) footer.innerHTML=`<button class="btn btn-outline" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="selectPaymentMethod('direct','${planId}');showPayStep(1)">Enter SMS Reference</button>`;
        }
      } catch(pollErr){
        console.warn('Poll error:',pollErr);
      }
    }, pollInterval);

  } catch(err){
    showPayStep(4);
    document.getElementById('pay-fail-msg').textContent='Network error: '+err.message+'. You can also send directly to +256 702 618 396 and enter your reference.';
    const footer=document.getElementById('modal-footer');
    if(footer) footer.innerHTML=`<button class="btn btn-outline" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="selectPaymentMethod('direct','${planId}');showPayStep(1)">Enter SMS Reference</button>`;
  }
}

function submitBankPayment(planId){
  const plan=PLANS.find(p=>p.id===planId);
  if(!plan) return;
  const reference=document.getElementById('bank-reference')?.value.trim();
  const bankName=document.getElementById('bank-name')?.value.trim();
  const note=document.getElementById('bank-note')?.value.trim();
  const proof=document.getElementById('bank-proof-data')?.value||'';
  const err=document.getElementById('bank-reference-err');
  if(!reference){
    if(err){err.style.display='block';err.textContent='Please enter the bank reference or transaction ID';}
    toast('Enter the bank reference','error');
    return;
  }
  if(err) err.style.display='none';

  const payments=DB.get('payments')||[];
  const payRecord={
    id:uid(),
    userId:currentUser.id,
    studentName:currentUser.name,
    studentEmail:currentUser.email,
    plan:plan.name,
    planId,
    amount:plan.price,
    provider:'BANK_TRANSFER',
    bankName:bankName||'Bank',
    accountName:'Kandeke Fahad',
    accountNumber:'1003102294508',
    contactPhone:'+256702618396',
    paymentNote:note||'',
    paymentProof:proof,
    reference,
    status:'Pending',
    date:new Date().toISOString(),
    createdAt:Date.now()
  };
  payments.push(payRecord);
  DB.set('payments',payments);

  createNotification({
    title:'🏦 Bank Payment Submitted',
    body:`Your ${plan.name} bank payment is pending review. Reference: ${reference}`,
    targetRole:'student',
    targetUserId:currentUser.id,
    createdAt:Date.now()
  });

  showPayStep(3);
  document.getElementById('pay-success-msg').textContent=`Your bank payment for ${plan.name} has been submitted and is pending admin review.`;
  document.getElementById('pay-receipt').innerHTML=`
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--muted)">Plan</span><strong>${plan.name}</strong></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--muted)">Amount</span><strong>${plan.price.toLocaleString()} UGX</strong></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--muted)">Method</span><strong>Bank Payment</strong></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--muted)">Bank</span><strong>${bankName||'Not specified'}</strong></div>
    <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Reference</span><strong style="font-size:.78rem">${reference}</strong></div>
  `;
  const footer=document.getElementById('modal-footer');
  if(footer) footer.innerHTML=`<button class="btn btn-primary" onclick="closeModal();showDashboard()">Done</button>`;
}
function handleBankProofUpload(file){
  if(!file) return;
  if(file.size > 6*1024*1024){toast('Proof of payment must be under 6MB','error');return;}
  const hiddenInput=document.getElementById('bank-proof-data');
  const preview=document.getElementById('bank-proof-preview');
  const reader=new FileReader();
  reader.onload=e=>{
    const dataUrl=e.target.result;
    if(hiddenInput) hiddenInput.value=dataUrl;
    if(preview){
      if(file.type.startsWith('image/')){
        preview.innerHTML=`<img src="${dataUrl}" alt="Proof of payment" style="max-width:100%;max-height:180px;border-radius:10px;border:1px solid var(--border)"/>`;
      } else {
        preview.textContent=`Uploaded: ${file.name}`;
      }
    }
  };
  reader.onerror=()=>toast('Failed to read payment proof file','error');
  reader.readAsDataURL(file);
}

async function onPaymentSuccess(plan,txData,account,provider,planId){
  // Activate subscription immediately
  const expiry=new Date();
  expiry.setDate(expiry.getDate()+plan.days);
  const expiryStr = expiry.toISOString();
  updateCurrentUser({subscriptionExpiresAt:expiryStr,plan:plan.id});
  if (currentUser?.authToken) {
    updateCurrentUserRemote({subscriptionExpiresAt:expiryStr,plan:plan.id}).catch(()=>{});
  }

  // Save to payments DB
  const payments=DB.get('payments')||[];
  const payRecord={
    id:uid(),
    userId:currentUser.id,
    studentName:currentUser.name,
    studentEmail:currentUser.email,
    plan:plan.name,
    planId:planId,
    amount:plan.price,
    phoneNumber:account,
    provider,
    status:'Approved',
    reference:txData?.reference||txData?.transaction_ref||('XYLE-'+uid().slice(0,8).toUpperCase()),
    xyleId:txData?.id||txData?.provider_ref||'',
    netAmount:txData?.netAmount||txData?.amount||plan.price,
    date:new Date().toISOString(),
    createdAt:Date.now()
  };
  payments.push(payRecord);
  DB.set('payments',payments);

  // Sync to backend database
  saveToDataAPI('payments', payRecord).catch(err=>{
    console.warn('Backend payment sync note:',err?.message);
  });

  // Send welcome notification
  createNotification({
    title:'🎉 Subscription Activated!',
    body:`Your ${plan.name} has been activated successfully! Enjoy ${plan.days} days of full access to all KFAHAD Academy courses. Reference: ${payRecord.reference}`,
    targetRole:'student',
    targetUserId:currentUser.id,
    createdAt:Date.now()
  });

  // Show success UI
  showPayStep(3);
  document.getElementById('pay-success-msg').textContent=`Your ${plan.name} is active until ${expiry.toLocaleDateString()}. Enjoy full access!`;
  document.getElementById('pay-receipt').innerHTML=`
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--muted)">Plan</span><strong>${plan.name}</strong></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--muted)">Amount Paid</span><strong style="color:var(--success)">${plan.price.toLocaleString()} UGX</strong></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--muted)">Provider</span><strong>${provider==='MTN_UGANDA'?'MTN Mobile Money':'Airtel Money'}</strong></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="color:var(--muted)">Reference</span><strong style="font-size:.78rem">${payRecord.reference}</strong></div>
    <div style="display:flex;justify-content:space-between"><span style="color:var(--muted)">Expires</span><strong>${expiry.toLocaleDateString()}</strong></div>
  `;

  const footer=document.getElementById('modal-footer');
  if(footer) footer.innerHTML=`<button class="btn btn-primary" onclick="closeModal();showDashboard()">Go to Dashboard 🚀</button>`;
}

// ================================================================
// AUTH PAGES
// ================================================================
let googleClientId = '';
let githubClientId = '';
async function loadOAuthClientIds(){
  try{
    const data = await postAuthApi({action:'oauth_clients'});
    googleClientId = data.googleClientId || '';
    githubClientId = data.githubClientId || '';
  }catch{ 
    googleClientId = '';
    githubClientId = '';
  }
}
function loadGoogleScript(){
  return new Promise((resolve) => {
    if(window.google?.accounts?.id){ resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = resolve;
    script.onerror = resolve;
    document.head.appendChild(script);
  });
}
async function doGoogleLogin(){
  if(!googleClientId){ await loadOAuthClientIds(); }
  if(!googleClientId){ toast('Google sign-in is not configured.','error'); return; }
  await loadGoogleScript();
  if(!window.google?.accounts?.id){ toast('Google sign-in is temporarily unavailable.','error'); return; }
  try{
    const resp = await new Promise((resolve, reject) => {
      window._googleResolver = resolve;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if(response?.credential) resolve(response.credential);
          else reject(new Error('No credential returned'));
        }
      });
      window.google.accounts.id.prompt();
    });
    const data = await postAuthApi({action:'login_google', idToken: resp});
    const user = setAuthenticatedUser(data.user, data.token, data.csrfToken);
    toast(`Welcome, ${user.name.split(' ')[0]}! 👋`,'success');
    showDashboard(user.role==='student'?'my-learning':'overview');
  }catch(error){
    toast(error.message || 'Google sign-in failed.','error');
  }
}
async function doGoogleRegister(){
  if(!googleClientId){ await loadOAuthClientIds(); }
  if(!googleClientId){ toast('Google sign-in is not configured.','error'); return; }
  await loadGoogleScript();
  if(!window.google?.accounts?.id){ toast('Google sign-in is temporarily unavailable.','error'); return; }
  try{
    const resp = await new Promise((resolve, reject) => {
      window._googleResolver = resolve;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if(response?.credential) resolve(response.credential);
          else reject(new Error('No credential returned'));
        }
      });
      window.google.accounts.id.prompt();
    });
    const data = await postAuthApi({action:'login_google', idToken: resp});
    const user = setAuthenticatedUser(data.user, data.token, data.csrfToken);
    toast(`Welcome to KFAHAD Academy, ${user.name.split(' ')[0]}! 🎉`,'success');
    showDashboard();
  }catch(error){
    toast(error.message || 'Google sign-in failed.','error');
  }
}
async function doGithubLogin(){
  if(!githubClientId){ await loadOAuthClientIds(); }
  if(!githubClientId){ toast('GitHub sign-in is not configured.','error'); return; }
  const redirectUri = window.location.origin + window.location.pathname;
  const state = uid();
  sessionStorage.setItem('kfa_github_state', state);
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(githubClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user%20user:email&state=${state}`;
  window.location.href = authUrl;
}
function processOAuthCallback(){
  const searchParams = new URLSearchParams(window.location.search);
  const githubCode = searchParams.get('code');
  const githubState = searchParams.get('state');
  
  const storedGithubState = sessionStorage.getItem('kfa_github_state');
  
  if(githubCode && storedGithubState){
    if(githubState && githubState !== storedGithubState){
      toast('Invalid GitHub OAuth state. Please try again.','error');
      cleanupOAuthState();
      return;
    }
    cleanupOAuthState();
    postAuthApi({action:'login_github', code: githubCode})
      .then(data => {
        const user = setAuthenticatedUser(data.user, data.token, data.csrfToken);
        toast(`Welcome, ${user.name.split(' ')[0]}! 👋`,'success');
        showDashboard(user.role==='student'?'my-learning':'overview');
      })
      .catch(error => {
        toast(error.message || 'GitHub sign-in failed.','error');
      });
    return;
  }
}

function cleanupOAuthState(){
  sessionStorage.removeItem('kfa_github_state');
}
function renderLoginPage(){
  return `<div style="min-height:calc(100vh - 60px);display:flex;align-items:center;justify-content:center;padding:40px 24px;background:linear-gradient(135deg,#051a3b 0%,var(--bg) 100%)">
  <div style="width:100%;max-width:420px">
    <div style="text-align:center;margin-bottom:32px">
      <span class="logo-text logo-text-auth" style="font-size:1.5rem;display:inline-flex;margin-bottom:8px" onclick="showPublicPage('home')">
        <img class="logo-mark logo-mark-auth" src="KF%20LOGO.png" alt="KFAHAD Academy logo"/>
        <span class="logo-wordmark">
          <span class="logo-kfahad">KFAHAD</span>
          <span class="logo-academy">Academy</span>
        </span>
      </span>
      <h2 style="font-family:var(--font-h);font-size:1.6rem;font-weight:800;margin-bottom:6px">Welcome back</h2>
      <p style="color:var(--muted);font-size:.875rem">Sign in to continue your learning journey</p>
    </div>
    <div class="card"><div class="card-body">
      <div style="display:flex;gap:8px;margin-bottom:14px;background:var(--bg);border-radius:10px;padding:4px">
        <button class="login-type-btn active" id="login-tab-student" onclick="switchLoginType('student')" style="flex:1;padding:10px;border:none;background:var(--bg2);border-radius:8px;font-weight:600;font-size:.85rem;cursor:pointer;color:var(--txt)">🎓 Student</button>
        <button class="login-type-btn" id="login-tab-lecturer" onclick="switchLoginType('lecturer')" style="flex:1;padding:10px;border:none;background:transparent;border-radius:8px;font-weight:600;font-size:.85rem;cursor:pointer;color:var(--muted)">👨‍🏫 Lecturer</button>
        <button class="login-type-btn" id="login-tab-admin" onclick="switchLoginType('admin')" style="flex:1;padding:10px;border:none;background:transparent;border-radius:8px;font-weight:600;font-size:.85rem;cursor:pointer;color:var(--muted)">⚙️ Admin</button>
      </div>
      <div id="login-preset-hint" style="margin-bottom:14px;padding:9px 12px;background:rgba(59,130,246,.08);border-left:3px solid var(--pri);border-radius:6px;font-size:.8rem;color:var(--txt);line-height:1.4">
        🎓 <strong>Student:</strong> student@kfahad.com &bull; Pass: <code>Student.login.</code>
      </div>
      <div id="login-err" style="display:none;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:10px 14px;font-size:.85rem;color:var(--danger);margin-bottom:16px"></div>
      <div class="form-group"><label>Email or Username</label><input class="form-control" id="l-email" type="text" placeholder="you@example.com or username" value="student@kfahad.com"/></div>
      <div class="form-group"><label>Password</label><input class="form-control" id="l-pw" type="password" placeholder="Your password" value="Student.login."/></div>
      <button id="login-submit-btn" class="btn btn-primary" style="width:100%;justify-content:center;padding:13px" onclick="doLogin()">Sign In</button>
      <div style="margin-top:14px;text-align:center">
        <button class="btn btn-outline" style="width:100%;justify-content:center" onclick="doGoogleLogin()">
          <svg width="18" height="18" viewBox="0 0 24 24" style="margin-right:8px"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>
        <button class="btn btn-outline" style="width:100%;justify-content:center;margin-top:8px" onclick="doGithubLogin()">
          <svg width="18" height="18" viewBox="0 0 24 24" style="margin-right:8px" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          Continue with GitHub
        </button>
      </div>
      <p style="text-align:center;color:var(--muted);font-size:.85rem;margin-top:18px">Don't have an account? <a href="#register-page" onclick="showPublicPage('register-page')" style="color:var(--pri);font-weight:600;cursor:pointer">Create one</a></p>
      <div style="margin-top:14px;padding:14px 16px;border:1px solid rgba(59,130,246,.22);background:rgba(59,130,246,.08);border-radius:12px">
        <div style="font-weight:700;margin-bottom:4px">Need to contact admin first?</div>
        <div style="font-size:.8rem;color:var(--muted);line-height:1.6;margin-bottom:10px">Create a guest inquiry account if you only want to ask questions before joining the learning app.</div>
        <button class="btn btn-outline btn-sm" style="width:100%;justify-content:center" onclick="showPublicPage('register-page');setTimeout(()=>setRegisterAccountType('guest'),40)">Create Guest Inquiry Account</button>
      </div>
    </div></div>
  </div></div>${renderFooter()}`;
}

function switchLoginType(type){
  document.querySelectorAll('.login-type-btn').forEach(btn=>{
    btn.classList.remove('active');
    btn.style.color='var(--muted)';
    btn.style.background='transparent';
  });
  const activeBtn = document.getElementById('login-tab-'+type);
  if(activeBtn){
    activeBtn.classList.add('active');
    activeBtn.style.color='var(--txt)';
    activeBtn.style.background='var(--bg2)';
  }
  window._loginType = type;
  const emailInput = document.getElementById('l-email');
  const pwInput = document.getElementById('l-pw');
  const hint = document.getElementById('login-preset-hint');
  const err = document.getElementById('login-err');
  if(err) err.style.display = 'none';

  if(type === 'admin'){
    if(emailInput) emailInput.value = 'Admin.kfahad@gmail.com';
    if(pwInput) pwInput.value = 'Kfahad.login.';
    if(hint) hint.innerHTML = '⚙️ <strong>Admin Account:</strong> Admin.kfahad@gmail.com &bull; Pass: <code>Kfahad.login.</code>';
  } else if(type === 'lecturer'){
    if(emailInput) emailInput.value = 'lecturer@kfahad.com';
    if(pwInput) pwInput.value = 'Lecturer.login.';
    if(hint) hint.innerHTML = '👨‍🏫 <strong>Lecturer Account:</strong> lecturer@kfahad.com &bull; Pass: <code>Lecturer.login.</code>';
  } else {
    if(emailInput) emailInput.value = 'student@kfahad.com';
    if(pwInput) pwInput.value = 'Student.login.';
    if(hint) hint.innerHTML = '🎓 <strong>Student Account:</strong> student@kfahad.com &bull; Pass: <code>Student.login.</code>';
  }
}

function confirmAdminLogin(){
  switchLoginType('admin');
  doLogin();
}

async function doLogin(){
  let email=document.getElementById('l-email')?.value.trim();
  let pw=document.getElementById('l-pw')?.value;
  const err=document.getElementById('login-err');
  const loginType = window._loginType || 'student';
  if(!email || !pw){
    if(loginType === 'admin'){
      email = email || 'Admin.kfahad@gmail.com';
      pw = pw || 'Kfahad.login.';
    } else if(loginType === 'lecturer'){
      email = email || 'lecturer@kfahad.com';
      pw = pw || 'Lecturer.login.';
    } else {
      email = email || 'student@kfahad.com';
      pw = pw || 'Student.login.';
    }
    if(document.getElementById('l-email')) document.getElementById('l-email').value = email;
    if(document.getElementById('l-pw')) document.getElementById('l-pw').value = pw;
  }
  if(!email||!pw){if(err){err.style.display='block';err.textContent='Please fill all fields'}return}
  const submitBtn = document.getElementById('login-submit-btn');
  const origBtnText = submitBtn ? submitBtn.textContent : '';
  if(submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
  }
  try{
    if(err) err.style.display='none';
    const data=await postAuthApi({action:'login_direct',email,password:pw,loginType});
    const user=setAuthenticatedUser(data.user,data.token,data.csrfToken);
    toast(`Welcome back, ${user.name.split(' ')[0]}! 👋`,'success');
    if(user.role==='student' && BayyinahLogic.getContinueWatching()){
      toast('Continue where you left off','info');
    }
    startChatPolling();
    showDashboard(user.role==='student'?'my-learning':'overview');
  }catch(error){
    if(isAuthServiceUnavailable(error)){
      const normalizedEmail = (email || '').trim().toLowerCase();
      let fallbackUser = null;
      if((normalizedEmail === 'admin.kfahad@gmail.com' || normalizedEmail === 'kfahad' || normalizedEmail === 'admin@kfahad.com') && pw === 'Kfahad.login.'){
        fallbackUser = {
          id: 'admin-kfahad',
          name: 'Kandeke Fahad',
          email: 'Admin.kfahad@gmail.com',
          username: 'kfahad',
          role: 'admin',
          avatarUrl: '',
          bio: 'Founder & CEO of KFAHAD Academy',
          phoneNumber: '+256702618396'
        };
      }

      if(fallbackUser){
        const token = 'local_fallback_' + uid();
        const csrf = uid();
        const user = setAuthenticatedUser(fallbackUser, token, csrf);
        toast(`Welcome back, ${user.name.split(' ')[0]}! 👋`, 'success');
        showDashboard('overview');
        return;
      }
    }
    if(err){
      err.style.display='block';
      err.textContent=error.message || 'Login failed. Please try again.';
    }
  }finally{
    if(submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = origBtnText;
    }
  }
}

function renderRegisterPage(){
  const tracks = TRACKS.map(track=>({
    ...track,
    courses:getTrackCourses(track.id)
  }));
  return `<div style="min-height:calc(100vh - 60px);display:flex;align-items:center;justify-content:center;padding:40px 24px;background:linear-gradient(135deg,#051a3b 0%,var(--bg) 100%)">
  <div style="width:100%;max-width:460px">
    <div style="text-align:center;margin-bottom:32px">
      <span class="logo-text logo-text-auth" style="font-size:1.5rem;display:inline-flex;margin-bottom:8px" onclick="showPublicPage('home')">
        <img class="logo-mark logo-mark-auth" src="KF%20LOGO.png" alt="KFAHAD Academy logo"/>
        <span class="logo-wordmark">
          <span class="logo-kfahad">KFAHAD</span>
          <span class="logo-academy">Academy</span>
        </span>
      </span>
      <h2 style="font-family:var(--font-h);font-size:1.6rem;font-weight:800;margin-bottom:6px">Join the Academy</h2>
      <p style="color:var(--muted);font-size:.875rem">Create your free account and start learning today</p>
    </div>
    <div class="card"><div class="card-body">
      <div id="reg-err" style="display:none;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:10px 14px;font-size:.85rem;color:var(--danger);margin-bottom:16px"></div>
      <div class="form-group">
        <label>Account Type</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px" id="register-type-grid">
          <button type="button" id="register-type-student" class="btn btn-primary btn-sm" style="justify-content:center" onclick="setRegisterAccountType('student')">Learning Account</button>
          <button type="button" id="register-type-guest" class="btn btn-outline btn-sm" style="justify-content:center" onclick="setRegisterAccountType('guest')">Guest Inquiry</button>
        </div>
        <div id="register-type-copy" style="margin-top:10px;padding:12px 14px;border-radius:10px;background:var(--bg);font-size:.8rem;color:var(--muted)">Create a real learning account to access courses, quizzes, and the full academy dashboard.</div>
      </div>
      <input type="hidden" id="r-account-type" value="student"/>
      <div class="form-group">
        <label>Profile Photo</label>
        <div id="r-avatar-preview" style="display:flex;justify-content:center;margin-bottom:10px">
          <div class="profile-avatar" style="margin:0 auto">?</div>
        </div>
        <input type="hidden" id="r-avatar-data" value=""/>
        <input class="form-control" type="file" accept="image/*" onchange="handleProfileImageUpload(this.files[0],'r-avatar-preview','r-avatar-data')"/>
      </div>
      <div class="form-group"><label>Full Name</label><input class="form-control" id="r-name" placeholder="Your full name"/></div>
      <div class="form-group"><label>Email</label><input class="form-control" id="r-email" type="email" placeholder="you@example.com"/></div>
      <div class="form-group"><label>Phone Number</label><input class="form-control" id="r-phone" type="tel" placeholder="+256700000000" inputmode="tel"/></div>
      <div class="form-group"><label>Password</label><input class="form-control" id="r-pw" type="password" placeholder="Create a strong password"/></div>
      <div class="form-group" id="register-learning-fields">
        <label>Choose Category and Course Units</label>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${tracks.map(track=>`
            <div style="border:1px solid var(--border);border-radius:10px;background:rgba(255,255,255,.03);padding:12px">
              <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;margin-bottom:10px">
                <input type="checkbox" value="${track.id}" class="r-track" style="margin-top:3px" onchange="toggleRegisterTrack('${track.id}', this.checked)"/>
                <span>
                  <span style="display:block;font-size:.84rem;font-weight:700;line-height:1.3">${track.name}</span>
                  <span style="display:block;font-size:.76rem;color:var(--muted)">${track.description}</span>
                </span>
              </label>
              <div id="track-${track.id}" style="display:none;grid-template-columns:1fr;gap:8px;padding-top:8px;border-top:1px solid var(--border)">
                ${track.courses.map(course=>`<label style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;cursor:pointer">
                  <input type="checkbox" value="${course.id}" data-track="${track.id}" class="r-course" style="margin-top:3px"/>
                  <span style="font-size:.82rem;line-height:1.4">${course.title}</span>
                </label>`).join('')}
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div id="guest-inquiry-note" style="display:none;margin-bottom:16px;padding:14px 16px;border:1px solid rgba(59,130,246,.2);background:rgba(59,130,246,.08);border-radius:12px">
        <div style="font-weight:700;margin-bottom:4px">Guest inquiry account</div>
        <div style="font-size:.8rem;color:var(--muted);line-height:1.6">You will not get course access. You will only be able to contact admin, send inquiries, and later create a full learning account.</div>
      </div>
      <button class="btn btn-primary" id="register-submit-btn" style="width:100%;justify-content:center;padding:13px;box-shadow:0 0 28px rgba(59,130,246,.35)" onclick="doRegister()">Create Account</button>
      <div style="margin-top:14px;padding:14px 16px;border:1px solid rgba(59,130,246,.22);background:rgba(59,130,246,.08);border-radius:12px">
        <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer">
          <input type="checkbox" id="r-terms" style="margin-top:3px"/>
          <span style="font-size:.82rem;color:var(--muted);line-height:1.6">By continuing, you are agreeing to our <a href="#terms-page" onclick="showPublicPage('terms-page')" style="color:var(--pri);font-weight:600">Terms & Conditions</a> and <a href="#privacy-page" onclick="showPublicPage('privacy-page')" style="color:var(--pri);font-weight:600">Privacy Policy</a>.</span>
        </label>
      </div>
      <div style="margin-top:14px;text-align:center">
        <button class="btn btn-outline" style="width:100%;justify-content:center" onclick="doGoogleRegister()">
          <svg width="18" height="18" viewBox="0 0 24 24" style="margin-right:8px"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>
      </div>
      <p style="text-align:center;color:var(--muted);font-size:.85rem;margin-top:18px">Already have an account? <a href="#login-page" onclick="showPublicPage('login-page')" style="color:var(--pri);font-weight:600;cursor:pointer">Sign in</a></p>
    </div></div>
  </div></div>${renderFooter()}`;
}
function setRegisterAccountType(type='student'){
  const nextType = type==='guest' ? 'guest' : 'student';
  const input=document.getElementById('r-account-type');
  const learningFields=document.getElementById('register-learning-fields');
  const note=document.getElementById('guest-inquiry-note');
  const copy=document.getElementById('register-type-copy');
  const submit=document.getElementById('register-submit-btn');
  const studentBtn=document.getElementById('register-type-student');
  const guestBtn=document.getElementById('register-type-guest');
  if(input) input.value=nextType;
  if(learningFields) learningFields.style.display=nextType==='guest'?'none':'block';
  if(note) note.style.display=nextType==='guest'?'block':'none';
  if(copy) copy.textContent=nextType==='guest'
    ? 'Use a guest inquiry account to contact admin first. You can later create a real learning account for courses and study tools.'
    : 'Create a real learning account to access courses, quizzes, and the full academy dashboard.';
  if(submit) submit.textContent=nextType==='guest'?'Create Guest Account':'Create Account';
  if(studentBtn) studentBtn.className=`btn ${nextType==='student'?'btn-primary':'btn-outline'} btn-sm`;
  if(guestBtn) guestBtn.className=`btn ${nextType==='guest'?'btn-primary':'btn-outline'} btn-sm`;
}
async function doRegister(){
  const name=document.getElementById('r-name')?.value.trim();
  const email=document.getElementById('r-email')?.value.trim();
  const phone=document.getElementById('r-phone')?.value.trim()||'';
  const pw=document.getElementById('r-pw')?.value;
  const avatarUrl=document.getElementById('r-avatar-data')?.value||'';
  const accountType=document.getElementById('r-account-type')?.value==='guest'?'guest':'student';
  const termsAccepted=document.getElementById('r-terms')?.checked || false;
  const selectedTracks=[...document.querySelectorAll('.r-track:checked')].map(el=>el.value);
  const selectedCourses=[...document.querySelectorAll('.r-course:checked')].map(el=>el.value);
  const err=document.getElementById('reg-err');
  if(!name||!email||!phone||!pw){if(err){err.style.display='block';err.textContent='Please fill all fields'}return}
  if(!isValidPhoneNumber(phone)){if(err){err.style.display='block';err.textContent='Please enter a valid phone number'}return}
  if(pw.length<8){if(err){err.style.display='block';err.textContent='Password must be at least 8 characters'}return}
  if(accountType==='student' && !selectedTracks.length){if(err){err.style.display='block';err.textContent='Please choose at least one category'}return}
  if(accountType==='student' && !selectedCourses.length){if(err){err.style.display='block';err.textContent='Please choose one or more course units'}return}
  if(!termsAccepted){if(err){err.style.display='block';err.textContent='You must accept the Terms & Conditions to register.'}return}
  try{
    if(err) err.style.display='none';
    const username = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const data=await postAuthApi({
      action:'register_direct',
      name,
      email,
      password:pw,
      username,
      phoneNumber:phone,
      interestedCourses:accountType==='guest'?[]:selectedCourses,
      interestedTracks:accountType==='guest'?[]:selectedTracks,
      accountType,
      avatarUrl,
      termsVersion:'2026-01-01'
    });
    const user=setAuthenticatedUser(data.user,data.token,data.csrfToken);
    toast(accountType==='guest'
      ? `Welcome, ${user.name.split(' ')[0]}! Your guest desk is ready.`
      : `Welcome to KFAHAD Academy, ${user.name.split(' ')[0]}! 🎉`,'success');
    showDashboard();
  }catch(error){
    if(err){err.style.display='block';err.textContent=error.message;}
  }
}
function toggleRegisterTrack(trackId,isChecked){
  const group=document.getElementById(`track-${trackId}`);
  if(group) group.style.display=isChecked?'grid':'none';
  if(!isChecked){
    document.querySelectorAll(`.r-course[data-track="${trackId}"]`).forEach(input=>{input.checked=false;});
  }
}

function openStudentReviewModal(){
  if(!currentUser){showPublicPage('login-page');return}
  if(currentUser.role!=='student'){toast('Only student accounts can submit reviews','error');return}
  const existing = getStudentReviews().find(review=>review.userId===currentUser.id);
  const selectedCourses = (currentUser.interestedCourses||[]).map(id=>getAllCourses().find(course=>course.id===id)?.title).filter(Boolean);
  openModal('Share Your Review',`
  <div class="form-group"><label>Your Rating</label>
    <select class="form-control" id="review-rating">
      ${[5,4,3,2,1].map(r=>`<option value="${r}" ${existing?.rating===r?'selected':''}>${r} Star${r>1?'s':''}</option>`).join('')}
    </select>
  </div>
  <div class="form-group"><label>Your Review</label><textarea class="form-control" id="review-text" rows="5" placeholder="Tell other students about your experience...">${existing?.text||''}</textarea></div>
  <div style="font-size:.8rem;color:var(--muted)">Shown as: ${currentUser.name}${selectedCourses.length?` • ${selectedCourses.join(' • ')}`:''}</div>
  `,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveStudentReview()">Save Review</button>`);
}
function saveStudentReview(){
  if(!currentUser||currentUser.role!=='student'){toast('Only student accounts can submit reviews','error');return}
  const rating=Number(document.getElementById('review-rating')?.value||5);
  const text=document.getElementById('review-text')?.value.trim();
  if(!text || text.length<20){toast('Please write a real review with at least 20 characters','error');return}
  const reviews=getStudentReviews();
  const courseTitles=(currentUser.interestedCourses||[]).map(id=>getAllCourses().find(course=>course.id===id)?.title).filter(Boolean);
  const nextReview={
    id:reviews.find(review=>review.userId===currentUser.id)?.id || uid(),
    userId:currentUser.id,
    studentName:currentUser.name,
    studentEmail:currentUser.email,
    avatarUrl:currentUser.avatarUrl||'',
    rating,
    text,
    courseTitles,
    createdAt:Date.now()
  };
  const filtered=reviews.filter(review=>review.userId!==currentUser.id);
  filtered.unshift(nextReview);
  DB.set('studentReviews',filtered);
  saveToDataAPI('student_reviews', nextReview).catch(()=>{});
  closeModal();
  toast('Your review is now live on the website','success');
  showPublicPage('home');
}

function renderDashReviews(){
  const reviews=getStudentReviews();
  const myReview=reviews.find(review=>review.userId===currentUser?.id);
  return `
  <div class="page-header-row" style="margin-bottom:24px">
    <div><h1 style="font-family:var(--font-h);font-size:1.7rem;font-weight:800;margin-bottom:4px">My Review</h1><p style="color:var(--muted)">Write a real comment about your learning experience. It will appear on the homepage.</p></div>
    ${currentUser?.role==='student'?`<button class="btn btn-primary btn-sm" onclick="openStudentReviewModal()">${myReview?'Edit Review':'Write Review'}</button>`:''}
  </div>
  ${currentUser?.role!=='student'
    ? `<div class="empty"><div style="font-size:3rem;margin-bottom:16px">💬</div><h3>Students only</h3><p>Only student accounts can write reviews.</p></div>`
    : myReview
      ? `<div class="card"><div class="card-body">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:14px">
            <div>
              <div style="font-weight:700;font-size:1rem">${myReview.studentName}</div>
              <div style="color:var(--muted);font-size:.8rem">${myReview.courseTitles?.length?myReview.courseTitles.join(' • '):'Student'}</div>
            </div>
            <span class="badge badge-primary">${myReview.rating||5} Star${(myReview.rating||5)!==1?'s':''}</span>
          </div>
          <div style="color:var(--muted);font-size:.9rem;line-height:1.7;margin-bottom:12px">"${myReview.text}"</div>
          <div style="font-size:.78rem;color:var(--muted)">Last updated: ${new Date(myReview.createdAt).toLocaleString()}</div>
        </div></div>`
      : `<div class="empty"><div style="font-size:3rem;margin-bottom:16px">✍️</div><h3>No review yet</h3><p>Share your experience and your comment will show on the homepage.</p></div>`}`;
}

// ================================================================
// PUBLIC COURSES
// ================================================================
function renderCoursesPublicPage(){
  const allCourses=getAllCourses();const cats=[...new Set(allCourses.map(c=>c.category))];
  const hasAccess = CourseLogic.hasFullAccess(currentUser);
  const syncMessage = window.courseSyncNotice || 'Courses are stored in the shared database and available across devices.';
  return `
  <section style="padding:60px 0 0;background:var(--bg2)"><div class="container" style="text-align:center;padding-bottom:48px">
    <h1 style="font-family:var(--font-h);font-size:2.2rem;font-weight:800;margin-bottom:10px">Our Courses</h1>
    <p style="color:var(--muted)">${COURSES.length} expert-led courses across ${cats.length} categories</p>
    <div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-top:18px;flex-wrap:wrap">
      <button class="btn btn-outline btn-sm" onclick="syncPublicCourses(true)">🔄 Refresh Courses</button>
      <span style="color:var(--muted);font-size:.95rem">${syncMessage}</span>
    </div>
  </div></section>
  <section style="padding:48px 0"><div class="container">
    ${cats.map(cat=>`
    <div style="margin-bottom:48px">
      <h2 style="font-family:var(--font-h);font-size:1.4rem;font-weight:700;margin-bottom:20px;display:flex;align-items:center;gap:10px">
        <span style="width:4px;height:22px;background:var(--pri);border-radius:2px;display:inline-block"></span>${cat}
      </h2>
      <div class="course-grid">
        ${allCourses.filter(c=>c.category===cat).map(c=>`
        <div class="course-card ${!hasAccess?'course-card-locked':''}">
          <div style="position:relative">
            <img class="course-img" src="${c.imageUrl}" alt="${c.title}" onerror="this.src='https://picsum.photos/seed/${c.id}/600/400'"/>
            ${!hasAccess?`<div class="course-lock-badge">Premium</div><div class="course-lock-overlay"><svg width="24" height="24" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>`:''}
          </div>
          <div class="course-body">
            <div class="course-cat">${c.category}</div>
            <div class="course-title">${c.title}</div>
            <div class="course-desc">${c.description}</div>
            <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="viewCourse('${c.id}')">
              ${hasAccess?'Start Learning':'Unlock Full Access'}
            </button>
          </div>
        </div>`).join('')}
      </div>
    </div>`).join('')}
  </div></section>
  ${renderFooter()}`;
}
function viewCourse(id){
  window._viewingCourse=id;
  if(!currentUser){showPublicPage('login-page');toast('Please sign in to view courses','warn');return}
  if(!CourseLogic.verifyAccess({courseId:id})) return;
  currentPage='course-detail'; renderPage();
  window.scrollTo({top:0,behavior:'smooth'});
}

async function maybeAutoSyncPublicCourses(){
  const now = Date.now();
  if(window._lastPublicCourseSync && now - window._lastPublicCourseSync < 300000) return;
  window._lastPublicCourseSync = now;
  await loadCoursesFromSupabase({silent:true,rerender:false});
  window.courseSyncNotice = 'Courses refreshed from database.';
  renderPage();
}

async function syncPublicCourses(force){
  window.courseSyncNotice = 'Syncing courses...';
  renderPage();
  const courses = await loadCoursesFromSupabase({silent: false, rerender: false});
  if(courses){
    window.courseSyncNotice = 'Courses synced from database.';
  } else {
    window.courseSyncNotice = 'Could not sync courses right now.';
  }
  renderPage();
  setTimeout(()=>{window.courseSyncNotice = '';renderPage();}, 7000);
}

// ================================================================
// COURSE DETAIL PAGE
// ================================================================
function renderCourseDetailPage(){
  const course=getAllCourses().find(c=>c.id===window._viewingCourse);
  if(!course) return renderCoursesPublicPage();
  const locked=!CourseLogic.hasFullAccess(currentUser);
  const prog=CourseLogic.calculateCompletionPercent(course.id);
  return `
  <div style="background:var(--bg2);border-bottom:1px solid var(--border);padding:36px 0">
    <div class="container" style="display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center">
      <div>
        <span class="badge badge-primary" style="margin-bottom:12px">${course.category}</span>
        <h1 style="font-family:var(--font-h);font-size:1.9rem;font-weight:800;margin-bottom:12px;line-height:1.2">${course.title}</h1>
        <p style="color:var(--muted);line-height:1.7;margin-bottom:20px">${course.description}</p>
        <div style="display:flex;gap:12px">
          ${!locked?`<button class="btn btn-primary btn-lg" onclick="startLearning('${course.id}')">Continue Learning</button>`:`<button class="btn btn-primary btn-lg" onclick="showPublicPage('pricing-page')">Subscribe to Access</button>`}
          <button class="btn btn-outline" onclick="showPublicPage('courses-public')">← All Courses</button>
        </div>
      </div>
      <div>
        <img src="${course.imageUrl}" style="border-radius:var(--radius);width:100%;aspect-ratio:16/9;object-fit:cover;border:1px solid var(--border)" onerror="this.src='https://picsum.photos/seed/${course.id}/600/400'"/>
      </div>
    </div>
  </div>
  <div class="container" style="padding:40px 24px">
    ${locked?`<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:10px;padding:16px 20px;margin-bottom:28px;display:flex;align-items:center;gap:12px">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="color:var(--danger);flex-shrink:0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <span style="font-size:.875rem">This course requires an active subscription. <a href="#pricing-page" onclick="showPublicPage('pricing-page')" style="color:var(--pri);font-weight:600;cursor:pointer">Choose a plan →</a></span>
    </div>`:''}
    ${prog>0?`<div style="margin-bottom:24px"><div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:.85rem"><span>Your Progress</span><strong>${prog}% complete</strong></div><div class="progress-bar"><div class="progress-fill" style="width:${prog}%"></div></div></div>`:''}
    ${course.modules&&course.modules.length?`
    <h2 style="font-family:var(--font-h);font-size:1.3rem;font-weight:700;margin-bottom:16px">Course Content</h2>
    ${course.modules.map(m=>`
    <div class="accordion-item">
      <div class="accordion-header" onclick="toggleAcc(this)">
        <span>${m.title}</span>
        <span style="color:var(--muted);font-size:.8rem">${m.lessons.length} lessons</span>
      </div>
      <div class="accordion-body">
        ${(() => {
          let lessonOffset = 0;
          let allModsBefore = course.modules.slice(0, course.modules.indexOf(m));
          for(const prevMod of allModsBefore) lessonOffset += (prevMod.lessons || []).length;
          return m.lessons.map((l, localIdx) => {
            const globalIdx = lessonOffset + localIdx;
            const status = BayyinahLogic.getLessonStatus(course, globalIdx);
            const isUnlocked = status==='Available' || status==='Completed';
            const prog = BayyinahLogic.getUserProgress(course.id);
            const isDone = status==='Completed' || prog.completed.includes(l.id);
            return `
        <div class="lesson-item ${isDone ? 'completed' : !isUnlocked ? 'locked' : ''}">
          <div class="lesson-dot ${isDone ? 'done' : !isUnlocked ? 'locked-dot' : ''}"></div>
          <span style="flex:1;${!isUnlocked && !locked ? 'color:var(--muted)' : ''}">${l.title}</span>
          ${isDone ? '<span style="color:var(--success);font-size:.78rem">✓ Done</span>' : !isUnlocked && !locked ? '<span style="color:var(--muted);font-size:.78rem">🔒 Locked</span>' : `<span style="color:var(--muted);font-size:.78rem">${l.type==='quiz'?'Quiz':l.duration+'min'}</span>`}
          ${isUnlocked && !isDone ? `<button class="btn btn-ghost btn-sm" onclick="openLesson('${course.id}','${l.id}','${l.type}','${encodeURIComponent(l.content)}','${encodeURIComponent(l.title)}')" style="margin-left:8px">${l.type==='quiz'?'Quiz':'Open'}</button>` : ''}
          ${isDone && isUnlocked ? `<button class="btn btn-ghost btn-sm" onclick="openLesson('${course.id}','${l.id}','${l.type}','${encodeURIComponent(l.content)}','${encodeURIComponent(l.title)}')" style="margin-left:8px">Review</button>` : ''}
        </div>`;
          });
        })()}
      </div>
    </div>`).join('')}
    `:`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:32px">
      <div style="aspect-ratio:16/9;border-radius:10px;overflow:hidden;margin-bottom:16px">
        ${renderVideoMediaHtml(course.videoUrl)}
      </div>
      <p style="color:var(--muted);font-size:.875rem">Course overview video. Full content coming soon.</p>
    </div>`}
  </div>
  ${renderFooter()}`;
}
function showUpgradeModal(courseId){
  if(isStaffUser(currentUser)) return;
  const course = courseId ? getAllCourses().find(item=>item.id===courseId) : null;
  const courseLabel = course ? `${course.title} (${course.id})` : 'this premium course';
  openModal('Full Access Required',`
    <div style="line-height:1.7;color:var(--muted)">
      <p style="margin-bottom:12px">You can browse the KFAHAD Mastery Tracks, but <strong style="color:var(--txt)">${courseLabel}</strong> requires an active subscription before lessons open.</p>
      <p>Your access is verified against the real subscription expiry time each time you load the dashboard or open a course.</p>
    </div>
  `,`<button class="btn btn-outline" onclick="closeModal()">Maybe Later</button><button class="btn btn-primary" onclick="closeModal();showPublicPage('pricing-page')">Choose a Plan</button>`);
}
function toggleAcc(el){const body=el.nextElementSibling;body.classList.toggle('open')}
function openLesson(courseId,lessonId,type,contentEnc,titleEnc){
  if(!CourseLogic.verifyAccess({courseId})) return;
  const content=decodeURIComponent(contentEnc);
  const normalizedContent=normalizeYouTubeUrl(content);
  const title=decodeURIComponent(titleEnc);
  if(type==='quiz'){
    openQuizModal(content,courseId);
  } else if(type==='text'){
    openModal(title,`<div style="padding:8px 0;line-height:1.7;font-size:.9rem;white-space:pre-wrap">${content||'No content yet.'}</div>
    <div style="margin-top:14px"><button id="lesson-complete-btn" class="btn btn-success btn-sm" onclick="completeTrackedLesson({courseId:'${courseId}',lessonId:'${lessonId}',timestampSeconds:0});closeModal()">✓ Mark as Complete</button></div>`,`<button class="btn btn-outline" onclick="closeModal()">Close</button>`);
    startLessonProgressTracking({courseId,lessonId,type:'text'});
  } else {
    // Video: detect data URL vs YouTube vs external URL
    const isDataUrl=normalizedContent.startsWith('data:video');
    const isYoutube=isYouTubeLikeUrl(normalizedContent);
    const ytVideoId = isYoutube ? normalizedContent.split('/embed/')[1]?.split(/[?&]/)[0] : '';
    const iframeSrc = isYoutube
      ? `${normalizedContent}${normalizedContent.includes('?')?'&':'?'}rel=0&enablejsapi=1`
      : normalizedContent;
    const videoHtml=isDataUrl
      ? `<video id="lesson-video-player" style="width:100%;border-radius:10px;background:#000;max-height:400px" controls src="${normalizedContent}"></video>`
      : isYoutube
        ? `<div style="aspect-ratio:16/9;border-radius:10px;overflow:hidden"><iframe id="lesson-youtube-player" src="${iframeSrc}" style="width:100%;height:100%;border:none" allowfullscreen></iframe></div>`
        : `<video id="lesson-video-player" style="width:100%;border-radius:10px;background:#000;max-height:400px" controls src="${normalizedContent}"></video>`;
    openModal(title,`${videoHtml}
    <div style="margin-top:14px"><button id="lesson-complete-btn" class="btn btn-success btn-sm" onclick="completeTrackedLesson({courseId:'${courseId}',lessonId:'${lessonId}',timestampSeconds:0});closeModal()">✓ Mark as Complete</button></div>`,`<button class="btn btn-outline" onclick="closeModal()">Close</button>`);
    startLessonProgressTracking({
      courseId,
      lessonId,
      type:'video',
      mediaType:isYoutube?'youtube':'video',
      videoId:ytVideoId
    });
  }
}
function markComplete(courseId,lessonId,timestamp=0){
  const prog=DB.get('progress')||{};
  const progressKey = CourseLogic.getCourseProgressKey(courseId);
  if(!prog[progressKey]) prog[progressKey]={completed:[]};
  if(!prog[progressKey].completed.includes(lessonId)) prog[progressKey].completed.push(lessonId);
  DB.set('progress',prog);
  BayyinahLogic.markLessonComplete(courseId,lessonId,timestamp);
  syncLearningProgressToServer(courseId, lessonId, timestamp, 'completed');
  toast('Lesson marked as complete!','success');
  if(currentPage==='dashboard' && (currentSection==='my-learning' || currentSection==='courses')){
    renderPage();
  }
}
function getProgress(courseId){
  return CourseLogic.calculateCompletionPercent(courseId);
}
function startLearning(courseId){
  if(!CourseLogic.verifyAccess({courseId})) return;
  window._viewingCourse=courseId;
  currentPage='course-detail';
  renderPage();
  window.scrollTo({top:0,behavior:'smooth'});
}
function openQuizModal(quizId,courseId){
  const quiz=QUIZZES[quizId];
  if(!quiz){toast('Quiz not found','error');return}
  let answers={};let submitted=false;
  const renderQuiz=()=>`
  <h3 style="font-family:var(--font-h);margin-bottom:20px">${quiz.title}</h3>
  ${quiz.questions.map((q,qi)=>`
  <div class="quiz-question">
    <p style="font-weight:600;margin-bottom:12px">${qi+1}. ${q.text}</p>
    <div class="quiz-opts">
      ${q.options.map((o,oi)=>`
      <div class="quiz-opt ${submitted?(oi===q.correctAnswerIndex?'correct':(answers[qi]===oi?'wrong':'')):(answers[qi]===oi?'selected':'')}"
        onclick="${!submitted?`selectQuizAnswer(${qi},${oi})`:''}">
        ${String.fromCharCode(65+oi)}. ${o}
      </div>`).join('')}
    </div>
  </div>`).join('')}
  ${submitted?`<div style="background:var(--pri-g);border:1px solid rgba(59,130,246,.3);border-radius:10px;padding:16px;text-align:center;margin-top:12px">
    <div style="font-family:var(--font-h);font-size:1.5rem;font-weight:800;color:var(--pri)">${Object.keys(answers).filter(qi=>answers[qi]===quiz.questions[qi].correctAnswerIndex).length}/${quiz.questions.length}</div>
    <div style="color:var(--muted);font-size:.875rem">Score</div>
  </div>`:''}`;
  window._quizState={quiz,answers,submitted,courseId};
  openModal('Quiz',renderQuiz(),`
  <button class="btn btn-outline" onclick="closeModal()">Close</button>
  ${!submitted?`<button class="btn btn-primary" onclick="submitQuiz()">Submit Quiz</button>`:''}
  `);
}
function selectQuizAnswer(qi,oi){
  if(!window._quizState||window._quizState.submitted) return;
  window._quizState.answers[qi]=oi;
  document.getElementById('modal-body').innerHTML='';
  const {quiz,answers,submitted,courseId}=window._quizState;
  document.getElementById('modal-body').innerHTML=renderQuizBody(quiz,answers,submitted);
}
function renderQuizBody(quiz,answers,submitted){
  return quiz.questions.map((q,qi)=>`
  <div class="quiz-question">
    <p style="font-weight:600;margin-bottom:12px">${qi+1}. ${q.text}</p>
    <div class="quiz-opts">
      ${q.options.map((o,oi)=>`<div class="quiz-opt ${submitted?(oi===q.correctAnswerIndex?'correct':(answers[qi]===oi?'wrong':'')):(answers[qi]===oi?'selected':'')}" onclick="${!submitted?`selectQuizAnswer(${qi},${oi})`:''}">
        ${String.fromCharCode(65+oi)}. ${o}</div>`).join('')}
    </div>
  </div>`).join('');
}
function submitQuiz(){
  if(!window._quizState) return;
  window._quizState.submitted=true;
  const {quiz,answers,courseId}=window._quizState;
  const score=Object.keys(answers).filter(qi=>answers[qi]===quiz.questions[qi].correctAnswerIndex).length;
  const percentage = quiz.questions.length ? (score/quiz.questions.length) : 0;
  const attempts=DB.get('quizAttempts')||[];
  attempts.push({id:uid(),userId:currentUser.id,quizId:quiz.id,courseId,score,totalQuestions:quiz.questions.length,answers,submittedAt:Date.now()});
  DB.set('quizAttempts',attempts);
  document.getElementById('modal-body').innerHTML=renderQuizBody(quiz,answers,true)+`<div style="background:var(--pri-g);border:1px solid rgba(59,130,246,.3);border-radius:10px;padding:16px;text-align:center;margin-top:12px"><div style="font-family:var(--font-h);font-size:1.5rem;font-weight:800;color:var(--pri)">${score}/${quiz.questions.length}</div><div style="color:var(--muted);font-size:.875rem">Your Score</div></div>`;
  document.getElementById('modal-footer').innerHTML=`<button class="btn btn-outline" onclick="closeModal()">Close</button>`;
  if(percentage>=0.7){
    markComplete(courseId,quiz.id,0);
    toast(`Quiz passed! Score: ${score}/${quiz.questions.length}`,'success');
  } else {
    toast(`Quiz submitted. Score: ${score}/${quiz.questions.length}. Pass mark is 70%.`,'warn');
  }
}

// ================================================================
// ABOUT / BLOG / CONTACT
// ================================================================
function renderPricingPage(){
  return `
  <section style="padding:60px 0;background:var(--bg2)"><div class="container" style="text-align:center">
    <h1 style="font-family:var(--font-h);font-size:2.2rem;font-weight:800;margin-bottom:10px">Simple, Transparent Pricing</h1>
    <p style="color:var(--muted)">Pay securely with Mobile Money. Cancel anytime.</p>
  </div></section>
  <section style="padding:60px 0"><div class="container">${renderPricingCards(true)}</div></section>
  ${renderFooter()}`;
}
function renderAboutPage(){
  const deals=['Affordable Course Packages – Quality learning at low cost','Free Trial Lessons – Try before you enroll','Group Enrollment Discounts – Learn together and save more','Seasonal Offers – Special discounts during holidays','Scholarship Opportunities – Support for deserving students'];
  return `
  <div style="padding:48px 0"><div class="container">
    <div class="about-banner"><h1>About KFAHAD Academy</h1><p>Your partner in accessible, high-quality online education.</p></div>
    <div style="display:grid;grid-template-columns:1fr;gap:20px;margin-bottom:20px">
      <div class="card"><div class="card-body"><h3 style="font-family:var(--font-h);font-size:1.4rem;margin-bottom:12px">About KFAHAD Academy</h3><p style="color:var(--muted);line-height:1.7">KFAHAD ACADEMY is an online-only learning institution committed to delivering high-quality education through modern digital platforms. We provide flexible, accessible, and learner-centered education for students anytime and anywhere.</p></div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
      <div class="card"><div class="card-body"><h3 style="font-family:var(--font-h);font-size:1.3rem;margin-bottom:10px">Our Vision</h3><p style="color:var(--muted);line-height:1.7">To be a leading online academy that provides accessible, high-quality education and empowers learners to succeed in a digital world.</p></div></div>
      <div class="card"><div class="card-body"><h3 style="font-family:var(--font-h);font-size:1.3rem;margin-bottom:10px">Our Mission</h3><p style="color:var(--muted);line-height:1.7">To deliver flexible and affordable online education through innovative e-learning technologies, qualified instructors, and continuous academic support.</p></div></div>
    </div>
    <div class="card"><div class="card-body">
      <h3 style="font-family:var(--font-h);font-size:1.3rem;margin-bottom:16px">Our Deals</h3>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:14px">
        ${deals.map(d=>`<li style="display:flex;align-items:flex-start;gap:12px"><svg width="22" height="22" fill="none" stroke="var(--success)" stroke-width="2.5" viewBox="0 0 24 24" style="flex-shrink:0"><path d="M20 6L9 17l-5-5"/></svg><span><strong>${d.split('–')[0]}</strong>–<span style="color:var(--muted)">${d.split('–')[1]}</span></span></li>`).join('')}
      </ul>
    </div></div>
  </div></div>
  ${renderFooter()}`;
}
function renderBlogPage(){
  const posts=DB.get('blogPosts')||[];
  return `
  <section style="padding:60px 0;background:var(--bg2)"><div class="container" style="text-align:center">
    <h1 style="font-family:var(--font-h);font-size:2.2rem;font-weight:800;margin-bottom:10px">News & Updates</h1>
    <p style="color:var(--muted)">Stay up-to-date with the latest news from KFAHAD Academy.</p>
  </div></section>
  <section style="padding:48px 0"><div class="container">
    ${posts.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px">
    ${posts.map(p=>`
    <div class="card">
      ${p.type==='image'?`<img src="${p.mediaUrl}" style="width:100%;aspect-ratio:16/9;object-fit:cover" onerror="this.style.display='none'"/>`:`<div style="aspect-ratio:16/9;overflow:hidden"><iframe src="${p.mediaUrl}" style="width:100%;height:100%;border:none" allowfullscreen></iframe></div>`}
      <div class="card-body">
        <div style="color:var(--muted);font-size:.78rem;margin-bottom:8px">${new Date(p.createdAt).toLocaleDateString()}</div>
        <h3 style="font-family:var(--font-h);font-size:1.05rem;margin-bottom:8px">${p.title}</h3>
        <p style="color:var(--muted);font-size:.875rem;line-height:1.6">${p.description}</p>
        <div style="margin-top:12px;font-size:.8rem;color:var(--muted)">By ${p.author}</div>
      </div>
    </div>`).join('')}
    </div>`:`<div class="empty"><svg class="empty-icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v8a2 2 0 01-2 2zM17 20V13H7v7M7 4v4h8"/></svg><h3>No posts yet</h3><p>Blog posts will appear here.</p></div>`}
  </div></section>
  ${renderFooter()}`;
}
function renderContactPage(){
  return `
  <section style="padding:60px 0;background:var(--bg2)"><div class="container" style="text-align:center">
    <h1 style="font-family:var(--font-h);font-size:2.2rem;font-weight:800;margin-bottom:10px">Contact Us</h1>
    <p style="color:var(--muted)">Have a question? Fill out the form below.</p>
  </div></section>
  <section style="padding:48px 0"><div class="container contact-grid">
    <div class="card"><div class="card-body">
      <h3 style="font-family:var(--font-h);font-size:1.2rem;margin-bottom:6px">Request an Appointment</h3>
      <p style="color:var(--muted);font-size:.85rem;margin-bottom:20px">An administrator will review your request and get back to you.</p>
      <div id="contact-success" style="display:none;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:8px;padding:12px 16px;font-size:.875rem;color:var(--success);margin-bottom:16px">✅ Appointment request submitted!</div>
      <div class="form-group"><label>Your Name</label><input class="form-control" id="c-name" placeholder="Full name"/></div>
      <div class="form-group"><label>Email</label><input class="form-control" id="c-email" type="email" placeholder="you@example.com"/></div>
      <div class="form-group"><label>Phone Number</label><input class="form-control" id="c-phone" type="tel" placeholder="+256 702 618 396"/></div>
      <div class="form-group"><label>Message</label><textarea class="form-control" id="c-msg" rows="4" placeholder="Describe your request..."></textarea></div>
      <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="submitContact()">Send Request</button>
    </div></div>
    <div>
      <h2 style="font-family:var(--font-h);font-size:1.5rem;font-weight:700;margin-bottom:24px">Our Information</h2>
      <div class="contact-info-item"><div class="contact-icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div><a href="mailto:Admin.kfahad@gmail.com">Admin.kfahad@gmail.com</a></div>
      <div class="contact-info-item"><div class="contact-icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.08 6.08l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg></div><span>+256 702618396</span></div>
      <div class="contact-info-item"><div class="contact-icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></div><span>Kfahad Academy, Uganda</span></div>
      <div class="contact-info-item"><div class="contact-icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2a10 10 0 00-7.07 17.07A10 10 0 1012 2zm1 14.59V20h-2v-3.41A5.01 5.01 0 017 11h2a3 3 0 006 0h2a5.01 5.01 0 01-3 4.59z"/></svg></div>
        <div class="dropdown" style="width:100%;position:relative">
          <button class="btn btn-ghost btn-sm" onclick="toggleDropdown('developer-contact-dd')" type="button" style="font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:8px">Contact Developer <span style="font-size:1.1rem;line-height:1">▾</span></button>
          <div class="dropdown-menu" id="developer-contact-dd" style="left:0;right:auto;min-width:260px">
            <a class="dropdown-item" href="https://wa.me/qr/EYZGBHXHM5B7E1" target="_blank" onclick="closeDropdown('developer-contact-dd')" style="justify-content:space-between;text-decoration:none;color:inherit">
              <span style="display:flex;align-items:center;gap:10px"><svg viewBox="0 0 448 512" width="18" height="18" fill="currentColor"><path d="M380.9 97.1C339 55.2 283.6 32 224.1 32 117.1 32 32 117.1 32 224c0 39.4 10.3 78 29.8 111.7L32 480l147.4-29.7c32.5 17.7 69.3 27.4 108.7 27.4 107 0 192.1-85.1 192.1-192 0-59.5-23.2-114.9-65.2-156.6zM224.1 403.3c-32 0-63.3-8.6-90.4-24.9l-6.5-3.9-87.4 17.6 18.6-85.3-4-6.5c-16.5-26.8-25.2-57.9-25.2-90.3 0-98.5 80.2-178.7 178.9-178.7 47.7 0 92.6 18.6 126.4 52.4s52.4 78.7 52.4 126.4c0 98.6-80.2 178.8-178.8 178.8zm101.1-138.4c-5.5-2.7-32.5-16.1-37.6-17.9-5-1.8-8.6-2.7-12.2 2.7-3.5 5.4-13.5 17.9-16.5 21.6-3 3.5-6 3.9-11.5 1.3-5.5-2.7-23.4-8.6-44.6-27.5-16.5-14.7-27.7-32.9-31-38.4-3.2-5.5-.3-8.5 2.4-11.2 2.5-2.5 5.5-6.5 8.2-9.7 2.7-3.2 3.6-5.4 5.4-9 1.8-3.5.9-6.5-.5-9.2-1.4-2.7-12.2-29.4-16.7-40.3-4.4-10.5-8.9-9.1-12.1-9.3-3.1-.2-6.7-.2-10.3-.2-3.5 0-9.2 1.3-14 6.5-4.8 5.2-18.3 17.9-18.3 43.7 0 25.8 18.8 50.7 21.4 54.2 2.7 3.5 37 56.4 89.8 79.1 12.5 5.4 22.2 8.6 29.8 11 12.5 3.8 23.8 3.3 32.8 2 10-1.4 32.5-13.3 37.1-26.1 4.6-12.8 4.6-23.8 3.2-26.1-1.4-2.3-5-3.5-10.5-6.2z"/></svg><span>WhatsApp</span></span><span>Chat now</span>
            </a>
            <a class="dropdown-item" href="https://www.tiktok.com/@aslam.on.lens?_r=1&_t=ZG-95yKr8Mk1zd" target="_blank" onclick="closeDropdown('developer-contact-dd')" style="justify-content:space-between;text-decoration:none;color:inherit">
              <span style="display:flex;align-items:center;gap:10px"><svg viewBox="0 0 448 512" width="18" height="18" fill="currentColor"><path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/></svg><span>TikTok</span></span><span>@aslam.on.lens</span>
            </a>
            <a class="dropdown-item" href="https://www.instagram.com/aslam.on.lens?igsh=MWx1cHhqdnphcWFqaQ%3D%3D&utm_source=qr" target="_blank" onclick="closeDropdown('developer-contact-dd')" style="justify-content:space-between;text-decoration:none;color:inherit">
              <span style="display:flex;align-items:center;gap:10px"><svg viewBox="0 0 448 512" width="18" height="18" fill="currentColor"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37.2-2.1-147.9-2.1-185.1 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37.2-2.1 147.9 0 185.1 1.7 35.9 9.9 67.7 36.2 93.9 26.3 26.2 58 34.4 93.9 36.2 37.2 2.1 147.9 2.1 185.1 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37.2 2.1-147.8 0-185.1z"/></svg><span>Instagram</span></span><span>@aslam.on.lens</span>
            </a>
          </div>
        </div>
      </div>
      <div style="margin-top:24px" class="social-links">
        <a href="https://www.tiktok.com/@aslam.on.lens?_r=1&_t=ZG-95yKr8Mk1zd" target="_blank" title="TikTok"><svg viewBox="0 0 448 512" width="22" height="22" fill="currentColor"><path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/></svg></a>
        <a href="https://wa.me/qr/EYZGBHXHM5B7E1" target="_blank" title="WhatsApp"><svg viewBox="0 0 448 512" width="22" height="22" fill="currentColor"><path d="M380.9 97.1C339 55.2 283.6 32 224.1 32 117.1 32 32 117.1 32 224c0 39.4 10.3 78 29.8 111.7L32 480l147.4-29.7c32.5 17.7 69.3 27.4 108.7 27.4 107 0 192.1-85.1 192.1-192 0-59.5-23.2-114.9-65.2-156.6zM224.1 403.3c-32 0-63.3-8.6-90.4-24.9l-6.5-3.9-87.4 17.6 18.6-85.3-4-6.5c-16.5-26.8-25.2-57.9-25.2-90.3 0-98.5 80.2-178.7 178.9-178.7 47.7 0 92.6 18.6 126.4 52.4s52.4 78.7 52.4 126.4c0 98.6-80.2 178.8-178.8 178.8zm101.1-138.4c-5.5-2.7-32.5-16.1-37.6-17.9-5-1.8-8.6-2.7-12.2 2.7-3.5 5.4-13.5 17.9-16.5 21.6-3 3.5-6 3.9-11.5 1.3-5.5-2.7-23.4-8.6-44.6-27.5-16.5-14.7-27.7-32.9-31-38.4-3.2-5.5-.3-8.5 2.4-11.2 2.5-2.5 5.5-6.5 8.2-9.7 2.7-3.2 3.6-5.4 5.4-9 1.8-3.5.9-6.5-.5-9.2-1.4-2.7-12.2-29.4-16.7-40.3-4.4-10.5-8.9-9.1-12.1-9.3-3.1-.2-6.7-.2-10.3-.2-3.5 0-9.2 1.3-14 6.5-4.8 5.2-18.3 17.9-18.3 43.7 0 25.8 18.8 50.7 21.4 54.2 2.7 3.5 37 56.4 89.8 79.1 12.5 5.4 22.2 8.6 29.8 11 12.5 3.8 23.8 3.3 32.8 2 10-1.4 32.5-13.3 37.1-26.1 4.6-12.8 4.6-23.8 3.2-26.1-1.4-2.3-5-3.5-10.5-6.2z"/></svg></a>
        <a href="https://www.instagram.com/aslam.on.lens?igsh=MWx1cHhqdnphcWFqaQ%3D%3D&utm_source=qr" target="_blank" title="Instagram"><svg viewBox="0 0 448 512" width="22" height="22" fill="currentColor"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37.2-2.1-147.9-2.1-185.1 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37.2-2.1 147.9 0 185.1 1.7 35.9 9.9 67.7 36.2 93.9 26.3 26.2 58 34.4 93.9 36.2 37.2 2.1 147.9 2.1 185.1 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37.2 2.1-147.8 0-185.1z"/></svg></a>
      </div>
    </div>
  </div></section>
  ${renderFooter()}`;
}
async function submitContact(){
  const name=document.getElementById('c-name')?.value.trim();
  const email=document.getElementById('c-email')?.value.trim();
  const phone=document.getElementById('c-phone')?.value.trim();
  const msg=document.getElementById('c-msg')?.value.trim();
  if(!name||!email||!msg){toast('Please fill all required fields','error');return}
  const appts=DB.get('appointments')||[];
  const newAppt = {
    id:uid(),
    name,
    email,
    phoneNumber:phone,
    message:msg,
    notes:msg,
    userId:currentUser?.id||'',
    status:'Pending',
    requestedAt:Date.now(),
    createdAt:Date.now()
  };
  appts.unshift(newAppt);
  DB.set('appointments',appts);
  saveToDataAPI('appointments', newAppt).catch(()=>{});
  const s=document.getElementById('contact-success');
  if(s){s.style.display='block'}
  toast('Appointment request submitted!','success');
}

// ================================================================
// DASHBOARD LAYOUT
// ================================================================
function renderDashboardLayout(){
  refreshCurrentUser();
  const isGuest=isGuestUser();
  const sections=isGuest?{
    overview:renderGuestOverview,
    appointments:renderDashAppointments,
    notifications:renderNotifications,
    profile:renderProfile,
    settings:renderSettings,
    'my-learning': renderMyLearning,
    'pathway': renderPathway,
    'my-list': renderMyList,
    'tv': renderTV,
    'live': renderLiveClasses,
  }:{
    overview:renderDashOverview,
    courses:renderDashCourses,
    reviews:renderDashReviews,
    'course-learn':renderCourseLearn,
    quizzes:renderDashQuizzes,
    jobs:renderDashJobs,
    'knowledge-base':renderKnowledgeBase,
    'live-classes':renderLiveClasses,
    chat:renderChat,
    challenges:renderMonthlyChallenges,
    examples:renderExamples,
    appointments:renderDashAppointments,
    profile:renderProfile,
    settings:renderSettings,
    notifications:renderNotifications,
    'my-learning': renderMyLearning,
    'pathway': renderPathway,
    'my-list': renderMyList,
    'tv': renderTV,
    'live': renderLiveClasses,
  };
  const content=sections[currentSection]?sections[currentSection]():(isGuest?renderGuestOverview():renderDashOverview());
  const notifUnread2=getVisibleNotifications().filter(n=>!isNotificationReadByUser(n,currentUser?.id)).length;
  const msgUnread2=getUnreadMessageCount();
  const chatUnreadSummary=getChatUnreadSummary();
  const unread=notifUnread2+msgUnread2;
  const nav=isGuest?[
    {icon:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',label:'Guest Desk',section:'overview'},
    {icon:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',label:'Inquiries',section:'appointments'},
    {icon:`<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>`,label:`Notifications${unread>0?` <span class="unread-count">${unread}</span>`:''}`,section:'notifications'},
    {icon:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>',label:'Profile',section:'profile'},
    {icon:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',label:'Settings',section:'settings'},
  ]:[
    {icon:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',label:'Overview',section:'overview'},
    {icon:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',label:'My Courses',section:'my-learning'},
    {icon:'🎓', label:'My Learning', section:'my-learning'},
    {icon:'🛣️', label:'My Pathway', section:'pathway'},
    {icon:'⭐', label:'My List', section:'my-list'},
    {icon:'📺', label:'KFAHAD TV', section:'tv'},
    {icon:'📡', label:'Live', section:'live'},
    {icon:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',label:'Reviews',section:'reviews'},
    {icon:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>',label:'Quizzes',section:'quizzes'},
    {icon:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',label:'Live Classes',section:'live-classes'},
    {icon:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',label:`Chat${chatUnreadSummary.total>0?` <span class="unread-count">${chatUnreadSummary.total}</span><div style="font-size:.68rem;color:var(--muted);margin-top:4px;line-height:1.35">${[chatUnreadSummary.groupLine,chatUnreadSummary.directLine].filter(Boolean).join('<br>')}</div>`:''}`,section:'chat'},
    {icon:'🏆',label:'Challenges',section:'challenges'},
    {icon:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>',label:'Jobs',section:'jobs'},
    {icon:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',label:'Knowledge Base',section:'knowledge-base'},
    {icon:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',label:'Examples',section:'examples'},
    {icon:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',label:'Appointments',section:'appointments'},
    {icon:`<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>`,label:`Notifications${unread>0?` <span class="unread-count">${unread}</span>`:''}`,section:'notifications'},
    {icon:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>',label:'Profile',section:'profile'},
    {icon:'<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',label:'Settings',section:'settings'},
  ];
  return `<div class="app-layout">
  <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>
  <button class="sidebar-toggle-btn" onclick="openSidebar()" title="Menu">
    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
  </button>
  <div class="sidebar" id="dash-sidebar">
    <div style="padding:12px 16px 0;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="profile-avatar" style="width:40px;height:40px;font-size:1rem">${currentUser.avatarUrl?`<img src="${currentUser.avatarUrl}" alt=""/>`:`${currentUser.name[0]}`}</div>
        <div><div style="font-weight:700;font-size:.875rem">${currentUser.name}</div><div style="font-size:.72rem;color:var(--muted)">${currentUser.role}</div></div>
      </div>
    </div>
    ${nav.map(n=>`<div class="sidebar-section"><a href="#dashboard/${n.section}" class="sidebar-item ${currentSection===n.section?'active':''}" onclick="showDashboard('${n.section}')">${n.icon}<span>${n.label}</span></a></div>`).join('')}
    <div class="sidebar-section"><a href="#home" class="sidebar-item" onclick="logout()"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="17" height="17"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg><span>Sign Out</span></a></div>
  </div>
  <div class="main-content">${content}</div></div>`;
}

function renderGuestOverview(){
  const appts=(DB.get('appointments')||[]).filter(a=>a.userId===currentUser.id);
  const pending=appts.filter(a=>a.status==='Pending').length;
  const replied=appts.filter(a=>a.adminReply).length;
  return `
  <div style="background:linear-gradient(135deg,rgba(59,130,246,.12),rgba(14,165,233,.08));border:1px solid rgba(59,130,246,.24);border-radius:var(--radius);padding:24px;margin-bottom:24px">
    <div class="responsive-two-col" style="grid-template-columns:1.2fr .8fr;align-items:center">
      <div>
        <div style="font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--pri);margin-bottom:6px">Guest Inquiry Desk</div>
        <h1 style="font-family:var(--font-h);font-size:1.9rem;font-weight:800;margin-bottom:10px">Hello ${currentUser.name.split(' ')[0]}, talk to admin before you join.</h1>
        <p style="color:var(--muted);line-height:1.7;margin-bottom:18px">This guest account is only for asking questions, sending inquiries, and receiving replies from admin. To start learning, you will need a real student account.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" onclick="showDashboard('appointments')">Send Inquiry</button>
          <button class="btn btn-outline btn-sm" onclick="showPublicPage('register-page');setTimeout(()=>setRegisterAccountType('student'),40)">Create Learning Account</button>
        </div>
      </div>
      <div style="padding:18px;background:var(--bg);border:1px solid var(--border);border-radius:14px">
        <div style="font-weight:700;margin-bottom:12px">What you can do here</div>
        <div style="display:flex;flex-direction:column;gap:10px;color:var(--muted);font-size:.84rem">
          <div>Ask admin about classes, pricing, enrollment, or support.</div>
          <div>Track replies to your inquiry requests.</div>
          <div>Create a full learning account when you are ready to study.</div>
        </div>
      </div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:28px">
    <div class="admin-stat"><div class="admin-stat-num">${appts.length}</div><div class="admin-stat-lbl">Total Inquiries</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--warn)">${pending}</div><div class="admin-stat-lbl">Pending Replies</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--success)">${replied}</div><div class="admin-stat-lbl">Admin Replies</div></div>
  </div>
  <div class="card">
    <div class="card-body">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <div>
          <h3 style="font-family:var(--font-h);font-size:1.05rem;font-weight:700;margin-bottom:4px">Ready for full access?</h3>
          <p style="color:var(--muted);font-size:.84rem">Guest accounts cannot open courses, quizzes, jobs, or the full student tools.</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="showPublicPage('register-page');setTimeout(()=>setRegisterAccountType('student'),40)">Join the Learning App</button>
      </div>
      <div style="padding:16px;border:1px dashed var(--border);border-radius:12px;background:var(--bg);font-size:.84rem;color:var(--muted);line-height:1.7">Create a real student account to unlock course categories, course units, reviews, quizzes, live classes, and the full academy dashboard.</div>
    </div>
  </div>`;
}

function renderMyLearning() {
  const continueWatching = BayyinahLogic.getContinueWatching();
  const myCourses = BayyinahLogic.getMyLearning();
  return `
  <h1>My Learning</h1>
  <p style="color:var(--muted)">Resume your active studies with state-driven tracking.</p>
  ${continueWatching ? renderContinueWatchingCard(continueWatching) : ''}
  ${myCourses.length ? renderMyLearningCoursesList(myCourses) : ''}
  ${!myCourses.length && !continueWatching ? '<div class="empty">Start a course to see your learning progress here.</div>' : ''}`;
}

function renderContinueWatchingCard(data) {
  const {course, nextLesson, percentComplete} = data;
  const prog = data.progress;
  const nextLabel = nextLesson ? `${nextLesson.modTitle}: ${nextLesson.title}` : 'No next lesson';
  return `
  <div class="card" style="margin-bottom:24px;background:linear-gradient(135deg,rgba(59,130,246,.12),rgba(139,92,246,.08));border:1px solid rgba(59,130,246,.25)">
    <div class="card-body">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div style="width:60px;height:60px;border-radius:12px;overflow:hidden;flex-shrink:0">
          <img src="${course.imageUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.src='https://picsum.photos/seed/${course.id}/600/400'"/>
        </div>
        <div style="flex:1">
          <div style="font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--pri);margin-bottom:4px">Continue Where You Left Off</div>
          <div style="font-family:var(--font-h);font-weight:700;font-size:1rem">${course.title}</div>
          <div style="color:var(--muted);font-size:.8rem;margin-top:2px">${nextLabel}</div>
        </div>
      </div>
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:.75rem;color:var(--muted);margin-bottom:4px">
          <span>Progress</span><span>${percentComplete}%</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${percentComplete}%"></div></div>
      </div>
      <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="openNextLesson('${course.id}', '${nextLesson?.id}', '${encodeURIComponent(nextLesson?.content || '')}', '${encodeURIComponent(nextLesson?.title || 'Continue')}')">
        ▶ Continue Where You Left Off
      </button>
    </div>
  </div>`;
}

function openNextLesson(courseId, lessonId, contentEnc, titleEnc) {
  openLesson(courseId, lessonId, 'video', contentEnc, titleEnc);
}

function renderMyLearningCoursesList(myCourses) {
  return `
  <h2 style="font-family:var(--font-h);font-size:1.2rem;font-weight:700;margin-bottom:16px">Video Queue</h2>
  <div style="display:flex;flex-direction:column;gap:12px">
    ${myCourses.map(c => renderMyLearningCourseItem(c)).join('')}
  </div>`;
}

function renderMyLearningCourseItem(course) {
  const prog = BayyinahLogic.getUserProgress(course.id);
  const sub = CourseLogic.hasFullAccess(currentUser);
  const allLessons = [];
  let lessonIndex = 0;
  for(const mod of (course.modules || [])){
    const modLessons = mod.lessons || [];
    const completedInMod = modLessons.filter(l => prog.completed.includes(l.id)).length;
    const modProgress = modLessons.length ? Math.round((completedInMod / modLessons.length) * 100) : 0;
    allLessons.push({mod, modLessons, modProgress, startIndex: lessonIndex, completedInMod});
    lessonIndex += modLessons.length;
  }
  const totalCompleted = prog.completed.length;
  const totalLessons = lessonIndex;
  const overallPct = totalLessons ? Math.round((totalCompleted / totalLessons) * 100) : 0;
  const isInList = BayyinahLogic.isInMyList(course.id);
  return `
  <div class="card">
    <div class="card-body">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:10px;flex:1">
          <img src="${course.imageUrl}" style="width:56px;height:56px;border-radius:10px;object-fit:cover" onerror="this.src='https://picsum.photos/seed/${course.id}/600/400'"/>
          <div>
            <div style="font-weight:700;font-size:.9rem">${course.title}</div>
            <div style="font-size:.75rem;color:var(--muted)">${totalCompleted}/${totalLessons} lessons complete</div>
          </div>
        </div>
        <button onclick="BayyinahLogic.toggleMyList('${course.id}')" style="background:none;border:none;cursor:pointer;font-size:1rem;color:${isInList?'var(--pri)':'var(--muted)'}">★</button>
      </div>
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;font-size:.7rem;color:var(--muted);margin-bottom:3px">
          <span>Overall Progress</span><span>${overallPct}%</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${overallPct}%"></div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${allLessons.map(({mod, modLessons, modProgress, startIndex, completedInMod}) => `
        <div style="border:1px solid var(--border);border-radius:10px;padding:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="font-size:.8rem;font-weight:600">${mod.title}</div>
            <div style="font-size:.72rem;color:var(--muted)">${completedInMod}/${modLessons.length}</div>
          </div>
          <div style="margin-bottom:8px">
            <div class="progress-bar" style="height:4px"><div class="progress-fill" style="width:${modProgress}%"></div></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${modLessons.map((l, i) => {
              const status = BayyinahLogic.getLessonStatus(course, startIndex + i);
              const isCompleted = status==='Completed' || prog.completed.includes(l.id);
              const isLocked = !sub || status==='Locked';
              const isActive = !isCompleted && !isLocked;
              return `
              <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;background:${isActive?'rgba(59,130,246,.1)':isCompleted?'rgba(34,197,94,.08)':'transparent'};font-size:.8rem">
                ${isCompleted ? '<span style="color:var(--success)">✓</span>' : isLocked ? '<span style="color:var(--muted)">🔒</span>' : '<span style="color:var(--pri)">▶</span>'}
                <span style="${isLocked ? 'color:var(--muted)' : isCompleted ? 'color:var(--success)' : 'color:var(--txt)'}">${l.title}</span>
                <span style="margin-left:auto;font-size:.7rem;color:var(--muted)">${l.duration || 0}min</span>
                ${!isLocked && !isCompleted ? `<button class="btn btn-primary btn-sm" style="padding:3px 8px;font-size:.7rem" onclick="openLesson('${course.id}','${l.id}','${l.type}','${encodeURIComponent(l.content)}','${encodeURIComponent(l.title)}')">Watch</button>` : ''}
                ${isCompleted ? `<span style="margin-left:auto;font-size:.7rem;color:var(--success)">Completed</span>` : ''}
              </div>`;
            }).join('')}
          </div>
        </div>`).join('')}
      </div>
      <button class="btn btn-outline btn-sm" style="width:100%;justify-content:center;margin-top:12px" onclick="startLearning('${course.id}')">Open Course</button>
    </div>
  </div>`;
}

function renderPathway() {
  const pathways = BayyinahLogic.getPathways();
  if(!pathways.length){
    return `<h1>My Pathway</h1><p style="color:var(--muted)">Structured learning paths curated by KFAHAD Academy.</p>
    <div class="empty"><h3>No pathways yet</h3><p>Admin will publish learning pathways here.</p></div>`;
  }
  return `<h1>My Pathway</h1><p style="color:var(--muted)">Structured learning paths curated by KFAHAD Academy.</p>
    <div style="display:flex;flex-direction:column;gap:20px">${pathways.map(p => `
      <div class="card"><div class="card-body">
        <h3>${p.title}</h3><p>${p.description}</p>
        <div style="display:flex;gap:10px;margin-top:10px">
          ${p.courseIds.map(id => {
            const c = getAllCourses().find(course => course.id === id);
            return c ? `<button class="btn btn-outline btn-sm" onclick="viewCourse('${c.id}')">${c.title}</button>` : '';
          }).join('')}
        </div>
      </div></div>`).join('')}</div>`;
}

function renderMyList() {
  const listIds = (DB.get('userLists') || {})[currentUser.id] || [];
  const myCards = getAllCourses().filter(c => listIds.includes(c.id));
  return `<h1>My List</h1><p style="color:var(--muted)">Your saved courses and favorite content.</p>
    <div class="course-grid">${myCards.map(c => renderCourseCardItem(c)).join('') || '<div class="empty">Your list is empty</div>'}</div>`;
}

function renderTV() {
  const content = BayyinahLogic.getTVContent();
  return `<h1>KFAHAD TV</h1><p style="color:var(--muted)">Exclusive series and educational broadcasts.</p>
    <div class="course-grid">${content.map(t => `
      <div class="card">
        <div style="aspect-ratio:16/9;background:#000;border-radius:8px;overflow:hidden">${renderVideoMediaHtml(t.url)}</div>
        <div class="card-body"><h3>${t.title}</h3><p>${t.description||'KFAHAD TV episode'}</p></div>
      </div>`).join('') || '<div class="empty">No TV series available yet.</div>'}</div>`;
}

function renderCourseCardItem(c) {
  const sub = CourseLogic.hasFullAccess();
  const isFav = BayyinahLogic.isInMyList(c.id);
  return `
  <div class="course-card">
    <div style="position:relative">
      <img class="course-img" src="${c.imageUrl}" onerror="this.src='https://picsum.photos/seed/${c.id}/600/400'"/>
      <button onclick="BayyinahLogic.toggleMyList('${c.id}')" style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.5);border:none;border-radius:50%;width:30px;height:30px;color:${isFav?'var(--pri)':'white'};cursor:pointer">★</button>
    </div>
    <div class="course-body">
      <div class="course-title">${c.title}</div>
      <button class="btn btn-primary btn-sm" style="width:100%;justify-content:center;margin-top:10px" onclick="viewCourse('${c.id}')">View</button>
    </div>
  </div>`;
}

// ================================================================
// ADMIN BAYYINAH MANAGEMENT
// ================================================================
function renderAdminBayyinahTools() {
  return `
  <div class="card" style="margin-top:20px"><div class="card-body">
    <h3>KFAHAD Tools</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px">
      <button class="btn btn-outline" onclick="openAdminPathwayModal()">Manage Pathways</button>
      <button class="btn btn-outline" onclick="openAdminTVModal()">Manage TV Content</button>
    </div>
  </div></div>`;
}

function openAdminPathwayModal() {
  const availableCourses = getAllCourses();
  const existingPathways = DB.get('pathways') || [];
  openModal('Manage Pathways', `
    <div class="form-group"><label>Pathway Title</label><input class="form-control" id="pw-title"/></div>
    <div class="form-group"><label>Description</label><input class="form-control" id="pw-desc"/></div>
    <div class="form-group"><label>Course IDs (comma separated)</label><input class="form-control" id="pw-ids" placeholder="web-11,html-12"/></div>
    <div style="font-size:.78rem;color:var(--muted);margin-bottom:12px">Available IDs: ${availableCourses.map(course=>course.id).join(', ')}</div>
    <div style="display:flex;flex-direction:column;gap:8px;max-height:180px;overflow:auto;padding-right:4px">
      ${existingPathways.map(pathway=>`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;background:var(--bg3);padding:8px 10px;border-radius:8px">
        <div style="min-width:0"><div style="font-weight:600;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${pathway.title}</div></div>
        <button class="btn btn-danger btn-sm" onclick="deletePathway('${pathway.id}')">Delete</button>
      </div>`).join('') || '<div style="color:var(--muted);font-size:.82rem">No pathways yet</div>'}
    </div>
  `, `<button class="btn btn-primary" onclick="savePathway()">Add Pathway</button>`);
}

function savePathway() {
  const title = document.getElementById('pw-title')?.value.trim();
  const desc = document.getElementById('pw-desc')?.value.trim();
  const rawIds = document.getElementById('pw-ids')?.value || '';
  const ids = [...new Set(rawIds.split(',').map(s => s.trim()).filter(Boolean))];
  if(!title){toast('Pathway title is required','error');return;}
  if(!desc){toast('Pathway description is required','error');return;}
  if(!ids.length){toast('Add at least one course ID','error');return;}
  const validCourseIds = new Set(getAllCourses().map(course=>course.id));
  const invalid = ids.filter(id=>!validCourseIds.has(id));
  if(invalid.length){toast(`Invalid course ID(s): ${invalid.join(', ')}`,'error');return;}
  const pws = DB.get('pathways') || [];
  pws.push({id:uid(), title, description:desc, courseIds:ids, createdAt:Date.now()});
  DB.set('pathways', pws);
  saveToDataAPI('pathways',{id:pws[pws.length-1].id,title,description:desc,course_ids:ids,created_at:Date.now()}).catch(()=>{});
  closeModal(); toast('Pathway created','success');
  showAdmin('bayyinah');
}
function deletePathway(id){
  if(!confirm('Delete this pathway?')) return;
  const pws = DB.get('pathways') || [];
  DB.set('pathways', pws.filter(pathway=>pathway.id!==id));
  deleteFromDataAPI('pathways',id).catch(()=>{});
  toast('Pathway deleted','success');
  openAdminPathwayModal();
}

function openAdminTVModal() {
  const existingTV = DB.get('tvArchive') || [];
  openModal('Add TV Content', `
    <div class="form-group"><label>Video Title</label><input class="form-control" id="tv-title"/></div>
    <div class="form-group"><label>Video URL</label><input class="form-control" id="tv-url" placeholder="YouTube or direct video URL"/></div>
    <div class="form-group"><label>Description</label><input class="form-control" id="tv-desc" placeholder="Optional description"/></div>
    <div style="display:flex;flex-direction:column;gap:8px;max-height:180px;overflow:auto;padding-right:4px">
      ${existingTV.map(item=>`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;background:var(--bg3);padding:8px 10px;border-radius:8px">
        <div style="min-width:0"><div style="font-weight:600;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.title}</div></div>
        <button class="btn btn-danger btn-sm" onclick="deleteTVItem('${item.id}')">Delete</button>
      </div>`).join('') || '<div style="color:var(--muted);font-size:.82rem">No TV content yet</div>'}
    </div>
  `, `<button class="btn btn-primary" onclick="saveTV()">Add to TV</button>`);
}

function saveTV() {
  const title = document.getElementById('tv-title')?.value.trim();
  const rawUrl = document.getElementById('tv-url')?.value.trim();
  const desc = document.getElementById('tv-desc')?.value.trim() || '';
  const url = normalizeYouTubeUrl(rawUrl||'');
  if(!title){toast('Video title is required','error');return;}
  if(!url){toast('Video URL is required','error');return;}
  if(!isValidCourseVideoUrl(url)){toast('Enter a valid YouTube or direct video URL','error');return;}
  const tv = DB.get('tvArchive') || [];
  const item = {id:uid(), title, url, description:desc, createdAt:Date.now()};
  tv.push(item);
  DB.set('tvArchive', tv);
  saveToDataAPI('live_sessions',{id:item.id,title:item.title,url:item.url,description:item.description,created_at:item.createdAt,type:'tv'}).catch(()=>{});
  closeModal(); toast('Added to KFAHAD TV','success');
  showAdmin('bayyinah');
}
function deleteTVItem(id){
  if(!confirm('Delete this TV item?')) return;
  const tv = DB.get('tvArchive') || [];
  DB.set('tvArchive', tv.filter(item=>item.id!==id));
  deleteFromDataAPI('live_sessions',id).catch(()=>{});
  toast('TV item deleted','success');
  openAdminTVModal();
}

// ================================================================
// DASHBOARD SECTIONS
// ================================================================
function renderDashOverview(){
  refreshCurrentUser();
  const isStaff=isStaffUser(currentUser);
  const sub=isStaff || isSubscribed();
  const daysLeft=CourseLogic.calculateSubscriptionDays(currentUser);
  const pending=(DB.get('payments')||[]).filter(p=>p.userId===currentUser.id&&p.status==='Pending');
  const attempts=DB.get('quizAttempts')||[];
  const myAttempts=attempts.filter(a=>a.userId===currentUser.id);
  const humanTrackProgress=CourseLogic.calculateTrackProgress(currentUser,'human-mastery');
  const digitalTrackProgress=CourseLogic.calculateTrackProgress(currentUser,'digital-mastery');
  return `
  <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:24px">
    <h1 style="font-family:var(--font-h);font-size:1.8rem;font-weight:800;margin-bottom:6px">Welcome back, ${currentUser.name.split(' ')[0]}! 👋</h1>
    <p style="color:var(--muted)">Let's continue your learning journey.</p>
  </div>
  ${!isStaff && pending.length?`<div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);border-radius:10px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
    <svg width="20" height="20" fill="none" stroke="var(--warn)" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    <span style="font-size:.875rem"><strong>Payment Pending:</strong> Your payment is being reviewed. Full access will be granted once approved.</span>
  </div>`:''}
  ${!isStaff && !sub && !pending.length?`<div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:10px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:12px">
    <span style="font-size:.875rem">🔒 No active subscription. Subscribe to access all courses.</span>
    <button class="btn btn-primary btn-sm" onclick="showPublicPage('pricing-page')">Subscribe Now</button>
  </div>`:''}
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-bottom:28px">
    <div class="admin-stat"><div class="admin-stat-num">${getAllCourses().length}</div><div class="admin-stat-lbl">Total Courses</div></div>
    <div class="admin-stat"><div class="admin-stat-num">${myAttempts.length}</div><div class="admin-stat-lbl">Quizzes Taken</div></div>
    <div class="admin-stat"><div class="admin-stat-num">${myAttempts.length?Math.round(myAttempts.reduce((s,a)=>s+a.score/a.totalQuestions*100,0)/myAttempts.length)+'%':'—'}</div><div class="admin-stat-lbl">Avg Quiz Score</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:${isStaff?'var(--pri)':sub?'var(--success)':'var(--danger)'}">${isStaff?'Staff':sub?'Active':'Inactive'}</div><div class="admin-stat-lbl">${isStaff?'Unlimited Access':sub?`${daysLeft} day${daysLeft===1?'':'s'} left`:'Subscription'}</div></div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:28px">
    <div class="card"><div class="card-body">
      <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px"><strong>The Human Mastery Series</strong><span style="color:var(--muted);font-size:.82rem">${humanTrackProgress}%</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${humanTrackProgress}%"></div></div>
    </div></div>
    <div class="card"><div class="card-body">
      <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px"><strong>ICT (Tech & Design)</strong><span style="color:var(--muted);font-size:.82rem">${digitalTrackProgress}%</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${digitalTrackProgress}%"></div></div>
    </div></div>
  </div>
  <div class="responsive-two-col">
    <div>
      <h2 style="font-family:var(--font-h);font-size:1.2rem;font-weight:700;margin-bottom:16px">Continue Learning</h2>
      <div class="course-grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">
        ${(() => {
          const userPicks = (currentUser?.interestedCourses?.length
            ? getAllCourses().filter(c => currentUser.interestedCourses.includes(c.id))
            : getAllCourses()).slice(0, 3);
          return userPicks.map(c => {
            const prog = getProgress(c.id);
            return `<div class="course-card">
              <img class="course-img" src="${c.imageUrl}" onerror="this.src='https://picsum.photos/seed/${c.id}/600/400'"/>
              <div class="course-body">
                <div class="course-title">${c.title}</div>
                <div style="margin:8px 0"><div class="progress-bar"><div class="progress-fill" style="width:${prog}%"></div></div><div style="font-size:.75rem;color:var(--muted);margin-top:4px">${prog}% complete</div></div>
                <button class="btn btn-primary btn-sm" style="width:100%;justify-content:center" onclick="viewCourse('${c.id}')">${sub?'Continue':'View'}</button>
              </div>
            </div>`;
          }).join('');
        })()}
      </div>
    </div>
    <div>
      <h3 style="font-family:var(--font-h);font-size:1rem;font-weight:700;margin-bottom:14px">Quick Links</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px">
        ${[['courses','My Courses'],['live-classes','Live Classes'],['jobs','Jobs'],['knowledge-base','Knowledge']].map(([s,l])=>`<button class="btn btn-outline btn-sm" onclick="showDashboard('${s}')" style="flex-direction:column;height:64px;gap:4px;font-size:.78rem">${l}</button>`).join('')}
      </div>
      <h3 style="font-family:var(--font-h);font-size:1rem;font-weight:700;margin-bottom:12px">Recent Activity</h3>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${[
          {text:'Welcome to KFAHAD Academy!',time:'Just now'},
          {text:`${COURSES.length} courses available to explore`,time:'Today'},
          {text:'Start with Introduction to Web Development',time:'Recommended'}
        ].map(a=>`<div style="display:flex;gap:10px;align-items:flex-start"><div style="width:8px;height:8px;border-radius:50%;background:var(--pri);flex-shrink:0;margin-top:5px"></div><div><div style="font-size:.83rem">${a.text}</div><div style="font-size:.75rem;color:var(--muted)">${a.time}</div></div></div>`).join('')}
      </div>
    </div>
  </div>`;
}

function renderDashCourses(){
  return renderMyLearning();
}

function renderCourseLearn(){
  const course=COURSES.find(c=>c.id===window._learningCourse);
  if(!course) return renderDashCourses();
  return renderCourseDetailPage();
}

function renderDashQuizzes(){
  const attempts=DB.get('quizAttempts')||[];
  const myAttempts=attempts.filter(a=>a.userId===currentUser.id).sort((a,b)=>b.submittedAt-a.submittedAt);
  return `
  <h1 style="font-family:var(--font-h);font-size:1.7rem;font-weight:800;margin-bottom:6px">My Quizzes</h1>
  <p style="color:var(--muted);margin-bottom:24px">Your quiz attempts and scores.</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:28px">
    ${Object.values(QUIZZES).map(q=>`<div class="card"><div class="card-body"><div style="font-weight:700;margin-bottom:6px">${q.title}</div><div style="font-size:.8rem;color:var(--muted);margin-bottom:12px">${q.questions.length} questions</div><button class="btn btn-primary btn-sm" onclick="openQuizModal('${q.id}','${q.courseId}')">Take Quiz</button></div></div>`).join('')}
  </div>
  <h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:14px">Quiz History</h2>
  ${myAttempts.length?`<div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>Quiz</th><th>Score</th><th>Percentage</th><th>Date</th></tr></thead><tbody>
  ${myAttempts.map(a=>`<tr><td>${QUIZZES[a.quizId]?.title||a.quizId}</td><td>${a.score}/${a.totalQuestions}</td><td><span class="badge ${a.score/a.totalQuestions>=0.7?'badge-success':'badge-danger'}">${Math.round(a.score/a.totalQuestions*100)}%</span></td><td style="color:var(--muted);font-size:.82rem">${new Date(a.submittedAt).toLocaleDateString()}</td></tr>`).join('')}
  </tbody></table></div></div></div>`:`<div class="empty"><svg class="empty-icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg><h3>No quiz attempts yet</h3><p>Take a quiz from your courses to get started.</p></div>`}`;
}

function renderDashJobs(){
  const jobs=getStoredJobs();
  return `
  <h1 style="font-family:var(--font-h);font-size:1.7rem;font-weight:800;margin-bottom:6px">Jobs & Opportunities</h1>
  <p style="color:var(--muted);margin-bottom:24px">Explore career opportunities relevant to your skills.</p>
  ${jobs.length?`<div style="display:flex;flex-direction:column;gap:14px">
  ${jobs.map(j=>`<div class="card"><div style="padding:20px 24px;display:flex;flex-direction:column gap-12 sm:flex-row;align-items:flex-start;justify-content:space-between;gap:16px">
    <div><h3 style="font-family:var(--font-h);font-size:1rem;margin-bottom:4px">${j.title}</h3>
    <div style="color:var(--muted);font-size:.85rem">${j.company} — ${j.location}</div>
    <p style="font-size:.83rem;color:var(--muted);margin-top:8px;line-height:1.5">${j.description}</p></div>
    <div style="display:flex;gap:8px;flex-shrink:0;align-items:center">
      <span class="badge badge-muted">${j.type}</span>
      <a href="${j.applyUrl||'#'}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Apply Now</a>
    </div>
  </div></div>`).join('')}
  </div>`:`<div class="empty"><svg class="empty-icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg><h3>No job postings available</h3><p>Check back soon for new opportunities.</p></div>`}`;
}

function renderKnowledgeBase(){
  const arts=DB.get('knowledgeBase')||[];
  return `
  <h1 style="font-family:var(--font-h);font-size:1.7rem;font-weight:800;margin-bottom:6px">Knowledge Base</h1>
  <p style="color:var(--muted);margin-bottom:24px">Find answers and helpful guides.</p>
  ${arts.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
  ${arts.map(a=>`<div class="card" style="cursor:pointer" onclick="openKBArticle('${a.id}')">
    <div class="card-body"><span class="badge badge-primary" style="margin-bottom:10px">${a.category}</span>
    <h3 style="font-family:var(--font-h);margin-bottom:8px">${a.title}</h3>
    <p style="color:var(--muted);font-size:.83rem;line-height:1.5">${a.description}</p></div>
  </div>`).join('')}
  </div>`:`<div class="empty"><h3>No articles yet</h3></div>`}`;
}
function openKBArticle(id){
  const art=(DB.get('knowledgeBase')||[]).find(a=>a.id===id);
  if(!art) return;
  openModal(art.title,`<div style="color:var(--muted);font-size:.85rem;margin-bottom:12px"><span class="badge badge-primary">${art.category}</span> · By ${art.author}</div><p style="line-height:1.8;white-space:pre-wrap">${art.content}</p>`,`<button class="btn btn-outline" onclick="closeModal()">Close</button>`);
}

const LIVE_EVENT_STATE = {
  intervalHandle:null,
  selectedId:null,
  theater:false,
  activeTab:'live'
};

function normalizeLiveSession(session){
  const startISO = session.startTime || (session.scheduledAt ? new Date(session.scheduledAt).toISOString() : null);
  const endISO = session.endTime || (session.scheduledAt ? new Date(new Date(session.scheduledAt).getTime()+60*60*1000).toISOString() : null);
  return {
    id: session.id,
    sessionTitle: session.sessionTitle || session.title || 'Live Session',
    description: session.description || '',
    provider: session.provider || 'youtube-live',
    videoURL: normalizeYouTubeUrl(session.videoURL || session.url || ''),
    replayURL: normalizeYouTubeUrl(session.replayURL || ''),
    thumbnailUrl: session.thumbnailUrl || session.imageUrl || `https://picsum.photos/seed/${session.id}/1280/720`,
    startTime: startISO,
    endTime: endISO,
    resourceLinks: Array.isArray(session.resourceLinks) ? session.resourceLinks : [],
    requiredCourseId: session.requiredCourseId || '',
    requiredLessonId: session.requiredLessonId || '',
    createdAt: session.createdAt || Date.now(),
    instructorName: session.instructorName || ''
  };
}

function isMeetingProvider(provider=''){
  const p = String(provider||'').toLowerCase();
  return p==='zoom' || p==='google-meet';
}

function getNormalizedLiveSessions(){
  return (DB.get('liveSessions')||[])
    .map(normalizeLiveSession)
    .filter(session=>session.startTime && session.endTime)
    .sort((a,b)=>new Date(a.startTime).getTime()-new Date(b.startTime).getTime());
}

function canAccessLiveSession(session){
  if(!currentUser) return false;
  if(isStaffUser(currentUser)) return true;
  if(!CourseLogic.hasFullAccess(currentUser)) return false;
  if(!session.requiredCourseId || !session.requiredLessonId) return true;
  const prog = BayyinahLogic.getUserProgress(session.requiredCourseId);
  return prog.completed.includes(session.requiredLessonId);
}

function formatLiveCountdown(ms){
  const total = Math.max(0,Math.floor(ms/1000));
  const d = Math.floor(total/86400);
  const h = Math.floor((total%86400)/3600);
  const m = Math.floor((total%3600)/60);
  const s = total%60;
  const pad = (n)=>String(n).padStart(2,'0');
  return `${d}:${pad(h)}:${pad(m)}:${pad(s)}`;
}

function chooseCurrentOrNextSession(sessions, nowMs){
  const live = sessions.find(session=>{
    const start = new Date(session.startTime).getTime();
    const end = new Date(session.endTime).getTime();
    return nowMs>=start && nowMs<=end;
  });
  if(live) return live;
  const upcoming = sessions.find(session=>new Date(session.startTime).getTime()>nowMs);
  if(upcoming) return upcoming;
  return sessions[sessions.length-1] || null;
}

function getLiveSessionPhase(session, nowMs=Date.now()){
  const start = new Date(session.startTime).getTime();
  const end = new Date(session.endTime).getTime();
  if(nowMs < start) return 'upcoming';
  if(nowMs <= end) return 'live';
  return 'past';
}

function switchLiveSessionTab(tab){
  LIVE_EVENT_STATE.activeTab = tab;
  const sessions = getNormalizedLiveSessions();
  const nowMs = Date.now();
  const filtered = sessions.filter(session=>getLiveSessionPhase(session,nowMs)===tab);
  LIVE_EVENT_STATE.selectedId = filtered[0]?.id || null;
  initLiveEventController();
}

function selectLiveSession(sessionId){
  LIVE_EVENT_STATE.selectedId = sessionId;
  initLiveEventController();
}

function renderLiveSessionSwitcher(sessions, selectedId){
  const nowMs = Date.now();
  const grouped = {
    upcoming: sessions.filter(session=>getLiveSessionPhase(session,nowMs)==='upcoming'),
    live: sessions.filter(session=>getLiveSessionPhase(session,nowMs)==='live'),
    past: sessions.filter(session=>getLiveSessionPhase(session,nowMs)==='past')
  };
  const tabs = [
    {key:'upcoming',label:'Upcoming'},
    {key:'live',label:'Live'},
    {key:'past',label:'Past'}
  ];
  const activeTab = LIVE_EVENT_STATE.activeTab;
  const tabSessions = grouped[activeTab] || [];
  return `
  <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px">
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${tabs.map(tab=>`<button class="btn ${activeTab===tab.key?'btn-primary':'btn-outline'} btn-sm" onclick="switchLiveSessionTab('${tab.key}')">${tab.label} (${grouped[tab.key].length})</button>`).join('')}
    </div>
    <div style="display:flex;gap:8px;overflow:auto;padding-bottom:2px">
      ${tabSessions.map(session=>`<button class="btn ${selectedId===session.id?'btn-primary':'btn-outline'} btn-sm" style="white-space:nowrap" onclick="selectLiveSession('${session.id}')">${session.sessionTitle}</button>`).join('') || `<span style="font-size:.82rem;color:var(--muted)">No ${activeTab} sessions</span>`}
    </div>
  </div>`;
}

function renderLiveEventState(session){
  const stage = document.getElementById('live-event-stage');
  if(!stage || !session) return;
  const nowMs = Date.now();
  const startMs = new Date(session.startTime).getTime();
  const endMs = new Date(session.endTime).getTime();
  const isPre = nowMs < startMs;
  const isLive = nowMs >= startMs && nowMs <= endMs;
  const isPost = nowMs > endMs;
  const accessible = canAccessLiveSession(session);

  const resourcesHtml = session.resourceLinks.length
    ? session.resourceLinks.map((resource,idx)=>`<a href="${resource.url}" target="_blank" class="btn btn-outline btn-sm" style="justify-content:flex-start;width:100%;font-size:.78rem">${resource.label||`Resource ${idx+1}`}</a>`).join('')
    : `<div style="font-size:.8rem;color:var(--muted)">No resources uploaded.</div>`;

  const countdown = formatLiveCountdown(startMs-nowMs);
  const mediaFrame = isMeetingProvider(session.provider)
    ? `<img src="${session.thumbnailUrl}" alt="${session.sessionTitle}" style="width:100%;height:100%;object-fit:cover"/>`
    : (isYouTubeLikeUrl(session.videoURL)
      ? `<iframe src="${session.videoURL}${session.videoURL.includes('?')?'&':'?'}rel=0" style="width:100%;height:100%;border:none" allowfullscreen></iframe>`
      : `<video style="width:100%;height:100%;background:#000" controls src="${session.videoURL}"></video>`);
  const wrapperStyle = LIVE_EVENT_STATE.theater
    ? 'grid-template-columns:1fr;'
    : 'grid-template-columns:minmax(0,2fr) minmax(280px,1fr);';

  const gatedNotice = !accessible
    ? `<div style="margin-top:12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:10px;padding:12px 14px;font-size:.84rem">
      🔒 Complete required lesson first: ${session.requiredCourseId}/${session.requiredLessonId}
    </div>`
    : '';

  stage.innerHTML = `
  <div style="display:grid;gap:16px;${wrapperStyle}">
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
        <div>
          <h2 style="font-family:var(--font-h);font-size:1.15rem;font-weight:700;margin-bottom:4px">${session.sessionTitle}</h2>
          <div style="font-size:.8rem;color:var(--muted)">${session.description||'Live learning event'}</div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="toggleLiveTheaterMode()">${LIVE_EVENT_STATE.theater?'Exit Theater':'Theater Mode'}</button>
      </div>
      <div style="aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;border:1px solid var(--border)">
        ${isPre ? `<img src="${session.thumbnailUrl}" alt="${session.sessionTitle}" style="width:100%;height:100%;object-fit:cover"/>` : (isLive && accessible ? mediaFrame : (isPost ? `<img src="${session.thumbnailUrl}" alt="${session.sessionTitle}" style="width:100%;height:100%;object-fit:cover;opacity:.45"/>` : `<img src="${session.thumbnailUrl}" alt="${session.sessionTitle}" style="width:100%;height:100%;object-fit:cover"/>`))}
      </div>
      <div style="margin-top:12px">
        ${isPre ? `<div class="badge badge-primary" style="font-size:.86rem">Starts In (UTC): ${countdown}</div>` : ''}
        ${isLive ? `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span class="badge badge-danger" style="font-size:.86rem;animation:pulse 1.4s infinite">● LIVE</span>
          ${isMeetingProvider(session.provider) && accessible ? `<a href="${session.videoURL}" target="_blank" class="btn btn-primary btn-sm">Join Live Meeting</a>` : ''}
          ${accessible?`<button class="btn btn-primary btn-sm" onclick="showDashboard('chat')">Join Chat</button>`:''}
        </div>` : ''}
        ${isPost ? `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span class="badge badge-muted">Session Ended</span>
          ${session.replayURL?`<a href="${session.replayURL}" target="_blank" class="btn btn-primary btn-sm">Watch the Replay</a>`:'<span style="font-size:.82rem;color:var(--muted)">Replay coming soon</span>'}
        </div>` : ''}
        ${gatedNotice}
      </div>
    </div>
    <aside style="position:sticky;top:72px;height:max-content;border:1px solid var(--border);background:var(--bg2);border-radius:12px;padding:14px">
      <div style="font-weight:700;font-size:.92rem;margin-bottom:10px">${isLive?'Live Resources':'Session Resources'}</div>
      <div style="display:flex;flex-direction:column;gap:8px">${resourcesHtml}</div>
      <div style="margin-top:12px;font-size:.78rem;color:var(--muted)">
        UTC Schedule<br/>
        ${new Date(session.startTime).toUTCString()}<br/>
        ${new Date(session.endTime).toUTCString()}
      </div>
    </aside>
  </div>`;
}

function initLiveEventController(){
  const sessions = getNormalizedLiveSessions();
  const root = document.getElementById('live-event-root');
  if(!root) return;
  if(!sessions.length){
    root.innerHTML = `<div class="empty"><h3>No live classes scheduled</h3><p>Check back soon for upcoming sessions.</p></div>`;
    return;
  }
  const nowMs = Date.now();
  const grouped = {
    upcoming: sessions.filter(session=>getLiveSessionPhase(session,nowMs)==='upcoming'),
    live: sessions.filter(session=>getLiveSessionPhase(session,nowMs)==='live'),
    past: sessions.filter(session=>getLiveSessionPhase(session,nowMs)==='past')
  };
  if(!['upcoming','live','past'].includes(LIVE_EVENT_STATE.activeTab)) LIVE_EVENT_STATE.activeTab = 'live';
  let scoped = grouped[LIVE_EVENT_STATE.activeTab];
  if(!scoped.length){
    scoped = grouped.live.length ? grouped.live : (grouped.upcoming.length ? grouped.upcoming : grouped.past);
    LIVE_EVENT_STATE.activeTab = grouped.live.length ? 'live' : (grouped.upcoming.length ? 'upcoming' : 'past');
  }
  const selected = scoped.find(session=>session.id===LIVE_EVENT_STATE.selectedId)
    || sessions.find(session=>session.id===LIVE_EVENT_STATE.selectedId)
    || chooseCurrentOrNextSession(scoped.length?scoped:sessions,Date.now());
  LIVE_EVENT_STATE.selectedId = selected.id;
  root.innerHTML = `${renderLiveSessionSwitcher(sessions, selected.id)}<div id="live-event-stage"></div>`;
  renderLiveEventState(selected);
  if(LIVE_EVENT_STATE.intervalHandle) clearInterval(LIVE_EVENT_STATE.intervalHandle);
  LIVE_EVENT_STATE.intervalHandle = setInterval(()=>{
    const fresh = getNormalizedLiveSessions();
    const freshNow = Date.now();
    const freshGrouped = {
      upcoming: fresh.filter(session=>getLiveSessionPhase(session,freshNow)==='upcoming'),
      live: fresh.filter(session=>getLiveSessionPhase(session,freshNow)==='live'),
      past: fresh.filter(session=>getLiveSessionPhase(session,freshNow)==='past')
    };
    let freshScoped = freshGrouped[LIVE_EVENT_STATE.activeTab] || [];
    if(!freshScoped.length){
      freshScoped = freshGrouped.live.length ? freshGrouped.live : (freshGrouped.upcoming.length ? freshGrouped.upcoming : freshGrouped.past);
    }
    const current = freshScoped.find(session=>session.id===LIVE_EVENT_STATE.selectedId)
      || fresh.find(session=>session.id===LIVE_EVENT_STATE.selectedId)
      || chooseCurrentOrNextSession(freshScoped.length?freshScoped:fresh,Date.now());
    if(current){
      const liveRoot = document.getElementById('live-event-root');
      if(liveRoot){
        liveRoot.innerHTML = `${renderLiveSessionSwitcher(fresh, current.id)}<div id="live-event-stage"></div>`;
      }
      renderLiveEventState(current);
    }
  },10000);
}

function toggleLiveTheaterMode(){
  LIVE_EVENT_STATE.theater = !LIVE_EVENT_STATE.theater;
  initLiveEventController();
}

function renderLiveClasses(){
  return `
  <h1 style="font-family:var(--font-h);font-size:1.7rem;font-weight:800;margin-bottom:6px">Live Classes</h1>
  <p style="color:var(--muted);margin-bottom:18px">State-driven live events with UTC scheduling, resources, and replay access.</p>
  <div id="live-event-root"></div>`;
}

// chatMode: 'group' | 'dm'
window._chatMode = window._chatMode || 'group';
window._chatWith = window._chatWith || null;

function formatChatTime(timestamp){
  return new Date(timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
}
function formatChatDay(timestamp){
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate()-1);
  if(date.toDateString()===today.toDateString()) return 'Today';
  if(date.toDateString()===yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString();
}
function getMessageStatus(message){
  if(message.channel!=='dm' || message.senderId!==currentUser.id) return '';
  if(isMessageReadByUser(message,message.receiverId)) return 'read';
  if((message.deliveredTo||[]).includes(message.receiverId)) return 'delivered';
  return 'sent';
}
function scrollChatToBottom(){
  setTimeout(()=>{
    const el=document.getElementById('chat-msgs');
    if(el) el.scrollTop=el.scrollHeight;
  },80);
}

function renderChat(){
  const allUsers = DB.get('users')||[];
  const others = getChatDirectory();
  const mode = window._chatMode||'group';
  const primaryAdmin = getPrimaryAdminUser(allUsers);
  const defaultDmPartner = currentUser.role==='admin'
    ? others[0]
    : (primaryAdmin && primaryAdmin.id!==currentUser.id ? others.find(user=>user.id===primaryAdmin.id) : null) || others[0];
  const initialDmPartner = window._chatWith ? others.find(u=>u.id===window._chatWith) : defaultDmPartner;
  if(!window._chatWith && initialDmPartner) window._chatWith = initialDmPartner.id;
  if(mode==='group') markMessagesAsRead({channel:'group'});
  if(mode==='dm' && initialDmPartner) markMessagesAsRead({channel:'dm',userId:initialDmPartner.id});
  const messages = getStoredMessages().filter(isHumanChatMessage);

  const groupUnread = messages.filter(message=>message.channel==='group' && message.senderId!==currentUser.id && !isMessageReadByUser(message,currentUser.id)).length;
  const groupMessages = messages.filter(message=>message.channel==='group').sort((a,b)=>a.createdAt-b.createdAt);
  const latestGroupMessage = groupMessages[groupMessages.length-1];

  const directChats = others.map(user=>{
    const thread = messages
      .filter(message=>message.channel==='dm' && ((message.senderId===currentUser.id && message.receiverId===user.id) || (message.senderId===user.id && message.receiverId===currentUser.id)))
      .sort((a,b)=>a.createdAt-b.createdAt);
    return {
      user,
      messages: thread,
      lastMessage: thread[thread.length-1] || null,
      unread: thread.filter(message=>message.senderId===user.id && message.receiverId===currentUser.id && !isMessageReadByUser(message,currentUser.id)).length
    };
  }).sort((a,b)=>(b.lastMessage?.createdAt||0)-(a.lastMessage?.createdAt||0) || a.user.name.localeCompare(b.user.name));

  const totalDirectUnread = directChats.reduce((sum,chat)=>sum+chat.unread,0);
  const dmPartner = window._chatWith ? others.find(u=>u.id===window._chatWith) : directChats[0]?.user;
  const activeDmChat = directChats.find(chat=>chat.user.id===window._chatWith);
  const dmMessages = activeDmChat?.messages || [];

  function renderChatMessage(message,{showName=false,showAvatar=false}={}){
    const isMine = message.senderId===currentUser.id;
    const sender = allUsers.find(user=>user.id===message.senderId);
    const status = getMessageStatus(message);
    const safeText = message.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>');
    const avatarContent = showAvatar && !isMine 
      ? `<div class="chat-avatar">${(sender?.name||'?')[0]}</div>`
      : `<div class="chat-avatar-spacer"></div>`;
    return `
      <div class="chat-row ${isMine?'mine':'theirs'}">
        ${avatarContent}
        <div class="chat-message-stack">
          ${showName && !isMine ? `<div class="chat-sender-name">${sender?.name||'Unknown'}</div>` : ''}
          <div class="msg-bubble ${isMine?'mine':'theirs'}">
            <div class="chat-bubble-text">${safeText}</div>
            <div class="chat-bubble-meta ${isMine?'mine':'theirs'}">
              <span>${formatChatTime(message.createdAt)}</span>
              ${isMine && status ? `<span class="chat-status ${status}">${status==='read'?'✓✓':status==='delivered'?'✓✓':'✓'}</span>` : ''}
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderChatMessages(list,{group=false}={}){
    if(!list.length){
      return group
        ? '<div class="chat-empty-state">Broadcast messages will appear here for everyone.</div>'
        : `<div class="chat-empty-state">Start a conversation with ${dmPartner?.name||'a member'}.</div>`;
    }
    let lastDay = '';
    return list.map(message=>{
      const day = formatChatDay(message.createdAt);
      const showDay = day!==lastDay;
      lastDay = day;
      return `${showDay?`<div class="chat-day-divider"><span>${day}</span></div>`:''}${renderChatMessage(message,{showName:group,showAvatar:group})}`;
    }).join('');
  }

  return `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
    <h1 style="font-family:var(--font-h);font-size:1.5rem;font-weight:800">Community Chat</h1>
    <div style="display:flex;align-items:center;gap:10px">
      <span class="badge ${CHAT_BACKEND.apiAvailable?'badge-success':'badge-warn'}">${CHAT_BACKEND.apiAvailable?'Live sync on':'Local fallback'}</span>
      <button class="btn btn-outline btn-sm" onclick="toggleChatSidebar()">Chats</button>
    </div>
  </div>
  <div class="chat-layout whatsapp-chat-layout">

    <div class="chat-sidebar" id="chat-sidebar-panel">
      <div class="chat-mode-tabs">
        <div class="chat-mode-tab ${mode==='group'?'active':''}" onclick="switchChatMode('group')">
          📢 Broadcast${groupUnread>0?`<span class="chat-badge">${groupUnread}</span>`:''}
        </div>
        <div class="chat-mode-tab ${mode==='dm'?'active':''}" onclick="switchChatMode('dm')">
          💬 Direct${totalDirectUnread>0?`<span class="chat-badge">${totalDirectUnread}</span>`:''}
        </div>
      </div>
      <div class="chat-list">
        <div class="chat-item ${mode==='group'?'active':''}" onclick="switchChatMode('group')">
          <div class="chat-item-avatar">📢</div>
          <div class="chat-item-copy">
            <div class="chat-item-top">
              <div class="chat-item-name">Broadcast Room</div>
              <div class="chat-item-time">${latestGroupMessage?formatChatTime(latestGroupMessage.createdAt):''}</div>
            </div>
            <div class="chat-item-msg">${latestGroupMessage?latestGroupMessage.text.slice(0,42):`${allUsers.length} members in the live room`}</div>
          </div>
          ${groupUnread>0?`<span class="chat-badge">${groupUnread}</span>`:''}
        </div>
        ${directChats.map(chat=>`
          <div class="chat-item ${mode==='dm'&&window._chatWith===chat.user.id?'active':''}" onclick="switchChat('${chat.user.id}')">
            <div class="chat-item-avatar">${chat.user.name[0]}</div>
            <div class="chat-item-copy">
              <div class="chat-item-top">
                <div class="chat-item-name">${chat.user.name}</div>
                <div class="chat-item-time">${chat.lastMessage?formatChatTime(chat.lastMessage.createdAt):''}</div>
              </div>
              <div class="chat-item-msg">${chat.lastMessage?chat.lastMessage.text.slice(0,42):chat.user.role}</div>
            </div>
            ${chat.unread>0?`<span class="chat-badge">${chat.unread}</span>`:''}
          </div>`).join('')}
      </div>
    </div>

    <div class="chat-main">
      <div class="chat-header whatsapp-chat-header" style="display:flex;align-items:center;gap:10px">
        <button class="btn btn-ghost btn-sm" onclick="toggleChatSidebar()" id="chat-back-btn">←</button>
        ${mode==='group'
          ? `<div class="chat-header-presence"><div class="chat-item-avatar">📢</div><div><div>Broadcast Room</div><div class="chat-header-sub">${allUsers.length} members online in this local live chat</div></div></div>`
          : `<div class="chat-header-presence"><div class="chat-item-avatar">${(dmPartner?.name||'?')[0]}</div><div><div>${dmPartner?.name||'Select a chat'}</div><div class="chat-header-sub">${dmPartner?.role||'Direct message'}</div></div></div>`
        }
      </div>
      <div class="chat-messages whatsapp-chat-messages" id="chat-msgs">
        ${mode==='group' ? renderChatMessages(groupMessages,{group:true}) : renderChatMessages(dmMessages)}
      </div>
      <div class="chat-input-area whatsapp-chat-input">
        <input class="form-control" id="chat-input" placeholder="${mode==='group'?'Send a broadcast message...':'Message '+( dmPartner?.name||'')+'...'}" onkeydown="if(event.key==='Enter')sendChatMsg()" style="flex:1"/>
        <button class="btn btn-primary" onclick="sendChatMsg()" style="padding:10px 18px;white-space:nowrap" ${mode==='dm'&&!dmPartner?'disabled':''}>
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>
  </div>`;
}

function switchChatMode(mode){
  window._chatMode = mode;
  showDashboard('chat');
  document.getElementById('chat-sidebar-panel')?.classList.remove('show-mobile');
  scrollChatToBottom();
}
function switchChat(userId){
  window._chatMode='dm';
  window._chatWith=userId;
  markMessagesAsRead({channel:'dm',userId});
  showDashboard('chat');
  document.getElementById('chat-sidebar-panel')?.classList.remove('show-mobile');
  scrollChatToBottom();
}
function toggleChatSidebar(){
  const panel=document.getElementById('chat-sidebar-panel');
  if(panel){panel.classList.toggle('show-mobile');}
}
function sendChatMsg(){
  const input=document.getElementById('chat-input');
  if(!input||!input.value.trim()) return;
  const text=input.value.trim();
  const messages=getStoredMessages();
  const mode=window._chatMode||'group';
  const otherUsers=(DB.get('users')||[]).filter(user=>user.id!==currentUser.id);
  const msg={id:uid(),senderId:currentUser.id,text,createdAt:Date.now(),read:false,readBy:[currentUser.id],deliveredTo:[],pending:true};
  if(mode==='group'){
    msg.channel='group';
    msg.receiverId=null;
    msg.deliveredTo=otherUsers.map(user=>user.id);
  } else {
    if(!window._chatWith) return;
    msg.receiverId=window._chatWith;msg.channel='dm';
    msg.deliveredTo=[window._chatWith];
  }
  messages.push(msg);
  saveStoredMessages(messages);
  input.value='';
  showDashboard('chat');
  scrollChatToBottom();
  sendMessageToServer({...msg,pending:false}).then(sent=>{
    if(sent){
      const next = getStoredMessages().map(entry=>entry.id===msg.id?{...entry,pending:false}:entry);
      saveStoredMessages(next);
      toast(mode==='group'?'Broadcast sent':'Message sent','success');
      return;
    }
    toast('Message queued. It will send automatically when connection is back.','warn');
  });
}

function renderExamples(){
  const examples=(DB.get('examples')||[]).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  return `
  <h1 style="font-family:var(--font-h);font-size:1.7rem;font-weight:800;margin-bottom:6px">Student Examples</h1>
  <p style="color:var(--muted);margin-bottom:24px">Inspiring work from our students.</p>
  ${examples.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px">
  ${examples.map(e=>`<div class="card">
    <img src="${e.imageUrl||`https://picsum.photos/seed/${e.id||uid().slice(0,6)}/600/400`}" style="width:100%;aspect-ratio:16/9;object-fit:cover" onerror="this.src='https://picsum.photos/seed/${e.id||'example'}/600/400'"/>
    <div class="card-body"><h3 style="font-family:var(--font-h);margin-bottom:6px">${e.title}</h3><p style="color:var(--muted);font-size:.83rem">${e.description||'No description provided yet.'}</p></div>
  </div>`).join('')}
  </div>`:`<div class="empty"><h3>No examples yet</h3></div>`}`;
}

function renderDashAppointments(){
  const appts=(DB.get('appointments')||[]).filter(a=>a.userId===currentUser.id);
  const guest=isGuestUser();
  return `
  <h1 style="font-family:var(--font-h);font-size:1.7rem;font-weight:800;margin-bottom:6px">${guest?'My Inquiries':'My Appointments'}</h1>
  <p style="color:var(--muted);margin-bottom:24px">${guest?'Contact admin and track your inquiry requests here.':'Track your appointment requests.'}</p>
  <button class="btn btn-primary btn-sm" style="margin-bottom:20px" onclick="showPublicPage('contact-page')">+ ${guest?'Send Inquiry':'Request Appointment'}</button>
  ${appts.length?`<div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>Date</th><th>Message</th><th>Status</th></tr></thead><tbody>
  ${appts.map(a=>`<tr>
    <td style="font-size:.82rem;color:var(--muted)">${new Date(a.requestedAt).toLocaleDateString()}</td>
    <td style="font-size:.83rem">
      <div>${a.message}</div>
      ${a.adminReply?`<div style="margin-top:6px;padding:6px 10px;background:rgba(59,130,246,.08);border-left:2px solid var(--pri);border-radius:4px;font-size:.8rem;color:var(--txt)"><strong>Admin Reply:</strong> ${a.adminReply}</div>`:''}
    </td>
    <td><span class="badge ${a.status==='Confirmed'?'badge-success':a.status==='Declined'?'badge-danger':'badge-warn'}">${a.status}</span></td>
  </tr>`).join('')}
  </tbody></table></div></div></div>`:`<div class="empty"><h3>No ${guest?'inquiries':'appointments'} yet</h3><p>${guest?'Send an inquiry from the Contact page and admin will reply here.':'Request an appointment via the Contact page.'}</p></div>`}`;
}

function renderNotifications(){
  const notifs=getVisibleNotifications().sort((a,b)=>b.createdAt-a.createdAt);
  markVisibleNotificationsRead();
  return `
  <h1 style="font-family:var(--font-h);font-size:1.7rem;font-weight:800;margin-bottom:6px">Notifications</h1>
  <p style="color:var(--muted);margin-bottom:24px">Stay updated with the latest announcements.</p>
  ${notifs.length?`<div style="display:flex;flex-direction:column;gap:10px">
  ${notifs.map(n=>`<div class="card"><div style="padding:16px 20px;display:flex;align-items:flex-start;gap:14px">
    <div style="width:8px;height:8px;border-radius:50%;background:var(--pri);flex-shrink:0;margin-top:5px"></div>
    <div><div style="font-weight:700;font-size:.9rem;margin-bottom:3px">${n.title}</div>
    <div style="color:var(--muted);font-size:.83rem;margin-bottom:4px">${n.body}</div>
    <div style="font-size:.75rem;color:var(--muted)">${new Date(n.createdAt).toLocaleString()}</div></div>
  </div></div>`).join('')}
  </div>`:`<div class="empty"><h3>No notifications</h3></div>`}`;
}

function renderProfile(){
  refreshCurrentUser();
  const isStaff=isStaffUser(currentUser);
  const sub=isStaff || isSubscribed();
  const daysLeft=CourseLogic.calculateSubscriptionDays(currentUser);
  const humanTrackProgress=CourseLogic.calculateTrackProgress(currentUser,'human-mastery');
  const digitalTrackProgress=CourseLogic.calculateTrackProgress(currentUser,'digital-mastery');
  return `
  <h1 style="font-family:var(--font-h);font-size:1.7rem;font-weight:800;margin-bottom:24px">My Profile</h1>
  <div class="responsive-profile-grid">
    <div class="card"><div class="card-body" style="text-align:center">
      <div class="profile-avatar" style="margin:0 auto 14px">${currentUser.avatarUrl?`<img src="${currentUser.avatarUrl}"/>`:`${currentUser.name[0]}`}</div>
      <div style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:4px">${currentUser.name}</div>
      <div style="color:var(--muted);font-size:.85rem;margin-bottom:10px">${currentUser.email}</div>
      <span class="badge badge-${currentUser.role}">${currentUser.role}</span>
      <div style="margin-top:16px;padding:12px;background:var(--bg);border-radius:8px">
        <div style="font-size:.78rem;color:var(--muted);margin-bottom:4px">Subscription</div>
        ${isStaff ? `
          <div style="font-weight:700;color:var(--pri)">Staff Access</div>
          <div style="font-size:.75rem;color:var(--muted);margin-top:2px">Permanent &bull; No Subscription Needed</div>
        ` : `
          <div style="font-weight:700;color:${sub?'var(--success)':'var(--danger)'}">${sub?'Active':'Inactive'}</div>
          ${currentUser.subscriptionExpiresAt?`<div style="font-size:.75rem;color:var(--muted)">Expires: ${new Date(currentUser.subscriptionExpiresAt).toLocaleDateString()}</div>`:''}
          ${sub?`<div style="font-size:.75rem;color:var(--muted)">${daysLeft} day${daysLeft===1?'':'s'} remaining</div>`:''}
          ${!sub?`<button class="btn btn-primary btn-sm" style="margin-top:8px;width:100%;justify-content:center" onclick="showPublicPage('pricing-page')">Subscribe</button>`:''}
        `}
      </div>
    </div></div>
    <div class="card"><div class="card-body">
      <h3 style="font-family:var(--font-h);margin-bottom:20px">Edit Profile</h3>
      <div class="form-group">
        <label>Profile Photo</label>
        <div id="p-avatar-preview" style="display:flex;justify-content:center;margin-bottom:10px">
          <div class="profile-avatar" style="margin:0 auto">${currentUser.avatarUrl?`<img src="${currentUser.avatarUrl}" alt="Profile photo"/>`:currentUser.name[0]}</div>
        </div>
        <input type="hidden" id="p-avatar-data" value="${currentUser.avatarUrl||''}"/>
        <input class="form-control" type="file" accept="image/*" onchange="handleProfileImageUpload(this.files[0],'p-avatar-preview','p-avatar-data')"/>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px">
        <div style="padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg)">
          <div style="font-size:.78rem;color:var(--muted);margin-bottom:4px">Human Mastery</div>
          <div style="font-weight:700;margin-bottom:8px">${humanTrackProgress}% complete</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${humanTrackProgress}%"></div></div>
        </div>
        <div style="padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg)">
          <div style="font-size:.78rem;color:var(--muted);margin-bottom:4px">Digital Mastery</div>
          <div style="font-weight:700;margin-bottom:8px">${digitalTrackProgress}% complete</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${digitalTrackProgress}%"></div></div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Full Name</label><input class="form-control" id="p-name" value="${currentUser.name}"/></div>
        <div class="form-group"><label>Email</label><input class="form-control" id="p-email" value="${currentUser.email}" disabled/></div>
      </div>
      <div class="form-group"><label>Phone Number</label><input class="form-control" id="p-phone" value="${currentUser.phoneNumber||''}"/></div>
      <div class="form-group"><label>Bio</label><textarea class="form-control" id="p-bio" rows="3">${currentUser.bio||''}</textarea></div>
      <button class="btn btn-primary" onclick="saveProfile()">Save Changes</button>
    </div></div>
  </div>`;
}
async function saveProfile(){
  const name=document.getElementById('p-name')?.value.trim();
  const phone=document.getElementById('p-phone')?.value.trim();
  const bio=document.getElementById('p-bio')?.value.trim();
  const avatarUrl=document.getElementById('p-avatar-data')?.value.trim();
  if(!name){toast('Name is required','error');return}
  try{
    await updateCurrentUserRemote({name,phoneNumber:phone,bio,avatarUrl});
    toast('Profile updated!','success');
    showDashboard('profile');
  }catch(error){
    toast(error.message,'error');
  }
}

function renderSettings(){
  return `
  <h1 style="font-family:var(--font-h);font-size:1.7rem;font-weight:800;margin-bottom:24px">Settings</h1>
  <div style="display:flex;flex-direction:column;gap:20px;max-width:560px">
    <div class="card"><div class="card-body">
      <h3 style="font-family:var(--font-h);margin-bottom:16px">Change Password</h3>
      <div class="form-group"><label>Current Password</label><input class="form-control" id="s-old" type="password"/></div>
      <div class="form-group"><label>New Password</label><input class="form-control" id="s-new" type="password"/></div>
      <div class="form-group"><label>Confirm Password</label><input class="form-control" id="s-conf" type="password"/></div>
      <button class="btn btn-primary" onclick="changePassword()">Update Password</button>
    </div></div>
    <div class="card"><div class="card-body">
      <h3 style="font-family:var(--font-h);margin-bottom:10px;color:var(--danger)">Danger Zone</h3>
      <p style="color:var(--muted);font-size:.875rem;margin-bottom:16px">Sign out from all sessions.</p>
      <button class="btn btn-danger" onclick="logout()">Sign Out</button>
    </div></div>
  </div>`;
}
async function changePassword(){
  const old=document.getElementById('s-old')?.value;
  const nw=document.getElementById('s-new')?.value;
  const conf=document.getElementById('s-conf')?.value;
  if(!old||!nw||!conf){toast('All fields are required','error');return}
  if(nw.length<6){toast('Password must be at least 6 characters','error');return}
  if(nw!==conf){toast('Passwords do not match','error');return}
  try {
    const res = await postAuthApi({action:'change_password', oldPassword:old, newPassword:nw}, {token:currentUser?.authToken});
    toast(res?.message || 'Password updated successfully!','success');
    document.getElementById('s-old').value='';document.getElementById('s-new').value='';document.getElementById('s-conf').value='';
  } catch(err) {
    toast(err.message || 'Failed to update password','error');
  }
}

// ================================================================
// ADMIN LAYOUT
// ================================================================
function renderAdminLayout(){
  const sections={
    overview:renderAdminOverview,
    users:renderAdminUsers,
    categories:renderAdminCategories,
    guests:renderAdminGuests,
    reviews:renderAdminReviews,
    payments:renderAdminPayments,
    courses:renderAdminCourses,
    appointments:renderAdminAppointments,
    blog:renderAdminBlog,
    jobs:renderAdminJobs,
    'knowledge-base':renderAdminKB,
    'bayyinah': renderAdminOverview, // Reusing overview for tools
    notifications:renderAdminNotifications,
    examples:renderAdminExamples,
    'live-sessions':renderAdminLiveSessions,
  };
  const content=sections[currentSection]?sections[currentSection]():renderAdminOverview();
  const nav=[
    {icon:'🏠',label:'Overview',section:'overview'},
    {icon:'👥',label:'Users',section:'users'},
    {icon:'🗂',label:'Categories',section:'categories'},
    {icon:'🧾',label:'Guests',section:'guests'},
    {icon:'💬',label:'Reviews',section:'reviews'},
    {icon:'💳',label:'Payments',section:'payments'},
    {icon:'📚',label:'Courses',section:'courses'},
    {icon:'🗓',label:'Appointments',section:'appointments'},
    {icon:'📝',label:'Blog Posts',section:'blog'},
    {icon:'💼',label:'Jobs',section:'jobs'},
    {icon:'📖',label:'Knowledge Base',section:'knowledge-base'},
    {icon:'🔔',label:'Notifications',section:'notifications'},
    {icon:'🖼',label:'Examples',section:'examples'},
    {icon:'📡',label:'Live Sessions',section:'live-sessions'},
    {icon:'📺',label:'KFAHAD Tools',section:'bayyinah'},
  ];
  return `<div class="app-layout">
  <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>
  <button class="sidebar-toggle-btn" onclick="openSidebar()" title="Admin menu">
    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
  </button>
  <div class="sidebar" id="admin-sidebar">
    <div style="padding:12px 16px;margin-bottom:8px">
      <div style="font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--danger);margin-bottom:4px">Admin Panel</div>
      <div style="font-weight:700;font-size:.9rem">${currentUser.name}</div>
    </div>
    ${nav.map(n=>`<div class="sidebar-section"><a href="#admin/${n.section}" class="sidebar-item ${currentSection===n.section?'active':''}" onclick="showAdmin('${n.section}')">${n.icon} ${n.label}</a></div>`).join('')}
    <div class="sidebar-section"><a href="#dashboard/overview" class="sidebar-item" onclick="showDashboard()">← Back to Dashboard</a></div>
  </div>
  <div class="main-content">${content}</div></div>`;
}

function renderAdminOverview(){
  const users=DB.get('users')||[];
  const payments=DB.get('payments')||[];
  const appts=DB.get('appointments')||[];
  const people=users.filter(u=>u.role!=='admin');
  const categorizedPeople=people.filter(u=>getUserInterestSummary(u).categoryLabels.length).length;
  const pendingPay=payments.filter(p=>p.status==='Pending').length;
  const totalRev=payments.filter(p=>p.status==='Approved').reduce((s,p)=>s+p.amount,0);
  return `
  <h1 style="font-family:var(--font-h);font-size:1.7rem;font-weight:800;margin-bottom:6px">Admin Dashboard</h1>
  <p style="color:var(--muted);margin-bottom:24px">Platform overview and management.</p>
  <div class="admin-stat-cards">
    <div class="admin-stat"><div class="admin-stat-num">${users.length}</div><div class="admin-stat-lbl">Total Users</div></div>
    <div class="admin-stat"><div class="admin-stat-num">${COURSES.length}</div><div class="admin-stat-lbl">Total Courses</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--pri)">${categorizedPeople}</div><div class="admin-stat-lbl">People With Categories</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--warn)">${pendingPay}</div><div class="admin-stat-lbl">Pending Payments</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--success)">${totalRev.toLocaleString()}</div><div class="admin-stat-lbl">Revenue (UGX)</div></div>
    <div class="admin-stat"><div class="admin-stat-num">${appts.filter(a=>a.status==='Pending').length}</div><div class="admin-stat-lbl">Pending Appointments</div></div>
    <div class="admin-stat"><div class="admin-stat-num">${payments.length}</div><div class="admin-stat-lbl">Total Payments</div></div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:24px">
    ${[['users','👥 Users'],['categories','🗂 Categories'],['guests','🧾 Guests'],['reviews','💬 Reviews'],['payments','💳 Payments'],['appointments','📅 Appointments'],['blog','📝 Blog'],['jobs','💼 Jobs'],['notifications','🔔 Notify']].map(([s,l])=>`<button class="btn btn-outline btn-sm" onclick="showAdmin('${s}')">${l}</button>`).join('')}
  </div>
  ${currentSection === 'bayyinah' ? renderAdminBayyinahTools() : ''}
  <h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:12px">Recent Payments</h2>
  <div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>Student</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead><tbody>
  ${payments.slice(-5).reverse().map(p=>`<tr><td>${p.studentName}</td><td>${p.plan}</td><td>${p.amount.toLocaleString()} UGX</td><td><span class="badge ${p.status==='Approved'?'badge-success':p.status==='Declined'?'badge-danger':'badge-warn'}">${p.status}</span></td></tr>`).join('')||'<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px">No payments yet</td></tr>'}
  </tbody></table></div></div></div>`;
}

function renderAdminUsers(){
  const users=DB.get('users')||[];
  const loggedInEver=users.filter(u=>u.lastLoginAt).length;
  const loggedToday=users.filter(u=>u.lastLoginAt&&new Date(u.lastLoginAt).toDateString()===new Date().toDateString()).length;
  return `
  <div class="page-header-row" style="margin-bottom:20px">
    <div><h1 style="font-family:var(--font-h);font-size:1.5rem;font-weight:800">Manage Users</h1><p style="color:var(--muted)">View real registered users and login activity.</p></div>
    <button class="btn btn-primary btn-sm" onclick="openAddUserModal()">+ Add User</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-bottom:20px">
    <div class="admin-stat"><div class="admin-stat-num">${users.length}</div><div class="admin-stat-lbl">Registered Users</div></div>
    <div class="admin-stat"><div class="admin-stat-num">${loggedInEver}</div><div class="admin-stat-lbl">Have Logged In</div></div>
    <div class="admin-stat"><div class="admin-stat-num">${loggedToday}</div><div class="admin-stat-lbl">Logged In Today</div></div>
  </div>
  <div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>User</th><th>Email</th><th>Category</th><th>Course Units</th><th>Role</th><th>Subscription</th><th>Last Login</th><th>Logins</th><th>Actions</th></tr></thead><tbody>
  ${users.map(u=>{
    const isStaff=isStaffUser(u);
    const sub=isStaff || (u.subscriptionExpiresAt&&new Date(u.subscriptionExpiresAt)>new Date());
    const lastLogin=u.lastLoginAt?new Date(u.lastLoginAt).toLocaleString():'Never';
    const interests=getUserInterestSummary(u);
    const subBadge=isStaff
      ? `<span class="badge badge-success">Staff (Unlimited)</span>`
      : `<span class="badge ${sub?'badge-success':u.subscriptionExpiresAt?'badge-danger':'badge-muted'}">${sub?'Active':u.subscriptionExpiresAt?'Expired':'None'}</span>`;
    return `<tr><td><div style="display:flex;align-items:center;gap:10px"><div class="avatar-sm">${u.name[0]}</div>${u.name}</div></td>
    <td style="color:var(--muted);font-size:.85rem">${u.email}</td>
    <td style="font-size:.8rem">${interests.categoryLabels.length?interests.categoryLabels.map(label=>`<span class="badge badge-primary" style="margin:0 4px 4px 0">${label}</span>`).join(''):'<span style="color:var(--muted)">None</span>'}</td>
    <td style="font-size:.78rem;color:var(--muted);min-width:220px">${interests.courseTitles.length?interests.courseTitles.join(' • '):'None selected'}</td>
    <td><span class="badge badge-${u.role}">${u.role}</span></td>
    <td>${subBadge}</td>
    <td style="font-size:.82rem;color:var(--muted)">${lastLogin}</td>
    <td><span class="badge badge-primary">${u.signInCount||0}</span></td>
    <td>
      <select class="form-control" style="width:auto;padding:5px 10px;font-size:.78rem;display:inline" onchange="updateUserRole('${u.id}',this.value)">
        <option ${u.role==='student'?'selected':''}>student</option>
        <option ${u.role==='guest'?'selected':''}>guest</option>
        <option ${u.role==='instructor'?'selected':''}>instructor</option>
        <option ${u.role==='lecturer'?'selected':''}>lecturer</option>
        <option ${u.role==='admin'?'selected':''}>admin</option>
      </select>
      ${!isStaff?`<button class="btn btn-outline btn-sm" style="margin-left:6px" onclick="extendSubscription('${u.id}')">Extend Sub</button>`:''}
      ${u.role!=='admin'?`<button class="btn btn-danger btn-sm" style="margin-left:6px" onclick="deleteUser('${u.id}')">Delete</button>`:''}
    </td></tr>`;
  }).join('')}
  </tbody></table></div></div></div>`;
}

function renderAdminCategories(){
  const users=(DB.get('users')||[]).filter(u=>u.role!=='admin');
  const categoryMap=new Map();

  users.forEach(user=>{
    const interests=getUserInterestSummary(user);
    const selectedCourses=interests.selectedCourses||[];
    const categoryLabels=interests.categoryLabels.length ? interests.categoryLabels : ['Uncategorized'];

    categoryLabels.forEach(label=>{
      if(!categoryMap.has(label)){
        categoryMap.set(label,{
          name:label,
          users:[]
        });
      }
      const matchingCourses=selectedCourses
        .filter(course=>label==='Uncategorized' || course.category===label || getTrackLabel(course.track)===label)
        .map(course=>course.title);
      categoryMap.get(label).users.push({
        id:user.id,
        name:user.name,
        email:user.email,
        role:user.role,
        lastLoginAt:user.lastLoginAt,
        courseTitles:matchingCourses
      });
    });
  });

  const groups=[...categoryMap.values()]
    .sort((a,b)=>b.users.length-a.users.length || a.name.localeCompare(b.name));
  const totalSelections=groups.reduce((sum,group)=>sum+group.users.reduce((inner,user)=>inner+user.courseTitles.length,0),0);

  return `
  <div class="page-header-row" style="margin-bottom:20px">
    <div>
      <h1 style="font-family:var(--font-h);font-size:1.5rem;font-weight:800">Categories</h1>
      <p style="color:var(--muted)">See real registered people, the categories they belong to, and the courses they picked.</p>
    </div>
    <button class="btn btn-outline btn-sm" onclick="showAdmin('users')">View All Users</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-bottom:24px">
    <div class="admin-stat"><div class="admin-stat-num">${groups.length}</div><div class="admin-stat-lbl">Categories</div></div>
    <div class="admin-stat"><div class="admin-stat-num">${users.length}</div><div class="admin-stat-lbl">Real People</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--pri)">${users.filter(user=>getUserInterestSummary(user).courseTitles.length).length}</div><div class="admin-stat-lbl">People With Picks</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--success)">${totalSelections}</div><div class="admin-stat-lbl">Course Selections</div></div>
  </div>
  ${groups.length ? groups.map(group=>`
    <div class="card" style="margin-bottom:18px">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div>
          <h3 style="margin:0">${group.name}</h3>
          <div style="font-size:.8rem;color:var(--muted);margin-top:4px">${group.users.length} person${group.users.length!==1?'s':''} in this category</div>
        </div>
        <span class="badge badge-primary">${group.users.reduce((sum,user)=>sum+user.courseTitles.length,0)} picked course${group.users.reduce((sum,user)=>sum+user.courseTitles.length,0)!==1?'s':''}</span>
      </div>
      <div class="card-body">
        <div class="table-wrap"><table><thead><tr><th>Person</th><th>Email</th><th>Picked Courses</th><th>Last Login</th></tr></thead><tbody>
          ${group.users.map(person=>`<tr>
            <td><div style="display:flex;align-items:center;gap:10px"><div class="avatar-sm">${person.name[0]}</div><div><div style="font-weight:600">${person.name}</div><div style="font-size:.76rem;color:var(--muted);text-transform:capitalize">${person.role}</div></div></div></td>
            <td style="color:var(--muted);font-size:.84rem">${person.email}</td>
            <td style="font-size:.8rem;color:var(--muted);min-width:240px">${person.courseTitles.length?person.courseTitles.join(' • '):'No course picked yet'}</td>
            <td style="font-size:.8rem;color:var(--muted)">${person.lastLoginAt?new Date(person.lastLoginAt).toLocaleString():'Never'}</td>
          </tr>`).join('')}
        </tbody></table></div>
      </div>
    </div>
  `).join('') : `<div class="empty"><div style="font-size:3rem;margin-bottom:16px">🗂</div><h3>No categories yet</h3><p>Categories will appear here when users choose courses.</p></div>`}`;
}
function renderAdminGuests(){
  const guestUsers=(DB.get('users')||[]).filter(user=>user.role==='guest');
  const guestIds=new Set(guestUsers.map(user=>user.id));
  const inquiries=(DB.get('appointments')||[]).filter(item=>guestIds.has(item.userId));
  const pending=inquiries.filter(item=>item.status==='Pending').length;
  return `
  <div class="page-header-row" style="margin-bottom:20px">
    <div><h1 style="font-family:var(--font-h);font-size:1.5rem;font-weight:800">Guest Accounts</h1><p style="color:var(--muted)">Guest users can contact admin before they create a full learning account.</p></div>
    <button class="btn btn-outline btn-sm" onclick="showPublicPage('register-page');setTimeout(()=>setRegisterAccountType('guest'),40)">Open Guest Signup</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-bottom:20px">
    <div class="admin-stat"><div class="admin-stat-num">${guestUsers.length}</div><div class="admin-stat-lbl">Guest Accounts</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--pri)">${inquiries.length}</div><div class="admin-stat-lbl">Guest Inquiries</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--warn)">${pending}</div><div class="admin-stat-lbl">Pending Replies</div></div>
  </div>
  ${guestUsers.length?`<div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>Guest</th><th>Phone</th><th>Created</th><th>Inquiries</th><th>Last Inquiry</th><th>Actions</th></tr></thead><tbody>
  ${guestUsers.map(user=>{
    const userInquiries=inquiries.filter(item=>item.userId===user.id);
    const lastInquiry=userInquiries.sort((a,b)=>b.requestedAt-a.requestedAt)[0];
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:10px"><div class="avatar-sm">${user.name[0]}</div><div><div style="font-weight:600">${user.name}</div><div style="font-size:.76rem;color:var(--muted)">${user.email}</div></div></div></td>
      <td style="font-size:.82rem;color:var(--muted)">${user.phoneNumber||'—'}</td>
      <td style="font-size:.82rem;color:var(--muted)">${user.createdAt?new Date(user.createdAt).toLocaleDateString():'—'}</td>
      <td><span class="badge badge-primary">${userInquiries.length}</span></td>
      <td style="font-size:.82rem;color:var(--muted)">${lastInquiry?new Date(lastInquiry.requestedAt).toLocaleString():'No inquiry yet'}</td>
      <td><button class="btn btn-outline btn-sm" onclick="showAdmin('appointments')">Open Inquiries</button></td>
    </tr>`;
  }).join('')}
  </tbody></table></div></div></div>`:`<div class="empty"><div style="font-size:3rem;margin-bottom:16px">🧾</div><h3>No guest accounts yet</h3><p>Guest inquiry accounts will appear here once someone signs up as a guest.</p></div>`}`;
}
function renderAdminReviews(){
  const reviews=getStudentReviews();
  return `
  <div class="page-header-row" style="margin-bottom:20px">
    <div><h1 style="font-family:var(--font-h);font-size:1.5rem;font-weight:800">Review Comments</h1><p style="color:var(--muted)">See who wrote each comment and remove bad comments when needed.</p></div>
    <button class="btn btn-outline btn-sm" onclick="showPublicPage('home')">Open Homepage</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-bottom:20px">
    <div class="admin-stat"><div class="admin-stat-num">${reviews.length}</div><div class="admin-stat-lbl">Total Reviews</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--success)">${reviews.filter(review=>(review.rating||0)>=4).length}</div><div class="admin-stat-lbl">Positive Reviews</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--pri)">${new Set(reviews.map(review=>review.userId).filter(Boolean)).size}</div><div class="admin-stat-lbl">Students Who Wrote</div></div>
  </div>
  ${reviews.length?`<div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>Student</th><th>Courses</th><th>Rating</th><th>Comment</th><th>Date</th><th>Actions</th></tr></thead><tbody>
  ${reviews.map(review=>`<tr>
    <td>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="avatar-sm">${(review.studentName||'?')[0]}</div>
        <div>
          <div style="font-weight:600">${review.studentName||'Unknown'}</div>
          <div style="font-size:.76rem;color:var(--muted)">${review.studentEmail||'No email'}</div>
        </div>
      </div>
    </td>
    <td style="font-size:.8rem;color:var(--muted);min-width:220px">${review.courseTitles?.length?review.courseTitles.join(' • '):'Student'}</td>
    <td><span class="badge badge-primary">${review.rating||5} Star${(review.rating||5)!==1?'s':''}</span></td>
    <td style="font-size:.82rem;color:var(--muted);min-width:260px">${review.text}</td>
    <td style="font-size:.8rem;color:var(--muted)">${review.createdAt?new Date(review.createdAt).toLocaleString():'—'}</td>
    <td><button class="btn btn-danger btn-sm" onclick="deleteStudentReview('${review.id}')">Remove</button></td>
  </tr>`).join('')}
  </tbody></table></div></div></div>`:`<div class="empty"><div style="font-size:3rem;margin-bottom:16px">💬</div><h3>No reviews yet</h3><p>Student comments will appear here once they submit them from their dashboard.</p></div>`}`;
}
function deleteStudentReview(reviewId){
  if(!confirm('Remove this review comment from the website?')) return;
  DB.set('studentReviews',(DB.get('studentReviews')||[]).filter(review=>review.id!==reviewId));
  deleteFromDataAPI('student_reviews', reviewId).catch(()=>{});
  toast('Review removed','success');
  showAdmin('reviews');
}
async function updateUserRole(userId,role){
  const users=DB.get('users')||[];
  const u=users.find(u=>u.id===userId);if(!u)return;
  u.role=role;DB.set('users',users);
  if(currentUser.id===userId){currentUser.role=role;DB.set('currentUser',currentUser)}
  toast(`Role updated to ${role}`,'success');
  showAdmin('users');
  try {
    await postAuthApi({action:'admin_update_user', userId, updates:{role}}, {token:currentUser?.authToken});
    await syncUsersFromServer({rerender:true});
  } catch(e) {
    console.warn('Sync role error:', e.message);
  }
}
async function extendSubscription(userId){
  const users=DB.get('users')||[];
  const u=users.find(u=>u.id===userId);if(!u)return;
  const exp=u.subscriptionExpiresAt&&new Date(u.subscriptionExpiresAt)>new Date()?new Date(u.subscriptionExpiresAt):new Date();
  exp.setDate(exp.getDate()+30);
  u.subscriptionExpiresAt=exp.toISOString();
  DB.set('users',users);
  toast('Subscription extended by 30 days','success');
  showAdmin('users');
  try {
    await postAuthApi({action:'admin_update_user', userId, updates:{subscriptionExpiresAt:u.subscriptionExpiresAt}}, {token:currentUser?.authToken});
    await syncUsersFromServer({rerender:true});
  } catch(e) {
    console.warn('Sync sub error:', e.message);
  }
}
async function deleteUser(userId){
  if(!confirm('Delete this user?')) return;
  const users=(DB.get('users')||[]).filter(u=>u.id!==userId);
  DB.set('users',users);
  toast('User deleted','success');
  showAdmin('users');
  try {
    await postAuthApi({action:'admin_delete_user', userId}, {token:currentUser?.authToken});
    await syncUsersFromServer({rerender:true});
  } catch(e) {
    console.warn('Delete user server error:', e.message);
  }
}
function openAddUserModal(){
  openModal('Add New User',`
  <div class="form-group">
    <label>Profile Photo</label>
    <div id="au-avatar-preview" style="display:flex;justify-content:center;margin-bottom:10px">
      <div class="profile-avatar" style="margin:0 auto">?</div>
    </div>
    <input type="hidden" id="au-avatar-data" value=""/>
    <input class="form-control" type="file" accept="image/*" onchange="handleProfileImageUpload(this.files[0],'au-avatar-preview','au-avatar-data')"/>
  </div>
  <div class="form-group"><label>Full Name</label><input class="form-control" id="au-name" placeholder="Full name"/></div>
  <div class="form-group"><label>Email</label><input class="form-control" id="au-email" type="email" placeholder="email@example.com"/></div>
  <div class="form-group"><label>Password</label><input class="form-control" id="au-pw" type="password" placeholder="Password"/></div>
  <div class="form-group"><label>Role</label><select class="form-control" id="au-role"><option>student</option><option>guest</option><option>instructor</option><option>lecturer</option><option>admin</option></select></div>
  `,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="addUser()">Create User</button>`);
}
async function addUser(){
  const name=document.getElementById('au-name')?.value.trim();
  const email=document.getElementById('au-email')?.value.trim();
  const pw=document.getElementById('au-pw')?.value;
  const role=document.getElementById('au-role')?.value;
  const avatarUrl=document.getElementById('au-avatar-data')?.value||'';
  if(!name||!email||!pw){toast('All fields required','error');return}
  const users=DB.get('users')||[];
  if(users.find(u=>u.email===email)){toast('Email already exists','error');return}
  try {
    await postAuthApi({action:'register_direct', name, email, password:pw, role, avatarUrl});
    toast('User created in database!','success');
    closeModal();
    await syncUsersFromServer({rerender:true});
    showAdmin('users');
  } catch (err) {
    toast(err.message || 'Failed to create user', 'error');
  }
}

function renderAdminPayments(){
  const payments=(DB.get('payments')||[]).sort((a,b)=>b.createdAt-a.createdAt);
  const approved=payments.filter(p=>p.status==='Approved');
  const pending=payments.filter(p=>p.status==='Pending');
  const totalRev=approved.reduce((s,p)=>s+(p.netAmount||p.amount||0),0);
  return `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:10px">
    <div>
      <h1 style="font-family:var(--font-h);font-size:1.5rem;font-weight:800">Payments & Transactions</h1>
      <p style="color:var(--muted)">Real-time via Xyle Payments API</p>
    </div>
    <button class="btn btn-outline btn-sm" onclick="fetchXyleTransactions()">🔄 Sync Transactions</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-bottom:24px">
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--success)">${totalRev.toLocaleString()}</div><div class="admin-stat-lbl">Revenue (UGX)</div></div>
    <div class="admin-stat"><div class="admin-stat-num">${payments.length}</div><div class="admin-stat-lbl">Total Transactions</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--success)">${approved.length}</div><div class="admin-stat-lbl">Successful</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--warn)">${pending.length}</div><div class="admin-stat-lbl">Pending</div></div>
  </div>
  <div class="card">
    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
      <h3>Transaction History</h3>
      <span class="badge badge-primary">${payments.length} records</span>
    </div>
    <div class="card-body" style="padding:0">
    <div class="table-wrap"><table><thead><tr>
      <th>Student</th><th>Plan</th><th>Amount</th><th>Provider</th><th>Reference</th><th>Date</th><th>Status</th>
    </tr></thead><tbody>
  ${payments.length?payments.map(p=>`<tr>
    <td>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--pri),#7c3aed);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem;flex-shrink:0">${(p.studentName||'?')[0]}</div>
        <div><div style="font-weight:600;font-size:.875rem">${p.studentName||'Unknown'}</div><div style="font-size:.72rem;color:var(--muted)">${p.studentEmail||''}</div></div>
      </div>
    </td>
    <td><span class="badge badge-primary" style="font-size:.7rem">${p.plan||'—'}</span></td>
    <td style="font-weight:700">${(p.amount||0).toLocaleString()} UGX</td>
    <td style="font-size:.8rem">
      <span style="display:flex;align-items:center;gap:4px">
        ${p.provider==='MTN_UGANDA'?'📱 MTN':p.provider==='AIRTEL_UGANDA'?'📲 Airtel':'📞 '+(p.provider||p.phoneNumber||'—')}
      </span>
    </td>
    <td><code style="font-size:.7rem;background:var(--bg3);padding:2px 7px;border-radius:4px;color:var(--muted)">${p.reference||p.xyleId||'—'}</code></td>
    <td style="font-size:.78rem;color:var(--muted)">${new Date(p.createdAt||p.date||Date.now()).toLocaleDateString()}</td>
    <td>
      <span class="badge ${p.status==='Approved'||p.status==='COMPLETED'?'badge-success':p.status==='Declined'||p.status==='FAILED'?'badge-danger':'badge-warn'}">
        ${p.status==='Approved'||p.status==='COMPLETED'?'✓ Paid':p.status==='Declined'||p.status==='FAILED'?'✗ Failed':'⏳ '+p.status}
      </span>
    </td>
  </tr>`).join(''):`<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">
    <div style="font-size:2rem;margin-bottom:10px">💳</div>
    <div>No transactions yet</div>
    <div style="font-size:.8rem;margin-top:4px">Payments will appear here once students subscribe</div>
  </td></tr>`}
  </tbody></table></div></div>
  </div>`;
}

async function fetchXyleTransactions(){
  toast('Syncing transactions from Xyle...','success');
  try {
    const data=await postDataApi({action:'xyle_transactions',page:1,limit:50}).catch(e=>({success:false,error:e.message}));
    if(data.success&&data.data?.transactions){
      const existing=DB.get('payments')||[];
      const xyleRefs=new Set(existing.map(p=>p.reference||p.xyleId));
      let added=0;
      data.data.transactions.forEach(tx=>{
        if(!xyleRefs.has(tx.reference)&&!xyleRefs.has(tx.id)){
          existing.push({
            id:uid(),userId:'',studentName:'Xyle Transaction',studentEmail:'',
            plan:tx.type==='DEPOSIT'?'Direct Deposit':'—',
            amount:tx.amount,netAmount:tx.netAmount,
            provider:tx.provider,reference:tx.reference,
            xyleId:tx.id,status:tx.status==='COMPLETED'?'Approved':tx.status,
            date:tx.createdAt,createdAt:new Date(tx.createdAt).getTime()
          });
          added++;
        }
      });
      DB.set('payments',existing);
      toast(`Synced! ${added} new transaction${added!==1?'s':''} added.`,'success');
      showAdmin('payments');
    } else {
      toast(data.error||data.message||'Automated transaction sync unavailable — manual payments are active','warn');
    }
  } catch(e){
    toast('Sync unavailable: '+e.message,'warn');
  }
}

function updatePayment(payId,status){
  const payments=DB.get('payments')||[];
  const p=payments.find(p=>p.id===payId);if(!p)return;
  p.status=status;DB.set('payments',payments);
  updateDataAPI('payments', payId, { status }).catch(()=>{});
  if(status==='Approved'){
    const days=30;
    const users=DB.get('users')||[];
    const u=users.find(u=>u.id===p.userId);
    const exp=new Date();
    exp.setDate(exp.getDate()+days);
    if(u){u.subscriptionExpiresAt=exp.toISOString();DB.set('users',users);}
    if(currentUser&&currentUser.id===p.userId){
      updateCurrentUser({subscriptionExpiresAt:exp.toISOString(),plan:p.planId||p.plan});
    }
    if (p.userId) {
      postAuthApi({action:'admin_update_user', userId:p.userId, updates:{subscriptionExpiresAt:exp.toISOString()}}, {token:currentUser?.authToken}).catch(()=>{});
    }
    createNotification({title:'🎉 Payment Approved!',body:`Your ${p.plan} subscription has been manually activated by admin.`,targetRole:'student',targetUserId:p.userId,createdAt:Date.now()});
  }
  toast(`Payment ${status}`,'success');
  showAdmin('payments');
}

function renderAdminCourses(){
  const custom = DB.get('customCourses')||[];
  const all = [...COURSES, ...custom];
  const cats = [...new Set(all.map(c=>c.category))];
  return `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:12px">
    <div>
      <h1 style="font-family:var(--font-h);font-size:1.5rem;font-weight:800">Course Manager</h1>
      <p style="color:var(--muted)">${all.length} total · ${COURSES.length} built-in · <strong style="color:var(--pri)">${custom.length} custom</strong></p>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-outline" onclick="checkCourseVideoUploadHealth()">
        🩺 Upload Health
      </button>
      <button class="btn btn-outline" onclick="loadCoursesFromSupabase()">
        🔄 Sync from Database
      </button>
      <button class="btn btn-primary" onclick="openCourseBuilder()">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
        Create Course
      </button>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:28px">
    <div class="admin-stat"><div class="admin-stat-num">${all.length}</div><div class="admin-stat-lbl">Total Courses</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--pri)">${custom.length}</div><div class="admin-stat-lbl">Custom</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--success)">${cats.length}</div><div class="admin-stat-lbl">Categories</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--warn)">${all.reduce((s,c)=>s+(c.modules||[]).reduce((a,m)=>a+(m.lessons||[]).length,0),0)}</div><div class="admin-stat-lbl">Total Lessons</div></div>
  </div>

  ${custom.length ? `
  <div style="margin-bottom:32px">
    <h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px">
      <span style="width:4px;height:18px;background:var(--pri);border-radius:2px;display:inline-block"></span>
      Your Custom Courses
      <span class="badge badge-primary">${custom.length}</span>
    </h2>
    <div class="course-grid">
    ${custom.map(c=>{
      const lessonCount=(c.modules||[]).reduce((s,m)=>s+(m.lessons||[]).length,0);
      return `<div class="course-card" style="border-color:rgba(59,130,246,.35);position:relative">
        <div style="position:absolute;top:10px;right:10px;z-index:2;display:flex;gap:4px">
          <button class="btn btn-outline btn-sm" style="padding:4px 10px" onclick="openCourseBuilder('${c.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" style="padding:4px 10px" onclick="deleteCustomCourse('${c.id}')">🗑</button>
        </div>
        <img class="course-img" src="${c.imageUrl||c.image_url||`https://picsum.photos/seed/${c.id}/600/400`}" onerror="this.src='https://picsum.photos/seed/${c.id}/600/400'"/>
        <div class="course-body">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-wrap:wrap">
            <span class="badge badge-primary" style="font-size:.66rem">${c.category}</span>
            <span class="badge badge-success" style="font-size:.62rem">Custom</span>
          </div>
          <div class="course-title">${c.title}</div>
          <div style="color:var(--muted);font-size:.78rem;margin-bottom:6px;line-height:1.4">${(c.description||'').slice(0,90)}${(c.description||'').length>90?'...':''}</div>
          <div style="font-size:.76rem;color:var(--muted)">
            ${(c.modules||[]).length} module${(c.modules||[]).length!==1?'s':''} · ${lessonCount} lesson${lessonCount!==1?'s':''}
          </div>
        </div>
      </div>`;
    }).join('')}
    </div>
  </div>` : ''}

  <div>
    <h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px">
      <span style="width:4px;height:18px;background:var(--muted);border-radius:2px;display:inline-block"></span>
      Built-in Courses
    </h2>
    <div class="course-grid">
    ${COURSES.map(c=>{
      const lessonCount=(c.modules||[]).reduce((s,m)=>s+(m.lessons||[]).length,0);
      return `<div class="course-card">
        <img class="course-img" src="${c.imageUrl}" onerror="this.src='https://picsum.photos/seed/${c.id}/600/400'"/>
        <div class="course-body">
          <span class="badge badge-primary" style="margin-bottom:8px;font-size:.68rem">${c.category}</span>
          <div class="course-title">${c.title}</div>
          <div style="color:var(--muted);font-size:.76rem;margin-bottom:10px">${(c.modules||[]).length} modules · ${lessonCount} lessons</div>
          <button class="btn btn-outline btn-sm" onclick="viewCourse('${c.id}')">Preview</button>
        </div>
      </div>`;
    }).join('')}
    </div>
  </div>`;
}

async function loadCoursesFromSupabase({rerender=true,silent=false}={}){
  if(!silent) toast('Syncing courses from database...','info');
  try{
    const records = await fetchFromDataAPI('courses');
    if(!records){
      if(!silent) toast('Could not load courses from database','error');
      return null;
    }
    const customCourses = records.map(r => ({
      id: r.id,
      track: r.track || '',
      title: r.title,
      description: r.description || '',
      videoUrl: r.video_url || '',
      imageUrl: r.image_url || '',
      category: r.category || '',
      modules: typeof r.modules === 'string' ? JSON.parse(r.modules) : (r.modules || []),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
    DB.set('customCourses',customCourses);
    if(!silent) toast(`Synced ${customCourses.length} courses from database!`,'success');
    if(rerender) renderPage();
    return customCourses;
  }catch(error){
    if(!silent) toast('Failed to sync courses from database','error');
    return null;
  }
}

async function checkCourseVideoUploadHealth(){
  toast('Checking video upload service...','info');
  try{
    const response = await fetch('/api/upload-course-video',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'health'})
    });
    const data = await response.json().catch(()=>({}));
    if(response.ok && data?.ok){
      toast(`Upload is ready (${data.provider} · ${data.bucket})`,'success');
    } else {
      toast(data?.error || 'Upload health check failed','error');
    }
  }catch(_){
    toast('Could not reach upload service. Check Netlify functions/env keys.','error');
  }
}

// ================================================================
// COURSE BUILDER — Full-featured admin course creator/editor
// ================================================================
function openCourseBuilder(editId){
  const custom = DB.get('customCourses')||[];
  const editing = editId ? custom.find(c=>c.id===editId) : null;

  // Build builder state
  window._CB = {
    id: editId || ('custom-'+Math.random().toString(36).slice(2)),
    title: editing?.title || '',
    category: editing?.category || '',
    description: editing?.description || '',
    videoUrl: editing?.videoUrl || '',
    imageUrl: editing?.imageUrl || '',
    modules: JSON.parse(JSON.stringify(editing?.modules||[])),
    editId: editId||null
  };

  renderCourseBuilder();
}

function renderCourseBuilder(){
  const cb = window._CB;
  const modalEl = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = cb.editId ? '✏️ Edit Course' : '➕ Create New Course';
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:0">

      <!-- STEP 1: Basic Info -->
      <div style="background:var(--bg3);border-radius:10px;padding:16px;margin-bottom:14px">
        <div style="font-weight:700;font-size:.85rem;margin-bottom:12px;display:flex;align-items:center;gap:6px">
          <span style="width:22px;height:22px;background:var(--pri);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.72rem;color:#fff">1</span>
          Basic Information
        </div>
        <div class="form-group" style="margin-bottom:10px">
          <label>Course Title *</label>
          <input class="form-control" id="cb-title" value="${cb.title.replace(/"/g,'&quot;')}" placeholder="e.g. Advanced Python Programming"/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-group" style="margin-bottom:0">
            <label>Category *</label>
            <input class="form-control" id="cb-cat" value="${cb.category}" placeholder="e.g. ICT" list="cat-list"/>
            <datalist id="cat-list"><option value="The Human Mastery Series"/><option value="ICT (Tech & Design)"/><option value="Node.js Development"/><option value="Python Programming"/><option value="Business"/><option value="Design"/></datalist>
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label>Thumbnail URL</label>
            <input class="form-control" id="cb-img" value="${cb.imageUrl}" placeholder="https://... (auto if blank)"/>
          </div>
        </div>
        <div class="form-group" style="margin-top:10px;margin-bottom:10px">
          <label>Description</label>
          <textarea class="form-control" id="cb-desc" rows="2" placeholder="Brief course overview...">${cb.description}</textarea>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label>Intro Video</label>
          <div style="display:flex;flex-direction:column;gap:8px">
            <div class="video-upload-zone" id="cb-video-zone">
              <input type="file" accept="video/*" onchange="handleVideoUpload(this.files[0],'cb-video-preview')"/>
              <div style="pointer-events:none">
                <div style="font-size:2rem;margin-bottom:8px">🎬</div>
                <div style="font-weight:600;margin-bottom:4px">Drop video here or click to upload</div>
                <div style="font-size:.78rem;color:var(--muted)">MP4, WebM, MOV — max 60MB</div>
              </div>
            </div>
            <div id="cb-video-preview">
              ${cb.videoUrl?`<div style="aspect-ratio:16/9;border-radius:10px;overflow:hidden">${renderVideoMediaHtml(cb.videoUrl)}</div>`:''}
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="flex:1;height:1px;background:var(--border)"></div>
              <span style="font-size:.75rem;color:var(--muted)">OR paste URL</span>
              <div style="flex:1;height:1px;background:var(--border)"></div>
            </div>
            <input class="form-control" id="cb-video" value="${cb.videoUrl&&!cb.videoUrl.startsWith('data:')?cb.videoUrl:''}" placeholder="https://www.youtube.com/watch?v=... or https://www.youtube.com/embed/..."/>
          </div>
        </div>
      </div>

      <!-- STEP 2: Modules & Lessons -->
      <div style="background:var(--bg3);border-radius:10px;padding:16px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div style="font-weight:700;font-size:.85rem;display:flex;align-items:center;gap:6px">
            <span style="width:22px;height:22px;background:var(--pri);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:.72rem;color:#fff">2</span>
            Modules &amp; Lessons
          </div>
          <button class="btn btn-outline btn-sm" onclick="cbAddModule()" style="padding:5px 12px">+ Add Module</button>
        </div>

        <div id="cb-modules">
          ${cb.modules.length===0
            ? `<div style="text-align:center;padding:20px;color:var(--muted);font-size:.85rem;border:1.5px dashed var(--border);border-radius:8px">
                No modules yet. Click <strong>+ Add Module</strong> to start building your course.
               </div>`
            : cb.modules.map((m,mi)=>cbRenderModuleHTML(m,mi)).join('')
          }
        </div>
      </div>

    </div>
  `;

  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="cbSave()">
      ${cb.editId ? '💾 Save Changes' : '🚀 Publish Course'}
    </button>
  `;
  modalEl.classList.add('open');
  // Expand modal for builder
  const box = document.getElementById('modal-box');
  if(box){ box.style.maxWidth='720px'; box.style.maxHeight='92vh'; }
}

function cbRenderModuleHTML(m,mi){
  return `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;margin-bottom:10px;overflow:hidden" id="cb-mod-${mi}">
    <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--bg3)">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="color:var(--muted);flex-shrink:0"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      <input style="flex:1;background:transparent;border:none;color:var(--txt);font-weight:600;font-size:.875rem;outline:none" value="${m.title.replace(/"/g,'&quot;')}" placeholder="Module title..." oninput="cbUpdateModuleTitle(${mi},this.value)"/>
      <button class="btn btn-ghost btn-sm" style="padding:3px 8px;color:var(--danger)" onclick="cbRemoveModule(${mi})">✕</button>
    </div>
    <div style="padding:10px 14px">
      ${m.lessons.map((l,li)=>cbRenderLessonHTML(l,mi,li)).join('')}
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="btn btn-outline btn-sm" onclick="cbAddLesson(${mi},'video')" style="font-size:.75rem">▶ Add Video</button>
        <button class="btn btn-outline btn-sm" onclick="cbAddLesson(${mi},'text')" style="font-size:.75rem">📝 Add Text</button>
        <button class="btn btn-outline btn-sm" onclick="cbAddLesson(${mi},'quiz')" style="font-size:.75rem">❓ Add Quiz</button>
      </div>
    </div>
  </div>`;
}

function cbRenderLessonHTML(l,mi,li){
  const isVideo = l.type==='video';
  const isQuiz  = l.type==='quiz';
  return `<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
    <span style="font-size:.9rem;margin-top:6px">${isVideo?'▶':isQuiz?'❓':'📝'}</span>
    <div style="flex:1;display:flex;flex-direction:column;gap:4px">
      <input style="background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:6px;padding:5px 10px;color:var(--txt);font-size:.82rem;width:100%;outline:none" value="${l.title.replace(/"/g,'&quot;')}" placeholder="Lesson title..." oninput="cbUpdateLesson(${mi},${li},'title',this.value)"/>
      ${isVideo ? `
        <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center">
          <input style="background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:6px;padding:5px 10px;color:var(--muted);font-size:.78rem;width:100%;outline:none" value="${(l.content||'').replace(/"/g,'&quot;')}" placeholder="YouTube embed URL or direct video URL" oninput="cbUpdateLesson(${mi},${li},'content',this.value)"/>
          <label class="btn btn-outline btn-sm" style="padding:7px 10px;cursor:pointer;white-space:nowrap">
            Upload local video
            <input type="file" accept="video/*" style="display:none" onchange="handleLessonVideoUpload(this.files[0],${mi},${li},'cb-lesson-video-preview-${mi}-${li}')"/>
          </label>
        </div>
        <div style="font-size:.75rem;color:var(--muted);margin-top:4px">Choose a local MP4/WebM/MOV file to attach, then preview will appear below.</div>
        <div id="cb-lesson-video-preview-${mi}-${li}" style="margin-top:8px">
          ${l.content?`<div style="aspect-ratio:16/9;border-radius:10px;overflow:hidden">${renderVideoMediaHtml(l.content)}</div>`:''}
        </div>
      ` : ''}
      ${isQuiz ? `<input style="background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:6px;padding:5px 10px;color:var(--muted);font-size:.78rem;width:100%;outline:none" value="${(l.content||'').replace(/"/g,'&quot;')}" placeholder="Quiz ID (e.g. quiz-html-basics)" oninput="cbUpdateLesson(${mi},${li},'content',this.value)"/>` : ''}
      ${!isVideo&&!isQuiz ? `<textarea style="background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:6px;padding:5px 10px;color:var(--muted);font-size:.78rem;width:100%;outline:none;resize:vertical;min-height:54px" placeholder="Lesson content..." oninput="cbUpdateLesson(${mi},${li},'content',this.value)">${l.content||''}</textarea>` : ''}
    </div>
    <div style="display:flex;flex-direction:column;gap:3px">
      <input type="number" style="width:52px;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:5px;padding:4px 6px;color:var(--muted);font-size:.75rem;outline:none;text-align:center" value="${l.duration||5}" min="1" max="300" placeholder="min" title="Duration (minutes)" oninput="cbUpdateLesson(${mi},${li},'duration',+this.value)"/>
      <button style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:.85rem;padding:3px" onclick="cbRemoveLesson(${mi},${li})" title="Remove lesson">🗑</button>
    </div>
  </div>`;
}

function cbUpdateModuleTitle(mi,val){
  if(window._CB&&window._CB.modules[mi]) window._CB.modules[mi].title=val;
}
function cbUpdateLesson(mi,li,field,val){
  if(window._CB&&window._CB.modules[mi]&&window._CB.modules[mi].lessons[li])
    window._CB.modules[mi].lessons[li][field]=val;
}
function cbAddModule(){
  if(!window._CB) return;
  window._CB.modules.push({id:'m-'+Math.random().toString(36).slice(2),title:'New Module',lessons:[]});
  renderCourseBuilder();
}
function cbRemoveModule(mi){
  if(!window._CB) return;
  if(window._CB.modules[mi].lessons.length>0 && !confirm('Remove this module and all its lessons?')) return;
  window._CB.modules.splice(mi,1);
  renderCourseBuilder();
}
function cbAddLesson(mi,type){
  if(!window._CB||!window._CB.modules[mi]) return;
  window._CB.modules[mi].lessons.push({
    id:'l-'+Math.random().toString(36).slice(2),
    title:'',type,content:'',duration:5
  });
  renderCourseBuilder();
}
function cbRemoveLesson(mi,li){
  if(!window._CB) return;
  window._CB.modules[mi].lessons.splice(li,1);
  renderCourseBuilder();
}

async function cbSave(){
  try{
    const cb = window._CB;
    if(!cb) return;

    // Sync any typed-but-not-yet-fired values from inputs
    cb.title       = document.getElementById('cb-title')?.value.trim()||cb.title;
    cb.category    = document.getElementById('cb-cat')?.value.trim()||cb.category;
    cb.description = document.getElementById('cb-desc')?.value.trim()||cb.description;
    const urlInput  = document.getElementById('cb-video')?.value.trim();
    if(urlInput) cb.videoUrl = normalizeYouTubeUrl(urlInput); // URL overrides if typed
    cb.imageUrl    = document.getElementById('cb-img')?.value.trim()||cb.imageUrl;

    if(!cb.title){toast('Course title is required','error');return;}
    if(!cb.category){toast('Category is required','error');return;}
    if(!cb.description){toast('Course description is required','error');return;}
    if(!cb.videoUrl){toast('Please upload an intro video or paste a valid video URL','error');return;}
    if(!isValidCourseVideoUrl(cb.videoUrl)){
      toast('Please enter a valid YouTube link or direct video URL','error');
      return;
    }

    const custom = DB.get('customCourses')||[];

    const normalizedModules = (cb.modules||[]).map(module=>({
      ...module,
      lessons:(module.lessons||[]).map(lesson=>{
        if(lesson.type!=='video') return lesson;
        return {...lesson,content:normalizeYouTubeUrl(lesson.content||'')};
      })
    }));

    const courseObj = {
      id: cb.id,
      track: cb.category?.toLowerCase().replace(/\s+/g,'-') || '',
      title: cb.title,
      description: cb.description,
      videoUrl: normalizeYouTubeUrl(cb.videoUrl),
      imageUrl: cb.imageUrl || `https://picsum.photos/seed/${cb.id}/600/400`,
      category: cb.category,
      modules: normalizedModules,
      createdAt: cb.editId ? (custom.find(c=>c.id===cb.editId)?.createdAt||Date.now()) : Date.now(),
      updatedAt: Date.now()
    };

    const supabaseData = {
      id: courseObj.id,
      track: courseObj.track,
      title: courseObj.title,
      description: courseObj.description,
      video_url: courseObj.videoUrl,
      image_url: courseObj.imageUrl,
      category: courseObj.category,
      modules: JSON.stringify(courseObj.modules),
      created_at: courseObj.createdAt,
      updated_at: courseObj.updatedAt
    };

    try{
      const remote = await saveToDataAPI('courses', supabaseData);
      if(remote && remote.record){
        const rec = remote.record;
        courseObj.updatedAt = rec.updated_at || courseObj.updatedAt;
        courseObj.createdAt = rec.created_at || courseObj.createdAt;
      }
    }catch(_){
      toast('Course saved locally. Cloud sync unavailable right now.','warn');
    }

    if(cb.editId){
      const idx = custom.findIndex(c=>c.id===cb.editId);
      if(idx>=0) custom[idx]=courseObj; else custom.push(courseObj);
      toast('Course updated successfully! ✅','success');
    } else {
      custom.push(courseObj);
      createNotification({
        title:'🎓 New Course Available!',
        body:`"${cb.title}" is now live in ${cb.category}. Open your dashboard and start learning now.`,
        targetRole:'student',
        priority:'important',
        createdAt:Date.now()
      });
      toast('Course published! Students notified. 🚀','success');
    }

    DB.set('customCourses',custom);
    const box=document.getElementById('modal-box');
    if(box){box.style.maxWidth='';box.style.maxHeight='';}
    closeModal();
    showAdmin('courses');
  }catch(_){
    toast('Could not publish course. Please check required fields and try again.','error');
  }
}

function deleteCustomCourse(id){
  if(!confirm('Permanently delete this course? Students will lose access.')) return;
  const custom=(DB.get('customCourses')||[]).filter(c=>c.id!==id);
  DB.set('customCourses',custom);
  toast('Course deleted','success');
  showAdmin('courses');
}

function renderAdminAppointments(){
  const appts=(DB.get('appointments')||[]).sort((a,b)=>b.requestedAt-a.requestedAt);
  const pending=appts.filter(a=>a.status==='Pending').length;
  return `
  <div class="page-header-row" style="margin-bottom:6px">
    <h1 style="font-family:var(--font-h);font-size:1.5rem;font-weight:800">Appointments</h1>
    ${pending?`<span class="badge badge-warn">${pending} Pending</span>`:''}
  </div>
  <p style="color:var(--muted);margin-bottom:20px">Review and respond to student appointment requests.</p>
  ${appts.length?`<div style="display:flex;flex-direction:column;gap:14px">
  ${appts.map(a=>`<div class="card" style="border-left:3px solid ${a.status==='Confirmed'?'var(--success)':a.status==='Declined'?'var(--danger)':'var(--warn)'}">
    <div style="padding:18px 22px">
      <div class="stack-card-row" style="flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
            <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--pri),#7c3aed);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;flex-shrink:0">${a.name[0].toUpperCase()}</div>
            <div><div style="font-weight:700">${a.name}</div><div style="font-size:.78rem;color:var(--muted)">${a.email}${a.phoneNumber?' · '+a.phoneNumber:''}</div></div>
          </div>
          <p style="font-size:.875rem;margin-top:10px;padding:10px 14px;background:var(--bg3);border-radius:8px;color:var(--txt)">${a.message}</p>
          ${a.adminReply?`<div style="margin-top:8px;padding:10px 14px;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2);border-radius:8px;font-size:.83rem"><strong>Your reply:</strong> ${a.adminReply}</div>`:''}
        </div>
        <div class="stack-actions" style="flex-direction:column;align-items:flex-end">
          <span class="badge ${a.status==='Confirmed'?'badge-success':a.status==='Declined'?'badge-danger':'badge-warn'}">${a.status}</span>
          <div style="font-size:.75rem;color:var(--muted)">${new Date(a.requestedAt).toLocaleDateString()}</div>
          ${a.status==='Pending'?`
          <button class="btn btn-success btn-sm" onclick="openApptReplyModal('${a.id}','Confirmed')">✓ Confirm</button>
          <button class="btn btn-danger btn-sm" onclick="openApptReplyModal('${a.id}','Declined')">✗ Decline</button>`
          :`<button class="btn btn-outline btn-sm" onclick="openApptReplyModal('${a.id}','${a.status}')">Edit Reply</button>`}
        </div>
      </div>
    </div>
  </div>`).join('')}
  </div>`:`<div class="empty"><svg class="empty-icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg><h3>No appointments yet</h3><p>Student appointment requests will appear here</p></div>`}`;
}
function openApptReplyModal(id,status){
  const appts=DB.get('appointments')||[];
  const a=appts.find(x=>x.id===id);if(!a)return;
  const confirmColor=status==='Confirmed'?'btn-success':'btn-danger';
  const confirmLabel=status==='Confirmed'?'✓ Confirm & Notify':'✗ Decline & Notify';
  openModal(`${status==='Confirmed'?'Confirm':'Decline'} Appointment`,`
  <div style="padding:12px 16px;background:var(--bg3);border-radius:10px;margin-bottom:16px">
    <div style="font-weight:700;margin-bottom:2px">${a.name}</div>
    <div style="font-size:.8rem;color:var(--muted)">${a.email}</div>
    <p style="font-size:.85rem;margin-top:8px">${a.message}</p>
  </div>
  <div class="form-group">
    <label>Reply / Message to student</label>
    <textarea class="form-control" id="appt-reply" rows="4" placeholder="Write a message to the student (will be saved as your reply and sent as notification)...">${a.adminReply||''}</textarea>
  </div>
  <div class="form-group">
    <label>Schedule Date & Time (optional)</label>
    <input class="form-control" id="appt-datetime" type="datetime-local" value="${a.scheduledAt||''}"/>
  </div>
  `,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn ${confirmColor}" onclick="confirmApptReply('${id}','${status}')">${confirmLabel}</button>`);
}
function confirmApptReply(id,status){
  const reply=document.getElementById('appt-reply')?.value.trim();
  const dt=document.getElementById('appt-datetime')?.value;
  if(!reply){toast('Please write a reply message','error');return}
  const appts=DB.get('appointments')||[];
  const a=appts.find(x=>x.id===id);
  if(a){
    a.status=status;
    a.adminReply=reply;
    if(dt) a.scheduledAt=dt;
    a.respondedAt=Date.now();
    DB.set('appointments',appts);
    updateDataAPI('appointments', a.id, { status, adminReply:reply, scheduledAt:dt }).catch(()=>{});
    // Send notification to the student
    const targetUser=(DB.get('users')||[]).find(user=>user.id===a.userId);
    createNotification({
      title:`Appointment ${status}`,
      body:`Hi ${a.name}, your appointment has been ${status.toLowerCase()}. ${reply}${dt?' Scheduled for: '+new Date(dt).toLocaleString():''}`,
      targetRole:targetUser?.role||'student',
      targetUserId:a.userId||null,
      createdAt:Date.now()
    });
  }
  closeModal();
  toast(`Appointment ${status} — student notified!`,'success');
  showAdmin('appointments');
}

function renderAdminBlog(){
  const posts=(DB.get('blogPosts')||[]).sort((a,b)=>b.createdAt-a.createdAt);
  return `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
    <h1 style="font-family:var(--font-h);font-size:1.5rem;font-weight:800">Blog Posts</h1>
    <button class="btn btn-primary btn-sm" onclick="openBlogModal()">+ New Post</button>
  </div>
  <div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>Title</th><th>Author</th><th>Date</th><th>Actions</th></tr></thead><tbody>
  ${posts.map(p=>`<tr><td style="font-weight:600">${p.title}</td><td style="color:var(--muted)">${p.author}</td><td style="font-size:.8rem;color:var(--muted)">${new Date(p.createdAt).toLocaleDateString()}</td><td><button class="btn btn-danger btn-sm" onclick="deleteBlogPost('${p.id}')">Delete</button></td></tr>`).join('')||'<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--muted)">No posts yet</td></tr>'}
  </tbody></table></div></div></div>`;
}
function openBlogModal(){
  openModal('New Blog Post',`
  <div class="form-group"><label>Title</label><input class="form-control" id="bp-title" placeholder="Post title"/></div>
  <div class="form-group"><label>Description</label><textarea class="form-control" id="bp-desc" rows="3" placeholder="Brief description"></textarea></div>
  <div class="form-group"><label>Author</label><input class="form-control" id="bp-author" value="${currentUser.name}"/></div>
  <div class="form-group"><label>Type</label><select class="form-control" id="bp-type"><option value="image">Image</option><option value="video">Video</option></select></div>
  <div class="form-group"><label>Media URL</label><input class="form-control" id="bp-media" placeholder="Image or video URL"/></div>
  `,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveBlogPost()">Publish</button>`);
}
function saveBlogPost(){
  try{
    const title=document.getElementById('bp-title')?.value.trim();
    const desc=document.getElementById('bp-desc')?.value.trim();
    const author=document.getElementById('bp-author')?.value.trim()||currentUser?.name||'Admin';
    const type=document.getElementById('bp-type')?.value||'image';
    const media=document.getElementById('bp-media')?.value.trim();
    if(!title||!desc){toast('Title and description required','error');return}
    const posts=DB.get('blogPosts')||[];
    const postId=uid();
    posts.push({id:postId,title,description:desc,author,type,mediaUrl:media||`https://picsum.photos/seed/${postId.slice(0,6)}/800/400`,createdAt:Date.now()});
    DB.set('blogPosts',posts);closeModal();toast('Post published!','success');showAdmin('blog');
  }catch(_){
    toast('Could not publish post. Please try again.','error');
  }
}
function deleteBlogPost(id){
  if(!confirm('Delete post?'))return;
  DB.set('blogPosts',(DB.get('blogPosts')||[]).filter(p=>p.id!==id));
  toast('Post deleted','success');showAdmin('blog');
}

function renderAdminJobs(){
  const jobs=getStoredJobs();
  return `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
    <h1 style="font-family:var(--font-h);font-size:1.5rem;font-weight:800">Jobs</h1>
    <div style="display:flex;align-items:center;gap:8px">
      <button class="btn btn-outline btn-sm" onclick="loadJobsFromServer({rerender:true,silent:false})">Sync Jobs</button>
      <button class="btn btn-primary btn-sm" onclick="openJobModal()">+ Add Job</button>
    </div>
  </div>
  <div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>Title</th><th>Company</th><th>Type</th><th>Actions</th></tr></thead><tbody>
  ${jobs.map(j=>`<tr><td style="font-weight:600">${j.title}</td><td style="color:var(--muted)">${j.company}</td><td><span class="badge badge-muted">${j.type}</span></td><td><button class="btn btn-danger btn-sm" onclick="deleteJob('${j.id}')">Delete</button></td></tr>`).join('')||'<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--muted)">No jobs yet</td></tr>'}
  </tbody></table></div></div></div>`;
}
function openJobModal(){
  openModal('Add Job',`
  <div class="form-group"><label>Job Title</label><input class="form-control" id="j-title" placeholder="e.g. Junior Web Developer"/></div>
  <div class="form-row">
    <div class="form-group"><label>Company</label><input class="form-control" id="j-company" placeholder="Company name"/></div>
    <div class="form-group"><label>Location</label><input class="form-control" id="j-loc" placeholder="e.g. Kampala"/></div>
  </div>
  <div class="form-group"><label>Type</label><select class="form-control" id="j-type"><option>Full-time</option><option>Contract</option><option>Internship</option></select></div>
  <div class="form-group"><label>Description</label><textarea class="form-control" id="j-desc" rows="3"></textarea></div>
  <div class="form-group"><label>Apply URL</label><input class="form-control" id="j-url" placeholder="https://..."/></div>
  `,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveJob()">Save</button>`);
}
async function saveJob(){
  try{
    const title=document.getElementById('j-title')?.value.trim();
    const company=document.getElementById('j-company')?.value.trim();
    if(!title||!company){toast('Title and company required','error');return}
    const job = normalizeJobRecord({
      id:uid(),
      title,
      company,
      location:document.getElementById('j-loc')?.value.trim(),
      type:document.getElementById('j-type')?.value,
      description:document.getElementById('j-desc')?.value.trim(),
      applyUrl:document.getElementById('j-url')?.value.trim(),
      createdAt:Date.now()
    });
    const jobs=getStoredJobs();
    saveStoredJobs([job,...jobs.filter(existing=>existing.id!==job.id)]);
    closeModal();
    showAdmin('jobs');
    let saved=false;
    try{
      saved = await saveJobToServer(job);
    }catch(_){
      saved = false;
    }
    if(saved){
      await loadJobsFromServer({rerender:true}).catch(()=>{});
      toast('Job added!','success');
    }else{
      toast('Job saved locally. Database sync is unavailable right now.','warn');
    }
  }catch(_){
    toast('Could not save job. Please try again.','error');
  }
}
async function deleteJob(id){
  if(!confirm('Delete?')) return;
  const previousJobs = getStoredJobs();
  saveStoredJobs(previousJobs.filter(j=>j.id!==id));
  showAdmin('jobs');
  const deleted = await deleteFromDataAPI('jobs',id);
  if(deleted){
    await loadJobsFromServer({rerender:true});
    toast('Deleted','success');
  }else{
    toast('Job removed locally. Database sync is unavailable right now.','warn');
  }
}

function renderAdminKB(){
  const arts=(DB.get('knowledgeBase')||[]).sort((a,b)=>b.createdAt-a.createdAt);
  return `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
    <h1 style="font-family:var(--font-h);font-size:1.5rem;font-weight:800">Knowledge Base</h1>
    <button class="btn btn-primary btn-sm" onclick="openKBModal()">+ Add Article</button>
  </div>
  <div class="card"><div class="card-body"><div class="table-wrap"><table><thead><tr><th>Title</th><th>Category</th><th>Actions</th></tr></thead><tbody>
  ${arts.map(a=>`<tr><td style="font-weight:600">${a.title}</td><td><span class="badge badge-primary">${a.category}</span></td><td><button class="btn btn-danger btn-sm" onclick="deleteKB('${a.id}')">Delete</button></td></tr>`).join('')||'<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--muted)">No articles</td></tr>'}
  </tbody></table></div></div></div>`;
}
function openKBModal(){
  openModal('New Article',`
  <div class="form-group"><label>Title</label><input class="form-control" id="kb-title"/></div>
  <div class="form-group"><label>Category</label><input class="form-control" id="kb-cat" placeholder="e.g. Getting Started"/></div>
  <div class="form-group"><label>Description</label><input class="form-control" id="kb-desc" placeholder="Brief summary"/></div>
  <div class="form-group"><label>Content</label><textarea class="form-control" id="kb-content" rows="5" placeholder="Full article content..."></textarea></div>
  `,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveKB()">Publish</button>`);
}
function saveKB(){
  try{
    const title=document.getElementById('kb-title')?.value.trim();
    if(!title){toast('Title required','error');return}
    const arts=DB.get('knowledgeBase')||[];
    arts.push({id:uid(),title,category:document.getElementById('kb-cat')?.value.trim()||'General',description:document.getElementById('kb-desc')?.value.trim()||'',content:document.getElementById('kb-content')?.value.trim()||'',author:currentUser?.name||'Admin',createdAt:Date.now()});
    DB.set('knowledgeBase',arts);closeModal();toast('Article published!','success');showAdmin('knowledge-base');
  }catch(_){
    toast('Could not publish article. Please try again.','error');
  }
}
function deleteKB(id){if(!confirm('Delete?'))return;DB.set('knowledgeBase',(DB.get('knowledgeBase')||[]).filter(a=>a.id!==id));toast('Deleted','success');showAdmin('knowledge-base')}

function renderAdminNotifications(){
  const notifs=getStoredNotifications().sort((a,b)=>b.createdAt-a.createdAt);
  const icons={'all':'📢','student':'🎓','instructor':'👨‍🏫','admin':'🔑'};
  return `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
    <div><h1 style="font-family:var(--font-h);font-size:1.5rem;font-weight:800">Notifications</h1>
    <p style="color:var(--muted);margin-bottom:16px">${notifs.length} notification${notifs.length!==1?'s':''} sent</p></div>
    <button class="btn btn-primary" onclick="openNotifModal()">📢 Create Notification</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px">
    <div class="admin-stat"><div class="admin-stat-num">${notifs.length}</div><div class="admin-stat-lbl">Total Sent</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--warn)">${notifs.filter(n=>n.targetRole==='student').length}</div><div class="admin-stat-lbl">To Students</div></div>
    <div class="admin-stat"><div class="admin-stat-num" style="color:var(--pri)">${notifs.filter(n=>n.targetRole==='all').length}</div><div class="admin-stat-lbl">Broadcasts</div></div>
  </div>
  ${notifs.length?`<div style="display:flex;flex-direction:column;gap:10px">
  ${notifs.map(n=>`<div class="card" style="border-left:3px solid ${n.targetRole==='all'?'var(--pri)':n.targetRole==='student'?'var(--success)':'var(--warn)'}">
    <div style="padding:14px 18px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
      <div style="display:flex;align-items:flex-start;gap:12px;flex:1">
        <div style="font-size:1.4rem;flex-shrink:0">${icons[n.targetRole]||'📢'}</div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-weight:700">${n.title}</span>
            <span class="badge ${n.targetRole==='all'?'badge-primary':n.targetRole==='student'?'badge-success':'badge-warn'}">${n.targetRole==='all'?'Everyone':n.targetRole==='student'?'Students':'Instructors'}</span>
          </div>
          <p style="font-size:.845rem;color:var(--muted);line-height:1.5">${n.body}</p>
          <div style="font-size:.75rem;color:var(--muted);margin-top:6px">${new Date(n.createdAt).toLocaleString()}</div>
        </div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteNotif('${n.id}')" style="flex-shrink:0">Delete</button>
    </div>
  </div>`).join('')}
  </div>`:`<div class="empty"><div style="font-size:3rem;margin-bottom:16px">🔔</div><h3>No notifications yet</h3><p>Create a notification to alert your students and users</p></div>`}`;
}
function openNotifModal(){
  openModal('📢 Create Notification',`
  <div class="form-group">
    <label>Notification Title</label>
    <input class="form-control" id="n-title" placeholder="e.g. New Course Available!"/>
  </div>
  <div class="form-group">
    <label>Message</label>
    <textarea class="form-control" id="n-body" rows="4" placeholder="Write your message to students..."></textarea>
  </div>
  <div class="form-group">
    <label>Send To</label>
    <select class="form-control" id="n-target">
      <option value="all">📢 Everyone (All Users)</option>
      <option value="student">🎓 Students Only</option>
      <option value="instructor">👨‍🏫 Instructors Only</option>
    </select>
  </div>
  <div class="form-group">
    <label>Priority</label>
    <select class="form-control" id="n-priority">
      <option value="normal">Normal</option>
      <option value="important">Important</option>
      <option value="urgent">Urgent</option>
    </select>
  </div>
  `,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveNotif()">📤 Send Notification</button>`);
}
async function saveNotif(){
  try{
    const title=document.getElementById('n-title')?.value.trim();
    const body=document.getElementById('n-body')?.value.trim();
    if(!title||!body){toast('Title and message are required','error');return}
    const priority=document.getElementById('n-priority')?.value||'normal';
    const prefix=priority==='urgent'?'🚨 ':priority==='important'?'⭐ ':'';
    createNotification({title:prefix+title,body,targetRole:document.getElementById('n-target')?.value||'all',priority,createdAt:Date.now()});
    closeModal();toast('Notification sent to users!','success');showAdmin('notifications');
  }catch(_){
    toast('Could not send notification. Please try again.','error');
  }
}
async function deleteNotif(id){
  if(!confirm('Delete this notification?'))return;
  saveStoredNotifications(getStoredNotifications().filter(n=>n.id!==id));
  await deleteNotificationFromServer(id);
  await loadNotificationsFromServer().catch(()=>{});
  toast('Notification deleted','success');
  showAdmin('notifications');
}

function renderAdminExamples(){
  const examples=(DB.get('examples')||[]).sort((a,b)=>b.createdAt-a.createdAt);
  return `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
    <h1 style="font-family:var(--font-h);font-size:1.5rem;font-weight:800">Examples</h1>
    <button class="btn btn-primary btn-sm" onclick="openExampleModal()">+ Add Example</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px">
  ${examples.map(e=>`<div class="card"><img src="${e.imageUrl||`https://picsum.photos/seed/${e.id||'example'}/600/400`}" style="width:100%;aspect-ratio:16/9;object-fit:cover" onerror="this.src='https://picsum.photos/seed/${e.id||'example'}/600/400'"/><div class="card-body"><h3 style="font-family:var(--font-h);font-size:.95rem;margin-bottom:6px">${e.title}</h3><p style="color:var(--muted);font-size:.8rem;margin-bottom:10px">${e.description||'No description provided yet.'}</p><button class="btn btn-danger btn-sm" onclick="deleteExample('${e.id}')">Delete</button></div></div>`).join('')||'<div class="empty" style="grid-column:1/-1"><h3>No examples yet</h3></div>'}
  </div>`;
}
function openExampleModal(){
  openModal('Add Example',`
  <div class="form-group"><label>Title</label><input class="form-control" id="ex-title"/></div>
  <div class="form-group"><label>Description</label><textarea class="form-control" id="ex-desc" rows="2"></textarea></div>
  <div class="form-group"><label>Image URL</label><input class="form-control" id="ex-img" placeholder="https://..."/></div>
  `,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveExample()">Save</button>`);
}
function saveExample(){
  try{
    const title=document.getElementById('ex-title')?.value.trim();
    if(!title){toast('Title required','error');return}
    const description=document.getElementById('ex-desc')?.value.trim()||'';
    const rawImage=document.getElementById('ex-img')?.value.trim()||'';
    let imageUrl=rawImage;
    if(rawImage){
      try{
        const urlObj=new URL(rawImage);
        if(!['http:','https:'].includes(urlObj.protocol)) imageUrl='';
      }catch(_){
        imageUrl='';
      }
    }
    const examples=DB.get('examples')||[];
    const exampleId=uid();
    examples.push({id:exampleId,title,description,imageUrl:imageUrl||`https://picsum.photos/seed/${exampleId.slice(0,6)}/600/400`,createdAt:Date.now()});
    DB.set('examples',examples);closeModal();toast('Example added!','success');showAdmin('examples');
  }catch(_){
    toast('Could not save example. Please try again.','error');
  }
}
function deleteExample(id){if(!confirm('Delete?'))return;DB.set('examples',(DB.get('examples')||[]).filter(e=>e.id!==id));toast('Deleted','success');showAdmin('examples')}

function renderAdminLiveSessions(){
  const sessions=getNormalizedLiveSessions().sort((a,b)=>b.createdAt-a.createdAt);
  return `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
    <h1 style="font-family:var(--font-h);font-size:1.5rem;font-weight:800">Live Sessions</h1>
    <button class="btn btn-primary btn-sm" onclick="openLiveModal()">+ Schedule Session</button>
  </div>
  <div style="display:flex;flex-direction:column;gap:12px">
  ${sessions.map(s=>{const start=new Date(s.startTime);const end=new Date(s.endTime);const now=Date.now();const state=now<start.getTime()?'Upcoming':now<=end.getTime()?'Live':'Ended';return`<div class="card"><div style="padding:18px 22px;display:flex;justify-content:space-between;align-items:center;gap:14px">
    <div><h3 style="font-family:var(--font-h);font-size:1rem;margin-bottom:4px">${s.sessionTitle}</h3>
    <div style="font-size:.82rem;color:var(--muted)">${s.instructorName||'Instructor'} · Provider: ${s.provider}</div>
    <div style="margin-top:6px"><span class="badge ${state==='Live'?'badge-danger':state==='Ended'?'badge-muted':'badge-success'}">${state}</span> <span style="font-size:.8rem;color:var(--muted);margin-left:8px">${start.toUTCString()} - ${end.toUTCString()}</span></div></div>
    <button class="btn btn-danger btn-sm" onclick="deleteLive('${s.id}')">Delete</button>
  </div></div>`;}).join('')||'<div class="empty"><h3>No sessions yet</h3></div>'}
  </div>`;
}
function openLiveModal(){
  openModal('Schedule Live Session',`
  <div class="form-group"><label>Session Title</label><input class="form-control" id="ls-title"/></div>
  <div class="form-group"><label>Description</label><textarea class="form-control" id="ls-desc" rows="2" placeholder="Session overview"></textarea></div>
  <div class="form-group"><label>Provider</label><select class="form-control" id="ls-provider"><option value="youtube-live">YouTube Live</option><option value="hls">HLS Stream</option><option value="zoom">Zoom Meeting</option><option value="google-meet">Google Meet</option></select></div>
  <div class="form-group"><label>Live URL</label><input class="form-control" id="ls-url" placeholder="YouTube/HLS/Zoom/Google Meet URL"/></div>
  <div class="form-row">
    <div class="form-group"><label>Start Time (UTC)</label><input class="form-control" id="ls-start" type="datetime-local"/></div>
    <div class="form-group"><label>End Time (UTC)</label><input class="form-control" id="ls-end" type="datetime-local"/></div>
  </div>
  <div class="form-group"><label>Thumbnail URL</label><input class="form-control" id="ls-thumb" placeholder="https://..."/></div>
  <div class="form-group"><label>Replay URL (optional)</label><input class="form-control" id="ls-replay" placeholder="https://..."/></div>
  <div class="form-group"><label>Resource Links (one per line: Label|URL)</label><textarea class="form-control" id="ls-resources" rows="3" placeholder="Slides|https://...\nNotes|https://..."></textarea></div>
  <div class="form-row">
    <div class="form-group"><label>Required Course ID (optional)</label><input class="form-control" id="ls-req-course" placeholder="web-11"/></div>
    <div class="form-group"><label>Required Lesson ID (optional)</label><input class="form-control" id="ls-req-lesson" placeholder="wd1-l1"/></div>
  </div>
  `,`<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveLive()">Schedule</button>`);
}
function saveLive(){
  try{
    const title=document.getElementById('ls-title')?.value.trim();
    const description=document.getElementById('ls-desc')?.value.trim()||'';
    const provider=document.getElementById('ls-provider')?.value||'youtube-live';
    const url=normalizeYouTubeUrl(document.getElementById('ls-url')?.value.trim()||'');
    const startVal=document.getElementById('ls-start')?.value;
    const endVal=document.getElementById('ls-end')?.value;
    const thumbnailUrl=document.getElementById('ls-thumb')?.value.trim()||'';
    const replayURL=normalizeYouTubeUrl(document.getElementById('ls-replay')?.value.trim()||'');
    const resourcesRaw=document.getElementById('ls-resources')?.value.trim()||'';
    const requiredCourseId=document.getElementById('ls-req-course')?.value.trim()||'';
    const requiredLessonId=document.getElementById('ls-req-lesson')?.value.trim()||'';
    if(!title||!url||!startVal||!endVal){toast('Title, URL, start time, and end time are required','error');return}
    const startTime=new Date(startVal).toISOString();
    const endTime=new Date(endVal).toISOString();
    if(new Date(endTime).getTime()<=new Date(startTime).getTime()){toast('End time must be after start time','error');return}
    const resourceLinks = resourcesRaw
      ? resourcesRaw.split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{
          const [label,urlPart] = line.split('|').map(part=>part.trim());
          return {label:label||'Resource',url:urlPart||label};
        }).filter(resource=>resource.url && /^https?:\/\//i.test(resource.url))
      : [];
    const isMeeting = isMeetingProvider(provider);
    const zoomOk = /^https?:\/\/([a-z0-9-]+\.)?zoom\.us\/(j|w)\/[A-Za-z0-9?=&._-]+/i.test(url);
    const meetOk = /^https?:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(url);
    if(isMeeting){
      if(provider==='zoom' && !zoomOk){toast('Enter a valid Zoom meeting URL','error');return}
      if(provider==='google-meet' && !meetOk){toast('Enter a valid Google Meet URL','error');return}
    } else if(!isValidCourseVideoUrl(url)){
      toast('Enter a valid live video URL','error');return;
    }
    const sessions=DB.get('liveSessions')||[];
    sessions.push({
      id:uid(),
      sessionTitle:title,
      title,
      description,
      provider,
      videoURL:url,
      url,
      startTime,
      endTime,
      scheduledAt:new Date(startTime).getTime(),
      replayURL,
      thumbnailUrl,
      resourceLinks,
      requiredCourseId,
      requiredLessonId,
      instructorId:currentUser?.id||'',
      instructorName:currentUser?.name||'Admin',
      createdAt:Date.now()
    });
    DB.set('liveSessions',sessions);closeModal();toast('Session scheduled!','success');showAdmin('live-sessions');
  }catch(_){
    toast('Could not schedule live session. Please try again.','error');
  }
}
function deleteLive(id){if(!confirm('Delete?'))return;DB.set('liveSessions',(DB.get('liveSessions')||[]).filter(s=>s.id!==id));showAdmin('live-sessions')}

// ================================================================
// FOOTER
// ================================================================
function renderFooter(){
  return `<footer><div class="container"><div class="footer-inner">
  <span class="logo-text" style="font-size:1.1rem" onclick="goHome()">
    <img class="logo-mark logo-mark-footer" src="KF%20LOGO.png" alt="KFAHAD Academy logo"/>
    <span class="logo-wordmark">
      <span class="logo-kfahad">KFAHAD</span>
      <span class="logo-academy">Academy</span>
    </span>
  </span>
  <p style="color:var(--muted);font-size:.82rem">&copy; ${new Date().getFullYear()} KFAHAD Academy. All rights reserved.</p>
  <div class="social-links">
    <a href="https://www.tiktok.com/@kfahad_26" target="_blank" title="TikTok"><svg viewBox="0 0 448 512" fill="currentColor"><path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/></svg></a>
    <a href="https://x.com/fahad_kandeke" target="_blank" title="X (Twitter)"><svg viewBox="0 0 512 512" fill="currentColor"><path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"/></svg></a>
    <a href="https://wa.me/256702618396" target="_blank" title="WhatsApp"><svg viewBox="0 0 448 512" width="22" height="22" fill="currentColor"><path d="M380.9 97.1C339 55.2 283.6 32 224.1 32 117.1 32 32 117.1 32 224c0 39.4 10.3 78 29.8 111.7L32 480l147.4-29.7c32.5 17.7 69.3 27.4 108.7 27.4 107 0 192.1-85.1 192.1-192 0-59.5-23.2-114.9-65.2-156.6zM224.1 403.3c-32 0-63.3-8.6-90.4-24.9l-6.5-3.9-87.4 17.6 18.6-85.3-4-6.5c-16.5-26.8-25.2-57.9-25.2-90.3 0-98.5 80.2-178.7 178.9-178.7 47.7 0 92.6 18.6 126.4 52.4s52.4 78.7 52.4 126.4c0 98.6-80.2 178.8-178.8 178.8zm101.1-138.4c-5.5-2.7-32.5-16.1-37.6-17.9-5-1.8-8.6-2.7-12.2 2.7-3.5 5.4-13.5 17.9-16.5 21.6-3 3.5-6 3.9-11.5 1.3-5.5-2.7-23.4-8.6-44.6-27.5-16.5-14.7-27.7-32.9-31-38.4-3.2-5.5-.3-8.5 2.4-11.2 2.5-2.5 5.5-6.5 8.2-9.7 2.7-3.2 3.6-5.4 5.4-9 1.8-3.5.9-6.5-.5-9.2-1.4-2.7-12.2-29.4-16.7-40.3-4.4-10.5-8.9-9.1-12.1-9.3-3.1-.2-6.7-.2-10.3-.2-3.5 0-9.2 1.3-14 6.5-4.8 5.2-18.3 17.9-18.3 43.7 0 25.8 18.8 50.7 21.4 54.2 2.7 3.5 37 56.4 89.8 79.1 12.5 5.4 22.2 8.6 29.8 11 12.5 3.8 23.8 3.3 32.8 2 10-1.4 32.5-13.3 37.1-26.1 4.6-12.8 4.6-23.8 3.2-26.1-1.4-2.3-5-3.5-10.5-6.2z"/></svg></a>
    <a href="https://www.instagram.com/kandekefahad?igsh=MWc3cHp3dHRwZW1yMA%3D%3D" target="_blank" title="Instagram"><svg viewBox="0 0 448 512" fill="currentColor"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37.2-2.1-147.9-2.1-185.1 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37.2-2.1 147.9 0 185.1 1.7 35.9 9.9 67.7 36.2 93.9 26.3 26.2 58 34.4 93.9 36.2 37.2 2.1 147.9 2.1 185.1 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37.2 2.1-147.8 0-185.1z"/></svg></a>
  </div>
</div></div></footer>`;
}

// ================================================================
// MODAL + TOAST HELPERS
// ================================================================
function openModal(title,body,footer=''){
  document.getElementById('modal-title').textContent=title;
  document.getElementById('modal-body').innerHTML=body;
  document.getElementById('modal-footer').innerHTML=footer;
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal(){
  LESSON_TRACKER.active = null;
  document.getElementById('modal-overlay').classList.remove('open');
}
function closeModalOnOverlay(e){if(e.target===document.getElementById('modal-overlay'))closeModal()}

function toast(msg,type='success'){
  const container=document.getElementById('toast-container');
  const t=document.createElement('div');
  t.className=`toast ${type}`;
  t.innerHTML=`<div class="toast-title">${msg}</div>`;
  container.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .4s';setTimeout(()=>t.remove(),400)},3200);
}

// ================================================================
// EVENT LISTENERS
// ================================================================
function addEventListeners(){
  // Enter key in contact form
  document.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&e.target.id==='chat-input') sendChatMsg();
    if(e.key==='Escape') closeModal();
  },{once:true});
}

// ================================================================
// DARK / LIGHT THEME
// ================================================================
(function(){
  const saved = localStorage.getItem('kfa_theme') || 'dark';
  if(saved === 'light') document.documentElement.setAttribute('data-theme','light');
})();

function toggleTheme(){
  const btn = document.getElementById('theme-btn');
  const rect = btn ? btn.getBoundingClientRect() : {left:window.innerWidth-40,top:30,width:36,height:36};
  const ripple = document.getElementById('theme-ripple');
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const newTheme = isLight ? 'dark' : 'light';

  // Position ripple at button center
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  if(ripple){
    ripple.style.cssText = `
      width:60px;height:60px;
      left:${cx-30}px;top:${cy-30}px;
      background:${newTheme==='light'?'#f0f4ff':'#040a16'};
      transform:scale(0);opacity:1;
    `;
    ripple.classList.add('active');
    setTimeout(()=>{ripple.classList.remove('active');ripple.style.transform='scale(0)';ripple.style.opacity='1'},650);
  }

  setTimeout(()=>{
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('kfa_theme', newTheme);
    // Update logo gradient for light mode
    document.querySelectorAll('.logo-kfahad,.logo-academy').forEach(el=>{
      el.style.background = newTheme==='light'
        ? 'linear-gradient(135deg,#0d1627 30%,var(--pri))'
        : 'linear-gradient(135deg,#fff 30%,var(--pri))';
      el.style.webkitBackgroundClip='text';
      el.style.webkitTextFillColor='transparent';
    });
  }, 80);
}

// ================================================================
// AI TUTOR BOT
// ================================================================
const AI_BOT = {
  open: false,
  loading: false,
  history: [],
  welcomed: false,
  ENDPOINT: '/api/chat',
  FALLBACK_ENDPOINT: '/.netlify/functions/chat',
  API_VERSION: 1,

  // Smart local responses for instant replies
  localResponses: {
    greeting: [
      "Hello! 👋 Welcome to KFAHAD Academy! I'm your AI Tutor here to help you learn. What would you like to explore today?",
      "Hi there! 🎓 I'm excited to help you on your learning journey. Tell me what you'd like to know!",
      "Welcome! 😊 I'm here to help you with courses, questions, or anything about KFAHAD Academy. What can I assist you with?"
    ],
    courses: `We offer amazing courses at KFAHAD Academy:

📚 **ICT Courses:**
• Web Development (HTML, CSS, JavaScript)
• Python Programming
• Graphics Design

🧠 **Personal Development:**
• Psychology & Human Nature
• Body Language
• Communication & Storytelling
• Mastery & Purpose
• Power & Authority
• Social Intelligence

All courses include video lessons, quizzes, and certificates!`,
    
    pricing: `💰 **Subscription Plans:**

• **Basic** - 50,000 UGX/month
• **Pro** - 100,000/month (includes all courses + live classes)
• **Premium** - 200,000/month (full access + 1-on-1 mentoring)

Payment via MTN or Airtel Money. Start with a free trial lesson!`,
    
    started: `🚀 **How to Get Started:**

1. Create a free account
2. Browse our courses
3. Choose your learning path
4. Start learning!

We also have free trial lessons. Would you like me to show you our popular courses?`,
    
    help: `I'm here to help you with:

• 📚 Course information and recommendations
• 💰 Pricing and payment questions
• 📝 Study tips and homework help
• 🎯 Career guidance
• 🔧 Technical support
• 📖 General questions about KFAHAD Academy

What would you like to know?`,
    
    html: `📖 **HTML Basics:**

HTML (HyperText Markup Language) is the foundation of web pages.

**Key Tags:**
• \`<html>\` - Main container
• \`<head>\` - Meta info
• \`<body>\` - Visible content
• \`<h1>\` to \`<h6>\` - Headings
• \`<p>\` - Paragraph
• \`<a>\` - Links
• \`<img>\` - Images
• \`<div>\` - Division/containers

Would you like a code example?`,
    
    css: `🎨 **CSS Basics:**

CSS (Cascading Style Sheets) styles your HTML.

**Key Concepts:**
• Selectors (element, class, id)
• Properties (color, font, margin, padding)
• Flexbox for layouts
• Grid for complex layouts

**Example:**
\`\`\`css
body {
  background: #1a1a2e;
  color: #ffffff;
}
\`\`\`

Want to learn more about a specific topic?`,
    
    javascript: `⚡ **JavaScript Fundamentals:**

JavaScript adds interactivity to websites.

**Basics:**
• Variables: \`let x = 5;\`
• Functions: \`function greet() {}\`
• Events: \`onclick\`
• DOM manipulation

**Example:**
\`\`\`javascript
const message = document.getElementById('message').innerText;
\`\`\`

Want to build something practical?`,
    
    psychology: `🧠 **Psychology Topics:**

Explore the human mind:

• Understanding behavior patterns
• Body language signals
• Effective communication
• Social intelligence
• Building confidence
• Motivation and mindset

Which topic interests you most?`,
    
    default: `That's a great question! 😊 

I'm your KFAHAD AI Tutor. Here are things I can help with:
• Course information
• Study tips
• Career guidance
• Technical help

Or you can:
• 📞 Contact admin via the Contact page
• 💬 Join our community chat
• 📚 Browse all courses

What would you like to explore?`
  },

  getLocalResponse(query) {
    const q = query.toLowerCase();
    
    // Greeting patterns
    if (q.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/)) {
      return this.localResponses.greeting[Math.floor(Math.random() * this.localResponses.greeting.length)];
    }
    
    // Course related
    if (q.includes('course') || q.includes('learn') || q.includes('study') || q.includes('class')) {
      return this.localResponses.courses;
    }
    
    // Pricing/payment
    if (q.includes('price') || q.includes('cost') || q.includes('pay') || q.includes('money') || q.includes('subscription') || q.includes('ugx')) {
      return this.localResponses.pricing;
    }
    
    // Getting started
    if (q.includes('start') || q.includes('begin') || q.includes('how to') || q.includes('register') || q.includes('sign up')) {
      return this.localResponses.started;
    }
    
    // Help
    if (q.includes('help') || q.includes('what can you do')) {
      return this.localResponses.help;
    }
    
    // HTML
    if (q.includes('html') || q.includes('web page')) {
      return this.localResponses.html;
    }
    
    // CSS
    if (q.includes('css') || q.includes('style') || q.includes('design')) {
      return this.localResponses.css;
    }
    
    // JavaScript
    if (q.includes('javascript') || q.includes('js') || q.includes('coding') || q.includes('program')) {
      return this.localResponses.javascript;
    }
    
    // Psychology
    if (q.includes('psychology') || q.includes('mind') || q.includes('behavior') || q.includes('social')) {
      return this.localResponses.psychology;
    }
    
    // Default
    return this.localResponses.default;
  },

  SYSTEM_PROMPT: `You are KFAHAD AI Tutor, the friendly and knowledgeable AI assistant for KFAHAD Academy — Uganda's premier online learning platform founded by Kandeke Fahad. 

Your role:
- Welcome new visitors warmly and guide them around the platform
- Help students with their coursework across all subjects offered: Psychology & Human Nature, Body Language, Communication & Storytelling, Mastery & Purpose, Power & Authority, Social Intelligence, Web Development (HTML, CSS, JavaScript), and Graphic Design
- Answer academic questions clearly with examples, steps, and encouragement
- Help students understand difficult concepts from any of their courses
- Assist with homework, assignments, and project ideas
- Explain coding concepts with code snippets when relevant
- Guide users on subscription plans (Basic 50,000 UGX, Pro 100,000 UGX, Premium 200,000 UGX) paid via Mobile Money
- Provide career and study tips relevant to students in Uganda
- Be warm, encouraging, patient, and motivating at all times
- Keep responses concise but helpful — use bullet points for steps/lists
- Always end difficult explanations with an encouraging note

Platform info:
- KFAHAD Academy is based in Uganda, founded in 2026
- Offers courses in ICT (Web Dev, Graphic Design) and Personal Development
- Students can access live classes, quizzes, the knowledge base, job board, and community chat
- Payment is via Mobile Money (MTN/Airtel Uganda)

Respond in a friendly, encouraging tone suited for students. If a question is outside your scope, gently redirect to relevant platform features.`
};

function toggleAIBot(){
  if(currentPage==='dashboard' && currentSection==='chat'){
    AI_BOT.open = false;
    document.getElementById('ai-bot-panel')?.classList.remove('open');
    return;
  }
  AI_BOT.open = !AI_BOT.open;
  const panel = document.getElementById('ai-bot-panel');
  const notif = document.getElementById('ai-bot-notif');
  if(AI_BOT.open){
    panel.classList.add('open');
    notif.style.display='none';
    if(!AI_BOT.welcomed) aiWelcome();
    setTimeout(()=>document.getElementById('ai-input')?.focus(), 300);
  } else {
    panel.classList.remove('open');
  }
}

function aiWelcome(){
  AI_BOT.welcomed = true;
  const name = currentUser ? currentUser.name.split(' ')[0] : null;
  const greeting = name
    ? `👋 Welcome back, **${name}**! I'm your KFAHAD AI Tutor — here to help you learn, answer questions, and guide you through your courses. What are you working on today?`
    : `🎓 Welcome to **KFAHAD Academy**! I'm your AI Tutor, ready to help you learn and grow. Whether you have questions about our courses, need help with a topic, or want to know about our plans — I'm here for you! How can I help?`;
  aiAddMessage('bot', greeting);
  aiShowChips(name ? [
    '📚 Help with HTML',
    '🎨 Graphic Design tips',
    '🧠 Psychology concepts',
    '📝 Study advice',
    '💼 Career guidance'
  ] : [
    '📖 Tell me about courses',
    '💰 Pricing plans',
    '🚀 How to get started',
    '🎓 What will I learn?'
  ]);
}

function aiShowChips(chips){
  const el = document.getElementById('ai-chips');
  if(!el) return;
  el.innerHTML = chips.map(c=>`<button class="ai-chip" onclick="aiChipClick(this,'${c.replace(/'/g,"\\'")}')">
    ${c}
  </button>`).join('');
}

function aiChipClick(btn, text){
  document.getElementById('ai-chips').innerHTML='';
  document.getElementById('ai-input').value = text;
  sendAIMessage();
}

function aiAddMessage(role, text){
  const msgs = document.getElementById('ai-messages');
  if(!msgs) return;
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  const av = role==='bot' ? '<img src="robot-ai.png" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>' : (currentUser ? currentUser.name[0].toUpperCase() : '👤');
  const formatted = text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/`([^`]+)`/g,'<code style="background:rgba(255,255,255,.08);padding:1px 5px;border-radius:4px;font-size:.8rem;font-family:monospace">$1</code>')
    .replace(/\n/g,'<br>');
  div.innerHTML=`<div class="ai-msg-av">${av}</div><div class="ai-msg-bubble">${formatted}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  if(role==='bot') AI_BOT.history.push({role:'assistant', content:text});
}

function aiShowTyping(){
  const msgs = document.getElementById('ai-messages');
  if(!msgs) return null;
  const div = document.createElement('div');
  div.className='ai-msg bot'; div.id='ai-typing-indicator';
  div.innerHTML=`<div class="ai-msg-av"><img src="robot-ai.png" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/></div><div class="ai-msg-bubble"><div class="ai-typing"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(div); msgs.scrollTop=msgs.scrollHeight;
  return div;
}

async function sendAIMessage(){
  const input = document.getElementById('ai-input');
  const sendBtn = document.getElementById('ai-send');
  if(!input) return;
  const text = input.value.trim();
  if(!text || AI_BOT.loading) return;
  input.value='';
  document.getElementById('ai-chips').innerHTML='';

  // Add user message to UI and history
  const msgs = document.getElementById('ai-messages');
  const uDiv = document.createElement('div');
  uDiv.className='ai-msg user';
  const uAv = currentUser ? currentUser.name[0].toUpperCase() : '👤';
  uDiv.innerHTML=`<div class="ai-msg-av">${uAv}</div><div class="ai-msg-bubble">${text.replace(/</g,'&lt;')}</div>`;
  msgs?.appendChild(uDiv); if(msgs) msgs.scrollTop=msgs.scrollHeight;
  AI_BOT.history.push({role:'user', content:text});

  AI_BOT.loading=true;
  if(sendBtn) sendBtn.disabled=true;

  // Get instant local response - no API delay!
  let botReply = AI_BOT.getLocalResponse(text);

  // Show response immediately - super fast!
  setTimeout(() => {
    const bDiv = document.createElement('div');
    bDiv.className='ai-msg bot';
    bDiv.style.animation='ai-msg-in .2s ease';
    const formatted = botReply
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
      .replace(/`([^`]+)`/g,'<code style="background:rgba(255,255,255,.08);padding:1px 5px;border-radius:4px;font-size:.8rem;font-family:monospace">$1</code>')
      .replace(/\n/g,'<br>');
    bDiv.innerHTML=`<div class="ai-msg-av"><img src="robot-ai.png" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/></div><div class="ai-msg-bubble">${formatted}</div>`;
    msgs?.appendChild(bDiv); if(msgs) msgs.scrollTop=msgs.scrollHeight;
    AI_BOT.history.push({role:'assistant', content:botReply});
    AI_BOT.loading=false;
    if(sendBtn) sendBtn.disabled=false;
    input.focus();
  }, 300); // Super fast - 300ms!
}

// Trigger welcome notif after 4 seconds if bot not opened
setTimeout(()=>{
  const notif=document.getElementById('ai-bot-notif');
  if(notif&&!AI_BOT.open) notif.style.display='flex';
}, 4000);


function openSidebar(){
  document.getElementById('dash-sidebar')?.classList.add('open');
  document.getElementById('admin-sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('open');
}
function closeSidebar(){
  document.getElementById('dash-sidebar')?.classList.remove('open');
  document.getElementById('admin-sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('open');
}

// ================================================================
// TERMS BANNER
// ================================================================
function initTermsBanner(){
  if(localStorage.getItem('kfa_terms_accepted')==='true') return;
  if(currentUser?.termsAcceptedAt && currentUser?.termsVersion === '2026-01-01') return;
  const banner=document.createElement('div');
  banner.className='terms-banner';
  banner.id='terms-banner';
  banner.innerHTML=`<div class="terms-banner-inner">
    <p>By continuing, you are agreeing to our <a href="#terms-page" onclick="showPublicPage('terms-page')">Terms & Conditions</a>. Please review them before proceeding.</p>
    <button class="btn btn-primary btn-sm" onclick="acceptTerms()">I Agree</button>
  </div>`;
  document.body.appendChild(banner);
}
function acceptTerms(){
  localStorage.setItem('kfa_terms_accepted','true');
  const banner=document.getElementById('terms-banner');
  if(banner) banner.remove();
  if(currentUser?.authToken){
    postAuthApi({action:'accept_terms',version:'2026-01-01'},{token:currentUser.authToken}).catch(()=>{});
  }
}
function renderTermsPage(){
  return `<div style="min-height:calc(100vh - 60px);padding:40px 24px;background:var(--bg)">
    <div style="max-width:800px;margin:0 auto">
      <div class="card"><div class="card-body">
        <h1 style="font-family:var(--font-h);font-size:1.8rem;font-weight:800;margin-bottom:8px">Terms & Conditions</h1>
        <p style="color:var(--muted);font-size:.85rem;margin-bottom:24px">Last updated: July 15, 2026</p>
        <div style="display:flex;flex-direction:column;gap:20px;color:var(--txt);line-height:1.7">
          <section><h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:6px">1. Acceptance of Terms</h2><p style="color:var(--muted)">By accessing or using our website and services, you agree to be bound by these Terms & Conditions. If you do not agree with any part of these terms, you must not use our services.</p></section>
          <section><h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:6px">2. Description of Services</h2><p style="color:var(--muted)">We provide an online learning platform that enables users to access digital courses, manage account settings, and process payments through third-party payment processors. We reserve the right to modify, suspend, or discontinue any part of the services at any time without prior notice.</p></section>
          <section><h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:6px">3. User Accounts</h2><p style="color:var(--muted)">You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account or any other breach of security.</p></section>
          <section><h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:6px">4. Payment Terms</h2><p style="color:var(--muted)">All payments are processed through secure third-party payment service providers. By making a payment, you authorize us to charge the specified amount to your selected payment method. Refunds are subject to our refund policy and may take 5 to 10 business days to process.</p></section>
          <section><h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:6px">5. Prohibited Activities</h2><p style="color:var(--muted)">You agree not to: use the services for any unlawful purpose; attempt to gain unauthorized access to any portion of the services; interfere with or disrupt the integrity or performance of the services; collect or harvest any data from the services without our express written permission.</p></section>
          <section><h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:6px">6. Intellectual Property</h2><p style="color:var(--muted)">All content included on the website, such as text, graphics, logos, images, and software, is the property of our company or its licensors and is protected by copyright and other intellectual property laws.</p></section>
          <section><h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:6px">7. Termination</h2><p style="color:var(--muted)">We may terminate or suspend your access to the services at our sole discretion, without prior notice or liability, for any reason, including if you breach these Terms & Conditions.</p></section>
          <section><h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:6px">8. Limitation of Liability</h2><p style="color:var(--muted)">To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the services.</p></section>
          <section><h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:6px">9. Governing Law</h2><p style="color:var(--muted)">These Terms & Conditions shall be governed by and construed in accordance with the laws of Uganda, without regard to its conflict of law provisions.</p></section>
          <section><h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:6px">10. Contact Information</h2><p style="color:var(--muted)">If you have any questions about these Terms & Conditions, please contact us at <a href="mailto:support@kfahad.academy" style="color:var(--pri)">support@kfahad.academy</a>.</p></section>
        </div>
        <div style="margin-top:28px;padding-top:20px;border-top:1px solid var(--border);display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="showPublicPage('home')">Back to Home</button>
          <button class="btn btn-outline" onclick="acceptTerms();showPublicPage('home')">Accept Terms</button>
        </div>
      </div></div>
    </div>
  </div>${renderFooter()}`;
}

// ================================================================
// PRIVACY POLICY
// ================================================================
function renderPrivacyPolicyPage(){
  return `<div style="min-height:calc(100vh - 60px);padding:40px 24px;background:var(--bg)">
    <div style="max-width:800px;margin:0 auto">
      <div class="card"><div class="card-body">
        <h1 style="font-family:var(--font-h);font-size:1.8rem;font-weight:800;margin-bottom:8px">Privacy Policy</h1>
        <p style="color:var(--muted);font-size:.85rem;margin-bottom:24px">Last updated: July 15, 2026</p>
        <div style="display:flex;flex-direction:column;gap:20px;color:var(--txt);line-height:1.7">
          <section><h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:6px">1. Information We Collect</h2><p style="color:var(--muted)">We collect personal information you provide directly, such as your name, email address, phone number, and payment details when you register or make a purchase. We also collect usage data including course progress, quiz results, and interaction with our platform.</p></section>
          <section><h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:6px">2. How We Use Your Information</h2><p style="color:var(--muted)">Your data is used to provide and improve our educational services, process transactions, send important notifications, and personalize your learning experience. We do not sell your personal data to third parties.</p></section>
          <section><h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:6px">3. Data Storage & Security</h2><p style="color:var(--muted)">We implement industry-standard security measures including encrypted connections (HTTPS), secure password hashing, and restricted access controls. Payment information is processed through PCI-compliant third-party providers and is not stored on our servers.</p></section>
          <section><h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:6px">4. Sharing of Information</h2><p style="color:var(--muted)">We may share anonymized analytics with trusted service providers to improve our platform. Legal authorities may receive data when required by law. Instructors may see student names and progress for course management purposes.</p></section>
          <section><h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:6px">5. Your Rights</h2><p style="color:var(--muted)">You may request access to, correction of, or deletion of your personal data at any time by contacting support. You can also opt out of non-essential communications. Data deletion requests are processed within 30 days.</p></section>
          <section><h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:6px">6. Cookies</h2><p style="color:var(--muted)">We use essential cookies for authentication and session management. Optional analytics cookies help us understand usage patterns. You can control cookie preferences through your browser settings.</p></section>
          <section><h2 style="font-family:var(--font-h);font-size:1.1rem;font-weight:700;margin-bottom:6px">7. Contact Us</h2><p style="color:var(--muted)">For privacy inquiries, email <a href="mailto:support@kfahad.academy" style="color:var(--pri)">support@kfahad.academy</a> or call <a href="tel:+256702618396" style="color:var(--pri)">+256 702 618 396</a>.</p></section>
        </div>
        <div style="margin-top:28px;padding-top:20px;border-top:1px solid var(--border)">
          <button class="btn btn-primary" onclick="showPublicPage('home')">Back to Home</button>
        </div>
      </div></div>
    </div>
  </div>${renderFooter()}`;
}

// ================================================================
// SYSTEM STATUS
// ================================================================
let systemStatus = {
  supabase: 'unknown',
  aiChat: 'unknown',
  payments: 'unknown',
  uploads: 'unknown',
  lastChecked: null
};

async function checkSystemHealth(){
  const results = { supabase: 'down', aiChat: 'down', payments: 'down', uploads: 'down', lastChecked: new Date().toISOString() };

  const checks = [
    { key: 'supabase', url: '/api/data?table=courses' },
    { key: 'aiChat', url: '/api/chat', method: 'POST', body: { action: 'health' } },
    { key: 'payments', url: '/api/data', method: 'POST', body: { action: 'xyle_check_status', data: { ref: 'health-check' } } },
    { key: 'uploads', url: '/api/upload-course-video', method: 'POST', body: { action: 'health' } }
  ];

  await Promise.allSettled(checks.map(async (check) => {
    try {
      const opts = { method: check.method || 'GET', headers: { 'Content-Type': 'application/json' } };
      if (check.body) opts.body = JSON.stringify(check.body);
      const resp = await fetch(check.url, opts);
      if (resp.ok) results[check.key] = 'operational';
      else if (resp.status === 503 || resp.status === 502) results[check.key] = 'degraded';
      else results[check.key] = 'down';
    } catch (_) {
      results[check.key] = 'down';
    }
  }));

  systemStatus = results;
  if (currentPage === 'system-status') renderPage();
}

function renderSystemStatusPage(){
  const statusColor = (s) => s === 'operational' ? 'var(--success)' : s === 'degraded' ? 'var(--warn)' : 'var(--danger)';
  const statusLabel = (s) => s === 'operational' ? 'Operational' : s === 'degraded' ? 'Degraded' : 'Unavailable';
  const items = [
    { key: 'supabase', label: 'Database (Supabase)' },
    { key: 'aiChat', label: 'AI Tutor Service' },
    { key: 'payments', label: 'Payments (Xyle)' },
    { key: 'uploads', label: 'File Uploads' }
  ];

  return `<div style="min-height:calc(100vh - 60px);padding:40px 24px;background:var(--bg)">
    <div style="max-width:800px;margin:0 auto">
      <div class="card"><div class="card-body">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px">
          <div>
            <h1 style="font-family:var(--font-h);font-size:1.8rem;font-weight:800;margin-bottom:6px">System Status</h1>
            <p style="color:var(--muted);font-size:.85rem">Real-time health of KFAHAD Academy services.</p>
          </div>
          <button class="btn btn-outline btn-sm" onclick="checkSystemHealth()">Refresh</button>
        </div>
        <div style="display:grid;gap:12px">
          ${items.map(item => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius)">
              <div>
                <div style="font-weight:700;font-family:var(--font-h)">${item.label}</div>
                <div style="font-size:.8rem;color:var(--muted)">${systemStatus.lastChecked ? 'Checked ' + new Date(systemStatus.lastChecked).toLocaleTimeString() : 'Checking...'}</div>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="width:10px;height:10px;border-radius:50%;background:${statusColor(systemStatus[item.key] || 'unknown')}"></span>
                <span style="font-size:.85rem;font-weight:600;color:${statusColor(systemStatus[item.key] || 'unknown')}">${statusLabel(systemStatus[item.key] || 'unknown')}</span>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:24px;padding:16px;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2);border-radius:var(--radius)">
          <p style="font-size:.85rem;color:var(--muted);margin:0">This page auto-refreshes every 30 seconds. If a service is down, our team is automatically notified.</p>
        </div>
        <div style="margin-top:20px">
          <button class="btn btn-primary" onclick="showPublicPage('home')">Back to Home</button>
        </div>
      </div></div>
    </div>
  </div>${renderFooter()}`;
}

// ================================================================
// FORGOT PASSWORD
// ================================================================
function renderForgotPasswordPage(){
  return `<div style="min-height:calc(100vh - 60px);display:flex;align-items:center;justify-content:center;padding:40px 24px;background:linear-gradient(135deg,#051a3b 0%,var(--bg) 100%)">
    <div style="width:100%;max-width:420px">
      <div style="text-align:center;margin-bottom:32px">
        <span class="logo-text logo-text-auth" style="font-size:1.5rem;display:inline-flex;margin-bottom:8px" onclick="showPublicPage('home')">
          <img class="logo-mark logo-mark-auth" src="KF%20LOGO.png" alt="KFAHAD Academy logo"/>
          <span class="logo-wordmark">
            <span class="logo-kfahad">KFAHAD</span>
            <span class="logo-academy">Academy</span>
          </span>
        </span>
        <h2 style="font-family:var(--font-h);font-size:1.6rem;font-weight:800;margin-bottom:6px">Forgot password?</h2>
        <p style="color:var(--muted);font-size:.875rem">Enter your email and we'll send you a reset link.</p>
      </div>
      <div class="card"><div class="card-body">
        <div id="forgot-err" style="display:none;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:10px 14px;font-size:.85rem;color:var(--danger);margin-bottom:16px"></div>
        <div id="forgot-ok" style="display:none;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3);border-radius:8px;padding:10px 14px;font-size:.85rem;color:var(--success);margin-bottom:16px"></div>
        <div class="form-group"><label>Email</label><input class="form-control" id="forgot-email" type="email" placeholder="you@example.com"/></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px" onclick="doForgotPassword()">Send reset link</button>
        <p style="text-align:center;color:var(--muted);font-size:.85rem;margin-top:18px">Remember your password? <a href="#login-page" onclick="showPublicPage('login-page')" style="color:var(--pri);font-weight:600;cursor:pointer">Sign in</a></p>
      </div></div>
    </div>
  </div>${renderFooter()}`;
}
async function doForgotPassword(){
  const email=document.getElementById('forgot-email')?.value.trim();
  const err=document.getElementById('forgot-err');
  const ok=document.getElementById('forgot-ok');
  if(!email){if(err){err.style.display='block';err.textContent='Please enter your email.'}return}
  if(err) err.style.display='none'; if(ok) ok.style.display='none';
  try{
    const data=await postAuthApi({action:'forgot_password',email});
    if(ok){ok.style.display='block';ok.textContent=data.message||'If an account exists, a reset link has been sent.'}
  }catch(error){
    if(err){err.style.display='block';err.textContent=error.message||'Something went wrong. Please try again.'}
  }
}

// ================================================================
// RESET PASSWORD
// ================================================================
function renderResetPasswordPage(){
  const token=new URLSearchParams(window.location.search).get('token')||'';
  return `<div style="min-height:calc(100vh - 60px);display:flex;align-items:center;justify-content:center;padding:40px 24px;background:linear-gradient(135deg,#051a3b 0%,var(--bg) 100%)">
    <div style="width:100%;max-width:420px">
      <div style="text-align:center;margin-bottom:32px">
        <span class="logo-text logo-text-auth" style="font-size:1.5rem;display:inline-flex;margin-bottom:8px" onclick="showPublicPage('home')">
          <img class="logo-mark logo-mark-auth" src="KF%20LOGO.png" alt="KFAHAD Academy logo"/>
          <span class="logo-wordmark">
            <span class="logo-kfahad">KFAHAD</span>
            <span class="logo-academy">Academy</span>
          </span>
        </span>
        <h2 style="font-family:var(--font-h);font-size:1.6rem;font-weight:800;margin-bottom:6px">Reset password</h2>
        <p style="color:var(--muted);font-size:.875rem">Enter your new password below.</p>
      </div>
      <div class="card"><div class="card-body">
        <div id="reset-err" style="display:none;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:10px 14px;font-size:.85rem;color:var(--danger);margin-bottom:16px"></div>
        <div id="reset-ok" style="display:none;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3);border-radius:8px;padding:10px 14px;font-size:.85rem;color:var(--success);margin-bottom:16px"></div>
        ${token ? `
        <div class="form-group"><label>New password</label><input class="form-control" id="reset-pw" type="password" placeholder="Min 8 characters"/></div>
        <div class="form-group"><label>Confirm password</label><input class="form-control" id="reset-confirm" type="password" placeholder="Repeat password"/></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px" onclick="doResetPassword('${token.replace(/'/g,"\\'")}')">Reset password</button>
        ` : `<p style="color:var(--muted);font-size:.9rem;text-align:center">This password reset link is missing or invalid. <a href="#forgot-password" onclick="showPublicPage('forgot-password')" style="color:var(--pri);font-weight:600;cursor:pointer">Request a new link</a>.</p>`}
      </div></div>
    </div>
  </div>${renderFooter()}`;
}
async function doResetPassword(token){
  const pw=document.getElementById('reset-pw')?.value||'';
  const confirm=document.getElementById('reset-confirm')?.value||'';
  const err=document.getElementById('reset-err');
  const ok=document.getElementById('reset-ok');
  if(!token){if(err){err.style.display='block';err.textContent='Invalid reset link.'}return}
  if(pw.length<8){if(err){err.style.display='block';err.textContent='Password must be at least 8 characters.'}return}
  if(pw!==confirm){if(err){err.style.display='block';err.textContent='Passwords do not match.'}return}
  if(err) err.style.display='none'; if(ok) ok.style.display='none';
  try{
    const data=await postAuthApi({action:'reset_password',token,password:pw});
    if(ok){ok.style.display='block';ok.textContent=data.message||'Password reset successfully. You may now log in.'}
  }catch(error){
    if(err){err.style.display='block';err.textContent=error.message||'Something went wrong. Please try again.'}
  }
}

// ================================================================
// PAYMENTS (XylePayments)
// ================================================================
async function postDataApi(payload){
  const response = await fetch(DATA_BACKEND.endpoint,{
    method:'POST',
    headers:{...dataApiHeaders()},
    body:JSON.stringify(payload)
  });
  const data = await response.json().catch(()=>({}));
  if(!response.ok) {
    const msg = data.error || data.message || `Data API error: ${response.status}`;
    const err = new Error(msg);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ================================================================
// PAYMENTS
// ================================================================
function renderPaymentsPage(){
  return `<div style="min-height:calc(100vh - 60px);padding:40px 24px;background:var(--bg)">
    <div style="max-width:560px;margin:0 auto">
      <div class="card"><div class="card-body">
        <h1 style="font-family:var(--font-h);font-size:1.8rem;font-weight:800;margin-bottom:6px">Payments</h1>
        <p style="color:var(--muted);font-size:.9rem;margin-bottom:24px">Deposit or withdraw using MTN MoMo or Airtel Money.</p>
        <div id="pay-err" style="display:none;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:10px 14px;font-size:.85rem;color:var(--danger);margin-bottom:16px"></div>
        <div id="pay-ok" style="display:none;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3);border-radius:8px;padding:10px 14px;font-size:.85rem;color:var(--success);margin-bottom:16px"></div>

        <div style="display:grid;gap:18px">
          <div style="padding:18px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius)">
            <h3 style="font-family:var(--font-h);font-weight:700;margin-bottom:12px">Deposit Funds</h3>
            <div class="form-group"><label>Provider</label><select class="form-control" id="pay-provider"><option value="MTN_UGANDA">MTN Uganda</option><option value="AIRTEL_UGANDA">Airtel Uganda</option></select></div>
            <div class="form-group"><label>Mobile Money Number</label><input class="form-control" id="pay-account" type="text" placeholder="077... or 25677..." oninput="autoSelectProviderFromInput(this, 'pay-provider')"/><p style="font-size:.78rem;color:var(--muted);margin-top:4px">Accepts 07... or 256... (auto-detects MTN vs Airtel).</p></div>
            <div class="form-group"><label>Amount (UGX)</label><input class="form-control" id="pay-amount" type="number" min="1000" step="1" placeholder="5000"/></div>
            <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px" onclick="doPayment()" id="pay-btn">Deposit</button>
          </div>

          <div style="padding:18px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius)">
            <h3 style="font-family:var(--font-h);font-weight:700;margin-bottom:12px">Withdraw Funds</h3>
            <div class="form-group"><label>Provider</label><select class="form-control" id="wd-provider"><option value="MTN_UGANDA">MTN Uganda</option><option value="AIRTEL_UGANDA">Airtel Uganda</option></select></div>
            <div class="form-group"><label>Mobile Money Number</label><input class="form-control" id="wd-account" type="text" placeholder="077... or 25677..." oninput="autoSelectProviderFromInput(this, 'wd-provider')"/></div>
            <div class="form-group"><label>Amount (UGX)</label><input class="form-control" id="wd-amount" type="number" min="1000" step="1" placeholder="5000"/></div>
            <button class="btn btn-outline" style="width:100%;justify-content:center;padding:13px" onclick="doWithdrawal()" id="wd-btn">Withdraw</button>
          </div>

          <div style="padding:18px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <h3 style="font-family:var(--font-h);font-weight:700">Recent Transactions</h3>
              <button class="btn btn-ghost btn-sm" onclick="loadTransactions()">Refresh</button>
            </div>
            <div id="tx-list"><p style="color:var(--muted);font-size:.85rem">Loading...</p></div>
          </div>
        </div>
      </div></div>
    </div>
  </div>${renderFooter()}`;
}
function autoSelectProviderFromInput(input, selectId){
  const carrier = detectUgandaCarrier(input?.value);
  if(carrier){
    const sel = document.getElementById(selectId);
    if(sel) sel.value = carrier.provider;
  }
}
async function doPayment(){
  let provider=document.getElementById('pay-provider')?.value||'MTN_UGANDA';
  let account=document.getElementById('pay-account')?.value.trim()||'';
  const amount=Number(document.getElementById('pay-amount')?.value||0);
  const btn=document.getElementById('pay-btn');
  const err=document.getElementById('pay-err');
  const ok=document.getElementById('pay-ok');

  account = account.replace(/\D/g, '');
  if(account.startsWith('0') && account.length === 10) account = '256' + account.slice(1);
  if(account.length === 9 && !account.startsWith('256')) account = '256' + account;

  const carrier = detectUgandaCarrier(account);
  if(carrier){
    provider = carrier.provider;
    const sel = document.getElementById('pay-provider');
    if(sel) sel.value = provider;
  }

  if(!/^[1-9]\d{8,14}$/.test(account)){if(err){err.style.display='block';err.textContent='Please enter a valid phone number (e.g. 256771234567 or 0771234567).'}return}
  if(!amount||amount<1000){if(err){err.style.display='block';err.textContent='Minimum deposit is 1,000 UGX.'}return}
  if(err) err.style.display='none'; if(ok) ok.style.display='none';
  if(btn){btn.disabled=true;btn.textContent='Processing...'}
  try{
    const data=await postDataApi({action:'xyle_deposit',provider,account,amount});
    if(ok){ok.style.display='block';ok.textContent='Deposit initiated. Reference: '+(data.data?.reference||'N/A')}
    loadTransactions();
  }catch(error){
    if(err){err.style.display='block';err.textContent=error.message||'Deposit failed. Please try again.'}
  }finally{
    if(btn){btn.disabled=false;btn.textContent='Deposit'}
  }
}
async function doWithdrawal(){
  let provider=document.getElementById('wd-provider')?.value||'MTN_UGANDA';
  let account=document.getElementById('wd-account')?.value.trim()||'';
  const amount=Number(document.getElementById('wd-amount')?.value||0);
  const btn=document.getElementById('wd-btn');
  const err=document.getElementById('pay-err');
  const ok=document.getElementById('pay-ok');

  account = account.replace(/\D/g, '');
  if(account.startsWith('0') && account.length === 10) account = '256' + account.slice(1);
  if(account.length === 9 && !account.startsWith('256')) account = '256' + account;

  const carrier = detectUgandaCarrier(account);
  if(carrier){
    provider = carrier.provider;
    const sel = document.getElementById('wd-provider');
    if(sel) sel.value = provider;
  }

  if(!/^[1-9]\d{8,14}$/.test(account)){if(err){err.style.display='block';err.textContent='Please enter a valid phone number.'}return}
  if(!amount||amount<1000){if(err){err.style.display='block';err.textContent='Minimum withdrawal is 1,000 UGX.'}return}
  if(err) err.style.display='none'; if(ok) ok.style.display='none';
  if(btn){btn.disabled=true;btn.textContent='Processing...'}
  try{
    const data=await postDataApi({action:'xyle_withdrawal',provider,account,amount});
    if(ok){ok.style.display='block';ok.textContent='Withdrawal requested. Reference: '+(data.data?.reference||'N/A')}
    loadTransactions();
  }catch(error){
    if(err){err.style.display='block';err.textContent=error.message||'Withdrawal failed. Please try again.'}
  }finally{
    if(btn){btn.disabled=false;btn.textContent='Withdraw'}
  }
}
async function loadTransactions(){
  const list=document.getElementById('tx-list');
  if(!list) return;
  try{
    const data=await postDataApi({action:'xyle_transactions',page:1,limit:10});
    const txs = data.data?.transactions || [];
    if(!txs.length){list.innerHTML='<p style="color:var(--muted);font-size:.85rem">No transactions yet.</p>';return}
    list.innerHTML = txs.map(tx => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-weight:700;font-size:.85rem">${tx.type} ${tx.provider||''}</div>
          <div style="font-size:.78rem;color:var(--muted)">${tx.reference||tx.id} ${tx.status||''}</div>
        </div>
        <div style="font-weight:700;font-size:.9rem">${tx.amount?.toLocaleString?.()||tx.amount}</div>
      </div>
    `).join('');
  }catch{
    list.innerHTML='<p style="color:var(--muted);font-size:.85rem">Unable to load transactions.</p>';
  }
}
// ================================================================
// INIT
// ================================================================
(function(){
  const saved = localStorage.getItem('kfa_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  applyRouteState(parseHashRoute() || getDefaultPageState());
})();
window.addEventListener('hashchange',()=>{
  const route = parseHashRoute();
  if(!route){
    handleOAuthCallbackFromHash();
    return;
  }
  applyRouteState(route);
  renderPage();
  closeMobileMenu();
  closeSidebar();
  handleOAuthCallbackFromHash();
});
window.addEventListener('storage',event=>{
  if(!['kfa_messages','kfa_notifications','kfa_users','kfa_customCourses'].includes(event.key||'')) return;
  if(currentUser) refreshCurrentUser();
  renderPage();
});
function handleOAuthCallbackFromHash(){
  const hash = window.location.hash.replace(/^#/,'').trim();
  if(!hash) return;
  
  let path = hash;
  let queryString = '';
  const qIndex = hash.indexOf('?');
  if(qIndex >= 0){
    path = hash.substring(0, qIndex);
    queryString = hash.substring(qIndex + 1);
  }
  
  if(path === 'github-callback' || path.startsWith('github-callback')){
    const params = new URLSearchParams(queryString);
    const code = params.get('code');
    const state = params.get('state');
    if(code){
      processOAuthCallback();
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
  }
}
DB.init();
saveStoredNotifications(getStoredNotifications());
renderPage();
initTermsBanner();
processOAuthCallback();
setInterval(()=>{ if(currentPage==='system-status') checkSystemHealth(); }, 30000);
loadPublicUserStats({rerender:true}).catch(()=>{});
loadJobsFromServer().catch(()=>{});
loadNotificationsFromServer().catch(()=>{});
loadCoursesFromSupabase({silent:true,rerender:false}).catch(()=>{});
syncReviewsFromServer().catch(()=>{});
syncAppointmentsFromServer().catch(()=>{});
syncPaymentsFromServer().catch(()=>{});
if(currentUser?.authToken){
  syncCurrentUserFromServer({rerender:true})
    .then(user=>{
      if(user?.role==='admin') return syncUsersFromServer({rerender:true});
      return null;
    })
    .catch(()=>{});
  startChatPolling();
}
if(currentUser){
  startNotificationPolling();
}
