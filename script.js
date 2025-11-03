// script.js - Repox Completo e Otimizado
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ==================== CONFIGURAÇÕES ====================
const firebaseConfig = {
  apiKey: "AIzaSyCEozN-OvgZgDpKUOn0HBrlsOL4dsnG0Oo",
  authDomain: "repositorio-be79e.firebaseapp.com",
  projectId: "repositorio-be79e",
  storageBucket: "repositorio-be79e.firebasestorage.app",
  messagingSenderId: "859258571807",
  appId: "1:859258571807:web:aaca78fc1777d29396992a"
};

const SUPABASE_URL = 'https://wfdcretektjltvcjknzu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmZGNyZXRla3RqbHR2Y2prbnp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODA3ODAsImV4cCI6MjA3Nzc1Njc4MH0.HHEiUsD-jJ1QsVHbYxRh1JAeEoAPGhk-BO0PD_V-Z_0';

// Configurações do usuário
const userSettings = {
  theme: localStorage.getItem('theme') || 'system',
  autoplay: localStorage.getItem('autoplay') !== 'false',
  autoaudio: localStorage.getItem('autoaudio') === 'true'
};

// ==================== INICIALIZAÇÃO ====================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== ESTADO GLOBAL ====================
let currentUser = null;
let allMedia = [];
let profiles = new Map();
let following = new Set();
let hiddenFiles = new Set();
let currentView = 'feed';
let loadedCards = new Map();
let activeCards = [];
let currentCommentsFileId = null;

// Intersection Observer
const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      handleCardVisible(entry.target);
    } else {
      handleCardInvisible(entry.target);
    }
  });
}, {
  threshold: 0.5,
  rootMargin: '50px'
});

// ==================== ELEMENTOS DOM ====================
const loginScreen = document.getElementById('loginScreen');
const appDiv = document.getElementById('app');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const mainContent = document.querySelector('.main-content');
const profileBtn = document.getElementById('profileBtn');
const profileDropdown = document.getElementById('profileDropdown');
const myProfileBtn = document.getElementById('myProfileBtn');
const headerAvatar = document.getElementById('headerAvatar');
const searchInput = document.getElementById('searchInput');
const searchOverlay = document.getElementById('searchOverlay');
const searchResultsGrid = document.getElementById('searchResultsGrid');
const commentsModal = document.getElementById('commentsModal');
const closeCommentsModal = document.getElementById('closeCommentsModal');
const commentsModalBody = document.getElementById('commentsModalBody');
const modalCommentForm = document.getElementById('modalCommentForm');

const feedView = document.getElementById('feedView');
const discoverView = document.getElementById('discoverView');
const filterView = document.getElementById('filterView');
const profileView = document.getElementById('profileView');
const settingsView = document.getElementById('settingsView');
const mediaModal = document.getElementById('mediaModal');

// ==================== AUTENTICAÇÃO ====================
loginBtn.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error('Erro no login:', error);
    alert('Erro ao fazer login');
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Erro no logout:', error);
  }
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    loginScreen.classList.add('hidden');
    appDiv.classList.remove('hidden');
    headerAvatar.src = user.photoURL;
    await initializeAppData();
  } else {
    currentUser = null;
    loginScreen.classList.remove('hidden');
    appDiv.classList.add('hidden');
  }
});

// ==================== INICIALIZAÇÃO ====================
async function initializeAppData() {
  applyTheme();
  await loadFollowing();
  await loadHiddenFiles();
  await loadMedia();
  setupEventListeners();
  setupSettings();
}

// ==================== MENU E NAVEGAÇÃO ====================
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('show');
  }
  if (sidebar.classList.contains('collapsed')) {
    mainContent.classList.add('expanded');
  } else {
    mainContent.classList.remove('expanded');
  }
});

document.addEventListener('click', (e) => {
  if (window.innerWidth <= 768 && 
      sidebar.classList.contains('show') && 
      !sidebar.contains(e.target) && 
      !menuToggle.contains(e.target)) {
    sidebar.classList.remove('show');
  }
  if (!profileDropdown.classList.contains('hidden') && 
      !profileBtn.contains(e.target) && 
      !profileDropdown.contains(e.target)) {
    profileDropdown.classList.add('hidden');
  }
});

profileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  profileDropdown.classList.toggle('hidden');
});

myProfileBtn.addEventListener('click', () => {
  showProfile(currentUser.uid);
});

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    switchView(view);
  });
});

function switchView(view) {
  currentView = view;
  
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  
  feedView.classList.add('hidden');
  discoverView.classList.add('hidden');
  filterView.classList.add('hidden');
  profileView.classList.add('hidden');
  settingsView.classList.add('hidden');
  
  switch(view) {
    case 'feed':
      feedView.classList.remove('hidden');
      break;
    case 'discover':
      discoverView.classList.remove('hidden');
      renderDiscover();
      break;
    case 'filter':
      filterView.classList.remove('hidden');
      renderFilter();
      break;
    case 'settings':
      settingsView.classList.remove('hidden');
      break;
  }
}

// ==================== CARREGAR MÍDIA ====================
async function loadMedia() {
  try {
    feedView.innerHTML = '<div class="loading">Carregando...</div>';
    
    const response = await fetch('/api/get-files');
    if (!response.ok) throw new Error(`Erro na API: ${response.status}`);
    
    const files = await response.json();
    allMedia = processFiles(files);
    renderFeed();
    
  } catch (error) {
    console.error('Erro:', error);
    feedView.innerHTML = `<div class="empty-state">⚠️<br>${error.message}</div>`;
  }
}

function processFiles(files) {
  const processed = [];
  
  files.forEach(file => {
    const pathParts = file.path.split('/');
    let profileName = 'unknown';
    
    if (pathParts.length > 1) {
      profileName = pathParts[0];
    }
    
    if (!profiles.has(profileName)) {
      profiles.set(profileName, {
        name: profileName,
        avatar: `https://ui-avatars.com/api/?name=${profileName}&background=667eea&color=fff`,
        followers: 0,
        totalLikes: 0,
        files: []
      });
    }
    
    profiles.get(profileName).files.push(file.id);
    
    processed.push({
      ...file,
      profile: profileName
    });
  });
  
  return processed;
}

// ==================== RENDERIZAR FEED OTIMIZADO ====================
function renderFeed() {
  feedView.innerHTML = '';
  loadedCards.clear();
  activeCards = [];
  
  const sorted = allMedia
    .filter(item => !hiddenFiles.has(item.id))
    .sort((a, b) => {
      const aFollowing = following.has(a.profile);
      const bFollowing = following.has(b.profile);
      if (aFollowing && !bFollowing) return -1;
      if (!aFollowing && bFollowing) return 1;
      return Math.random() - 0.5;
    });
  
  sorted.forEach(item => {
    const placeholder = document.createElement('div');
    placeholder.className = 'feed-item';
    placeholder.dataset.fileId = item.id;
    placeholder.style.minHeight = '400px';
    feedView.appendChild(placeholder);
    
    cardObserver.observe(placeholder);
    loadedCards.set(item.id, { item, element: placeholder, loaded: false });
  });
}

function handleCardVisible(element) {
  const fileId = element.dataset.fileId;
  const cardData = loadedCards.get(fileId);
  
  if (!cardData || cardData.loaded) return;
  
  const fullCard = createFeedItem(cardData.item);
  element.replaceWith(fullCard);
  cardData.element = fullCard;
  cardData.loaded = true;
  
  activeCards.push(fileId);
  if (activeCards.length > 3) {
    const oldestId = activeCards.shift();
    unloadCard(oldestId);
  }
  
  cardObserver.observe(fullCard);
}

function handleCardInvisible(element) {
  const video = element.querySelector('video');
  if (video && !video.paused) {
    video.pause();
  }
}

function unloadCard(fileId) {
  const cardData = loadedCards.get(fileId);
  if (!cardData || !cardData.loaded) return;
  
  const placeholder = document.createElement('div');
  placeholder.className = 'feed-item';
  placeholder.dataset.fileId = fileId;
  placeholder.style.minHeight = '400px';
  placeholder.innerHTML = '<div class="loading">...</div>';
  
  cardData.element.replaceWith(placeholder);
  cardData.element = placeholder;
  cardData.loaded = false;
  
  cardObserver.observe(placeholder);
}

function createFeedItem(item) {
  const div = document.createElement('div');
  div.className = 'feed-item';
  div.dataset.fileId = item.id;
  
  const profile = profiles.get(item.profile);
  const isFollowing = following.has(item.profile);
  
  const mediaContent = getMediaContent(item);
  
  div.innerHTML = `
    <div class="feed-item-header">
      <div class="feed-item-profile" data-profile="${item.profile}">
        <img src="${profile.avatar}" alt="${profile.name}" class="feed-item-avatar">
        <div class="feed-item-profile-info">
          <div class="feed-item-profile-name">${profile.name}</div>
          <div class="feed-item-date">${new Date(item.date).toLocaleDateString('pt-BR')}</div>
        </div>
      </div>
      <div class="feed-item-header-actions">
        ${item.profile !== currentUser.uid ? `
          <button class="btn-follow-small ${isFollowing ? 'following' : ''}" data-profile="${item.profile}">
            ${isFollowing ? 'Seguindo' : 'Seguir'}
          </button>
        ` : ''}
        <button class="btn-more" data-file-id="${item.id}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
          </svg>
        </button>
      </div>
    </div>
    ${mediaContent}
    <div class="feed-item-actions">
      <button class="btn-action btn-like" data-file-id="${item.id}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        <span class="like-count">0</span>
      </button>
      <button class="btn-action btn-comments" data-file-id="${item.id}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span class="comment-count">0</span>
      </button>
    </div>
  `;
  
  setupFeedItemListeners(div, item);
  loadFileData(item.id, div);
  
  return div;
}

function getMediaContent(item) {
  const ext = item.name.split('.').pop().toLowerCase();
  
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
    return createVideoPlayer(item);
  }
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return `<div class="feed-item-media-container">
      <img src="${item.url}" alt="" class="feed-item-media">
    </div>`;
  }
  
  if (['txt', 'md'].includes(ext)) {
    return `<div class="document-viewer">
      <div class="text-viewer" data-url="${item.url}">Carregando...</div>
    </div>`;
  }
  
  if (ext === 'pdf') {
    return createPDFViewer(item);
  }
  
  if (['ppt', 'pptx'].includes(ext)) {
    return createPPTViewer(item);
  }
  
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return createExcelViewer(item);
  }
  
  if (['js', 'py', 'java', 'cpp', 'html', 'css', 'json', 'xml'].includes(ext)) {
    return createCodeViewer(item, ext);
  }
  
  return '<div class="empty-state">Formato não suportado</div>';
}

// ==================== REPRODUTOR DE VÍDEO ====================
function createVideoPlayer(item) {
  const videoId = `video-${item.id}`;
  return `
    <div class="video-player" data-video-id="${videoId}">
      <video id="${videoId}" preload="metadata" ${!userSettings.autoaudio ? 'muted' : ''}>
        <source src="${item.url}" type="video/mp4">
      </video>
      <div class="video-controls">
        <div class="video-progress">
          <div class="video-progress-bar"></div>
          <div class="video-progress-handle"></div>
        </div>
        <div class="video-bottom-controls">
          <button class="video-play-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
          <span class="video-time">0:00 / 0:00</span>
          <button class="video-volume-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function setupVideoPlayer(playerElement) {
  const video = playerElement.querySelector('video');
  const controls = playerElement.querySelector('.video-controls');
  const playBtn = playerElement.querySelector('.video-play-btn');
  const progress = playerElement.querySelector('.video-progress');
  const progressBar = playerElement.querySelector('.video-progress-bar');
  const progressHandle = playerElement.querySelector('.video-progress-handle');
  const timeDisplay = playerElement.querySelector('.video-time');
  const volumeBtn = playerElement.querySelector('.video-volume-btn');
  
  let controlsTimeout;
  let isDragging = false;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && userSettings.autoplay) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.5 });
  
  observer.observe(playerElement);
  
  function showControls() {
    controls.classList.add('show');
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      if (!video.paused && !isDragging) {
        controls.classList.remove('show');
      }
    }, 5000);
  }
  
  playerElement.addEventListener('click', (e) => {
    if (e.target.closest('.video-controls')) return;
    
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
    showControls();
  });
  
  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  });
  
  video.addEventListener('play', () => {
    playBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
  });
  
  video.addEventListener('pause', () => {
    playBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    showControls();
  });
  
  video.addEventListener('timeupdate', () => {
    const percent = (video.currentTime / video.duration) * 100;
    progressBar.style.width = percent + '%';
    progressHandle.style.left = percent + '%';
    
    timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
  });
  
  progress.addEventListener('click', (e) => {
    const rect = progress.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = percent * video.duration;
  });
  
  volumeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    video.muted = !video.muted;
    volumeBtn.innerHTML = video.muted ? 
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>' :
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>';
  });
  
  playerElement.addEventListener('mousemove', showControls);
  controls.addEventListener('mouseenter', () => {
    isDragging = true;
    clearTimeout(controlsTimeout);
  });
  controls.addEventListener('mouseleave', () => {
    isDragging = false;
    showControls();
  });
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ==================== VIEWERS PARA DOCUMENTOS ====================
function createPDFViewer(item) {
  return `<div class="document-viewer pdf-viewer" data-url="${item.url}">
    <canvas class="pdf-page"></canvas>
    <div class="document-controls">
      <button class="pdf-prev">Anterior</button>
      <span class="page-indicator">1 / 1</span>
      <button class="pdf-next">Próxima</button>
    </div>
  </div>`;
}

function createPPTViewer(item) {
  return `<div class="document-viewer ppt-viewer" data-url="${item.url}">
    <img class="ppt-slide" src="" alt="Slide">
    <div class="document-controls">
      <button class="ppt-prev">Anterior</button>
      <span class="page-indicator">1 / 1</span>
      <button class="ppt-next">Próxima</button>
    </div>
  </div>`;
}

function createExcelViewer(item) {
  return `<div class="document-viewer excel-viewer" data-url="${item.url}">
    <table class="excel-table">
      <thead></thead>
      <tbody></tbody>
    </table>
  </div>`;
}

function createCodeViewer(item, language) {
  return `<div class="document-viewer">
    <div class="code-viewer" data-url="${item.url}" data-language="${language}">
      Carregando código...
    </div>
  </div>`;
}

async function loadTextContent(element) {
  const url = element.dataset.url;
  try {
    const response = await fetch(url);
    const text = await response.text();
    element.textContent = text;
  } catch (error) {
    element.textContent = 'Erro ao carregar arquivo';
  }
}

async function loadCodeContent(element) {
  const url = element.dataset.url;
  const language = element.dataset.language;
  
  try {
    const response = await fetch(url);
    const code = await response.text();
    const lines = code.split('\n');
    
    element.innerHTML = lines.map((line, i) => `
      <div class="code-line">
        <span class="code-line-number">${i + 1}</span>
        <span class="code-line-content">${highlightCode(line, language)}</span>
      </div>
    `).join('');
  } catch (error) {
    element.textContent = 'Erro ao carregar código';
  }
}

function highlightCode(line, language) {
  return line
    .replace(/\b(function|const|let|var|if|else|for|while|return|class|import|export)\b/g, '<span class="code-keyword">$1</span>')
    .replace(/(['"`])(.*?)\1/g, '<span class="code-string">$1$2$1</span>')
    .replace(/(\/\/.*$)/g, '<span class="code-comment">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="code-number">$1</span>');
}

// ==================== SETUP LISTENERS ====================
function setupFeedItemListeners(div, item) {
  div.querySelector('.feed-item-profile').addEventListener('click', () => {
    showProfile(item.profile);
  });
  
  const followBtn = div.querySelector('.btn-follow-small');
  if (followBtn) {
    followBtn.addEventListener('click', async () => {
      await toggleFollow(item.profile);
      followBtn.classList.toggle('following');
      followBtn.textContent = followBtn.classList.contains('following') ? 'Seguindo' : 'Seguir';
    });
  }
  
  const moreBtn = div.querySelector('.btn-more');
  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showMoreMenu(e.target, item);
  });
  
  div.querySelector('.btn-like').addEventListener('click', async () => {
    await toggleLike(item.id, div);
  });
  
  div.querySelector('.btn-comments').addEventListener('click', () => {
    openCommentsModal(item.id);
  });
  
  const videoPlayer = div.querySelector('.video-player');
  if (videoPlayer) {
    setupVideoPlayer(videoPlayer);
  }
  
  const textViewer = div.querySelector('.text-viewer');
  if (textViewer) {
    loadTextContent(textViewer);
  }
  
  const codeViewer = div.querySelector('.code-viewer');
  if (codeViewer) {
    loadCodeContent(codeViewer);
  }
}

// ==================== MODAL DE COMENTÁRIOS ====================
function openCommentsModal(fileId) {
  currentCommentsFileId = fileId;
  commentsModal.classList.add('show');
  loadComments(fileId);
}

closeCommentsModal.addEventListener('click', () => {
  commentsModal.classList.remove('show');
  currentCommentsFileId = null;
});

async function loadComments(fileId) {
  commentsModalBody.innerHTML = '<div class="loading">Carregando comentários...</div>';
  
  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('file_id', fileId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    if (comments.length === 0) {
      commentsModalBody.innerHTML = '<div class="empty-state">Nenhum comentário ainda</div>';
    } else {
      commentsModalBody.innerHTML = comments.map(c => `
        <div class="comment">
          <div class="comment-user">${c.user_name}</div>
          <div class="comment-text">${c.text}</div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Erro ao carregar comentários:', error);
    commentsModalBody.innerHTML = '<div class="empty-state">Erro ao carregar</div>';
  }
}

modalCommentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentCommentsFileId) return;
  
  const input = modalCommentForm.querySelector('.comment-input');
  const text = input.value.trim();
  if (!text) return;
  
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        file_id: currentCommentsFileId,
        user_id: currentUser.uid,
        user_name: currentUser.displayName,
        text: text,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    const commentEl = document.createElement('div');
    commentEl.className = 'comment';
    commentEl.innerHTML = `
      <div class="comment-user">${data.user_name}</div>
      <div class="comment-text">${data.text}</div>
    `;
    commentsModalBody.appendChild(commentEl);
    
    const card = document.querySelector(`[data-file-id="${currentCommentsFileId}"]`);
    if (card) {
      const countEl = card.querySelector('.comment-count');
      countEl.textContent = parseInt(countEl.textContent) + 1;
    }
    
    input.value = '';
  } catch (error) {
    console.error('Erro ao comentar:', error);
    alert('Erro ao adicionar comentário');
  }
});

// ==================== PESQUISA ====================
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  
  clearTimeout(searchTimeout);
  
  if (!query) {
    searchOverlay.classList.remove('show');
    return;
  }
  
  searchOverlay.classList.add('show');
  
  searchTimeout = setTimeout(() => {
    performSearch(query);
  }, 300);
});

searchInput.addEventListener('focus', () => {
  if (searchInput.value.trim()) {
    searchOverlay.classList.add('show');
  }
});

searchOverlay.addEventListener('click', (e) => {
  if (e.target === searchOverlay) {
    searchOverlay.classList.remove('show');
    searchInput.value = '';
  }
});

async function performSearch(query) {
  searchResultsGrid.innerHTML = '<div class="loading">Pesquisando...</div>';
  
  const results = allMedia.filter(item => 
    item.profile.toLowerCase().includes(query) && 
    !hiddenFiles.has(item.id)
  );
  
  try {
    const { data: searchIndex } = await supabase
      .from('search_index')
      .select('file_id')
      .ilike('keyword', `%${query}%`)
      .limit(20);
    
    if (searchIndex) {
      const fileIds = new Set(searchIndex.map(s => s.file_id));
      allMedia.forEach(item => {
        if (fileIds.has(item.id) && !results.some(r => r.id === item.id)) {
          results.push(item);
        }
      });
    }
  } catch (error) {
    console.error('Erro na busca:', error);
  }
  
  if (results.length === 0) {
    searchResultsGrid.innerHTML = '<div class="empty-state">Nenhum resultado</div>';
    return;
  }
  
  searchResultsGrid.innerHTML = '';
  results.forEach(item => {
    const resultItem = document.createElement('div');
    resultItem.className = 'discover-item';
    resultItem.innerHTML = `
      <img src="${item.url}" alt="" class="discover-item-image">
      <div class="discover-item-overlay">
        <div class="discover-item-profile">${item.profile}</div>
      </div>
    `;
    resultItem.addEventListener('click', () => {
      showMediaModal(item);
      searchOverlay.classList.remove('show');
    });
    searchResultsGrid.appendChild(resultItem);
  });
}

// ==================== SUPABASE - CARREGAR DADOS ====================
async function loadFileData(fileId, element) {
  try {
    const { data: likes, error: likesError } = await supabase
      .from('likes')
      .select('user_id')
      .eq('file_id', fileId);
    
    if (!likesError && likes) {
      const likeCount = likes.length;
      const isLiked = likes.some(l => l.user_id === currentUser.uid);
      
      const likeBtn = element.querySelector('.btn-like');
      const likeCountEl = likeBtn.querySelector('.like-count');
      likeCountEl.textContent = likeCount;
      
      if (isLiked) {
        likeBtn.classList.add('liked');
        likeBtn.querySelector('svg').style.fill = '#ef4444';
      }
    }
    
    const { count, error: commentsError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('file_id', fileId);
    
    if (!commentsError) {
      const commentCountEl = element.querySelector('.comment-count');
      commentCountEl.textContent = count || 0;
    }
    
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
  }
}

// ==================== SUPABASE - LIKES ====================
async function toggleLike(fileId, element) {
  try {
    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('file_id', fileId)
      .eq('user_id', currentUser.uid)
      .single();
    
    if (existing) {
      await supabase
        .from('likes')
        .delete()
        .eq('file_id', fileId)
        .eq('user_id', currentUser.uid);
      
      const likeBtn = element.querySelector('.btn-like');
      likeBtn.classList.remove('liked');
      likeBtn.querySelector('svg').style.fill = 'none';
      
      const likeCount = parseInt(likeBtn.querySelector('.like-count').textContent);
      likeBtn.querySelector('.like-count').textContent = likeCount - 1;
      
    } else {
      await supabase
        .from('likes')
        .insert({
          file_id: fileId,
          user_id: currentUser.uid,
          created_at: new Date().toISOString()
        });
      
      const likeBtn = element.querySelector('.btn-like');
      likeBtn.classList.add('liked');
      likeBtn.querySelector('svg').style.fill = '#ef4444';
      
      const likeCount = parseInt(likeBtn.querySelector('.like-count').textContent);
      likeBtn.querySelector('.like-count').textContent = likeCount + 1;
    }
    
  } catch (error) {
    console.error('Erro ao curtir:', error);
  }
}

// ==================== SEGUIR/DEIXAR DE SEGUIR ====================
async function toggleFollow(profileName) {
  try {
    if (following.has(profileName)) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.uid)
        .eq('following_profile', profileName);
      
      following.delete(profileName);
      
    } else {
      await supabase
        .from('follows')
        .insert({
          follower_id: currentUser.uid,
          following_profile: profileName,
          created_at: new Date().toISOString()
        });
      
      following.add(profileName);
    }
    
    const profile = profiles.get(profileName);
    if (profile) {
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_profile', profileName);
      
      profile.followers = count || 0;
    }
    
  } catch (error) {
    console.error('Erro ao seguir:', error);
  }
}

async function loadFollowing() {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('following_profile')
      .eq('follower_id', currentUser.uid);
    
    if (!error && data) {
      data.forEach(f => following.add(f.following_profile));
    }
  } catch (error) {
    console.error('Erro ao carregar seguindo:', error);
  }
}

// ==================== OCULTAR ARQUIVOS ====================
function showMoreMenu(button, item) {
  document.querySelectorAll('.more-dropdown').forEach(m => m.remove());
  
  const menu = document.createElement('div');
  menu.className = 'more-dropdown';
  menu.innerHTML = `
    <button class="dropdown-item" data-action="hide">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
      Ocultar
    </button>
    ${following.has(item.profile) ? `
      <button class="dropdown-item" data-action="unfollow">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="8.5" cy="7" r="4"></circle>
          <line x1="23" y1="11" x2="17" y2="11"></line>
        </svg>
        Deixar de seguir
      </button>
    ` : ''}
  `;
  
  button.parentElement.style.position = 'relative';
  button.parentElement.appendChild(menu);
  
  menu.querySelectorAll('.dropdown-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      
      if (action === 'hide') {
        await hideFile(item.id);
      } else if (action === 'unfollow') {
        await toggleFollow(item.profile);
      }
      
      menu.remove();
    });
  });
  
  setTimeout(() => {
    document.addEventListener('click', function closeMenu() {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    });
  }, 100);
}

async function hideFile(fileId) {
  try {
    await supabase
      .from('hidden_files')
      .insert({
        user_id: currentUser.uid,
        file_id: fileId,
        created_at: new Date().toISOString()
      });
    
    hiddenFiles.add(fileId);
    
    const element = document.querySelector(`[data-file-id="${fileId}"]`);
    if (element) {
      element.remove();
    }
    
  } catch (error) {
    console.error('Erro ao ocultar arquivo:', error);
  }
}

async function loadHiddenFiles() {
  try {
    const { data, error } = await supabase
      .from('hidden_files')
      .select('file_id')
      .eq('user_id', currentUser.uid);
    
    if (!error && data) {
      data.forEach(h => hiddenFiles.add(h.file_id));
    }
  } catch (error) {
    console.error('Erro ao carregar arquivos ocultos:', error);
  }
}

// ==================== PERFIL ====================
async function showProfile(profileName) {
  switchView('profile');
  profileView.classList.remove('hidden');
  
  const profile = profiles.get(profileName);
  if (!profile) return;
  
  const { count: followersCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_profile', profileName);
  
  const { data: likesData } = await supabase
    .from('likes')
    .select('file_id')
    .in('file_id', profile.files);
  
  profile.followers = followersCount || 0;
  profile.totalLikes = likesData?.length || 0;
  
  const isFollowing = following.has(profileName);
  const isOwnProfile = profileName === currentUser.uid;
  
  profileView.querySelector('.profile-avatar-large').style.backgroundImage = `url(${profile.avatar})`;
  profileView.querySelector('.profile-avatar-large').style.backgroundSize = 'cover';
  profileView.querySelector('.profile-name').textContent = profile.name;
  profileView.querySelector('.stat-value').textContent = profile.followers;
  profileView.querySelectorAll('.stat-value')[1].textContent = profile.totalLikes;
  profileView.querySelectorAll('.stat-value')[2].textContent = profile.files.length;
  
  const followBtn = profileView.querySelector('.btn-follow');
  if (isOwnProfile) {
    followBtn.style.display = 'none';
  } else {
    followBtn.style.display = 'block';
    followBtn.textContent = isFollowing ? 'Seguindo' : 'Seguir';
    followBtn.className = isFollowing ? 'btn-follow following' : 'btn-follow';
    
    followBtn.onclick = async () => {
      await toggleFollow(profileName);
      showProfile(profileName);
    };
  }
  
  const grid = profileView.querySelector('.profile-grid');
  grid.innerHTML = '';
  
  const profileFiles = allMedia.filter(m => m.profile === profileName);
  profileFiles.forEach(file => {
    const item = document.createElement('div');
    item.className = 'discover-item';
    item.innerHTML = `
      <img src="${file.url}" alt="" class="discover-item-image">
    `;
    item.addEventListener('click', () => showMediaModal(file));
    grid.appendChild(item);
  });
}

// ==================== DESCOBRIR ====================
function renderDiscover() {
  const grid = discoverView.querySelector('.discover-grid');
  grid.innerHTML = '';
  
  const discoverFiles = allMedia.filter(m => 
    !following.has(m.profile) && 
    !hiddenFiles.has(m.id) &&
    m.profile !== currentUser.uid
  );
  
  discoverFiles.forEach(file => {
    const item = document.createElement('div');
    item.className = 'discover-item';
    item.innerHTML = `
      <img src="${file.url}" alt="" class="discover-item-image">
      <div class="discover-item-overlay">
        <div class="discover-item-profile">${file.profile}</div>
      </div>
    `;
    item.addEventListener('click', () => showMediaModal(file));
    grid.appendChild(item);
  });
  
  if (discoverFiles.length === 0) {
    grid.innerHTML = '<div class="empty-state">Nenhum conteúdo para descobrir</div>';
  }
}

// ==================== MODAL ====================
function showMediaModal(item) {
  const modalContent = mediaModal.querySelector('.modal-feed-item');
  modalContent.innerHTML = '';
  
  const feedItem = createFeedItem(item);
  modalContent.appendChild(feedItem);
  
  mediaModal.classList.remove('hidden');
}

mediaModal.querySelector('.modal-close').addEventListener('click', () => {
  mediaModal.classList.add('hidden');
});

mediaModal.querySelector('.modal-overlay').addEventListener('click', () => {
  mediaModal.classList.add('hidden');
});

// ==================== FILTROS ====================
function renderFilter() {
  const select = document.getElementById('profileFilter');
  select.innerHTML = '<option value="all">Todos os perfis</option>';
  
  profiles.forEach((profile, name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
  });
});

document.getElementById('profileFilter')?.addEventListener('change', applyFilters);

function applyFilters() {
  const typeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
  const profileFilter = document.getElementById('profileFilter')?.value || 'all';
  
  switchView('feed');
  
  const filtered = allMedia.filter(item => {
    if (hiddenFiles.has(item.id)) return false;
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (profileFilter !== 'all' && item.profile !== profileFilter) return false;
    return true;
  });
  
  feedView.innerHTML = '';
  loadedCards.clear();
  activeCards = [];
  
  filtered.forEach(item => {
    const placeholder = document.createElement('div');
    placeholder.className = 'feed-item';
    placeholder.dataset.fileId = item.id;
    placeholder.style.minHeight = '400px';
    feedView.appendChild(placeholder);
    
    cardObserver.observe(placeholder);
    loadedCards.set(item.id, { item, element: placeholder, loaded: false });
  });
  
  if (filtered.length === 0) {
    feedView.innerHTML = '<div class="empty-state">Nenhum resultado</div>';
  }
}

// ==================== CONFIGURAÇÕES ====================
function setupSettings() {
  const themeSelect = document.getElementById('themeSelect');
  const autoplayToggle = document.getElementById('autoplayToggle');
  const autoaudioToggle = document.getElementById('autoaudioToggle');
  
  if (!themeSelect || !autoplayToggle || !autoaudioToggle) return;
  
  themeSelect.value = userSettings.theme;
  if (userSettings.autoplay) autoplayToggle.classList.add('active');
  if (userSettings.autoaudio) autoaudioToggle.classList.add('active');
  
  themeSelect.addEventListener('change', (e) => {
    userSettings.theme = e.target.value;
    localStorage.setItem('theme', userSettings.theme);
    applyTheme();
  });
  
  autoplayToggle.addEventListener('click', () => {
    autoplayToggle.classList.toggle('active');
    userSettings.autoplay = autoplayToggle.classList.contains('active');
    localStorage.setItem('autoplay', userSettings.autoplay);
  });
  
  autoaudioToggle.addEventListener('click', () => {
    autoaudioToggle.classList.toggle('active');
    userSettings.autoaudio = autoaudioToggle.classList.contains('active');
    localStorage.setItem('autoaudio', userSettings.autoaudio);
  });
}

function applyTheme() {
  if (userSettings.theme === 'dark') {
    document.documentElement.style.colorScheme = 'dark';
  } else if (userSettings.theme === 'light') {
    document.documentElement.style.colorScheme = 'light';
  } else {
    document.documentElement.style.colorScheme = '';
  }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
      e.preventDefault();
      return false;
    }
  });
  
  document.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
      e.preventDefault();
      return false;
    }
  });
}

console.log('✅ Repox iniciado com sucesso!');
