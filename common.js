// common.js
const firebaseConfig = {
    apiKey: "AIzaSyDDTvDeVwjAU_pNN-4J5bJPjfFDkjmBreY",
    authDomain: "dprinting-business-gr.firebaseapp.com",
    projectId: "dprinting-business-gr",
    storageBucket: "dprinting-business-gr.firebasestorage.app",
    messagingSenderId: "119615146681",
    appId: "1:119615146681:web:5df595f483602f240fe968"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    window.auth = firebase.auth();
    window.db = firebase.firestore();
} else if (typeof firebase !== 'undefined') {
    window.auth = firebase.auth();
    window.db = firebase.firestore();
}

if (!window.location.href.includes("login.html")) {
    auth.onAuthStateChanged(user => { if (!user) window.location.href = "login.html"; });
}

function logout() { auth.signOut().then(() => window.location.href = "login.html"); }
function round2(num) { return Math.round((num + Number.EPSILON) * 100) / 100; }
function deleteDoc(col, id) { if(confirm("Διαγραφή;")) db.collection(col).doc(id).delete(); }