// STATE MANAGEMENT
let gameData = {};      // Menyimpan seluruh database dari JSON
let unlockedCards = []; // List ID kartu yang sudah dimiliki player
let slots = [null, null]; // Slot 1 dan Slot 2 (berisi ID kartu)

// 1. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    loadGameData();
});

async function loadGameData() {
    try {
        // Fetch data dari folder data relative terhadap index.html
        const response = await fetch('../data/gamedata.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        gameData = await response.json();
        
        // Update UI Header
        document.getElementById('topic-title').innerText = gameData.meta.topic;
        
        // Masukkan kartu Tier 0 (Elemen Dasar) ke Inventory awal
        initInventory();
        
        updateUI();
        logMessage("System ready. Select cards to combine.");

    } catch (error) {
        console.error("Gagal memuat data:", error);
        logMessage("Error loading data. Make sure you are using Live Server.");
    }
}

function initInventory() {
    // Cari semua kartu dengan Tier 0
    const starters = gameData.library.filter(card => card.tier === 0);
    starters.forEach(card => {
        if (!unlockedCards.includes(card.id)) {
            unlockedCards.push(card.id);
        }
    });
}

// 2. RENDERING UI
function updateUI() {
    renderInventory();
    renderLibrary();
    renderSlots();
    updateStats();
}

function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';

    // Filter: Hanya tampilkan kartu dasar (Tier 0) di kolom kiri
    // ATAU bisa diubah jadi "Semua kartu yang sudah unlock" jika mau craft bertingkat
    const availableCards = gameData.library.filter(card => unlockedCards.includes(card.id) && card.tier === 0);

    availableCards.forEach(card => {
        const cardEl = createCardElement(card);
        cardEl.onclick = () => selectCard(card.id);
        grid.appendChild(cardEl);
    });
}

function renderLibrary() {
    const grid = document.getElementById('library-grid');
    grid.innerHTML = '';

    // Tampilkan hasil crafting (Tier > 0) yang sudah di-unlock
    const discovered = gameData.library.filter(card => unlockedCards.includes(card.id) && card.tier > 0);

    if (discovered.length === 0) {
        grid.innerHTML = '<div style="color:#666; font-style:italic; grid-column:span 3;">No discoveries yet.</div>';
        return;
    }

    discovered.forEach(card => {
        const cardEl = createCardElement(card);
        // Hasil crafting juga bisa dipakai lagi sebagai bahan (Re-use logic)
        cardEl.onclick = () => selectCard(card.id); 
        grid.appendChild(cardEl);
    });
}

function createCardElement(card) {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
        <img src="${card.image}" onerror="this.src='https://placehold.co/100x100?text=?'">
        <div class="card-name">${card.name}</div>
    `;
    return div;
}

function renderSlots() {
    // Render Slot 1
    const slot1 = document.getElementById('slot-1');
    if (slots[0]) {
        const card = getCardById(slots[0]);
        slot1.innerHTML = `<img src="${card.image}" style="width:100%; height:100%; border-radius:6px;">`;
        slot1.style.border = "2px solid #4caf50";
    } else {
        slot1.innerHTML = '<span class="placeholder-text">Select Card 1</span>';
        slot1.style.border = "2px dashed #a0a0a0";
    }

    // Render Slot 2
    const slot2 = document.getElementById('slot-2');
    if (slots[1]) {
        const card = getCardById(slots[1]);
        slot2.innerHTML = `<img src="${card.image}" style="width:100%; height:100%; border-radius:6px;">`;
        slot2.style.border = "2px solid #4caf50";
    } else {
        slot2.innerHTML = '<span class="placeholder-text">Select Card 2</span>';
        slot2.style.border = "2px dashed #a0a0a0";
    }
}

function updateStats() {
    const total = gameData.library.length;
    const current = unlockedCards.length;
    document.getElementById('discovery-count').innerText = `Discovered: ${current}/${total}`;
}

// 3. INTERACTION LOGIC
function selectCard(id) {
    // Masukkan ke slot kosong pertama
    if (slots[0] === null) {
        slots[0] = id;
    } else if (slots[1] === null) {
        slots[1] = id;
    } else {
        // Jika penuh, ganti slot 1 (simple rotation)
        logMessage("Slots full. Click a slot to remove card.");
        return; 
    }
    updateUI();
    logMessage("Card selected.");
}

function returnCard(slotIndex) {
    // Kosongkan slot (klik pada kotak slot)
    // index 1 = slot-1, index 2 = slot-2
    slots[slotIndex - 1] = null;
    updateUI();
}

function attemptCombine() {
    if (!slots[0] || !slots[1]) {
        logMessage("⚠️ Select two cards first!");
        return;
    }

    const id1 = slots[0];
    const id2 = slots[1];

    // Cek Database: Apakah ada kartu yang resepnya [id1, id2]?
    // Loop semua kartu di library
    let resultCard = null;

    for (let card of gameData.library) {
        // Cek setiap resep yang mungkin dimiliki kartu ini
        if (card.recipes) {
            for (let recipe of card.recipes) {
                // Bandingkan array recipe dengan input user
                // Kita sort agar urutan tidak masalah (A+B == B+A)
                const recipeSorted = JSON.stringify(recipe.sort());
                const inputSorted = JSON.stringify([id1, id2].sort());

                if (recipeSorted === inputSorted) {
                    resultCard = card;
                    break;
                }
            }
        }
        if (resultCard) break;
    }

    handleResult(resultCard);
}

function handleResult(card) {
    if (card) {
        // SUCCESS
        if (!unlockedCards.includes(card.id)) {
            unlockedCards.push(card.id);
            logMessage(`✨ SUCCESS! Discovered: ${card.name}`);
        } else {
            logMessage(`✅ Crafted: ${card.name} (Already discovered)`);
        }
        // Reset slots
        slots = [null, null];
        updateUI();
    } else {
        // FAIL
        logMessage("❌ Nothing happened. Try different cards.");
        
        // Visual feedback shake (opsional)
        const btn = document.getElementById('btn-combine');
        btn.style.backgroundColor = '#d32f2f';
        setTimeout(() => btn.style.backgroundColor = '#4caf50', 300);
    }
}

// 4. UTILS
function getCardById(id) {
    return gameData.library.find(c => c.id === id);
}

function logMessage(msg) {
    document.getElementById('message-log').innerText = msg;
}
