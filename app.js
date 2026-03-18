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

function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    
    // Strip rough HTML tags (e.g. <strong>, <br>) for cleaner speech
    const cleanText = text.replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Try to find an Indian English voice
    const voices = window.speechSynthesis.getVoices();
    const isIndian = voices.find(v => v.lang.includes('en-IN') || v.name.includes('India'));
    if (isIndian) {
        utterance.voice = isIndian;
    }
    utterance.volume = 1;
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
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
// ELDERLY / GUARDIAN PAY MODE
// ═══════════════════════════════════════════
function toggleElderlyMode() {
    elderlyMode = document.getElementById('elderly-toggle').checked;
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
    const list = document.getElementById('elder-reviewer-list');
    if (!list) return;

    if (savedReviewers.length === 0) {
        list.innerHTML = `<div class="elder-txn-empty">
            <span class="material-icons-round" style="font-size:36px; color:#dadce0;">group</span>
            <p>No reviewers added yet.<br>Add one during a payment.</p>
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
    voiceStep = 'ask_bank';

    setTimeout(() => {
        addBubble('assistant', `₹${amount.toLocaleString()} — got it! 👍`);
        setTimeout(() => {
            addBubble('assistant', 'Which bank account would you like to pay from?');
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
        
        let confirmMsg = `Let me confirm:<br><br>📤 <strong>Pay ${voiceSelectedPayee}</strong><br>💰 <strong>₹${voiceSelectedAmount.toLocaleString()}</strong><br>🏦 <strong>From: ${voiceSelectedBank}</strong>`;

        if (willExceed) {
            confirmMsg += `<br><br>⚠️ <em>Warning: This will exceed your monthly limit of ₹${monthlyLimit.toLocaleString()}</em>`;
        }
        if (requiresReview) {
            confirmMsg += `<br><br>🛡️ <em>Notice: Amounts over ₹2,000 require review by a trusted contact.</em>`;
        }

        addBubble('assistant', confirmMsg);

        setTimeout(() => {
            addBubble('assistant', 'How would you like to proceed?');
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
    } else if (voiceStep === 'ask_bank') {
        const matched = bankAccounts.find(b => b.name.toLowerCase().includes(text.toLowerCase()));
        if (matched) {
            selectBank(matched);
        } else {
            setTimeout(() => {
                addBubble('assistant', 'Please choose a bank account from the options below:');
                showBankOptions();
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
// REVIEWER APPROVAL FLOW
// ═══════════════════════════════════════════
function openReviewerFromVoice() {
    addBubble('user', 'Get it reviewed');
    voiceStep = 'idle';

    setTimeout(() => {
        addBubble('assistant', '🛡️ Great choice! I\'ll open the reviewer setup so you can add a trusted person to verify this transaction.');
        setTimeout(() => {
            closeVoice();
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

    // Create the pending review transaction
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
}

function cancelPendingReview() {
    document.getElementById('pending-overlay').classList.remove('active');
    pendingReviewTransaction = null;
    showToast('Transaction cancelled');
}

function simulateReviewerResponse() {
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
