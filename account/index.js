const KEYS = {
    STORE: 'store',
    BIOMETRIC: 'enableBiometric'
}

const signOut = () => {
    // const {store, setStore} = useContext(StoreContext);
    window.localStorage.removeItem(KEYS.STORE);
}

const login = (obj) => {
    window.localStorage.setItem(KEYS.STORE, JSON.stringify(obj))
}

const loginWithPasskey = (obj) => {
    if (isEnableBiometric() && (!obj.keyInfo?.type || obj.keyInfo.type === 'Passkey')) {
        const userInfo = {...obj}
        delete userInfo.keyInfo
        login(userInfo)
        return
    }

    login(obj)
}

const load = () => {
    return JSON.parse(window.localStorage.getItem(KEYS.STORE))
}

const set = (key, value) => {
    window.localStorage.setItem(key, value)
}

const isEnableBiometric = () => {
    const value = window.localStorage.getItem(KEYS.BIOMETRIC)

    // default value is true
    if (value == null) {
        window.localStorage.setItem(KEYS.BIOMETRIC, true)
        return true
    }

    return value === 'true'
}

const deleteKeyInfo = () => {
    const store = load()
    delete store.keyInfo
    window.localStorage.setItem(KEYS.STORE, JSON.stringify(store))
}

export {isEnableBiometric, signOut, login, deleteKeyInfo, load, set, KEYS, loginWithPasskey}