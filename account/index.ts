const KEYS = {
    STORE: 'store',
    BIOMETRIC: 'enableBiometric'
} as const;

interface KeyInfo {
    type?: string;
    [key: string]: unknown;
}

interface StoreData {
    keyInfo?: KeyInfo;
    [key: string]: unknown;
}

const signOut = (): void => {
    window.localStorage.removeItem(KEYS.STORE);
}

const login = (obj: StoreData): void => {
    window.localStorage.setItem(KEYS.STORE, JSON.stringify(obj))
}

const loginWithPasskey = (obj: StoreData): void => {
    if (isEnableBiometric() && (!obj.keyInfo?.type || obj.keyInfo.type === 'Passkey')) {
        const userInfo: StoreData = {...obj}
        delete userInfo.keyInfo
        login(userInfo)
        return
    }

    login(obj)
}

const load = (): StoreData | null => {
    const item = window.localStorage.getItem(KEYS.STORE);
    if (!item) return null;
    return JSON.parse(item);
}

const set = (key: string, value: string): void => {
    window.localStorage.setItem(key, value)
}

const isEnableBiometric = (): boolean => {
    const value = window.localStorage.getItem(KEYS.BIOMETRIC)

    // default value is true
    if (value == null) {
        window.localStorage.setItem(KEYS.BIOMETRIC, 'true')
        return true
    }

    return value === 'true'
}

const deleteKeyInfo = (): void => {
    const store = load()
    if (store) {
        delete store.keyInfo
        window.localStorage.setItem(KEYS.STORE, JSON.stringify(store))
    }
}

export {isEnableBiometric, signOut, login, deleteKeyInfo, load, set, KEYS, loginWithPasskey}
