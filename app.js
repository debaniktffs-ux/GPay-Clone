// gpay_clone_web/app.js — Phone Mockup Edition

// ═══════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════
const people = [
    { name: 'Debanik M.', color: '#3b82f6' },
    { name: 'Aarav K.', color: '#8b5cf6' },
    { name: 'Priya S.', color: '#10b981' },
    { name: 'Rahul V.', color: '#f59e0b' },
    { name: 'Neha G.', color: '#ef4444' },
    { name: 'Vinod P.', color: '#6366f1' },
    { name: 'Simran K.', color: '#ec4899' },
    { name: 'Ankit R.', color: '#14b8a6' }
];

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
let currentSpend = 0;
let monthlyLimit = 20000;
let bankBalance = 100000;
let pendingPayee = '';
let pendingAmount = 0;
let pinMode = 'payment'; // 'payment' or 'balance'

// Voice Assistant Conversation State
let voiceStep = 'idle'; // idle, ask_who, ask_amount, ask_bank, confirm_all
let voiceSelectedPayee = '';
let voiceSelectedBank = '';

// Bank Accounts
const bankAccounts = [
    { name: 'SBI Savings', suffix: '●●4521', upi: 'user@sbi' },
    { name: 'HDFC Salary', suffix: '●●7890', upi: 'user@hdfc' },
    { name: 'ICICI Savings', suffix: '●●3214', upi: 'user@icici' }
];

// Reviewer State
let pendingReviewTransaction = null;
let savedReviewer = null;
let voiceSelectedAmount = 0;

// Elderly / Guardian Pay Mode
let elderlyMode = false;
let elderlyFontLevel = 0; // -1, 0, 1
let transactionHistory = [];
let savedReviewers = [];

// Speech Recognition & Synthesis
let recognition = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';
}

// Voice State
let isVoiceMuted = false;
let currentVoiceLang = 'en-IN';

// Supabase Configuration (Placeholder - User needs to replace)
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Only initialize if URL is provided and not placeholder
const isSupabaseConfigured = SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL';
const supabase = (isSupabaseConfigured && typeof window.supabase !== 'undefined') 
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
    : null;
const USER_ID = 'gpay_primary_user'; // Hardcoded for prototype persistence

const translations = {
    'hi-IN': {
        "👋 Hi! I'm your GPay Assistant. I'm here to help you make a payment step by step.": "नमस्ते! मैं आपका जी-पे असिस्टेंट हूँ। मैं आपको भुगतान करने में मदद करूँगा।",
        "Who would you like to send money to?": "आप किसे पैसे भेजना चाहेंगे?",
        "How much would you like to send? You can type an amount or choose below:": "आप कितने पैसे भेजना चाहेंगे? आप नीचे दिए विकल्पों में से चुन सकते हैं:",
        "Which bank account would you like to pay from?": "आप किस बैंक खाते से भुगतान करना चाहेंगे?",
        "How would you like to proceed?": "आप कैसे आगे बढ़ना चाहेंगे?",
        "🔐 Opening secure payment verification...": "🔐 सुरक्षित भुगतान सत्यापन खोला जा रहा है...",
        "No problem! Payment cancelled. Is there anything else I can help with?": "कोई बात नहीं! भुगतान रद्द कर दिया गया है। क्या मैं आपकी और कोई मदद कर सकता हूँ?",
        "You can start a new payment or close this assistant.": "आप नया भुगतान शुरू कर सकते हैं या इसे बंद कर सकते हैं।",
        "Sure! Who would you like to pay this time?": "ज़रूर! इस बार आप किसे पैसे भेजना चाहेंगे?",
        "I didn't catch the amount. Please enter a number or choose below:": "मुझे राशि समझ नहीं आई। कृपया कोई संख्या दर्ज करें या नीचे चुनें:",
        "Please choose a bank account from the options below:": "कृपया नीचे दिए गए विकल्पों में से एक बैंक खाता चुनें:",
        "Would you like to make a payment? Let me help you get started.": "क्या आप भुगतान करना चाहेंगे? चलिए मैं आपकी मदद करता हूँ।",
        "🛡️ Great choice! I'll open the reviewer setup so you can add a trusted person to verify this transaction.": "🛡️ बहुत बढ़िया! मैं समीक्षक सेटअप खोल रहा हूँ ताकि आप लेनदेन सत्यापित करने के लिए एक विश्वसनीय व्यक्ति जोड़ सकें।",
        "What would you like to do?": "आप क्या करना चाहेंगे?",
        "💸 Make a Payment": "💸 भुगतान करें",
        "🏦 Check Bank Balance": "🏦 बैंक बैलेंस जांचें",
        "Okay, please enter your PIN to view your balance.": "ठीक है, अपना बैलेंस देखने के लिए अपना पिन दर्ज करें।",
        "Please enter the phone number or UPI ID you want to pay:": "कृपया वह फोन नंबर या UPI ID दर्ज करें जिसे आप भुगतान करना चाहते हैं:",
        "🆕 New Number / UPI ID": "🆕 नया नंबर / UPI ID"
    },
    'bn-IN': {
        "👋 Hi! I'm your GPay Assistant. I'm here to help you make a payment step by step.": "নমস্কার! আমি আপনার জি-পে অ্যাসিস্ট্যান্ট। আমি আপনাকে পেমেন্ট করতে সাহায্য করব।",
        "Who would you like to send money to?": "আপনি কাকে টাকা পাঠাতে চান?",
        "How much would you like to send? You can type an amount or choose below:": "আপনি কত টাকা পাঠাতে চান? আপনি নিচে থেকে বেছে নিতে পারেন:",
        "Which bank account would you like to pay from?": "আপনি কোন ব্যাঙ্ক অ্যাকাউন্ট থেকে পেমেন্ট করতে চান?",
        "How would you like to proceed?": "আপনি কীভাবে এগিয়ে যেতে চান?",
        "🔐 Opening secure payment verification...": "🔐 সুরক্ষিত পেমেন্ট ভেরিফিকেশন খোলা হচ্ছে...",
        "No problem! Payment cancelled. Is there anything else I can help with?": "কোনো সমস্যা নেই! পেমেন্ট বাতিল করা হয়েছে। আমি কি আর কোনোভাবে সাহায্য করতে পারি?",
        "You can start a new payment or close this assistant.": "আপনি একটি নতুন পেমেন্ট শুরু করতে পারেন বা এটি বন্ধ করতে পারেন।",
        "Sure! Who would you like to pay this time?": "নিশ্চয়ই! এবার আপনি কাকে টাকা পাঠাতে চান?",
        "I didn't catch the amount. Please enter a number or choose below:": "আমি পরিমাণটা বুঝতে পারিনি। অনুগ্রহ করে একটি সংখ্যা লিখুন বা নিচে থেকে বেছে নিন:",
        "Please choose a bank account from the options below:": "অনুগ্রহ করে নিচের বিকল্পগুলি থেকে একটি ব্যাঙ্ক অ্যাকাউন্ট বেছে নিন:",
        "Would you like to make a payment? Let me help you get started.": "আপনি কি পেমেন্ট করতে চান? চলুন আমি আপনাকে সাহায্য করি।",
        "🛡️ Great choice! I'll open the reviewer setup so you can add a trusted person to verify this transaction.": "🛡️ দুর্দান্ত পছন্দ! আমি রিভিউয়ার সেটআপ খুলছি যাতে আপনি লেনদেন ভেরিফাই করার জন্য একজন বিশ্বস্ত ব্যক্তিকে যোগ করতে পারেন।",
        "What would you like to do?": "আপনি কী করতে চান?",
        "💸 Make a Payment": "💸 পেমেন্ট করুন",
        "🏦 Check Bank Balance": "🏦 ব্যাঙ্ক ব্যালেন্স দেখুন",
        "Okay, please enter your PIN to view your balance.": "ঠিক আছে, আপনার ব্যালেন্স দেখতে আপনার পিন প্রবেশ করান।",
        "Please enter the phone number or UPI ID you want to pay:": "অনুগ্রহ করে ফোন নম্বর বা ইউপিআই আইডি লিখুন যাকে আপনি পেমেন্ট করতে চান:",
        "🆕 New Number / UPI ID": "🆕 নতুন নম্বর / ইউপিআই আইডি"
    }
};

function t(text) {
    if (translations[currentVoiceLang] && translations[currentVoiceLang][text]) {
        return translations[currentVoiceLang][text];
    }
    return text; // fallback to English
}

function tDynamic(type, val1, val2) {
    if (currentVoiceLang === 'hi-IN') {
        if (type === 'payee') return `बढ़िया! आप <strong>${val1}</strong> को भुगतान करना चाहते हैं। 👍`;
        if (type === 'amount') return `₹${val1.toLocaleString()} — समझ गया! 👍`;
        if (type === 'not_found') return `मुझे आपके संपर्कों में "${val1}" नहीं मिला। कृपया नीचे दी गई सूची से चुनें:`;
        if (type === 'confirm') {
            let confirmMsg = `मैं पुष्टि करता हूँ:<br><br>📤 <strong>${val1} को भुगतान</strong><br>💰 <strong>₹${val2.amount.toLocaleString()}</strong><br>🏦 <strong>यहां से: ${val2.bank}</strong>`;
            if (val2.willExceed) confirmMsg += `<br><br>⚠️ <em>चेतावनी: यह आपकी मासिक सीमा ₹${val2.limit.toLocaleString()} को पार कर जाएगा</em>`;
            if (val2.requiresReview) confirmMsg += `<br><br>🛡️ <em>ध्यान दें: ₹2,000 से अधिक राशि के लिए विश्वसनीय संपर्क से समीक्षा आवश्यक है।</em>`;
            return confirmMsg;
        }
        if (type === 'balance_result') return `आपका बैंक बैलेंस ₹${val1.toLocaleString()} है।`;
        if (type === 'new_payee_found') return `खोजा जा रहा है... <strong>${val1}</strong> का खाता मिला।`;
    }
    if (currentVoiceLang === 'bn-IN') {
        if (type === 'payee') return `দারুণ! আপনি <strong>${val1}</strong> কে পেমেন্ট করতে চান। 👍`;
        if (type === 'amount') return `₹${val1.toLocaleString()} — বুঝতে পেরেছি! 👍`;
        if (type === 'not_found') return `আমি আপনার পরিচিতিতে "${val1}" খুঁজে পাইনি। অনুগ্রহ করে নিচের তালিকা থেকে বেছে নিন:`;
        if (type === 'confirm') {
            let confirmMsg = `আমি নিশ্চিত করছি:<br><br>📤 <strong>${val1} কে পেমেন্ট</strong><br>💰 <strong>₹${val2.amount.toLocaleString()}</strong><br>🏦 <strong>এখান থেকে: ${val2.bank}</strong>`;
            if (val2.willExceed) confirmMsg += `<br><br>⚠️ <em>সতর্কতা: এটি আপনার মাসিক সীমা ₹${val2.limit.toLocaleString()} অতিক্রম করবে</em>`;
            if (val2.requiresReview) confirmMsg += `<br><br>🛡️ <em>বিজ্ঞপ্তি: ₹2,000 এর বেশি পরিমাণের জন্য একজন বিশ্বস্ত ব্যক্তির দ্বারা পর্যালোচনা প্রয়োজন।</em>`;
            return confirmMsg;
        }
        if (type === 'balance_result') return `আপনার ব্যাঙ্ক ব্যালেন্স হল ₹${val1.toLocaleString()}।`;
        if (type === 'new_payee_found') return `খোঁজা হচ্ছে... <strong>${val1}</strong> এর অ্যাকাউন্ট পাওয়া গেছে।`;
    }
    // English
    if (type === 'payee') return `Great! You want to pay <strong>${val1}</strong>. 👍`;
    if (type === 'amount') return `₹${val1.toLocaleString()} — got it! 👍`;
    if (type === 'not_found') return `I couldn't find "${val1}" in your contacts. Please choose from the list below:`;
    if (type === 'confirm') {
        let confirmMsg = `Let me confirm:<br><br>📤 <strong>Pay ${val1}</strong><br>💰 <strong>₹${val2.amount.toLocaleString()}</strong><br>🏦 <strong>From: ${val2.bank}</strong>`;
        if (val2.willExceed) confirmMsg += `<br><br>⚠️ <em>Warning: This will exceed your monthly limit of ₹${val2.limit.toLocaleString()}</em>`;
        if (val2.requiresReview) confirmMsg += `<br><br>🛡️ <em>Notice: Amounts over ₹2,000 require review by a trusted contact.</em>`;
        return confirmMsg;
    }
    if (type === 'balance_result') return `Your bank balance is ₹${val1.toLocaleString()}.`;
    if (type === 'new_payee_found') return `Searching... Found account for <strong>${val1}</strong>.`;
}

function speakText(text) {
    if (!('speechSynthesis' in window) || isVoiceMuted) return;
    
    // Strip rough HTML tags and all Emojis/Pictographics
    let cleanText = text.replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ');
    cleanText = cleanText.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Set language and try to find matching voice
    utterance.lang = currentVoiceLang;
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.includes(currentVoiceLang) || (currentVoiceLang === 'en-IN' && v.name.includes('India')));
    if (matchingVoice) {
        utterance.voice = matchingVoice;
    }
    
    utterance.volume = 1;
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

function changeVoiceLanguage() {
    const select = document.getElementById('elder-lang-select');
    currentVoiceLang = select.value;
    if (recognition) {
        recognition.lang = currentVoiceLang;
    }
    showToast('Voice language updated ✓');
}

function toggleVoiceMute() {
    isVoiceMuted = !isVoiceMuted;
    const btn = document.getElementById('elder-mute-btn');
    const icon = document.getElementById('mute-icon');
    const text = document.getElementById('mute-text');
    
    if (isVoiceMuted) {
        btn.classList.add('muted');
        icon.innerText = 'volume_off';
        text.innerText = 'Voice Muted';
        window.speechSynthesis.cancel(); // Stop current speech
        showToast('Voice Assistant muted');
    } else {
        btn.classList.remove('muted');
        icon.innerText = 'volume_up';
        text.innerText = 'Sound On';
        showToast('Voice Assistant unmuted');
    }
}

// ═══════════════════════════════════════════
// PERSISTENCE (Supabase Backend)
// ═══════════════════════════════════════════
async function saveState() {
    const state = {
        currentSpend,
        monthlyLimit,
        bankBalance,
        transactionHistory,
        savedReviewers,
        elderlyMode
    };
    
    // Save to localStorage as fallback
    localStorage.setItem('gpayCloneState', JSON.stringify(state));

    // Save to Supabase if configured
    if (supabase) {
        try {
            const { error } = await supabase
                .from('app_state')
                .upsert({ id: USER_ID, data: state }, { onConflict: 'id' });
            
            if (error) console.error('Supabase save error:', error.message);
        } catch (e) {
            console.error('Supabase connection failed', e);
        }
    }
}

async function loadState() {
    // 1. Try to load from Supabase first
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('app_state')
                .select('data')
                .eq('id', USER_ID)
                .single();

            if (data && data.data) {
                applyState(data.data);
                console.log('State loaded from Supabase ✓');
                return;
            }
            if (error) console.warn('Supabase fetch issue (expected if new project):', error.message);
        } catch (e) {
            console.error('Supabase connection error', e);
        }
    }

    // 2. Fallback to localStorage
    const saved = localStorage.getItem('gpayCloneState');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            applyState(state);
            console.log('State loaded from LocalStorage (Fallback) ✓');
        } catch (e) {
            console.error('Failed to parse saved state', e);
        }
    }
}

function applyState(state) {
    if (state.currentSpend !== undefined) currentSpend = state.currentSpend;
    if (state.monthlyLimit !== undefined) monthlyLimit = state.monthlyLimit;
    if (state.bankBalance !== undefined) bankBalance = state.bankBalance;
    if (state.transactionHistory) transactionHistory = state.transactionHistory;
    if (state.savedReviewers) savedReviewers = state.savedReviewers;
    if (state.elderlyMode !== undefined) elderlyMode = state.elderlyMode;
}

// ═══════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    await loadState();
    
    // Apply layout state
    if (elderlyMode) {
        document.getElementById('elderly-toggle').checked = true;
        const regularBody = document.getElementById('regular-body');
        const elderlyBody = document.getElementById('elderly-body');
        const title = document.getElementById('mode-title');
        title.innerText = '🛡️ Guardian Pay';
        title.classList.add('guardian');
        regularBody.style.display = 'none';
        elderlyBody.style.display = 'block';
        updateElderlySpend();
        renderElderlyTransactions();
        renderElderlyReviewers();
    }

    populatePeople();
    updateSpendBanner();
    setupPinAutoFocus();

    if (currentSpend > monthlyLimit) {
        const exceededBy = currentSpend - monthlyLimit;
        setTimeout(() => {
            alert(`⚠️ Notice: You have exceeded your monthly spend limit of ₹${monthlyLimit.toLocaleString()} by ₹${exceededBy.toLocaleString()}!`);
        }, 800);
    }
});

function populatePeople() {
    const grid = document.getElementById('people-grid');
    if (!grid) return;
    people.forEach(p => {
        const initials = p.name.split(' ').map(w => w[0]).join('');
        const div = document.createElement('div');
        div.className = 'g-avatar-item';
        div.onclick = () => open2FA(p.name, 500);
        div.innerHTML = `
            <div class="g-avatar-circle">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=${p.color.slice(1)}&color=fff" alt="${p.name}">
            </div>
            <span>${p.name}</span>
        `;
        grid.appendChild(div);
    });
}

function setupPinAutoFocus() {
    document.querySelectorAll('.twofa-pin-box').forEach((box, i, all) => {
        box.addEventListener('input', e => {
            if (e.target.value.length === 1 && i < all.length - 1) all[i + 1].focus();
        });
        box.addEventListener('keydown', e => {
            if (e.key === 'Backspace' && e.target.value === '' && i > 0) all[i - 1].focus();
        });
    });
}

// ═══════════════════════════════════════════
// PHONE HOME SCREEN → GPAY NAVIGATION
// ═══════════════════════════════════════════
function openGPay() {
    document.getElementById('home-screen').classList.add('hidden');
    document.getElementById('gpay-app').classList.add('active');
}

function closeGPay() {
    document.getElementById('gpay-app').classList.remove('active');
    setTimeout(() => {
        document.getElementById('home-screen').classList.remove('hidden');
    }, 100);
}

// ═══════════════════════════════════════════
// ELDERLY / GUARDIAN PAY MODE
// ═══════════════════════════════════════════
function toggleElderlyMode() {
    elderlyMode = document.getElementById('elderly-toggle').checked;
    saveState();
    const title = document.getElementById('mode-title');
    const regularBody = document.getElementById('regular-body');
    const elderlyBody = document.getElementById('elderly-body');

    if (elderlyMode) {
        // Animate title: GPay → Guardian Pay
        title.style.opacity = '0';
        title.style.transform = 'scale(0.8)';
        setTimeout(() => {
            title.innerText = '🛡️ Guardian Pay';
            title.classList.add('guardian');
            title.style.opacity = '1';
            title.style.transform = 'scale(1)';
        }, 250);

        regularBody.style.display = 'none';
        elderlyBody.style.display = 'block';
        updateElderlySpend();
        renderElderlyTransactions();
        renderElderlyReviewers();
        showToast('Guardian Pay mode activated 🛡️');
    } else {
        // Animate title: Guardian Pay → GPay
        title.style.opacity = '0';
        title.style.transform = 'scale(0.8)';
        setTimeout(() => {
            title.innerText = 'GPay';
            title.classList.remove('guardian');
            title.style.opacity = '1';
            title.style.transform = 'scale(1)';
        }, 250);

        regularBody.style.display = 'block';
        elderlyBody.style.display = 'none';
        showToast('Switched to regular mode');
    }
}

function changeFontSize(level) {
    const body = document.getElementById('elderly-body');
    body.classList.remove('elderly-font-small', 'elderly-font-large');
    elderlyFontLevel = level;
    if (level === 1) body.classList.add('elderly-font-large');
    else if (level === -1) body.classList.add('elderly-font-small');
    showToast(level === 1 ? 'Text size: Large' : level === -1 ? 'Text size: Small' : 'Text size: Normal');
}

function updateElderlySpend() {
    saveState();
    const pct = monthlyLimit > 0 ? Math.min((currentSpend / monthlyLimit) * 100, 100) : 0;
    const remaining = Math.max(monthlyLimit - currentSpend, 0);

    const amountEl = document.getElementById('elder-spend-amount');
    const fillEl = document.getElementById('elder-slb-fill');
    const remainEl = document.getElementById('elder-spend-remaining');

    if (amountEl) amountEl.innerHTML = `₹${currentSpend.toLocaleString()} <span>/ ₹${monthlyLimit.toLocaleString()}</span>`;
    if (fillEl) {
        fillEl.style.width = pct + '%';
        fillEl.className = 'slb-progress-fill' + (pct > 90 ? ' danger' : pct > 70 ? ' warning' : '');
    }
    if (remainEl) {
        remainEl.innerText = `₹${remaining.toLocaleString()} remaining`;
        remainEl.style.color = pct > 90 ? '#d93025' : pct > 70 ? '#f9ab00' : '#1e8e3e';
    }
}

function addTransaction(payee, amount, status) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    transactionHistory.unshift({
        payee, amount, status, time,
        color: people.find(p => p.name === payee)?.color || '#1a73e8'
    });
    if (transactionHistory.length > 20) transactionHistory.pop();
    renderElderlyTransactions();
}

function renderElderlyTransactions() {
    saveState();
    const list = document.getElementById('elder-txn-list');
    if (!list) return;

    if (transactionHistory.length === 0) {
        list.innerHTML = `<div class="elder-txn-empty">
            <span class="material-icons-round" style="font-size:36px; color:#dadce0;">history</span>
            <p>No transactions yet.<br>Use Voice Assistant to make a payment.</p>
        </div>`;
        return;
    }

    list.innerHTML = transactionHistory.map(t => {
        const initials = t.payee.split(' ').map(w => w[0]).join('');
        return `<div class="elder-txn-item">
            <div class="elder-txn-avatar" style="background:${t.color}">${initials}</div>
            <div class="elder-txn-info">
                <strong>${t.payee}</strong>
                <span>${t.time} · ${t.status}</span>
            </div>
            <div class="elder-txn-amount sent">-₹${t.amount.toLocaleString()}</div>
        </div>`;
    }).join('');
}

function renderElderlyReviewers() {
    saveState();
    const list = document.getElementById('elder-reviewer-list');
    if (!list) return;

    if (savedReviewers.length === 0) {
        list.innerHTML = `<div class="elder-txn-empty">
            <span class="material-icons-round" style="font-size:36px; color:#dadce0;">group</span>
            <p>No reviewers added yet.<br>Add one below or during a payment.</p>
        </div>`;
        return;
    }

    list.innerHTML = savedReviewers.map(r => {
        const initials = r.name.split(' ').map(w => w[0]).join('').toUpperCase();
        return `<div class="elder-reviewer-item">
            <div class="elder-reviewer-avatar">${initials}</div>
            <div class="elder-reviewer-info">
                <strong>${r.name}</strong>
                <span>${r.phone} · ${r.relation}</span>
            </div>
            <span class="elder-reviewer-badge">${r.relation}</span>
        </div>`;
    }).join('');
}

// ═══════════════════════════════════════════
// SPEND LIMITS
// ═══════════════════════════════════════════
function updateSpendBanner() {
    saveState();
    const pct = monthlyLimit > 0 ? Math.min((currentSpend / monthlyLimit) * 100, 100) : 0;
    const fill = document.getElementById('slb-fill');
    const text = document.getElementById('slb-text');
    const scFill = document.getElementById('sc-fill');
    const scText = document.getElementById('sc-text');

    if (fill) {
        fill.style.width = pct + '%';
        fill.className = 'slb-progress-fill' + (pct > 90 ? ' danger' : pct > 70 ? ' warning' : '');
    }
    if (text) text.innerHTML = `Spent <strong>₹${currentSpend.toLocaleString()}</strong> of ₹${monthlyLimit.toLocaleString()}`;
    if (scFill) {
        scFill.style.width = pct + '%';
        scFill.className = 'slb-progress-fill' + (pct > 90 ? ' danger' : pct > 70 ? ' warning' : '');
    }
    if (scText) scText.innerHTML = `Spent <strong>₹${currentSpend.toLocaleString()}</strong> of ₹${monthlyLimit.toLocaleString()}`;
}

function openSpendConfig() {
    document.getElementById('sc-limit-input').value = monthlyLimit;
    document.getElementById('sc-spend-input').value = currentSpend;
    updateSpendBanner();
    document.getElementById('spend-config-overlay').classList.add('active');
}

function closeSpendConfig() {
    document.getElementById('spend-config-overlay').classList.remove('active');
}

function saveSpendConfig() {
    monthlyLimit = parseInt(document.getElementById('sc-limit-input').value) || 20000;
    currentSpend = parseInt(document.getElementById('sc-spend-input').value) || 0;
    saveState();
    updateSpendBanner();
    closeSpendConfig();
    showToast('Spend limits updated ✓');
}

// ═══════════════════════════════════════════
// HISTORY & BALANCE (NORMAL MODE)
// ═══════════════════════════════════════════
function openTransactionHistory() {
    saveState();
    const list = document.getElementById('normal-txn-list');
    if (!list) return;

    if (transactionHistory.length === 0) {
        list.innerHTML = `<div class="elder-txn-empty">
            <span class="material-icons-round" style="font-size:36px; color:#dadce0;">history</span>
            <p>No transactions yet.</p>
        </div>`;
    } else {
        list.innerHTML = transactionHistory.map(t => {
            const initials = t.payee.split(' ').map(w => w[0]).join('');
            return `<div class="elder-txn-item">
                <div class="elder-txn-avatar" style="background:${t.color}">${initials}</div>
                <div class="elder-txn-info">
                    <strong>${t.payee}</strong>
                    <span>${t.time} · ${t.status}</span>
                </div>
                <div class="elder-txn-amount sent">-₹${t.amount.toLocaleString()}</div>
            </div>`;
        }).join('');
    }
    document.getElementById('history-overlay').classList.add('active');
}

function closeHistory() {
    document.getElementById('history-overlay').classList.remove('active');
}

function openCheckBalance() {
    pinMode = 'balance';
    document.getElementById('twofa-avatar').innerText = '🏦';
    document.getElementById('twofa-payee-name').innerText = 'Check Bank Balance';
    document.getElementById('twofa-payee-sub').innerText = 'Enter PIN to fetch balance';
    document.getElementById('twofa-amount').innerText = ``;
    document.getElementById('twofa-confirm-btn').innerText = `Check Balance`;
    document.getElementById('twofa-warning').classList.remove('show');
    
    document.querySelectorAll('.twofa-pin-box').forEach(b => b.value = '');
    document.getElementById('twofa-overlay').classList.add('active');
    setTimeout(() => document.querySelectorAll('.twofa-pin-box')[0]?.focus(), 400);
}

function closeBalance() {
    document.getElementById('balance-overlay').classList.remove('active');
    if (voiceStep === 'check_balance_pin') {
        closeVoice();
    }
}

// ═══════════════════════════════════════════
// 2FA PAYMENT
// ═══════════════════════════════════════════
function open2FA(payeeName, amount) {
    pinMode = 'payment';
    pendingPayee = payeeName;
    pendingAmount = amount;

    document.getElementById('twofa-avatar').innerText = payeeName.charAt(0);
    document.getElementById('twofa-payee-name').innerText = payeeName;
    document.getElementById('twofa-payee-sub').innerText = 'UPI Transaction';
    document.getElementById('twofa-amount').innerText = `₹${amount.toLocaleString()}`;
    document.getElementById('twofa-confirm-btn').innerText = `Pay ₹${amount.toLocaleString()}`;

    // Spend limit check
    const warning = document.getElementById('twofa-warning');
    if (currentSpend + amount > monthlyLimit) {
        warning.classList.add('show');
        document.getElementById('twofa-warning-msg').innerText = `This ₹${amount.toLocaleString()} payment will exceed your ₹${monthlyLimit.toLocaleString()} monthly cap!`;
    } else {
        warning.classList.remove('show');
    }

    document.querySelectorAll('.twofa-pin-box').forEach(b => b.value = '');
    document.getElementById('twofa-overlay').classList.add('active');
    setTimeout(() => document.querySelectorAll('.twofa-pin-box')[0]?.focus(), 400);
}

function close2FA() {
    document.getElementById('twofa-overlay').classList.remove('active');
}

function confirm2FA() {
    const pins = Array.from(document.querySelectorAll('.twofa-pin-box')).map(b => b.value).join('');
    if (pins.length !== 4) {
        showToast('Enter your 4-digit UPI PIN');
        return;
    }

    if (pinMode === 'balance') {
        close2FA();
        document.getElementById('balance-display').innerText = `₹${bankBalance.toLocaleString()}`;
        document.getElementById('balance-overlay').classList.add('active');
        if (voiceStep === 'check_balance_pin') {
            addBubble('assistant', tDynamic('balance_result', bankBalance));
            voiceStep = 'idle';
        }
        return;
    }

    // Check bank balance
    if (bankBalance - pendingAmount < 0) {
        showToast('⚠️ Payment blocked — insufficient bank balance!');
        return;
    }

    // Check spend limit but allow it
    if (currentSpend + pendingAmount > monthlyLimit) {
        const excess = (currentSpend + pendingAmount) - monthlyLimit;
        showToast(`⚠️ Spend limit exceeded by ₹${excess.toLocaleString()}!`);
    }

    close2FA();
    currentSpend += pendingAmount;
    bankBalance -= pendingAmount;
    updateSpendBanner();
    updateElderlySpend();
    addTransaction(pendingPayee, pendingAmount, 'Paid ✓');

    setTimeout(() => {
        showToast(`₹${pendingAmount.toLocaleString()} sent to ${pendingPayee} ✓`);
        fireConfetti();
    }, 300);
}

// ═══════════════════════════════════════════
// CONVERSATIONAL VOICE ASSISTANT
// ═══════════════════════════════════════════
function openVoice() {
    voiceStep = 'idle';
    voiceSelectedPayee = '';
    voiceSelectedAmount = 0;

    const chat = document.getElementById('voice-chat');
    chat.innerHTML = '';
    document.getElementById('voice-overlay').classList.add('active');

    // Begin conversation
    setTimeout(() => {
        addBubble('assistant', t("👋 Hi! I'm your GPay Assistant. I'm here to help you make a payment step by step."));
        setTimeout(() => {
            addBubble('assistant', t('What would you like to do?'));
            const chat = document.getElementById('voice-chat');
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'v-bubble options';

            const payBtn = document.createElement('button');
            payBtn.className = 'v-option-btn';
            payBtn.innerText = t('💸 Make a Payment');
            payBtn.onclick = () => {
                addBubble('user', t('💸 Make a Payment'));
                setTimeout(() => {
                    addBubble('assistant', t('Who would you like to send money to?'));
                    showPeopleOptions();
                    voiceStep = 'ask_who';
                }, 300);
            };

            const balBtn = document.createElement('button');
            balBtn.className = 'v-option-btn';
            balBtn.innerText = t('🏦 Check Bank Balance');
            balBtn.onclick = () => {
                addBubble('user', t('🏦 Check Bank Balance'));
                voiceStep = 'check_balance_pin';
                setTimeout(() => {
                    addBubble('assistant', t('Okay, please enter your PIN to view your balance.'));
                    setTimeout(() => {
                        openCheckBalance();
                    }, 800);
                }, 300);
            };

            optionsDiv.appendChild(payBtn);
            optionsDiv.appendChild(balBtn);
            chat.appendChild(optionsDiv);
            chat.scrollTop = chat.scrollHeight;
            voiceStep = 'idle';
        }, 800);
    }, 300);
}

function closeVoice() {
    document.getElementById('voice-overlay').classList.remove('active');
    voiceStep = 'idle';
    stopListening();
}

function addBubble(type, text) {
    const chat = document.getElementById('voice-chat');
    const bubble = document.createElement('div');
    bubble.className = `v-bubble ${type}`;
    bubble.innerHTML = text;
    chat.appendChild(bubble);
    chat.scrollTop = chat.scrollHeight;

    // Trigger TTS for assistant responses
    if (type === 'assistant') {
        speakText(text);
    }
}

function showPeopleOptions() {
    const chat = document.getElementById('voice-chat');
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'v-bubble options';
    people.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'v-option-btn';
        btn.innerText = p.name;
        btn.onclick = () => selectPayee(p.name);
        optionsDiv.appendChild(btn);
    });

    const newBtn = document.createElement('button');
    newBtn.className = 'v-option-btn';
    newBtn.innerText = t('🆕 New Number / UPI ID');
    newBtn.onclick = () => {
        addBubble('user', t('🆕 New Number / UPI ID'));
        voiceStep = 'ask_new_payee';
        setTimeout(() => {
            addBubble('assistant', t('Please enter the phone number or UPI ID you want to pay:'));
        }, 300);
    };
    optionsDiv.appendChild(newBtn);

    chat.appendChild(optionsDiv);
    chat.scrollTop = chat.scrollHeight;
}

function showAmountOptions() {
    const chat = document.getElementById('voice-chat');
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'v-bubble options';
    [100, 200, 500, 1000, 2000].forEach(amt => {
        const btn = document.createElement('button');
        btn.className = 'v-option-btn';
        btn.innerText = `₹${amt}`;
        btn.onclick = () => selectAmount(amt);
        optionsDiv.appendChild(btn);
    });
    chat.appendChild(optionsDiv);
    chat.scrollTop = chat.scrollHeight;
}

function selectPayee(name) {
    voiceSelectedPayee = name;
    addBubble('user', name);
    voiceStep = 'ask_amount';

    setTimeout(() => {
        addBubble('assistant', tDynamic('payee', name));
        setTimeout(() => {
            addBubble('assistant', t('How much would you like to send? You can type an amount or choose below:'));
            showAmountOptions();
        }, 600);
    }, 300);
}

function selectAmount(amount) {
    voiceSelectedAmount = amount;
    addBubble('user', `₹${amount}`);
    voiceStep = 'ask_bank';

    setTimeout(() => {
        addBubble('assistant', tDynamic('amount', amount));
        setTimeout(() => {
            addBubble('assistant', t('Which bank account would you like to pay from?'));
            showBankOptions();
        }, 600);
    }, 300);
}

function showBankOptions() {
    const chat = document.getElementById('voice-chat');
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'v-bubble options';
    bankAccounts.forEach(bank => {
        const btn = document.createElement('button');
        btn.className = 'v-option-btn';
        btn.innerText = `${bank.name} (${bank.suffix})`;
        btn.onclick = () => selectBank(bank);
        optionsDiv.appendChild(btn);
    });
    chat.appendChild(optionsDiv);
    chat.scrollTop = chat.scrollHeight;
}

function selectBank(bank) {
    voiceSelectedBank = `${bank.name} (${bank.suffix})`;
    addBubble('user', voiceSelectedBank);
    voiceStep = 'confirm_all';

    setTimeout(() => {
        const willExceed = currentSpend + voiceSelectedAmount > monthlyLimit;
        const requiresReview = voiceSelectedAmount > 2000;
        
        let confirmMsg = tDynamic('confirm', voiceSelectedPayee, {
            amount: voiceSelectedAmount,
            bank: voiceSelectedBank,
            willExceed: willExceed,
            limit: monthlyLimit,
            requiresReview: requiresReview
        });

        addBubble('assistant', confirmMsg);

        setTimeout(() => {
            addBubble('assistant', t('How would you like to proceed?'));
            const chat = document.getElementById('voice-chat');
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'v-bubble options';

            if (!requiresReview) {
                const yesBtn = document.createElement('button');
                yesBtn.className = 'v-option-btn';
                yesBtn.innerText = '✅ Pay Now';
                yesBtn.style.background = '#1a73e8';
                yesBtn.style.color = '#fff';
                yesBtn.style.border = 'none';
                yesBtn.onclick = () => confirmVoicePayment();
                optionsDiv.appendChild(yesBtn);
            }

            const reviewBtn = document.createElement('button');
            reviewBtn.className = 'v-option-btn';
            reviewBtn.innerText = '👥 Get it Reviewed';
            reviewBtn.style.background = '#34a853';
            reviewBtn.style.color = '#fff';
            reviewBtn.style.border = 'none';
            reviewBtn.onclick = () => openReviewerFromVoice();

            const noBtn = document.createElement('button');
            noBtn.className = 'v-option-btn';
            noBtn.innerText = '❌ Cancel';
            noBtn.onclick = () => cancelVoicePayment();

            optionsDiv.appendChild(reviewBtn);
            optionsDiv.appendChild(noBtn);
            chat.appendChild(optionsDiv);
            chat.scrollTop = chat.scrollHeight;
        }, 600);
    }, 300);
}

function confirmVoicePayment() {
    addBubble('user', 'Yes, pay');
    voiceStep = 'idle';

    setTimeout(() => {
        addBubble('assistant', t('🔐 Opening secure payment verification...'));
        setTimeout(() => {
            closeVoice();
            open2FA(voiceSelectedPayee, voiceSelectedAmount);
        }, 800);
    }, 300);
}

function cancelVoicePayment() {
    addBubble('user', 'Cancel');
    voiceStep = 'idle';

    setTimeout(() => {
        addBubble('assistant', t('No problem! Payment cancelled. Is there anything else I can help with?'));
        setTimeout(() => {
            addBubble('assistant', t('You can start a new payment or close this assistant.'));
            const chat = document.getElementById('voice-chat');
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'v-bubble options';

            const newBtn = document.createElement('button');
            newBtn.className = 'v-option-btn';
            newBtn.innerText = '🔄 New Payment';
            newBtn.onclick = () => restartVoice();

            const closeBtn = document.createElement('button');
            closeBtn.className = 'v-option-btn';
            closeBtn.innerText = '👋 Close';
            closeBtn.onclick = () => closeVoice();

            optionsDiv.appendChild(newBtn);
            optionsDiv.appendChild(closeBtn);
            chat.appendChild(optionsDiv);
            chat.scrollTop = chat.scrollHeight;
        }, 500);
    }, 300);
}

function restartVoice() {
    addBubble('user', 'New payment');
    voiceStep = 'ask_who';
    voiceSelectedPayee = '';
    voiceSelectedAmount = 0;

    setTimeout(() => {
        addBubble('assistant', t('Sure! Who would you like to pay this time?'));
        showPeopleOptions();
    }, 300);
}

// Handle text input from user
function sendUserMessage() {
    const input = document.getElementById('voice-text-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    addBubble('user', text);

    // Process based on current step
    if (voiceStep === 'ask_who') {
        // Try to match a person
        const matched = people.find(p => p.name.toLowerCase().includes(text.toLowerCase()));
        if (matched) {
            selectPayee(matched.name);
        } else {
            setTimeout(() => {
                addBubble('assistant', tDynamic('not_found', text));
                showPeopleOptions();
            }, 300);
        }
    } else if (voiceStep === 'ask_new_payee') {
        setTimeout(() => {
            addBubble('assistant', tDynamic('new_payee_found', text));
            setTimeout(() => {
                selectPayee(text);
            }, 1000);
        }, 800);
    } else if (voiceStep === 'ask_amount') {
        const numMatch = text.match(/\d+/);
        if (numMatch) {
            selectAmount(parseInt(numMatch[0], 10));
        } else {
            setTimeout(() => {
                addBubble('assistant', t('I didn\'t catch the amount. Please enter a number or choose below:'));
                showAmountOptions();
            }, 300);
        }
    } else if (voiceStep === 'ask_bank') {
        const matched = bankAccounts.find(b => b.name.toLowerCase().includes(text.toLowerCase()));
        if (matched) {
            selectBank(matched);
        } else {
            setTimeout(() => {
                addBubble('assistant', t('Please choose a bank account from the options below:'));
                showBankOptions();
            }, 300);
        }
    } else {
        setTimeout(() => {
            addBubble('assistant', t('Would you like to make a payment? Let me help you get started.'));
            setTimeout(() => {
                addBubble('assistant', t('Who would you like to send money to?'));
                showPeopleOptions();
                voiceStep = 'ask_who';
            }, 500);
        }, 300);
    }
}

// Microphone toggle
let isListening = false;
function toggleMic() {
    if (!recognition) {
        showToast('Voice not supported in this browser');
        return;
    }

    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
}

function startListening() {
    if (!recognition) return;
    isListening = true;
    document.getElementById('v-mic-btn').classList.add('listening');

    try { recognition.start(); } catch (e) {}

    recognition.onresult = function (event) {
        const text = event.results[0][0].transcript;
        document.getElementById('voice-text-input').value = text;
        stopListening();
        sendUserMessage();
    };

    recognition.onerror = function () {
        stopListening();
        showToast('Could not hear you. Try again.');
    };

    recognition.onend = function () {
        stopListening();
    };
}

function stopListening() {
    isListening = false;
    document.getElementById('v-mic-btn')?.classList.remove('listening');
    try { recognition?.stop(); } catch (e) {}
}

// ═══════════════════════════════════════════
// REVIEWER APPROVAL FLOW
// ═══════════════════════════════════════════
function openReviewerFromVoice() {
    addBubble('user', 'Get it reviewed');
    voiceStep = 'idle';

    setTimeout(() => {
        addBubble('assistant', t('🛡️ Great choice! I\'ll open the reviewer setup so you can add a trusted person to verify this transaction.'));
        setTimeout(() => {
            closeVoice();
            pendingPayee = voiceSelectedPayee;
            pendingAmount = voiceSelectedAmount;
            openReviewerSetup();
        }, 800);
    }, 300);
}

function openReviewerSetup() {
    // Populate transaction summary in the form
    document.getElementById('rtxn-payee').innerText = voiceSelectedPayee || pendingPayee || '—';
    document.getElementById('rtxn-amount').innerText = `₹${(voiceSelectedAmount || pendingAmount || 0).toLocaleString()}`;
    document.getElementById('rtxn-bank').innerText = voiceSelectedBank || 'Default Account';

    const listContainer = document.getElementById('reviewer-list-container');
    const formContainer = document.getElementById('reviewer-form-container');
    const cancelBtn = document.getElementById('rev-cancel-btn');

    if (savedReviewers.length > 0) {
        // Show the list of saved reviewers
        listContainer.style.display = 'block';
        formContainer.style.display = 'none';
        cancelBtn.innerText = 'Cancel';
        
        const modalList = document.getElementById('modal-saved-reviewers');
        modalList.innerHTML = savedReviewers.map((r, idx) => {
            const initials = r.name.split(' ').map(w => w[0]).join('').toUpperCase();
            return `<div class="elder-reviewer-item" style="cursor:pointer;" onclick="selectSavedReviewer(${idx})">
                <div class="elder-reviewer-avatar">${initials}</div>
                <div class="elder-reviewer-info">
                    <strong>${r.name}</strong>
                    <span>${r.phone} · ${r.relation}</span>
                </div>
                <span class="material-icons-round" style="color:var(--google-blue);">chevron_right</span>
            </div>`;
        }).join('');
    } else {
        // Show the form directly if no saved reviewers
        showReviewerForm();
    }

    document.getElementById('reviewer-overlay').classList.add('active');
}

function showReviewerForm() {
    document.getElementById('reviewer-list-container').style.display = 'none';
    document.getElementById('reviewer-form-container').style.display = 'block';
    
    // Change cancel button to go back to list if there are saved reviewers
    const cancelBtn = document.getElementById('rev-cancel-btn');
    if (savedReviewers.length > 0) {
        cancelBtn.innerText = 'Back to Saved Reviewers';
        document.getElementById('rev-form-title').innerText = 'Add New Reviewer';
    } else {
        cancelBtn.innerText = 'Cancel';
        document.getElementById('rev-form-title').innerText = 'Reviewer Details';
    }
}

function handleReviewerModalCancel() {
    const cancelBtn = document.getElementById('rev-cancel-btn');
    if (cancelBtn.innerText === 'Back to Saved Reviewers') {
        document.getElementById('reviewer-form-container').style.display = 'none';
        document.getElementById('reviewer-list-container').style.display = 'block';
        cancelBtn.innerText = 'Cancel';
    } else {
        closeReviewerSetup();
    }
}

function selectSavedReviewer(idx) {
    const r = savedReviewers[idx];
    document.getElementById('rev-name').value = r.name;
    document.getElementById('rev-phone').value = r.phone;
    document.getElementById('rev-upi').value = r.upi;
    document.getElementById('rev-relation').value = r.relation;
    sendForReview();
}

function closeReviewerSetup() {
    document.getElementById('reviewer-overlay').classList.remove('active');
}

function openStandaloneReviewerModal() {
    // Hide payment context
    document.getElementById('reviewer-txn-summary').style.display = 'none';
    
    // Change button text and icon
    document.getElementById('rev-submit-text').innerText = 'Save Reviewer';
    document.getElementById('rev-submit-icon').innerText = 'save';
    
    // Open the modal, directly to form
    const listContainer = document.getElementById('reviewer-list-container');
    const formContainer = document.getElementById('reviewer-form-container');
    const cancelBtn = document.getElementById('rev-cancel-btn');
    
    listContainer.style.display = 'none';
    formContainer.style.display = 'block';
    
    cancelBtn.innerText = 'Cancel';
    document.getElementById('rev-form-title').innerText = 'New Reviewer Details';
    
    // Clear inputs
    document.getElementById('rev-name').value = '';
    document.getElementById('rev-phone').value = '';
    document.getElementById('rev-upi').value = '';
    document.getElementById('rev-relation').value = '';

    document.getElementById('reviewer-overlay').classList.add('active');
}

function sendForReview() {
    const name = document.getElementById('rev-name').value.trim();
    const phone = document.getElementById('rev-phone').value.trim();
    const upi = document.getElementById('rev-upi').value.trim();
    const relation = document.getElementById('rev-relation').value;

    if (!name) { showToast('Please enter the reviewer\'s name'); return; }
    if (!phone) { showToast('Please enter the reviewer\'s phone number'); return; }
    if (!relation) { showToast('Please select a relation'); return; }

    // Save reviewer for future use
    savedReviewer = { name, phone, upi, relation };

    // Add to savedReviewers list if not already there
    if (!savedReviewers.find(r => r.phone === phone)) {
        savedReviewers.push({ name, phone, upi, relation });
        renderElderlyReviewers();
    }
    
    // Check if we are in standalone add mode
    const submitBtnText = document.getElementById('rev-submit-text').innerText;
    if (submitBtnText === 'Save Reviewer') {
        closeReviewerSetup();
        showToast(`${name} added to Trusted Reviewers ✓`);
        return;
    }

    // Otherwise, continue the payment flow
    pendingReviewTransaction = {
        payee: voiceSelectedPayee || pendingPayee,
        amount: voiceSelectedAmount || pendingAmount,
        bank: voiceSelectedBank || 'Default Account',
        reviewer: { name, phone, upi, relation },
        status: 'pending'
    };

    closeReviewerSetup();
    openPendingReview();
}

let pendingTimerInterval = null;

function openPendingReview() {
    if (!pendingReviewTransaction) return;
    const txn = pendingReviewTransaction;

    document.getElementById('pending-reviewer-name').innerText = txn.reviewer.name;
    document.getElementById('pending-reviewer-relation').innerText = txn.reviewer.relation;
    document.getElementById('pending-payee').innerText = txn.payee;
    document.getElementById('pending-amount').innerText = `₹${txn.amount.toLocaleString()}`;
    document.getElementById('pending-bank').innerText = txn.bank;

    document.getElementById('pending-overlay').classList.add('active');
    showToast(`Review request sent to ${txn.reviewer.name} 📩`);

    let timeLeft = 300;
    const timerEl = document.getElementById('pending-timer');
    if(timerEl) timerEl.innerText = `Expires in: 05:00`;
    
    clearInterval(pendingTimerInterval);
    pendingTimerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(pendingTimerInterval);
            expirePendingReview();
        } else {
            const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
            const s = (timeLeft % 60).toString().padStart(2, '0');
            if(timerEl) timerEl.innerText = `Expires in: ${m}:${s}`;
        }
    }, 1000);
}

function cancelPendingReview() {
    clearInterval(pendingTimerInterval);
    document.getElementById('pending-overlay').classList.remove('active');
    pendingReviewTransaction = null;
    showToast('Transaction cancelled');
}

function expirePendingReview() {
    document.getElementById('pending-overlay').classList.remove('active');
    if (pendingReviewTransaction) {
        addTransaction(pendingReviewTransaction.payee, pendingReviewTransaction.amount, 'Expired ❌');
        showToast(`Transaction expired! ${pendingReviewTransaction.reviewer.name} did not respond in time.`);
    }
    pendingReviewTransaction = null;
}

function simulateReviewerResponse() {
    clearInterval(pendingTimerInterval);
    document.getElementById('pending-overlay').classList.remove('active');

    // Open the reviewer's approval screen
    setTimeout(() => {
        openApprovalScreen();
    }, 300);
}

function openApprovalScreen() {
    if (!pendingReviewTransaction) return;
    const txn = pendingReviewTransaction;

    document.getElementById('approval-reviewer-name').innerText = txn.reviewer.name;
    document.getElementById('approval-reviewer-relation').innerText = txn.reviewer.relation;
    document.getElementById('approval-payee').innerText = txn.payee;
    document.getElementById('approval-amount').innerText = `₹${txn.amount.toLocaleString()}`;
    document.getElementById('approval-bank').innerText = txn.bank;
    document.getElementById('approval-sender-avatar').innerText = 'U';

    document.getElementById('approval-overlay').classList.add('active');
}

function approveTransaction() {
    document.getElementById('approval-overlay').classList.remove('active');
    showToast(`✅ ${pendingReviewTransaction.reviewer.name} approved the transaction!`);

    // Now open the 2FA PIN for the user to finalize
    setTimeout(() => {
        pendingPayee = pendingReviewTransaction.payee;
        pendingAmount = pendingReviewTransaction.amount;
        open2FA(pendingPayee, pendingAmount);
        pendingReviewTransaction = null;
    }, 1000);
}

function rejectTransaction() {
    document.getElementById('approval-overlay').classList.remove('active');
    const reviewerName = pendingReviewTransaction?.reviewer?.name || 'Reviewer';
    pendingReviewTransaction = null;

    showToast(`❌ ${reviewerName} rejected the transaction`);
}

// ═══════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.querySelector('.toast-text').innerText = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function fireConfetti() {
    if (typeof confetti === 'undefined') return;
    const end = Date.now() + 1500;
    (function frame() {
        confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#3b82f6', '#10b981', '#f59e0b'] });
        confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#8b5cf6', '#ef4444', '#ec4899'] });
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
}
