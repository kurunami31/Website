/* script.js - shared JS for nav, user, dark mode, simple client-side schedule storage */
(function(){
  /* helper */
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  /* mobile nav toggles (works across pages) */
  function initNavToggles(){
    $$('[id^="navToggle"]').forEach(btn=>{
      btn.addEventListener('click', e=>{
        const menuId = btn.getAttribute('aria-controls') || btn.id.replace('Toggle','Menu');
        const menu = document.getElementById(menuId) || btn.closest('.site-header').querySelector('.nav-links');
        if(!menu) return;
        const isShown = menu.classList.toggle('show');
        btn.setAttribute('aria-expanded', isShown ? 'true' : 'false');
      });
    });
  }

  /* dropdown close on click outside */
  function initDropdowns(){
    document.addEventListener('click', (e)=>{
      const open = document.querySelector('.dropdown-content[style*="display:block"], .user-dropdown .dropdown-content');
      // we keep hover-based CSS but allow clicking the logout etc.
      // close logic not necessary because :hover and focus-within handle it; keep for future extension.
    });
  }

  /* Video toggle */
  function initVideo(){
    const v = document.getElementById('bgVideo');
    const btn = document.getElementById('videoToggle');
    if(!v || !btn) return;
    btn.textContent = '⏸';
    btn.addEventListener('click', ()=>{
      if(v.paused){ v.play(); btn.textContent = '⏸'; }
      else { v.pause(); btn.textContent = '▶'; }
    });
  }

  /* Dark mode toggle persisted in localStorage */
  function initDarkMode(){
    const toggles = $$('.icon-btn[id^="darkModeToggle"]');
    const root = document.documentElement;
    const key = 'scheduling_dark';
    const setMode = (dark) => {
      if(dark) root.style.setProperty('--bg','#021019');
      else root.style.removeProperty('--bg');
      toggles.forEach(t=> t.setAttribute('aria-pressed', dark ? 'true' : 'false'));
      localStorage.setItem(key, dark ? '1' : '0');
    };
    const stored = localStorage.getItem(key);
    setMode(stored === '1');

    toggles.forEach(btn => btn.addEventListener('click', ()=>{
      const current = localStorage.getItem(key) === '1';
      setMode(!current);
    }));
  }

  /* Simple user mock: persist username & avatar in localStorage and show in header */
  function initUser(){
    const usernameEl = $('#navUsername');
    const avatarEl = $('#navAvatar');
    const profileImg = document.getElementById('profileImg');
    const avatarUpload = document.getElementById('avatarUpload');
    const storedName = localStorage.getItem('sb_username') || 'Guest';
    const storedAvatar = localStorage.getItem('sb_avatar') || 'assets/default-avatar.png';
    if(usernameEl) usernameEl.textContent = storedName + ' ▾';
    if(avatarEl) avatarEl.src = storedAvatar;
    if(profileImg) profileImg.src = storedAvatar;

    if(avatarUpload){
      avatarUpload.addEventListener('change', (e)=>{
        const f = e.target.files && e.target.files[0];
        if(!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          localStorage.setItem('sb_avatar', reader.result);
          if(avatarEl) avatarEl.src = reader.result;
          if(profileImg) profileImg.src = reader.result;
        };
        reader.readAsDataURL(f);
      });
    }

    // profile save
    const profileForm = document.getElementById('profileForm');
    if(profileForm){
      profileForm.addEventListener('submit', (ev)=>{
        ev.preventDefault();
        const name = document.getElementById('pFullName').value || 'Guest';
        const email = document.getElementById('pEmail').value || '';
        localStorage.setItem('sb_username', name);
        localStorage.setItem('sb_email', email);
        if(usernameEl) usernameEl.textContent = name + ' ▾';
        const msg = document.getElementById('profileMessage');
        if(msg){ msg.textContent = 'Profile saved locally.'; setTimeout(()=> msg.textContent = '', 2500); }
      });

      // prefill if stored
      const nameInput = document.getElementById('pFullName');
      const emailInput = document.getElementById('pEmail');
      if(nameInput) nameInput.value = localStorage.getItem('sb_username') || '';
      if(emailInput) emailInput.value = localStorage.getItem('sb_email') || '';
    }
  }

  /* Simple schedule storage for demo (per user) */
  function initSchedule(){
    const form = document.getElementById('addEventForm');
    const tableBody = document.querySelector('#scheduleTable tbody');
    const userKey = (localStorage.getItem('sb_username') || 'guest') + '_events';

    const render = ()=>{
      if(!tableBody) return;
      const raw = localStorage.getItem(userKey);
      const events = raw ? JSON.parse(raw) : [];
      tableBody.innerHTML = '';
      events.sort((a,b)=> new Date(a.date) - new Date(b.date));
      events.forEach((ev, i)=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${ev.date}</td>
          <td>${escapeHtml(ev.name || '')}</td>
          <td>${ev.category || ''}</td>
          <td>
            <button data-i="${i}" class="edit-btn">Edit</button>
            <button data-i="${i}" class="del-btn">Delete</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });

      $$('button.del-btn').forEach(b=>{
        b.addEventListener('click', ()=>{
          const i = Number(b.getAttribute('data-i'));
          const arr = JSON.parse(localStorage.getItem(userKey) || '[]');
          arr.splice(i,1);
          localStorage.setItem(userKey, JSON.stringify(arr));
          render();
        });
      });

      $$('button.edit-btn').forEach(b=>{
        b.addEventListener('click', ()=>{
          const i = Number(b.getAttribute('data-i'));
          const arr = JSON.parse(localStorage.getItem(userKey) || '[]');
          const item = arr[i];
          if(!item) return;
          // simple inline edit prompt (quick)
          const newName = prompt('Edit event name', item.name);
          if(newName === null) return;
          item.name = newName;
          arr[i] = item;
          localStorage.setItem(userKey, JSON.stringify(arr));
          render();
        });
      });
    };

    if(form){
      form.addEventListener('submit', (e)=>{
        e.preventDefault();
        const date = document.getElementById('date').value;
        const name = document.getElementById('eventName').value;
        const category = document.getElementById('category').value;
        const notes = document.getElementById('notes') ? document.getElementById('notes').value : '';
        if(!date || !name) return alert('Date and name required.');
        const arr = JSON.parse(localStorage.getItem(userKey) || '[]');
        arr.push({ date, name, category, notes });
        localStorage.setItem(userKey, JSON.stringify(arr));
        form.reset();
        render();
      });
    }

    render();
  }

  /* Login/register forms: store a demo user (not secure) */
  function initAuthForms(){
    const loginForm = document.getElementById('loginForm');
    if(loginForm){
      loginForm.addEventListener('submit', (e)=>{
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPassword').value;
        const db = JSON.parse(localStorage.getItem('sb_users') || '{}');
        const user = db[email];
        const msg = document.getElementById('loginMessage');
        if(user && user.password === pass){
          localStorage.setItem('sb_username', user.name);
          localStorage.setItem('sb_email', email);
          if(msg) msg.textContent = 'Logged in (local demo). Redirecting...';
          setTimeout(()=> location.href = 'index.html', 800);
        } else {
          if(msg) msg.textContent = 'Invalid credentials (demo).';
          setTimeout(()=> msg.textContent = '', 2500);
        }
      });
    }

    const registerForm = document.getElementById('registerForm');
    if(registerForm){
      registerForm.addEventListener('submit', (e)=>{
        e.preventDefault();
        const name = document.getElementById('fullName').value;
        const email = document.getElementById('registerEmail').value;
        const pass = document.getElementById('registerPassword').value;
        const db = JSON.parse(localStorage.getItem('sb_users') || '{}');
        if(db[email]) { document.getElementById('registerMessage').textContent = 'User already exists.'; return; }
        db[email] = { name, password: pass };
        localStorage.setItem('sb_users', JSON.stringify(db));
        localStorage.setItem('sb_username', name);
        document.getElementById('registerMessage').textContent = 'Registered locally. Redirecting to Home...';
        setTimeout(()=> location.href = 'index.html', 900);
      });
    }
  }

  /* small escape to prevent XSS when rendering text */
  function escapeHtml(s=''){ return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

  /* init all */
  document.addEventListener('DOMContentLoaded', ()=>{
    initNavToggles();
    initDropdowns();
    initVideo();
    initDarkMode();
    initUser();
    initSchedule();
    initAuthForms();
  });
})();
