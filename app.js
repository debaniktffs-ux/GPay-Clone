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
let currentSpend = 8500;
let monthlyLimit = 10000;
let pendingPayee = '';
let pendingAmount = 0;

// Voice Assistant Conversation State
let voiceStep = 'idle'; // idle, ask_who, confirm_who, ask_amount, confirm_all
let voiceSelectedPayee = '';
let voiceSelectedAmount = 0;

// Speech Recognition
let recognition = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';
}

// ═══════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    populatePeople();
    updateSpendBanner();
    setupPinAutoFocus();
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
// SPEND LIMITS
// ═══════════════════════════════════════════
function updateSpendBanner() {
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
    monthlyLimit = parseInt(document.getElementById('sc-limit-input').value) || 10000;
    currentSpend = parseInt(document.getElementById('sc-spend-input').value) || 0;
    updateSpendBanner();
    closeSpendConfig();
    showToast('Spend limits updated ✓');
}

// ═══════════════════════════════════════════
// 2FA PAYMENT
// ═══════════════════════════════════════════
function open2FA(payeeName, amount) {
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

    // Check spend limit
    if (currentSpend + pendingAmount > monthlyLimit) {
        showToast('⚠️ Payment blocked — limit exceeded!');
        return;
    }

    close2FA();
    currentSpend += pendingAmount;
    updateSpendBanner();

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
        addBubble('assistant', '👋 Hi! I\'m your GPay Assistant. I\'m here to help you make a payment step by step.');
        setTimeout(() => {
            addBubble('assistant', 'Who would you like to send money to?');
            showPeopleOptions();
            voiceStep = 'ask_who';
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
        addBubble('assistant', `Great! You want to pay <strong>${name}</strong>. 👍`);
        setTimeout(() => {
            addBubble('assistant', 'How much would you like to send? You can type an amount or choose below:');
            showAmountOptions();
        }, 600);
    }, 300);
}

function selectAmount(amount) {
    voiceSelectedAmount = amount;
    addBubble('user', `₹${amount}`);
    voiceStep = 'confirm_all';

    setTimeout(() => {
        // Check spend limit
        const willExceed = currentSpend + amount > monthlyLimit;
        let confirmMsg = `Let me confirm:<br><br>📤 <strong>Pay ${voiceSelectedPayee}</strong><br>💰 <strong>₹${amount.toLocaleString()}</strong>`;

        if (willExceed) {
            confirmMsg += `<br><br>⚠️ <em>Warning: This will exceed your monthly limit of ₹${monthlyLimit.toLocaleString()}</em>`;
        }

        addBubble('assistant', confirmMsg);

        setTimeout(() => {
            addBubble('assistant', 'Shall I proceed with this payment?');
            const chat = document.getElementById('voice-chat');
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'v-bubble options';

            const yesBtn = document.createElement('button');
            yesBtn.className = 'v-option-btn';
            yesBtn.innerText = '✅ Yes, Pay';
            yesBtn.style.background = '#1a73e8';
            yesBtn.style.color = '#fff';
            yesBtn.style.border = 'none';
            yesBtn.onclick = () => confirmVoicePayment();

            const noBtn = document.createElement('button');
            noBtn.className = 'v-option-btn';
            noBtn.innerText = '❌ Cancel';
            noBtn.onclick = () => cancelVoicePayment();

            optionsDiv.appendChild(yesBtn);
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
        addBubble('assistant', '🔐 Opening secure payment verification...');
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
        addBubble('assistant', 'No problem! Payment cancelled. Is there anything else I can help with?');
        setTimeout(() => {
            addBubble('assistant', 'You can start a new payment or close this assistant.');
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
        addBubble('assistant', 'Sure! Who would you like to pay this time?');
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
                addBubble('assistant', `I couldn't find "${text}" in your contacts. Please choose from the list below:`);
                showPeopleOptions();
            }, 300);
        }
    } else if (voiceStep === 'ask_amount') {
        const numMatch = text.match(/\d+/);
        if (numMatch) {
            selectAmount(parseInt(numMatch[0], 10));
        } else {
            setTimeout(() => {
                addBubble('assistant', 'I didn\'t catch the amount. Please enter a number or choose below:');
                showAmountOptions();
            }, 300);
        }
    } else {
        setTimeout(() => {
            addBubble('assistant', 'Would you like to make a payment? Let me help you get started.');
            setTimeout(() => {
                addBubble('assistant', 'Who would you like to send money to?');
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
