// Authentication module
let currentUser = null;

export function getCurrentUser() {
    return currentUser;
}

// DOM elements
let loginBtn;
let logoutBtn;
let userInfo;
let userName;
let userMenuBtn;
let userMenu;
let manageTagsBtn;

export function initAuthUI() {
    loginBtn = document.getElementById('loginBtn');
    logoutBtn = document.getElementById('logoutBtn');
    userInfo = document.getElementById('userInfo');
    userName = document.getElementById('userName');
    userMenuBtn = document.getElementById('userMenuBtn');
    userMenu = document.getElementById('userMenu');
    manageTagsBtn = document.getElementById('manageTagsBtn');

    loginBtn.addEventListener('click', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);

    if (userMenuBtn && userMenu) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = userMenu.style.display === 'block';
            userMenu.style.display = isOpen ? 'none' : 'block';
        });
        document.addEventListener('click', (e) => {
            if (!userMenu.contains(e.target) && e.target !== userMenuBtn) {
                userMenu.style.display = 'none';
            }
        });
    }

    if (manageTagsBtn) {
        manageTagsBtn.addEventListener('click', async () => {
            const { navigateToTags } = await import('./router.js');
            navigateToTags();
            if (userMenu) {
                userMenu.style.display = 'none';
            }
        });
    }
}

export function setupAuthStateListener(onAuthChanged) {
    firebase.auth().onAuthStateChanged((user) => {
        currentUser = user;
        updateUIForAuth(user);

        if (user) {
            console.log('User signed in:', user.email);
            onAuthChanged(user);
        } else {
            console.log('User signed out');
            onAuthChanged(null);
        }
    });
}

function updateUIForAuth(user) {
    if (user) {
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        userName.textContent = user.displayName || user.email;
    } else {
        loginBtn.style.display = 'block';
        userInfo.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'none';
        }
    }
}

async function handleLogin() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await firebase.auth().signInWithPopup(provider);
    } catch (error) {
        console.error('Login error:', error);
        alert('Failed to sign in. Please try again.');
    }
}

async function handleLogout() {
    try {
        await firebase.auth().signOut();
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to sign out. Please try again.');
    }
}
