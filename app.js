const App = (() => {
  // --- Config ---
  const DATA_FOLDER = 'data/';
  const SONGS = [
    // Example: { number: '001', title: 'Amazing Grace', key: 'G', beat: '3/4', base: 'amazing_grace' }
    // Add your songs here, or load from a JSON file if you prefer
    { number: '1', title: 'Amazing Grace', key: 'G', beat: '3/4', base: 'amazing_grace' },
    // ... more songs
  ];
  const LANGUAGES = [
    { code: 'hiligaynon', label: 'Hiligaynon' },
    { code: 'english', label: 'English' },
    { code: 'tagalog', label: 'Tagalog' }
  ];
  let currentLanguage = localStorage.getItem('language') || 'hiligaynon';
  let currentLyricsSong = null;
  let currentLyricsLang = 'hiligaynon';
  let pageHistory = [];
  let currentEditFileKey = null;
  let currentEditFileName = null;

  // --- UI Helpers ---
  function $(sel) { return document.querySelector(sel); }
  function showSidebar(open) {
    $('#sidebar').style.width = open ? '260px' : '0';
  }
  function showLangMenu(show) {
    $('#lang-menu').style.display = show ? 'block' : 'none';
  }

  // --- Navigation ---
  function getAllSongs() {
    const userSongs = JSON.parse(localStorage.getItem('userSongs') || '[]');
    // Combine and sort by number
    return [...SONGS, ...userSongs].sort((a, b) => a.number.localeCompare(b.number));
  }

  function showHome() {
    setTitle('Church Songbook');
    $('#lyrics-lang-btn').style.display = 'none';
    $('#lyrics-lang-menu').style.display = 'none';
    let html = `<ul class="song-list">`;
    getAllSongs().forEach(song => {
      html += `
        <li>
          <span class="title" onclick="App.showSong('${song.number}')">${song.number}. ${song.title}</span>
          <button class="fav-btn" onclick="App.toggleFavorite(event, '${song.number}')">
            ${isFavorite(song.number) ? '★' : '☆'}
          </button>
        </li>`;
    });
    html += `</ul>`;
    $('#main-content').innerHTML = html;
    closeSidebar();
  }

  function showSong(number, lang) {
    const song = getAllSongs().find(s => s.number === number);
    if (!song) return;
    document.getElementById('lyrics-lang-btn').style.display = 'flex';
    document.getElementById('lyrics-lang-menu').style.display = 'none';
    currentLyricsSong = song;
    currentLyricsLang = lang || song.defaultLang || 'hiligaynon';

    loadLyrics(song, currentLyricsLang).then(({ lyrics, foundLang }) => {
      let meta = `<div class="song-meta" id="song-meta">
        Key: <span id="song-key">${song.key}</span> | 
        Beat: <span id="song-beat">${song.beat}</span>
        <button class="meta-edit-btn" onclick="editSongMeta('${song.number}')">✏️</button>
      </div>`;
      let msg = '';
      if (!foundLang && currentLyricsLang !== 'hiligaynon') {
        msg = `<div style="color:#b91c1c;margin-bottom:1em;">Translation not available. Showing default lyrics.</div>`;
      }
      document.getElementById('main-content').innerHTML = `
        <div class="back-btn" onclick="goHome()">
          <span class="back-arrow">&#8592;</span> Back
        </div>
        <div class="lyrics-title">${song.title}</div>
        ${meta}
        ${msg}
        <div class="lyrics-content">${lyrics}</div>
      `;
    });
  }

  function showFavorites() {
    setTitle('Favorites');
    $('#lyrics-lang-btn').style.display = 'none';
    $('#lyrics-lang-menu').style.display = 'none';
    const favs = getFavorites();
    let html = `<ul class="song-list">`;
    getAllSongs().filter(s => favs.includes(s.number)).forEach(song => {
      html += `
        <li>
          <span class="title" onclick="App.showSong('${song.number}')">${song.number}. ${song.title}</span>
          <button class="fav-btn" onclick="App.toggleFavorite(event, '${song.number}')">★</button>
        </li>`;
    });
    html += `</ul>`;
    $('#main-content').innerHTML = html;
    closeSidebar();
  }

  function showAddSong() {
    setTitle('Add Song');
    document.getElementById('lyrics-lang-btn').style.display = 'none';
    document.getElementById('lyrics-lang-menu').style.display = 'none';
    document.getElementById('main-content').innerHTML = `
      <div class="add-song-card">
        <div class="add-song-tabs">
          <button id="tab-upload" class="active" onclick="switchAddSongTab('upload')">Upload .txt File</button>
          <button id="tab-manual" onclick="switchAddSongTab('manual')">Input Lyrics</button>
        </div>
        <div id="add-song-upload" class="add-song-tab-content">
          <form id="add-song-form-upload">
            <label>Song Number:<input type="text" name="number" required></label>
            <label>Title:<input type="text" name="title" required></label>
            <label>Key:<input type="text" name="key" required></label>
            <label>Beat:<input type="text" name="beat" required></label>
            <label>Base Name:<input type="text" name="base" required></label>
            <label>Language:
              <select name="lang" required>
                <option value="hiligaynon">Hiligaynon</option>
                <option value="english">English</option>
                <option value="tagalog">Tagalog</option>
              </select>
            </label>
            <label>Lyrics File (.txt):<input type="file" name="lyrics" accept=".txt" required></label>
            <button type="submit" class="add-song-btn">Add Song</button>
          </form>
        </div>
        <div id="add-song-manual" class="add-song-tab-content" style="display:none;">
          <form id="add-song-form-manual">
            <label>Song Number:<input type="text" name="number" required></label>
            <label>Title:<input type="text" name="title" required></label>
            <label>Key:<input type="text" name="key" required></label>
            <label>Beat:<input type="text" name="beat" required></label>
            <label>Base Name:<input type="text" name="base" required></label>
            <label>Language:
              <select name="lang" required>
                <option value="hiligaynon">Hiligaynon</option>
                <option value="english">English</option>
                <option value="tagalog">Tagalog</option>
              </select>
            </label>
            <label>Lyrics:<textarea name="lyrics" rows="7" required placeholder="Paste or type lyrics here..."></textarea></label>
            <button type="submit" class="add-song-btn">Add Song</button>
          </form>
        </div>
        <div class="add-song-note">
          <span>Note:</span> In offline mode, file uploads and saving will only work if the app is running from a local server or as a PWA. Otherwise, the song will only be available in this session.
        </div>
      </div>
    `;
    // Attach handlers
    document.getElementById('add-song-form-upload').onsubmit = handleAddSongUpload;
    document.getElementById('add-song-form-manual').onsubmit = handleAddSongManual;
  }

  function showDeleteSongs() {
    setTitle('Delete Songs');
    $('#lyrics-lang-btn').style.display = 'none';
    $('#lyrics-lang-menu').style.display = 'none';
    let html = `<form id="delete-songs-form"><ul class="song-list">`;
    getAllSongs().forEach(song => {
      html += `
        <li>
          <label>
            <input type="checkbox" name="delete" value="${song.number}">
            ${song.number}. ${song.title}
          </label>
        </li>`;
    });
    html += `</ul><button type="submit">Delete Selected</button></form>`;
    $('#main-content').innerHTML = html;
    $('#delete-songs-form').onsubmit = handleDeleteSongs;
    closeSidebar();
  }

  function showAbout() {
    setTitle('About');
    $('#lyrics-lang-btn').style.display = 'none';
    $('#lyrics-lang-menu').style.display = 'none';
    $('#main-content').innerHTML = `
      <h2>About</h2>
      <p>Developer: Your Name</p>
      <p>Description: Offline Church Song Lyrics Collection</p>
      <p>Version: 1.0.0</p>
    `;
    closeSidebar();
  }

  function showData() {
    setTitle('Data');
    document.getElementById('lyrics-lang-btn').style.display = 'none';
    document.getElementById('lyrics-lang-menu').style.display = 'none';

    const allSongs = getAllSongs();
    const allLangs = ['hiligaynon', 'english', 'tagalog'];
    let files = [];

    allSongs.forEach(song => {
      allLangs.forEach(lang => {
        files.push({
          fname: `${song.number}_${song.base}_${lang}.txt`,
          key: `lyrics_${song.number}_${song.base}_${lang}`,
          title: song.title,
          lang
        });
      });
    });

    files = files.filter((file, idx, arr) =>
      arr.findIndex(f => f.fname === file.fname) === idx
    );

    let html = `<h2>Song Data Files</h2><ul id="data-file-list" class="data-file-list">`;
    files.forEach(file => {
      const isLocal = !!localStorage.getItem(file.key);
      html += `
        <li class="data-file-item">
          <span class="data-file-name">
            ${file.fname}${isLocal ? ' <span style="color:#3a5a40;font-size:0.9em;">(local)</span>' : ''}
          </span>
          <button class="edit-btn" onclick="openDataFileEditor('${file.fname}')">Edit</button>
        </li>`;
    });
    html += `</ul>`;
    document.getElementById('main-content').innerHTML = html;
  }

  // --- Song Data ---
  // --- Utility for localStorage lyrics ---
  function getLyricsKey(fname) {
    return 'lyrics_' + fname.replace(/[^a-zA-Z0-9_]/g, '');
  }

  // Load lyrics: check localStorage first, then fallback to file
  async function loadLyrics(song, lang) {
    const key = `lyrics_${song.number}_${song.base}_${lang}`;
    let lyrics = localStorage.getItem(key);
    if (lyrics !== null) {
      return { lyrics, foundLang: true };
    }
    // Try fetching from data folder
    const fname = `${song.number}_${song.base}_${lang}.txt`;
    try {
      const response = await fetch(`data/${fname}?v=${Date.now()}`);
      if (response.ok) {
        lyrics = await response.text();
        return { lyrics, foundLang: true };
      } else {
        // Fallback to hiligaynon if not found and not already hiligaynon
        if (lang !== 'hiligaynon') {
          const fallbackKey = `lyrics_${song.number}_${song.base}_hiligaynon`;
          let fallbackLyrics = localStorage.getItem(fallbackKey);
          if (fallbackLyrics !== null) {
            return { lyrics: fallbackLyrics, foundLang: false };
          }
          const fallbackFname = `${song.number}_${song.base}_hiligaynon.txt`;
          const fallbackResponse = await fetch(`data/${fallbackFname}?v=${Date.now()}`);
          if (fallbackResponse.ok) {
            fallbackLyrics = await fallbackResponse.text();
            return { lyrics: fallbackLyrics, foundLang: false };
          }
        }
        return { lyrics: 'Lyrics not found.', foundLang: false };
      }
    } catch {
      return { lyrics: 'Lyrics not found.', foundLang: false };
    }
  }

  // --- Favorites ---
  function getFavorites() {
    return JSON.parse(localStorage.getItem('favorites') || '[]');
  }
  function isFavorite(number) {
    return getFavorites().includes(number);
  }
  function toggleFavorite(e, number) {
    e.stopPropagation();
    let favs = getFavorites();
    if (favs.includes(number)) {
      favs = favs.filter(n => n !== number);
    } else {
      favs.push(number);
    }
    localStorage.setItem('favorites', JSON.stringify(favs));
    showHome();
  }

  // --- Add/Delete Songs (for demo, only updates in-memory list) ---
  function handleAddSong(e) {
    e.preventDefault();
    alert('Add song feature is a demo. For full offline support, use a PWA or local server.');
  }
  function handleDeleteSongs(e) {
    e.preventDefault();
    const form = e.target;
    const toDelete = Array.from(form.delete)
      .filter(input => input.checked)
      .map(input => input.value);

    if (toDelete.length === 0) {
      alert('Please select at least one song to delete.');
      return;
    }

    // Remove from userSongs in localStorage
    let userSongs = JSON.parse(localStorage.getItem('userSongs') || '[]');
    userSongs = userSongs.filter(song => !toDelete.includes(song.number));
    localStorage.setItem('userSongs', JSON.stringify(userSongs));

    // Remove lyrics for all languages for each deleted song
    toDelete.forEach(number => {
      // Find the base name for this song (from userSongs or built-in)
      let song = SONGS.find(s => s.number === number) || userSongs.find(s => s.number === number);
      if (!song) return;
      ['hiligaynon', 'english', 'tagalog'].forEach(lang => {
        localStorage.removeItem(`lyrics_${number}_${song.base}_${lang}`);
      });
    });

    alert('Selected songs deleted!');
    showHome();
  }

  // --- Language ---
  function showLanguageMenu() {
    showLangMenu(true);
    document.addEventListener('click', hideLangMenu, { once: true });
  }
  function hideLangMenu(e) {
    if (!e || !e.target.closest('.lang-menu')) showLangMenu(false);
  }
  function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    showLangMenu(false);
    // Refresh current view
    if ($('#page-title').textContent === 'Church Songbook') showHome();
    else if ($('#page-title').textContent === 'Favorites') showFavorites();
    else if ($('#page-title').textContent === 'About') showAbout();
    else if ($('#page-title').textContent === 'Data') showData();
    else {
      // If on a song page, reload song
      let match = $('#page-title').textContent.match(/^(\d+)\./);
      if (match) showSong(match[1]);
    }
  }

  // --- Lyrics Language Menu (on lyrics page only) ---
  function showLyricsLangMenu(event) {
    event.stopPropagation(); // Prevent immediate hide
    const menu = document.getElementById('lyrics-lang-menu');
    menu.style.display = 'block';

    // Remove any previous listeners
    document.removeEventListener('click', hideLyricsLangMenu);

    // Hide menu when clicking outside
    setTimeout(() => {
      document.addEventListener('click', hideLyricsLangMenu);
    }, 10);
  }
  function hideLyricsLangMenu(e) {
    const menu = document.getElementById('lyrics-lang-menu');
    if (!e || !e.target.closest('.lyrics-lang-menu')) {
      menu.style.display = 'none';
      document.removeEventListener('click', hideLyricsLangMenu);
    }
  }
  function setLyricsLanguage(lang) {
    if (!currentLyricsSong) return;
    currentLyricsLang = lang;
    document.getElementById('lyrics-lang-menu').style.display = 'none';
    showSong(currentLyricsSong.number, currentLyricsLang);
  }

  // --- Utility ---
  function setTitle(title) {
    $('#page-title').textContent = title;
  }
  function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').style.display = 'block';
    document.getElementById('sidebar-toggle-btn').classList.add('open');
  }
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').style.display = 'none';
    document.getElementById('sidebar-toggle-btn').classList.remove('open');
  }
  function toggleSidebar() {
    if (document.getElementById('sidebar').classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  // --- Expose API ---
  return {
    showHome, showSong, showFavorites, showAddSong, showDeleteSongs, showAbout, showData,
    openSidebar, closeSidebar, toggleSidebar,
    showLanguageMenu, setLanguage, toggleFavorite,
    openDataFile, saveDataFile, closeDataEditor,
    showLyricsLangMenu, setLyricsLanguage,
    editSongMeta, cancelEditSongMeta
  };
})();

// --- Init ---
window.onload = App.showHome;

// --- Data File Editor: open and save using localStorage ---
async function openDataFile(fname) {
  $('#data-editor-modal').style.display = 'block';
  $('#editor-filename').textContent = fname;
  $('#editor-msg').textContent = '';
  $('#editor-save-btn').style.display = 'inline-block';
  $('#editor-text').readOnly = false;

  // 1. Try localStorage
  const key = getLyricsKey(fname);
  let lyrics = localStorage.getItem(key);

  if (lyrics !== null) {
    $('#editor-text').value = lyrics;
    $('#editor-msg').textContent = 'Editing local copy. Changes are saved in your browser.';
    return;
  }

  // 2. Try fetching from file
  try {
    lyrics = await fetch('data/' + fname).then(r => r.text());
    $('#editor-text').value = lyrics;
    $('#editor-msg').textContent = 'Editing local copy. Changes are saved in your browser.';
    // Save to localStorage for future edits
    localStorage.setItem(key, lyrics);
  } catch {
    $('#editor-text').value = 'File not found.';
    $('#editor-text').readOnly = true;
    $('#editor-save-btn').style.display = 'none';
    $('#editor-msg').textContent = 'File not found.';
  }
}

function saveDataFile() {
  const fname = $('#editor-filename').textContent;
  const key = getLyricsKey(fname);
  const newLyrics = $('#editor-text').value;
  localStorage.setItem(key, newLyrics);
  $('#editor-msg').textContent = 'Saved! Your changes are stored in your browser and will persist.';
}

function closeDataEditor() {
  $('#data-editor-modal').style.display = 'none';
}

// Add to App object:
Object.assign(App, { openDataFile, saveDataFile, closeDataEditor });

// Show the language menu when the button is clicked
document.getElementById('lyrics-lang-btn').addEventListener('click', function(event) {
  event.stopPropagation();
  document.getElementById('lyrics-lang-menu').style.display = 'block';
});

// Hide the menu when clicking outside
document.addEventListener('click', function(event) {
  const sidebar = document.getElementById('sidebar');
  if (sidebar.style.width !== '0px' && !sidebar.contains(event.target) && !event.target.classList.contains('menu-btn')) {
    closeSidebar();
  }
});

function openDataFile(fname) {
  // Your logic to open and display the file
  // For example, you can reuse loadLyrics and display in a modal or a div
  loadDataFile(fname);
}

async function loadDataFile(fname) {
  try {
    const response = await fetch('data/' + fname);
    if (response.ok) {
      const lyrics = await response.text();
      // Display lyrics in a modal or a div
      alert(lyrics); // For demo, use a modal in your real app
    } else {
      alert('File not found.');
    }
  } catch {
    alert('File not found.');
  }
}

window.App = {
  openDataFile: function(fname) {
    // Your logic here
    loadDataFile(fname);
  }
  // ... other methods
};

function showDataFileLyrics(fname) {
  // Save current page to history
  pageHistory.push(() => showData());

  const key = 'lyrics_' + fname.replace('.txt', '');
  let lyrics = localStorage.getItem(key);
  if (lyrics !== null) {
    document.getElementById('main-content').innerHTML = `
      <div class="back-btn" onclick="goHome()">
        <span class="back-arrow">&#8592;</span> Back
      </div>
      <h2>${fname} <span style="color:#3a5a40;font-size:0.9em;">(local)</span></h2>
      <pre>${lyrics}</pre>
    `;
    return;
  }
  fetch('data/' + fname)
    .then(r => r.ok ? r.text() : Promise.reject())
    .then(lyrics => {
      document.getElementById('main-content').innerHTML = `
        <div class="back-btn" onclick="goHome()">
          <span class="back-arrow">&#8592;</span> Back
        </div>
        <h2>${fname}</h2>
        <pre>${lyrics}</pre>
      `;
    })
    .catch(() => {
      document.getElementById('main-content').innerHTML = `
        <div class="back-btn" onclick="goHome()">
          <span class="back-arrow">&#8592;</span> Back
        </div>
        <h2>${fname}</h2><p>File not found.</p>`;
    });
}

window.setLyricsLanguage = App.setLyricsLanguage;

function switchAddSongTab(tab) {
  document.getElementById('tab-upload').classList.remove('active');
  document.getElementById('tab-manual').classList.remove('active');
  document.getElementById('add-song-upload').style.display = 'none';
  document.getElementById('add-song-manual').style.display = 'none';
  if (tab === 'upload') {
    document.getElementById('tab-upload').classList.add('active');
    document.getElementById('add-song-upload').style.display = '';
  } else {
    document.getElementById('tab-manual').classList.add('active');
    document.getElementById('add-song-manual').style.display = '';
  }
}

function handleAddSongManual(e) {
  e.preventDefault();
  const form = e.target;
  const number = form.number.value.trim();
  const title = form.title.value.trim();
  const key = form.key.value.trim();
  const beat = form.beat.value.trim();
  const base = form.base.value.trim();
  const lang = form.lang.value;
  const lyrics = form.lyrics.value.trim();

  // Save song metadata
  const userSongs = JSON.parse(localStorage.getItem('userSongs') || '[]');
  userSongs.push({ number, title, key, beat, base, defaultLang: lang });
  localStorage.setItem('userSongs', JSON.stringify(userSongs));

  // Save lyrics
  localStorage.setItem(`lyrics_${number}_${base}_${lang}`, lyrics);

  alert(`Song "${title}" added!`);
  showHome();
}

function handleAddSongUpload(e) {
  e.preventDefault();
  const form = e.target;
  const number = form.number.value.trim();
  const title = form.title.value.trim();
  const key = form.key.value.trim();
  const beat = form.beat.value.trim();
  const base = form.base.value.trim();
  const lang = form.lang.value;
  const file = form.lyrics.files[0];
  if (!file) {
    alert('Please select a .txt file.');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(evt) {
    const lyrics = evt.target.result;
    // Save song metadata
    const userSongs = JSON.parse(localStorage.getItem('userSongs') || '[]');
    userSongs.push({ number, title, key, beat, base, defaultLang: lang });
    localStorage.setItem('userSongs', JSON.stringify(userSongs));
    // Save lyrics
    localStorage.setItem(`lyrics_${number}_${base}_${lang}`, lyrics);

    alert(`Song "${title}" added!`);
    showHome();
  };
  reader.readAsText(file);
}

function goHome() {
  window.location.href = 'index.html';
}

function showEditSongs() {
  setTitle('Edit Songs');
  document.getElementById('lyrics-lang-btn').style.display = 'none';
  document.getElementById('lyrics-lang-menu').style.display = 'none';

  let html = `<div class="edit-song-list"><h2>Edit Songs</h2><ul class="song-list">`;
  getAllSongs().forEach(song => {
    html += `
      <li>
        <span class="title">${song.number}. ${song.title}</span>
        <button class="edit-btn" onclick="editSong('${song.number}')">Edit</button>
      </li>`;
  });
  html += `</ul></div>`;
  document.getElementById('main-content').innerHTML = html;
}

function editSong(number) {
  const song = getAllSongs().find(s => s.number === number);
  if (!song) return;

  // Try to get lyrics for all languages
  let lyricsByLang = {};
  ['hiligaynon', 'english', 'tagalog'].forEach(lang => {
    const key = `lyrics_${song.number}_${song.base}_${lang}`;
    lyricsByLang[lang] = localStorage.getItem(key) || '';
  });

  setTitle('Edit Song');
  document.getElementById('lyrics-lang-btn').style.display = 'none';
  document.getElementById('lyrics-lang-menu').style.display = 'none';
  document.getElementById('main-content').innerHTML = `
    <div class="add-song-card">
      <div class="back-btn" onclick="goHome()">
        <span class="back-arrow">&#8592;</span> Back
      </div>
      <h2>Edit Song</h2>
      <form id="edit-song-form">
        <label>Song Number:<input type="text" name="number" value="${song.number}" required readonly></label>
        <label>Title:<input type="text" name="title" value="${song.title}" required></label>
        <label>Key:<input type="text" name="key" value="${song.key}" required></label>
        <label>Beat:<input type="text" name="beat" value="${song.beat}" required></label>
        <label>Base Name:<input type="text" name="base" value="${song.base}" required readonly></label>
        <label>Lyrics (Hiligaynon):<textarea name="lyrics_hiligaynon" rows="5" required>${lyricsByLang.hiligaynon}</textarea></label>
        <label>Lyrics (English):<textarea name="lyrics_english" rows="5">${lyricsByLang.english}</textarea></label>
        <label>Lyrics (Tagalog):<textarea name="lyrics_tagalog" rows="5">${lyricsByLang.tagalog}</textarea></label>
        <button type="submit" class="add-song-btn">Save Changes</button>
      </form>
    </div>
  `;
  document.getElementById('edit-song-form').onsubmit = handleEditSong;
}

function handleEditSong(e) {
  e.preventDefault();
  const form = e.target;
  const number = form.number.value.trim();
  const title = form.title.value.trim();
  const key = form.key.value.trim();
  const beat = form.beat.value.trim();
  const base = form.base.value.trim();
  const lyrics_hiligaynon = form.lyrics_hiligaynon.value.trim();
  const lyrics_english = form.lyrics_english.value.trim();
  const lyrics_tagalog = form.lyrics_tagalog.value.trim();

  // Update song metadata in userSongs
  let userSongs = JSON.parse(localStorage.getItem('userSongs') || '[]');
  let idx = userSongs.findIndex(s => s.number === number);
  if (idx !== -1) {
    userSongs[idx] = { number, title, key, beat, base, defaultLang: userSongs[idx].defaultLang || 'hiligaynon' };
  } else {
    // If not in userSongs, add it (for built-in songs)
    userSongs.push({ number, title, key, beat, base, defaultLang: 'hiligaynon' });
  }
  localStorage.setItem('userSongs', JSON.stringify(userSongs));

  // Update lyrics in localStorage
  localStorage.setItem(`lyrics_${number}_${base}_hiligaynon`, lyrics_hiligaynon);
  if (lyrics_english) localStorage.setItem(`lyrics_${number}_${base}_english`, lyrics_english);
  if (lyrics_tagalog) localStorage.setItem(`lyrics_${number}_${base}_tagalog`, lyrics_tagalog);

  alert('Song updated!');
  showHome();
}

function openDataFileEditor(fname) {
  document.getElementById('data-editor-modal').style.display = 'block';
  document.getElementById('editor-filename').textContent = fname;
  document.getElementById('editor-msg').textContent = '';
  currentEditFileName = fname;
  currentEditFileKey = 'lyrics_' + fname.replace('.txt', '');

  // Try localStorage first
  let lyrics = localStorage.getItem(currentEditFileKey);
  if (lyrics !== null) {
    document.getElementById('editor-text').value = lyrics;
    return;
  }
  // Fallback to fetch from data folder
  fetch('data/' + fname)
    .then(r => r.ok ? r.text() : Promise.reject())
    .then(lyrics => {
      document.getElementById('editor-text').value = lyrics;
    })
    .catch(() => {
      document.getElementById('editor-text').value = '';
      document.getElementById('editor-msg').textContent = 'File not found. You can create and save new lyrics for this file.';
    });
}

function saveDataFile() {
  const lyrics = document.getElementById('editor-text').value;
  if (!currentEditFileKey) return;
  localStorage.setItem(currentEditFileKey, lyrics);
  document.getElementById('editor-msg').textContent = 'Saved! Your changes are stored in your browser and will persist.';
}

function closeDataEditor() {
  document.getElementById('data-editor-modal').style.display = 'none';
  currentEditFileKey = null;
  currentEditFileName = null;
}

window.showData = App.showData;

function editSongMeta(number) {
  const song = getAllSongs().find(s => s.number === number);
  if (!song) return;
  const metaDiv = document.getElementById('song-meta');
  metaDiv.innerHTML = `
    <form id="meta-edit-form" style="display:inline;">
      Key: <input type="text" name="key" value="${song.key}" style="width:3em;">
      | Beat: <input type="text" name="beat" value="${song.beat}" style="width:3em;">
      <button type="submit" class="meta-save-btn">Save</button>
      <button type="button" class="meta-cancel-btn" onclick="cancelEditSongMeta('${song.number}')">Cancel</button>
    </form>
  `;
  document.getElementById('meta-edit-form').onsubmit = function(e) {
    e.preventDefault();
    const key = e.target.key.value.trim();
    const beat = e.target.beat.value.trim();
    // Update in userSongs
    let userSongs = JSON.parse(localStorage.getItem('userSongs') || '[]');
    let idx = userSongs.findIndex(s => s.number === number);
    if (idx !== -1) {
      userSongs[idx].key = key;
      userSongs[idx].beat = beat;
    } else {
      // If not in userSongs, add it (override built-in)
      const orig = getAllSongs().find(s => s.number === number);
      userSongs.push({ ...orig, key, beat });
    }
    localStorage.setItem('userSongs', JSON.stringify(userSongs));
    App.showSong(number, currentLyricsLang);
  };
}

function cancelEditSongMeta(number) {
  App.showSong(number, currentLyricsLang);
}

function deleteDataFile(fname) {
  if (!confirm('Are you sure you want to delete this file? This cannot be undone.')) return;
  const key = 'lyrics_' + fname.replace('.txt', '');
  localStorage.removeItem(key);
  alert('File deleted!');
  App.showData();
}
