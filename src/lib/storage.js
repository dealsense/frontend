import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

export const initStorage = (app) => getStorage(app);

export const makeUploadPath = ({ appId, userId, batchId, fileName }) => `artifacts/${appId}/users/${userId}/uploads/${batchId}/${fileName}`;

export const uploadFileAndGetUrl = async (storage, path, fileOrBlob) => {
    const ref = storageRef(storage, path);
    await uploadBytes(ref, fileOrBlob);
    return getDownloadURL(ref);
};


