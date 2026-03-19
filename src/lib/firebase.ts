import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyDd0Y9sZdCl5wbgQ2OcY0_AQseUAJVldUk',
  authDomain:        'airadeco-b00a3.firebaseapp.com',
  projectId:         'airadeco-b00a3',
  storageBucket:     'airadeco-b00a3.firebasestorage.app',
  messagingSenderId: '543668712455',
  appId:             '1:543668712455:web:d5265eb94f50c658f766a2',
};

const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
