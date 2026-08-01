import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyCLaZs-SH3nBN51tybBhZUxLGT6Kr-mAXs',
  authDomain: 'planner-796fa.firebaseapp.com',
  projectId: 'planner-796fa',
  storageBucket: 'planner-796fa.firebasestorage.app',
  messagingSenderId: '649815464005',
  appId: '1:649815464005:web:f0a0aa0ab641ac44cdeb2c',
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const storage = getStorage(app)
