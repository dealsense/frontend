// Environment helpers for Vite (client-side). Use VITE_ prefix variables.

export const getEnv = () => {
    return {
        hfApiToken: import.meta?.env?.VITE_HF_API_TOKEN || '',
        hfModel: import.meta?.env?.VITE_HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2',
    };
};

export const getFirebaseConfigFromGlobals = () => {
    // Existing codebase injects globals __firebase_config, __app_id, etc.
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : '';
    return { appId, firebaseConfig, initialAuthToken };
};


